import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { randomBytes, createHash } from 'node:crypto'
import { DatabaseSync } from 'node:sqlite'
import { mkdtemp, mkdir, rm, stat, access, writeFile } from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import test from 'node:test'
import { exportState, importState } from '../main/state-transfer.mjs'
const require = createRequire(import.meta.url)
const { acquireAccountLock } = require('../../dist/util/AccountLock.js')
const account = 'synthetic@example.invalid'
const accountKey = createHash('sha256').update(account).digest('hex')
async function fixture(t) {
    const root = await mkdtemp(path.join(os.tmpdir(), 'state-transfer-'))
    t.after(() => rm(root, { recursive: true, force: true }))
    const source = path.join(root, 'source')
    await mkdir(source, { mode: 0o700 })
    const session = new DatabaseSync(path.join(source, 'sessions.db'))
    session.exec(`PRAGMA journal_mode=WAL; PRAGMA wal_autocheckpoint=0;
        CREATE TABLE sessions(email TEXT, platform TEXT, storage_state TEXT);
        CREATE TABLE account_metadata(email TEXT, resolved_region TEXT);`)
    session.prepare('INSERT INTO sessions VALUES (?, ?, ?)').run(account, 'desktop', 'SYNTHETIC_PRIVATE_COOKIE')
    session.prepare('INSERT INTO account_metadata VALUES (?, ?)').run(account, 'CN')
    const blocks = new DatabaseSync(path.join(source, 'account-blocks.sqlite'))
    blocks.exec(
        'CREATE TABLE account_blocks(account_key TEXT, reason TEXT); CREATE TABLE block_deliveries(account_key TEXT, acknowledged INTEGER)'
    )
    blocks.prepare('INSERT INTO account_blocks VALUES (?, ?)').run(accountKey, 'BALANCE_UNAVAILABLE')
    blocks.prepare('INSERT INTO block_deliveries VALUES (?, ?)').run(accountKey, 1)
    t.after(() => {
        session.close()
        blocks.close()
    })
    return { root, source, session, blocks, key: randomBytes(32) }
}

test('encrypted state round trip includes WAL changes and both stores, excluding diagnostics', async t => {
    const f = await fixture(t)
    await writeFile(path.join(f.source, 'secret.txt'), 'DO_NOT_EXPORT')
    const encrypted = await exportState(f.source, account, f.key)
    assert.equal(encrypted.includes(Buffer.from('SYNTHETIC_PRIVATE_COOKIE')), false)
    const next = await exportState(f.source, account, f.key)
    assert.notDeepEqual(encrypted, next)
    const destination = path.join(f.root, 'restored')
    await importState(encrypted, destination, account.toUpperCase(), f.key)
    const session = new DatabaseSync(path.join(destination, 'sessions.db'), { readOnly: true })
    const blocks = new DatabaseSync(path.join(destination, 'account-blocks.sqlite'), { readOnly: true })
    try {
        assert.equal(
            session.prepare('SELECT storage_state FROM sessions').get().storage_state,
            'SYNTHETIC_PRIVATE_COOKIE'
        )
        assert.equal(blocks.prepare('SELECT reason FROM account_blocks').get().reason, 'BALANCE_UNAVAILABLE')
        assert.equal(blocks.prepare('SELECT acknowledged FROM block_deliveries').get().acknowledged, 1)
    } finally {
        session.close()
        blocks.close()
    }
    for (const name of ['sessions.db', 'account-blocks.sqlite'])
        assert.equal((await stat(path.join(destination, name))).mode & 0o777, 0o600)
    assert.equal((await stat(destination)).mode & 0o777, 0o700)
    await assert.rejects(access(path.join(destination, 'secret.txt')))
})

for (const mode of ['key', 'account', 'tamper', 'truncated'])
    test('rejects ' + mode + ' before restoring files', async t => {
        const f = await fixture(t)
        let encrypted = await exportState(f.source, account, f.key)
        if (mode === 'tamper') encrypted[encrypted.length - 1] ^= 1
        if (mode === 'truncated') encrypted = encrypted.subarray(0, 15)
        const destination = path.join(f.root, 'invalid')
        await assert.rejects(
            importState(
                encrypted,
                destination,
                mode === 'account' ? 'other@example.invalid' : account,
                mode === 'key' ? randomBytes(32) : f.key
            ),
            { code: 'STATE_TRANSFER_FAILED' }
        )
        await assert.rejects(access(destination))
    })

test('refuses existing destination without changing it', async t => {
    const f = await fixture(t)
    const encrypted = await exportState(f.source, account, f.key)
    await assert.rejects(importState(encrypted, f.source, account, f.key), { code: 'STATE_TRANSFER_FAILED' })
    assert.equal(f.session.prepare('SELECT COUNT(*) AS n FROM sessions').get().n, 1)
})

test('export honors account lock', async t => {
    const f = await fixture(t)
    const release = acquireAccountLock(f.source, account)
    try {
        await assert.rejects(exportState(f.source, account, f.key), { code: 'ACCOUNT_BUSY' })
    } finally {
        release()
    }
})

for (const table of ['sessions', 'account_metadata', 'account_blocks', 'block_deliveries'])
    test('rejects foreign account in ' + table, async t => {
        const f = await fixture(t)
        if (table === 'sessions')
            f.session
                .prepare('INSERT INTO sessions VALUES (?, ?, ?)')
                .run('other@example.invalid', 'desktop', 'foreign')
        else if (table === 'account_metadata')
            f.session.prepare('INSERT INTO account_metadata VALUES (?, ?)').run('other@example.invalid', 'HK')
        else if (table === 'account_blocks')
            f.blocks.prepare('INSERT INTO account_blocks VALUES (?, ?)').run('other-key', 'FLOW_FAILED')
        else f.blocks.prepare('INSERT INTO block_deliveries VALUES (?, ?)').run('other-key', 1)
        await assert.rejects(exportState(f.source, account, f.key), { code: 'STATE_TRANSFER_FAILED' })
    })

test('missing required store and invalid key fail explicitly', async t => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'missing-state-'))
    t.after(() => rm(root, { recursive: true, force: true }))
    await assert.rejects(exportState(root, account, randomBytes(32)), { code: 'STATE_TRANSFER_FAILED' })
    await assert.rejects(exportState(root, account, Buffer.alloc(1)), { code: 'STATE_TRANSFER_FAILED' })
})

test('production stores preserve session, region, block revision and acknowledged delivery', async t => {
    const {
        saveStorageState,
        saveResolvedRegion,
        closeSessionStore,
        loadSession,
        loadResolvedRegion
    } = require('../../dist/util/SessionStore.js')
    const { BlockStateStore } = require('../../dist/util/BlockStateStore.js')
    const root = await mkdtemp(path.join(os.tmpdir(), 'real-state-transfer-'))
    t.after(() => rm(root, { recursive: true, force: true }))
    const source = path.join(root, 'source')
    const storage = {
        cookies: [
            {
                name: 'synthetic',
                value: 'SYNTHETIC_COOKIE',
                domain: '.example.invalid',
                path: '/',
                expires: -1,
                httpOnly: true,
                secure: true,
                sameSite: 'Lax'
            }
        ],
        origins: []
    }
    let store
    let restored
    try {
        saveStorageState(source, account, false, storage)
        saveResolvedRegion(source, account, 'CN')
        store = new BlockStateStore(path.join(source, 'account-blocks.sqlite'))
        const block = store.block(account, 'BALANCE_UNAVAILABLE')
        const token = store.claimDelivery(account, block.revision, 'synthetic-destination-hash', Date.now(), 300000)
        assert.ok(store.finishDelivery(account, block.revision, 'synthetic-destination-hash', token, true))
        const key = randomBytes(32)
        const encrypted = await exportState(source, account, key)
        const destination = path.join(root, 'restored')
        await importState(encrypted, destination, account, key)
        closeSessionStore()
        assert.deepEqual(loadSession(destination, account, false).storageState, storage)
        assert.equal(loadResolvedRegion(destination, account), 'CN')
        restored = new BlockStateStore(path.join(destination, 'account-blocks.sqlite'))
        assert.deepEqual(restored.get(account), block)
        assert.equal(
            restored.claimDelivery(account, block.revision, 'synthetic-destination-hash', Date.now(), 300000),
            null
        )
    } finally {
        closeSessionStore()
        store?.close()
        restored?.close()
    }
})

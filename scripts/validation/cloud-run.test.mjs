import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { createRequire } from 'node:module'
import { mkdtemp, rm, access } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { exportState, importState } from '../main/state-transfer.mjs'
import { runCloudAccount } from '../main/cloud-run.mjs'
const require = createRequire(import.meta.url)
const { saveStorageState, closeSessionStore } = require('../../dist/util/SessionStore.js')
const { BlockStateStore } = require('../../dist/util/BlockStateStore.js')
const account = 'synthetic@example.invalid'
async function fixture(t) {
    const root = await mkdtemp(path.join(os.tmpdir(), 'cloud-run-'))
    t.after(() => rm(root, { recursive: true, force: true }))
    const source = path.join(root, 'source')
    try {
        saveStorageState(source, account, false, { cookies: [], origins: [] })
    } finally {
        closeSessionStore()
    }
    new BlockStateStore(path.join(source, 'account-blocks.sqlite')).close()
    const key = randomBytes(32)
    const encrypted = await exportState(source, account, key)
    const events = []
    let latest = { sha: 'ready', record: { phase: 'ready', encryptedState: encrypted.toString('base64') } }
    const remote = {
        read: async () => {
            events.push('read')
            return latest
        },
        begin: async () => {
            events.push('begin')
            latest = { sha: 'pending', record: { phase: 'pending' } }
            return latest
        },
        complete: async (_pending, bytes) => {
            events.push('complete')
            latest = { sha: 'complete', record: { phase: 'ready', encryptedState: bytes.toString('base64') } }
            return latest
        }
    }
    return { root, key, events, remote, account, directory: path.join(root, 'restored'), latest: () => latest }
}
for (const code of [0, 1])
    test('publishes updated state after a normal child exit=' + code, async t => {
        const f = await fixture(t)
        const result = await runCloudAccount({
            ...f,
            execute: async () => {
                f.events.push('execute')
                const blocks = new BlockStateStore(path.join(f.directory, 'account-blocks.sqlite'))
                blocks.block(account, 'BALANCE_UNAVAILABLE')
                blocks.close()
                return { code, reason: 'exited' }
            }
        })
        assert.equal(result.code, code)
        assert.deepEqual(f.events, ['read', 'begin', 'execute', 'complete'])
        const final = path.join(f.root, 'final')
        await importState(Buffer.from(f.latest().record.encryptedState, 'base64'), final, account, f.key)
        const blocks = new BlockStateStore(path.join(final, 'account-blocks.sqlite'))
        try {
            assert.equal(blocks.get(account).reason, 'BALANCE_UNAVAILABLE')
        } finally {
            blocks.close()
        }
    })
for (const reason of ['timed_out', 'terminated', 'spawn_failed'])
    test(reason + ' leaves remote state pending', async t => {
        const f = await fixture(t)
        await assert.rejects(runCloudAccount({ ...f, execute: async () => ({ code: 124, reason }) }), {
            code: 'CLOUD_RUN_INCOMPLETE'
        })
        assert.equal(f.latest().record.phase, 'pending')
        assert.ok(!f.events.includes('complete'))
    })
test('corrupt state never claims the run or starts the child', async t => {
    const f = await fixture(t)
    f.latest().record.encryptedState = Buffer.from('corrupt').toString('base64')
    await assert.rejects(runCloudAccount({ ...f, execute: () => assert.fail('must not start') }), {
        code: 'STATE_TRANSFER_FAILED'
    })
    assert.deepEqual(f.events, ['read'])
    await assert.rejects(access(f.directory))
})
test('an earlier unfinished run stops before restore or execution', async t => {
    const f = await fixture(t)
    f.latest().record.phase = 'pending'
    await assert.rejects(runCloudAccount({ ...f, execute: () => assert.fail('must not start') }), {
        code: 'REMOTE_STATE_PENDING'
    })
    await assert.rejects(access(f.directory))
})
test('claim conflict prevents child execution', async t => {
    const f = await fixture(t)
    f.remote.begin = async () => {
        throw Object.assign(new Error('conflict'), { code: 'REMOTE_STATE_CONFLICT' })
    }
    await assert.rejects(runCloudAccount({ ...f, execute: () => assert.fail('must not start') }), {
        code: 'REMOTE_STATE_CONFLICT'
    })
})
test('failed final publication is not retried and never returns success', async t => {
    const f = await fixture(t)
    let attempts = 0
    f.remote.complete = async () => {
        attempts++
        throw new Error('synthetic publication failure')
    }
    await assert.rejects(
        runCloudAccount({ ...f, execute: async () => ({ code: 0, reason: 'exited' }) }),
        /synthetic publication failure/
    )
    assert.equal(attempts, 1)
    assert.equal(f.latest().record.phase, 'pending')
})

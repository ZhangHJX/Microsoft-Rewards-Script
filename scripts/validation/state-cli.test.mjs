import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { randomBytes } from 'node:crypto'
import { mkdtemp, rm, readFile, stat, access, writeFile, symlink, open } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
const require = createRequire(import.meta.url)
const { saveStorageState, closeSessionStore, loadSession } = require('../../dist/util/SessionStore.js')
const { BlockStateStore } = require('../../dist/util/BlockStateStore.js')
const cli = fileURLToPath(new URL('../main/state-cli.mjs', import.meta.url))
const account = 'synthetic@example.invalid'
async function fixture(t) {
    const root = await mkdtemp(path.join(os.tmpdir(), 'state-cli-'))
    t.after(() => rm(root, { recursive: true, force: true }))
    const source = path.join(root, 'sessions')
    const storage = { cookies: [], origins: [] }
    try {
        saveStorageState(source, account, false, storage)
    } finally {
        closeSessionStore()
    }
    const store = new BlockStateStore(path.join(source, 'account-blocks.sqlite'))
    store.block(account, 'BALANCE_UNAVAILABLE')
    store.close()
    const key = randomBytes(32).toString('hex')
    const env = { ...process.env, REWARDS_STATE_KEY: key, REWARDS_STATE_ACCOUNT: account }
    return { root, source, env, key, file: path.join(root, 'state.enc') }
}
function run(args, env) {
    const result = spawnSync(process.execPath, [cli, ...args], { env, encoding: 'utf8', timeout: 10000 })
    assert.equal(result.error, undefined)
    return result
}
function assertQuiet(result, f) {
    for (const secret of [f.key, account, f.root]) assert.ok(!(result.stdout + result.stderr).includes(secret))
}

test('CLI exports and imports through separate processes without printing account, key or paths', async t => {
    const f = await fixture(t)
    const exported = run(['export', '--session-dir', f.source, '--file', f.file], f.env)
    assert.equal(exported.status, 0, exported.stderr)
    assert.deepEqual(JSON.parse(exported.stdout), { status: 'exported' })
    assertQuiet(exported, f)
    assert.equal((await stat(f.file)).mode & 0o777, 0o600)
    const destination = path.join(f.root, 'restored')
    const imported = run(['import', '--session-dir', destination, '--file', f.file], f.env)
    assert.equal(imported.status, 0, imported.stderr)
    assert.deepEqual(JSON.parse(imported.stdout), { status: 'imported' })
    assertQuiet(imported, f)
    try {
        assert.deepEqual(loadSession(destination, account, false).storageState, { cookies: [], origins: [] })
    } finally {
        closeSessionStore()
    }
})

for (const mode of ['missing-key', 'invalid-key', 'argument-key', 'invalid-command'])
    test('CLI rejects ' + mode + ' with sanitized output', async t => {
        const f = await fixture(t)
        const env = { ...f.env }
        const args = ['export', '--session-dir', f.source, '--file', f.file]
        if (mode === 'missing-key') delete env.REWARDS_STATE_KEY
        if (mode === 'invalid-key') env.REWARDS_STATE_KEY = 'BAD_SECRET_KEY'
        if (mode === 'argument-key') args.push('--key', f.key)
        if (mode === 'invalid-command') args[0] = 'unknown'
        const result = run(args, env)
        assert.equal(result.status, 1)
        assert.deepEqual(JSON.parse(result.stdout), { status: 'state_transfer_failed' })
        assertQuiet(result, f)
        assert.ok(!result.stderr.includes('BAD_SECRET_KEY'))
        await assert.rejects(access(f.file))
    })

test('export refuses an existing output file without truncating it', async t => {
    const f = await fixture(t)
    await writeFile(f.file, 'existing-state')
    const result = run(['export', '--session-dir', f.source, '--file', f.file], f.env)
    assert.equal(result.status, 1)
    assert.equal(await readFile(f.file, 'utf8'), 'existing-state')
    assertQuiet(result, f)
})

test('import refuses symbolic links and corrupt input before destination creation', async t => {
    const f = await fixture(t)
    const destination = path.join(f.root, 'restored')
    await writeFile(f.file, 'corrupt-state')
    for (const filename of [f.file, path.join(f.root, 'link.enc')]) {
        if (filename !== f.file) await symlink(f.file, filename)
        const result = run(['import', '--session-dir', destination, '--file', filename], f.env)
        assert.equal(result.status, 1)
        assert.deepEqual(JSON.parse(result.stdout), { status: 'state_transfer_failed' })
        assertQuiet(result, f)
        await assert.rejects(access(destination))
    }
})

test('CLI refuses oversized input without creating destination', async t => {
    const f = await fixture(t)
    const handle = await open(f.file, 'wx')
    try {
        await handle.truncate(34 * 1024 * 1024)
    } finally {
        await handle.close()
    }
    const destination = path.join(f.root, 'restored')
    const result = run(['import', '--session-dir', destination, '--file', f.file], f.env)
    assert.equal(result.status, 1)
    assert.deepEqual(JSON.parse(result.stdout), { status: 'state_transfer_failed' })
    await assert.rejects(access(destination))
})

test('CLI export stops while the account is running', async t => {
    const f = await fixture(t)
    const { acquireAccountLock } = require('../../dist/util/AccountLock.js')
    const release = acquireAccountLock(f.source, account)
    try {
        const result = run(['export', '--session-dir', f.source, '--file', f.file], f.env)
        assert.equal(result.status, 1)
        assert.deepEqual(JSON.parse(result.stdout), { status: 'state_transfer_failed' })
        assertQuiet(result, f)
        await assert.rejects(access(f.file))
    } finally {
        release()
    }
})

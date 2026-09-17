import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
const require = createRequire(import.meta.url)
const { runUnlessBlocked } = require('../../dist/util/AccountGuard.js')
function directory(t) {
    const dir = mkdtempSync(join(tmpdir(), 'account-guard-'))
    t.after(() => rmSync(dir, { recursive: true, force: true }))
    return dir
}
test('persisted balance failure prevents a later invocation from starting work', async t => {
    const dir = directory(t)
    let calls = 0
    await assert.rejects(
        runUnlessBlocked(dir, 'a', async () => {
            calls++
            throw Object.assign(new Error('invalid'), { code: 'BALANCE_UNAVAILABLE' })
        }),
        { code: 'BALANCE_UNAVAILABLE' }
    )
    await assert.rejects(
        runUnlessBlocked(dir, 'a', async () => {
            calls++
        }),
        { code: 'ACCOUNT_BLOCKED' }
    )
    assert.equal(calls, 1)
})
test('restriction blocks future work but preserves first result', async t => {
    const dir = directory(t)
    const result = { skippedForBotWarning: true }
    assert.equal(await runUnlessBlocked(dir, 'a', async () => result), result)
    await assert.rejects(
        runUnlessBlocked(dir, 'a', async () => assert.fail('must not run')),
        { code: 'ACCOUNT_BLOCKED' }
    )
})
test('generic transient errors are not permanently blocked', async t => {
    const dir = directory(t)
    await assert.rejects(
        runUnlessBlocked(dir, 'a', async () => {
            throw new Error('network')
        })
    )
    assert.deepEqual(await runUnlessBlocked(dir, 'a', async () => ({ ok: true })), { ok: true })
})
test('storage failure prevents callback execution', async t => {
    const dir = directory(t)
    const file = join(dir, 'not-a-directory')
    writeFileSync(file, 'x')
    let called = false
    await assert.rejects(
        runUnlessBlocked(file, 'a', async () => {
            called = true
        }),
        { code: 'STATE_STORAGE_FAILED' }
    )
    assert.equal(called, false)
})
test('blocked account does not affect another account', async t => {
    const dir = directory(t)
    await runUnlessBlocked(dir, 'a', async () => ({ skippedForBotWarning: true }))
    assert.equal(await runUnlessBlocked(dir, 'b', async () => undefined), undefined)
})

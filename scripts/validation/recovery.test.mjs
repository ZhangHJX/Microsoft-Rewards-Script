import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import test from 'node:test'
const require = createRequire(import.meta.url)
const { BlockStateStore } = require('../../dist/util/BlockStateStore.js')
const { validateBlockedAccount } = require('../../dist/util/AccountRecovery.js')
function setup(t) {
    const dir = mkdtempSync(join(tmpdir(), 'recovery-'))
    const path = join(dir, 'state.sqlite')
    const store = new BlockStateStore(path)
    t.after(() => {
        store.close()
        rmSync(dir, { recursive: true, force: true })
    })
    return store
}
for (const passed of [true, false]) {
    test('validation result controls block removal: ' + passed, async t => {
        const store = setup(t)
        store.block('a', 'BALANCE_UNAVAILABLE')
        const result = await validateBlockedAccount(
            store,
            'a',
            async (block, signal) => {
                assert.equal(block.reason, 'BALANCE_UNAVAILABLE')
                assert.equal(signal.aborted, false)
                return passed
            },
            1000
        )
        assert.equal(result, passed ? 'resumed' : 'still_blocked')
        assert.equal(store.get('a') === null, passed)
    })
}
test('exception is sanitized and leaves block intact', async t => {
    const store = setup(t)
    store.block('a', 'BALANCE_UNAVAILABLE')
    assert.equal(
        await validateBlockedAccount(
            store,
            'a',
            async () => {
                throw new Error('SECRET')
            },
            1000
        ),
        'still_blocked'
    )
    assert.ok(store.get('a'))
})
test('timeout aborts and late success cannot resume', async t => {
    const store = setup(t)
    store.block('a', 'BALANCE_UNAVAILABLE')
    let complete
    let signal
    const pending = validateBlockedAccount(
        store,
        'a',
        (_block, abortSignal) => {
            signal = abortSignal
            return new Promise(resolve => {
                complete = resolve
            })
        },
        20
    )
    assert.equal(await pending, 'timed_out')
    assert.equal(signal.aborted, true)
    complete(true)
    await new Promise(resolve => setImmediate(resolve))
    assert.ok(store.get('a'))
})
test('intervening failure invalidates successful validation', async t => {
    const store = setup(t)
    store.block('a', 'BALANCE_UNAVAILABLE')
    assert.equal(
        await validateBlockedAccount(
            store,
            'a',
            async () => {
                store.block('a', 'ACCOUNT_RESTRICTED')
                return true
            },
            1000
        ),
        'still_blocked'
    )
    assert.equal(store.get('a').reason, 'ACCOUNT_RESTRICTED')
})
test('no block means no validator invocation', async t => {
    assert.equal(
        await validateBlockedAccount(setup(t), 'a', async () => assert.fail('unexpected'), 1000),
        'not_blocked'
    )
})
test('invalid recovery budget does not invoke validator or clear block', async t => {
    const store = setup(t)
    store.block('a', 'BALANCE_UNAVAILABLE')
    await assert.rejects(validateBlockedAccount(store, 'a', async () => assert.fail('unexpected'), 0))
    assert.ok(store.get('a'))
})
test('truthy nonboolean validation is not success', async t => {
    const store = setup(t)
    store.block('a', 'BALANCE_UNAVAILABLE')
    assert.equal(await validateBlockedAccount(store, 'a', async () => 'yes', 1000), 'still_blocked')
    assert.ok(store.get('a'))
})

test('a changed revision between inspection and token acquisition is not validated', async t => {
    const store = setup(t)
    store.block('a', 'BALANCE_UNAVAILABLE')
    const original = store.beginValidation.bind(store)
    store.beginValidation = (...args) => {
        store.block('a', 'ACCOUNT_RESTRICTED')
        return original(...args)
    }
    let called = false
    assert.equal(
        await validateBlockedAccount(
            store,
            'a',
            async () => {
                called = true
                return true
            },
            1000
        ),
        'still_blocked'
    )
    assert.equal(called, false)
    assert.equal(store.get('a').reason, 'ACCOUNT_RESTRICTED')
})

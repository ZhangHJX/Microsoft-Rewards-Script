import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import test from 'node:test'
const require = createRequire(import.meta.url)
const { assertExecutionScope } = require('../../dist/util/ExecutionScope.js')
for (const count of [0, 2])
    test('single-account mode rejects count=' + count, () => {
        assert.throws(
            () =>
                assertExecutionScope(
                    Array.from({ length: count }, () => ({})),
                    1,
                    true
                ),
            { code: 'INVALID_ACCOUNT_SCOPE' }
        )
    })
test('single account and one process are accepted', () =>
    assert.doesNotThrow(() => assertExecutionScope([{}], 1, true)))
for (const clusters of [0, 2])
    test('single-account mode rejects clusters=' + clusters, () => {
        assert.throws(() => assertExecutionScope([{}], clusters, true), { code: 'INVALID_ACCOUNT_SCOPE' })
    })
test('explicit local compatibility mode retains upstream account counts', () =>
    assert.doesNotThrow(() => assertExecutionScope([{}, {}], 2, false)))

test('config loader defaults to single account and quiet ordinary logs', () => {
    const { validateConfig } = require('../../dist/util/Validator.js')
    const config = validateConfig({})
    assert.equal(config.singleAccount, true)
    assert.equal(config.webhook.forwardLogs, false)
    const explicit = validateConfig({ singleAccount: false, webhook: { forwardLogs: true } })
    assert.equal(explicit.singleAccount, false)
    assert.equal(explicit.webhook.forwardLogs, true)
})

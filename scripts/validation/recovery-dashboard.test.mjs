import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import test from 'node:test'
const require = createRequire(import.meta.url)
const { validateSavedDashboard } = require('../../dist/util/RecoveryDashboard.js')
const block = { reason: 'BALANCE_UNAVAILABLE' }
const cookies = [{ name: 'session', value: 'synthetic', domain: '.bing.com', path: '/', expires: -1 }]
const valid = { dashboard: { userStatus: { availablePoints: 0, isRewardsUser: true }, userWarnings: [] } }
for (const [name, data, expected] of [
    ['valid zero', valid, true],
    ['missing balance', { dashboard: { userStatus: { isRewardsUser: true }, userWarnings: [] } }, false],
    ['missing warnings', { dashboard: { userStatus: { availablePoints: 0, isRewardsUser: true } } }, false],
    ['warning', { dashboard: { ...valid.dashboard, userWarnings: [{ name: 'unknown' }] } }, false],
    [
        'not enrolled',
        { dashboard: { ...valid.dashboard, userStatus: { availablePoints: 0, isRewardsUser: false } } },
        false
    ]
]) {
    test('recovery dashboard: ' + name, async () => {
        let calls = 0
        const fetcher = async (url, options) => {
            calls++
            assert.equal(url, 'https://rewards.bing.com/api/getuserinfo')
            assert.equal(options.method, 'GET')
            assert.equal(options.redirect, 'error')
            assert.equal(options.headers.Cookie, 'session=synthetic')
            return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } })
        }
        assert.equal(await validateSavedDashboard(block, cookies, new AbortController().signal, fetcher), expected)
        assert.equal(calls, 1)
    })
}
test('unrelated or expired cookies cannot cause a request', async () => {
    assert.equal(
        await validateSavedDashboard(
            block,
            [
                { ...cookies[0], domain: 'evilbing.com' },
                { ...cookies[0], expires: 1 }
            ],
            new AbortController().signal,
            async () => assert.fail('unexpected request')
        ),
        false
    )
})
test('HTTP failure and non-JSON login response keep block', async () => {
    for (const response of [
        new Response('', { status: 401 }),
        new Response('<html>login</html>', { headers: { 'Content-Type': 'text/html' } })
    ]) {
        assert.equal(
            await validateSavedDashboard(block, cookies, new AbortController().signal, async () => response),
            false
        )
    }
})
test('generic failure cannot be cleared by balance evidence alone', async () => {
    assert.equal(
        await validateSavedDashboard({ reason: 'FLOW_FAILED' }, cookies, new AbortController().signal, async () =>
            assert.fail('unexpected')
        ),
        false
    )
})

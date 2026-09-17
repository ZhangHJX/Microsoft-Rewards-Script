import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import test from 'node:test'

const require = createRequire(import.meta.url)
// Reviewed pure mapping module: no bot, authentication, transport, or activity imports.
const { mapFlyoutToDashboard } = require('../../dist/browser/FlyoutDashboard.js')

function flyout() {
    return {
        userInfo: { isRewardsUser: true, profile: { attributes: {} }, balance: 100 },
        flyoutResult: { userStatus: { isRewardsUser: true, availablePoints: 103 } }
    }
}

test('upstream mapper preserves a numeric balance from a synthetic response', () => {
    assert.equal(mapFlyoutToDashboard(flyout()).dashboard.userStatus.availablePoints, 103)
})

test('upstream mapper rejects an explicit error response', () => {
    assert.throws(() => mapFlyoutToDashboard({ ...flyout(), isError: true }))
})

test('missing balance sources reject the response instead of reporting zero', () => {
    const data = flyout()
    delete data.userInfo.balance
    delete data.flyoutResult.userStatus.availablePoints
    assert.throws(() => mapFlyoutToDashboard(data), { code: 'BALANCE_UNAVAILABLE' })
})

for (const invalid of [null, undefined, '', '100', false, true, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    test('invalid primary balance ' + String(invalid) + ' uses a valid fallback', () => {
        const data = flyout()
        data.flyoutResult.userStatus.availablePoints = invalid
        assert.equal(mapFlyoutToDashboard(data).dashboard.userStatus.availablePoints, 100)
    })
    test('two invalid balances reject without leaking input: ' + String(invalid), () => {
        const data = flyout()
        data.flyoutResult.userStatus.availablePoints = invalid
        data.userInfo.balance = invalid
        assert.throws(() => mapFlyoutToDashboard(data), {
            code: 'BALANCE_UNAVAILABLE',
            message: 'Rewards balance is missing or invalid'
        })
    })
}

test('a genuine primary zero takes precedence over a positive fallback', () => {
    const data = flyout()
    data.flyoutResult.userStatus.availablePoints = 0
    assert.equal(mapFlyoutToDashboard(data).dashboard.userStatus.availablePoints, 0)
})

test('a genuine fallback zero is valid', () => {
    const data = flyout()
    delete data.flyoutResult.userStatus.availablePoints
    data.userInfo.balance = 0
    assert.equal(mapFlyoutToDashboard(data).dashboard.userStatus.availablePoints, 0)
})

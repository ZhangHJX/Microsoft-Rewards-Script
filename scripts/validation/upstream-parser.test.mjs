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

// Characterization tests document existing defects, not the desired balance contract.
// Replace their expectations when the production parser is separately corrected.
test('known limitation: upstream maps two missing balance sources to zero', () => {
    const data = flyout()
    delete data.userInfo.balance
    delete data.flyoutResult.userStatus.availablePoints
    assert.equal(mapFlyoutToDashboard(data).dashboard.userStatus.availablePoints, 0)
})

test('known limitation: upstream null primary balance overrides a valid fallback with zero', () => {
    const data = flyout()
    data.flyoutResult.userStatus.availablePoints = null
    assert.equal(mapFlyoutToDashboard(data).dashboard.userStatus.availablePoints, 0)
})

import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import test from 'node:test'

const require = createRequire(import.meta.url)
// Import the class, not the application entry point. Transport is synthetic.
const BrowserFunc = require('../../dist/browser/BrowserFunc.js').default

function harness(data) {
    const requests = []
    const logs = []
    const browser = new BrowserFunc({
        isMobile: false,
        cookies: { desktop: [], mobile: [] },
        logger: {
            warn: (...args) => logs.push(args),
            error: (...args) => logs.push(args)
        },
        http: {
            request: async request => {
                requests.push(request)
                assert.equal(request.method, 'GET')
                return { data, headers: {} }
            }
        }
    })
    return { browser, requests, logs }
}

for (const method of ['getDashboardData', 'getCurrentPoints']) {
    for (const balance of [0, 123, Number.MAX_SAFE_INTEGER]) {
        test(method + ' preserves valid balance ' + balance, async () => {
            const data = { dashboard: { userStatus: { availablePoints: balance } } }
            const { browser, requests } = harness(data)
            const result = await browser[method]()
            assert.equal(method === 'getCurrentPoints' ? result : result.dashboard.userStatus.availablePoints, balance)
            assert.equal(requests.length, 1)
        })
    }
    for (const balance of [
        undefined,
        null,
        '',
        '999',
        false,
        true,
        -1,
        0.5,
        NaN,
        Infinity,
        Number.MAX_SAFE_INTEGER + 1
    ]) {
        test(method + ' rejects invalid balance ' + String(balance) + ' without retry', async () => {
            const { browser, requests } = harness({ dashboard: { userStatus: { availablePoints: balance } } })
            await assert.rejects(browser[method](), {
                code: 'BALANCE_UNAVAILABLE',
                message: 'Rewards balance is missing or invalid'
            })
            assert.equal(requests.length, 1)
        })
    }
    test(method + ' rejects absent userStatus', async () => {
        const { browser, requests } = harness({ dashboard: {} })
        await assert.rejects(browser[method](), { code: 'BALANCE_UNAVAILABLE' })
        assert.equal(requests.length, 1)
    })
}

for (const validFallback of [true, false]) {
    test('transport failure retains bounded fallback; valid balance=' + validFallback, async () => {
        let calls = 0
        const browser = new BrowserFunc({
            isMobile: false,
            cookies: { desktop: [], mobile: [] },
            logger: { warn() {}, error() {} },
            http: {
                request: async () => {
                    calls++
                    if (calls <= 2) throw new Error('synthetic transport failure')
                    assert.equal(calls, 3)
                    return {
                        headers: {},
                        data: {
                            userInfo: { isRewardsUser: true, profile: { attributes: {} } },
                            flyoutResult: {
                                userStatus: { isRewardsUser: true, availablePoints: validFallback ? 0 : null }
                            }
                        }
                    }
                }
            }
        })
        if (validFallback) assert.equal(await browser.getCurrentPoints(), 0)
        else await assert.rejects(browser.getCurrentPoints(), { code: 'BALANCE_UNAVAILABLE' })
        assert.equal(calls, 3)
    })
}

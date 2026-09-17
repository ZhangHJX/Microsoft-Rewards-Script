import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import test from 'node:test'

const require = createRequire(import.meta.url)
const ts = require('typescript')
const source = ts.createSourceFile(
    'index.js',
    fs.readFileSync(new URL('../../dist/index.js', import.meta.url), 'utf8'),
    ts.ScriptTarget.Latest,
    true
)
const botClass = source.statements.find(node => ts.isClassDeclaration(node) && node.name.text === 'MicrosoftRewardsBot')
// Execute compiled methods unchanged, without importing index.js and starting the app.
function loadMethod(name, globals) {
    const method = botClass.members.find(node => node.name?.getText(source) === name)
    assert.ok(method, name + ' must exist in the production class')
    return vm.runInNewContext('(class { ' + method.getText(source) + ' })', globals).prototype[name]
}

for (const success of [true, false]) {
    test('single process propagates account success=' + success + ' with zero points', async () => {
        const logs = []
        const exits = []
        const globals = {
            process: { exit: code => exits.push(code) },
            cluster_1: { default: { isPrimary: true } },
            Locale_1: { resolveAccountLocale: () => ({ language: 'en', country: 'US', locale: 'en-US' }) },
            Http_1: { default: class {} },
            flushAllWebhooks: async () => {}
        }
        const method = loadMethod('runTasks', globals)
        const context = {
            config: { clusters: 1 },
            userData: {},
            utils: { getEmailUsername: () => 'synthetic' },
            logger: { info: (...args) => logs.push(args), warn() {}, error() {} },
            Main: async () => {
                if (!success) throw new Error('synthetic failure')
                return { initialPoints: 0, collectedPoints: 0 }
            }
        }
        await method.call(context, [{ email: 'synthetic@example.invalid', geoLocale: 'US' }], Date.now())
        assert.deepEqual(exits, [success ? 0 : 1])
        const summary = logs.find(args => args[1] === 'RUN-END')
        assert.ok(summary)
        assert.ok(summary[2].includes('status=' + (success ? 'success' : 'failed')))
        assert.ok(summary[2].includes('accountsFailed=' + (success ? 0 : 1)))
        assert.ok(summary[2].includes('previousBalance=' + (success ? '0' : 'unknown')))
        assert.equal(summary[3], success ? 'green' : 'red')
    })
    test('worker propagates reported account success=' + success, async () => {
        let callback
        const exits = []
        const globals = {
            process: {
                pid: 1,
                on: (_event, fn) => {
                    callback = fn
                },
                send() {},
                exit: code => exits.push(code)
            },
            flushAllWebhooks: async () => {}
        }
        const method = loadMethod('runWorker', globals)
        method.call({ logger: { info() {}, error() {} }, runTasks: async () => [{ success }] })
        await callback({ chunk: [{}], runStartTime: Date.now() })
        assert.deepEqual(exits, [success ? 0 : 1])
    })
}

for (const scenario of [
    { success: true, workerCode: 0, report: true, expected: 0 },
    { success: false, workerCode: 0, report: true, expected: 1 },
    { success: true, workerCode: 1, report: true, expected: 1 },
    { success: true, workerCode: 0, report: false, expected: 1 }
]) {
    test('master checks account reports and worker exit: ' + JSON.stringify(scenario), async () => {
        const handlers = {}
        let messageHandler
        let resolveExit
        const exit = new Promise(resolve => {
            resolveExit = resolve
        })
        const worker = {
            process: { pid: 123 },
            send() {},
            on: (_event, fn) => {
                messageHandler = fn
            }
        }
        const method = loadMethod('runMaster', {
            process: { pid: 1, exit: resolveExit },
            cluster_1: {
                default: {
                    fork: () => worker,
                    on: (event, fn) => {
                        handlers[event] = fn
                    }
                }
            },
            flushAllWebhooks: async () => {}
        })
        const account = { email: 'synthetic@example.invalid' }
        await method.call(
            {
                accounts: [account],
                config: { clusters: 2, webhook: {} },
                utils: { chunkArray: () => [[account]] },
                exitedWorkers: [],
                logger: { info() {}, warn() {} }
            },
            Date.now()
        )
        if (scenario.report)
            messageHandler({
                __stats: [{ success: scenario.success, initialPoints: 0, finalPoints: 0, collectedPoints: 0 }]
            })
        handlers.exit(worker, scenario.workerCode)
        assert.equal(await exit, scenario.expected)
    })
}

for (const mode of ['balance', 'generic', 'undefined', 'zero']) {
    test('account result preserves unknown values and sanitizes errors: ' + mode, async () => {
        const logs = []
        const method = loadMethod('runTasks', {
            Locale_1: { resolveAccountLocale: () => ({ language: 'en', country: 'US', locale: 'en-US' }) },
            Http_1: { default: class {} }
        })
        const results = await method.call(
            {
                config: { clusters: 2 },
                userData: {},
                utils: { getEmailUsername: () => 'synthetic' },
                logger: { info() {}, warn() {}, error: (...args) => logs.push(args) },
                Main: async () => {
                    if (mode === 'zero') return { initialPoints: 0, collectedPoints: 0 }
                    if (mode === 'undefined') return undefined
                    throw Object.assign(new Error('SECRET_UNTRUSTED_RESPONSE'), {
                        code: mode === 'balance' ? 'BALANCE_UNAVAILABLE' : 'ARBITRARY_SECRET'
                    })
                }
            },
            [{ email: 'synthetic@example.invalid', geoLocale: 'US' }],
            Date.now()
        )
        const result = results[0]
        assert.equal(result.success, mode === 'zero')
        for (const key of ['initialPoints', 'finalPoints', 'collectedPoints'])
            assert.equal(result[key], mode === 'zero' ? 0 : null)
        if (mode !== 'zero') assert.equal(result.errorCode, mode === 'balance' ? 'BALANCE_UNAVAILABLE' : 'FLOW_FAILED')
        assert.ok(!JSON.stringify({ results, logs }).includes('SECRET'))
    })
}

for (const skipped of [false, true]) {
    test('account aggregation retains balance evidence; skipped=' + skipped, async () => {
        const initial = { value: 100, source: 'dashboard', observedAt: '2026-09-17T00:00:00.000Z' }
        const final = skipped ? null : { value: 103, source: 'flyout', observedAt: '2026-09-17T00:01:00.000Z' }
        const method = loadMethod('runTasks', {
            Locale_1: { resolveAccountLocale: () => ({ language: 'en', country: 'US', locale: 'en-US' }) },
            Http_1: { default: class {} }
        })
        const results = await method.call(
            {
                config: { clusters: 2 },
                userData: {},
                utils: { getEmailUsername: () => 'synthetic' },
                logger: { info() {}, warn() {}, error() {} },
                Main: async () => ({
                    initialPoints: 100,
                    collectedPoints: skipped ? 0 : 3,
                    skippedForBotWarning: skipped,
                    balanceObservations: { initial, final }
                })
            },
            [{ email: 'synthetic@example.invalid', geoLocale: 'US' }],
            Date.now()
        )
        assert.ok(results[0].balanceObservations, 'account result must retain observations')
        assert.deepEqual(JSON.parse(JSON.stringify(results[0].balanceObservations)), { initial, final })
        assert.equal(results[0].success, !skipped)
    })
}

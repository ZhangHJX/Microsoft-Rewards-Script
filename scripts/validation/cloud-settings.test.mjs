import assert from 'node:assert/strict'
import test from 'node:test'
import { cloudSettings } from '../main/cloud-settings.mjs'

test('cloud configuration isolates credentials and forces the agreed account/log boundaries', () => {
    const environment = {
        ACCOUNT_1_EMAIL: 'synthetic@example.invalid',
        ACCOUNT_1_PASSWORD: 'password',
        GITHUB_TOKEN: 'github-secret',
        REWARDS_STATE_KEY: 'state-secret',
        NODE_OPTIONS: '--require=untrusted',
        PATH: '/bin',
        HOME: '/home/synthetic'
    }
    const settings = cloudSettings({
        config: {
            clusters: 4,
            errorDiagnostics: true,
            singleAccount: false,
            webhook: { forwardLogs: true, ntfy: { enabled: true, topic: 'synthetic' } }
        },
        environment,
        directory: '/private/sessions'
    })
    assert.equal(settings.config.clusters, 1)
    assert.equal(settings.config.singleAccount, true)
    assert.equal(settings.config.headless, true)
    assert.equal(settings.config.sessionPath, '/private/sessions')
    assert.equal(settings.config.errorDiagnostics, false)
    assert.equal(settings.config.webhook.forwardLogs, false)
    assert.equal(settings.config.webhook.ntfy.enabled, true)
    assert.equal(settings.env.ACCOUNT_1_PASSWORD, 'password')
    assert.equal(settings.env.GITHUB_ACTIONS, 'true')
    for (const key of ['GITHUB_TOKEN', 'REWARDS_STATE_KEY', 'NODE_OPTIONS']) assert.equal(settings.env[key], undefined)
    assert.equal(settings.account, 'synthetic@example.invalid')
})
for (const environment of [
    {},
    { ACCOUNT_2_EMAIL: 'second@example.invalid' },
    { ACCOUNT_1_EMAIL: 'first@example.invalid', ACCOUNT_2_EMAIL: 'second@example.invalid' }
])
    test('cloud refuses invalid account scope: ' + Object.keys(environment).join(','), () => {
        assert.throws(() => cloudSettings({ config: {}, environment, directory: '/private/sessions' }))
    })

test('cloud CLI rejects missing credentials without invoking an account or leaking input', async () => {
    const { spawnSync } = await import('node:child_process')
    const result = spawnSync(process.execPath, [new URL('../main/cloud-entry.mjs', import.meta.url).pathname], {
        env: {
            PATH: process.env.PATH,
            REWARDS_STATE_KEY: 'SYNTHETIC_SECRET_INVALID',
            ACCOUNT_1_EMAIL: 'synthetic@example.invalid'
        },
        encoding: 'utf8',
        timeout: 5000
    })
    assert.equal(result.status, 1)
    assert.deepEqual(JSON.parse(result.stdout), { status: 'cloud_run_failed', code: 1 })
    assert.ok(!(result.stdout + result.stderr).includes('SYNTHETIC_SECRET_INVALID'))
    assert.ok(!(result.stdout + result.stderr).includes('synthetic@example.invalid'))
})

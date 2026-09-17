import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const cli = fileURLToPath(new URL('./inspect-fixture.mjs', import.meta.url))
const safeConfig = {
    schemaVersion: 1,
    mode: 'offline',
    capabilities: { network: false, login: false, rewardActions: false },
    maxFixtureBytes: 65536
}

function sample(market = 'CN', initial = 100, final = 103) {
    return {
        schemaVersion: 1,
        synthetic: true,
        market,
        panel: 'modern',
        initial: { userStatus: { availablePoints: initial } },
        final: { userStatus: { availablePoints: final } }
    }
}

function run(t, fixture, config = safeConfig, prepareFixture) {
    const dir = mkdtempSync(path.join(tmpdir(), 'rewards-fixture-test-'))
    t.after(() => rmSync(dir, { recursive: true, force: true }))
    const configPath = path.join(dir, 'config.json')
    const fixturePath = path.join(dir, 'fixture.json')
    writeFileSync(configPath, JSON.stringify(config))
    writeFileSync(fixturePath, typeof fixture === 'string' ? fixture : JSON.stringify(fixture))
    if (prepareFixture) prepareFixture(fixturePath)
    const processResult = spawnSync(process.execPath, [cli, '--config', configPath, '--fixture', fixturePath], {
        encoding: 'utf8',
        timeout: 5000
    })
    assert.ifError(processResult.error)
    return { ...processResult, report: processResult.stdout.trim() ? JSON.parse(processResult.stdout) : null }
}

for (const market of ['CN', 'HK']) {
    test(`${market} synthetic balances produce an observation, not live compatibility or credit proof`, t => {
        const result = run(t, sample(market))
        assert.equal(result.status, 0, result.stderr)
        assert.equal(result.report.market, market)
        assert.equal(result.report.status, 'observed')
        assert.equal(result.report.balanceDelta, 3)
        assert.equal(result.report.evidence, 'synthetic_fixture')
        assert.equal(result.report.liveCompatibility, 'not_tested')
        assert.equal(result.report.taskCredit, 'unverified')
    })
}

test('zero is a valid observed balance and unchanged is not failure', t => {
    const result = run(t, sample('CN', 0, 0))
    assert.equal(result.status, 0, result.stderr)
    assert.equal(result.report.finalBalance, 0)
    assert.equal(result.report.balanceDelta, 0)
})

test('a negative observed delta is preserved without claiming task attribution', t => {
    const result = run(t, sample('HK', 103, 100))
    assert.equal(result.status, 0, result.stderr)
    assert.equal(result.report.balanceDelta, -3)
    assert.equal(result.report.taskCredit, 'unverified')
})

for (const bad of [null, '100', -1, 1.5, Number.MAX_SAFE_INTEGER + 1, true]) {
    test(`invalid final balance ${String(bad)} is unknown rather than zero`, t => {
        const result = run(t, sample('CN', 100, bad))
        assert.equal(result.status, 2, result.stderr)
        assert.equal(result.report.status, 'unknown')
        assert.equal(result.report.finalBalance, null)
        assert.equal(result.report.balanceDelta, null)
    })
}

test('missing initial snapshot cannot produce a delta', t => {
    const fixture = sample()
    delete fixture.initial
    const result = run(t, fixture)
    assert.equal(result.status, 2, result.stderr)
    assert.equal(result.report.initialBalance, null)
    assert.equal(result.report.balanceDelta, null)
})

test('a missing final balance cannot be accepted as a valid zero', t => {
    const fixture = sample()
    delete fixture.final.userStatus.availablePoints
    const result = run(t, fixture)
    assert.equal(result.status, 2, result.stderr)
    assert.equal(result.report.finalBalance, null)
})

test('an unsupported panel is reported as incompatible', t => {
    const result = run(t, { ...sample(), panel: 'legacy' })
    assert.equal(result.status, 2, result.stderr)
    assert.equal(result.report.status, 'incompatible')
    assert.equal(result.report.balanceDelta, null)
})

for (const capability of ['network', 'login', 'rewardActions']) {
    test(`enabling ${capability} is rejected before parsing the fixture`, t => {
        const result = run(t, 'NOT JSON', {
            ...safeConfig,
            capabilities: { ...safeConfig.capabilities, [capability]: true }
        })
        assert.equal(result.status, 1)
        assert.equal(result.report.errorCode, 'OFFLINE_ONLY')
    })
}

test('an omitted capability is rejected rather than implicitly enabled', t => {
    const result = run(t, sample(), { ...safeConfig, capabilities: { network: false } })
    assert.equal(result.status, 1)
    assert.equal(result.report.errorCode, 'OFFLINE_ONLY')
})

test('malformed input returns a sanitized error without reflecting content', t => {
    const result = run(t, 'SECRET_FIXTURE_CONTENT')
    assert.equal(result.status, 1)
    assert.equal(result.report.errorCode, 'INVALID_JSON')
    assert.doesNotMatch(result.stdout + result.stderr, /SECRET_FIXTURE_CONTENT/)
})

test('oversized input is rejected before JSON parsing', t => {
    const result = run(t, 'x'.repeat(101), { ...safeConfig, maxFixtureBytes: 100 })
    assert.equal(result.status, 1)
    assert.equal(result.report.errorCode, 'INPUT_TOO_LARGE')
})

test('this stage rejects non-synthetic account observations', t => {
    const result = run(t, { ...sample(), synthetic: false })
    assert.equal(result.status, 1)
    assert.equal(result.report.errorCode, 'INVALID_FIXTURE')
})

test('a FIFO input is rejected without waiting for a writer', { skip: process.platform === 'win32' }, t => {
    const result = run(t, sample(), safeConfig, fixturePath => {
        rmSync(fixturePath)
        const fifo = spawnSync('mkfifo', [fixturePath], { encoding: 'utf8' })
        assert.equal(fifo.status, 0, fifo.stderr)
    })
    assert.equal(result.status, 1)
    assert.equal(result.report.errorCode, 'INVALID_FILE')
})

for (const limit of [0, -1, 1048577, '100', 1.5]) {
    test(`invalid byte budget ${String(limit)} rejects configuration`, t => {
        const result = run(t, sample(), { ...safeConfig, maxFixtureBytes: limit })
        assert.equal(result.status, 1)
        assert.equal(result.report.errorCode, 'INVALID_CONFIG')
    })
}

test('a missing input file returns a sanitized failure', t => {
    const result = run(t, sample(), safeConfig, fixturePath => rmSync(fixturePath))
    assert.equal(result.status, 1)
    assert.equal(result.report.errorCode, 'FILE_READ_FAILED')
})

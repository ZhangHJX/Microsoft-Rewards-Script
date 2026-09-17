import { closeSync, constants, fstatSync, openSync, readSync } from 'node:fs'
import { parseArgs } from 'node:util'

// This command reads local synthetic fixtures only. It never imports the bot entry point.
class ValidationError extends Error {
    constructor(code) {
        super(code)
        this.code = code
    }
}

function readJson(file, limit) {
    let fd
    try {
        // Avoid blocking on a FIFO before the opened descriptor can be checked.
        fd = openSync(file, constants.O_RDONLY | (constants.O_NONBLOCK ?? 0))
        const stat = fstatSync(fd)
        if (!stat.isFile()) throw new ValidationError('INVALID_FILE')
        if (stat.size > limit) throw new ValidationError('INPUT_TOO_LARGE')
        const buffer = Buffer.alloc(limit + 1)
        let used = 0
        while (used < buffer.length) {
            const count = readSync(fd, buffer, used, buffer.length - used, null)
            if (count === 0) break
            used += count
        }
        if (used > limit) throw new ValidationError('INPUT_TOO_LARGE')
        try {
            return JSON.parse(buffer.subarray(0, used).toString('utf8'))
        } catch {
            throw new ValidationError('INVALID_JSON')
        }
    } catch (error) {
        if (error instanceof ValidationError) throw error
        throw new ValidationError('FILE_READ_FAILED')
    } finally {
        if (fd !== undefined) closeSync(fd)
    }
}

function validateConfig(config) {
    if (config?.schemaVersion !== 1 || config?.mode !== 'offline') throw new ValidationError('INVALID_CONFIG')
    const capabilities = config.capabilities
    if (
        !capabilities ||
        Object.keys(capabilities).sort().join(',') !== 'login,network,rewardActions' ||
        Object.values(capabilities).some(value => value !== false)
    ) {
        throw new ValidationError('OFFLINE_ONLY')
    }
    if (
        !Number.isSafeInteger(config.maxFixtureBytes) ||
        config.maxFixtureBytes < 1 ||
        config.maxFixtureBytes > 1048576
    ) {
        throw new ValidationError('INVALID_CONFIG')
    }
}

function balance(snapshot) {
    const value = snapshot?.userStatus?.availablePoints
    return Number.isSafeInteger(value) && value >= 0 ? value : null
}

function inspect(fixture) {
    if (fixture?.schemaVersion !== 1 || fixture?.synthetic !== true || !['CN', 'HK'].includes(fixture?.market)) {
        throw new ValidationError('INVALID_FIXTURE')
    }
    const initialBalance = balance(fixture.initial)
    const finalBalance = balance(fixture.final)
    const compatiblePanel = fixture.panel === 'modern'
    const knownBalances = initialBalance !== null && finalBalance !== null
    const status = !compatiblePanel ? 'incompatible' : knownBalances ? 'observed' : 'unknown'
    return {
        schemaVersion: 1,
        evidence: 'synthetic_fixture',
        liveCompatibility: 'not_tested',
        taskCredit: 'unverified',
        market: fixture.market,
        status,
        initialBalance,
        finalBalance,
        balanceDelta: status === 'observed' ? finalBalance - initialBalance : null,
        reason: !compatiblePanel
            ? 'unsupported_panel'
            : knownBalances
              ? 'sample_values_only'
              : 'missing_or_invalid_balance'
    }
}

function main() {
    let values
    try {
        ;({ values } = parseArgs({ options: { config: { type: 'string' }, fixture: { type: 'string' } } }))
    } catch {
        throw new ValidationError('INVALID_ARGUMENTS')
    }
    if (!values.config || !values.fixture) throw new ValidationError('INVALID_ARGUMENTS')
    const config = readJson(values.config, 8192)
    validateConfig(config)
    const report = inspect(readJson(values.fixture, config.maxFixtureBytes))
    console.log(JSON.stringify(report))
    process.exitCode = report.status === 'observed' ? 0 : 2
}

try {
    main()
} catch (error) {
    console.log(
        JSON.stringify({
            status: 'rejected',
            errorCode: error instanceof ValidationError ? error.code : 'VALIDATION_FAILED'
        })
    )
    process.exitCode = 1
}

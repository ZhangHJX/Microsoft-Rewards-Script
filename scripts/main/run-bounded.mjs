import { spawn } from 'node:child_process'
import { parseArgs } from 'node:util'
import { pathToFileURL } from 'node:url'

export async function runBounded(command, args, { timeoutMs, graceMs = 5000 }) {
    if (process.platform === 'win32') throw new Error('Process-group supervision requires Linux or macOS')
    if (
        !Number.isSafeInteger(timeoutMs) ||
        timeoutMs < 1 ||
        timeoutMs > 21600000 ||
        !Number.isSafeInteger(graceMs) ||
        graceMs < 1 ||
        graceMs > 30000
    )
        throw new Error('Invalid runtime budget')
    return await new Promise(resolve => {
        const child = spawn(command, args, { detached: true, stdio: 'inherit' })
        let reason = 'exited'
        let forcedCode
        let hardTimer
        let settled = false
        const signalGroup = signal => {
            if (!child.pid) return
            try {
                process.kill(-child.pid, signal)
            } catch (error) {
                if (error.code !== 'ESRCH') throw error
            }
        }
        const stop = (code, why) => {
            if (settled || forcedCode !== undefined) return
            forcedCode = code
            reason = why
            signalGroup('SIGTERM')
            hardTimer = setTimeout(() => signalGroup('SIGKILL'), graceMs)
        }
        const interrupt = () => stop(130, 'interrupted')
        const terminate = () => stop(143, 'terminated')
        const timer = setTimeout(() => stop(124, 'timed_out'), timeoutMs)
        process.on('SIGINT', interrupt)
        process.on('SIGTERM', terminate)
        const finish = (code, failedToSpawn = false) => {
            if (settled) return
            settled = true
            clearTimeout(timer)
            clearTimeout(hardTimer)
            process.off('SIGINT', interrupt)
            process.off('SIGTERM', terminate)
            // Do not leave browser/worker descendants behind when their leader exits.
            if (!failedToSpawn) signalGroup('SIGKILL')
            resolve({ code: forcedCode ?? code ?? 1, reason: failedToSpawn ? 'spawn_failed' : reason })
        }
        child.once('error', () => finish(1, true))
        child.once('exit', code => finish(code))
    })
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    try {
        const { values, positionals } = parseArgs({
            allowPositionals: true,
            options: {
                'timeout-ms': { type: 'string', default: '1800000' },
                'grace-ms': { type: 'string', default: '5000' }
            }
        })
        if (!positionals.length) throw new Error('Command required')
        const result = await runBounded(positionals[0], positionals.slice(1), {
            timeoutMs: Number(values['timeout-ms']),
            graceMs: Number(values['grace-ms'])
        })
        if (result.reason !== 'exited') console.error(JSON.stringify({ runtime: result.reason }))
        process.exitCode = result.code
    } catch {
        console.error(JSON.stringify({ runtime: 'supervisor_failed' }))
        process.exitCode = 1
    }
}

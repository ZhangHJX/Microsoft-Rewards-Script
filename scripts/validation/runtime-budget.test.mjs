import assert from 'node:assert/strict'
import test from 'node:test'
import { runBounded } from '../main/run-bounded.mjs'
for (const code of [0, 7])
    test('preserves child exit code ' + code, async () => {
        const result = await runBounded(process.execPath, ['-e', `process.exit(${code})`], {
            timeoutMs: 2000,
            graceMs: 100
        })
        assert.equal(result.code, code)
        assert.equal(result.reason, 'exited')
    })
test('hard timeout terminates an unresponsive child', async () => {
    const start = Date.now()
    const result = await runBounded(process.execPath, ['-e', 'process.on("SIGTERM",()=>{});while(true){}'], {
        timeoutMs: 200,
        graceMs: 100
    })
    assert.equal(result.code, 124)
    assert.equal(result.reason, 'timed_out')
    assert.ok(Date.now() - start < 3000)
})
test('rejects invalid budget before spawning', async () => {
    await assert.rejects(runBounded('must-not-start', [], { timeoutMs: 0, graceMs: 100 }))
})
test('spawn failure yields a sanitized nonzero result', async () => {
    const result = await runBounded('/nonexistent/synthetic-command', [], { timeoutMs: 1000, graceMs: 100 })
    assert.equal(result.code, 1)
    assert.equal(result.reason, 'spawn_failed')
})

test('CLI exposes timeout exit code instead of success', async () => {
    const { spawnSync } = await import('node:child_process')
    const result = spawnSync(
        process.execPath,
        [
            new URL('../main/run-bounded.mjs', import.meta.url).pathname,
            '--timeout-ms',
            '200',
            '--grace-ms',
            '100',
            '--',
            process.execPath,
            '-e',
            'while(true){}'
        ],
        { encoding: 'utf8', timeout: 3000 }
    )
    assert.ifError(result.error)
    assert.equal(result.status, 124)
    assert.match(result.stderr, /timed_out/)
})

test('timeout stops descendant activity as well as the group leader', async t => {
    const { mkdtempSync, readFileSync, rmSync } = await import('node:fs')
    const { tmpdir } = await import('node:os')
    const { join } = await import('node:path')
    const dir = mkdtempSync(join(tmpdir(), 'runtime-tree-'))
    t.after(() => rmSync(dir, { recursive: true, force: true }))
    const marker = join(dir, 'heartbeat')
    const descendant = `const fs=require('node:fs');setInterval(()=>fs.writeFileSync(${JSON.stringify(marker)},String(Date.now())),10)`
    const leader = `require('node:child_process').spawn(process.execPath,['-e',${JSON.stringify(descendant)}],{stdio:'ignore'});setInterval(()=>{},1000)`
    const result = await runBounded(process.execPath, ['-e', leader], { timeoutMs: 500, graceMs: 100 })
    assert.equal(result.code, 124)
    await new Promise(resolve => setTimeout(resolve, 50))
    const stopped = readFileSync(marker, 'utf8')
    await new Promise(resolve => setTimeout(resolve, 100))
    assert.equal(readFileSync(marker, 'utf8'), stopped)
})

import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import test from 'node:test'
const require = createRequire(import.meta.url)
const { acquireAccountLock } = require('../../dist/util/AccountLock.js')
function directory(t) {
    const dir = mkdtempSync(join(tmpdir(), 'account-lock-'))
    t.after(() => rmSync(dir, { recursive: true, force: true }))
    return dir
}
test('same account is exclusive, other accounts remain independent', t => {
    const dir = directory(t)
    const release = acquireAccountLock(dir, ' User@example.invalid ')
    try {
        assert.throws(() => acquireAccountLock(dir, 'user@example.invalid'), { code: 'ACCOUNT_BUSY' })
        const other = acquireAccountLock(dir, 'other@example.invalid')
        other()
    } finally {
        release()
    }
    const next = acquireAccountLock(dir, 'user@example.invalid')
    next()
})
test('real child process sees the lock and can acquire after release', t => {
    const dir = directory(t)
    const release = acquireAccountLock(dir, 'a')
    const module = require.resolve('../../dist/util/AccountLock.js')
    const script = `const {acquireAccountLock}=require(process.argv[1]);try{const release=acquireAccountLock(process.argv[2],'a');release();process.exit(0)}catch(e){process.exit(e.code==='ACCOUNT_BUSY'?2:3)}`
    try {
        assert.equal(spawnSync(process.execPath, ['-e', script, module, dir]).status, 2)
    } finally {
        release()
    }
    assert.equal(spawnSync(process.execPath, ['-e', script, module, dir]).status, 0)
})
test('operating system releases transaction when child exits without cleanup', t => {
    const dir = directory(t)
    const module = require.resolve('../../dist/util/AccountLock.js')
    assert.equal(
        spawnSync(process.execPath, [
            '-e',
            `require(process.argv[1]).acquireAccountLock(process.argv[2],'a');process.exit(0)`,
            module,
            dir
        ]).status,
        0
    )
    const release = acquireAccountLock(dir, 'a')
    release()
})

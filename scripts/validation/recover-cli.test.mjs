import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { DatabaseSync } from 'node:sqlite'
import test from 'node:test'
const require = createRequire(import.meta.url)
const { BlockStateStore } = require('../../dist/util/BlockStateStore.js')
const cli = new URL('../main/recover-account.mjs', import.meta.url)
for (const warning of [false, true]) {
    test('recovery command with synthetic transport; warning=' + warning, t => {
        const dir = mkdtempSync(join(tmpdir(), 'recover-cli-'))
        t.after(() => rmSync(dir, { recursive: true, force: true }))
        const store = new BlockStateStore(join(dir, 'account-blocks.sqlite'))
        t.after(() => store.close())
        store.block('synthetic@example.invalid', 'BALANCE_UNAVAILABLE')
        const db = new DatabaseSync(join(dir, 'sessions.db'))
        db.exec('CREATE TABLE sessions (email TEXT, platform TEXT, storage_state TEXT)')
        db.prepare('INSERT INTO sessions VALUES (?, ?, ?)').run(
            'synthetic@example.invalid',
            'desktop',
            JSON.stringify({
                cookies: [{ name: 's', value: 'TEST_SECRET', domain: '.bing.com', path: '/', expires: -1 }]
            })
        )
        db.close()
        const preload = join(dir, 'fetch.mjs')
        writeFileSync(
            preload,
            `globalThis.fetch = async () => new Response(JSON.stringify({dashboard:{userStatus:{isRewardsUser:true,availablePoints:0},userWarnings:${warning ? '[{name:"warning"}]' : '[]'}}}), {headers:{'content-type':'application/json'}})`
        )
        const result = spawnSync(
            process.execPath,
            ['--import', preload, cli.pathname, '--session-dir', dir, '--account', 'synthetic@example.invalid'],
            { encoding: 'utf8', timeout: 5000 }
        )
        assert.ifError(result.error)
        assert.equal(result.status, warning ? 2 : 0)
        assert.equal(JSON.parse(result.stdout).status, warning ? 'still_blocked' : 'resumed')
        assert.equal(store.get('synthetic@example.invalid') === null, !warning)
        assert.ok(!result.stdout.includes('TEST_SECRET'))
    })
}
test('command rejects absent arguments before any account activity', () => {
    const result = spawnSync(process.execPath, [cli.pathname], { encoding: 'utf8', timeout: 5000 })
    assert.equal(result.status, 1)
    assert.equal(JSON.parse(result.stdout).status, 'recovery_failed')
})

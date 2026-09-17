import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
const require = createRequire(import.meta.url)
const { BlockStateStore } = require('../../dist/util/BlockStateStore.js')
const { deliverBlockNotifications } = require('../../dist/logging/BlockNotifications.js')
test('acknowledges channels independently and retries only failed delivery', async t => {
    const dir = mkdtempSync(join(tmpdir(), 'block-notify-'))
    const store = new BlockStateStore(join(dir, 'state.sqlite'))
    t.after(() => {
        store.close()
        rmSync(dir, { recursive: true, force: true })
    })
    store.block('a', 'BALANCE_UNAVAILABLE')
    let first = 0
    let second = 0
    const destinations = [
        {
            identity: 'one-secret',
            send: async content => {
                first++
                assert.match(content, /BALANCE_UNAVAILABLE/)
                return true
            }
        },
        {
            identity: 'two-secret',
            send: async () => {
                second++
                return second > 1
            }
        }
    ]
    await deliverBlockNotifications(store, 'a', destinations)
    await deliverBlockNotifications(store, 'a', destinations)
    await deliverBlockNotifications(store, 'a', destinations)
    assert.equal(first, 1)
    assert.equal(second, 2)
    store.block('a', 'ACCOUNT_RESTRICTED')
    await deliverBlockNotifications(store, 'a', [
        {
            identity: 'one-secret',
            send: async () => {
                first++
                return true
            }
        }
    ])
    assert.equal(first, 2)
})

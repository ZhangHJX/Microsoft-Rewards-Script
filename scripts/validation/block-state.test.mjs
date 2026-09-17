import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
const require = createRequire(import.meta.url)
const { BlockStateStore } = require('../../dist/util/BlockStateStore.js')
function setup(t) {
    const dir = mkdtempSync(join(tmpdir(), 'rewards-block-'))
    const path = join(dir, 'state.sqlite')
    const stores = []
    const open = () => {
        const store = new BlockStateStore(path)
        stores.push(store)
        return store
    }
    t.after(() => {
        for (const store of stores) store.close()
        rmSync(dir, { recursive: true, force: true })
    })
    return { open }
}

test('block persists across connections and isolates accounts', t => {
    const { open } = setup(t)
    const a = open()
    const b = open()
    const block = a.block(' User@example.invalid ', 'BALANCE_UNAVAILABLE')
    assert.deepEqual(b.get('user@example.invalid'), block)
    assert.equal(b.get('other@example.invalid'), null)
})
test('repeated same failure preserves revision and notification acknowledgement', t => {
    const store = setup(t).open()
    const first = store.block('a', 'FLOW_FAILED')
    assert.equal(store.acknowledgeNotification('a', first.revision), true)
    const repeated = store.block('a', 'FLOW_FAILED')
    assert.equal(repeated.revision, first.revision)
    assert.equal(repeated.notified, true)
})
test('changed failure invalidates old notification acknowledgement', t => {
    const store = setup(t).open()
    const first = store.block('a', 'FLOW_FAILED')
    const changed = store.block('a', 'BALANCE_UNAVAILABLE')
    assert.notEqual(changed.revision, first.revision)
    assert.equal(store.acknowledgeNotification('a', first.revision), false)
    assert.equal(store.get('a').notified, false)
})
test('unsuccessful validation keeps the block and consumes its token', t => {
    const store = setup(t).open()
    store.block('a', 'FLOW_FAILED')
    const token = store.beginValidation('a')
    assert.equal(store.finishValidation('a', token, false), false)
    assert.ok(store.get('a'))
    assert.equal(store.finishValidation('a', token, true), false)
})
test('successful current validation clears only its account', t => {
    const store = setup(t).open()
    store.block('a', 'FLOW_FAILED')
    store.block('b', 'FLOW_FAILED')
    const token = store.beginValidation('a')
    assert.equal(store.finishValidation('a', token, true), true)
    assert.equal(store.get('a'), null)
    assert.ok(store.get('b'))
})
test('another failure prevents stale validation from clearing the block', t => {
    const { open } = setup(t)
    const a = open()
    const b = open()
    a.block('a', 'FLOW_FAILED')
    const token = a.beginValidation('a')
    b.block('a', 'FLOW_FAILED')
    assert.equal(a.finishValidation('a', token, true), false)
    assert.ok(b.get('a'))
})
test('new validation invalidates earlier validation token', t => {
    const store = setup(t).open()
    store.block('a', 'FLOW_FAILED')
    const old = store.beginValidation('a')
    const current = store.beginValidation('a')
    assert.equal(store.finishValidation('a', old, true), false)
    assert.equal(store.finishValidation('a', current, true), true)
})
test('unblocked account cannot issue a resume token', t => {
    const store = setup(t).open()
    assert.equal(store.beginValidation('a'), null)
    assert.equal(store.finishValidation('a', '', true), false)
})
test('rejects arbitrary reason and blank account without writing a block', t => {
    const store = setup(t).open()
    assert.throws(() => store.block('a', 'SECRET_REASON'))
    assert.throws(() => store.block('  ', 'FLOW_FAILED'))
    assert.equal(store.get('a'), null)
})

test('notification leases isolate destinations and prevent simultaneous claims', t => {
    const { open } = setup(t)
    const a = open()
    const b = open()
    const block = a.block('a', 'FLOW_FAILED')
    const token = a.claimDelivery('a', block.revision, 'channel-a', 100, 1000)
    assert.ok(token)
    assert.equal(b.claimDelivery('a', block.revision, 'channel-a', 101, 1000), null)
    assert.ok(b.claimDelivery('a', block.revision, 'channel-b', 101, 1000))
    assert.equal(a.finishDelivery('a', block.revision, 'channel-a', token, true), true)
    assert.equal(b.claimDelivery('a', block.revision, 'channel-a', 2000, 1000), null)
})
test('failed delivery can be retried but stale token cannot acknowledge', t => {
    const store = setup(t).open()
    const block = store.block('a', 'FLOW_FAILED')
    const old = store.claimDelivery('a', block.revision, 'channel', 100, 1000)
    assert.equal(store.finishDelivery('a', block.revision, 'channel', old, false), true)
    const next = store.claimDelivery('a', block.revision, 'channel', 101, 1000)
    assert.ok(next)
    assert.equal(store.finishDelivery('a', block.revision, 'channel', old, true), false)
    assert.equal(store.finishDelivery('a', block.revision, 'channel', next, true), true)
})
test('expired lease is reclaimable and prior revision cannot be acknowledged', t => {
    const store = setup(t).open()
    const block = store.block('a', 'FLOW_FAILED')
    const old = store.claimDelivery('a', block.revision, 'channel', 100, 1000)
    const next = store.claimDelivery('a', block.revision, 'channel', 1100, 1000)
    assert.ok(next)
    assert.notEqual(next, old)
    store.block('a', 'BALANCE_UNAVAILABLE')
    assert.equal(store.finishDelivery('a', block.revision, 'channel', next, true), false)
    assert.equal(store.claimDelivery('a', block.revision, 'channel', 1200, 1000), null)
})

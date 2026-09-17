import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import test from 'node:test'
const channels = [
    ['Discord', 'sendDiscord', 'https://example.invalid/webhook'],
    ['Ntfy', 'sendNtfy', { url: 'https://example.invalid', topic: 'test' }],
    ['Telegram', 'sendTelegram', { botToken: 'synthetic', chatId: 'synthetic' }]
]
for (const [file, method, config] of channels) {
    for (const delivered of [true, false]) {
        test(file + ' reports transport acknowledgement=' + delivered, async () => {
            const exports = {}
            let requests = 0
            vm.runInNewContext(readFileSync(new URL('../../dist/logging/' + file + '.js', import.meta.url), 'utf8'), {
                exports,
                require: name => {
                    if (name === '../util/Http')
                        return {
                            httpRequest: async request => {
                                requests++
                                assert.equal(request.retries, 0)
                                if (!delivered) throw new Error('synthetic failure')
                                return { status: 200, data: { ok: true } }
                            }
                        }
                    if (name === 'p-queue')
                        return class {
                            async add(fn) {
                                return await fn()
                            }
                        }
                    if (name === './Queue') return { flushQueue: async () => {} }
                    throw new Error('Unexpected import ' + name)
                }
            })
            assert.equal(await exports[method](config, 'synthetic message', 'error'), delivered)
            assert.equal(requests, 1)
        })
    }
}

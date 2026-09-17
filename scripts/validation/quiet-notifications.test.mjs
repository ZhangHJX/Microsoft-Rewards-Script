import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import test from 'node:test'
const require = createRequire(import.meta.url)
for (const primary of [true, false])
    for (const forwardLogs of [undefined, false, true]) {
        test('log forwarding primary=' + primary + ' configured=' + forwardLogs, () => {
            let forwarded = 0
            let local = 0
            const exports = {}
            vm.runInNewContext(readFileSync(new URL('../../dist/logging/Logger.js', import.meta.url), 'utf8'), {
                exports,
                console: { log: () => local++, warn: () => local++, error: () => local++ },
                process: { argv: [], send: () => forwarded++ },
                require: name => {
                    if (name === 'chalk') return require('chalk')
                    if (name === 'cluster') return { isPrimary: primary }
                    if (name === './Discord') return { sendDiscord: () => forwarded++ }
                    if (name === './Ntfy') return { sendNtfy() {} }
                    if (name === './Telegram') return { sendTelegram() {} }
                    if (name === '../util/ErrorDiagnostic') return { errorDiagnostic() {} }
                    throw new Error(name)
                }
            })
            const logger = new exports.Logger({
                config: { webhook: { forwardLogs, discord: { enabled: true, url: 'synthetic' } } },
                userData: {}
            })
            logger.info('main', 'RUN-END', 'synthetic')
            assert.equal(local, 1)
            assert.equal(forwarded, forwardLogs === true ? 1 : 0)
        })
    }

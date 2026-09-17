import { createRequire } from 'node:module'
import { existsSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { parseArgs } from 'node:util'
import { DatabaseSync } from 'node:sqlite'

const require = createRequire(import.meta.url)
let blocks
let release
try {
    const { values } = parseArgs({
        options: {
            'session-dir': { type: 'string' },
            account: { type: 'string' },
            platform: { type: 'string', default: 'desktop' }
        }
    })
    if (!values['session-dir'] || !values.account?.trim() || !['desktop', 'mobile'].includes(values.platform))
        throw new Error('Invalid arguments')
    const { BlockStateStore } = require('../../dist/util/BlockStateStore.js')
    const { validateBlockedAccount } = require('../../dist/util/AccountRecovery.js')
    const { validateSavedDashboard } = require('../../dist/util/RecoveryDashboard.js')
    const { acquireAccountLock } = require('../../dist/util/AccountLock.js')
    const directory = resolve(values['session-dir'])
    release = acquireAccountLock(directory, values.account)
    const blockPath = join(directory, 'account-blocks.sqlite')
    let status = 'not_blocked'
    if (existsSync(blockPath)) {
        blocks = new BlockStateStore(blockPath)
        status = await validateBlockedAccount(
            blocks,
            values.account,
            async (block, signal) => {
                const sessions = new DatabaseSync(join(directory, 'sessions.db'), { readOnly: true })
                let row
                try {
                    row = sessions
                        .prepare('SELECT storage_state FROM sessions WHERE lower(trim(email)) = ? AND platform = ?')
                        .get(values.account.trim().toLowerCase(), values.platform)
                } finally {
                    sessions.close()
                }
                if (!row || typeof row.storage_state !== 'string') return false
                const state = JSON.parse(row.storage_state)
                if (!Array.isArray(state?.cookies)) return false
                return await validateSavedDashboard(block, state.cookies, signal)
            },
            30000
        )
    }
    console.log(JSON.stringify({ status }))
    process.exitCode = ['resumed', 'not_blocked'].includes(status) ? 0 : 2
} catch {
    console.log(JSON.stringify({ status: 'recovery_failed' }))
    process.exitCode = 1
} finally {
    try {
        blocks?.close()
    } finally {
        release?.()
    }
}

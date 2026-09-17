import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { BlockStateStore } from './BlockStateStore'

function storageFailure(): Error {
    return Object.assign(new Error('Account state storage is unavailable'), { code: 'STATE_STORAGE_FAILED' })
}

export async function runUnlessBlocked<T extends { skippedForBotWarning?: boolean } | undefined>(
    sessionPath: string,
    account: string,
    run: () => Promise<T>
): Promise<T> {
    let store: BlockStateStore
    try {
        mkdirSync(sessionPath, { recursive: true, mode: 0o700 })
        store = new BlockStateStore(join(sessionPath, 'account-blocks.sqlite'))
    } catch {
        throw storageFailure()
    }
    try {
        let block
        try {
            block = store.get(account)
        } catch {
            throw storageFailure()
        }
        if (block)
            throw Object.assign(new Error('Account requires validated recovery'), {
                code: 'ACCOUNT_BLOCKED',
                reason: block.reason
            })
        let result: T
        try {
            result = await run()
        } catch (error) {
            if (
                typeof error === 'object' &&
                error !== null &&
                'code' in error &&
                error.code === 'BALANCE_UNAVAILABLE'
            ) {
                try {
                    store.block(account, 'BALANCE_UNAVAILABLE')
                } catch {
                    throw storageFailure()
                }
            }
            throw error
        }
        if (result?.skippedForBotWarning) {
            try {
                store.block(account, 'ACCOUNT_RESTRICTED')
            } catch {
                throw storageFailure()
            }
        }
        return result
    } finally {
        store.close()
    }
}

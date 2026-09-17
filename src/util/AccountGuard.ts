import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { BlockStateStore } from './BlockStateStore'
import { acquireAccountLock } from './AccountLock'

function storageFailure(): Error {
    return Object.assign(new Error('Account state storage is unavailable'), { code: 'STATE_STORAGE_FAILED' })
}

export async function runUnlessBlocked<T extends { skippedForBotWarning?: boolean } | undefined>(
    sessionPath: string,
    account: string,
    run: () => Promise<T>,
    notify?: (store: BlockStateStore) => Promise<void>
): Promise<T> {
    const release = acquireAccountLock(sessionPath, account)
    let store: BlockStateStore
    try {
        mkdirSync(sessionPath, { recursive: true, mode: 0o700 })
        store = new BlockStateStore(join(sessionPath, 'account-blocks.sqlite'))
    } catch {
        release()
        throw storageFailure()
    }
    try {
        let block
        try {
            block = store.get(account)
        } catch {
            throw storageFailure()
        }
        if (block) {
            await notify?.(store)
            throw Object.assign(new Error('Account requires validated recovery'), {
                code: 'ACCOUNT_BLOCKED',
                reason: block.reason
            })
        }
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
                    await notify?.(store)
                } catch {
                    throw storageFailure()
                }
            }
            throw error
        }
        if (result?.skippedForBotWarning) {
            try {
                store.block(account, 'ACCOUNT_RESTRICTED')
                await notify?.(store)
            } catch {
                throw storageFailure()
            }
        }
        return result
    } finally {
        try {
            store.close()
        } finally {
            release()
        }
    }
}

import type { AccountBlock, BlockStateStore } from './BlockStateStore'

export type RecoveryResult = 'not_blocked' | 'resumed' | 'still_blocked' | 'timed_out'

// The caller must supply a read-only, reason-specific validator, never the account executor.
export async function validateBlockedAccount(
    store: BlockStateStore,
    account: string,
    validate: (block: AccountBlock, signal: AbortSignal) => Promise<boolean>,
    timeoutMs: number
): Promise<RecoveryResult> {
    if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 300000) {
        throw new Error('Recovery budget must be between 1 and 300000 milliseconds')
    }
    const block = store.get(account)
    if (!block) return 'not_blocked'
    const token = store.beginValidation(account, block.revision)
    if (!token) return 'still_blocked'
    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
        const outcome = await Promise.race([
            Promise.resolve()
                .then(() => validate(block, controller.signal))
                .then(
                    value => (value === true ? 'passed' : 'failed'),
                    () => 'failed'
                ),
            new Promise<'timeout'>(resolve => {
                timer = setTimeout(() => {
                    resolve('timeout')
                    controller.abort()
                }, timeoutMs)
            })
        ])
        const resumed = store.finishValidation(account, token, outcome === 'passed')
        if (outcome === 'timeout') return 'timed_out'
        return resumed ? 'resumed' : 'still_blocked'
    } finally {
        clearTimeout(timer)
        controller.abort()
    }
}

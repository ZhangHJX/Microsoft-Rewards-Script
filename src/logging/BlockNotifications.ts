import { createHash } from 'node:crypto'
import type { BlockStateStore } from '../util/BlockStateStore'

export interface BlockNotificationDestination {
    identity: string
    send: (content: string) => Promise<boolean>
}

export async function deliverBlockNotifications(
    store: BlockStateStore,
    account: string,
    destinations: BlockNotificationDestination[]
): Promise<void> {
    const block = store.get(account)
    if (!block) return
    const accountLabel = createHash('sha256').update(account.trim().toLowerCase()).digest('hex').slice(0, 12)
    const content = `Account ${accountLabel} blocked: ${block.reason}. Inspect the account and run recover:account after resolving the cause. Reference: ${block.revision}`
    for (const destination of destinations) {
        const key = createHash('sha256').update(destination.identity).digest('hex')
        const token = store.claimDelivery(account, block.revision, key, Date.now(), 300000)
        if (!token) continue
        let delivered = false
        try {
            delivered = (await destination.send(content)) === true
        } catch {
            /* Leave delivery eligible for retry. */
        }
        store.finishDelivery(account, block.revision, key, token, delivered)
    }
}

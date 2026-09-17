import { createHash, randomUUID } from 'node:crypto'
import { DatabaseSync } from 'node:sqlite'

const reasons = ['BALANCE_UNAVAILABLE', 'FLOW_FAILED', 'ACCOUNT_RESTRICTED'] as const
export type BlockReason = (typeof reasons)[number]
export interface AccountBlock {
    reason: BlockReason
    revision: string
    blockedAt: string
    notified: boolean
}

// A store owns its connection; no process-global database or account credentials.
export class BlockStateStore {
    private db: DatabaseSync

    constructor(path: string) {
        this.db = new DatabaseSync(path)
        this.db.exec(`PRAGMA busy_timeout = 5000;
            CREATE TABLE IF NOT EXISTS account_blocks (
                account_key TEXT PRIMARY KEY,
                reason TEXT NOT NULL,
                revision TEXT NOT NULL,
                blocked_at TEXT NOT NULL,
                notified INTEGER NOT NULL DEFAULT 0,
                validation_token TEXT
            );
            CREATE TABLE IF NOT EXISTS block_deliveries (
                account_key TEXT NOT NULL, revision TEXT NOT NULL, destination TEXT NOT NULL,
                token TEXT NOT NULL, lease_until INTEGER NOT NULL, acknowledged INTEGER NOT NULL DEFAULT 0,
                PRIMARY KEY(account_key, revision, destination)
            )`)
    }

    private key(account: string): string {
        if (typeof account !== 'string' || !account.trim()) throw new Error('Invalid account identity')
        return createHash('sha256').update(account.trim().toLowerCase()).digest('hex')
    }

    get(account: string): AccountBlock | null {
        const row = this.db
            .prepare('SELECT reason, revision, blocked_at, notified FROM account_blocks WHERE account_key = ?')
            .get(this.key(account))
        if (!row) return null
        return {
            reason: row.reason as BlockReason,
            revision: String(row.revision),
            blockedAt: String(row.blocked_at),
            notified: row.notified === 1
        }
    }

    block(account: string, reason: BlockReason): AccountBlock {
        if (!reasons.includes(reason)) throw new Error('Invalid block reason')
        this.db
            .prepare(
                `INSERT INTO account_blocks (account_key, reason, revision, blocked_at) VALUES (?, ?, ?, ?)
            ON CONFLICT(account_key) DO UPDATE SET
                revision = CASE WHEN reason = excluded.reason THEN revision ELSE excluded.revision END,
                blocked_at = CASE WHEN reason = excluded.reason THEN blocked_at ELSE excluded.blocked_at END,
                notified = CASE WHEN reason = excluded.reason THEN notified ELSE 0 END,
                reason = excluded.reason, validation_token = NULL`
            )
            .run(this.key(account), reason, randomUUID(), new Date().toISOString())
        return this.get(account)!
    }

    acknowledgeNotification(account: string, revision: string): boolean {
        return (
            this.db
                .prepare('UPDATE account_blocks SET notified = 1 WHERE account_key = ? AND revision = ?')
                .run(this.key(account), revision).changes === 1
        )
    }

    beginValidation(account: string, expectedRevision?: string): string | null {
        const token = randomUUID()
        const revision = expectedRevision ?? this.get(account)?.revision
        if (!revision) return null
        const result = this.db
            .prepare('UPDATE account_blocks SET validation_token = ? WHERE account_key = ? AND revision = ?')
            .run(token, this.key(account), revision)
        return result.changes === 1 ? token : null
    }

    finishValidation(account: string, token: string, passed: boolean): boolean {
        if (passed !== true) {
            this.db
                .prepare(
                    'UPDATE account_blocks SET validation_token = NULL WHERE account_key = ? AND validation_token = ?'
                )
                .run(this.key(account), token)
            return false
        }
        return (
            this.db
                .prepare('DELETE FROM account_blocks WHERE account_key = ? AND validation_token = ?')
                .run(this.key(account), token).changes === 1
        )
    }

    claimDelivery(account: string, revision: string, destination: string, now: number, leaseMs: number): string | null {
        if (
            !Number.isSafeInteger(now) ||
            !Number.isSafeInteger(leaseMs) ||
            leaseMs < 1 ||
            leaseMs > 300000 ||
            !destination
        ) {
            throw new Error('Invalid delivery lease')
        }
        const token = randomUUID()
        const key = this.key(account)
        const result = this.db
            .prepare(
                `INSERT INTO block_deliveries (account_key, revision, destination, token, lease_until)
            SELECT ?, ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM account_blocks WHERE account_key = ? AND revision = ?)
            ON CONFLICT(account_key, revision, destination) DO UPDATE SET token = excluded.token, lease_until = excluded.lease_until
            WHERE acknowledged = 0 AND lease_until <= ?`
            )
            .run(key, revision, destination, token, now + leaseMs, key, revision, now)
        return result.changes === 1 ? token : null
    }

    finishDelivery(account: string, revision: string, destination: string, token: string, delivered: boolean): boolean {
        const key = this.key(account)
        return (
            this.db
                .prepare(
                    `UPDATE block_deliveries SET acknowledged = ?, lease_until = 0, token = ''
            WHERE account_key = ? AND revision = ? AND destination = ? AND token = ?
            AND EXISTS (SELECT 1 FROM account_blocks WHERE account_key = ? AND revision = ?)`
                )
                .run(delivered === true ? 1 : 0, key, revision, destination, token, key, revision).changes === 1
        )
    }

    close(): void {
        this.db.close()
    }
}

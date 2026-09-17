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

    beginValidation(account: string): string | null {
        const token = randomUUID()
        const result = this.db
            .prepare('UPDATE account_blocks SET validation_token = ? WHERE account_key = ?')
            .run(token, this.key(account))
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

    close(): void {
        this.db.close()
    }
}

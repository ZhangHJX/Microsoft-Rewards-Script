import { createHash } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'

// SQLite owns the OS lock: process exit releases it without stale PID-file cleanup.
// All contenders must share this directory on a filesystem supporting SQLite locks.
export function acquireAccountLock(sessionPath: string, account: string): () => void {
    if (!account.trim()) throw new Error('Invalid account identity')
    const key = createHash('sha256').update(account.trim().toLowerCase()).digest('hex')
    let db: DatabaseSync | undefined
    try {
        const directory = join(sessionPath, 'account-locks')
        mkdirSync(directory, { recursive: true, mode: 0o700 })
        db = new DatabaseSync(join(directory, `${key}.sqlite`))
        db.exec('PRAGMA busy_timeout = 0; BEGIN IMMEDIATE')
    } catch (error) {
        db?.close()
        const busy =
            typeof error === 'object' &&
            error !== null &&
            'errcode' in error &&
            (error.errcode === 5 || error.errcode === 6)
        throw Object.assign(new Error(busy ? 'Account is already running' : 'Account lock storage is unavailable'), {
            code: busy ? 'ACCOUNT_BUSY' : 'STATE_STORAGE_FAILED'
        })
    }
    let released = false
    return () => {
        if (released) return
        released = true
        try {
            db.exec('ROLLBACK')
        } finally {
            db.close()
        }
    }
}

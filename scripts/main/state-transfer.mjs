import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'
import { DatabaseSync, backup } from 'node:sqlite'
import { lstat, mkdtemp, readFile, writeFile, chmod, mkdir, rm, rename } from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { acquireAccountLock } = require('../../dist/util/AccountLock.js')
const names = ['sessions.db', 'account-blocks.sqlite']
const marker = Buffer.from('REWARDS-STATE-1\0')
const maxPlaintext = 32 * 1024 * 1024
const failure = () => Object.assign(new Error('State transfer failed'), { code: 'STATE_TRANSFER_FAILED' })

function identity(account, key) {
    if (typeof account !== 'string' || !account.trim() || !Buffer.isBuffer(key) || key.length !== 32) throw failure()
    return createHash('sha256').update(account.trim().toLowerCase()).digest('hex')
}

function validateDatabase(filename, name, account, accountHash) {
    const db = new DatabaseSync(filename, { readOnly: true })
    try {
        if (db.prepare('PRAGMA quick_check').get().quick_check !== 'ok') throw failure()
        const tables =
            name === 'sessions.db' ? ['sessions', 'account_metadata'] : ['account_blocks', 'block_deliveries']
        for (const table of tables) {
            const field = name === 'sessions.db' ? 'lower(trim(email))' : 'account_key'
            const expected = name === 'sessions.db' ? account.trim().toLowerCase() : accountHash
            if (
                db.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE ${field} IS NULL OR ${field} != ?`).get(expected)
                    .n !== 0
            )
                throw failure()
        }
        if (name === 'sessions.db' && db.prepare('SELECT COUNT(*) AS n FROM sessions').get().n === 0) throw failure()
    } finally {
        db.close()
    }
}

export async function exportState(sessionDir, account, key) {
    let release
    let temp
    try {
        const accountHash = identity(account, key)
        if (!(await lstat(sessionDir)).isDirectory()) throw failure()
        release = acquireAccountLock(sessionDir, account)
        temp = await mkdtemp(path.join(os.tmpdir(), 'rewards-state-'))
        await chmod(temp, 0o700)
        const files = {}
        for (const name of names) {
            const source = path.join(sessionDir, name)
            if (!(await lstat(source)).isFile()) throw failure()
            const snapshot = path.join(temp, name)
            const db = new DatabaseSync(source, { readOnly: true })
            try {
                await backup(db, snapshot)
            } finally {
                db.close()
            }
            await chmod(snapshot, 0o600)
            if ((await lstat(snapshot)).size > maxPlaintext) throw failure()
            validateDatabase(snapshot, name, account, accountHash)
            files[name] = (await readFile(snapshot)).toString('base64')
        }
        const plaintext = Buffer.from(
            JSON.stringify({ version: 1, accountHash, createdAt: new Date().toISOString(), files })
        )
        if (plaintext.length > maxPlaintext) throw failure()
        const nonce = randomBytes(12)
        const cipher = createCipheriv('aes-256-gcm', key, nonce)
        cipher.setAAD(marker)
        const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()])
        return Buffer.concat([marker, nonce, cipher.getAuthTag(), ciphertext])
    } catch (error) {
        if (error?.code === 'ACCOUNT_BUSY') throw error
        throw failure()
    } finally {
        try {
            if (temp) await rm(temp, { recursive: true, force: true })
        } finally {
            release?.()
        }
    }
}

export async function importState(encrypted, destination, account, key) {
    let temp
    let created = false
    try {
        const accountHash = identity(account, key)
        const header = marker.length + 12 + 16
        if (
            !Buffer.isBuffer(encrypted) ||
            encrypted.length <= header ||
            encrypted.length > maxPlaintext + header ||
            !encrypted.subarray(0, marker.length).equals(marker)
        )
            throw failure()
        const decipher = createDecipheriv('aes-256-gcm', key, encrypted.subarray(marker.length, marker.length + 12))
        decipher.setAAD(marker)
        decipher.setAuthTag(encrypted.subarray(marker.length + 12, header))
        const plaintext = Buffer.concat([decipher.update(encrypted.subarray(header)), decipher.final()])
        const payload = JSON.parse(plaintext.toString('utf8'))
        if (
            payload.version !== 1 ||
            payload.accountHash !== accountHash ||
            typeof payload.createdAt !== 'string' ||
            !Number.isFinite(Date.parse(payload.createdAt)) ||
            !payload.files ||
            Object.keys(payload.files).sort().join(',') !== [...names].sort().join(',')
        )
            throw failure()
        temp = await mkdtemp(path.join(path.dirname(path.resolve(destination)), '.rewards-restore-'))
        await chmod(temp, 0o700)
        for (const name of names) {
            const encoded = payload.files[name]
            if (
                typeof encoded !== 'string' ||
                !encoded ||
                Buffer.from(encoded, 'base64').toString('base64') !== encoded
            )
                throw failure()
            const filename = path.join(temp, name)
            await writeFile(filename, Buffer.from(encoded, 'base64'), { mode: 0o600, flag: 'wx' })
            validateDatabase(filename, name, account, accountHash)
        }
        // Exclusive reservation prevents overwriting an existing directory or symlink.
        // The caller must await completion before starting any state consumer.
        await mkdir(destination, { mode: 0o700 })
        created = true
        for (const name of names) await rename(path.join(temp, name), path.join(destination, name))
        return { createdAt: payload.createdAt }
    } catch {
        if (created) await rm(destination, { recursive: true, force: true })
        throw failure()
    } finally {
        if (temp) await rm(temp, { recursive: true, force: true })
    }
}

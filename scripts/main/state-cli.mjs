import { parseArgs } from 'node:util'
import { constants } from 'node:fs'
import { open, mkdtemp, chmod, link, rm } from 'node:fs/promises'
import path from 'node:path'

let key
let staging
let failed = false
let status
try {
    const { values, positionals } = parseArgs({
        allowPositionals: true,
        options: { 'session-dir': { type: 'string' }, file: { type: 'string' } }
    })
    const [command] = positionals
    const rawKey = process.env.REWARDS_STATE_KEY
    const account = process.env.REWARDS_STATE_ACCOUNT
    if (
        positionals.length !== 1 ||
        !['export', 'import'].includes(command) ||
        !values['session-dir'] ||
        !values.file ||
        !account?.trim() ||
        !/^[a-fA-F0-9]{64}$/.test(rawKey ?? '')
    )
        throw new Error('Invalid state transfer configuration')
    key = Buffer.from(rawKey, 'hex')
    const { exportState, importState } = await import('./state-transfer.mjs')
    const filename = path.resolve(values.file)
    const directory = path.resolve(values['session-dir'])
    if (command === 'export') {
        const encrypted = await exportState(directory, account, key)
        staging = await mkdtemp(path.join(path.dirname(filename), '.rewards-export-'))
        await chmod(staging, 0o700)
        const stagedFile = path.join(staging, 'state.enc')
        const handle = await open(stagedFile, 'wx', 0o600)
        try {
            await handle.writeFile(encrypted)
            await handle.sync()
        } finally {
            await handle.close()
        }
        // A same-filesystem hard link publishes the completed file without overwriting.
        await link(stagedFile, filename)
        status = 'exported'
    } else {
        const handle = await open(filename, constants.O_RDONLY | constants.O_NOFOLLOW)
        let encrypted
        try {
            const metadata = await handle.stat()
            if (!metadata.isFile() || metadata.size < 1 || metadata.size > 32 * 1024 * 1024 + 1024)
                throw new Error('Invalid state file')
            // Bounded read also detects growth after stat without following a replacement path.
            const buffer = Buffer.alloc(metadata.size + 1)
            let offset = 0
            while (offset < buffer.length) {
                const { bytesRead } = await handle.read(buffer, offset, buffer.length - offset, null)
                if (!bytesRead) break
                offset += bytesRead
            }
            if (offset !== metadata.size) throw new Error('State file changed')
            encrypted = buffer.subarray(0, offset)
        } finally {
            await handle.close()
        }
        await importState(encrypted, directory, account, key)
        status = 'imported'
    }
} catch {
    failed = true
} finally {
    key?.fill(0)
    if (staging) {
        try {
            await rm(staging, { recursive: true, force: true })
        } catch {
            failed = true
        }
    }
}
console.log(JSON.stringify({ status: failed ? 'state_transfer_failed' : status }))
process.exitCode = failed ? 1 : 0

// Synthetic integration acceptance only. Never pass real account data to this script.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { mkdtemp, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

const mode = process.argv[2]
const {
    GITHUB_RUN_ID: runId,
    GITHUB_RUN_ATTEMPT: attempt,
    GITHUB_REPOSITORY: repository,
    GITHUB_TOKEN: token,
    GITHUB_SHA: sha
} = process.env
assert.ok(['export', 'consume', 'cleanup'].includes(mode))
assert.match(runId ?? '', /^\d+$/)
assert.match(attempt ?? '', /^\d+$/)
assert.equal(repository, 'ZhangHJX/Microsoft-Rewards-Script')
assert.match(sha ?? '', /^[a-f0-9]{40}$/)
assert.ok(token)
const branch = `codex/rewards-state-ci-${runId}-${attempt}`
const base = `https://api.github.com/repos/${repository}`
async function request(endpoint, method, body) {
    const response = await fetch(base + endpoint, {
        method,
        redirect: 'error',
        signal: AbortSignal.timeout(15000),
        headers: {
            Authorization: `Bearer ${token}`,
            'X-GitHub-Api-Version': '2026-03-10',
            'Content-Type': 'application/json'
        },
        ...(body ? { body: JSON.stringify(body) } : {})
    })
    if (method === 'DELETE' && response.status === 404) return
    if (!response.ok) throw new Error('Synthetic remote operation failed with HTTP ' + response.status)
}
if (mode === 'cleanup') {
    await request('/git/refs/heads/' + branch, 'DELETE')
    console.log('Synthetic state branch removed or already absent')
} else {
    const require = createRequire(import.meta.url)
    const { saveStorageState, closeSessionStore, loadSession } = require('../../dist/util/SessionStore.js')
    const { BlockStateStore } = require('../../dist/util/BlockStateStore.js')
    const { exportState, importState } = await import('../main/state-transfer.mjs')
    const { GitHubStateStore } = await import('../main/remote-state.mjs')
    const { runCloudAccount } = await import('../main/cloud-run.mjs')
    // Public deterministic key solely for synthetic fixtures shared between jobs.
    // Production uses an independently random secret and never this derivation.
    const key = createHash('sha256').update(`PUBLIC-SYNTHETIC-ONLY:${runId}:${attempt}`).digest()
    const account = 'synthetic@example.invalid'
    const storage = {
        cookies: [
            {
                name: 'synthetic',
                value: 'NOT_A_REAL_COOKIE',
                domain: '.example.invalid',
                path: '/',
                expires: -1,
                httpOnly: true,
                secure: true,
                sameSite: 'Lax'
            }
        ],
        origins: []
    }
    const root = await mkdtemp(path.join(os.tmpdir(), 'runner-state-rehearsal-'))
    const remote = new GitHubStateStore({ repository, token, branch })
    try {
        if (mode === 'export') {
            const directory = path.join(root, 'source')
            saveStorageState(directory, account, false, storage)
            closeSessionStore()
            const blocks = new BlockStateStore(path.join(directory, 'account-blocks.sqlite'))
            try {
                const block = blocks.block(account, 'BALANCE_UNAVAILABLE')
                const lease = blocks.claimDelivery(account, block.revision, 'synthetic-destination', Date.now(), 300000)
                assert.ok(blocks.finishDelivery(account, block.revision, 'synthetic-destination', lease, true))
            } finally {
                blocks.close()
            }
            await request('/git/refs', 'POST', { ref: 'refs/heads/' + branch, sha })
            await remote.provision(await exportState(directory, account, key))
            console.log('Producer published synthetic encrypted state')
        } else {
            const directory = path.join(root, 'restored')
            const result = await runCloudAccount({
                remote,
                directory,
                account,
                key,
                execute: async () => {
                    assert.deepEqual(loadSession(directory, account, false).storageState, storage)
                    closeSessionStore()
                    const blocks = new BlockStateStore(path.join(directory, 'account-blocks.sqlite'))
                    try {
                        const block = blocks.get(account)
                        assert.equal(block.reason, 'BALANCE_UNAVAILABLE')
                        assert.equal(
                            blocks.claimDelivery(account, block.revision, 'synthetic-destination', Date.now(), 300000),
                            null
                        )
                        blocks.block(account, 'ACCOUNT_RESTRICTED')
                    } finally {
                        blocks.close()
                    }
                    return { code: 1, reason: 'exited' }
                }
            })
            assert.equal(result.code, 1)
            const latest = await remote.read()
            assert.equal(latest.record.phase, 'ready')
            const final = path.join(root, 'final')
            await importState(Buffer.from(latest.record.encryptedState, 'base64'), final, account, key)
            const blocks = new BlockStateStore(path.join(final, 'account-blocks.sqlite'))
            try {
                assert.equal(blocks.get(account).reason, 'ACCOUNT_RESTRICTED')
            } finally {
                blocks.close()
            }
            console.log(
                'Independent consumer restored session and deduplication state, then published and verified the updated block'
            )
        }
    } finally {
        closeSessionStore()
        key.fill(0)
        await rm(root, { recursive: true, force: true })
    }
}

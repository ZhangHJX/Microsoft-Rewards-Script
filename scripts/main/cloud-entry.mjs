import { mkdtemp, readFile, writeFile, chmod, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { cloudSettings } from './cloud-settings.mjs'
import { runBounded } from './run-bounded.mjs'

let root
let key
let status = 'cloud_run_failed'
let code = 1
try {
    const rawKey = process.env.REWARDS_STATE_KEY
    if (!/^[a-fA-F0-9]{64}$/.test(rawKey ?? '') || !process.env.GITHUB_TOKEN || !process.env.GITHUB_REPOSITORY)
        throw new Error('Missing cloud configuration')
    key = Buffer.from(rawKey, 'hex')
    root = await mkdtemp(path.join(os.tmpdir(), 'rewards-cloud-'))
    await chmod(root, 0o700)
    const directory = path.join(root, 'sessions')
    const config = JSON.parse(
        process.env.REWARDS_CONFIG_JSON ||
            (await readFile(new URL('../../config.example.json', import.meta.url), 'utf8'))
    )
    const settings = cloudSettings({ config, environment: process.env, directory })
    await writeFile(path.join(root, 'config.json'), JSON.stringify(settings.config), { mode: 0o600, flag: 'wx' })
    const { GitHubStateStore } = await import('./remote-state.mjs')
    const { runCloudAccount } = await import('./cloud-run.mjs')
    const remote = new GitHubStateStore({ repository: process.env.GITHUB_REPOSITORY, token: process.env.GITHUB_TOKEN })
    const result = await runCloudAccount({
        remote,
        directory,
        account: settings.account,
        key,
        execute: () =>
            runBounded(process.execPath, [fileURLToPath(new URL('../../dist/index.js', import.meta.url))], {
                timeoutMs: 1800000,
                graceMs: 5000,
                cwd: root,
                env: settings.env,
                stdio: 'ignore'
            })
    })
    code = result.code
    status = code === 0 ? 'completed' : 'account_failed_state_saved'
} catch (error) {
    const allowed = [
        'REMOTE_STATE_PENDING',
        'REMOTE_STATE_MISSING',
        'REMOTE_STATE_CONFLICT',
        'REMOTE_STATE_INVALID',
        'REMOTE_STATE_UNAVAILABLE',
        'STATE_TRANSFER_FAILED',
        'CLOUD_RUN_INCOMPLETE'
    ]
    if (allowed.includes(error?.code)) status = error.code.toLowerCase()
} finally {
    key?.fill(0)
    if (root) {
        try {
            await rm(root, { recursive: true, force: true })
        } catch {
            status = 'local_cleanup_failed'
            code = 1
        }
    }
}
console.log(JSON.stringify({ status, code }))
process.exitCode = code

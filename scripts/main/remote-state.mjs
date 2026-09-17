import { randomUUID } from 'node:crypto'
const maxEnvelope = 32 * 1024 * 1024 + 43
const maxResponse = 64 * 1024 * 1024
const shaPattern = /^[a-f0-9]{40}$/
const marker = Buffer.from('REWARDS-STATE-1\0')
const messages = {
    REMOTE_STATE_MISSING: 'Remote state is missing',
    REMOTE_STATE_PENDING: 'Previous run requires state recovery',
    REMOTE_STATE_CONFLICT: 'Remote state changed',
    REMOTE_STATE_INVALID: 'Remote state is invalid',
    REMOTE_STATE_UNAVAILABLE: 'Remote state is unavailable'
}
function fail(code = 'REMOTE_STATE_INVALID') {
    return Object.assign(new Error(messages[code]), { code })
}
function decode(value, whitespace = false) {
    if (typeof value !== 'string') throw fail()
    const encoded = whitespace ? value.replace(/\s/g, '') : value
    const bytes = Buffer.from(encoded, 'base64')
    if (!encoded || bytes.toString('base64') !== encoded) throw fail()
    return bytes
}
function envelope(bytes) {
    if (
        !Buffer.isBuffer(bytes) ||
        bytes.length <= 43 ||
        bytes.length > maxEnvelope ||
        !bytes.subarray(0, marker.length).equals(marker)
    )
        throw fail()
    return bytes.toString('base64')
}
function validateRecord(record) {
    if (
        !record ||
        Object.keys(record).sort().join(',') !== 'encryptedState,phase,runId,updatedAt,version' ||
        record.version !== 1 ||
        !['ready', 'pending'].includes(record.phase) ||
        typeof record.runId !== 'string' ||
        !/^[0-9a-f-]{36}$/.test(record.runId) ||
        typeof record.updatedAt !== 'string' ||
        !Number.isFinite(Date.parse(record.updatedAt))
    )
        throw fail()
    envelope(decode(record.encryptedState))
    return record
}

export class GitHubStateStore {
    constructor({ repository, token, branch = 'codex/rewards-state', fetchImpl = globalThis.fetch }) {
        if (
            !/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(repository ?? '') ||
            typeof token !== 'string' ||
            !token.trim() ||
            !/^codex\/rewards-state(?:-[a-z0-9-]+)?$/.test(branch)
        )
            throw fail()
        this.base = `https://api.github.com/repos/${repository}`
        this.branch = branch
        this.token = token
        this.fetch = fetchImpl
    }

    async request(endpoint, method = 'GET', body) {
        let response
        try {
            response = await this.fetch(this.base + endpoint, {
                method,
                redirect: 'error',
                signal: AbortSignal.timeout(15000),
                headers: {
                    Accept: 'application/vnd.github.object+json',
                    Authorization: `Bearer ${this.token}`,
                    'X-GitHub-Api-Version': '2026-03-10',
                    'Content-Type': 'application/json'
                },
                ...(body ? { body: JSON.stringify(body) } : {})
            })
        } catch {
            throw fail('REMOTE_STATE_UNAVAILABLE')
        }
        if (!response.ok) {
            await response.body?.cancel().catch(() => {})
            throw fail(
                method === 'GET' && response.status === 404
                    ? 'REMOTE_STATE_MISSING'
                    : [409, 422].includes(response.status)
                      ? 'REMOTE_STATE_CONFLICT'
                      : 'REMOTE_STATE_UNAVAILABLE'
            )
        }
        try {
            const chunks = []
            let size = 0
            for await (const chunk of response.body) {
                size += chunk.length
                if (size > maxResponse) throw fail()
                chunks.push(chunk)
            }
            return JSON.parse(Buffer.concat(chunks).toString('utf8'))
        } catch {
            throw fail('REMOTE_STATE_INVALID')
        }
    }

    async read() {
        const item = await this.request('/contents/state.json?ref=' + encodeURIComponent(this.branch))
        if (!item || item.type !== 'file' || !shaPattern.test(item.sha) || 'submodule_git_url' in item) throw fail()
        const blob = item.encoding === 'none' ? await this.request('/git/blobs/' + item.sha) : item
        if (!blob || blob.sha !== item.sha || blob.encoding !== 'base64') throw fail()
        let record
        try {
            record = JSON.parse(decode(blob.content, true).toString('utf8'))
        } catch {
            throw fail()
        }
        return { sha: item.sha, record: validateRecord(record) }
    }

    async write(record, sha) {
        validateRecord(record)
        if (sha !== undefined && !shaPattern.test(sha)) throw fail()
        const result = await this.request('/contents/state.json', 'PUT', {
            branch: this.branch,
            message: `state: ${record.phase}`,
            content: Buffer.from(JSON.stringify(record)).toString('base64'),
            ...(sha ? { sha } : {})
        })
        if (!shaPattern.test(result?.content?.sha ?? '')) throw fail()
        return { sha: result.content.sha, record }
    }

    async provision(encrypted) {
        return this.write({
            version: 1,
            phase: 'ready',
            runId: randomUUID(),
            updatedAt: new Date().toISOString(),
            encryptedState: envelope(encrypted)
        })
    }

    async begin(snapshot) {
        validateRecord(snapshot.record)
        if (snapshot.record.phase !== 'ready') throw fail('REMOTE_STATE_PENDING')
        if (!shaPattern.test(snapshot.sha ?? '')) throw fail()
        return this.write(
            { ...snapshot.record, phase: 'pending', runId: randomUUID(), updatedAt: new Date().toISOString() },
            snapshot.sha
        )
    }

    async complete(pending, encrypted) {
        validateRecord(pending.record)
        if (pending.record.phase !== 'pending' || !shaPattern.test(pending.sha ?? '')) throw fail()
        return this.write(
            {
                version: 1,
                phase: 'ready',
                runId: pending.record.runId,
                updatedAt: new Date().toISOString(),
                encryptedState: envelope(encrypted)
            },
            pending.sha
        )
    }
}

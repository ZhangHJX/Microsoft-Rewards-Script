import assert from 'node:assert/strict'
import test from 'node:test'
import { GitHubStateStore } from '../main/remote-state.mjs'

function fakeApi() {
    let current
    let number = 0
    const calls = []
    return {
        calls,
        get current() {
            return current
        },
        set current(value) {
            current = value
        },
        fetch: async (url, options) => {
            calls.push({ url, options })
            if (options.method === 'PUT') {
                const body = JSON.parse(options.body)
                if ((current && body.sha !== current.sha) || (!current && body.sha))
                    return new Response('{}', { status: 409 })
                current = {
                    sha: (++number).toString(16).padStart(40, '0'),
                    type: 'file',
                    encoding: 'base64',
                    content: body.content
                }
                return Response.json({ content: { sha: current.sha } }, { status: 200 })
            }
            return current ? Response.json(current) : new Response('{}', { status: 404 })
        }
    }
}
function store(api) {
    return new GitHubStateStore({ repository: 'synthetic/repository', token: 'SECRET_TOKEN', fetchImpl: api.fetch })
}
const encrypted = Buffer.from('REWARDS-STATE-1\0synthetic-encrypted-placeholder')

test('explicit provision, pending claim and ready publication use conditional revisions', async () => {
    const api = fakeApi()
    const remote = store(api)
    const initial = await remote.provision(encrypted)
    assert.equal(initial.record.phase, 'ready')
    const ready = await remote.read()
    assert.equal(ready.sha, initial.sha)
    const pending = await remote.begin(ready)
    assert.equal(pending.record.phase, 'pending')
    assert.notEqual(pending.record.runId, ready.record.runId)
    const final = await remote.complete(pending, encrypted)
    assert.equal(final.record.phase, 'ready')
    assert.equal(final.record.runId, pending.record.runId)
    const writes = api.calls.filter(call => call.options.method === 'PUT').map(call => JSON.parse(call.options.body))
    assert.equal(writes[0].sha, undefined)
    assert.equal(writes[1].sha, ready.sha)
    assert.equal(writes[2].sha, pending.sha)
    for (const call of api.calls) {
        assert.ok(call.url.startsWith('https://api.github.com/repos/synthetic/repository/'))
        assert.equal(call.options.redirect, 'error')
        assert.ok(call.options.signal instanceof AbortSignal)
    }
})

test('pending latest state stops a new run and missing state never auto-provisions', async () => {
    const api = fakeApi()
    const remote = store(api)
    await assert.rejects(remote.read(), { code: 'REMOTE_STATE_MISSING' })
    assert.equal(
        api.calls.some(call => call.options.method === 'PUT'),
        false
    )
    const initial = await remote.provision(encrypted)
    await remote.begin(initial)
    await assert.rejects(remote.begin(await remote.read()), { code: 'REMOTE_STATE_PENDING' })
})

test('competing writers and stale completions cannot overwrite newer state', async () => {
    const api = fakeApi()
    const remote = store(api)
    const initial = await remote.provision(encrypted)
    const first = await remote.begin(initial)
    await assert.rejects(remote.begin(initial), { code: 'REMOTE_STATE_CONFLICT' })
    await remote.complete(first, encrypted)
    await assert.rejects(remote.complete(first, encrypted), { code: 'REMOTE_STATE_CONFLICT' })
    assert.equal(api.calls.filter(call => call.options.method === 'PUT').length, 5)
})

test('provision cannot replace an existing remote baseline', async () => {
    const api = fakeApi()
    const remote = store(api)
    await remote.provision(encrypted)
    await assert.rejects(remote.provision(encrypted), { code: 'REMOTE_STATE_CONFLICT' })
})

test('large content is read from its pinned blob SHA rather than a download URL', async () => {
    const api = fakeApi()
    await store(api).provision(encrypted)
    const saved = api.current
    api.fetch = async (url, options) => {
        api.calls.push({ url, options })
        return Response.json(
            url.includes('/git/blobs/')
                ? { ...saved, type: undefined }
                : { ...saved, encoding: 'none', content: '', download_url: 'https://untrusted.invalid/leak' }
        )
    }
    assert.equal((await store(api).read()).sha, saved.sha)
    assert.ok(api.calls.at(-1).url.endsWith('/git/blobs/' + saved.sha))
    assert.ok(api.calls.every(call => !call.url.includes('untrusted')))
})

for (const status of [401, 403, 500])
    test('HTTP failure ' + status + ' is sanitized without retry', async () => {
        const api = {
            calls: 0,
            fetch: async () => {
                api.calls++
                return new Response('SECRET_SERVER_RESPONSE', { status })
            }
        }
        const remote = store(api)
        await assert.rejects(remote.provision(encrypted), {
            code: 'REMOTE_STATE_UNAVAILABLE',
            message: 'Remote state is unavailable'
        })
        assert.equal(api.calls, 1)
    })

test('rejects malformed remote state and non-file results', async () => {
    const api = fakeApi()
    const remote = store(api)
    await remote.provision(encrypted)
    const original = api.current
    for (const changed of [{ type: 'symlink' }, { sha: 'bad' }, { content: Buffer.from('{}').toString('base64') }]) {
        api.current = { ...original, ...changed }
        await assert.rejects(remote.read(), { code: 'REMOTE_STATE_INVALID' })
    }
})

test('uncertain pending write is not retried and a fresh read prevents replay', async () => {
    const api = fakeApi()
    const remote = store(api)
    const initial = await remote.provision(encrypted)
    const originalFetch = api.fetch
    api.fetch = async (url, options) => {
        const response = await originalFetch(url, options)
        if (options.method === 'PUT') throw new Error('SECRET_NETWORK_ERROR')
        return response
    }
    await assert.rejects(store(api).begin(initial), { code: 'REMOTE_STATE_UNAVAILABLE' })
    assert.equal(api.calls.filter(call => call.options.method === 'PUT').length, 2)
    await assert.rejects(store(api).begin(await store(api).read()), { code: 'REMOTE_STATE_PENDING' })
})

test('null API response and extra record fields fail with fixed errors', async () => {
    const api = fakeApi()
    const remote = store(api)
    await remote.provision(encrypted)
    const record = JSON.parse(Buffer.from(api.current.content, 'base64').toString())
    record.unexpected = 'SECRET_UNTRUSTED_FIELD'
    api.current.content = Buffer.from(JSON.stringify(record)).toString('base64')
    await assert.rejects(remote.read(), { code: 'REMOTE_STATE_INVALID' })
    api.fetch = async () => Response.json(null)
    await assert.rejects(store(api).read(), { code: 'REMOTE_STATE_INVALID' })
})

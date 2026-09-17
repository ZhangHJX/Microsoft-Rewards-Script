import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdtemp, readdir, stat, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
const require = createRequire(import.meta.url)
const { validateConfig } = require('../../dist/util/Validator.js')
const { errorDiagnostic, unknownPageDiagnostic } = require('../../dist/util/ErrorDiagnostic.js')

test('raw browser diagnostics require explicit opt-in', () => {
    assert.equal(validateConfig({}).errorDiagnostics, false)
    assert.equal(validateConfig({ errorDiagnostics: true }).errorDiagnostics, true)
})

test('both diagnostic paths create owner-only directories and files even with permissive umask', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'diagnostic-privacy-'))
    const previous = process.cwd()
    const mask = process.umask(0)
    process.chdir(root)
    try {
        const page = {
            isClosed: () => false,
            url: () => 'https://login.example.test/path?token=private',
            content: async () => '<html>private content</html>',
            screenshot: async () => Buffer.from('private image')
        }
        await errorDiagnostic(page, new Error('private error'))
        assert.ok(await unknownPageDiagnostic(page, { platform: 'desktop' }))
        let files = 0
        async function check(directory) {
            assert.equal((await stat(directory)).mode & 0o777, 0o700)
            for (const entry of await readdir(directory, { withFileTypes: true })) {
                const target = path.join(directory, entry.name)
                if (entry.isDirectory()) await check(target)
                else {
                    files++
                    assert.equal((await stat(target)).mode & 0o777, 0o600)
                }
            }
        }
        await check(path.join(root, 'diagnostics'))
        assert.equal(files, 6)
    } finally {
        process.chdir(previous)
        process.umask(mask)
        await rm(root, { recursive: true, force: true })
    }
})

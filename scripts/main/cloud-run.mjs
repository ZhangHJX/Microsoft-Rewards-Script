import { exportState, importState } from './state-transfer.mjs'

// A failed/uncertain run keeps the remote claim pending; never publish stale state.
export async function runCloudAccount({ remote, directory, account, key, execute }) {
    const snapshot = await remote.read()
    if (snapshot.record.phase !== 'ready')
        throw Object.assign(new Error('Previous run requires state recovery'), { code: 'REMOTE_STATE_PENDING' })
    await importState(Buffer.from(snapshot.record.encryptedState, 'base64'), directory, account, key)
    const pending = await remote.begin(snapshot)
    const result = await execute()
    if (result?.reason !== 'exited' || !Number.isInteger(result.code) || result.code < 0 || result.code > 255)
        throw Object.assign(new Error('Cloud run did not finish normally'), { code: 'CLOUD_RUN_INCOMPLETE' })
    await remote.complete(pending, await exportState(directory, account, key))
    return result
}

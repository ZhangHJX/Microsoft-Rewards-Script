import type { AccountBlock } from './BlockStateStore'
import { requiredBalance } from '../browser/Balance'
import { URLs } from '../constants/urls'

interface SavedCookie {
    name: string
    value: string
    domain: string
    path: string
    expires: number
}

export async function validateSavedDashboard(
    block: Pick<AccountBlock, 'reason'>,
    cookies: SavedCookie[],
    signal: AbortSignal,
    request: typeof fetch = fetch
): Promise<boolean> {
    if (!['BALANCE_UNAVAILABLE', 'ACCOUNT_RESTRICTED'].includes(block.reason)) return false
    const url = new URL(URLs.rewards.userInfoApi)
    const header = cookies
        .filter(cookie => {
            if (!cookie || typeof cookie.domain !== 'string' || typeof cookie.path !== 'string') return false
            const domain = cookie.domain.toLowerCase()
            const domainMatches = domain.startsWith('.')
                ? url.hostname === domain.slice(1) || url.hostname.endsWith(domain)
                : url.hostname === domain
            const pathMatches =
                url.pathname === cookie.path ||
                (url.pathname.startsWith(cookie.path) &&
                    (cookie.path.endsWith('/') || url.pathname[cookie.path.length] === '/'))
            return (
                domainMatches &&
                pathMatches &&
                (cookie.expires === -1 || cookie.expires > Date.now() / 1000) &&
                typeof cookie.name === 'string' &&
                /^[!#$%&'*+.^_`|~0-9a-zA-Z-]+$/.test(cookie.name) &&
                typeof cookie.value === 'string' &&
                !/[\r\n;]/.test(cookie.value)
            )
        })
        .map(cookie => `${cookie.name}=${cookie.value}`)
        .join('; ')
    if (!header || signal.aborted) return false
    const response = await request(url.toString(), {
        method: 'GET',
        redirect: 'error',
        signal,
        headers: { Cookie: header, Accept: 'application/json' }
    })
    if (!response.ok || !response.headers.get('content-type')?.includes('application/json') || !response.body)
        return false
    const reader = response.body.getReader()
    const chunks: Uint8Array[] = []
    let size = 0
    try {
        while (true) {
            const chunk = await reader.read()
            if (chunk.done) break
            size += chunk.value.byteLength
            if (size > 262144) {
                await reader.cancel()
                return false
            }
            chunks.push(chunk.value)
        }
        const data = JSON.parse(Buffer.concat(chunks).toString('utf8'))
        const dashboard = data?.dashboard
        if (
            dashboard?.userStatus?.isRewardsUser !== true ||
            !Array.isArray(dashboard.userWarnings) ||
            dashboard.userWarnings.length !== 0
        )
            return false
        requiredBalance(dashboard.userStatus.availablePoints)
        return !signal.aborted
    } catch {
        return false
    } finally {
        reader.releaseLock()
    }
}

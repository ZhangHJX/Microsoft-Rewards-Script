export function assertExecutionScope(accounts: unknown[], clusters: number, singleAccount: boolean): void {
    if (!accounts.length || (singleAccount && (accounts.length !== 1 || clusters !== 1))) {
        throw Object.assign(new Error('Single-account execution requires exactly one account and clusters=1'), {
            code: 'INVALID_ACCOUNT_SCOPE'
        })
    }
}

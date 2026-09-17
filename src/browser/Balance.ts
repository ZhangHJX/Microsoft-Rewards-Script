export class BalanceUnavailableError extends Error {
    readonly code = 'BALANCE_UNAVAILABLE'

    constructor() {
        super('Rewards balance is missing or invalid')
        this.name = 'BalanceUnavailableError'
    }
}

export function requiredBalance(primary: unknown, fallback?: unknown): number {
    for (const value of [primary, fallback]) {
        if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) return value
    }
    throw new BalanceUnavailableError()
}

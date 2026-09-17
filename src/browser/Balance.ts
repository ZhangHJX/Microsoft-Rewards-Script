import type { DashboardData } from '../interface/DashboardData'

export interface BalanceObservation {
    value: number
    source: 'dashboard' | 'flyout'
    // Local response-validation time, not the service's ledger-update time.
    observedAt: string
}

export type ObservedDashboardData = DashboardData & { balanceObservation: BalanceObservation }

export function observeDashboard(data: DashboardData, source: BalanceObservation['source']): ObservedDashboardData {
    const value = requiredBalance(data.dashboard.userStatus?.availablePoints)
    return { ...data, balanceObservation: { value, source, observedAt: new Date().toISOString() } }
}

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

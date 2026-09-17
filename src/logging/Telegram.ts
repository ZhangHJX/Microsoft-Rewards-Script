import { httpRequest } from '../util/Http'
import type { HttpRequestConfig } from '../util/Http'
import PQueue from 'p-queue'
import type { WebhookTelegramConfig } from '../interface/Config'
import type { LogLevel } from './Logger'
import { flushQueue } from './Queue'

const telegramQueue = new PQueue({
    interval: 1000,
    intervalCap: 2,
    carryoverConcurrencyCount: true
})

function getTelegramEmoji(level: LogLevel): string {
    switch (level) {
        case 'error':
            return '❌'
        case 'warn':
            return '⚠️'
        case 'info':
            return 'ℹ️'
        case 'debug':
            return '🐛'
        default:
            return '📝'
    }
}

export async function sendTelegram(config: WebhookTelegramConfig, content: string, level: LogLevel): Promise<boolean> {
    if (!config?.botToken || !config?.chatId) return false

    const emoji = getTelegramEmoji(level)
    const message = `${emoji}\n\`\`\`\n${content}\n\`\`\``

    const url = `https://api.telegram.org/bot${config.botToken}/sendMessage`

    const request: HttpRequestConfig = {
        method: 'POST',
        url: url,
        headers: { 'Content-Type': 'application/json' },
        data: {
            chat_id: config.chatId,
            text: message,
            parse_mode: 'MarkdownV2',
            disable_notification: level === 'debug'
        },
        timeout: 10000,
        retries: 0
    }

    return (
        (await telegramQueue.add(async () => {
            try {
                const response = await httpRequest<{ ok?: boolean }>(request)
                return response.data.ok === true
            } catch {
                return false
            }
        })) === true
    )
}

export function flushTelegramQueue(timeoutMs = 5000): Promise<void> {
    return flushQueue(telegramQueue, timeoutMs)
}

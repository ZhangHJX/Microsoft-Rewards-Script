import path from 'node:path'

export function cloudSettings({ config, environment, directory }) {
    const accounts = Object.keys(environment).filter(
        name => /^ACCOUNT_[1-9]\d*_EMAIL$/.test(name) && environment[name]?.trim()
    )
    if (
        accounts.length !== 1 ||
        accounts[0] !== 'ACCOUNT_1_EMAIL' ||
        !config ||
        typeof config !== 'object' ||
        Array.isArray(config) ||
        !path.isAbsolute(directory)
    )
        throw new Error('Invalid cloud configuration')
    const env = { GITHUB_ACTIONS: 'true' }
    for (const [name, value] of Object.entries(environment)) {
        if (
            /^ACCOUNT_1_[A-Z_]+$/.test(name) ||
            ['PATH', 'HOME', 'TMPDIR', 'LANG', 'LC_ALL', 'PLAYWRIGHT_BROWSERS_PATH'].includes(name)
        )
            env[name] = value
    }
    return {
        account: environment.ACCOUNT_1_EMAIL.trim(),
        env,
        config: {
            ...config,
            sessionPath: directory,
            headless: true,
            singleAccount: true,
            clusters: 1,
            errorDiagnostics: false,
            webhook: { ...config.webhook, forwardLogs: false }
        }
    }
}

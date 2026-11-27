type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
    private formatMessage(level: LogLevel, message: string, data?: unknown): string {
        const timestamp = new Date().toISOString();
        const dataStr = data ? ` | Data: ${JSON.stringify(data)}` : '';
        return `[${timestamp}] [${level.toUpperCase()}] ${message}${dataStr}`;
    }

    info(message: string, data?: unknown) {
        console.log(this.formatMessage('info', message, data));
    }

    warn(message: string, data?: unknown) {
        console.warn(this.formatMessage('warn', message, data));
    }

    error(message: string, data?: unknown) {
        console.error(this.formatMessage('error', message, data));
    }

    debug(message: string, data?: unknown) {
        console.debug(this.formatMessage('debug', message, data));
    }
}

export const logger = new Logger();

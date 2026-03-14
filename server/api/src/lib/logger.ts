type LogContext = unknown;

export interface Logger {
  error(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
}

function writeLog(level: 'error' | 'info', service: string, message: string, context?: LogContext) {
  const payload = {
    context: context ?? {},
    level,
    message,
    service,
  };

  const line = JSON.stringify(payload);

  if (level === 'error') {
    console.error(line);
    return;
  }

  console.info(line);
}

export function createLogger(service: string): Logger {
  return {
    error(message, context) {
      writeLog('error', service, message, context);
    },
    info(message, context) {
      writeLog('info', service, message, context);
    },
  };
}

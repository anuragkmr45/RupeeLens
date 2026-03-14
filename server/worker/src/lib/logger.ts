type LogContext = unknown;

export interface Logger {
  info(message: string, context?: LogContext): void;
}

export function createLogger(service: string): Logger {
  return {
    info(message, context) {
      console.info(
        JSON.stringify({
          context: context ?? {},
          level: 'info',
          message,
          service,
        }),
      );
    },
  };
}

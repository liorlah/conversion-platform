import pino from 'pino';

const transport = pino.transport({
  target: 'pino-pretty',
  options: {
    colorize: true,
    translateTime: 'SYS:standard',
    ignore: 'pid,hostname',
  },
});

const logger = pino({ level: process.env.LOG_LEVEL || 'info' }, transport);

export class Logger {
  private logger: pino.Logger;
  private context: string;

  constructor(context: string = 'APP') {
    this.logger = logger;
    this.context = context;
  }

  info(message: string, data?: any): void {
    this.logger.info({ context: this.context, ...data }, message);
  }

  error(message: string, error?: any): void {
    this.logger.error({ context: this.context, error }, message);
  }

  warn(message: string, data?: any): void {
    this.logger.warn({ context: this.context, ...data }, message);
  }

  debug(message: string, data?: any): void {
    this.logger.debug({ context: this.context, ...data }, message);
  }

  setContext(context: string): void {
    this.context = context;
  }
}

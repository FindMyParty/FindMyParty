import pino from "pino";

const LOG_LEVEL = process.env.LOG_LEVEL || "info";

export const loggerConfig = {
  level: LOG_LEVEL,
};

export const logger = pino(loggerConfig);

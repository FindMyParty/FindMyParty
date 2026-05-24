import * as Sentry from "@sentry/node";

let initialized = false;

/**
 * Initialize Sentry error tracking.
 * Does nothing if dsn is falsy — service starts normally without Sentry.
 *
 * @param {{ dsn?: string, environment?: string }} config
 */
export function initSentry({ dsn, environment = "development" }) {
  if (!dsn) {
    return;
  }

  Sentry.init({
    dsn,
    environment,
    tracesSampleRate: 1.0,
  });

  initialized = true;
}


/**
 * Centralized logging utility
 * Suppresses debug/info logs in production
 * Always logs warnings and errors
 */

const isDev = process.env.NODE_ENV === "development";
const isClient = typeof window !== "undefined";

/**
 * Logger utility that respects environment
 * - debug/info: Only in development
 * - warn/error: Always logged
 */
export const logger = {
  debug: (...args: unknown[]) => {
    if (isDev) {
      console.log("[DEBUG]", ...args);
    }
  },

  info: (...args: unknown[]) => {
    if (isDev) {
      console.info("[INFO]", ...args);
    }
  },

  warn: (...args: unknown[]) => {
    console.warn("[WARN]", ...args);
    // In production, you might want to send to monitoring service
    if (!isDev && isClient) {
      // TODO: Send to Sentry or other monitoring service
      // Example: Sentry.captureMessage(args.join(' '), 'warning');
    }
  },

  error: (...args: unknown[]) => {
    console.error("[ERROR]", ...args);
    // In production, send to monitoring service
    if (!isDev && isClient) {
      // TODO: Send to Sentry or other monitoring service
      // Example: Sentry.captureException(args[0]);
    }
  },
};

import { useMemo } from 'react';

/**
 * Hook for component-level logging
 * Returns logger with component name prefix
 */
export function useLogger(componentName: string) {
  return useMemo(() => ({
    debug: (...args: unknown[]) => logger.debug(`[${componentName}]`, ...args),
    info: (...args: unknown[]) => logger.info(`[${componentName}]`, ...args),
    warn: (...args: unknown[]) => logger.warn(`[${componentName}]`, ...args),
    error: (...args: unknown[]) => logger.error(`[${componentName}]`, ...args),
  }), [componentName]);
}

export default logger;

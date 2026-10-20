const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 }
const minLevel = LEVELS[process.env.LOG_LEVEL] || (process.env.NODE_ENV === 'test' ? LEVELS.warn : LEVELS.info)

function log(level, ...args) {
  if (LEVELS[level] < minLevel) return
  const line = [new Date().toISOString(), level.toUpperCase().padEnd(5), ...args]
  if (level === 'error') console.error(...line)
  else if (level === 'warn') console.warn(...line)
  else console.log(...line)
}

export const logger = {
  debug: (...a) => log('debug', ...a),
  info: (...a) => log('info', ...a),
  warn: (...a) => log('warn', ...a),
  error: (...a) => log('error', ...a),
}

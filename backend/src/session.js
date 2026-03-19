/**
 * Session Store - DISABLED
 * 
 * Sessions table has been removed from the database.
 * This file is kept as a stub to prevent import errors.
 * All methods are no-ops.
 */

module.exports = {
  createSession: async () => null,
  getSession: async () => null,
  destroySession: async () => {},
  destroySessionsForUser: async () => {},
  cleanupExpiredSessions: async () => {},
  startCleanupInterval: () => {}
};

const crypto = require('crypto');
const db = require('./config/db');

// DB-backed Session Store
class SessionStore {
  constructor() {
    this.ttlMs = 1000 * 60 * 60 * 1; // 1 hour
  }

  async createSession(user) {
    const sessionToken = crypto.randomBytes(24).toString('hex');
    const now = Date.now();
    const expiresAt = now + this.ttlMs;

    try {
      await db.query(`
            INSERT INTO sessions(token, username, role, created_at, expires_at, last_accessed_at)
            VALUES($1, $2, $3, $4, $5, $6)
      `, [sessionToken, user.username, user.role, now, expiresAt, now]);

      return {
        token: sessionToken,
        username: user.username,
        role: user.role,
        createdAt: now,
        expiresAt: expiresAt,
        lastAccessedAt: now
      };
    } catch (err) {
      console.error("Session creation failed", err);
      return null;
    }
  }

  async getSession(token) {
    if (!token) return null;

    try {
      const res = await db.query('SELECT * FROM sessions WHERE token = $1', [token]);
      if (res.rows.length === 0) return null;

      const record = res.rows[0];
      const now = Date.now();

      // Check expiry (Postgres BIGINT comes as string usually)
      const expiresAt = parseInt(record.expires_at || 0);

      if (expiresAt <= now) {
        await this.destroySession(token);
        return null;
      }

      // Sliding expiration (update only if it hasn't been updated in last 5 mins to save DB writes?)
      // For now, update every time for safety
      const newExpiresAt = now + this.ttlMs;
      await db.query(`
            UPDATE sessions 
            SET last_accessed_at = $1, expires_at = $2 
            WHERE token = $3
      `, [now, newExpiresAt, token]);

      return {
        id: record.id, // Assuming 'id' is an auto-generated primary key
        token: record.token,
        username: record.username,
        role: record.role,
        createdAt: parseInt(record.created_at),
        expiresAt: newExpiresAt,
        lastAccessedAt: now
      };
    } catch (err) {
      console.error("Get session failed", err);
      return null;
    }
  }

  async destroySession(token) {
    if (!token) return;
    try {
      await db.query('DELETE FROM sessions WHERE token = $1', [token]);
    } catch (err) {
      console.error("Destroy session failed", err);
    }
  }

  async destroySessionsForUser(username) {
    if (!username) return;
    try {
      await db.query('DELETE FROM sessions WHERE username = $1', [username]);
    } catch (err) {
      console.error("Destroy user sessions failed", err);
    }
  }

  // Cleanup expired sessions from database
  async cleanupExpiredSessions() {
    try {
      // Console log for verification (Visible proof the timer is working)
      // console.log('[Sessions] Checking for expired sessions...'); 

      const now = Date.now();
      const result = await db.query('DELETE FROM sessions WHERE expires_at <= $1', [now]);
      if (result.rowCount > 0) {
        // console.log(`[Sessions] Cleaned up ${result.rowCount} expired session(s)`);
      }
    } catch (err) {
      // console.error("Session cleanup failed", err); // Silenced background noise
    }
  }

  // Start periodic cleanup (call once on app start)
  startCleanupInterval() {
    // Run cleanup every 15 minutes
    const CLEANUP_INTERVAL = 1000 * 60 * 15; // 15 minutes

    // Initial cleanup after 1 minute of server start
    setTimeout(() => this.cleanupExpiredSessions(), 60000);

    // Then every 15 minutes
    setInterval(() => this.cleanupExpiredSessions(), CLEANUP_INTERVAL);

    // console.log('[Sessions] Automatic cleanup scheduled (every 15 min)');
  }
}

const sessionStore = new SessionStore();

// Start cleanup on module load
sessionStore.startCleanupInterval();

module.exports = sessionStore;

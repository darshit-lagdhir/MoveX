const crypto = require('crypto');
const db = require('./config/db');

// DB-backed Session Store
class SessionStore {
  constructor() {
    this.ttlMs = 1000 * 60 * 60 * 1; // 1 hour
  }

  async createSession(user) {
    const sessionId = crypto.randomBytes(24).toString('hex');
    const now = Date.now();
    const expiresAt = now + this.ttlMs;

    try {
      await db.query(`
            INSERT INTO sessions(id, user_id, role, email, created_at, expires_at, last_accessed_at)
VALUES($1, $2, $3, $4, $5, $6, $7)
  `, [sessionId, user.id, user.role, user.email, now, expiresAt, now]);

      return {
        id: sessionId,
        userId: user.id,
        role: user.role,
        email: user.email,
        createdAt: now,
        expiresAt: expiresAt,
        lastAccessedAt: now
      };
    } catch (err) {
      console.error("Session creation failed", err);
      return null;
    }
  }

  async getSession(sessionId) {
    if (!sessionId) return null;

    try {
      const res = await db.query('SELECT * FROM sessions WHERE id = $1', [sessionId]);
      if (res.rows.length === 0) return null;

      const record = res.rows[0];
      const now = Date.now();

      // Check expiry (Postgres BIGINT comes as string usually)
      const expiresAt = parseInt(record.expires_at || 0);

      if (expiresAt <= now) {
        await this.destroySession(sessionId);
        return null;
      }

      // Sliding expiration (update only if it hasn't been updated in last 5 mins to save DB writes?)
      // For now, update every time for safety
      const newExpiresAt = now + this.ttlMs;
      await db.query(`
            UPDATE sessions 
            SET last_accessed_at = $1, expires_at = $2 
            WHERE id = $3
  `, [now, newExpiresAt, sessionId]);

      return {
        id: record.id,
        userId: record.user_id,
        role: record.role,
        email: record.email,
        createdAt: parseInt(record.created_at),
        expiresAt: newExpiresAt,
        lastAccessedAt: now
      };
    } catch (err) {
      console.error("Get session failed", err);
      return null;
    }
  }

  async destroySession(sessionId) {
    if (!sessionId) return;
    try {
      await db.query('DELETE FROM sessions WHERE id = $1', [sessionId]);
    } catch (err) {
      console.error("Destroy session failed", err);
    }
  }

  async destroySessionsForUser(userId) {
    if (!userId) return;
    try {
      await db.query('DELETE FROM sessions WHERE user_id = $1', [userId]);
    } catch (err) {
      console.error("Destroy user sessions failed", err);
    }
  }
}

module.exports = new SessionStore();

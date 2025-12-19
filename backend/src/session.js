const crypto = require('crypto');

// Simple in-memory session store for development.
// For production, replace with Redis/DB-backed store.
class SessionStore {
  constructor() {
    this.sessions = new Map();
    this.ttlMs = 1000 * 60 * 60 * 2; // 2 hours
  }

  createSession(user) {
    const sessionId = crypto.randomBytes(24).toString('hex');
    const now = Date.now();
    const record = {
      id: sessionId,
      userId: user.id,
      role: user.role,
      email: user.email,
      createdAt: now,
      expiresAt: now + this.ttlMs,
      lastAccessedAt: now
    };
    this.sessions.set(sessionId, record);
    return record;
  }

  getSession(sessionId) {
    if (!sessionId) return null;
    const record = this.sessions.get(sessionId);
    if (!record) return null;

    const now = Date.now();
    if (record.expiresAt <= now) {
      this.sessions.delete(sessionId);
      return null;
    }

    // Sliding expiration
    record.lastAccessedAt = now;
    record.expiresAt = now + this.ttlMs;
    this.sessions.set(sessionId, record);
    return record;
  }

  destroySession(sessionId) {
    if (!sessionId) return;
    this.sessions.delete(sessionId);
  }

  destroySessionsForUser(userId) {
    if (!userId) return;
    for (const [sid, record] of this.sessions.entries()) {
      if (record.userId === userId) {
        this.sessions.delete(sid);
      }
    }
  }
}

module.exports = new SessionStore();


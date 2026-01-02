const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const db = require('../db');

const CALLBACK_BASE = process.env.OAUTH_CALLBACK_BASE || 'http://localhost:4000';

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const result = await db.query('SELECT * FROM users WHERE id = $1', [id]);
        done(null, result.rows[0] || null);
    } catch (err) {
        done(err, null);
    }
});

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: `${CALLBACK_BASE}/auth/google/callback`,
        scope: ['profile', 'email']
    }, async (accessToken, refreshToken, profile, done) => {
        try {
            const email = profile.emails?.[0]?.value;
            const providerId = profile.id;

            if (!email) {
                return done(new Error('No email provided by Google'), null);
            }

            let result = await db.query(
                'SELECT * FROM users WHERE oauth_provider = $1 AND oauth_provider_id = $2',
                ['google', providerId]
            );

            if (result.rows.length === 0) {
                result = await db.query('SELECT * FROM users WHERE username = $1', [email]);

                if (result.rows.length > 0) {
                    await db.query(
                        'UPDATE users SET oauth_provider = $1, oauth_provider_id = $2 WHERE id = $3',
                        ['google', providerId, result.rows[0].id]
                    );
                } else {
                    result = await db.query(
                        `INSERT INTO users (username, password_hash, role, status, oauth_provider, oauth_provider_id) 
                         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
                        [email, 'oauth_google', 'user', 'active', 'google', providerId]
                    );
                }
            }

            const user = result.rows[0];

            if (user.status !== 'active') {
                return done(new Error('Account is disabled'), null);
            }

            return done(null, user);
        } catch (err) {
            console.error('Google OAuth error:', err);
            return done(err, null);
        }
    }));
}

if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    passport.use(new GitHubStrategy({
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: `${CALLBACK_BASE}/auth/github/callback`,
        scope: ['user:email']
    }, async (accessToken, refreshToken, profile, done) => {
        try {
            const providerId = profile.id.toString();
            let email = profile.emails?.[0]?.value;

            if (!email && profile._json?.email) {
                email = profile._json.email;
            }

            if (!email) {
                email = `${profile.username}@github.local`;
            }

            let result = await db.query(
                'SELECT * FROM users WHERE oauth_provider = $1 AND oauth_provider_id = $2',
                ['github', providerId]
            );

            if (result.rows.length === 0) {
                result = await db.query('SELECT * FROM users WHERE username = $1', [email]);

                if (result.rows.length > 0) {
                    await db.query(
                        'UPDATE users SET oauth_provider = $1, oauth_provider_id = $2 WHERE id = $3',
                        ['github', providerId, result.rows[0].id]
                    );
                } else {
                    result = await db.query(
                        `INSERT INTO users (username, password_hash, role, status, oauth_provider, oauth_provider_id) 
                         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
                        [email, 'oauth_github', 'user', 'active', 'github', providerId]
                    );
                }
            }

            const user = result.rows[0];

            if (user.status !== 'active') {
                return done(new Error('Account is disabled'), null);
            }

            return done(null, user);
        } catch (err) {
            console.error('GitHub OAuth error:', err);
            return done(err, null);
        }
    }));
}

module.exports = passport;

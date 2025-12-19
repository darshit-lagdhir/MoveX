const express = require('express');
const router = express.Router();
const passport = require('../config/passport');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const pendingStates = new Map();

function generateState() {
    const state = crypto.randomBytes(32).toString('hex');
    pendingStates.set(state, { timestamp: Date.now() });
    return state;
}

function validateState(state) {
    const entry = pendingStates.get(state);
    if (!entry) return false;

    pendingStates.delete(state);

    const age = Date.now() - entry.timestamp;
    if (age > 10 * 60 * 1000) return false;

    return true;
}

setInterval(() => {
    const now = Date.now();
    for (const [state, entry] of pendingStates.entries()) {
        if (now - entry.timestamp > 10 * 60 * 1000) {
            pendingStates.delete(state);
        }
    }
}, 60000);

const sessionStore = require('../src/session');
const { setSessionCookie } = require('../src/sessionMiddleware');

function createSessionAndRedirect(user, req, res) {
    const session = sessionStore.createSession({
        id: user.id,
        email: user.email,
        role: user.role
    });
    setSessionCookie(res, session.id);

    if (user.mfa_enabled) {
        return res.redirect(`/?mfa_required=true&userId=${user.id}&role=${user.role}`);
    }

    const dashboards = {
        admin: '/admin-dashboard.html',
        franchisee: '/franchisee-dashboard.html',
        staff: '/staff-dashboard.html',
        user: '/user-dashboard.html',
        customer: '/customer-dashboard.html'
    };

    const dashboard = dashboards[user.role] || '/user-dashboard.html';

    // Pass minimal info in URL, session cookie handles the rest.
    res.redirect(`${dashboard}?oauth_success=true&role=${user.role}`);
}

router.get('/google', (req, res, next) => {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        return res.redirect('/?error=google_not_configured');
    }

    const state = generateState();

    passport.authenticate('google', {
        scope: ['profile', 'email'],
        state: state,
        prompt: 'select_account'
    })(req, res, next);
});

router.get('/google/callback', (req, res, next) => {
    const { state, error } = req.query;

    if (error) {
        console.error('Google OAuth error:', error);
        return res.redirect('/?error=oauth_denied');
    }

    if (!state || !validateState(state)) {
        return res.redirect('/?error=invalid_state');
    }

    passport.authenticate('google', { session: false }, (err, user, info) => {
        if (err) {
            console.error('Google auth error:', err);
            return res.redirect('/?error=oauth_failed');
        }

        if (!user) {
            return res.redirect('/?error=oauth_no_user');
        }

        createSessionAndRedirect(user, req, res);
    })(req, res, next);
});

router.get('/github', (req, res, next) => {
    if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
        return res.redirect('/?error=github_not_configured');
    }

    const state = generateState();

    passport.authenticate('github', {
        scope: ['user:email'],
        state: state
    })(req, res, next);
});

router.get('/github/callback', (req, res, next) => {
    const { state, error } = req.query;

    if (error) {
        console.error('GitHub OAuth error:', error);
        return res.redirect('/?error=oauth_denied');
    }

    if (!state || !validateState(state)) {
        return res.redirect('/?error=invalid_state');
    }

    passport.authenticate('github', { session: false }, (err, user, info) => {
        if (err) {
            console.error('GitHub auth error:', err);
            return res.redirect('/?error=oauth_failed');
        }

        if (!user) {
            return res.redirect('/?error=oauth_no_user');
        }

        createSessionAndRedirect(user, req, res);
    })(req, res, next);
});

module.exports = router;

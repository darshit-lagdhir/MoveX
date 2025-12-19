/**
 * AUTH COORDINATOR
 * 
 * This module coordinates with backend APIs.
 * It does NOT make security decisions.
 * Backend is authoritative.
 * 
 * Lockdown UI deterrence is handled separately in lockdown.js
 * and does NOT affect auth flows.
 */

// REFACTORED: Now a coordinator that calls backend APIs only.
// Do NOT make security decisions locally. Backend is the only authority.

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:4000';

async function safeFetch(endpoint, options = {}) {
	const res = await fetch(`${API_BASE}${endpoint}`, {
		credentials: 'include', // send cookies so backend can set/validate sessions
		headers: { 'Content-Type': 'application/json', ...options.headers },
		...options,
	});
	let body = null;
	try { body = await res.json(); } catch (e) { /* ignore non-json */ }
	return { ok: res.ok, status: res.status, body };
}

export async function login(email, password) {
	console.log('[auth-secure] Calling backend login endpoint.');
	const result = await safeFetch('/api/auth/login', {
		method: 'POST',
		body: JSON.stringify({ email, password }),
	});
	// Frontend reacts to backend response; does NOT decide success locally.
	return result;
}

export async function logout() {
	console.log('[auth-secure] Calling backend logout endpoint.');
	// Reset lockdown when logging out
	try {
		const LOCKDOWN = (await import('./lockdown.js')).default;
		LOCKDOWN.reset();
	} catch (e) {
		// lockdown may not be available
	}
	const result = await safeFetch('/api/auth/logout', { method: 'POST' });
	return result;
}

export async function register(email, password, role) {
	console.log('[auth-secure] Calling backend register endpoint.');
	const result = await safeFetch('/auth/register', {
		method: 'POST',
		body: JSON.stringify({ email, password, role }),
	});
	return result;
}

export async function requestPasswordReset(email) {
	console.log('[auth-secure] Calling backend forgot-password endpoint.');
	const result = await safeFetch('/auth/forgot-password', {
		method: 'POST',
		body: JSON.stringify({ email }),
	});
	return result;
}

export async function resetPassword(token, newPassword) {
	console.log('[auth-secure] Calling backend reset-password endpoint.');
	const result = await safeFetch('/auth/reset-password', {
		method: 'POST',
		body: JSON.stringify({ token, newPassword }),
	});
	return result;
}

export async function fetchUserProfile() {
	console.log('[auth-secure] Fetching user profile from backend.');
	const result = await safeFetch('/auth/me', { method: 'GET' });
	// Frontend does NOT infer roles or permissions. Backend response is authority.
	return result;
}

export async function verifyToken(token) {
	console.log('[auth-secure] Verifying token with backend.');
	const result = await safeFetch('/auth/verify', {
		method: 'POST',
		body: JSON.stringify({ token }),
	});
	return result;
}

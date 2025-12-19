// Initialize lockdown as early as possible
import LOCKDOWN from './utils/lockdown.js';
console.log('[APP] Lockdown initialized');

// Frontend entry: initialize tamper as early as possible to enforce UI lockdown before other modules run.

try {
	import('./utils/tamper').then(({ initTamper }) => {
		try { initTamper({ startLocked: true }); } catch (e) { /* ignore */ }
	});
} catch (e) { /* ignore non-dynamic import envs */ }

// ...existing code...
// import and bootstrap the rest of your app below (e.g., React/Vue mount)
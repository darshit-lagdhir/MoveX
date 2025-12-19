/**
 * LOCKDOWN CONTROLLER
 * 
 * UX-level tamper deterrent ONLY.
 * This is NOT real security. Backend authentication is authoritative.
 * 
 * Purpose:
 * - Detect obvious tampering (right-click, DevTools keys)
 * - Show existing lockdown UI
 * - Deter casual misuse
 * 
 * What it does NOT do:
 * - Make auth decisions
 * - Override backend sessions
 * - Prevent determined users
 * - Add real security
 */

const LOCKDOWN = (() => {
	// State machine: NORMAL -> WARNING -> LOCKED
	let state = 'NORMAL';
	let tamperCount = 0;
	let tamperTimestamp = null;
	const TAMPER_THRESHOLD = 3; // attempts within time window
	const TAMPER_WINDOW_MS = 10000; // 10 seconds
	const WARNING_THRESHOLD = 1; // show warning after 1 attempt
	const LOCKED_THRESHOLD = 3; // lock after 3 attempts

	/**
	 * Initialize lockdown system
	 * Attach event listeners to detect tamper attempts
	 */
	function init() {
		if (typeof window === 'undefined') return; // SSR safe
		
		console.log('[LOCKDOWN] Initializing (UX-only deterrent)');
		attachListeners();
		exposeState(); // for debugging
	}

	/**
	 * Attach event listeners for tamper detection
	 */
	function attachListeners() {
		// Detect right-click (contextmenu)
		document.addEventListener('contextmenu', (evt) => {
			recordTamperAttempt('contextmenu');
			evt.preventDefault();
		}, true); // capture phase

		// Detect DevTools keys
		document.addEventListener('keydown', (evt) => {
			const k = (evt.key || '').toLowerCase();
			const isF12 = evt.key === 'F12' || k === 'f12';
			const isCtrlShiftI = evt.ctrlKey && evt.shiftKey && k === 'i';
			const isCtrlShiftJ = evt.ctrlKey && evt.shiftKey && k === 'j';
			const isCtrlU = evt.ctrlKey && k === 'u';

			if (isF12 || isCtrlShiftI || isCtrlShiftJ || isCtrlU) {
				recordTamperAttempt('devtools-key');
				evt.preventDefault();
			}
		}, true); // capture phase
	}

	/**
	 * Record a tamper attempt and update state
	 */
	function recordTamperAttempt(type) {
		const now = Date.now();

		// Reset counter if outside time window
		if (tamperTimestamp && now - tamperTimestamp > TAMPER_WINDOW_MS) {
			tamperCount = 0;
		}

		tamperCount++;
		tamperTimestamp = now;

		console.log(`[LOCKDOWN] Tamper attempt #${tamperCount}: ${type}`);

		// Update state based on attempt count
		if (tamperCount >= LOCKED_THRESHOLD) {
			lock();
		} else if (tamperCount >= WARNING_THRESHOLD) {
			warn();
		}
	}

	/**
	 * Transition to WARNING state
	 */
	function warn() {
		if (state === 'WARNING' || state === 'LOCKED') return; // already warned or locked
		state = 'WARNING';
		console.warn('[LOCKDOWN] WARNING state: Tamper detected');
		showWarningUI();
	}

	/**
	 * Transition to LOCKED state
	 */
	function lock() {
		if (state === 'LOCKED') return; // already locked
		state = 'LOCKED';
		console.warn('[LOCKDOWN] LOCKED state: Too many tamper attempts');
		showLockdownUI();
	}

	/**
	 * Show warning UI (if exists)
	 * Assumes existing HTML element or stylesheet class
	 */
	function showWarningUI() {
		// Show existing warning overlay / modal
		const warningEl = document.getElementById('lockdown-warning');
		if (warningEl) {
			warningEl.style.display = 'flex';
			warningEl.classList.add('show');
		}
	}

	/**
	 * Show lockdown UI (if exists)
	 * Assumes existing HTML element or stylesheet class
	 */
	function showLockdownUI() {
		// Show existing lockdown overlay / modal
		const lockdownEl = document.getElementById('lockdown-overlay') || 
		                   document.querySelector('.lockdown-overlay');
		if (lockdownEl) {
			lockdownEl.style.display = 'flex';
			lockdownEl.classList.add('active');
		}

		// Optionally disable main content
		const mainContent = document.querySelector('main') || document.body;
		if (mainContent) {
			mainContent.style.pointerEvents = 'none';
			mainContent.style.opacity = '0.3';
		}
	}

	/**
	 * Reset lockdown (for testing or after logout)
	 */
	function reset() {
		state = 'NORMAL';
		tamperCount = 0;
		tamperTimestamp = null;
		console.log('[LOCKDOWN] Reset to NORMAL state');

		// Hide warning/lockdown UIs
		const warningEl = document.getElementById('lockdown-warning');
		const lockdownEl = document.getElementById('lockdown-overlay') || 
		                   document.querySelector('.lockdown-overlay');
		if (warningEl) warningEl.style.display = 'none';
		if (lockdownEl) lockdownEl.style.display = 'none';

		// Restore main content
		const mainContent = document.querySelector('main') || document.body;
		if (mainContent) {
			mainContent.style.pointerEvents = 'auto';
			mainContent.style.opacity = '1';
		}
	}

	/**
	 * Get current state (for debugging)
	 */
	function getState() {
		return { state, tamperCount, tamperTimestamp };
	}

	/**
	 * Expose state to window for debugging
	 * Remove in production if desired
	 */
	function exposeState() {
		window.__LOCKDOWN_STATE = getState;
		window.__LOCKDOWN_RESET = reset;
	}

	// Auto-init on module load
	try {
		if (typeof window !== 'undefined') {
			init();
		}
	} catch (e) {
		console.error('[LOCKDOWN] Init error:', e.message);
	}

	return {
		init,
		reset,
		getState,
		// Private for testing (not part of public API)
	};
})();

export default LOCKDOWN;

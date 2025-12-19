/**
 * ⚠️ DEPRECATED: Use lockdown.js instead
 * 
 * This file contains older lockdown logic.
 * lockdown.js is the modern, cleaner implementation.
 * 
 * DO NOT import this file in new code.
 * Existing imports will continue to work but should be migrated to lockdown.js
 */

// Strict persistent lockdown: blocks context menu & devtools keys, re-attaches handlers frequently,
// overrides addEventListener to make it harder for other scripts to bypass, and shows a blocking overlay
// while devtools are detected. This is UI-only and must NOT be used for security decisions.

const TAMPER = (() => {
	let LOCKED = true;
	let _interval = null;
	let _overlay = null;

	const THRESH = 160; // px threshold for outer vs inner to infer devtools
	const POLL_MS = 500;

	function _prevent(e) {
		try { e.stopImmediatePropagation(); } catch (e) {}
		try { e.preventDefault(); } catch (e) {}
	}

	function _onContext(e) { if (LOCKED) _prevent(e); }
	function _onMouse(e) { if (LOCKED && e.button === 2) _prevent(e); }
	function _onKey(e) {
		const k = (e.key || '').toLowerCase();
		if (LOCKED) {
			if (e.key === 'F12' || k === 'f12' || (e.ctrlKey && e.shiftKey && (k === 'i' || k === 'j')) || (e.ctrlKey && k === 'u')) {
				_prevent(e);
			} else {
				_prevent(e);
			}
		}
	}

	function _attachHandlers() {
		// remove duplicates by first removing then adding
		document.removeEventListener('contextmenu', _onContext, true);
		document.removeEventListener('mousedown', _onMouse, true);
		document.removeEventListener('keydown', _onKey, true);

		document.addEventListener('contextmenu', _onContext, true);
		document.addEventListener('mousedown', _onMouse, true);
		document.addEventListener('keydown', _onKey, true);
	}

	function _wrapAddListener() {
		try {
			const nativeAdd = EventTarget.prototype.addEventListener;
			EventTarget.prototype.addEventListener = function (type, listener, options) {
				// Force handlers to be non-capturing wrappers for contextmenu/keydown/mousedown to avoid bypasses
				if (type === 'contextmenu' || type === 'keydown' || type === 'mousedown') {
					const wrap = function (evt) {
						try {
							// do not allow handlers to call preventDefault before our capture ones
							return listener.call(this, evt);
						} catch (e) { /* swallow */ }
					};
					return nativeAdd.call(this, type, wrap, options);
				}
				return nativeAdd.call(this, type, listener, options);
			};
		} catch (e) { /* ignore in restricted envs */ }
	}

	function _createOverlay() {
		if (_overlay) return;
		_overlay = document.createElement('div');
		_overlay.style.position = 'fixed';
		_overlay.style.inset = '0';
		_overlay.style.background = 'rgba(0,0,0,0.95)';
		_overlay.style.color = '#fff';
		_overlay.style.zIndex = '2147483647';
		_overlay.style.display = 'flex';
		_overlay.style.alignItems = 'center';
		_overlay.style.justifyContent = 'center';
		_overlay.style.flexDirection = 'column';
		_overlay.style.fontFamily = 'sans-serif';
		_overlay.innerHTML = '<div style="text-align:center;max-width:90vw;"><h2 style="margin:0 0 10px">Tooling blocked</h2><p style="margin:0">Devtools / inspection is disabled while using this application. Close developer tools to continue.</p></div>';
		_overlay.addEventListener('contextmenu', (e) => { _prevent(e); }, true);
		document.documentElement.appendChild(_overlay);
	}

	function _removeOverlay() {
		if (!_overlay) return;
		_overlay.remove();
		_overlay = null;
	}

	function _devtoolsDetected() {
		try {
			const widthDiff = Math.abs(window.outerWidth - window.innerWidth);
			const heightDiff = Math.abs(window.outerHeight - window.innerHeight);
			return widthDiff > THRESH || heightDiff > THRESH;
		} catch (e) { return false; }
	}

	function _poll() {
		_attachHandlers();
		// re-wrap addEventListener periodically to counteract reassignments
		_wrapAddListener();
		// detect devtools
		if (_devtoolsDetected()) {
			_createOverlay();
		} else {
			_removeOverlay();
		}
	}

	function init({ startLocked = true } = {}) {
		LOCKED = !!startLocked;
		try {
			_attachHandlers();
			_wrapAddListener();
			if (!_interval) _interval = setInterval(_poll, POLL_MS);
			// initial detection
			_poll();
		} catch (e) { /* ignore in SSR/non-browser env */ }
		window.__TAMPER_LOCKDOWN = LOCKED;
		console.warn('[tamper] strict lockdown initialized (UI-only).');
	}

	function disable() {
		LOCKED = false;
		try {
			document.removeEventListener('contextmenu', _onContext, true);
			document.removeEventListener('mousedown', _onMouse, true);
			document.removeEventListener('keydown', _onKey, true);
			if (_interval) { clearInterval(_interval); _interval = null; }
			_removeOverlay();
		} catch (e) {}
		window.__TAMPER_LOCKDOWN = false;
		console.warn('[tamper] lockdown disabled (manual).');
	}

	// auto-init as early as possible when module is imported in browser
	try { if (typeof window !== 'undefined') init({ startLocked: true }); } catch (e) {}

	return { init, disable };
})();

export const initTamper = TAMPER.init;
export const disableTamper = TAMPER.disable;

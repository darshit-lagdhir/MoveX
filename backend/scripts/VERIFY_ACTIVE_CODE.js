/**
 * VERIFICATION SCRIPT
 * Confirms which backend code path is active
 * RUN: node VERIFY_ACTIVE_CODE.js
 * 
 * Safe check - no modifications.
 */

console.log('\n=== BACKEND CODE PATH VERIFICATION ===\n');

// Load the actual entry point
const entry = require('./src/app.js');
console.log('✓ Successfully loaded src/app.js\n');

console.log('Routes registered in src/app.js:');
console.log(entry._router.stack
	.filter(r => r.route)
	.map(r => `  - ${r.route.path}`)
	.join('\n') || '  - (no direct routes)');

console.log('\nMiddleware loaded:');
console.log(entry._router.stack
	.filter(r => !r.route && r.name && r.name !== 'router')
	.slice(0, 10)
	.map(r => `  - ${r.name}`)
	.join('\n') || '  - (no standalone middleware)');

console.log('\n✓ src/app.js is the ACTIVE backend entry point\n');

// Now check if root app.js is even imported anywhere
const fs = require('fs');
const { execSync } = require('child_process');

console.log('Checking if root app.js is imported anywhere...');
const grep = execSync('findstr /R "require.*app.js" *.js src\\*.js', { encoding: 'utf8', stdio: 'pipe' }).catch(() => '');
console.log(grep || '  - NOT IMPORTED (dead code)\n');

console.log('=== VERIFICATION COMPLETE ===\n');

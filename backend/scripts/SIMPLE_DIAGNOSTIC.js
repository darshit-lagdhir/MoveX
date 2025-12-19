const fs = require('fs');
const path = require('path');

console.log('\n=== SIMPLE BACKEND DIAGNOSTIC ===\n');

// Check what src/app.js actually does
console.log('1. SRC/APP.JS CONTENT (first 500 chars):');
const srcAppContent = fs.readFileSync('./src/app.js', 'utf8');
console.log(srcAppContent.substring(0, 500));
console.log('...\n');

// Check what root app.js does
console.log('2. ROOT APP.JS CONTENT (first 500 chars):');
const rootAppContent = fs.readFileSync('./app.js', 'utf8');
console.log(rootAppContent.substring(0, 500));
console.log('...\n');

// Check frontend files
console.log('3. FRONTEND LOCKDOWN.JS vs TAMPER.JS:');
const lockdownStart = fs.readFileSync('../frontend/src/utils/lockdown.js', 'utf8').substring(0, 300);
const tamperStart = fs.readFileSync('../frontend/src/utils/tamper.js', 'utf8').substring(0, 300);
console.log('lockdown.js starts with:\n', lockdownStart);
console.log('\ntamper.js starts with:\n', tamperStart);

console.log('\n=== END DIAGNOSTIC ===\n');

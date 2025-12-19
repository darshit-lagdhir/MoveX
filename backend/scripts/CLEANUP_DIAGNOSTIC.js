/**
 * DIAGNOSTIC SCRIPT
 * Identifies active vs dead code in backend
 * RUN: node CLEANUP_DIAGNOSTIC.js
 * 
 * This script does NOT modify anything - it only analyzes.
 */

const fs = require('fs');
const path = require('path');

console.log('\n=== MoveX BACKEND DIAGNOSTIC ===\n');

// Check which app.js is actually loaded
console.log('1. ENTRY POINT CHECK:');
const rootApp = fs.existsSync('./app.js');
const srcApp = fs.existsSync('./src/app.js');
console.log(`   - Root app.js exists: ${rootApp}`);
console.log(`   - src/app.js exists: ${srcApp}`);

// Check package.json start script
const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
console.log(`   - package.json "start" script: ${packageJson.scripts?.start || 'NOT FOUND'}`);

// Check which is actually imported
console.log('\n2. IMPORT ANALYSIS:');
if (rootApp) {
	const rootContent = fs.readFileSync('./app.js', 'utf8');
	console.log(`   - Root app.js requires ${(rootContent.match(/require\(/g) || []).length} modules`);
	console.log(`   - Root app.js has middleware: ${rootContent.includes('app.use')}`);
	console.log(`   - Root app.js has routes: ${rootContent.includes("app.use('/")})`);
}
if (srcApp) {
	const srcContent = fs.readFileSync('./src/app.js', 'utf8');
	console.log(`   - src/app.js requires ${(srcContent.match(/require\(/g) || []).length} modules`);
	console.log(`   - src/app.js has middleware: ${srcContent.includes('app.use')}`);
	console.log(`   - src/app.js has routes: ${srcContent.includes("app.use('/")})`);
}

// Check route files
console.log('\n3. ROUTES STRUCTURE:');
const routesRoot = fs.readdirSync('./routes').filter(f => f.endsWith('.js'));
const routesSrc = fs.existsSync('./src/routes') ? fs.readdirSync('./src/routes').filter(f => f.endsWith('.js')) : [];
console.log(`   - Root routes/: ${routesRoot.join(', ')}`);
console.log(`   - src/routes/: ${routesSrc.length > 0 ? routesSrc.join(', ') : 'NONE'}`);

// Check frontend imports
console.log('\n4. FRONTEND FILES:');
const lockdownExists = fs.existsSync('../frontend/src/utils/lockdown.js');
const tamperExists = fs.existsSync('../frontend/src/utils/tamper.js');
console.log(`   - lockdown.js exists: ${lockdownExists}`);
console.log(`   - tamper.js exists: ${tamperExists}`);

if (lockdownExists && tamperExists) {
	const lockdownContent = fs.readFileSync('../frontend/src/utils/lockdown.js', 'utf8');
	const tamperContent = fs.readFileSync('../frontend/src/utils/tamper.js', 'utf8');
	console.log(`   - lockdown.js size: ${lockdownContent.length} bytes`);
	console.log(`   - tamper.js size: ${tamperContent.length} bytes`);
	console.log(`   - Are they different? ${lockdownContent !== tamperContent ? 'YES (different files)' : 'NO (identical)'}`);
}

// Check middleware
console.log('\n5. MIDDLEWARE STRUCTURE:');
const middlewareRoot = fs.readdirSync('./middleware').filter(f => f.endsWith('.js'));
const middlewareSrc = fs.existsSync('./src') ? 
	fs.readdirSync('./src').filter(f => f.endsWith('.js')).concat(
		fs.existsSync('./src/middleware') ? fs.readdirSync('./src/middleware').filter(f => f.endsWith('.js')) : []
	) : [];
console.log(`   - Root middleware/: ${middlewareRoot.join(', ')}`);
console.log(`   - src/: ${middlewareSrc.length > 0 ? middlewareSrc.join(', ') : 'NONE'}`);

// Check unused files
console.log('\n6. POTENTIALLY UNUSED FILES:');
const srcFiles = fs.existsSync('./src') ? fs.readdirSync('./src', { recursive: true }).filter(f => f.endsWith('.js')) : [];
const rootFiles = ['app.js', 'package.json', '.env'];
console.log(`   - Total files in src/: ${srcFiles.length}`);
console.log(`   - Likely unused: ${srcFiles.slice(0, 10).join(', ')}${srcFiles.length > 10 ? '...' : ''}`);

console.log('\n=== DIAGNOSIS COMPLETE ===\n');
console.log('RECOMMENDATION: Delete src/ folder if all functionality is in root directory.\n');

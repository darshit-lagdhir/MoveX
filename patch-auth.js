const fs = require('fs');

const files = [
  'c:/Users/Trojan/Downloads/anothermoveX/js/admin-core.js',
  'c:/Users/Trojan/Downloads/anothermoveX/js/franchisee-core.js',
  'c:/Users/Trojan/Downloads/anothermoveX/js/staff-core.js',
  'c:/Users/Trojan/Downloads/anothermoveX/js/user-core.js'
];

files.forEach(file => {
  if (!fs.existsSync(file)) return;
  let text = fs.readFileSync(file, 'utf8');
  let original = text;

  // 1. Franchisee getAuthHeaders
  text = text.replace(
    /function getAuthHeaders\(\) \{[\s\S]*?return \{[\s\S]*?\};?\s*\}/,
    `function getAuthHeaders() {
        const session = JSON.parse(sessionStorage.getItem('movexsecuresession') || '{}');
        return {
            'Content-Type': 'application/json',
            'X-User-Username': session.data?.username || ''
        };
    }`
  );

  // 2. Inline token checks
  text = text.replace(
    /const session = JSON\.parse\(sessionStorage\.getItem\('movexsecuresession'\) \|\| '{}'\);\s*const token = session\.data\?\.token;\s*const headers = \{ 'Content-Type': 'application\/json' \};\s*if \(token\) headers\['Authorization'\] = `Bearer \$\{token\}`;/gs,
    `const session = JSON.parse(sessionStorage.getItem('movexsecuresession') || '{}');
      const headers = { 'Content-Type': 'application/json' };
      if (session.data?.username) headers['X-User-Username'] = session.data.username;`
  );

  text = text.replace(
    /const token = session\.data\?\.token;\s*let headers = \{ 'Content-Type': 'application\/json' \};\s*if \(token\) headers\['Authorization'\] = `Bearer \$\{token\}`;/gs,
    `let headers = { 'Content-Type': 'application/json' };
      if (session.data?.username) headers['X-User-Username'] = session.data.username;`
  );

  text = text.replace(
    /let headers = \{ 'Content-Type': 'application\/json' \};\s*const token = \(JSON\.parse\(sessionStorage\.getItem\('movexsecuresession'\) \|\| '{}'\)\)\.data\?\.token;\s*if \(token\) headers\.Authorization = `Bearer \$\{token\}`;/gs,
    `let headers = { 'Content-Type': 'application/json' };
      const _session = JSON.parse(sessionStorage.getItem('movexsecuresession') || '{}');
      if (_session.data?.username) headers['X-User-Username'] = _session.data.username;`
  );

  // 3. fetch calls with credentials: 'include'
  text = text.replace(
    /\{ credentials: 'include' \}/g,
    `{ headers: { 'X-User-Username': JSON.parse(sessionStorage.getItem('movexsecuresession') || '{}').data?.username || '' } }`
  );

  text = text.replace(
    /,\s*credentials:\s*'include'/g,
    `, headers: { 'X-User-Username': JSON.parse(sessionStorage.getItem('movexsecuresession') || '{}').data?.username || '' }`
  );
  
  text = text.replace(
    /credentials:\s*'include',\s*/g,
    `headers: { 'X-User-Username': JSON.parse(sessionStorage.getItem('movexsecuresession') || '{}').data?.username || '' }, `
  );

  if (text !== original) {
    fs.writeFileSync(file, text);
    console.log('Successfully patched ' + file);
  }
});

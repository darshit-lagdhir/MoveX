const { Client } = require('pg');
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const client = new Client({ 
    connectionString: 'postgresql://postgres.pxgdvythhmxamcixbjsu:darshit1899@aws-1-ap-south-1.pooler.supabase.com:5432/postgres?sslmode=require',
    ssl: { rejectUnauthorized: false } 
});
client.connect()
    .then(() => client.query("SELECT user_id, username, role, phone FROM users WHERE role = 'admin'"))
    .then(res => { 
        console.log(JSON.stringify(res.rows, null, 2)); 
        client.end(); 
    })
    .catch(err => { 
        console.error(err); 
        client.end(); 
    });

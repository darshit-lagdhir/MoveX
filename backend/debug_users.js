require('dotenv').config();
const { Client } = require('pg');
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const client = new Client({ 
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } 
});
client.connect()
    .then(() => client.query('SELECT user_id, username, role, organization_id, phone FROM users WHERE organization_id = 3'))
    .then(res => { 
        console.log(JSON.stringify(res.rows, null, 2)); 
        client.end(); 
    })
    .catch(err => { 
        console.error(err); 
        client.end(); 
    });

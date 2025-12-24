const pool = require('../db');

const CITIES = [
    "Mumbai, MH", "Delhi, NCR", "Bangalore, KA", "Hyderabad, TS", "Chennai, TN", "Kolkata, WB",
    "Pune, MH", "Ahmedabad, GJ", "Jaipur, RJ", "Lucknow, UP", "Surat, GJ", "Kanpur, UP",
    "Nagpur, MH", "Indore, MP", "Thane, MH", "Bhopal, MP", "Visakhapatnam, AP", "Patna, BR"
];
const NAMES = ["Arjun", "Priya", "Rohan", "Anjali", "Vikram", "Sneha", "Amit", "Gurpreet", "Ravi", "Deepika", "Aditya", "Neha", "Karan", "Simran", "Rahul", "Pooja"];
const SURNAMES = ["Verma", "Sharma", "Gupta", "Das", "Singh", "Kapoor", "Mishra", "Kaur", "Kumar", "Bora", "Patel", "Reddy", "Nair", "Iyer", "Jain", "Mehta"];
const STATUSES = ['pending', 'in_transit', 'delivered', 'failed'];

function getRandomItem(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function getRandomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

async function seed() {
    try {
        console.log('Connecting to database...');

        // 1. Add Missing Columns
        console.log('Ensuring columns exist...');
        await pool.query(`ALTER TABLE shipments ADD COLUMN IF NOT EXISTS sender_email VARCHAR(100)`);
        await pool.query(`ALTER TABLE shipments ADD COLUMN IF NOT EXISTS receiver_email VARCHAR(100)`);
        await pool.query(`ALTER TABLE shipments ADD COLUMN IF NOT EXISTS sender_phone VARCHAR(20)`);
        await pool.query(`ALTER TABLE shipments ADD COLUMN IF NOT EXISTS receiver_phone VARCHAR(20)`);

        // 2. Populate 50 New Rows
        console.log('Inserting 50 new shipments...');
        const values = [];

        for (let i = 0; i < 50; i++) {
            const origin = getRandomItem(CITIES);
            let destination = getRandomItem(CITIES);
            while (destination === origin) destination = getRandomItem(CITIES);

            const senderFirst = getRandomItem(NAMES);
            const senderLast = getRandomItem(SURNAMES);
            const senderName = `${senderFirst} ${senderLast}`;
            const senderEmail = `${senderFirst.toLowerCase()}.${senderLast.toLowerCase()}${getRandomInt(1, 99)}@example.com`;

            const receiverFirst = getRandomItem(NAMES);
            const receiverLast = getRandomItem(SURNAMES);
            const receiverName = `${receiverFirst} ${receiverLast}`;
            const receiverEmail = `${receiverFirst.toLowerCase()}.${receiverLast.toLowerCase()}${getRandomInt(1, 99)}@example.com`;

            const status = getRandomItem(STATUSES);
            const price = getRandomInt(150, 5000) + (getRandomInt(0, 99) / 100);

            // Random date in last 60 days
            const date = new Date();
            date.setDate(date.getDate() - getRandomInt(0, 60));
            date.setHours(getRandomInt(8, 20), getRandomInt(0, 59), 0);

            const trackingId = 'MX' + Math.floor(100000 + Math.random() * 900000);

            await pool.query(`
                INSERT INTO shipments 
                (tracking_id, sender_name, sender_email, sender_phone, receiver_name, receiver_email, receiver_phone, origin_address, destination_address, status, price, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
            `, [
                trackingId,
                senderName,
                senderEmail,
                `9${getRandomInt(100000000, 999999999)}`,
                receiverName,
                receiverEmail,
                `9${getRandomInt(100000000, 999999999)}`,
                origin,
                destination,
                status,
                price,
                date
            ]);
        }

        // 3. Fix Existing Empty Data (Updates old rows to have data)
        console.log('Backfilling existing rows...');
        await pool.query(`UPDATE shipments SET sender_email = 'legacy.user@movex.com' WHERE sender_email IS NULL`);
        await pool.query(`UPDATE shipments SET receiver_email = 'legacy.receiver@movex.com' WHERE receiver_email IS NULL`);
        await pool.query(`UPDATE shipments SET sender_phone = '9000000001' WHERE sender_phone IS NULL`);
        await pool.query(`UPDATE shipments SET receiver_phone = '9000000002' WHERE receiver_phone IS NULL`);
        await pool.query(`UPDATE shipments SET sender_name = 'Unknown Sender' WHERE sender_name IS NULL`);
        await pool.query(`UPDATE shipments SET receiver_name = 'Unknown Receiver' WHERE receiver_name IS NULL`);
        await pool.query(`UPDATE shipments SET origin_address = 'Mumbai, MH' WHERE origin_address IS NULL`);
        await pool.query(`UPDATE shipments SET destination_address = 'Delhi, NCR' WHERE destination_address IS NULL`);

        console.log('Database population complete!');
        process.exit(0);
    } catch (e) {
        console.error('Error seeding database:', e);
        process.exit(1);
    }
}

seed();

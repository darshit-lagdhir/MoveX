const pool = require('../config/db');

exports.getAllShipments = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM shipments ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching shipments:', error);
        res.status(500).json({ message: 'Server error fetching shipments', error: error.message });
    }
};

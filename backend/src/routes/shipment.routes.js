const express = require('express');
const router = express.Router();
const shipmentController = require('../controllers/shipment.controller');
const { requireSession } = require('../sessionMiddleware');

// Get all shipments (protected)
// Ideally this should be restricted to admin/franchisee/staff
router.get('/', requireSession, shipmentController.getAllShipments);

module.exports = router;

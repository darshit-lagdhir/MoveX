/**
 * Shipment Photos API Routes
 * 
 * Handles photo uploads and retrieval for shipment tracking.
 * Uses Supabase Storage for file storage.
 * 
 * Endpoints:
 *   POST /api/photos/upload - Upload a photo for a shipment
 *   GET /api/photos/:trackingId - Get all photos for a shipment
 *   GET /api/photos/:trackingId/:filename - Get signed URL for specific photo
 *   DELETE /api/photos/:trackingId/:filename - Delete a photo
 */

const express = require('express');
const router = express.Router();
const storage = require('../utils/supabase-storage');
const sessionStore = require('../src/session');

// ═══════════════════════════════════════════════════════════
// AUTHENTICATION MIDDLEWARE
// ═══════════════════════════════════════════════════════════

/**
 * Validate user session for photo operations
 */
async function requireAuth(req, res, next) {
    const sid = req.cookies?.['movex.sid'];
    const session = await sessionStore.getSession(sid);

    if (!session) {
        return res.status(401).json({
            success: false,
            error: 'Authentication required'
        });
    }

    req.session = session;
    next();
}

/**
 * Require specific roles for photo operations
 */
function requireRole(...allowedRoles) {
    return (req, res, next) => {
        if (!req.session) {
            return res.status(401).json({ success: false, error: 'Not authenticated' });
        }

        if (!allowedRoles.includes(req.session.role)) {
            return res.status(403).json({
                success: false,
                error: 'Insufficient permissions for photo operations'
            });
        }

        next();
    };
}

// ═══════════════════════════════════════════════════════════
// ROUTES
// ═══════════════════════════════════════════════════════════

/**
 * POST /api/photos/upload
 * Upload a photo for a shipment
 * 
 * Body (multipart/form-data or base64):
 *   - trackingId: string (required)
 *   - photoType: string (pickup, delivery, signature, damage, pod)
 *   - file: base64 string or file upload
 */
router.post('/upload', requireAuth, requireRole('admin', 'franchisee', 'staff'), async (req, res) => {
    try {
        // Check if storage is configured
        if (!storage.isConfigured()) {
            return res.status(503).json({
                success: false,
                error: 'Photo storage is not configured',
                message: 'Contact administrator to enable photo uploads'
            });
        }

        const { trackingId, photoType, file, mimeType } = req.body;

        // Validate required fields
        if (!trackingId) {
            return res.status(400).json({
                success: false,
                error: 'Tracking ID is required'
            });
        }

        if (!file) {
            return res.status(400).json({
                success: false,
                error: 'Photo file is required'
            });
        }

        // Validate tracking ID format (alphanumeric with dashes/underscores)
        if (!/^[a-zA-Z0-9_-]{1,50}$/.test(trackingId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid tracking ID format'
            });
        }

        // Validate photo type
        const validPhotoType = storage.ALLOWED_PHOTO_TYPES.includes(photoType)
            ? photoType
            : 'other';

        // Convert base64 to buffer
        let fileBuffer;
        try {
            // Handle data URL format: data:image/jpeg;base64,/9j/4AAQ...
            const base64Data = file.includes('base64,')
                ? file.split('base64,')[1]
                : file;
            fileBuffer = Buffer.from(base64Data, 'base64');
        } catch (err) {
            return res.status(400).json({
                success: false,
                error: 'Invalid file format. Expected base64 encoded image.'
            });
        }

        // Validate file
        const detectedMimeType = mimeType || 'image/jpeg';
        const validation = storage.validateFile({
            size: fileBuffer.length,
            mimeType: detectedMimeType
        });

        if (!validation.valid) {
            return res.status(400).json({
                success: false,
                error: validation.error
            });
        }

        // Determine extension from mime type
        const extensionMap = {
            'image/jpeg': 'jpg',
            'image/jpg': 'jpg',
            'image/png': 'png',
            'image/webp': 'webp',
            'image/heic': 'heic',
            'image/heif': 'heif'
        };
        const extension = extensionMap[detectedMimeType] || 'jpg';

        // Upload to storage
        const result = await storage.uploadPhoto(fileBuffer, trackingId, validPhotoType, {
            mimeType: detectedMimeType,
            extension
        });

        if (!result.success) {
            console.error('[Photos] Upload failed:', result.error);
            return res.status(500).json({
                success: false,
                error: 'Failed to upload photo',
                message: result.error
            });
        }

        // Log upload
        console.log(`[Photos] Uploaded ${validPhotoType} photo for ${trackingId} by ${req.session.email}`);

        res.status(201).json({
            success: true,
            message: 'Photo uploaded successfully',
            data: {
                trackingId,
                photoType: validPhotoType,
                path: result.path
            }
        });

    } catch (err) {
        console.error('[Photos] Upload error:', err.message);
        res.status(500).json({
            success: false,
            error: 'Photo upload failed'
        });
    }
});

/**
 * GET /api/photos/:trackingId
 * Get all photos for a shipment with signed URLs
 */
router.get('/:trackingId', requireAuth, async (req, res) => {
    try {
        const { trackingId } = req.params;

        // Validate tracking ID
        if (!trackingId || !/^[a-zA-Z0-9_-]{1,50}$/.test(trackingId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid tracking ID'
            });
        }

        // Check if storage is configured
        if (!storage.isConfigured()) {
            return res.json({
                success: true,
                trackingId,
                photos: [],
                message: 'Photo storage not configured'
            });
        }

        const result = await storage.getShipmentPhotos(trackingId);

        if (!result.success) {
            return res.status(500).json({
                success: false,
                error: result.error
            });
        }

        res.json({
            success: true,
            trackingId,
            photos: result.photos,
            total: result.photos.length
        });

    } catch (err) {
        console.error('[Photos] Get photos error:', err.message);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve photos'
        });
    }
});

/**
 * GET /api/photos/:trackingId/:filename
 * Get signed URL for a specific photo
 */
router.get('/:trackingId/:filename', requireAuth, async (req, res) => {
    try {
        const { trackingId, filename } = req.params;

        if (!storage.isConfigured()) {
            return res.status(404).json({
                success: false,
                error: 'Photo storage not configured'
            });
        }

        const storagePath = `${trackingId}/${filename}`;
        const result = await storage.getSignedUrl(storagePath);

        if (!result.success) {
            return res.status(404).json({
                success: false,
                error: 'Photo not found'
            });
        }

        res.json({
            success: true,
            url: result.url,
            expiresIn: '1 hour'
        });

    } catch (err) {
        console.error('[Photos] Get signed URL error:', err.message);
        res.status(500).json({
            success: false,
            error: 'Failed to get photo URL'
        });
    }
});

/**
 * DELETE /api/photos/:trackingId/:filename
 * Delete a photo (admin/franchisee only)
 */
router.delete('/:trackingId/:filename', requireAuth, requireRole('admin', 'franchisee'), async (req, res) => {
    try {
        const { trackingId, filename } = req.params;

        if (!storage.isConfigured()) {
            return res.status(503).json({
                success: false,
                error: 'Photo storage not configured'
            });
        }

        const storagePath = `${trackingId}/${filename}`;
        const result = await storage.deletePhoto(storagePath);

        if (!result.success) {
            return res.status(500).json({
                success: false,
                error: result.error
            });
        }

        console.log(`[Photos] Deleted ${storagePath} by ${req.session.email}`);

        res.json({
            success: true,
            message: 'Photo deleted successfully'
        });

    } catch (err) {
        console.error('[Photos] Delete error:', err.message);
        res.status(500).json({
            success: false,
            error: 'Failed to delete photo'
        });
    }
});

module.exports = router;

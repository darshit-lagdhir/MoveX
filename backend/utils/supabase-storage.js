/**
 * Supabase Storage Helper
 * 
 * Provides safe photo storage for shipment tracking using Supabase Storage.
 * 
 * IMPORTANT:
 * - This module uses the SERVICE_KEY (backend only)
 * - NEVER expose SUPABASE_SERVICE_KEY to frontend
 * - Photos are stored in private buckets with signed URL access
 * 
 * Usage:
 *   const storage = require('./utils/supabase-storage');
 *   const uploadUrl = await storage.getUploadUrl('MX29801', 'pickup');
 *   const photoUrl = await storage.getSignedUrl('MX29801/1703251200000_pickup.jpg');
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// ═══════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const STORAGE_BUCKET = process.env.STORAGE_BUCKET || 'shipment-photos';

// Default signed URL expiration (1 hour)
const DEFAULT_EXPIRY_SECONDS = 3600;

// Maximum file size (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Allowed file types
const ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif'
];

// Photo types for naming
const ALLOWED_PHOTO_TYPES = ['pickup', 'delivery', 'signature', 'damage', 'pod', 'other'];

// ═══════════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════════

let supabaseClient = null;

/**
 * Initialize Supabase client lazily
 * This allows the app to start even if Supabase credentials aren't configured
 */
function getSupabaseClient() {
    if (supabaseClient) {
        return supabaseClient;
    }

    // Check if Supabase is configured
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
        console.warn('[Storage] Supabase not configured - photo storage disabled');
        console.warn('[Storage] Set SUPABASE_URL and SUPABASE_SERVICE_KEY to enable');
        return null;
    }

    try {
        // Dynamic import to avoid error if @supabase/supabase-js not installed
        const { createClient } = require('@supabase/supabase-js');

        supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });

        console.log('✅ Supabase Storage initialized');
        return supabaseClient;
    } catch (err) {
        if (err.code === 'MODULE_NOT_FOUND') {
            console.warn('[Storage] @supabase/supabase-js not installed');
            console.warn('[Storage] Run: npm install @supabase/supabase-js');
        } else {
            console.error('[Storage] Failed to initialize Supabase:', err.message);
        }
        return null;
    }
}

// ═══════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════

/**
 * Generate storage path for a photo
 * Format: {trackingId}/{timestamp}_{type}.{ext}
 * 
 * @param {string} trackingId - Shipment tracking ID (e.g., 'MX29801')
 * @param {string} photoType - Type of photo (pickup, delivery, etc.)
 * @param {string} extension - File extension (jpg, png, etc.)
 * @returns {string} Storage path
 */
function generateStoragePath(trackingId, photoType, extension = 'jpg') {
    const sanitizedTrackingId = trackingId.replace(/[^a-zA-Z0-9-_]/g, '');
    const sanitizedType = ALLOWED_PHOTO_TYPES.includes(photoType) ? photoType : 'other';
    const timestamp = Date.now();
    const sanitizedExt = extension.toLowerCase().replace(/[^a-z]/g, '') || 'jpg';

    return `${sanitizedTrackingId}/${timestamp}_${sanitizedType}.${sanitizedExt}`;
}

/**
 * Validate file metadata for upload
 * 
 * @param {object} fileInfo - { size, mimeType }
 * @returns {{ valid: boolean, error?: string }}
 */
function validateFile(fileInfo) {
    if (!fileInfo) {
        return { valid: false, error: 'No file information provided' };
    }

    const { size, mimeType } = fileInfo;

    if (size && size > MAX_FILE_SIZE) {
        return { valid: false, error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` };
    }

    if (mimeType && !ALLOWED_MIME_TYPES.includes(mimeType.toLowerCase())) {
        return { valid: false, error: `Invalid file type. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}` };
    }

    return { valid: true };
}

// ═══════════════════════════════════════════════════════════
// STORAGE OPERATIONS
// ═══════════════════════════════════════════════════════════

/**
 * Upload a photo to storage
 * 
 * @param {Buffer} fileBuffer - The file data
 * @param {string} trackingId - Shipment tracking ID
 * @param {string} photoType - Type of photo
 * @param {object} options - { mimeType, extension }
 * @returns {Promise<{ success: boolean, path?: string, error?: string }>}
 */
async function uploadPhoto(fileBuffer, trackingId, photoType, options = {}) {
    const client = getSupabaseClient();

    if (!client) {
        return { success: false, error: 'Storage not configured' };
    }

    if (!trackingId || !fileBuffer) {
        return { success: false, error: 'Missing required parameters' };
    }

    // Validate file
    const validation = validateFile({
        size: fileBuffer.length,
        mimeType: options.mimeType
    });

    if (!validation.valid) {
        return { success: false, error: validation.error };
    }

    const extension = options.extension || 'jpg';
    const storagePath = generateStoragePath(trackingId, photoType, extension);

    try {
        const { data, error } = await client.storage
            .from(STORAGE_BUCKET)
            .upload(storagePath, fileBuffer, {
                contentType: options.mimeType || 'image/jpeg',
                upsert: false // Don't overwrite existing files
            });

        if (error) {
            console.error('[Storage] Upload error:', error.message);
            return { success: false, error: error.message };
        }

        console.log(`[Storage] Uploaded: ${storagePath}`);
        return { success: true, path: storagePath };
    } catch (err) {
        console.error('[Storage] Upload exception:', err.message);
        return { success: false, error: 'Upload failed' };
    }
}

/**
 * Get a signed URL for viewing a photo
 * 
 * @param {string} storagePath - Path to the file in storage
 * @param {number} expirySeconds - How long the URL is valid (default 1 hour)
 * @returns {Promise<{ success: boolean, url?: string, error?: string }>}
 */
async function getSignedUrl(storagePath, expirySeconds = DEFAULT_EXPIRY_SECONDS) {
    const client = getSupabaseClient();

    if (!client) {
        return { success: false, error: 'Storage not configured' };
    }

    if (!storagePath) {
        return { success: false, error: 'Storage path is required' };
    }

    try {
        const { data, error } = await client.storage
            .from(STORAGE_BUCKET)
            .createSignedUrl(storagePath, expirySeconds);

        if (error) {
            console.error('[Storage] Signed URL error:', error.message);
            return { success: false, error: error.message };
        }

        return { success: true, url: data.signedUrl };
    } catch (err) {
        console.error('[Storage] Signed URL exception:', err.message);
        return { success: false, error: 'Failed to generate URL' };
    }
}

/**
 * Get signed URLs for all photos of a shipment
 * 
 * @param {string} trackingId - Shipment tracking ID
 * @returns {Promise<{ success: boolean, photos?: Array, error?: string }>}
 */
async function getShipmentPhotos(trackingId) {
    const client = getSupabaseClient();

    if (!client) {
        return { success: false, error: 'Storage not configured' };
    }

    if (!trackingId) {
        return { success: false, error: 'Tracking ID is required' };
    }

    const sanitizedTrackingId = trackingId.replace(/[^a-zA-Z0-9-_]/g, '');

    try {
        // List all files in the tracking ID folder
        const { data: files, error: listError } = await client.storage
            .from(STORAGE_BUCKET)
            .list(sanitizedTrackingId, {
                limit: 100,
                sortBy: { column: 'created_at', order: 'desc' }
            });

        if (listError) {
            console.error('[Storage] List error:', listError.message);
            return { success: false, error: listError.message };
        }

        if (!files || files.length === 0) {
            return { success: true, photos: [] };
        }

        // Generate signed URLs for each file
        const photos = await Promise.all(
            files.map(async (file) => {
                const path = `${sanitizedTrackingId}/${file.name}`;
                const urlResult = await getSignedUrl(path);

                // Parse file name to extract type
                const match = file.name.match(/^\d+_([a-z]+)\./);
                const photoType = match ? match[1] : 'unknown';

                return {
                    name: file.name,
                    path: path,
                    type: photoType,
                    size: file.metadata?.size,
                    createdAt: file.created_at,
                    url: urlResult.success ? urlResult.url : null
                };
            })
        );

        return { success: true, photos };
    } catch (err) {
        console.error('[Storage] Get photos exception:', err.message);
        return { success: false, error: 'Failed to retrieve photos' };
    }
}

/**
 * Delete a photo from storage
 * 
 * @param {string} storagePath - Path to the file in storage
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
async function deletePhoto(storagePath) {
    const client = getSupabaseClient();

    if (!client) {
        return { success: false, error: 'Storage not configured' };
    }

    if (!storagePath) {
        return { success: false, error: 'Storage path is required' };
    }

    try {
        const { error } = await client.storage
            .from(STORAGE_BUCKET)
            .remove([storagePath]);

        if (error) {
            console.error('[Storage] Delete error:', error.message);
            return { success: false, error: error.message };
        }

        console.log(`[Storage] Deleted: ${storagePath}`);
        return { success: true };
    } catch (err) {
        console.error('[Storage] Delete exception:', err.message);
        return { success: false, error: 'Delete failed' };
    }
}

// ═══════════════════════════════════════════════════════════
// BUCKET SETUP (Run once to create bucket)
// ═══════════════════════════════════════════════════════════

/**
 * Ensure the storage bucket exists with proper settings
 * Call this once during initial setup
 * 
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
async function ensureBucket() {
    const client = getSupabaseClient();

    if (!client) {
        return { success: false, error: 'Storage not configured' };
    }

    try {
        // Check if bucket exists
        const { data: buckets, error: listError } = await client.storage.listBuckets();

        if (listError) {
            return { success: false, error: listError.message };
        }

        const bucketExists = buckets?.some(b => b.name === STORAGE_BUCKET);

        if (bucketExists) {
            console.log(`[Storage] Bucket '${STORAGE_BUCKET}' already exists`);
            return { success: true };
        }

        // Create bucket with private access
        const { error: createError } = await client.storage.createBucket(STORAGE_BUCKET, {
            public: false, // Private bucket - requires signed URLs
            fileSizeLimit: MAX_FILE_SIZE,
            allowedMimeTypes: ALLOWED_MIME_TYPES
        });

        if (createError) {
            return { success: false, error: createError.message };
        }

        console.log(`[Storage] Created bucket '${STORAGE_BUCKET}' (private)`);
        return { success: true };
    } catch (err) {
        console.error('[Storage] Bucket setup exception:', err.message);
        return { success: false, error: 'Bucket setup failed' };
    }
}

// ═══════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════

module.exports = {
    // Main operations
    uploadPhoto,
    getSignedUrl,
    getShipmentPhotos,
    deletePhoto,

    // Setup
    ensureBucket,

    // Utilities
    generateStoragePath,
    validateFile,

    // Constants
    ALLOWED_PHOTO_TYPES,
    ALLOWED_MIME_TYPES,
    MAX_FILE_SIZE,

    // Check if storage is available
    isConfigured: () => Boolean(getSupabaseClient())
};

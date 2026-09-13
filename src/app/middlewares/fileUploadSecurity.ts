import { Request, Response, NextFunction } from 'express';
import httpStatus from 'http-status';
import path from 'path';

/**
 * WBS-TD-SC-03 — File upload security hardening middleware.
 * Validates MIME type, file extension, and file size before
 * the upload handler runs.
 */

// Allowlisted MIME types
const ALLOWED_MIME_TYPES = new Set([
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'text/plain',
    'text/csv',
]);

// Allowlisted file extensions
const ALLOWED_EXTENSIONS = new Set([
    '.pdf',
    '.doc', '.docx',
    '.xls', '.xlsx',
    '.ppt', '.pptx',
    '.jpg', '.jpeg', '.png', '.webp', '.gif',
    '.txt', '.csv',
]);

// Blocklisted extensions (always reject even if disguised MIME)
const BLOCKED_EXTENSIONS = new Set([
    '.exe', '.bat', '.cmd', '.com', '.msi',
    '.sh', '.bash', '.ps1',
    '.js', '.ts', '.jsx', '.tsx',
    '.php', '.py', '.rb', '.pl',
    '.dll', '.so', '.dylib',
    '.scr', '.vbs', '.wsf',
]);

// Default max: 50 MB (configurable via env)
const MAX_FILE_SIZE = parseInt(process.env.MAX_UPLOAD_SIZE_BYTES || '', 10) || 50 * 1024 * 1024;

/**
 * Sanitise file name to remove dangerous characters.
 */
const sanitiseFileName = (name: string): string => {
    // Remove null bytes, path traversal, and non-printable chars
    return name
        .replace(/[\x00-\x1f]/g, '')          // Control chars
        .replace(/\.\./g, '')                  // Path traversal
        .replace(/[/\\]/g, '_')               // Path separators
        .replace(/[<>:"|?*]/g, '_')           // Windows reserved chars
        .trim();
};

/**
 * Express middleware to validate uploaded files.
 * Place BEFORE the upload controller in the route chain.
 */
export const fileUploadSecurity = (req: Request, res: Response, next: NextFunction) => {
    const file = req.file;

    if (!file) {
        // No file attached — let the controller decide if that's an error
        return next();
    }

    // 1. Check file size
    if (file.size > MAX_FILE_SIZE) {
        return res.status(httpStatus.REQUEST_ENTITY_TOO_LARGE).json({
            success: false,
            statusCode: httpStatus.REQUEST_ENTITY_TOO_LARGE,
            message: `File too large. Maximum allowed size is ${(MAX_FILE_SIZE / (1024 * 1024)).toFixed(0)} MB.`,
        });
    }

    // 2. Check extension
    const ext = path.extname(file.originalname).toLowerCase();

    if (BLOCKED_EXTENSIONS.has(ext)) {
        return res.status(httpStatus.BAD_REQUEST).json({
            success: false,
            statusCode: httpStatus.BAD_REQUEST,
            message: `File type "${ext}" is not allowed for security reasons.`,
        });
    }

    if (!ALLOWED_EXTENSIONS.has(ext)) {
        return res.status(httpStatus.BAD_REQUEST).json({
            success: false,
            statusCode: httpStatus.BAD_REQUEST,
            message: `Unsupported file extension "${ext}". Allowed: ${[...ALLOWED_EXTENSIONS].join(', ')}`,
        });
    }

    // 3. Check MIME type
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
        return res.status(httpStatus.BAD_REQUEST).json({
            success: false,
            statusCode: httpStatus.BAD_REQUEST,
            message: `Unsupported file type "${file.mimetype}". Please upload a document, image, or text file.`,
        });
    }

    // 4. Sanitise the filename (modify in-place on the multer file object)
    file.originalname = sanitiseFileName(file.originalname);

    next();
};

export default fileUploadSecurity;

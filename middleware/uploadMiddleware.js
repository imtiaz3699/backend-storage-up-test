import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create uploads directories if they don't exist
const uploadsDir = path.join(__dirname, '..', 'uploads', 'documents');
const locationImagesDir = path.join(__dirname, '..', 'uploads', 'locations');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
if (!fs.existsSync(locationImagesDir)) {
  fs.mkdirSync(locationImagesDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp-userId-originalname
    const userId = req.params.id || 'unknown';
    const timestamp = Date.now();
    const originalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `${timestamp}-${userId}-${originalName}`;
    cb(null, filename);
  }
});

// File filter - allow images and PDFs
const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed types: images (JPEG, PNG, GIF, WebP) and documents (PDF, DOC, DOCX)`), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max file size
  }
});

// Middleware for uploading user documents
export const uploadUserDocuments = upload.fields([
  { name: 'id_document', maxCount: 1 },
  { name: 'contract_copy', maxCount: 1 },
  { name: 'additional_records', maxCount: 1 }
]);

// Storage for location images
const locationImagesStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, locationImagesDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp-originalname
    const timestamp = Date.now();
    const originalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `${timestamp}-${originalName}`;
    cb(null, filename);
  }
});

// File filter for location images - only images
const locationImageFilter = (req, file, cb) => {
  const allowedMimes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp'
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Only images (JPEG, PNG, GIF, WebP) are allowed.`), false);
  }
};

// Configure multer for location images
const locationImagesUpload = multer({
  storage: locationImagesStorage,
  fileFilter: locationImageFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max file size
  }
});

// Middleware for uploading location images (multiple files)
export const uploadLocationImages = locationImagesUpload.array('locationImages', 10); // max 10 images

// Helper function to get file URL
export const getFileUrl = (filename) => {
  if (!filename) return null;
  // Return URL path for accessing the file
  return `/uploads/documents/${filename}`;
};

// Helper function to get location image URL
export const getLocationImageUrl = (filename) => {
  if (!filename) return null;
  // Return URL path for accessing the location image
  return `/uploads/locations/${filename}`;
};


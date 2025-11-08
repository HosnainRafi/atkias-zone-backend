// src/config/multer.config.ts

import multer from 'multer';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';


// Create uploads directory if it doesn't exist
const uploadDir = path.join(process.cwd(), 'public', 'uploads');


if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}


// Create temp directory for temporary files
const tempDir = path.join(process.cwd(), 'public', 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}


// Configure storage for temporary uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, tempDir); // Store in temp first
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext).replace(/\s+/g, '-');
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  },
});


// File filter to accept only images
const imageFilter = (
  req: any,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(
    path.extname(file.originalname).toLowerCase()
  );
  const mimetype = allowedTypes.test(file.mimetype);


  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(
      new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)')
    );
  }
};


// Helper function to compress image
export async function compressImage(
  inputPath: string,
  outputPath: string,
  mimetype: string
): Promise<{ size: number; compressionRatio: string }> {
  let transformer = sharp(inputPath);
  const originalSize = fs.statSync(inputPath).size;

  // Apply format-specific compression settings
  if (mimetype === 'image/jpeg' || mimetype === 'image/jpg') {
    transformer = transformer.jpeg({
      quality: 80,
      mozjpeg: true,
      progressive: true,
    });
  } else if (mimetype === 'image/png') {
    transformer = transformer.png({
      quality: 80,
      compressionLevel: 9,
      adaptiveFiltering: true,
    });
  } else if (mimetype === 'image/webp') {
    transformer = transformer.webp({
      quality: 80,
      alphaQuality: 100,
    });
  } else if (mimetype === 'image/gif') {
    transformer = transformer.gif();
  } else {
    // Default: convert to optimized WebP
    transformer = transformer.webp({ quality: 80 });
  }

  await transformer.toFile(outputPath);

  const compressedSize = fs.statSync(outputPath).size;
  const compressionRatio = `${((1 - compressedSize / originalSize) * 100).toFixed(2)}%`;

  return {
    size: compressedSize,
    compressionRatio,
  };
}


// Cleanup temporary files older than 1 hour
export function cleanupTempFiles() {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;

  fs.readdir(tempDir, (err, files) => {
    if (err) return;

    files.forEach(file => {
      const filePath = path.join(tempDir, file);
      fs.stat(filePath, (err, stats) => {
        if (err) return;
        if (stats.mtimeMs < oneHourAgo) {
          fs.unlinkSync(filePath);
        }
      });
    });
  });
}


// Configure multer for images
export const uploadImage = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit (before compression)
  },
  fileFilter: imageFilter,
});


// Configure multer for any file type (if needed)
export const uploadFile = multer({
  storage: storage,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB limit
  },
});

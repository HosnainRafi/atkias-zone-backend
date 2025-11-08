// src/app/modules/upload/upload.controller.ts

import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { compressImage } from '../../../config/multer.config';
import fs from 'fs';
import path from 'path';


// Single image upload with compression
const uploadSingleImage = catchAsync(async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(httpStatus.BAD_REQUEST).json({
      success: false,
      message: 'No file uploaded',
    });
  }

  try {
    // Generate final filename
    const ext = path.extname(req.file.originalname);
    const name = path.basename(req.file.originalname, ext).replace(/\s+/g, '-');
    const compressedFilename = `${name}-compressed-${Date.now()}${ext}`;
    
    const finalPath = path.join(process.cwd(), 'public', 'uploads', compressedFilename);

    // Compress image
    const { size, compressionRatio } = await compressImage(
      req.file.path,
      finalPath,
      req.file.mimetype
    );

    const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${compressedFilename}`;

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Image uploaded and compressed successfully',
      data: {
        filename: compressedFilename,
        url: imageUrl,
        size,
        mimetype: req.file.mimetype,
        originalSize: req.file.size,
        compressionRatio,
      },
    });

    // Clean up temporary file
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
  } catch (error) {
    // Clean up temp file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Error during image compression',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});


// Multiple images upload with compression
const uploadMultipleImages = catchAsync(
  async (req: Request, res: Response) => {
    if (!req.files || (req.files as Express.Multer.File[]).length === 0) {
      return res.status(httpStatus.BAD_REQUEST).json({
        success: false,
        message: 'No files uploaded',
      });
    }

    try {
      const files = req.files as Express.Multer.File[];
      const imageUrls: any[] = [];

      for (const file of files) {
        const ext = path.extname(file.originalname);
        const name = path.basename(file.originalname, ext).replace(/\s+/g, '-');
        const compressedFilename = `${name}-compressed-${Date.now()}-${Math.random().toString(36).substr(2, 9)}${ext}`;
        
        const finalPath = path.join(process.cwd(), 'public', 'uploads', compressedFilename);

        // Compress each image
        const { size, compressionRatio } = await compressImage(
          file.path,
          finalPath,
          file.mimetype
        );

        imageUrls.push({
          filename: compressedFilename,
          url: `${req.protocol}://${req.get('host')}/uploads/${compressedFilename}`,
          size,
          mimetype: file.mimetype,
          originalSize: file.size,
          compressionRatio,
        });

        // Clean up temporary file
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      }

      sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: 'Images uploaded and compressed successfully',
        data: imageUrls,
      });
    } catch (error) {
      // Clean up temp files on error
      const files = req.files as Express.Multer.File[];
      files.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });

      return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Error during image compression',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);


// Delete uploaded image
const deleteImage = catchAsync(async (req: Request, res: Response) => {
  const { filename } = req.params;

  const filePath = path.join(process.cwd(), 'public', 'uploads', filename);

  // Validate filename to prevent directory traversal attacks
  if (!filePath.startsWith(path.join(process.cwd(), 'public', 'uploads'))) {
    return res.status(httpStatus.BAD_REQUEST).json({
      success: false,
      message: 'Invalid filename',
    });
  }

  // Check if file exists
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Image deleted successfully',
      data: null,
    });
  } else {
    return res.status(httpStatus.NOT_FOUND).json({
      success: false,
      message: 'Image not found',
    });
  }
});


export const UploadController = {
  uploadSingleImage,
  uploadMultipleImages,
  deleteImage,
};

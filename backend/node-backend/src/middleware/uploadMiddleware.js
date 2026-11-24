import multer from 'multer';

// 10 Megabytes max file size limit
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf'
]);

// Memory storage keeps file buffers in memory for direct OCR / PDF parsing
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
    cb(null, true);
  } else {
    const error = new Error(
      `Unsupported file type '${file.mimetype}'. Allowed types: JPEG, PNG, WebP, GIF, PDF.`
    );
    error.code = 'UNSUPPORTED_FILE_TYPE';
    error.statusCode = 422;
    cb(error, false);
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE
  },
  fileFilter
});

/**
 * Express middleware wrapper to catch Multer errors and format them
 * into Trutify's standardized JSON error response.
 */
export const uploadSingleFile = (fieldName = 'file') => {
  const multerMiddleware = upload.single(fieldName);

  return (req, res, next) => {
    multerMiddleware(req, res, (err) => {
      if (!err) {
        return next();
      }

      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({
            success: false,
            error: {
              message: `File size exceeds the 10MB limit.`,
              code: 'FILE_TOO_LARGE',
              details: { maxSizeBytes: MAX_FILE_SIZE }
            }
          });
        }

        return res.status(400).json({
          success: false,
          error: {
            message: `Upload error: ${err.message}`,
            code: 'UPLOAD_ERROR',
            details: { multerCode: err.code }
          }
        });
      }

      if (err.code === 'UNSUPPORTED_FILE_TYPE') {
        return res.status(422).json({
          success: false,
          error: {
            message: err.message,
            code: 'UNSUPPORTED_FILE_TYPE',
            details: { allowedTypes: Array.from(ALLOWED_MIME_TYPES) }
          }
        });
      }

      next(err);
    });
  };
};

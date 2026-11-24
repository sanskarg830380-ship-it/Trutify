import { z } from 'zod';

const fileVerifyQuerySchema = z.object({
  auto_verify: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((val) => {
      if (typeof val === 'string') {
        return val.toLowerCase() === 'true';
      }
      return val !== false;
    }),
  context: z
    .string()
    .max(5000, 'Context cannot exceed 5000 characters.')
    .optional()
    .nullable()
});

/**
 * Middleware validating that a file was uploaded in the request.
 */
export const validateFileUpload = (req, res, next) => {
  if (!req.file) {
    return res.status(422).json({
      success: false,
      error: {
        message: 'No file uploaded. Please provide an image (JPEG, PNG, WebP) or PDF file.',
        code: 'MISSING_FILE_PAYLOAD',
        details: { expectedField: 'file' }
      }
    });
  }

  // Parse and validate query or body parameters
  const queryData = {
    auto_verify: req.body?.auto_verify ?? req.query?.auto_verify,
    context: req.body?.context ?? req.query?.context ?? null
  };

  const parsed = fileVerifyQuerySchema.safeParse(queryData);
  if (!parsed.success) {
    return res.status(422).json({
      success: false,
      error: {
        message: 'Invalid request parameters.',
        code: 'VALIDATION_ERROR',
        details: parsed.error.format()
      }
    });
  }

  req.validatedFileOptions = parsed.data;
  next();
};

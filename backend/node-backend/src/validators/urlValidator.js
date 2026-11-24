import { z } from 'zod';

export const urlVerifySchema = z.object({
  url: z
    .string({ required_error: 'URL is required.' })
    .trim()
    .url({ message: 'Must be a valid, fully qualified HTTP or HTTPS URL.' })
    .refine(
      (val) => {
        try {
          const parsed = new URL(val);
          return ['http:', 'https:'].includes(parsed.protocol);
        } catch {
          return false;
        }
      },
      { message: 'URL protocol must be http: or https:.' }
    ),
  auto_verify: z.boolean().default(true).optional(),
  context: z.string().trim().max(5000).optional()
});

export const validateUrlVerifyRequest = (req, res, next) => {
  const result = urlVerifySchema.safeParse(req.body);
  if (!result.success) {
    return res.status(422).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data.',
        details: result.error.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message
        }))
      }
    });
  }
  req.validatedBody = result.data;
  next();
};

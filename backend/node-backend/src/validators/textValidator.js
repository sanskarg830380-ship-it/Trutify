import { z } from 'zod';

export const textVerifySchema = z.object({
  text: z
    .string({ required_error: 'Text input is required.' })
    .trim()
    .min(10, { message: 'Text input must be at least 10 characters long to extract a factual claim.' })
    .max(25000, { message: 'Text input must not exceed 25,000 characters.' }),
  auto_verify: z
    .boolean()
    .default(true)
    .optional(),
  context: z
    .string()
    .trim()
    .max(5000)
    .optional()
});

export const validateTextVerifyRequest = (req, res, next) => {
  const result = textVerifySchema.safeParse(req.body);
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

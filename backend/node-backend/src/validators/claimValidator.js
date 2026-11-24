import { z } from 'zod';

export const claimRequestSchema = z.object({
  claim: z
    .string({ required_error: 'Claim is required.' })
    .trim()
    .min(5, { message: 'Claim must be at least 5 characters long.' })
    .max(1500, { message: 'Claim must not exceed 1500 characters.' }),
  context: z
    .string()
    .trim()
    .max(5000, { message: 'Context must not exceed 5000 characters.' })
    .optional()
});

export const validateClaimRequest = (req, res, next) => {
  const result = claimRequestSchema.safeParse(req.body);
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

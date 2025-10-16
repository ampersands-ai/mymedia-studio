import { z } from "zod";

// Email validation (RFC 5322 compliant)
export const emailSchema = z
  .string()
  .trim()
  .email({ message: "Invalid email address" })
  .max(255, { message: "Email must be less than 255 characters" });

// Password validation (strong password requirements)
export const passwordSchema = z
  .string()
  .min(8, { message: "Password must be at least 8 characters" })
  .max(100, { message: "Password must be less than 100 characters" })
  .regex(/[A-Z]/, { message: "Must contain at least one uppercase letter" })
  .regex(/[a-z]/, { message: "Must contain at least one lowercase letter" })
  .regex(/[0-9]/, { message: "Must contain at least one number" })
  .regex(/[^A-Za-z0-9]/, { message: "Must contain at least one special character" });

// Phone number validation (international format)
export const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[1-9]\d{1,14}$/, { 
    message: "Invalid phone format. Use international format (e.g., +1234567890)" 
  })
  .optional()
  .or(z.literal(""));

// Zipcode validation (flexible for international)
export const zipcodeSchema = z
  .string()
  .trim()
  .min(3, { message: "Zipcode must be at least 3 characters" })
  .max(10, { message: "Zipcode must be less than 10 characters" })
  .regex(/^[A-Za-z0-9\s-]+$/, { 
    message: "Zipcode can only contain letters, numbers, spaces, and hyphens" 
  })
  .optional()
  .or(z.literal(""));

// Name validation
export const nameSchema = z
  .string()
  .trim()
  .min(1, { message: "Name cannot be empty" })
  .max(50, { message: "Name must be less than 50 characters" })
  .regex(/^[a-zA-Z\s'-]+$/, { 
    message: "Name can only contain letters, spaces, hyphens, and apostrophes" 
  });

// Combined schemas for forms
export const signupSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: nameSchema,
  lastName: nameSchema,
  phoneNumber: phoneSchema,
  zipcode: zipcodeSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, { message: "Password is required" }),
});

export const profileUpdateSchema = z.object({
  full_name: z.string().trim().min(1, { message: "Name is required" }).max(100),
  phoneNumber: phoneSchema,
  zipcode: zipcodeSchema,
});

// Edge function validation schemas
export const generationRequestSchema = z.object({
  template_id: z.string().max(100).optional(),
  model_id: z.string().max(100).optional(),
  model_record_id: z.string().uuid().optional(),
  prompt: z.string().min(1, { message: "Prompt is required" }).max(5000, { message: "Prompt must be less than 5000 characters" }),
  custom_parameters: z.record(z.any()).optional(),
  enhance_prompt: z.boolean().optional(),
}).refine(
  data => (data.template_id && !data.model_id && !data.model_record_id) ||
          (!data.template_id && (data.model_id || data.model_record_id)),
  { message: "Must provide either template_id or model_id/model_record_id, not both" }
);

export const tokenOperationSchema = z.object({
  user_id: z.string().uuid(),
  amount: z.number().int().min(-100000).max(100000),
  reason: z.string().max(500).optional(),
});

export const rateLimitSchema = z.object({
  identifier: z.string().min(1).max(255),
  action: z.enum(['login', 'signup', 'generation', 'api_call']),
  user_id: z.string().uuid().optional(),
});

export const roleManagementSchema = z.object({
  user_id: z.string().uuid(),
  role: z.enum(['admin', 'moderator', 'user']),
  action: z.enum(['grant', 'revoke']),
});

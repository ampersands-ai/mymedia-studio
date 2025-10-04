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

// Validation utilities for forms and user input
import { z } from 'zod';

// Email validation schema
export const emailSchema = z.string()
  .min(1, 'Email is required')
  .email('Invalid email format')
  .max(255, 'Email must be less than 255 characters');

// Password validation schema
export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters long')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

// Name validation schema
export const nameSchema = z.string()
  .min(1, 'Name is required')
  .max(100, 'Name must be less than 100 characters')
  .regex(/^[a-zA-Z\s\-\.\']+$/, 'Name can only contain letters, spaces, hyphens, periods, and apostrophes');

// Company name validation schema
export const companyNameSchema = z.string()
  .min(1, 'Company name is required')
  .max(200, 'Company name must be less than 200 characters')
  .regex(/^[a-zA-Z0-9\s\-\.\&\,\']+$/, 'Company name contains invalid characters');

// UUID validation schema
export const uuidSchema = z.string().uuid('Invalid ID format');

// Input sanitization function
export const sanitizeInput = (input: string): string => {
  return input.trim().replace(/[<>]/g, '');
};

// Validate and sanitize form data
export const validateFormData = <T extends Record<string, any>>(
  data: T,
  schema: z.ZodSchema<T>
): { success: boolean; data?: T; errors?: Record<string, string[]> } => {
  try {
    const validatedData = schema.parse(data);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string[]> = {};
      error.errors.forEach((err) => {
        const path = err.path.join('.');
        if (!errors[path]) {
          errors[path] = [];
        }
        errors[path].push(err.message);
      });
      return { success: false, errors };
    }
    return { success: false, errors: { form: ['Validation failed'] } as Record<string, string[]> };
  }
};

// Rate limiting helper (client-side)
export class RateLimiter {
  private attempts: Map<string, number[]> = new Map();
  
  constructor(private maxAttempts: number = 5, private windowMs: number = 15 * 60 * 1000) {}
  
  isRateLimited(identifier: string): boolean {
    const now = Date.now();
    const attempts = this.attempts.get(identifier) || [];
    
    // Remove attempts outside the window
    const validAttempts = attempts.filter(time => now - time < this.windowMs);
    
    this.attempts.set(identifier, validAttempts);
    
    return validAttempts.length >= this.maxAttempts;
  }
  
  recordAttempt(identifier: string): void {
    const now = Date.now();
    const attempts = this.attempts.get(identifier) || [];
    attempts.push(now);
    this.attempts.set(identifier, attempts);
  }
}
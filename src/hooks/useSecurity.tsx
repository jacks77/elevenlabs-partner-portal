import { useCallback } from 'react';
import { sanitizeInput, sanitizeFormData, EnhancedRateLimiter } from '@/lib/security';
import { toast } from '@/hooks/use-toast';

// Security hook for components
export const useSecurity = () => {
  const rateLimiter = new EnhancedRateLimiter();

  const sanitizeText = useCallback((text: string, options?: {
    maxLength?: number;
    allowHTML?: boolean;
  }) => {
    return sanitizeInput(text, options);
  }, []);

  const sanitizeForm = useCallback(<T extends Record<string, any>>(
    data: T,
    fieldConfigs?: Partial<Record<keyof T, {
      maxLength?: number;
      allowHTML?: boolean;
      required?: boolean;
    }>>
  ) => {
    try {
      return sanitizeFormData(data, fieldConfigs);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: error instanceof Error ? error.message : "Invalid input data"
      });
      throw error;
    }
  }, []);

  const checkRateLimit = useCallback((identifier: string, action: string = 'action') => {
    if (rateLimiter.isRateLimited(identifier)) {
      toast({
        variant: "destructive",
        title: "Rate Limited",
        description: `Too many ${action} attempts. Please wait before trying again.`
      });
      return false;
    }
    
    rateLimiter.recordAttempt(identifier);
    return true;
  }, [rateLimiter]);

  const validateFileUpload = useCallback((file: File, options: {
    maxSize?: number;
    allowedTypes?: string[];
    maxNameLength?: number;
  } = {}) => {
    const {
      maxSize = 10 * 1024 * 1024, // 10MB default
      allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
      maxNameLength = 255
    } = options;

    // Check file size
    if (file.size > maxSize) {
      toast({
        variant: "destructive",
        title: "File Too Large",
        description: `File size must be less than ${Math.round(maxSize / 1024 / 1024)}MB`
      });
      return false;
    }

    // Check file type
    if (!allowedTypes.includes(file.type)) {
      toast({
        variant: "destructive",
        title: "Invalid File Type",
        description: `Only ${allowedTypes.join(', ')} files are allowed`
      });
      return false;
    }

    // Check filename length and sanitize
    if (file.name.length > maxNameLength) {
      toast({
        variant: "destructive",
        title: "Filename Too Long",
        description: `Filename must be less than ${maxNameLength} characters`
      });
      return false;
    }

    // Check for potentially dangerous filenames
    const sanitizedName = sanitizeInput(file.name, { maxLength: maxNameLength });
    if (sanitizedName !== file.name) {
      toast({
        variant: "destructive",
        title: "Invalid Filename",
        description: "Filename contains invalid characters"
      });
      return false;
    }

    return true;
  }, []);

  return {
    sanitizeText,
    sanitizeForm,
    checkRateLimit,
    validateFileUpload
  };
};
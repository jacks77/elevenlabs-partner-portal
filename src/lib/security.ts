// Security utilities and helpers
import { toast } from '@/hooks/use-toast';

// CSRF token management
export class CSRFToken {
  private static readonly TOKEN_KEY = 'csrf_token';
  private static readonly HEADER_NAME = 'X-CSRF-Token';
  
  static generate(): string {
    const token = crypto.randomUUID();
    sessionStorage.setItem(this.TOKEN_KEY, token);
    return token;
  }
  
  static get(): string | null {
    return sessionStorage.getItem(this.TOKEN_KEY);
  }
  
  static getHeaders(): Record<string, string> {
    const token = this.get();
    return token ? { [this.HEADER_NAME]: token } : {};
  }
  
  static clear(): void {
    sessionStorage.removeItem(this.TOKEN_KEY);
  }
  
  static validate(receivedToken: string): boolean {
    const storedToken = this.get();
    return storedToken !== null && storedToken === receivedToken;
  }
}

// Secure request wrapper
export const secureRequest = async (
  url: string, 
  options: RequestInit = {}
): Promise<Response> => {
  const csrfHeaders = CSRFToken.getHeaders();
  
  const secureHeaders = {
    'Content-Type': 'application/json',
    ...csrfHeaders,
    ...options.headers,
  };
  
  const response = await fetch(url, {
    ...options,
    headers: secureHeaders,
  });
  
  // Check for security-related errors
  if (response.status === 403) {
    toast({
      variant: "destructive",
      title: "Access Denied",
      description: "You don't have permission to perform this action."
    });
  } else if (response.status === 429) {
    toast({
      variant: "destructive",
      title: "Rate Limited",
      description: "Too many requests. Please wait before trying again."
    });
  }
  
  return response;
};

// Content Security Policy helper
export const setSecurityHeaders = (): void => {
  // These would typically be set by the server, but we can add meta tags
  const meta = document.createElement('meta');
  meta.httpEquiv = 'Content-Security-Policy';
  meta.content = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Needed for Vite in development
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://bhiqswfvxswyrbmhixoa.supabase.co",
    "frame-ancestors 'none'",
    "form-action 'self'"
  ].join('; ');
  
  if (!document.querySelector('meta[http-equiv="Content-Security-Policy"]')) {
    document.head.appendChild(meta);
  }
};

// Enhanced XSS Protection with comprehensive sanitization
export const sanitizeHTML = (html: string): string => {
  const div = document.createElement('div');
  div.textContent = html;
  return div.innerHTML;
};

// Comprehensive input sanitization
export const sanitizeInput = (input: string, options: {
  allowHTML?: boolean;
  maxLength?: number;
  stripScripts?: boolean;
} = {}): string => {
  if (!input || typeof input !== 'string') return '';
  
  let sanitized = input.trim();
  
  // Apply length limit
  if (options.maxLength && sanitized.length > options.maxLength) {
    sanitized = sanitized.substring(0, options.maxLength);
  }
  
  // Strip script tags and potential XSS vectors
  if (options.stripScripts !== false) {
    sanitized = sanitized
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
      .replace(/on\w+\s*=\s*[^>\s]+/gi, '');
  }
  
  // Remove potentially dangerous HTML if not explicitly allowed
  if (!options.allowHTML) {
    return sanitizeHTML(sanitized);
  }
  
  return sanitized;
};

// Enhanced form data sanitization
export const sanitizeFormData = <T extends Record<string, any>>(
  data: T,
  fieldConfigs: Partial<Record<keyof T, {
    maxLength?: number;
    allowHTML?: boolean;
    required?: boolean;
  }>> = {}
): T => {
  const sanitized = { ...data } as T;
  
  Object.keys(sanitized).forEach(key => {
    const value = sanitized[key];
    const config = fieldConfigs[key as keyof T] || {};
    
    if (typeof value === 'string') {
      (sanitized as any)[key] = sanitizeInput(value, {
        maxLength: config.maxLength,
        allowHTML: config.allowHTML,
      });
      
      // Check required fields
      if (config.required && !(sanitized as any)[key]) {
        throw new Error(`Field ${key} is required`);
      }
    }
  });
  
  return sanitized;
};

// Safe navigation helper
export const safeNavigate = (url: string): boolean => {
  try {
    const urlObj = new URL(url, window.location.origin);
    
    // Only allow same-origin navigation or known safe domains
    const allowedDomains = [
      window.location.hostname,
      'bhiqswfvxswyrbmhixoa.supabase.co'
    ];
    
    if (allowedDomains.includes(urlObj.hostname)) {
      window.location.href = urlObj.href;
      return true;
    }
    
    return false;
  } catch {
    return false;
  }
};

// Enhanced session timeout management integrated with Supabase
export class SessionManager {
  private static readonly TIMEOUT_KEY = 'session_timeout';
  private static readonly WARNING_TIME = 5 * 60 * 1000; // 5 minutes before expiry
  private static readonly TIMEOUT_DURATION = 30 * 60 * 1000; // 30 minutes
  private static readonly MAX_CONCURRENT_SESSIONS = 3;
  private static sessionTimeoutInterval: NodeJS.Timeout | null = null;
  private static warningShown = false;
  
  static updateActivity(): void {
    const expiryTime = Date.now() + this.TIMEOUT_DURATION;
    sessionStorage.setItem(this.TIMEOUT_KEY, expiryTime.toString());
    this.warningShown = false;
  }
  
  static checkSession(): boolean {
    const expiryTime = sessionStorage.getItem(this.TIMEOUT_KEY);
    if (!expiryTime) return false;
    
    return Date.now() < parseInt(expiryTime);
  }
  
  static getRemainingTime(): number {
    const expiryTime = sessionStorage.getItem(this.TIMEOUT_KEY);
    if (!expiryTime) return 0;
    
    return Math.max(0, parseInt(expiryTime) - Date.now());
  }
  
  static shouldShowWarning(): boolean {
    const remaining = this.getRemainingTime();
    return remaining > 0 && remaining <= this.WARNING_TIME && !this.warningShown;
  }
  
  static markWarningShown(): void {
    this.warningShown = true;
  }
  
  static clear(): void {
    sessionStorage.removeItem(this.TIMEOUT_KEY);
    this.warningShown = false;
    if (this.sessionTimeoutInterval) {
      clearInterval(this.sessionTimeoutInterval);
      this.sessionTimeoutInterval = null;
    }
  }
  
  // Initialize session monitoring integrated with Supabase auth
  static initialize(onSessionExpired: () => void, onSessionWarning: () => void): void {
    if (this.sessionTimeoutInterval) {
      clearInterval(this.sessionTimeoutInterval);
    }
    
    this.sessionTimeoutInterval = setInterval(() => {
      if (!this.checkSession()) {
        this.clear();
        onSessionExpired();
      } else if (this.shouldShowWarning()) {
        this.markWarningShown();
        onSessionWarning();
      }
    }, 60000); // Check every minute
  }
  
  // Log security events for session management
  static logSecurityEvent(event: string, details?: any): void {
    console.log(`[Security] ${event}:`, details);
    // Could integrate with audit logging here
  }
}

// Initialize security measures with enhanced integration
export const initializeSecurity = (options: {
  onSessionExpired?: () => void;
  onSessionWarning?: () => void;
} = {}): void => {
  // Generate initial CSRF token
  CSRFToken.generate();
  
  // Set security headers
  setSecurityHeaders();
  
  // Initialize session management
  SessionManager.updateActivity();
  
  // Add activity listeners
  ['click', 'keypress', 'scroll', 'mousemove'].forEach(event => {
    document.addEventListener(event, () => {
      SessionManager.updateActivity();
    }, { passive: true });
  });
  
  // Initialize enhanced session monitoring
  SessionManager.initialize(
    options.onSessionExpired || (() => {
      CSRFToken.clear();
      toast({
        variant: "destructive",
        title: "Session Expired",
        description: "Your session has expired. Please log in again."
      });
      // Session expiry will be handled by the auth provider
    }),
    options.onSessionWarning || (() => {
      toast({
        title: "Session Warning",
        description: "Your session will expire soon. Please save your work.",
        duration: 10000,
      });
    })
  );
};

// Enhanced rate limiting with memory cleanup
export class EnhancedRateLimiter {
  private static attempts = new Map<string, { count: number; firstAttempt: number }>();
  private static readonly CLEANUP_INTERVAL = 60000; // 1 minute
  private static cleanupTimer: NodeJS.Timeout | null = null;
  
  constructor(
    private maxAttempts: number = 5,
    private windowMs: number = 15 * 60 * 1000 // 15 minutes
  ) {
    this.startCleanup();
  }
  
  private startCleanup(): void {
    if (EnhancedRateLimiter.cleanupTimer) return;
    
    EnhancedRateLimiter.cleanupTimer = setInterval(() => {
      const now = Date.now();
      for (const [key, data] of EnhancedRateLimiter.attempts.entries()) {
        if (now - data.firstAttempt > this.windowMs) {
          EnhancedRateLimiter.attempts.delete(key);
        }
      }
    }, EnhancedRateLimiter.CLEANUP_INTERVAL);
  }
  
  isRateLimited(identifier: string): boolean {
    const now = Date.now();
    const attempts = EnhancedRateLimiter.attempts.get(identifier);
    
    if (!attempts) return false;
    
    // Reset if window has passed
    if (now - attempts.firstAttempt > this.windowMs) {
      EnhancedRateLimiter.attempts.delete(identifier);
      return false;
    }
    
    return attempts.count >= this.maxAttempts;
  }
  
  recordAttempt(identifier: string): void {
    const now = Date.now();
    const existing = EnhancedRateLimiter.attempts.get(identifier);
    
    if (!existing || now - existing.firstAttempt > this.windowMs) {
      EnhancedRateLimiter.attempts.set(identifier, {
        count: 1,
        firstAttempt: now
      });
    } else {
      existing.count++;
    }
  }
  
  static cleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.attempts.clear();
  }
}
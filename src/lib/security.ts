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

// XSS Protection
export const sanitizeHTML = (html: string): string => {
  const div = document.createElement('div');
  div.textContent = html;
  return div.innerHTML;
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

// Session timeout management
export class SessionManager {
  private static readonly TIMEOUT_KEY = 'session_timeout';
  private static readonly WARNING_TIME = 5 * 60 * 1000; // 5 minutes before expiry
  private static readonly TIMEOUT_DURATION = 30 * 60 * 1000; // 30 minutes
  
  static updateActivity(): void {
    const expiryTime = Date.now() + this.TIMEOUT_DURATION;
    sessionStorage.setItem(this.TIMEOUT_KEY, expiryTime.toString());
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
    return remaining > 0 && remaining <= this.WARNING_TIME;
  }
  
  static clear(): void {
    sessionStorage.removeItem(this.TIMEOUT_KEY);
  }
}

// Initialize security measures
export const initializeSecurity = (): void => {
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
  
  // Check session periodically
  setInterval(() => {
    if (!SessionManager.checkSession()) {
      SessionManager.clear();
      CSRFToken.clear();
      toast({
        variant: "destructive",
        title: "Session Expired",
        description: "Your session has expired. Please log in again."
      });
      // Force logout would go here
    } else if (SessionManager.shouldShowWarning()) {
      toast({
        title: "Session Warning",
        description: "Your session will expire soon. Please save your work."
      });
    }
  }, 60000); // Check every minute
};
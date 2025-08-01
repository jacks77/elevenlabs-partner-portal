import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { initializeSecurity } from './lib/security'

// Initialize security measures with enhanced session handling
initializeSecurity({
  onSessionExpired: () => {
    // Session expiry will be handled by Supabase auth state changes
    console.log('[Security] Session expired - will be handled by auth provider');
  },
  onSessionWarning: () => {
    console.log('[Security] Session warning - user should save work');
  }
});

createRoot(document.getElementById("root")!).render(<App />);

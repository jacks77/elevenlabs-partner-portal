import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { PasswordChangeDialog } from '@/components/PasswordChangeDialog';
import { SessionManager, CSRFToken } from '@/lib/security';
import { toast } from '@/hooks/use-toast';

interface UserProfile {
  user_id: string;
  is_super_admin: boolean;
  first_name?: string;
  last_name?: string;
  title?: string;
  created_at?: string;
  has_changed_default_password?: boolean;
}

interface CompanyMembership {
  user_id: string;
  company_id: string;
  is_admin: boolean;
  is_approved: boolean;
  company?: {
    id: string;
    name: string;
    is_in_onboarding?: boolean;
    track?: string;
  };
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  memberships: CompanyMembership[];
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<{ error: any }>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [memberships, setMemberships] = useState<CompanyMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPasswordChange, setShowPasswordChange] = useState(false);

  const fetchUserData = async (currentUser: User | null) => {
    if (!currentUser) {
      setProfile(null);
      setMemberships([]);
      return;
    }

    try {
      // Fetch user profile
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', currentUser.id)
        .maybeSingle();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error fetching profile:', profileError);
      }

      // Fetch company memberships first to check for ElevenLabs membership
      const { data: membershipData, error: membershipError } = await supabase
        .from('company_members')
        .select(`
          *,
          company:companies(id, name, is_in_onboarding, track)
        `)
        .eq('user_id', currentUser.id);

      if (membershipError) {
        console.error('Error fetching memberships:', membershipError);
        setMemberships([]);
      } else {
        setMemberships(membershipData || []);
      }

      // Set profile data - ONLY use database value for is_super_admin
      // Security: Never automatically grant super admin based on company membership
      if (profileData) {
        setProfile(profileData);
        
        // Check if this is a first-time login (created recently AND hasn't changed default password)
        if (profileData.created_at && !profileData.has_changed_default_password) {
          const createdAt = new Date(profileData.created_at);
          const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
          
          console.log('Checking password change requirement:', {
            profileCreatedAt: createdAt,
            oneDayAgo,
            hasChangedPassword: profileData.has_changed_default_password,
            shouldShowPrompt: createdAt > oneDayAgo && !profileData.has_changed_default_password
          });
          
          if (createdAt > oneDayAgo) {
            // If created within last 24 hours AND hasn't changed password, show dialog
            console.log('Showing password change dialog for new user');
            setShowPasswordChange(true);
          }
        }
      } else {
        // No profile exists - set to null
        // Security: Never auto-create profiles with admin privileges
        setProfile(null);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  const refresh = async () => {
    if (user) {
      await fetchUserData(user);
    }
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        
        // Handle session security integration
        if (currentSession?.user) {
          // Update activity when user session is active
          SessionManager.updateActivity();
          
          // Defer user data fetching to avoid blocking auth state changes
          setTimeout(() => {
            fetchUserData(currentSession.user);
          }, 0);
        } else {
          // Clear security session data on logout
          SessionManager.clear();
          CSRFToken.clear();
          setProfile(null);
          setMemberships([]);
        }
        
        // Log security events for authentication
        if (event === 'SIGNED_IN') {
          SessionManager.logSecurityEvent('user_signed_in', { user_id: currentSession?.user?.id });
        } else if (event === 'SIGNED_OUT') {
          SessionManager.logSecurityEvent('user_signed_out');
        } else if (event === 'PASSWORD_RECOVERY') {
          SessionManager.logSecurityEvent('password_recovery_initiated');
        }
        
        setLoading(false);
      }
    );

    // Get initial session
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      
      if (currentSession?.user) {
        SessionManager.updateActivity();
        fetchUserData(currentSession.user);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl
      }
    });
    return { error };
  };

  const signInWithGoogle = async () => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl
      }
    });
    return { error };
  };

  const signOut = async () => {
    // Clear security session data before Supabase logout
    SessionManager.clear();
    CSRFToken.clear();
    SessionManager.logSecurityEvent('user_logout_initiated');
    
    await supabase.auth.signOut();
  };

  const value = {
    user,
    session,
    profile,
    memberships,
    loading,
    signIn,
    signUp,
    signOut,
    signInWithGoogle,
    refresh,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      <PasswordChangeDialog
        open={showPasswordChange}
        onOpenChange={setShowPasswordChange}
        onSuccess={async () => {
          // Close the dialog first to prevent any re-rendering issues
          setShowPasswordChange(false);
          
          // Update local profile state immediately to prevent dialog from reappearing
          setProfile(prev => prev ? { ...prev, has_changed_default_password: true } : null);
          
          // Update the user profile to mark password as changed
          if (user) {
            await supabase
              .from('user_profiles')
              .update({ has_changed_default_password: true })
              .eq('user_id', user.id);
          }
        }}
      />
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
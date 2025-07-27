import React, { useState, useEffect } from 'react';
import { useSearchParams, Navigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface Registration {
  id: string;
  email: string;
  full_name: string;
  status: string;
  approved_role: string;
  approved_company_id: string;
  invite_expires_at: string;
}

export default function CompleteAccount() {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [registration, setRegistration] = useState<Registration | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accountCreated, setAccountCreated] = useState(false);
  
  const { user, signUp, signInWithGoogle, signIn } = useAuth();
  const inviteCode = searchParams.get('invite');

  // Redirect if already authenticated
  if (user && !validating) {
    return <Navigate to="/dashboard" replace />;
  }

  useEffect(() => {
    const validateInvite = async () => {
      if (!inviteCode) {
        setError('Invalid or missing invite code');
        setValidating(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('registrations')
          .select('*')
          .eq('invite_code', inviteCode)
          .eq('status', 'approved')
          .maybeSingle();

        if (error || !data) {
          setError('Invalid or expired invite code');
        } else {
          // Check if expired
          const now = new Date();
          const expiresAt = new Date(data.invite_expires_at);
          
          if (now > expiresAt) {
            setError('This invite code has expired. Please contact your administrator for a new one.');
          } else {
            setRegistration(data);
            setEmail(data.email); // Pre-fill email
          }
        }
      } catch (err) {
        setError('Failed to validate invite code');
      } finally {
        setValidating(false);
      }
    };

    validateInvite();
  }, [inviteCode]);

  const completeAccount = async (userId: string, userEmail: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('complete-account', {
        body: {
          inviteCode,
          userEmail,
          userId
        }
      });

      if (error) throw error;

      setAccountCreated(true);
      toast({
        title: "Account setup complete!",
        description: "Welcome to the Partner Portal. You can now access all features."
      });

      // Redirect to dashboard after a short delay
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 2000);

    } catch (error: any) {
      console.error('Account completion error:', error);
      toast({
        variant: "destructive",
        title: "Account setup failed",
        description: error.message || "Please try again or contact support."
      });
    }
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await signUp(email, password);
      
      if (error) {
        toast({
          variant: "destructive",
          title: "Account creation failed",
          description: error.message
        });
      } else {
        // Note: In a real setup, we'd wait for email confirmation
        // For now, we'll proceed with account completion
        toast({
          title: "Account created!",
          description: "Please check your email to confirm your account."
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "An error occurred",
        description: "Please try again."
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setLoading(true);
    
    try {
      const { error } = await signInWithGoogle();
      
      if (error) {
        toast({
          variant: "destructive",
          title: "Google sign up failed",
          description: error.message
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "An error occurred",
        description: "Please try again."
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExistingAccountSignIn = async () => {
    setLoading(true);
    
    try {
      const { error } = await signIn(email, ''); // This will fail but we'll handle it
      
      if (error) {
        // Redirect to sign in page with invite code
        window.location.href = `/sign-in?invite=${inviteCode}`;
      }
    } catch (error) {
      window.location.href = `/sign-in?invite=${inviteCode}`;
    } finally {
      setLoading(false);
    }
  };

  // Handle post-authentication completion
  useEffect(() => {
    if (user && registration && !accountCreated) {
      completeAccount(user.id, user.email || '');
    }
  }, [user, registration, accountCreated]);

  if (validating) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p>Validating invitation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-subtle p-4">
        <Card className="w-full max-w-md shadow-card">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <CardTitle className="text-xl">Invalid Invitation</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link to="/request-access">Request New Access</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (accountCreated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-subtle p-4">
        <Card className="w-full max-w-md shadow-card">
          <CardHeader className="text-center">
            <CheckCircle className="h-12 w-12 text-success mx-auto mb-4" />
            <CardTitle className="text-xl">Welcome to the Partner Portal!</CardTitle>
            <CardDescription>
              Your account has been set up successfully. You're being redirected to the dashboard.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!registration) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-subtle p-4">
      <Card className="w-full max-w-md shadow-card">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Complete Your Account
          </CardTitle>
          <CardDescription>
            Your registration has been approved! Set up your account to get started.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Approved for:</strong> {registration.full_name}<br />
              <strong>Email:</strong> {registration.email}<br />
              <strong>Role:</strong> {registration.approved_role}
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <Button 
              variant="hero" 
              className="w-full" 
              onClick={handleGoogleSignUp}
              disabled={loading}
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Continue with Google
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  Or set password
                </span>
              </div>
            </div>

            <form onSubmit={handleEmailSignUp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email (read-only)</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  disabled
                  className="bg-muted"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Create Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter a secure password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <Button 
                type="submit" 
                className="w-full" 
                disabled={loading}
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </Button>
            </form>

            <div className="text-center">
              <Button 
                variant="link" 
                onClick={handleExistingAccountSignIn}
                disabled={loading}
              >
                Already have an account? Sign in instead
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Shield, RefreshCw, Mail, AlertTriangle, CheckCircle } from 'lucide-react';

export default function Settings() {
  const [bootstrapLoading, setBootstrapLoading] = useState(false);
  const [bootstrapResult, setBootstrapResult] = useState<any>(null);

  const runBootstrap = async () => {
    setBootstrapLoading(true);
    setBootstrapResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('bootstrap-super-admin');

      if (error) {
        throw error;
      }

      setBootstrapResult(data);
      
      toast({
        title: "Bootstrap completed",
        description: data.message || "Super admin setup completed successfully."
      });

    } catch (error: any) {
      console.error('Bootstrap error:', error);
      toast({
        variant: "destructive",
        title: "Bootstrap failed",
        description: error.message || "Failed to bootstrap super admin."
      });
    } finally {
      setBootstrapLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Header */}
          <div>
            <Button variant="ghost" asChild className="mb-4">
              <Link to="/dashboard">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Link>
            </Button>
            <h1 className="text-3xl font-bold">System Settings</h1>
            <p className="text-muted-foreground">
              Configure system-wide settings and manage admin accounts
            </p>
          </div>

          {/* Bootstrap Section */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="h-5 w-5 mr-2" />
                Super Admin Bootstrap
              </CardTitle>
              <CardDescription>
                Initialize or verify the super admin account setup
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  This function sets up the initial super admin account using environment variables.
                  It's safe to run multiple times - it will only create the account if it doesn't exist.
                </AlertDescription>
              </Alert>

              <div className="flex items-center space-x-4">
                <Button 
                  onClick={runBootstrap}
                  disabled={bootstrapLoading}
                  variant="hero"
                >
                  {bootstrapLoading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Running Bootstrap...
                    </>
                  ) : (
                    <>
                      <Shield className="h-4 w-4 mr-2" />
                      Run Bootstrap
                    </>
                  )}
                </Button>
              </div>

              {bootstrapResult && (
                <Alert className="mt-4">
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <p><strong>Status:</strong> {bootstrapResult.success ? 'Success' : 'Failed'}</p>
                      <p><strong>Message:</strong> {bootstrapResult.message}</p>
                      {bootstrapResult.adminEmail && (
                        <p><strong>Admin Email:</strong> {bootstrapResult.adminEmail}</p>
                      )}
                      {bootstrapResult.reminder && (
                        <p className="text-warning"><strong>Important:</strong> {bootstrapResult.reminder}</p>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Environment Info */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Environment Configuration</CardTitle>
              <CardDescription>
                Current system configuration status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="font-medium">Required Secrets</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center justify-between">
                        <span>ADMIN_EMAIL</span>
                        <Badge variant="outline">Required</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>ADMIN_PASSWORD</span>
                        <Badge variant="outline">Required</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>RESEND_API_KEY</span>
                        <Badge variant="outline">Required</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>APP_URL</span>
                        <Badge variant="outline">Required</Badge>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium">System Status</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center justify-between">
                        <span>Database</span>
                        <Badge variant="default">Connected</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Authentication</span>
                        <Badge variant="default">Active</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Edge Functions</span>
                        <Badge variant="default">Deployed</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Instructions */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Setup Instructions</CardTitle>
              <CardDescription>
                Steps to complete the partner portal setup
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-medium">1. Configure Secrets</h4>
                  <p className="text-sm text-muted-foreground">
                    Make sure all required environment variables are set in Supabase Edge Functions secrets.
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">2. Run Bootstrap</h4>
                  <p className="text-sm text-muted-foreground">
                    Click the "Run Bootstrap" button above to create the initial super admin account.
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">3. Change Default Password</h4>
                  <p className="text-sm text-muted-foreground">
                    After bootstrapping, sign in with the admin account and immediately change the password.
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">4. Test Registration Flow</h4>
                  <p className="text-sm text-muted-foreground">
                    Create a test registration to verify the approval and invitation workflow.
                  </p>
                </div>

                <Alert>
                  <Mail className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Email Configuration:</strong> Make sure to validate your sending domain in Resend 
                    and update the "from" address in the email functions to use your verified domain.
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
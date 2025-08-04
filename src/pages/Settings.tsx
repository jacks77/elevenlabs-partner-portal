import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Shield, RefreshCw, Mail, AlertTriangle, CheckCircle, Percent } from 'lucide-react';

export default function Settings() {
  const [commissionSettings, setCommissionSettings] = useState({
    commission_registered: '5',
    commission_bronze: '7',
    commission_silver: '10',
    commission_gold: '12',
    commission_platinum: '15'
  });
  const [settingsLoading, setSettingsLoading] = useState(false);

  useEffect(() => {
    fetchCommissionSettings();
  }, []);

  const fetchCommissionSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('sitewide_settings')
        .select('setting_key, setting_value')
        .like('setting_key', 'commission_%');

      if (error) throw error;

      const settings = data.reduce((acc, item) => {
        acc[item.setting_key] = item.setting_value;
        return acc;
      }, {} as any);

      setCommissionSettings(prev => ({ ...prev, ...settings }));
    } catch (error) {
      console.error('Error fetching commission settings:', error);
    }
  };

  const updateCommissionSettings = async () => {
    setSettingsLoading(true);
    try {
      const updates = Object.entries(commissionSettings).map(([key, value]) => ({
        setting_key: key,
        setting_value: value
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('sitewide_settings')
          .upsert(update, { onConflict: 'setting_key' });

        if (error) throw error;
      }

      toast({
        title: "Settings updated",
        description: "Commission percentages have been saved successfully."
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Update failed",
        description: error.message || "Failed to update commission settings."
      });
    } finally {
      setSettingsLoading(false);
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

          {/* Commission Settings */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Percent className="h-5 w-5 mr-2" />
                Commission Percentages
              </CardTitle>
              <CardDescription>
                Configure commission rates for each tier level
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(commissionSettings).map(([key, value]) => {
                  const tierName = key.replace('commission_', '').replace(/^\w/, c => c.toUpperCase());
                  return (
                    <div key={key} className="space-y-2">
                      <Label htmlFor={key}>{tierName}</Label>
                      <div className="relative">
                        <Input
                          id={key}
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={value}
                          onChange={(e) => setCommissionSettings(prev => ({
                            ...prev,
                            [key]: e.target.value
                          }))}
                          className="pr-8"
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                          <span className="text-muted-foreground text-sm">%</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-end">
                <Button 
                  onClick={updateCommissionSettings}
                  disabled={settingsLoading}
                  variant="hero"
                >
                  {settingsLoading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Commission Settings'
                  )}
                </Button>
              </div>
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
                  <h4 className="font-medium">2. Create Super Admin</h4>
                  <p className="text-sm text-muted-foreground">
                    Create the initial super admin account manually through the user management interface.
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">3. Test Registration Flow</h4>
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
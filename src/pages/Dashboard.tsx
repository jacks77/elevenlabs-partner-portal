import React, { useState, useEffect } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAnalytics } from '@/hooks/useAnalytics';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileText, Link as LinkIcon, Users, BarChart3, Settings, LogOut, Send, X } from 'lucide-react';
import OnboardingJourney from '@/components/OnboardingJourney';

export default function Dashboard() {
  const { user, profile, memberships, loading, signOut } = useAuth();
  useAnalytics(); // Track page view

  const [activeNotification, setActiveNotification] = useState<any>(null);
  const [newsStories, setNewsStories] = useState<any[]>([]);
  const [showNotification, setShowNotification] = useState(true);

  const approvedMemberships = memberships.filter(m => m.is_approved);
  const onboardingCompanies = approvedMemberships.filter(m => m.company?.is_in_onboarding);

  useEffect(() => {
    fetchActiveNotification();
    fetchNewsStories();
  }, []);

  const fetchActiveNotification = async () => {
    try {
      const { data } = await supabase
        .from('notification_banners')
        .select('*')
        .eq('is_active', true)
        .single();
      
      setActiveNotification(data);
    } catch (error) {
      // No active notification, which is fine
      console.log('No active notification');
    }
  };

  const fetchNewsStories = async () => {
    try {
      const { data } = await supabase
        .from('news_stories')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(3);
      
      setNewsStories(data || []);
    } catch (error) {
      console.error('Error fetching news stories:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  // Redirect if not authenticated or no approved memberships
  if (!user || !memberships.some(m => m.is_approved)) {
    return <Navigate to="/sign-in" replace />;
  }

  const isAdmin = approvedMemberships.some(m => m.is_admin) || profile?.is_super_admin;
  const isSuperAdmin = profile?.is_super_admin;

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <header className="bg-card border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                Partner Portal
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium">{user.email}</p>
                <div className="flex space-x-1">
                  {isSuperAdmin && (
                    <Badge variant="destructive" className="text-xs">Super Admin</Badge>
                  )}
                  {isAdmin && !isSuperAdmin && (
                    <Badge variant="secondary" className="text-xs">Admin</Badge>
                  )}
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Global Notification Banner */}
      {activeNotification && showNotification && (
        <Alert className="rounded-none border-x-0 border-t-0 bg-primary/10 border-primary/20">
          <AlertDescription className="flex items-center justify-between">
            <span>{activeNotification.message}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowNotification(false)}
              className="h-auto p-1"
            >
              <X className="h-4 w-4" />
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Welcome Section */}
          <div className="text-center space-y-4">
            <h2 className="text-3xl font-bold">Welcome back, {user.email?.split('@')[0] || 'Partner'}!</h2>
            <p className="text-muted-foreground">
              Access documentation, links, and resources for your ElevenLabs Partner Journey!
            </p>
          </div>

          {/* Onboarding Journey - Show for companies in onboarding */}
          {onboardingCompanies.map((membership) => (
            <OnboardingJourney key={membership.company_id} companyId={membership.company_id} />
          ))}

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Link to="/documents">
            <Card className="hover:shadow-elegant transition-shadow cursor-pointer">
              <CardHeader className="text-center">
                <FileText className="h-8 w-8 mx-auto text-primary" />
                <CardTitle className="text-lg">Documents</CardTitle>
                <CardDescription>Access shared documents and resources</CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link to="/links">
            <Card className="hover:shadow-elegant transition-shadow cursor-pointer">
              <CardHeader className="text-center">
                <LinkIcon className="h-8 w-8 mx-auto text-primary" />
                <CardTitle className="text-lg">Links</CardTitle>
                <CardDescription>Important links and references</CardDescription>
              </CardHeader>
            </Card>
          </Link>

          {/* All registered users can invite */}
          <Link to="/invite-user">
            <Card className="hover:shadow-elegant transition-shadow cursor-pointer">
              <CardHeader className="text-center">
                <Send className="h-8 w-8 mx-auto text-primary" />
                <CardTitle className="text-lg">Invite User</CardTitle>
                <CardDescription>Invite new users to your company</CardDescription>
              </CardHeader>
            </Card>
          </Link>

            {isAdmin && (
              <Link to="/admin">
                <Card className="hover:shadow-elegant transition-shadow cursor-pointer">
                  <CardHeader className="text-center">
                    <Users className="h-8 w-8 mx-auto text-primary" />
                    <CardTitle className="text-lg">Admin</CardTitle>
                    <CardDescription>Manage members and approvals</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            )}

            {isSuperAdmin && (
              <Link to="/analytics">
                <Card className="hover:shadow-elegant transition-shadow cursor-pointer">
                  <CardHeader className="text-center">
                    <BarChart3 className="h-8 w-8 mx-auto text-primary" />
                    <CardTitle className="text-lg">Analytics</CardTitle>
                    <CardDescription>View usage analytics</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            )}

            {isSuperAdmin && (
              <Link to="/settings">
                <Card className="hover:shadow-elegant transition-shadow cursor-pointer">
                  <CardHeader className="text-center">
                    <Settings className="h-8 w-8 mx-auto text-primary" />
                    <CardTitle className="text-lg">Settings</CardTitle>
                    <CardDescription>System configuration</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            )}
          </div>

          {/* Recent Updates */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Recent Updates</CardTitle>
              <CardDescription>Stay informed with the latest news and announcements</CardDescription>
            </CardHeader>
            <CardContent>
              {newsStories.length > 0 ? (
                <div className="space-y-4">
                  {newsStories.map((story) => (
                    <div key={story.id} className="flex gap-4 p-4 border border-border rounded-lg hover:bg-muted/30 transition-colors cursor-pointer">
                      {story.image_url && (
                        <img 
                          src={story.image_url} 
                          alt={story.headline}
                          className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm line-clamp-2">{story.headline}</h3>
                        {story.subheading && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{story.subheading}</p>
                        )}
                        <span className="text-xs text-muted-foreground mt-2 block">
                          {new Date(story.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No recent updates to display</p>
                  <p className="text-sm">Check back later for news and announcements</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
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
  const [dismissedNotifications, setDismissedNotifications] = useState<Set<string>>(
    () => new Set(JSON.parse(localStorage.getItem('dismissedNotifications') || '[]'))
  );

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

  const handleDismissNotification = (notificationId: string) => {
    const newDismissed = new Set(dismissedNotifications);
    newDismissed.add(notificationId);
    setDismissedNotifications(newDismissed);
    localStorage.setItem('dismissedNotifications', JSON.stringify([...newDismissed]));
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">

      {/* Global Notification Banner */}
      {activeNotification && !dismissedNotifications.has(activeNotification.id) && (
        <Alert className="rounded-none border-x-0 border-t-0 bg-primary/10 border-primary/20">
          <AlertDescription className="flex items-center justify-between">
            <span>{activeNotification.message}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDismissNotification(activeNotification.id)}
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
            <h2 className="text-3xl font-bold">Welcome back, {profile?.first_name || user.email?.split('@')[0] || 'Partner'}!</h2>
            <p className="text-muted-foreground">
              Access documentation, links, and resources for your ElevenLabs Partner Journey!
            </p>
          </div>

          {/* Onboarding Journey - Show for companies in onboarding */}
          {onboardingCompanies.map((membership) => (
            <OnboardingJourney key={membership.company_id} companyId={membership.company_id} />
          ))}

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Link to="/content">
              <Card className="hover:shadow-elegant transition-shadow cursor-pointer h-full">
                <CardHeader className="text-center h-full flex flex-col justify-center">
                  <FileText className="h-8 w-8 mx-auto text-primary" />
                  <CardTitle className="text-lg">Content</CardTitle>
                  <CardDescription>Manage content and resources</CardDescription>
                </CardHeader>
              </Card>
            </Link>

            <Link to="/lead-submission">
              <Card className="hover:shadow-elegant transition-shadow cursor-pointer h-full">
                <CardHeader className="text-center h-full flex flex-col justify-center">
                  <Send className="h-8 w-8 mx-auto text-primary" />
                  <CardTitle className="text-lg">Lead Submission</CardTitle>
                  <CardDescription>Submit and track leads</CardDescription>
                </CardHeader>
              </Card>
            </Link>

            {isSuperAdmin && (
              <Link to="/admin">
                <Card className="hover:shadow-elegant transition-shadow cursor-pointer h-full">
                  <CardHeader className="text-center h-full flex flex-col justify-center">
                    <Users className="h-8 w-8 mx-auto text-primary" />
                    <CardTitle className="text-lg">Admin</CardTitle>
                    <CardDescription>Manage system and users</CardDescription>
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
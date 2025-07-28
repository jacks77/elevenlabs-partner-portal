import React from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAnalytics } from '@/hooks/useAnalytics';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { FileText, Link as LinkIcon, Users, BarChart3, Settings, LogOut, Send } from 'lucide-react';

export default function Dashboard() {
  const { user, profile, memberships, loading, signOut } = useAuth();
  useAnalytics(); // Track page view

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

  const approvedMemberships = memberships.filter(m => m.is_approved);
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

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Welcome Section */}
          <div className="text-center space-y-4">
            <h2 className="text-3xl font-bold">Welcome back!</h2>
            <p className="text-muted-foreground">
              Access your company resources and collaborate with your team.
            </p>
          </div>

          {/* Company Memberships */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Your Companies
              </CardTitle>
              <CardDescription>
                Companies you're a member of
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {approvedMemberships.map((membership) => (
                  <div key={membership.company_id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                    <div>
                      <p className="font-medium">{membership.company?.name || 'Unknown Company'}</p>
                      <p className="text-sm text-muted-foreground">
                        {membership.is_admin ? 'Administrator' : 'Member'}
                      </p>
                    </div>
                    {membership.is_admin && (
                      <Badge variant="secondary">Admin</Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

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

          {/* Recent Activity Placeholder */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Stay updated with the latest changes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <p>No recent activity to display</p>
                <p className="text-sm">Activity will appear here as you use the portal</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { Users, Building, ArrowLeft, UserPlus, Clock, Edit, Check, X, ExternalLink, Route, Search, Bell, BellOff, Newspaper, Trash2, Plus, Settings } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Link } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserManagement } from '@/components/UserManagement';
import { EditCompanyForm } from '@/components/EditCompanyForm';
import { EditUserForm } from '@/components/EditUserForm';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Calendar, MousePointer, Eye, Shield, RefreshCw, Mail, AlertTriangle, CheckCircle } from "lucide-react";
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Company {
  id: string;
  name: string;
  partner_salesforce_record?: string;
  is_in_onboarding?: boolean;
  track?: string;
  lead_submission_url?: string;
  partner_manager_id?: string;
  slack_channel_url?: string;
}

interface NotificationBanner {
  id: string;
  message: string;
  is_active: boolean;
  created_at: string;
}

interface NewsStory {
  id: string;
  headline: string;
  subheading?: string;
  content?: string;
  image_url?: string;
  is_published: boolean;
  created_at: string;
}

export default function Admin() {
  const { profile, memberships } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // Company management
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newCompanySalesforceUrl, setNewCompanySalesforceUrl] = useState('');
  const [newCompanyTrack, setNewCompanyTrack] = useState('');
  const [newCompanyLeadUrl, setNewCompanyLeadUrl] = useState('');
  const [newCompanyInOnboarding, setNewCompanyInOnboarding] = useState(false);
  const [showNewCompanyDialog, setShowNewCompanyDialog] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null);

  // Notification management
  const [notifications, setNotifications] = useState<NotificationBanner[]>([]);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [showNotificationDialog, setShowNotificationDialog] = useState(false);

  // News stories management
  const [newsStories, setNewsStories] = useState<NewsStory[]>([]);
  const [newStory, setNewStory] = useState({
    headline: '',
    subheading: '',
    content: '',
    image_url: ''
  });
  const [showNewsDialog, setShowNewsDialog] = useState(false);
  const [editingStory, setEditingStory] = useState<string | null>(null);

  const isSuperAdmin = profile?.is_super_admin;

  // Analytics component inline
  const AnalyticsContent = () => {
    const [analyticsLoading, setAnalyticsLoading] = useState(true);
    const [totalPageViews, setTotalPageViews] = useState(0);
    const [totalLinkClicks, setTotalLinkClicks] = useState(0);
    const [uniqueUsers, setUniqueUsers] = useState(0);
    const [topPages, setTopPages] = useState<any[]>([]);
    const [dailyStats, setDailyStats] = useState<any[]>([]);

    const fetchAnalytics = async () => {
      try {
        // Fetch total page views
        const { count: pageViewCount } = await supabase
          .from('analytics_page_views')
          .select('*', { count: 'exact', head: true });

        // Fetch total link clicks
        const { count: linkClickCount } = await supabase
          .from('analytics_link_clicks')
          .select('*', { count: 'exact', head: true });

        // Fetch unique users from page views
        const { data: uniqueUserData } = await supabase
          .from('analytics_page_views')
          .select('user_id')
          .not('user_id', 'is', null);

        const uniqueUserIds = new Set(uniqueUserData?.map(item => item.user_id) || []);

        // Fetch top pages
        const { data: pageViewData } = await supabase
          .from('analytics_page_views')
          .select('page')
          .not('page', 'is', null);

        const pageCounts = pageViewData?.reduce((acc, item) => {
          acc[item.page] = (acc[item.page] || 0) + 1;
          return acc;
        }, {} as Record<string, number>) || {};

        const topPagesData = Object.entries(pageCounts)
          .map(([page, views]) => ({ page, views }))
          .sort((a, b) => b.views - a.views)
          .slice(0, 5);

        // Fetch daily stats for the last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const { data: pageViewsByDay } = await supabase
          .from('analytics_page_views')
          .select('created_at')
          .gte('created_at', sevenDaysAgo.toISOString());

        const { data: linkClicksByDay } = await supabase
          .from('analytics_link_clicks')
          .select('created_at')
          .gte('created_at', sevenDaysAgo.toISOString());

        // Process daily stats
        const dailyData: Record<string, { page_views: number; link_clicks: number }> = {};
        
        for (let i = 6; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split('T')[0];
          dailyData[dateStr] = { page_views: 0, link_clicks: 0 };
        }

        pageViewsByDay?.forEach(item => {
          const date = item.created_at.split('T')[0];
          if (dailyData[date]) {
            dailyData[date].page_views++;
          }
        });

        linkClicksByDay?.forEach(item => {
          const date = item.created_at.split('T')[0];
          if (dailyData[date]) {
            dailyData[date].link_clicks++;
          }
        });

        const dailyStatsData = Object.entries(dailyData).map(([date, stats]) => ({
          date: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
          ...stats
        }));

        setTotalPageViews(pageViewCount || 0);
        setTotalLinkClicks(linkClickCount || 0);
        setUniqueUsers(uniqueUserIds.size);
        setTopPages(topPagesData);
        setDailyStats(dailyStatsData);

      } catch (error) {
        console.error('Error fetching analytics:', error);
        toast({
          title: "Error",
          description: "Failed to load analytics data",
          variant: "destructive",
        });
      } finally {
        setAnalyticsLoading(false);
      }
    };

    useEffect(() => {
      fetchAnalytics();
    }, []);

    if (analyticsLoading) {
      return (
        <div className="text-center">Loading analytics...</div>
      );
    }

    const chartConfig = {
      page_views: {
        label: "Page Views",
        color: "hsl(var(--primary))",
      },
      link_clicks: {
        label: "Link Clicks", 
        color: "hsl(var(--secondary))",
      },
    };

    return (
      <div className="space-y-6">
        {/* Stats Overview */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Page Views</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalPageViews}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Link Clicks</CardTitle>
              <MousePointer className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalLinkClicks}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unique Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{uniqueUsers}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg. Views/User</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {uniqueUsers > 0 ? Math.round(totalPageViews / uniqueUsers) : 0}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Daily Activity Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Daily Activity (Last 7 Days)</CardTitle>
              <CardDescription>Page views and link clicks over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailyStats}>
                    <XAxis dataKey="date" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line 
                      type="monotone" 
                      dataKey="page_views" 
                      stroke="var(--color-page_views)" 
                      strokeWidth={2}
                      name="Page Views"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="link_clicks" 
                      stroke="var(--color-link_clicks)" 
                      strokeWidth={2}
                      name="Link Clicks"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Top Pages */}
          <Card>
            <CardHeader>
              <CardTitle>Most Visited Pages</CardTitle>
              <CardDescription>Pages with the highest traffic</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topPages} layout="horizontal">
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="page" width={100} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="views" fill="var(--color-page_views)" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>

        {topPages.length === 0 && totalPageViews === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <Eye className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No analytics data yet</h3>
              <p className="text-muted-foreground">
                Start using the platform to see analytics data appear here.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  // Settings component inline
  const SettingsContent = () => {
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
      <div className="space-y-6">
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
                variant="default"
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
    );
  };

  useEffect(() => {
    fetchData();
    fetchPendingCount();
    fetchNotifications();
    fetchNewsStories();
  }, []);

  useEffect(() => {
    // Filter companies based on search term
    const filtered = companies.filter(company =>
      company.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredCompanies(filtered);
  }, [companies, searchTerm]);

  const fetchData = async () => {
    try {
      // Fetch companies
      const { data: companiesData } = await supabase
        .from('companies')
        .select('*')
        .order('name');

      setCompanies(companiesData || []);
    } catch (error) {
      console.error('Error fetching admin data:', error);
      toast({
        variant: "destructive",
        title: "Error loading data",
        description: "Please refresh the page to try again."
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingCount = async () => {
    try {
      const adminCompanies = memberships.filter(m => m.is_admin && m.is_approved).map(m => m.company_id);
      
      let query = supabase
        .from('registrations')
        .select('id', { count: 'exact' })
        .eq('status', 'pending');

      // If not super admin, only count registrations for companies they admin
      if (!isSuperAdmin) {
        query = query.in('approved_company_id', adminCompanies);
      }

      const { count } = await query;
      setPendingCount(count || 0);
    } catch (error) {
      console.error('Error fetching pending count:', error);
    }
  };

  const fetchNotifications = async () => {
    try {
      const { data } = await supabase
        .from('notification_banners')
        .select('*')
        .order('created_at', { ascending: false });
      
      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const fetchNewsStories = async () => {
    try {
      const { data } = await supabase
        .from('news_stories')
        .select('*')
        .order('created_at', { ascending: false });
      
      setNewsStories(data || []);
    } catch (error) {
      console.error('Error fetching news stories:', error);
    }
  };

  const createCompany = async () => {
    if (!newCompanyName.trim()) return;

    try {
      const { data, error } = await supabase
        .from('companies')
        .insert({ 
          name: newCompanyName.trim(),
          partner_salesforce_record: newCompanySalesforceUrl.trim() || null,
          track: newCompanyTrack || null,
          lead_submission_url: newCompanyLeadUrl.trim() || null,
          is_in_onboarding: newCompanyInOnboarding
        })
        .select()
        .single();

      if (error) throw error;

      setCompanies(prev => [...prev, data]);
      setNewCompanyName('');
      setNewCompanySalesforceUrl('');
      setNewCompanyTrack('');
      setNewCompanyLeadUrl('');
      setNewCompanyInOnboarding(false);
      setShowNewCompanyDialog(false);
      
      toast({
        title: "Company created",
        description: `${data.name} has been created successfully.`
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to create company",
        description: error.message
      });
    }
  };

  const openEditDialog = (company: Company) => {
    setEditingCompany(company);
    setShowEditDialog(true);
  };

  const closeEditDialog = () => {
    setEditingCompany(null);
    setShowEditDialog(false);
  };

  const updateCompany = async (updatedData: Partial<Company>) => {
    if (!editingCompany) return;

    try {
      const { error } = await supabase
        .from('companies')
        .update({
          name: updatedData.name?.trim(),
          partner_salesforce_record: updatedData.partner_salesforce_record?.trim() || null,
          lead_submission_url: updatedData.lead_submission_url?.trim() || null,
          track: updatedData.track || null,
          is_in_onboarding: updatedData.is_in_onboarding || false,
          partner_manager_id: updatedData.partner_manager_id,
          slack_channel_url: updatedData.slack_channel_url?.trim() || null
        })
        .eq('id', editingCompany.id);

      if (error) throw error;

      // Update local state
      setCompanies(prev => prev.map(company => 
        company.id === editingCompany.id 
          ? { ...company, ...updatedData }
          : company
      ));

      closeEditDialog();
      
      toast({
        title: "Company updated",
        description: "Company has been updated successfully."
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to update company",
        description: error.message
      });
    }
  };

  const openDeleteDialog = (company: Company) => {
    setCompanyToDelete(company);
    setShowDeleteDialog(true);
  };

  const closeDeleteDialog = () => {
    setCompanyToDelete(null);
    setShowDeleteDialog(false);
  };

  const deleteCompany = async () => {
    if (!companyToDelete) return;

    try {
      const { error } = await supabase
        .from('companies')
        .delete()
        .eq('id', companyToDelete.id);

      if (error) throw error;

      // Update local state
      setCompanies(prev => prev.filter(company => company.id !== companyToDelete.id));

      closeDeleteDialog();
      
      toast({
        title: "Company deleted",
        description: "Company has been deleted successfully."
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to delete company",
        description: error.message
      });
    }
  };

  // Notification management functions
  const createNotification = async () => {
    if (!notificationMessage.trim()) return;

    try {
      // Deactivate any existing active notifications
      await supabase
        .from('notification_banners')
        .update({ is_active: false })
        .eq('is_active', true);

      const { data, error } = await supabase
        .from('notification_banners')
        .insert({ 
          message: notificationMessage.trim(),
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;

      setNotifications(prev => [data, ...prev.map(n => ({ ...n, is_active: false }))]);
      setNotificationMessage('');
      setShowNotificationDialog(false);
      
      toast({
        title: "Notification created",
        description: "New notification banner is now active."
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to create notification",
        description: error.message
      });
    }
  };

  const toggleNotification = async (id: string, isActive: boolean) => {
    try {
      if (isActive) {
        // Deactivate other notifications first
        await supabase
          .from('notification_banners')
          .update({ is_active: false })
          .neq('id', id);
      }

      const { error } = await supabase
        .from('notification_banners')
        .update({ is_active: isActive })
        .eq('id', id);

      if (error) throw error;

      setNotifications(prev => prev.map(n => 
        n.id === id ? { ...n, is_active: isActive } : { ...n, is_active: false }
      ));

      toast({
        title: isActive ? "Notification activated" : "Notification deactivated",
        description: isActive ? "Banner is now visible to users." : "Banner is no longer visible."
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to update notification",
        description: error.message
      });
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notification_banners')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setNotifications(prev => prev.filter(n => n.id !== id));
      
      toast({
        title: "Notification deleted",
        description: "Notification has been removed."
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to delete notification",
        description: error.message
      });
    }
  };

  // News stories management functions
  const createNewsStory = async () => {
    if (!newStory.headline.trim()) return;

    try {
      const { data, error } = await supabase
        .from('news_stories')
        .insert({
          headline: newStory.headline.trim(),
          subheading: newStory.subheading.trim() || null,
          content: newStory.content.trim() || null,
          image_url: newStory.image_url.trim() || null,
          is_published: true
        })
        .select()
        .single();

      if (error) throw error;

      setNewsStories(prev => [data, ...prev]);
      setNewStory({ headline: '', subheading: '', content: '', image_url: '' });
      setShowNewsDialog(false);
      
      toast({
        title: "News story created",
        description: "Story has been published successfully."
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to create story",
        description: error.message
      });
    }
  };

  const toggleStoryPublication = async (id: string, isPublished: boolean) => {
    try {
      const { error } = await supabase
        .from('news_stories')
        .update({ is_published: isPublished })
        .eq('id', id);

      if (error) throw error;

      setNewsStories(prev => prev.map(s => 
        s.id === id ? { ...s, is_published: isPublished } : s
      ));

      toast({
        title: isPublished ? "Story published" : "Story unpublished",
        description: isPublished ? "Story is now visible to users." : "Story is no longer visible."
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to update story",
        description: error.message
      });
    }
  };

  const deleteNewsStory = async (id: string) => {
    try {
      const { error } = await supabase
        .from('news_stories')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setNewsStories(prev => prev.filter(s => s.id !== id));
      
      toast({
        title: "Story deleted",
        description: "News story has been removed."
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to delete story",
        description: error.message
      });
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <Button variant="ghost" asChild className="mb-4">
                <Link to="/dashboard">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Link>
              </Button>
              <h1 className="text-3xl font-bold">Admin Panel</h1>
              <p className="text-muted-foreground">
                Manage portal content, users, and company settings
              </p>
            </div>
          </div>

          {/* Admin Tabs */}
          <Tabs defaultValue="approvals" className="space-y-6">
            <TabsList className="grid w-full grid-cols-7">
              <TabsTrigger value="approvals">Approvals</TabsTrigger>
              <TabsTrigger value="companies">Companies</TabsTrigger>
              <TabsTrigger value="users">Users</TabsTrigger>
              <TabsTrigger value="notifications">Notifications</TabsTrigger>
              <TabsTrigger value="news">News</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="approvals" className="space-y-6">

              {/* Pending Approvals */}
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Clock className="h-5 w-5 mr-2" />
                      Pending Approvals
                    </div>
                    {pendingCount > 0 && (
                      <Badge variant="destructive">{pendingCount}</Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    Review and approve user registration requests
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {pendingCount === 0 ? (
                    <p className="text-muted-foreground">No pending registrations</p>
                  ) : (
                    <div className="flex items-center justify-between">
                      <p className="text-muted-foreground">
                        {pendingCount} registration{pendingCount !== 1 ? 's' : ''} waiting for approval
                      </p>
                      <Button asChild>
                        <Link to="/admin/approvals">
                          Review Approvals
                        </Link>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Companies Tab */}
            <TabsContent value="companies" className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold">Companies</h2>
                  <p className="text-muted-foreground">Manage partner companies and their settings</p>
                </div>
                <div className="flex space-x-2">
                  {isSuperAdmin && (
                    <Button asChild variant="outline">
                      <Link to="/admin/onboarding-journeys">
                        <Route className="h-4 w-4 mr-2" />
                        Onboarding Journeys
                      </Link>
                    </Button>
                  )}
                  {isSuperAdmin && (
                    <Dialog open={showNewCompanyDialog} onOpenChange={setShowNewCompanyDialog}>
                      <DialogTrigger asChild>
                        <Button>
                          <Plus className="h-4 w-4 mr-2" />
                          New Company
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Create New Company</DialogTitle>
                          <DialogDescription>
                            Add a new company to the partner portal.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="companyName">Company Name</Label>
                            <Input
                              id="companyName"
                              value={newCompanyName}
                              onChange={(e) => setNewCompanyName(e.target.value)}
                              placeholder="Enter company name"
                            />
                          </div>
                          <div>
                            <Label htmlFor="salesforceUrl">Salesforce URL</Label>
                            <Input
                              id="salesforceUrl"
                              value={newCompanySalesforceUrl}
                              onChange={(e) => setNewCompanySalesforceUrl(e.target.value)}
                              placeholder="https://salesforce.com/..."
                              type="url"
                            />
                          </div>
                          <div>
                            <Label htmlFor="track">Track</Label>
                            <Select value={newCompanyTrack} onValueChange={setNewCompanyTrack}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select track" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Track 1">Track 1</SelectItem>
                                <SelectItem value="Track 2">Track 2</SelectItem>
                                <SelectItem value="Track 3">Track 3</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="leadSubmissionUrl">Lead Submission URL</Label>
                            <Input
                              id="leadSubmissionUrl"
                              value={newCompanyLeadUrl}
                              onChange={(e) => setNewCompanyLeadUrl(e.target.value)}
                              placeholder="https://feathery.io/form/..."
                              type="url"
                            />
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="inOnboarding"
                              checked={newCompanyInOnboarding}
                              onCheckedChange={(checked) => setNewCompanyInOnboarding(checked === true)}
                            />
                            <Label htmlFor="inOnboarding">Company is in onboarding stage</Label>
                          </div>
                          <div className="flex space-x-2">
                            <Button onClick={createCompany} disabled={!newCompanyName.trim()}>
                              Create Company
                            </Button>
                            <Button variant="outline" onClick={() => setShowNewCompanyDialog(false)}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </div>

              <Card className="shadow-card">
                <CardHeader>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search companies..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {filteredCompanies.map((company) => (
                      <div key={company.id} className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-muted/30 transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3">
                            <p className="font-medium truncate">{company.name}</p>
                            <div className="flex items-center gap-2">
                              {company.track && (
                                <Badge variant="outline" className="text-xs">{company.track}</Badge>
                              )}
                              {company.is_in_onboarding && (
                                <Badge variant="secondary" className="text-xs">Onboarding</Badge>
                              )}
                            </div>
                          </div>
                          
                          <div className="mt-1 text-xs text-muted-foreground">
                            {company.partner_salesforce_record ? (
                              <a
                                href={company.partner_salesforce_record}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:text-primary underline inline-flex items-center"
                              >
                                Salesforce Record <ExternalLink className="h-3 w-3 ml-1" />
                              </a>
                            ) : (
                              <span>No Salesforce record</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEditDialog(company)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => openDeleteDialog(company)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}

                    {filteredCompanies.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <p>No companies found</p>
                        {searchTerm && (
                          <p className="text-sm">Try adjusting your search terms</p>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Users Tab */}
            <TabsContent value="users" className="space-y-6">
              <UserManagement />
            </TabsContent>

            {/* Notifications Tab */}
            <TabsContent value="notifications" className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold">Notification Banners</h2>
                  <p className="text-muted-foreground">Manage global notification banners displayed to all users</p>
                </div>
                <Dialog open={showNotificationDialog} onOpenChange={setShowNotificationDialog}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      New Notification
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create Notification Banner</DialogTitle>
                      <DialogDescription>
                        Create a new notification banner that will be displayed to all users.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="notificationMessage">Message</Label>
                        <Textarea
                          id="notificationMessage"
                          value={notificationMessage}
                          onChange={(e) => setNotificationMessage(e.target.value)}
                          placeholder="Enter notification message..."
                          rows={3}
                        />
                      </div>
                      <div className="flex space-x-2">
                        <Button onClick={createNotification} disabled={!notificationMessage.trim()}>
                          Create & Activate
                        </Button>
                        <Button variant="outline" onClick={() => setShowNotificationDialog(false)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Active & Recent Notifications</CardTitle>
                  <CardDescription>Only one notification can be active at a time</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {notifications.map((notification) => (
                      <div key={notification.id} className="flex items-start justify-between p-3 border border-border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {notification.is_active ? (
                              <Badge variant="default">Active</Badge>
                            ) : (
                              <Badge variant="secondary">Inactive</Badge>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {new Date(notification.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-sm">{notification.message}</p>
                        </div>
                        <div className="flex space-x-2 ml-4">
                          <Button
                            size="sm"
                            variant={notification.is_active ? "outline" : "default"}
                            onClick={() => toggleNotification(notification.id, !notification.is_active)}
                          >
                            {notification.is_active ? (
                              <BellOff className="h-4 w-4" />
                            ) : (
                              <Bell className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => deleteNotification(notification.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}

                    {notifications.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <p>No notifications created yet</p>
                        <p className="text-sm">Create your first notification banner to get started</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics" className="space-y-6">
              <div className="mb-8">
                <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
                <p className="text-muted-foreground mt-2">
                  Track user engagement and platform usage
                </p>
              </div>

              {/* Include Analytics Component */}
              <AnalyticsContent />
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings" className="space-y-6">
              <div className="mb-8">
                <h2 className="text-2xl font-bold">System Settings</h2>
                <p className="text-muted-foreground mt-2">
                  Configure system-wide settings and manage admin accounts
                </p>
              </div>

              {/* Include Settings Component */}
              <SettingsContent />
            </TabsContent>

            {/* News Tab */}
            <TabsContent value="news" className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold">News Stories</h2>
                  <p className="text-muted-foreground">Manage news updates shown in the Recent Updates section</p>
                </div>
                <Dialog open={showNewsDialog} onOpenChange={setShowNewsDialog}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      New Story
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Create News Story</DialogTitle>
                      <DialogDescription>
                        Create a new news story for the Recent Updates section.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="headline">Headline</Label>
                        <Input
                          id="headline"
                          value={newStory.headline}
                          onChange={(e) => setNewStory(prev => ({ ...prev, headline: e.target.value }))}
                          placeholder="Enter story headline..."
                        />
                      </div>
                      <div>
                        <Label htmlFor="subheading">Subheading</Label>
                        <Input
                          id="subheading"
                          value={newStory.subheading}
                          onChange={(e) => setNewStory(prev => ({ ...prev, subheading: e.target.value }))}
                          placeholder="Enter story subheading..."
                        />
                      </div>
                      <div>
                        <Label htmlFor="imageUrl">Image URL</Label>
                        <Input
                          id="imageUrl"
                          value={newStory.image_url}
                          onChange={(e) => setNewStory(prev => ({ ...prev, image_url: e.target.value }))}
                          placeholder="https://example.com/image.jpg"
                          type="url"
                        />
                      </div>
                      <div>
                        <Label htmlFor="content">Full Content</Label>
                        <Textarea
                          id="content"
                          value={newStory.content}
                          onChange={(e) => setNewStory(prev => ({ ...prev, content: e.target.value }))}
                          placeholder="Enter the full story content..."
                          rows={6}
                        />
                      </div>
                      <div className="flex space-x-2">
                        <Button onClick={createNewsStory} disabled={!newStory.headline.trim()}>
                          Create & Publish
                        </Button>
                        <Button variant="outline" onClick={() => setShowNewsDialog(false)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Published & Draft Stories</CardTitle>
                  <CardDescription>Manage your news stories and their publication status</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {newsStories.map((story) => (
                      <div key={story.id} className="flex items-start gap-4 p-4 border border-border rounded-lg">
                        {story.image_url && (
                          <img 
                            src={story.image_url} 
                            alt={story.headline}
                            className="w-20 h-20 object-cover rounded-lg"
                          />
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {story.is_published ? (
                              <Badge variant="default">Published</Badge>
                            ) : (
                              <Badge variant="secondary">Draft</Badge>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {new Date(story.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <h3 className="font-semibold">{story.headline}</h3>
                          {story.subheading && (
                            <p className="text-sm text-muted-foreground mt-1">{story.subheading}</p>
                          )}
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant={story.is_published ? "outline" : "default"}
                            onClick={() => toggleStoryPublication(story.id, !story.is_published)}
                          >
                            {story.is_published ? "Unpublish" : "Publish"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => deleteNewsStory(story.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}

                    {newsStories.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <p>No news stories created yet</p>
                        <p className="text-sm">Create your first news story to get started</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Edit Company Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Company</DialogTitle>
            <DialogDescription>
              Update company information and settings.
            </DialogDescription>
          </DialogHeader>
          {editingCompany && (
            <EditCompanyForm 
              company={editingCompany} 
              onSave={updateCompany}
              onCancel={closeEditDialog}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Company Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Company</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{companyToDelete?.name}"? This action cannot be undone and will remove all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={closeDeleteDialog}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteCompany} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete Company
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
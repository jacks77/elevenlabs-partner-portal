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
import { Link } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Company {
  id: string;
  name: string;
  partner_salesforce_record?: string;
  is_in_onboarding?: boolean;
  track?: string;
  lead_submission_url?: string;
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
  const [editingCompany, setEditingCompany] = useState<string | null>(null);
  const [editingData, setEditingData] = useState({
    salesforceUrl: '',
    track: '',
    leadSubmissionUrl: '',
    inOnboarding: false
  });

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

  const startEditingCompany = (company: Company) => {
    setEditingCompany(company.id);
    setEditingData({
      salesforceUrl: company.partner_salesforce_record || '',
      track: company.track || '',
      leadSubmissionUrl: company.lead_submission_url || '',
      inOnboarding: company.is_in_onboarding || false
    });
  };

  const cancelEditingCompany = () => {
    setEditingCompany(null);
    setEditingData({
      salesforceUrl: '',
      track: '',
      leadSubmissionUrl: '',
      inOnboarding: false
    });
  };

  const saveCompanyChanges = async (companyId: string) => {
    try {
      const { error } = await supabase
        .from('companies')
        .update({
          partner_salesforce_record: editingData.salesforceUrl.trim() || null,
          track: editingData.track || null,
          lead_submission_url: editingData.leadSubmissionUrl.trim() || null,
          is_in_onboarding: editingData.inOnboarding
        })
        .eq('id', companyId);

      if (error) throw error;

      // Update local state
      setCompanies(prev => prev.map(company => 
        company.id === companyId 
            ? { 
                ...company, 
                partner_salesforce_record: editingData.salesforceUrl.trim() || undefined,
                track: editingData.track || undefined,
                lead_submission_url: editingData.leadSubmissionUrl.trim() || undefined,
                is_in_onboarding: editingData.inOnboarding
              }
          : company
      ));

      setEditingCompany(null);
      setEditingData({
        salesforceUrl: '',
        track: '',
        leadSubmissionUrl: '',
        inOnboarding: false
      });

      toast({
        title: "Company updated",
        description: "Company settings have been updated successfully."
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to update company",
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
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="companies">Companies</TabsTrigger>
              <TabsTrigger value="users">Users</TabsTrigger>
              <TabsTrigger value="notifications">Notifications</TabsTrigger>
              <TabsTrigger value="news">News</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">

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

                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => startEditingCompany(company)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-80 bg-popover border border-border shadow-lg z-50">
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <h4 className="font-medium">Edit {company.name}</h4>
                                <p className="text-sm text-muted-foreground">
                                  Update company settings and information.
                                </p>
                              </div>
                              
                              <div className="space-y-3">
                                <div>
                                  <Label className="text-xs">Salesforce URL</Label>
                                  <Input
                                    value={editingData.salesforceUrl}
                                    onChange={(e) => setEditingData(prev => ({ ...prev, salesforceUrl: e.target.value }))}
                                    placeholder="https://salesforce.com/..."
                                    className="text-sm mt-1"
                                    type="url"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">Track</Label>
                                  <Select 
                                    value={editingData.track} 
                                    onValueChange={(value) => setEditingData(prev => ({ ...prev, track: value }))}
                                  >
                                    <SelectTrigger className="text-sm mt-1">
                                      <SelectValue placeholder="Select track" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-popover border border-border z-50">
                                      <SelectItem value="">No Track</SelectItem>
                                      <SelectItem value="Track 1">Track 1</SelectItem>
                                      <SelectItem value="Track 2">Track 2</SelectItem>
                                      <SelectItem value="Track 3">Track 3</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label className="text-xs">Lead Submission URL</Label>
                                  <Input
                                    value={editingData.leadSubmissionUrl}
                                    onChange={(e) => setEditingData(prev => ({ ...prev, leadSubmissionUrl: e.target.value }))}
                                    placeholder="https://feathery.io/form/..."
                                    className="text-sm mt-1"
                                    type="url"
                                  />
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`onboarding-${company.id}`}
                                    checked={editingData.inOnboarding}
                                    onCheckedChange={(checked) => setEditingData(prev => ({ ...prev, inOnboarding: checked === true }))}
                                  />
                                  <Label htmlFor={`onboarding-${company.id}`} className="text-xs">In onboarding stage</Label>
                                </div>
                              </div>
                              
                              <div className="flex space-x-2 pt-2">
                                <Button
                                  size="sm"
                                  onClick={() => saveCompanyChanges(company.id)}
                                  className="flex-1"
                                >
                                  <Check className="h-4 w-4 mr-1" />
                                  Save
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={cancelEditingCompany}
                                  className="flex-1"
                                >
                                  <X className="h-4 w-4 mr-1" />
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
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
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold">User Management</h2>
                  <p className="text-muted-foreground">Create and manage user accounts</p>
                </div>
                <div className="flex space-x-2">
                  {isSuperAdmin && (
                    <Button asChild>
                      <Link to="/create-user">
                        <UserPlus className="h-4 w-4 mr-2" />
                        Create User
                      </Link>
                    </Button>
                  )}
                  <Button asChild variant="outline">
                    <Link to="/admin/onboarding-journeys">
                      <Route className="h-4 w-4 mr-2" />
                      Onboarding Journeys
                    </Link>
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Create New User</CardTitle>
                    <CardDescription>Add a new user account to the system</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button asChild className="w-full">
                      <Link to="/create-user">
                        <UserPlus className="h-4 w-4 mr-2" />
                        Create User Account
                      </Link>
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Onboarding Journeys</CardTitle>
                    <CardDescription>Manage custom onboarding workflows</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button asChild variant="outline" className="w-full">
                      <Link to="/admin/onboarding-journeys">
                        <Settings className="h-4 w-4 mr-2" />
                        Configure Journeys
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              </div>
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
    </div>
  );
}
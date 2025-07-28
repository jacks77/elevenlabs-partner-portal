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
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';
import { Users, Building, ArrowLeft, UserPlus, Clock, Edit, Check, X, ExternalLink, Route, Search } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Company {
  id: string;
  name: string;
  partner_salesforce_record?: string;
  is_in_onboarding?: boolean;
  track?: string;
}

export default function Admin() {
  const { profile, memberships } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newCompanySalesforceUrl, setNewCompanySalesforceUrl] = useState('');
  const [newCompanyTrack, setNewCompanyTrack] = useState('');
  const [newCompanyInOnboarding, setNewCompanyInOnboarding] = useState(false);
  const [showNewCompanyDialog, setShowNewCompanyDialog] = useState(false);
  const [editingCompany, setEditingCompany] = useState<string | null>(null);
  const [editingData, setEditingData] = useState({
    salesforceUrl: '',
    track: '',
    inOnboarding: false
  });

  const isSuperAdmin = profile?.is_super_admin;

  useEffect(() => {
    fetchData();
    fetchPendingCount();
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

  const createCompany = async () => {
    if (!newCompanyName.trim()) return;

    try {
      const { data, error } = await supabase
        .from('companies')
        .insert({ 
          name: newCompanyName.trim(),
          partner_salesforce_record: newCompanySalesforceUrl.trim() || null,
          track: newCompanyTrack || null,
          is_in_onboarding: newCompanyInOnboarding
        })
        .select()
        .single();

      if (error) throw error;

      setCompanies(prev => [...prev, data]);
      setNewCompanyName('');
      setNewCompanySalesforceUrl('');
      setNewCompanyTrack('');
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
      inOnboarding: company.is_in_onboarding || false
    });
  };

  const cancelEditingCompany = () => {
    setEditingCompany(null);
    setEditingData({
      salesforceUrl: '',
      track: '',
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
              is_in_onboarding: editingData.inOnboarding
            }
          : company
      ));

      setEditingCompany(null);
      setEditingData({
        salesforceUrl: '',
        track: '',
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
                Manage users, members, and company settings
              </p>
            </div>
            {isSuperAdmin && (
              <div className="flex space-x-2">
                <Button asChild>
                  <Link to="/create-user">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Create User
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/admin/onboarding-journeys">
                    <Route className="h-4 w-4 mr-2" />
                    Onboarding Journeys
                  </Link>
                </Button>
                <Dialog open={showNewCompanyDialog} onOpenChange={setShowNewCompanyDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <Building className="h-4 w-4 mr-2" />
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
              </div>
            )}
          </div>

          {/* Pending Approvals Card */}
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

          {/* Companies List */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Building className="h-5 w-5 mr-2" />
                Companies ({filteredCompanies.length})
              </CardTitle>
              <CardDescription>
                Manage company settings and information
              </CardDescription>
              <div className="relative mt-4">
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
                      
                      {/* Compact company details */}
                      {(isSuperAdmin || memberships.some(m => m.is_admin && m.is_approved)) && editingCompany !== company.id && (
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
                      )}

                      {/* Edit form */}
                      {editingCompany === company.id && (
                        <div className="mt-3 space-y-3 p-3 bg-muted/50 rounded-md">
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
                              <SelectContent>
                                <SelectItem value="">No Track</SelectItem>
                                <SelectItem value="Track 1">Track 1</SelectItem>
                                <SelectItem value="Track 2">Track 2</SelectItem>
                                <SelectItem value="Track 3">Track 3</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`onboarding-${company.id}`}
                              checked={editingData.inOnboarding}
                              onCheckedChange={(checked) => setEditingData(prev => ({ ...prev, inOnboarding: checked === true }))}
                            />
                            <Label htmlFor={`onboarding-${company.id}`} className="text-xs">In onboarding stage</Label>
                          </div>
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              onClick={() => saveCompanyChanges(company.id)}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={cancelEditingCompany}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {editingCompany !== company.id && (isSuperAdmin || memberships.some(m => m.is_admin && m.is_approved)) && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => startEditingCompany(company)}
                        className="shrink-0 ml-2"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                {filteredCompanies.length === 0 && searchTerm && (
                  <div className="text-center py-8 text-muted-foreground">
                    No companies found matching "{searchTerm}"
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
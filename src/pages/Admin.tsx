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
import { Users, Building, ArrowLeft, UserPlus, Clock, Edit, Check, X, ExternalLink, Route } from 'lucide-react';
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
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newCompanySalesforceUrl, setNewCompanySalesforceUrl] = useState('');
  const [newCompanyTrack, setNewCompanyTrack] = useState('');
  const [newCompanyInOnboarding, setNewCompanyInOnboarding] = useState(false);
  const [showNewCompanyDialog, setShowNewCompanyDialog] = useState(false);
  const [editingCompany, setEditingCompany] = useState<string | null>(null);
  const [editingSalesforceUrl, setEditingSalesforceUrl] = useState('');

  const isSuperAdmin = profile?.is_super_admin;

  useEffect(() => {
    fetchData();
    fetchPendingCount();
  }, []);

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

  const startEditingSalesforce = (company: Company) => {
    setEditingCompany(company.id);
    setEditingSalesforceUrl(company.partner_salesforce_record || '');
  };

  const cancelEditingSalesforce = () => {
    setEditingCompany(null);
    setEditingSalesforceUrl('');
  };

  const saveSalesforceUrl = async (companyId: string) => {
    try {
      const { error } = await supabase
        .from('companies')
        .update({ partner_salesforce_record: editingSalesforceUrl.trim() || null })
        .eq('id', companyId);

      if (error) throw error;

      // Update local state
      setCompanies(prev => prev.map(company => 
        company.id === companyId 
          ? { ...company, partner_salesforce_record: editingSalesforceUrl.trim() || undefined }
          : company
      ));

      setEditingCompany(null);
      setEditingSalesforceUrl('');

      toast({
        title: "Salesforce record updated",
        description: "Partner Salesforce record has been updated successfully."
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to update Salesforce record",
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
                Companies
              </CardTitle>
              <CardDescription>
                Manage company settings and information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {companies.map((company) => (
                  <div key={company.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">{company.name}</p>
                      
                      {/* Partner Salesforce Record - Only visible to admins/super admins */}
                      {(isSuperAdmin || memberships.some(m => m.is_admin && m.is_approved)) && (
                        <div className="mt-2">
                          <Label className="text-xs text-muted-foreground">Partner Salesforce Record:</Label>
                          {editingCompany === company.id ? (
                            <div className="flex items-center space-x-2 mt-1">
                              <Input
                                value={editingSalesforceUrl}
                                onChange={(e) => setEditingSalesforceUrl(e.target.value)}
                                placeholder="https://salesforce.com/..."
                                className="text-sm"
                                type="url"
                              />
                              <Button
                                size="sm"
                                onClick={() => saveSalesforceUrl(company.id)}
                                className="shrink-0"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={cancelEditingSalesforce}
                                className="shrink-0"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-2 mt-1">
                              {company.partner_salesforce_record ? (
                                <a
                                  href={company.partner_salesforce_record}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-primary hover:text-primary/80 underline flex items-center"
                                >
                                  {company.partner_salesforce_record}
                                  <ExternalLink className="h-3 w-3 ml-1" />
                                </a>
                              ) : (
                                <span className="text-sm text-muted-foreground">Not set</span>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => startEditingSalesforce(company)}
                                className="shrink-0"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
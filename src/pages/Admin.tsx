import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { UserCheck, UserX, Send, Users, Building, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Registration {
  id: string;
  email: string;
  full_name: string;
  requested_company_name: string;
  requested_company_id: string;
  notes: string;
  status: string;
  created_at: string;
  approved_company_id?: string;
  approved_role?: string;
}

interface Company {
  id: string;
  name: string;
}

interface CompanyMember {
  user_id: string;
  company_id: string;
  is_admin: boolean;
  is_approved: boolean;
  company: {
    name: string;
  };
  user_email?: string;
}

export default function Admin() {
  const { profile, memberships } = useAuth();
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [members, setMembers] = useState<CompanyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [showNewCompanyDialog, setShowNewCompanyDialog] = useState(false);

  const isSuperAdmin = profile?.is_super_admin;
  const userCompanies = memberships.filter(m => m.is_admin && m.is_approved).map(m => m.company_id);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch companies
      const { data: companiesData } = await supabase
        .from('companies')
        .select('*')
        .order('name');

      // Fetch registrations
      const { data: registrationsData } = await supabase
        .from('registrations')
        .select('*')
        .order('created_at', { ascending: false });

      // Fetch company members for companies the user can admin
      const { data: membersData } = await supabase
        .from('company_members')
        .select(`
          *,
          company:companies(name)
        `)
        .order('created_at', { ascending: false });

      setCompanies(companiesData || []);
      setRegistrations(registrationsData || []);
      setMembers(membersData || []);
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

  const createCompany = async () => {
    if (!newCompanyName.trim()) return;

    try {
      const { data, error } = await supabase
        .from('companies')
        .insert({ name: newCompanyName.trim() })
        .select()
        .single();

      if (error) throw error;

      setCompanies(prev => [...prev, data]);
      setNewCompanyName('');
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

  const approveRegistration = async (registrationId: string, companyId: string, role: string) => {
    try {
      console.log('=== APPROVAL PROCESS STARTED ===');
      console.log('Registration ID:', registrationId);
      console.log('Company ID:', companyId);
      console.log('Role:', role);
      
      const { error } = await supabase
        .from('registrations')
        .update({
          status: 'approved',
          approved_company_id: companyId,
          approved_role: role,
          approved_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('id', registrationId);

      if (error) {
        console.error('Error updating registration:', error);
        throw error;
      }
      
      console.log('Registration updated successfully');

      // Complete registration and create user account
      console.log('=== CALLING COMPLETE-REGISTRATION FUNCTION ===');
      console.log('Function name: complete-registration');
      console.log('Payload:', { registrationId });
      
      const { data: functionData, error: completeError } = await supabase.functions.invoke('complete-registration', {
        body: { registrationId }
      });
      
      console.log('=== FUNCTION RESPONSE ===');
      console.log('Function data:', functionData);
      console.log('Function error:', completeError);

      if (completeError) {
        console.error('Error completing registration:', completeError);
        toast({
          variant: "destructive",
          title: "Approval successful, but account creation failed",
          description: `Error: ${completeError.message}`
        });
      } else {
        console.log('Registration completed successfully');
        toast({
          title: "Registration approved",
          description: "User account has been created and they can now sign in."
        });
      }

      await fetchData();
    } catch (error: any) {
      console.error('Error in approval process:', error);
      toast({
        variant: "destructive",
        title: "Failed to approve registration",
        description: error.message
      });
    }
  };

  const rejectRegistration = async (registrationId: string) => {
    try {
      const { error } = await supabase
        .from('registrations')
        .update({
          status: 'rejected',
          approved_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('id', registrationId);

      if (error) throw error;

      toast({
        title: "Registration rejected",
        description: "The registration has been rejected."
      });

      await fetchData();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to reject registration",
        description: error.message
      });
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  // Filter registrations based on admin permissions
  const filteredRegistrations = isSuperAdmin 
    ? registrations 
    : registrations.filter(r => 
        r.approved_company_id && userCompanies.includes(r.approved_company_id)
      );

  const pendingRegistrations = filteredRegistrations.filter(r => r.status === 'pending');
  const processedRegistrations = filteredRegistrations.filter(r => r.status !== 'pending');

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
                Manage registrations, members, and company settings
              </p>
            </div>
            {isSuperAdmin && (
              <Dialog open={showNewCompanyDialog} onOpenChange={setShowNewCompanyDialog}>
                <DialogTrigger asChild>
                  <Button>
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

          <Tabs defaultValue="registrations" className="space-y-6">
            <TabsList>
              <TabsTrigger value="registrations">Registrations</TabsTrigger>
              <TabsTrigger value="members">Members</TabsTrigger>
            </TabsList>

            <TabsContent value="registrations" className="space-y-6">
              {/* Pending Registrations */}
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <UserCheck className="h-5 w-5 mr-2" />
                    Pending Registrations ({pendingRegistrations.length})
                  </CardTitle>
                  <CardDescription>
                    Review and approve new registration requests
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {pendingRegistrations.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No pending registrations
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {pendingRegistrations.map((registration) => (
                        <RegistrationCard
                          key={registration.id}
                          registration={registration}
                          companies={companies}
                          onApprove={approveRegistration}
                          onReject={rejectRegistration}
                          isSuperAdmin={isSuperAdmin}
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Processed Registrations */}
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle>Processed Registrations</CardTitle>
                  <CardDescription>Recently approved or rejected registrations</CardDescription>
                </CardHeader>
                <CardContent>
                  {processedRegistrations.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No processed registrations
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {processedRegistrations.slice(0, 10).map((registration) => (
                        <div key={registration.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                          <div>
                            <p className="font-medium">{registration.full_name}</p>
                            <p className="text-sm text-muted-foreground">{registration.email}</p>
                          </div>
                          <div className="text-right">
                            <Badge variant={registration.status === 'approved' ? 'default' : 'destructive'}>
                              {registration.status}
                            </Badge>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(registration.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="members">
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Users className="h-5 w-5 mr-2" />
                    Company Members
                  </CardTitle>
                  <CardDescription>
                    Manage members across all companies
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {members.map((member) => (
                      <div key={`${member.user_id}-${member.company_id}`} className="flex items-center justify-between p-3 border border-border rounded-lg">
                        <div>
                          <p className="font-medium">{member.company.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {member.is_admin ? 'Administrator' : 'Member'}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          {member.is_admin && (
                            <Badge variant="secondary">Admin</Badge>
                          )}
                          <Badge variant={member.is_approved ? 'default' : 'outline'}>
                            {member.is_approved ? 'Approved' : 'Pending'}
                          </Badge>
                        </div>
                      </div>
                    ))}
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

function RegistrationCard({ 
  registration, 
  companies, 
  onApprove, 
  onReject, 
  isSuperAdmin 
}: {
  registration: Registration;
  companies: Company[];
  onApprove: (id: string, companyId: string, role: string) => void;
  onReject: (id: string) => void;
  isSuperAdmin: boolean;
}) {
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('member');

  return (
    <div className="border border-border rounded-lg p-4 space-y-4">
      <div className="flex justify-between items-start">
        <div>
          <h4 className="font-medium">{registration.full_name}</h4>
          <p className="text-sm text-muted-foreground">{registration.email}</p>
          <p className="text-xs text-muted-foreground">
            Applied on {new Date(registration.created_at).toLocaleDateString()}
          </p>
        </div>
        <Badge variant="outline">Pending</Badge>
      </div>

      <div>
        <p className="text-sm font-medium">Requested Company:</p>
        <p className="text-sm text-muted-foreground">
          {registration.requested_company_name || 'None specified'}
        </p>
      </div>

      {registration.notes && (
        <div>
          <p className="text-sm font-medium">Notes:</p>
          <p className="text-sm text-muted-foreground">{registration.notes}</p>
        </div>
      )}

      <div className="space-y-3">
        <div>
          <Label htmlFor="company">Assign to Company</Label>
          <Select value={selectedCompany} onValueChange={setSelectedCompany}>
            <SelectTrigger>
              <SelectValue placeholder="Select a company" />
            </SelectTrigger>
            <SelectContent>
              {companies.map((company) => (
                <SelectItem key={company.id} value={company.id}>
                  {company.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="role">Role</Label>
          <Select value={selectedRole} onValueChange={setSelectedRole}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="member">Member</SelectItem>
              <SelectItem value="admin">Administrator</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex space-x-2">
          <Button 
            onClick={() => onApprove(registration.id, selectedCompany, selectedRole)}
            disabled={!selectedCompany}
            size="sm"
            variant="success"
          >
            <UserCheck className="h-4 w-4 mr-2" />
            Approve & Create Account
          </Button>
          <Button 
            onClick={() => onReject(registration.id)}
            size="sm"
            variant="destructive"
          >
            <UserX className="h-4 w-4 mr-2" />
            Reject
          </Button>
        </div>
      </div>
    </div>
  );
}
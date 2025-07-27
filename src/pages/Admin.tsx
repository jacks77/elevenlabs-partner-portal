import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Users, Building, ArrowLeft, UserPlus } from 'lucide-react';
import { Link } from 'react-router-dom';

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

      // Fetch company members for companies the user can admin
      const { data: membersData } = await supabase
        .from('company_members')
        .select(`
          *,
          company:companies(name)
        `)
        .order('created_at', { ascending: false });

      setCompanies(companiesData || []);
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

          {/* Company Members */}
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
        </div>
      </div>
    </div>
  );
}
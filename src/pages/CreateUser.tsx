import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, UserPlus, RefreshCw, Building } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { generateSecurePassword } from '@/lib/passwordGenerator';

interface Company {
  id: string;
  name: string;
}

export default function CreateUser() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [createNewCompany, setCreateNewCompany] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    companyId: '',
    newCompanyName: '',
    isAdmin: false
  });

  const isSuperAdmin = profile?.is_super_admin;

  useEffect(() => {
    if (!isSuperAdmin) {
      navigate('/dashboard');
      return;
    }
    fetchCompanies();
  }, [isSuperAdmin, navigate]);

  const fetchCompanies = async () => {
    try {
      const { data: companiesData } = await supabase
        .from('companies')
        .select('*')
        .order('name');

      setCompanies(companiesData || []);
    } catch (error) {
      console.error('Error fetching companies:', error);
      toast({
        variant: "destructive",
        title: "Error loading companies",
        description: "Please refresh the page to try again."
      });
    }
  };

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.email || !formData.password || !formData.fullName) {
      toast({
        variant: "destructive",
        title: "Missing fields",
        description: "Please fill in all required fields."
      });
      return;
    }

    // Validate company selection
    if (createNewCompany && !formData.newCompanyName.trim()) {
      toast({
        variant: "destructive",
        title: "Missing company name",
        description: "Please enter a name for the new company."
      });
      return;
    }

    if (!createNewCompany && !formData.companyId) {
      toast({
        variant: "destructive",
        title: "Missing company",
        description: "Please select a company."
      });
      return;
    }

    setLoading(true);
    try {
      let companyId = formData.companyId;

      // Create new company if needed
      if (createNewCompany) {
        console.log('Creating new company:', formData.newCompanyName);
        const { data: companyData, error: companyError } = await supabase
          .from('companies')
          .insert([{ name: formData.newCompanyName.trim() }])
          .select()
          .single();

        if (companyError) {
          throw new Error(`Failed to create company: ${companyError.message}`);
        }

        companyId = companyData.id;
        console.log('Company created successfully:', companyData);

        // Refresh companies list for future use
        fetchCompanies();
      }

      console.log('Creating user with company ID:', companyId);

      // Call the edge function to create the user
      const { data, error } = await supabase.functions.invoke('create-user-admin', {
        body: {
          email: formData.email,
          password: formData.password,
          fullName: formData.fullName,
          companyId: companyId,
          isAdmin: formData.isAdmin
        }
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Failed to create user');
      }

      if (!data.success) {
        throw new Error(data.error || 'User creation failed');
      }

      console.log('User created successfully:', data.user);

      const successMessage = createNewCompany 
        ? `${formData.fullName} can now sign in with email: ${formData.email}. Company "${formData.newCompanyName}" was also created.`
        : `${formData.fullName} can now sign in with email: ${formData.email}`;

      toast({
        title: "User created successfully",
        description: successMessage
      });

      // Reset form
      setFormData({
        email: '',
        password: '',
        fullName: '',
        companyId: '',
        newCompanyName: '',
        isAdmin: false
      });
      setCreateNewCompany(false);

    } catch (error: any) {
      console.error('Error creating user:', error);
      toast({
        variant: "destructive",
        title: "Failed to create user",
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePassword = () => {
    const newPassword = generateSecurePassword();
    setFormData(prev => ({ ...prev, password: newPassword }));
    toast({
      title: "Password generated",
      description: "A secure password has been generated."
    });
  };

  if (!isSuperAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Header */}
          <div>
            <Button variant="ghost" asChild className="mb-4">
              <Link to="/admin">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Admin
              </Link>
            </Button>
            <h1 className="text-3xl font-bold">Create New User</h1>
            <p className="text-muted-foreground">
              Create a new user account with default credentials
            </p>
          </div>

          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center">
                <UserPlus className="h-5 w-5 mr-2" />
                User Details
              </CardTitle>
              <CardDescription>
                Fill in the user information. The user can change their password after first login.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={createUser} className="space-y-4">
                <div>
                  <Label htmlFor="fullName">Full Name *</Label>
                  <Input
                    id="fullName"
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                    placeholder="Enter full name"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Enter email address"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="password">Default Password *</Label>
                  <div className="flex gap-2">
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="Enter default password"
                      required
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleGeneratePassword}
                      className="shrink-0"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    User can change this password after logging in
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="company">Company *</Label>
                    <div className="flex items-center space-x-2">
                      <Label htmlFor="create-new-company" className="text-sm">Create new company</Label>
                      <Switch
                        id="create-new-company"
                        checked={createNewCompany}
                        onCheckedChange={(checked) => {
                          setCreateNewCompany(checked);
                          if (checked) {
                            setFormData(prev => ({ ...prev, companyId: '' }));
                          } else {
                            setFormData(prev => ({ ...prev, newCompanyName: '' }));
                          }
                        }}
                      />
                    </div>
                  </div>

                  {createNewCompany ? (
                    <div>
                      <Input
                        id="newCompanyName"
                        type="text"
                        value={formData.newCompanyName}
                        onChange={(e) => setFormData(prev => ({ ...prev, newCompanyName: e.target.value }))}
                        placeholder="Enter new company name"
                        required
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        <Building className="inline w-3 h-3 mr-1" />
                        A new company will be created with this name
                      </p>
                    </div>
                  ) : (
                    <Select value={formData.companyId} onValueChange={(value) => setFormData(prev => ({ ...prev, companyId: value }))}>
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
                  )}
                </div>

                <div>
                  <Label htmlFor="role">Role</Label>
                  <Select value={formData.isAdmin ? "admin" : "member"} onValueChange={(value) => setFormData(prev => ({ ...prev, isAdmin: value === "admin" }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="admin">Administrator</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex space-x-2 pt-4">
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Creating...' : 'Create User'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => navigate('/admin')}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
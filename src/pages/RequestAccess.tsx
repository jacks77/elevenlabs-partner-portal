
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface Company {
  id: string;
  name: string;
}

export default function RequestAccess() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [requestedCompanyName, setRequestedCompanyName] = useState('');
  const [requestedCompanyId, setRequestedCompanyId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [useExistingCompany, setUseExistingCompany] = useState(false);

  useEffect(() => {
    // Fetch existing companies for selection
    const fetchCompanies = async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name')
        .order('name');

      if (error) {
        console.error('Error fetching companies:', error);
      } else {
        setCompanies(data || []);
      }
    };

    fetchCompanies();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Password mismatch",
        description: "Passwords do not match. Please try again."
      });
      return;
    }

    if (password.length < 6) {
      toast({
        variant: "destructive",
        title: "Password too short",
        description: "Password must be at least 6 characters long."
      });
      return;
    }

    setLoading(true);

    try {
      const registrationData = {
        email,
        password,
        full_name: fullName,
        requested_company_name: useExistingCompany ? null : requestedCompanyName,
        requested_company_id: useExistingCompany ? requestedCompanyId : null,
        notes: notes || null
      };

      const { error } = await supabase
        .from('registrations')
        .insert(registrationData);

      if (error) {
        toast({
          variant: "destructive",
          title: "Submission failed",
          description: error.message
        });
      } else {
        toast({
          title: "Request submitted successfully!",
          description: "Your access request has been submitted for review. You'll be able to sign in once it's approved."
        });
        
        // Reset form
        setFullName('');
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setRequestedCompanyName('');
        setRequestedCompanyId(null);
        setNotes('');
        setUseExistingCompany(false);
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "An error occurred",
        description: "Please try again."
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-subtle p-4">
      <Card className="w-full max-w-md shadow-card">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Request Access
          </CardTitle>
          <CardDescription>
            Submit a request to join the Partner Portal
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name *</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="Enter your full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                placeholder="Create a password (min 6 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password *</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            <div className="space-y-2">
              <Label>Company</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="newCompany"
                    name="companyType"
                    checked={!useExistingCompany}
                    onChange={() => setUseExistingCompany(false)}
                    className="w-4 h-4 text-primary"
                  />
                  <Label htmlFor="newCompany" className="text-sm">New company</Label>
                </div>
                {!useExistingCompany && (
                  <Input
                    placeholder="Enter company name"
                    value={requestedCompanyName}
                    onChange={(e) => setRequestedCompanyName(e.target.value)}
                    required={!useExistingCompany}
                  />
                )}
              </div>

              {companies.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="existingCompany"
                      name="companyType"
                      checked={useExistingCompany}
                      onChange={() => setUseExistingCompany(true)}
                      className="w-4 h-4 text-primary"
                    />
                    <Label htmlFor="existingCompany" className="text-sm">Existing company</Label>
                  </div>
                  {useExistingCompany && (
                    <Select
                      value={requestedCompanyId || undefined}
                      onValueChange={setRequestedCompanyId}
                      required={useExistingCompany}
                    >
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
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                id="notes"
                placeholder="Tell us about your role, why you need access, etc."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading}
            >
              {loading ? 'Submitting...' : 'Submit Request'}
            </Button>
          </form>

          <div className="text-center text-sm text-muted-foreground">
            Already have access?{' '}
            <Link to="/sign-in" className="font-medium text-primary hover:underline">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

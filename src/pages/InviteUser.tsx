import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Send } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function InviteUser() {
  const { memberships } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    fullName: '',
    companyId: '',
    notes: ''
  });
  const [loading, setLoading] = useState(false);

  // Only show companies where user is admin and approved
  const adminCompanies = memberships.filter(m => m.is_admin && m.is_approved);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.fullName || !formData.companyId) {
      toast({
        variant: "destructive",
        title: "Missing information",
        description: "Please fill in all required fields."
      });
      return;
    }

    setLoading(true);
    try {
      // Generate invite code
      const inviteCode = crypto.randomUUID();
      const inviteExpiresAt = new Date();
      inviteExpiresAt.setDate(inviteExpiresAt.getDate() + 7); // Expires in 7 days

      const { error } = await supabase
        .from('registrations')
        .insert({
          email: formData.email,
          full_name: formData.fullName,
          approved_company_id: formData.companyId,
          notes: formData.notes,
          invite_code: inviteCode,
          invite_expires_at: inviteExpiresAt.toISOString(),
          status: 'pending',
          approved_role: 'member'
        });

      if (error) throw error;

      toast({
        title: "Invitation sent",
        description: `${formData.fullName} has been invited to join your company.`
      });

      // Reset form
      setFormData({
        email: '',
        fullName: '',
        companyId: '',
        notes: ''
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to send invitation",
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  if (adminCompanies.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-subtle">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Button variant="ghost" asChild className="mb-4">
            <Link to="/dashboard">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground">
                You need to be an admin of a company to invite users.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Button variant="ghost" asChild className="mb-4">
          <Link to="/dashboard">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
        </Button>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Send className="h-5 w-5 mr-2" />
              Invite User
            </CardTitle>
            <CardDescription>
              Invite a new user to join your company. They will need admin approval before they can sign in.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="user@example.com"
                  required
                />
              </div>

              <div>
                <Label htmlFor="fullName">Full Name *</Label>
                <Input
                  id="fullName"
                  value={formData.fullName}
                  onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                  placeholder="John Doe"
                  required
                />
              </div>

              <div>
                <Label htmlFor="company">Company *</Label>
                <Select value={formData.companyId} onValueChange={(value) => setFormData(prev => ({ ...prev, companyId: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a company" />
                  </SelectTrigger>
                  <SelectContent>
                    {adminCompanies.map((membership) => (
                      <SelectItem key={membership.company_id} value={membership.company_id}>
                        {membership.company?.name || 'Unknown Company'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional information about this user..."
                  rows={3}
                />
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Sending Invitation..." : "Send Invitation"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
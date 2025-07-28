import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Check, X, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';

interface PendingRegistration {
  id: string;
  email: string;
  full_name: string;
  notes: string;
  created_at: string;
  approved_company_id: string;
  company?: {
    name: string;
  };
}

export default function AdminApprovals() {
  const { memberships, profile } = useAuth();
  const [pendingRegistrations, setPendingRegistrations] = useState<PendingRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const isSuperAdmin = profile?.is_super_admin;
  const adminCompanies = memberships.filter(m => m.is_admin && m.is_approved).map(m => m.company_id);

  useEffect(() => {
    fetchPendingRegistrations();
  }, []);

  const fetchPendingRegistrations = async () => {
    try {
      let query = supabase
        .from('registrations')
        .select(`
          *,
          company:companies!approved_company_id(name)
        `)
        .eq('status', 'pending');

      // If not super admin, only show registrations for companies they admin
      if (!isSuperAdmin) {
        query = query.in('approved_company_id', adminCompanies);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setPendingRegistrations(data || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error loading registrations",
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (registrationId: string, approve: boolean) => {
    setActionLoading(registrationId);
    try {
      const { error } = await supabase
        .from('registrations')
        .update({
          status: approve ? 'approved' : 'rejected'
        })
        .eq('id', registrationId);

      if (error) throw error;

      // Remove from pending list
      setPendingRegistrations(prev => prev.filter(r => r.id !== registrationId));

      toast({
        title: approve ? "Registration approved" : "Registration rejected",
        description: `The user registration has been ${approve ? 'approved' : 'rejected'}.`
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to update registration",
        description: error.message
      });
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Button variant="ghost" asChild className="mb-4">
          <Link to="/admin">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Admin
          </Link>
        </Button>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="h-5 w-5 mr-2" />
              Pending Approvals
              {pendingRegistrations.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {pendingRegistrations.length}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Review and approve user registration requests
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pendingRegistrations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No pending registrations</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Requested</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingRegistrations.map((registration) => (
                    <TableRow key={registration.id}>
                      <TableCell className="font-medium">{registration.full_name}</TableCell>
                      <TableCell>{registration.email}</TableCell>
                      <TableCell>{registration.company?.name || 'Unknown'}</TableCell>
                      <TableCell>{registration.notes || '-'}</TableCell>
                      <TableCell>{format(new Date(registration.created_at), 'MMM d, yyyy')}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            onClick={() => handleApproval(registration.id, true)}
                            disabled={actionLoading === registration.id}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleApproval(registration.id, false)}
                            disabled={actionLoading === registration.id}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
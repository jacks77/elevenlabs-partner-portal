import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import { UserPlus, Search, Trash2, Edit, Shield, ShieldOff } from 'lucide-react';
import { EditUserForm } from './EditUserForm';
import { Link } from 'react-router-dom';

interface User {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  title?: string;
  created_at: string;
  is_super_admin?: boolean;
  company_id?: string;
  company_name?: string;
  is_admin?: boolean;
  company?: {
    id: string;
    name: string;
  };
}

interface Company {
  id: string;
  name: string;
}

export function UserManagement() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const isSuperAdmin = profile?.is_super_admin;

  useEffect(() => {
    if (isSuperAdmin) {
      fetchUsers();
      fetchCompanies();
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    // Filter users based on search term and company
    let filtered = users;
    
    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (selectedCompany !== 'all') {
      filtered = filtered.filter(user => user.company_id === selectedCompany);
    }
    
    setFilteredUsers(filtered);
  }, [users, searchTerm, selectedCompany]);

  const fetchUsers = async () => {
    try {
      // Use our admin-users edge function to get user data
      const { data: usersResponse, error: usersError } = await supabase.functions.invoke('admin-users');

      if (usersError) throw usersError;

      // Fetch user profiles
      const { data: userProfiles } = await supabase
        .from('user_profiles')
        .select(`
          user_id,
          is_super_admin,
          first_name,
          last_name,
          title
        `);

      // Fetch company memberships
      const { data: companyMembers } = await supabase
        .from('company_members')
        .select(`
          user_id,
          company_id,
          is_admin,
          companies:company_id (
            id,
            name
          )
        `);

      // Combine auth users with profile and company data
      const authUsers = usersResponse?.users || [];
      const combinedUsers: User[] = authUsers.map((authUser: any) => {
        const profile = userProfiles?.find(p => p.user_id === authUser.id);
        const membership = companyMembers?.find(m => m.user_id === authUser.id);
        
        return {
          id: authUser.id,
          email: authUser.email,
          first_name: profile?.first_name,
          last_name: profile?.last_name,
          title: profile?.title,
          created_at: authUser.created_at,
          is_super_admin: profile?.is_super_admin || false,
          company_id: membership?.company_id,
          company_name: (membership?.companies as any)?.name,
          is_admin: membership?.is_admin || false,
          company: membership?.companies ? {
            id: membership.company_id,
            name: (membership.companies as any).name
          } : undefined
        };
      });

      setUsers(combinedUsers);

    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        variant: "destructive",
        title: "Error loading users",
        description: "Please refresh the page to try again."
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanies = async () => {
    try {
      const { data } = await supabase
        .from('companies')
        .select('id, name')
        .order('name');
      
      setCompanies(data || []);
    } catch (error) {
      console.error('Error fetching companies:', error);
    }
  };

  const deleteUser = async (userId: string) => {
    setDeletingUserId(userId);
    
    try {
      // Call our edge function to delete the user
      const response = await supabase.functions.invoke('delete-user', {
        body: { targetUserId: userId }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      // Remove user from local state
      setUsers(prev => prev.filter(user => user.id !== userId));
      
      toast({
        title: "User deleted",
        description: "User account has been successfully deleted."
      });
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast({
        variant: "destructive",
        title: "Failed to delete user",
        description: error.message
      });
    } finally {
      setDeletingUserId(null);
    }
  };

  const toggleSuperAdmin = async (userId: string, currentStatus: boolean, userCompany: string) => {
    try {
      // Check if user is from ElevenLabs
      if (!userCompany.toLowerCase().includes('elevenlabs')) {
        toast({
          title: "Access denied",
          description: "Super admin status can only be modified for ElevenLabs employees",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('user_profiles')
        .update({ is_super_admin: !currentStatus })
        .eq('user_id', userId);

      if (error) throw error;

      // Update local state
      setUsers(prev => prev.map(u => 
        u.id === userId ? { ...u, is_super_admin: !currentStatus } : u
      ));

      toast({
        title: currentStatus ? "Super admin removed" : "Super admin granted",
        description: `User ${currentStatus ? 'removed from' : 'promoted to'} super admin status`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (!isSuperAdmin) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground">Access denied. Only super admins can manage users.</p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground">Loading users...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">User Management</h2>
          <p className="text-muted-foreground">View and manage all user accounts</p>
        </div>
        <Button asChild>
          <Link to="/create-user">
            <UserPlus className="h-4 w-4 mr-2" />
            Create User
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-48">
              <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by company" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Companies</SelectItem>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Users ({filteredUsers.length})</CardTitle>
          <CardDescription>All user accounts in the system</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredUsers.map((user) => (
              <div key={user.id} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/30 transition-colors">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <p className="font-medium">{user.email}</p>
                    <div className="flex items-center gap-2">
                      {user.is_super_admin && (
                        <Badge variant="destructive" className="text-xs">Super Admin</Badge>
                      )}
                      {user.is_admin && !user.is_super_admin && (
                        <Badge variant="secondary" className="text-xs">Admin</Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <p>Company: {user.company_name || 'No company assigned'}</p>
                    <p>Created: {new Date(user.created_at).toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Super Admin Toggle Button - Only for ElevenLabs employees */}
                  {user.company_name?.toLowerCase().includes('elevenlabs') && user.id !== profile?.user_id && (
                    <Button
                      size="sm"
                      variant={user.is_super_admin ? "destructive" : "default"}
                      onClick={() => toggleSuperAdmin(user.id, user.is_super_admin || false, user.company_name || '')}
                      title={user.is_super_admin ? "Remove super admin" : "Grant super admin"}
                    >
                      {user.is_super_admin ? <ShieldOff className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
                    </Button>
                  )}
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingUser({
                        ...user,
                        company: user.company_name ? { id: user.company_id || '', name: user.company_name } : undefined
                      });
                      setEditDialogOpen(true);
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={deletingUserId === user.id || user.is_super_admin}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete User Account</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete the account for {user.email}? 
                          This action cannot be undone and will remove all user data.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteUser(user.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete User
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}

            {filteredUsers.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p>No users found</p>
                {searchTerm || selectedCompany !== 'all' ? (
                  <p className="text-sm">Try adjusting your filters</p>
                ) : (
                  <p className="text-sm">No users in the system yet</p>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <EditUserForm
        user={editingUser}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onUserUpdated={() => {
          fetchUsers();
          setEditingUser(null);
        }}
      />
    </div>
  );
}
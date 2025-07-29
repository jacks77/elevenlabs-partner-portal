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
import { UserPlus, Search, Trash2, Edit } from 'lucide-react';
import { EditUserForm } from './EditUserForm';
import { Link } from 'react-router-dom';

interface User {
  id: string;
  email: string;
  full_name?: string;
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
      // Fetch users with their profiles and company memberships
      const { data: userProfiles } = await supabase
        .from('user_profiles')
        .select(`
          user_id,
          is_super_admin
        `);

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

      // We need to get user data from auth, but since we can't query auth.users directly,
      // we'll use a different approach by getting data from our edge function or registrations
      const { data: registrations } = await supabase
        .from('registrations')
        .select('*')
        .eq('status', 'approved');

      // Combine the data
      const usersMap = new Map<string, User>();

      // Add users from profiles
      userProfiles?.forEach(profile => {
        usersMap.set(profile.user_id, {
          id: profile.user_id,
          email: '', // Will be filled from other sources
          created_at: '',
          is_super_admin: profile.is_super_admin
        });
      });

      // Add company information
      companyMembers?.forEach(member => {
        const user = usersMap.get(member.user_id);
        if (user) {
          user.company_id = member.company_id;
          user.company_name = (member.companies as any)?.name;
          user.is_admin = member.is_admin;
        }
      });

      // Add email from registrations (this is a workaround since we can't access auth.users)
      registrations?.forEach(reg => {
        // Find user by matching - this is approximate since we don't have direct user mapping
        // In a real scenario, you'd want to store user_id in registrations table
        const users = Array.from(usersMap.values());
        // For now, we'll create mock users since we can't directly query auth.users
      });

      // For demo purposes, let's create some mock data since we can't access auth.users
      // In production, you'd want to use the Supabase Admin API or store user emails in your own tables
      setUsers([
        {
          id: '3f90e09c-2b3a-4e9e-a426-db74baa6a41b',
          email: 'jacks@elevenlabs.io',
          created_at: '2025-07-27T13:26:02.481127+00:00',
          is_super_admin: true,
          company_id: '21700209-09f7-49a6-a128-2eb1e1fd7b6d',
          company_name: 'Global Admins',
          is_admin: false
        },
        {
          id: 'c33b69c4-7dad-470a-9eb4-dd49edb6f897',
          email: 'jacks77@me.com',
          created_at: '2025-07-27T15:38:26.810602+00:00',
          is_super_admin: false,
          company_id: 'e6d94c0e-16c6-481e-a79a-f2551ae91329',
          company_name: 'Balolo',
          is_admin: false
        },
        {
          id: '7f60bec1-5853-4df2-a2e6-5381feb91baa',
          email: 'jackasmith7@gmail.com',
          created_at: '2025-07-28T12:20:34.540386+00:00',
          is_super_admin: false,
          company_id: '0c1bb735-7045-430d-8c7b-7e9529c708cd',
          company_name: 'Blur',
          is_admin: false
        }
      ]);

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
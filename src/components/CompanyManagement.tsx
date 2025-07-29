import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Building2, Plus, Edit, Users, Route, ExternalLink, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { EditCompanyForm } from "./EditCompanyForm";
import { Link } from "react-router-dom";

interface Company {
  id: string;
  name: string;
  track?: string;
  partner_salesforce_record?: string;
  lead_submission_url?: string;
  slack_channel_url?: string;
  commission_tier?: string;
  certification_tier?: string;
  is_in_onboarding?: boolean;
  kickoff_call_date?: string;
  technical_enablement_date?: string;
  first_lead_registered?: boolean;
  first_closed_won?: boolean;
  partner_manager_id?: string;
  created_at: string;
  member_count?: number;
  partner_manager?: {
    first_name?: string;
    last_name?: string;
  };
}

export function CompanyManagement() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [newCompany, setNewCompany] = useState({
    name: '',
    track: '',
    commission_tier: 'Registered',
    certification_tier: 'Registered',
    is_in_onboarding: false,
  });

  const { profile } = useAuth();

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      
      // Get companies with member count and partner manager info
      const { data, error } = await supabase
        .from('companies')
        .select(`
          *,
          partner_manager:user_profiles!companies_partner_manager_id_fkey (
            first_name,
            last_name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get member counts for each company
      const companiesWithCounts = await Promise.all(
        (data || []).map(async (company) => {
          const { count } = await supabase
            .from('company_members')
            .select('*', { count: 'exact', head: true })
            .eq('company_id', company.id)
            .eq('is_approved', true);

          return {
            ...company,
            member_count: count || 0,
          };
        })
      );

      setCompanies(companiesWithCounts);
    } catch (error) {
      console.error('Error fetching companies:', error);
      toast({
        title: "Error",
        description: "Failed to load companies",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createCompany = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .insert([newCompany])
        .select()
        .single();

      if (error) throw error;

      setCompanies(prev => [{ ...data, member_count: 0 }, ...prev]);
      setCreateDialogOpen(false);
      setNewCompany({
        name: '',
        track: '',
        commission_tier: 'Registered',
        certification_tier: 'Registered',
        is_in_onboarding: false,
      });

      toast({
        title: "Company created",
        description: `${data.name} has been created successfully.`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEditClick = (company: Company) => {
    setSelectedCompany(company);
    setEditDialogOpen(true);
  };

  const handleCompanyUpdated = async (updatedData: Partial<Company>) => {
    if (!selectedCompany) return;
    
    try {
      // Update the company in the database
      const { error } = await supabase
        .from('companies')
        .update(updatedData)
        .eq('id', selectedCompany.id);

      if (error) throw error;

      // Update local state
      setCompanies(prev => prev.map(c => 
        c.id === selectedCompany.id ? { ...c, ...updatedData } : c
      ));
      
      setEditDialogOpen(false);
      setSelectedCompany(null);
      
      toast({
        title: "Company updated",
        description: "Company information has been updated successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'Gold': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'Silver': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
      case 'Registered': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  // Filter companies based on search term
  const filteredCompanies = companies.filter(company =>
    company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.track?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.partner_manager?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.partner_manager?.last_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group companies by track
  const companiesByTrack = filteredCompanies.reduce((acc, company) => {
    const track = company.track || 'Unassigned';
    if (!acc[track]) {
      acc[track] = [];
    }
    acc[track].push(company);
    return acc;
  }, {} as Record<string, Company[]>);

  // Sort tracks to show them in a consistent order
  const sortedTracks = Object.keys(companiesByTrack).sort((a, b) => {
    if (a === 'Unassigned') return 1;
    if (b === 'Unassigned') return -1;
    return a.localeCompare(b);
  });

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">Loading companies...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Company Management</h2>
          <p className="text-muted-foreground">Manage partner companies and their details</p>
        </div>
        
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link to="/onboarding-journeys">
              <Route className="h-4 w-4 mr-2" />
              Onboarding Journeys
            </Link>
          </Button>
          
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Company
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Company</DialogTitle>
                <DialogDescription>
                  Add a new partner company to the system.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="company-name">Company Name</Label>
                  <Input
                    id="company-name"
                    value={newCompany.name}
                    onChange={(e) => setNewCompany(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter company name"
                  />
                </div>
                
                <div>
                  <Label htmlFor="track">Track</Label>
                  <Select
                    value={newCompany.track}
                    onValueChange={(value) => setNewCompany(prev => ({ ...prev, track: value }))}
                  >
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
                
                <div className="grid grid-cols-2 gap-4">
                  {/* Show Commission Tier if Track 1 or 2 is selected */}
                  {(newCompany.track === "Track 1" || newCompany.track === "Track 2") && (
                    <div>
                      <Label htmlFor="commission-tier">Commission Tier</Label>
                      <Select
                        value={newCompany.commission_tier}
                        onValueChange={(value) => setNewCompany(prev => ({ ...prev, commission_tier: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Registered">Registered</SelectItem>
                          <SelectItem value="Bronze">Bronze</SelectItem>
                          <SelectItem value="Silver">Silver</SelectItem>
                          <SelectItem value="Gold">Gold</SelectItem>
                          <SelectItem value="Platinum">Platinum</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                  {/* Show Certification Tier if Track 2 or 3 is selected */}
                  {(newCompany.track === "Track 2" || newCompany.track === "Track 3") && (
                    <div>
                      <Label htmlFor="certification-tier">Certification Tier</Label>
                      <Select
                        value={newCompany.certification_tier}
                        onValueChange={(value) => setNewCompany(prev => ({ ...prev, certification_tier: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Registered">Registered</SelectItem>
                          <SelectItem value="Bronze">Bronze</SelectItem>
                          <SelectItem value="Silver">Silver</SelectItem>
                          <SelectItem value="Gold">Gold</SelectItem>
                          <SelectItem value="Platinum">Platinum</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="onboarding"
                    checked={newCompany.is_in_onboarding}
                    onCheckedChange={(checked) => setNewCompany(prev => ({ ...prev, is_in_onboarding: checked === true }))}
                  />
                  <Label htmlFor="onboarding">Company is in onboarding stage</Label>
                </div>
              </div>
              
              <div className="flex justify-end gap-2 mt-6">
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={createCompany} disabled={!newCompany.name.trim()}>
                  Create Company
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Search companies, tracks, or partner managers..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Companies Grouped by Track */}
      {sortedTracks.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {searchTerm ? "No companies match your search" : "No companies found"}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              {searchTerm ? "Try a different search term" : "Create your first company to get started."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {sortedTracks.map((track) => (
            <div key={track} className="space-y-4">
              <div className="flex items-center gap-3">
                <h3 className="text-xl font-semibold">{track}</h3>
                <Badge variant="secondary" className="text-sm">
                  {companiesByTrack[track].length} companies
                </Badge>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {companiesByTrack[track].map((company) => (
                  <Card key={company.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="flex items-center gap-2">
                            <Building2 className="h-5 w-5" />
                            {company.name}
                          </CardTitle>
                          {company.track && (
                            <Badge variant="outline" className="mt-1">
                              {company.track}
                            </Badge>
                          )}
                        </div>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditClick(company)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          Members
                        </span>
                        <span className="font-medium">{company.member_count}</span>
                      </div>
                      
                      <div className="flex flex-wrap gap-1">
                        <Badge className={getTierColor(company.commission_tier || 'Registered')}>
                          {company.commission_tier || 'Registered'} Commission
                        </Badge>
                        <Badge className={getTierColor(company.certification_tier || 'Registered')}>
                          {company.certification_tier || 'Registered'} Cert
                        </Badge>
                      </div>
                      
                      {company.is_in_onboarding && (
                        <Badge variant="secondary" className="w-fit">
                          In Onboarding
                        </Badge>
                      )}
                      
                      {company.partner_manager && (
                        <div className="text-sm">
                          <span className="text-muted-foreground">Partner Manager: </span>
                          <span className="font-medium">
                            {company.partner_manager.first_name} {company.partner_manager.last_name}
                          </span>
                        </div>
                      )}
                      
                      {company.lead_submission_url && (
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                          className="w-full"
                        >
                          <a href={company.lead_submission_url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3 w-3 mr-2" />
                            Lead Submission
                          </a>
                        </Button>
                      )}
                      
                      <div className="text-xs text-muted-foreground">
                        Created {new Date(company.created_at).toLocaleDateString()}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Company Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Company</DialogTitle>
            <DialogDescription>
              Update company information and settings.
            </DialogDescription>
          </DialogHeader>
          
          {selectedCompany && (
            <EditCompanyForm
              company={selectedCompany}
              onSave={handleCompanyUpdated}
              onCancel={() => {
                setEditDialogOpen(false);
                setSelectedCompany(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
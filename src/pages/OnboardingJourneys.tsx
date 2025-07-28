import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Route, Calendar, CheckCircle, Circle, Save } from 'lucide-react';
import { Link } from 'react-router-dom';

interface OnboardingCompany {
  id: string;
  name: string;
  track?: string;
  kickoff_call_date?: string;
  technical_enablement_date?: string;
  first_lead_registered?: boolean;
  first_closed_won?: boolean;
}

export default function OnboardingJourneys() {
  const { profile } = useAuth();
  const [companies, setCompanies] = useState<OnboardingCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCompany, setEditingCompany] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<OnboardingCompany>>({});

  const isSuperAdmin = profile?.is_super_admin;

  useEffect(() => {
    if (isSuperAdmin) {
      fetchOnboardingCompanies();
    }
  }, [isSuperAdmin]);

  const fetchOnboardingCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name, track, kickoff_call_date, technical_enablement_date, first_lead_registered, first_closed_won')
        .eq('is_in_onboarding', true)
        .order('name');

      if (error) throw error;
      setCompanies(data || []);
    } catch (error) {
      console.error('Error fetching onboarding companies:', error);
      toast({
        variant: "destructive",
        title: "Error loading data",
        description: "Please refresh the page to try again."
      });
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (company: OnboardingCompany) => {
    setEditingCompany(company.id);
    setEditData({
      kickoff_call_date: company.kickoff_call_date || '',
      technical_enablement_date: company.technical_enablement_date || '',
      first_lead_registered: company.first_lead_registered || false,
      first_closed_won: company.first_closed_won || false,
    });
  };

  const saveChanges = async (companyId: string) => {
    try {
      const { error } = await supabase
        .from('companies')
        .update({
          kickoff_call_date: editData.kickoff_call_date || null,
          technical_enablement_date: editData.technical_enablement_date || null,
          first_lead_registered: editData.first_lead_registered || false,
          first_closed_won: editData.first_closed_won || false,
        })
        .eq('id', companyId);

      if (error) throw error;

      // Update local state
      setCompanies(prev => prev.map(company => 
        company.id === companyId 
          ? { ...company, ...editData }
          : company
      ));

      setEditingCompany(null);
      setEditData({});

      toast({
        title: "Onboarding data updated",
        description: "Company onboarding information has been updated successfully."
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to update data",
        description: error.message
      });
    }
  };

  const cancelEditing = () => {
    setEditingCompany(null);
    setEditData({});
  };

  const getStageStatus = (company: OnboardingCompany, stage: string) => {
    switch (stage) {
      case 'kickoff':
        return company.kickoff_call_date ? 'completed' : 'pending';
      case 'technical':
        return company.technical_enablement_date ? 'completed' : 'pending';
      case 'first_lead':
        return company.first_lead_registered ? 'completed' : 'pending';
      case 'first_closed':
        return company.first_closed_won ? 'completed' : 'pending';
      default:
        return 'pending';
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Access denied. Super admin privileges required.</p>
        </div>
      </div>
    );
  }

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
                <Link to="/admin">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Admin
                </Link>
              </Button>
              <h1 className="text-3xl font-bold">Onboarding Journeys</h1>
              <p className="text-muted-foreground">
                Manage onboarding progress for partner companies
              </p>
            </div>
          </div>

          {/* Companies Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {companies.map((company) => (
              <Card key={company.id} className="shadow-card">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center">
                        <Route className="h-5 w-5 mr-2" />
                        {company.name}
                      </CardTitle>
                      {company.track && (
                        <Badge variant="secondary" className="mt-1">{company.track}</Badge>
                      )}
                    </div>
                    {editingCompany === company.id ? (
                      <div className="flex space-x-2">
                        <Button size="sm" onClick={() => saveChanges(company.id)}>
                          <Save className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={cancelEditing}>
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => startEditing(company)}>
                        Edit
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Kick-off Call */}
                  <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                    <div className="flex items-center space-x-3">
                      {getStageStatus(company, 'kickoff') === 'completed' ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground" />
                      )}
                      <span className="font-medium">Kick-off Call</span>
                    </div>
                    {editingCompany === company.id ? (
                      <Input
                        type="date"
                        value={editData.kickoff_call_date || ''}
                        onChange={(e) => setEditData(prev => ({ ...prev, kickoff_call_date: e.target.value }))}
                        className="w-40"
                      />
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        {company.kickoff_call_date || 'Not scheduled'}
                      </span>
                    )}
                  </div>

                  {/* Technical Enablement */}
                  <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                    <div className="flex items-center space-x-3">
                      {getStageStatus(company, 'technical') === 'completed' ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground" />
                      )}
                      <span className="font-medium">Technical Enablement</span>
                    </div>
                    {editingCompany === company.id ? (
                      <Input
                        type="date"
                        value={editData.technical_enablement_date || ''}
                        onChange={(e) => setEditData(prev => ({ ...prev, technical_enablement_date: e.target.value }))}
                        className="w-40"
                      />
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        {company.technical_enablement_date || 'Not scheduled'}
                      </span>
                    )}
                  </div>

                  {/* First Lead Registered */}
                  <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                    <div className="flex items-center space-x-3">
                      {getStageStatus(company, 'first_lead') === 'completed' ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground" />
                      )}
                      <span className="font-medium">First Lead Registered</span>
                    </div>
                    {editingCompany === company.id ? (
                      <Checkbox
                        checked={editData.first_lead_registered || false}
                        onCheckedChange={(checked) => setEditData(prev => ({ ...prev, first_lead_registered: checked === true }))}
                      />
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        {company.first_lead_registered ? 'Yes' : 'No'}
                      </span>
                    )}
                  </div>

                  {/* First Closed/Won */}
                  <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                    <div className="flex items-center space-x-3">
                      {getStageStatus(company, 'first_closed') === 'completed' ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground" />
                      )}
                      <span className="font-medium">First Closed/Won</span>
                    </div>
                    {editingCompany === company.id ? (
                      <Checkbox
                        checked={editData.first_closed_won || false}
                        onCheckedChange={(checked) => setEditData(prev => ({ ...prev, first_closed_won: checked === true }))}
                      />
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        {company.first_closed_won ? 'Yes' : 'No'}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {companies.length === 0 && (
            <Card className="shadow-card">
              <CardContent className="text-center py-8">
                <Route className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No companies are currently in onboarding stage.</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Flag companies as "in onboarding stage" when creating or editing them to see them here.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
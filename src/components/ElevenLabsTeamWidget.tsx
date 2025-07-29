import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ExternalLink, MessageSquare } from 'lucide-react';
import { TierDisplay } from './TierDisplay';

interface PartnerManager {
  user_id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
}

interface CompanyWithPartnerManager {
  id: string;
  name: string;
  track?: string;
  partner_manager_id?: string;
  slack_channel_url?: string;
  commission_tier?: string;
  certification_tier?: string;
  partner_manager?: PartnerManager;
}

export function ElevenLabsTeamWidget() {
  const { memberships } = useAuth();
  const [companies, setCompanies] = useState<CompanyWithPartnerManager[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCompanyData();
  }, [memberships]);

  const fetchCompanyData = async () => {
    if (!memberships.length) {
      setLoading(false);
      return;
    }

    try {
      const companyIds = memberships.map(m => m.company_id);
      
      const { data: companiesData, error } = await supabase
        .from('companies')
        .select(`
          id,
          name,
          track,
          partner_manager_id,
          slack_channel_url,
          commission_tier,
          certification_tier,
          partner_manager:user_profiles!companies_partner_manager_id_fkey (
            user_id,
            first_name,
            last_name
          )
        `)
        .in('id', companyIds);

      if (error) throw error;

      // Fetch partner manager emails from auth using our admin-users edge function
      const companiesWithPartnerManagers = await Promise.all(
        (companiesData || []).map(async (company) => {
          if (company.partner_manager_id) {
            try {
              const { data: userData, error } = await supabase.functions.invoke('admin-users', {
                body: { 
                  action: 'get',
                  userId: company.partner_manager_id 
                }
              });
              
              if (!error && userData?.user) {
                return {
                  ...company,
                  partner_manager: {
                    ...company.partner_manager,
                    email: userData.user.email
                  }
                };
              }
            } catch (error) {
              console.error('Error fetching partner manager email:', error);
              return company;
            }
          }
          return company;
        })
      );

      setCompanies(companiesWithPartnerManagers);
    } catch (error) {
      console.error('Error fetching company data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPartnerManagerAvatar = (managerId?: string) => {
    if (managerId) {
      return `${supabase.storage.from('avatars').getPublicUrl(`${managerId}/avatar.jpg`).data.publicUrl}`;
    }
    return undefined;
  };

  const getPartnerManagerInitials = (manager?: PartnerManager) => {
    if (manager?.first_name && manager?.last_name) {
      return `${manager.first_name.charAt(0)}${manager.last_name.charAt(0)}`.toUpperCase();
    }
    if (manager?.email) {
      return manager.email.charAt(0).toUpperCase();
    }
    return 'PM';
  };

  const getPartnerManagerName = (manager?: PartnerManager) => {
    if (manager?.first_name && manager?.last_name) {
      return `${manager.first_name} ${manager.last_name}`;
    }
    if (manager?.email) {
      return manager.email;
    }
    return 'Partner Manager';
  };

  if (loading) {
    return (
      <Card className="w-full shadow-card">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-muted rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="h-4 bg-muted rounded w-1/2"></div>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 bg-muted rounded-full"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-muted rounded w-24"></div>
                    <div className="h-3 bg-muted rounded w-32"></div>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="h-4 bg-muted rounded w-1/2"></div>
                <div className="h-10 bg-muted rounded w-32"></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show widget for each company the user belongs to
  return (
    <>
      {companies.map((company) => (
        <Card key={company.id} className="w-full shadow-card">
          <CardHeader>
            <CardTitle>{company.name}'s ElevenLabs Team</CardTitle>
            {company.track && (
              <p className="text-sm text-muted-foreground">Track: {company.track}</p>
            )}
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Tier Information */}
              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                  Your Status
                </h3>
                <TierDisplay 
                  companyId={company.id}
                  track={company.track}
                  commissionTier={company.commission_tier}
                  certificationTier={company.certification_tier}
                />
              </div>

              {/* Partner Manager Section */}
              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                  Your Partner Manager
                </h3>
                {company.partner_manager ? (
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={getPartnerManagerAvatar(company.partner_manager_id)} />
                      <AvatarFallback className="text-lg">{getPartnerManagerInitials(company.partner_manager)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{getPartnerManagerName(company.partner_manager)}</p>
                      {company.partner_manager.email && (
                        <p className="text-sm text-muted-foreground">{company.partner_manager.email}</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 p-4 border-2 border-dashed border-border rounded-lg">
                    <div className="text-center w-full">
                      <p className="text-sm text-muted-foreground">No partner manager assigned</p>
                      <p className="text-xs text-muted-foreground">Contact your admin to assign one</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Slack Channel Section */}
              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                  Stay In Touch
                </h3>
                {company.slack_channel_url ? (
                  <Button 
                    asChild 
                    variant="outline" 
                    className="w-fit"
                  >
                    <a 
                      href={company.slack_channel_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2"
                    >
                      <MessageSquare className="h-4 w-4" />
                      Join Slack Channel
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </Button>
                ) : (
                  <div className="p-4 border-2 border-dashed border-border rounded-lg">
                    <p className="text-sm text-muted-foreground">No Slack channel configured</p>
                    <p className="text-xs text-muted-foreground">Contact your admin to set up the channel</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </>
  );
}
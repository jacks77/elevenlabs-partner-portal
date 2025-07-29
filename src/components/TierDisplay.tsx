import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Award, Star, TrendingUp } from 'lucide-react';

interface TierDisplayProps {
  companyId: string;
  track?: string;
  commissionTier?: string;
  certificationTier?: string;
}

interface CommissionSettings {
  [key: string]: string;
}

const getTierIcon = (tier: string) => {
  switch (tier) {
    case 'Platinum':
      return <Star className="h-4 w-4 text-purple-500" />;
    case 'Gold':
      return <Award className="h-4 w-4 text-yellow-500" />;
    case 'Silver':
      return <Award className="h-4 w-4 text-gray-400" />;
    case 'Bronze':
      return <Award className="h-4 w-4 text-amber-600" />;
    default:
      return <TrendingUp className="h-4 w-4 text-blue-500" />;
  }
};

const getTierColor = (tier: string) => {
  switch (tier) {
    case 'Platinum':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300';
    case 'Gold':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300';
    case 'Silver':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-950 dark:text-gray-300';
    case 'Bronze':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300';
    default:
      return 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300';
  }
};

export function TierDisplay({ track, commissionTier, certificationTier }: TierDisplayProps) {
  const [commissionPercentages, setCommissionPercentages] = useState<CommissionSettings>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCommissionSettings();
  }, []);

  const fetchCommissionSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('sitewide_settings')
        .select('setting_key, setting_value')
        .like('setting_key', 'commission_%');

      if (error) throw error;

      const settings: CommissionSettings = {};
      data?.forEach(setting => {
        const tier = setting.setting_key.replace('commission_', '');
        const tierName = tier.charAt(0).toUpperCase() + tier.slice(1);
        settings[tierName] = setting.setting_value;
      });

      setCommissionPercentages(settings);
    } catch (error) {
      console.error('Error fetching commission settings:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-2">
        <div className="h-4 bg-muted rounded w-1/3 animate-pulse"></div>
        <div className="h-6 bg-muted rounded w-1/2 animate-pulse"></div>
      </div>
    );
  }

  // Track 1: Show commission tier and percentage
  if (track === 'Track 1' && commissionTier) {
    const percentage = commissionPercentages[commissionTier] || '0';
    return (
      <div className="space-y-2">
        <h4 className="font-medium text-sm text-muted-foreground">Commission Tier</h4>
        <div className="flex items-center gap-2">
          <Badge className={`flex items-center gap-1 ${getTierColor(commissionTier)}`}>
            {getTierIcon(commissionTier)}
            {commissionTier}
          </Badge>
          <span className="text-lg font-semibold text-green-600 dark:text-green-400">
            {percentage}%
          </span>
        </div>
      </div>
    );
  }

  // Track 2: Show both commission tier and certification tier
  if (track === 'Track 2' && commissionTier && certificationTier) {
    const percentage = commissionPercentages[commissionTier] || '0';
    return (
      <div className="space-y-3">
        <div className="space-y-2">
          <h4 className="font-medium text-sm text-muted-foreground">Commission Tier</h4>
          <div className="flex items-center gap-2">
            <Badge className={`flex items-center gap-1 ${getTierColor(commissionTier)}`}>
              {getTierIcon(commissionTier)}
              {commissionTier}
            </Badge>
            <span className="text-lg font-semibold text-green-600 dark:text-green-400">
              {percentage}%
            </span>
          </div>
        </div>
        <div className="space-y-2">
          <h4 className="font-medium text-sm text-muted-foreground">Certification Tier</h4>
          <Badge className={`flex items-center gap-1 ${getTierColor(certificationTier)}`}>
            {getTierIcon(certificationTier)}
            {certificationTier}
          </Badge>
        </div>
      </div>
    );
  }

  // Track 3: Show only certification tier
  if (track === 'Track 3' && certificationTier) {
    return (
      <div className="space-y-2">
        <h4 className="font-medium text-sm text-muted-foreground">Certification Tier</h4>
        <Badge className={`flex items-center gap-1 ${getTierColor(certificationTier)}`}>
          {getTierIcon(certificationTier)}
          {certificationTier}
        </Badge>
      </div>
    );
  }

  return null;
}
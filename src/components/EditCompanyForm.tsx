import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';

interface Company {
  id: string;
  name: string;
  partner_salesforce_record?: string;
  is_in_onboarding?: boolean;
  track?: string;
  lead_submission_url?: string;
  partner_manager_id?: string;
  slack_channel_url?: string;
}

interface PartnerManager {
  user_id: string;
  first_name?: string;
  last_name?: string;
}

interface EditCompanyFormProps {
  company: Company;
  onSave: (updatedData: Partial<Company>) => void;
  onCancel: () => void;
}

export function EditCompanyForm({ company, onSave, onCancel }: EditCompanyFormProps) {
  const [formData, setFormData] = useState({
    name: company.name || '',
    partner_salesforce_record: company.partner_salesforce_record || '',
    track: company.track || '',
    lead_submission_url: company.lead_submission_url || '',
    is_in_onboarding: company.is_in_onboarding || false,
    partner_manager_id: company.partner_manager_id || 'none',
    slack_channel_url: company.slack_channel_url || ''
  });
  
  const [partnerManagers, setPartnerManagers] = useState<PartnerManager[]>([]);

  useEffect(() => {
    fetchPartnerManagers();
  }, []);

  const fetchPartnerManagers = async () => {
    try {
      // Get users who are members of Global Admins company
      const { data: globalAdminsCompany } = await supabase
        .from('companies')
        .select('id')
        .eq('name', 'Global Admins')
        .single();

      if (globalAdminsCompany) {
        const { data: members } = await supabase
          .from('company_members')
          .select(`
            user_id,
            user_profiles!inner (
              user_id,
              first_name,
              last_name
            )
          `)
          .eq('company_id', globalAdminsCompany.id)
          .eq('is_approved', true);

        if (members) {
          const managers = members.map(member => ({
            user_id: member.user_id,
            first_name: (member.user_profiles as any)?.first_name,
            last_name: (member.user_profiles as any)?.last_name
          }));
          setPartnerManagers(managers);
        }
      }
    } catch (error) {
      console.error('Error fetching partner managers:', error);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const dataToSave = {
      ...formData,
      partner_manager_id: formData.partner_manager_id === 'none' ? null : formData.partner_manager_id
    };
    onSave(dataToSave);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="companyName">Company Name</Label>
        <Input
          id="companyName"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          placeholder="Enter company name"
          required
        />
      </div>
      
      <div>
        <Label htmlFor="salesforceUrl">Salesforce Record URL</Label>
        <Input
          id="salesforceUrl"
          value={formData.partner_salesforce_record}
          onChange={(e) => setFormData(prev => ({ ...prev, partner_salesforce_record: e.target.value }))}
          placeholder="https://salesforce.com/..."
          type="url"
        />
      </div>
      
      <div>
        <Label htmlFor="track">Track</Label>
        <Select value={formData.track} onValueChange={(value) => setFormData(prev => ({ ...prev, track: value }))}>
          <SelectTrigger>
            <SelectValue placeholder="Select track" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No Track</SelectItem>
            <SelectItem value="Track 1">Track 1</SelectItem>
            <SelectItem value="Track 2">Track 2</SelectItem>
            <SelectItem value="Track 3">Track 3</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div>
        <Label htmlFor="leadSubmissionUrl">Lead Submission URL</Label>
        <Input
          id="leadSubmissionUrl"
          value={formData.lead_submission_url}
          onChange={(e) => setFormData(prev => ({ ...prev, lead_submission_url: e.target.value }))}
          placeholder="https://feathery.io/form/..."
          type="url"
        />
      </div>
      
      <div>
        <Label htmlFor="partnerManager">Partner Manager</Label>
        <Select value={formData.partner_manager_id} onValueChange={(value) => setFormData(prev => ({ ...prev, partner_manager_id: value }))}>
          <SelectTrigger>
            <SelectValue placeholder="Select partner manager" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No Partner Manager</SelectItem>
            {partnerManagers.map((manager) => (
              <SelectItem key={manager.user_id} value={manager.user_id}>
                {manager.first_name && manager.last_name 
                  ? `${manager.first_name} ${manager.last_name}` 
                  : manager.user_id}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div>
        <Label htmlFor="slackChannel">Slack Channel URL</Label>
        <Input
          id="slackChannel"
          value={formData.slack_channel_url}
          onChange={(e) => setFormData(prev => ({ ...prev, slack_channel_url: e.target.value }))}
          placeholder="https://slack.com/channels/..."
          type="url"
        />
      </div>
      
      <div className="flex items-center space-x-2">
        <Checkbox
          id="inOnboarding"
          checked={formData.is_in_onboarding}
          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_in_onboarding: checked === true }))}
        />
        <Label htmlFor="inOnboarding">Company is in onboarding stage</Label>
      </div>
      
      <div className="flex space-x-2 pt-4">
        <Button type="submit" disabled={!formData.name.trim()}>
          Save Changes
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
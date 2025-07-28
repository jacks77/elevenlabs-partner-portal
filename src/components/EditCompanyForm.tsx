import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

interface Company {
  id: string;
  name: string;
  partner_salesforce_record?: string;
  is_in_onboarding?: boolean;
  track?: string;
  lead_submission_url?: string;
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
    is_in_onboarding: company.is_in_onboarding || false
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
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
            <SelectItem value="">No Track</SelectItem>
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
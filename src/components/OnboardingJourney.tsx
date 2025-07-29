import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Circle, Calendar, Users, Target, Trophy } from 'lucide-react';

interface OnboardingCompany {
  id: string;
  name: string;
  track?: string;
  kickoff_call_date?: string;
  technical_enablement_date?: string;
  first_lead_registered?: boolean;
  first_closed_won?: boolean;
}

interface OnboardingJourneyProps {
  companyId: string;
}

export default function OnboardingJourney({ companyId }: OnboardingJourneyProps) {
  const [company, setCompany] = useState<OnboardingCompany | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCompanyData();
  }, [companyId]);

  const fetchCompanyData = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name, track, kickoff_call_date, technical_enablement_date, first_lead_registered, first_closed_won')
        .eq('id', companyId)
        .eq('is_in_onboarding', true)
        .single();

      if (error) throw error;
      setCompany(data);
    } catch (error) {
      console.error('Error fetching company data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStageStatus = (stage: string) => {
    if (!company) return 'pending';
    
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day for accurate comparison
    
    switch (stage) {
      case 'kickoff':
        if (!company.kickoff_call_date) return 'pending';
        const kickoffDate = new Date(company.kickoff_call_date);
        kickoffDate.setHours(0, 0, 0, 0);
        return kickoffDate <= today ? 'completed' : 'scheduled';
      case 'technical':
        if (!company.technical_enablement_date) return 'pending';
        const techDate = new Date(company.technical_enablement_date);
        techDate.setHours(0, 0, 0, 0);
        return techDate <= today ? 'completed' : 'scheduled';
      case 'first_lead':
        return company.first_lead_registered ? 'completed' : 'pending';
      case 'first_closed':
        return company.first_closed_won ? 'completed' : 'pending';
      default:
        return 'pending';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not scheduled';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getCompletedStages = () => {
    if (!company) return 0;
    let completed = 0;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Only count as completed if the date has passed
    if (company.kickoff_call_date) {
      const kickoffDate = new Date(company.kickoff_call_date);
      kickoffDate.setHours(0, 0, 0, 0);
      if (kickoffDate <= today) completed++;
    }
    if (company.technical_enablement_date) {
      const techDate = new Date(company.technical_enablement_date);
      techDate.setHours(0, 0, 0, 0);
      if (techDate <= today) completed++;
    }
    if (company.first_lead_registered) completed++;
    if (company.first_closed_won) completed++;
    return completed;
  };

  const getProgressPercentage = () => {
    return (getCompletedStages() / 4) * 100;
  };

  if (loading) {
    return (
      <Card className="shadow-card">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-muted rounded w-1/2"></div>
            <div className="h-4 bg-muted rounded w-1/3"></div>
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-16 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!company) {
    return null; // Don't show anything if company is not in onboarding
  }

  return (
    <Card className="shadow-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              {company.name}'s Onboarding Journey
            </CardTitle>
            <CardDescription className="text-lg">
              Partner onboarding progress tracker
            </CardDescription>
          </div>
          <div className="text-right">
            {company.track && (
              <Badge variant="secondary" className="mb-2">{company.track}</Badge>
            )}
            <div className="text-sm text-muted-foreground">
              {getCompletedStages()} of 4 stages completed
            </div>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full bg-muted rounded-full h-3 mt-4">
          <div
            className="bg-gradient-primary h-3 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${getProgressPercentage()}%` }}
          ></div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Stage 1: Kick-off Call */}
        <div className={`p-4 rounded-lg border-2 transition-all duration-300 ${
          getStageStatus('kickoff') === 'completed' 
            ? 'border-green-500 bg-green-50 dark:bg-green-950/20' 
            : getStageStatus('kickoff') === 'scheduled'
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
            : 'border-border bg-card'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {getStageStatus('kickoff') === 'completed' ? (
                <CheckCircle className="h-8 w-8 text-green-500" />
              ) : getStageStatus('kickoff') === 'scheduled' ? (
                <Calendar className="h-8 w-8 text-blue-500" />
              ) : (
                <Circle className="h-8 w-8 text-muted-foreground" />
              )}
              <div>
                <h3 className="font-semibold text-lg flex items-center">
                  <Calendar className="h-5 w-5 mr-2" />
                  Kick-off Call
                </h3>
                <p className="text-sm text-muted-foreground">
                  Initial partnership discussion and planning
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">
                {formatDate(company.kickoff_call_date)}
              </p>
              {getStageStatus('kickoff') === 'completed' && (
                <Badge variant="default" className="mt-1">Completed</Badge>
              )}
              {getStageStatus('kickoff') === 'scheduled' && (
                <Badge variant="secondary" className="mt-1 bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">Scheduled</Badge>
              )}
            </div>
          </div>
        </div>

        {/* Stage 2: Technical Enablement */}
        <div className={`p-4 rounded-lg border-2 transition-all duration-300 ${
          getStageStatus('technical') === 'completed' 
            ? 'border-green-500 bg-green-50 dark:bg-green-950/20' 
            : getStageStatus('technical') === 'scheduled'
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
            : 'border-border bg-card'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {getStageStatus('technical') === 'completed' ? (
                <CheckCircle className="h-8 w-8 text-green-500" />
              ) : getStageStatus('technical') === 'scheduled' ? (
                <Calendar className="h-8 w-8 text-blue-500" />
              ) : (
                <Circle className="h-8 w-8 text-muted-foreground" />
              )}
              <div>
                <h3 className="font-semibold text-lg flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  Technical Enablement
                </h3>
                <p className="text-sm text-muted-foreground">
                  Technical setup and integration training
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">
                {formatDate(company.technical_enablement_date)}
              </p>
              {getStageStatus('technical') === 'completed' && (
                <Badge variant="default" className="mt-1">Completed</Badge>
              )}
              {getStageStatus('technical') === 'scheduled' && (
                <Badge variant="secondary" className="mt-1 bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">Scheduled</Badge>
              )}
            </div>
          </div>
        </div>

        {/* Stage 3: First Lead Registered */}
        <div className={`p-4 rounded-lg border-2 transition-all duration-300 ${
          getStageStatus('first_lead') === 'completed' 
            ? 'border-green-500 bg-green-50 dark:bg-green-950/20' 
            : 'border-border bg-card'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {getStageStatus('first_lead') === 'completed' ? (
                <CheckCircle className="h-8 w-8 text-green-500" />
              ) : (
                <Circle className="h-8 w-8 text-muted-foreground" />
              )}
              <div>
                <h3 className="font-semibold text-lg flex items-center">
                  <Target className="h-5 w-5 mr-2" />
                  First Lead Registered
                </h3>
                <p className="text-sm text-muted-foreground">
                  First potential customer identified and registered
                </p>
              </div>
            </div>
            <div className="text-right">
              {getStageStatus('first_lead') === 'completed' ? (
                <Badge variant="default" className="mt-1">Completed</Badge>
              ) : (
                <Badge variant="outline" className="mt-1">Pending</Badge>
              )}
            </div>
          </div>
        </div>

        {/* Stage 4: First Closed/Won */}
        <div className={`p-4 rounded-lg border-2 transition-all duration-300 ${
          getStageStatus('first_closed') === 'completed' 
            ? 'border-green-500 bg-green-50 dark:bg-green-950/20' 
            : 'border-border bg-card'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {getStageStatus('first_closed') === 'completed' ? (
                <CheckCircle className="h-8 w-8 text-green-500" />
              ) : (
                <Circle className="h-8 w-8 text-muted-foreground" />
              )}
              <div>
                <h3 className="font-semibold text-lg flex items-center">
                  <Trophy className="h-5 w-5 mr-2" />
                  First Closed/Won
                </h3>
                <p className="text-sm text-muted-foreground">
                  First successful deal closure and revenue generation
                </p>
              </div>
            </div>
            <div className="text-right">
              {getStageStatus('first_closed') === 'completed' ? (
                <Badge variant="default" className="mt-1">Completed</Badge>
              ) : (
                <Badge variant="outline" className="mt-1">Pending</Badge>
              )}
            </div>
          </div>
        </div>

        {/* Completion Message */}
        {getCompletedStages() === 4 && (
          <div className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 rounded-lg border border-green-200 dark:border-green-800">
            <div className="text-center">
              <Trophy className="h-12 w-12 text-green-500 mx-auto mb-3" />
              <h3 className="text-xl font-bold text-green-700 dark:text-green-400 mb-2">
                Onboarding Complete! 🎉
              </h3>
              <p className="text-green-600 dark:text-green-300">
                Congratulations! You've successfully completed all onboarding milestones.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
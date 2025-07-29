import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink } from "lucide-react";

export default function LeadSubmission() {
  const [leadSubmissionUrl, setLeadSubmissionUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { user, memberships } = useAuth();

  useEffect(() => {
    fetchLeadSubmissionUrl();
  }, [user, memberships]);

  const fetchLeadSubmissionUrl = async () => {
    try {
      // Get the user's company (first approved membership)
      const userCompany = memberships?.find(m => m.is_approved);
      
      if (!userCompany) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("companies")
        .select("lead_submission_url")
        .eq("id", userCompany.company_id)
        .single();

      if (error) throw error;
      
      setLeadSubmissionUrl(data?.lead_submission_url || null);
    } catch (error) {
      console.error("Error fetching lead submission URL:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">Loading lead submission form...</p>
        </div>
      </div>
    );
  }

  if (!leadSubmissionUrl) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader className="text-center">
            <CardTitle>Lead Submission</CardTitle>
            <CardDescription>
              Submit your leads through our partner portal
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-4">
              No lead submission form has been configured for your company yet.
            </p>
            <p className="text-sm text-muted-foreground">
              Please contact your administrator to set up the lead submission URL.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50">
      {/* Navigation overlay */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold">Lead Submission</h1>
            <a
              href={leadSubmissionUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-primary hover:underline text-sm"
            >
              <ExternalLink className="h-4 w-4" />
              Open in new window
            </a>
          </div>
        </div>
      </div>
      
      {/* Full-screen iframe with top margin for nav */}
      <iframe
        src={leadSubmissionUrl}
        className="w-full h-full pt-16"
        title="Lead Submission Form"
        frameBorder="0"
        style={{ marginTop: '60px', height: 'calc(100vh - 60px)' }}
      />
    </div>
  );
}
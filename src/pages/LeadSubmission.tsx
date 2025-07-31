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
      
      const url = data?.lead_submission_url;
      setLeadSubmissionUrl(url);
      
      // Redirect directly to the Feathery form
      if (url) {
        window.location.href = url;
      }
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

  // This should not render since we redirect automatically
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Redirecting...</h1>
        <p className="text-muted-foreground">
          You should be redirected to the lead submission form automatically.
        </p>
        <div className="mt-4">
          <a
            href={leadSubmissionUrl}
            className="inline-flex items-center gap-2 text-primary hover:underline"
          >
            <ExternalLink className="h-4 w-4" />
            Click here if not redirected automatically
          </a>
        </div>
      </div>
    </div>
  );
}
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pin, ExternalLink, Link as LinkIcon, FileText } from "lucide-react";
import { ContentItem, PinnedContent as PinnedContentType } from "@/types/content";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAnalytics } from "@/hooks/useAnalytics";
import { toast } from "@/hooks/use-toast";

interface PinnedContentProps {
  className?: string;
}

export default function PinnedContent({ className }: PinnedContentProps) {
  const [pinnedItems, setPinnedItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { trackLinkClick } = useAnalytics();

  useEffect(() => {
    if (user) {
      fetchPinnedContent();
    }
  }, [user]);

  const fetchPinnedContent = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Get pinned content IDs
      const { data: pinnedData, error: pinnedError } = await supabase
        .from('pinned_content')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (pinnedError) throw pinnedError;

      if (!pinnedData || pinnedData.length === 0) {
        setPinnedItems([]);
        return;
      }

      // Fetch actual content items
      const linkIds = pinnedData.filter(p => p.content_type === 'link').map(p => p.content_id);
      const documentIds = pinnedData.filter(p => p.content_type === 'document').map(p => p.content_id);

      const promises = [];

      if (linkIds.length > 0) {
        promises.push(
          supabase
            .from('links')
            .select('*')
            .in('id', linkIds)
        );
      }

      if (documentIds.length > 0) {
        promises.push(
          supabase
            .from('documents')
            .select('*')
            .in('id', documentIds)
        );
      }

      const results = await Promise.all(promises);
      const items: ContentItem[] = [];

      if (linkIds.length > 0 && results[0]) {
        const { data: links } = results[0];
        if (links) {
          items.push(...links.map(link => ({ ...link, type: 'link' as const })));
        }
      }

      if (documentIds.length > 0) {
        const docResultIndex = linkIds.length > 0 ? 1 : 0;
        if (results[docResultIndex]) {
          const { data: documents } = results[docResultIndex];
          if (documents) {
            items.push(...documents.map(doc => ({ 
              ...doc, 
              url: doc.drive_url,
              type: 'document' as const 
            })));
          }
        }
      }

      // Sort by pin order
      const sortedItems = items.sort((a, b) => {
        const aPin = pinnedData.find(p => p.content_id === a.id);
        const bPin = pinnedData.find(p => p.content_id === b.id);
        return new Date(bPin?.created_at || 0).getTime() - new Date(aPin?.created_at || 0).getTime();
      });

      setPinnedItems(sortedItems);
    } catch (error) {
      console.error('Error fetching pinned content:', error);
      toast({
        title: "Error",
        description: "Failed to load pinned content",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUnpin = async (item: ContentItem) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('pinned_content')
        .delete()
        .eq('user_id', user.id)
        .eq('content_type', item.type)
        .eq('content_id', item.id);

      if (error) throw error;

      setPinnedItems(prev => prev.filter(p => p.id !== item.id));
      
      toast({
        title: "Unpinned",
        description: `${item.title} has been unpinned`,
      });
    } catch (error) {
      console.error('Error unpinning content:', error);
      toast({
        title: "Error",
        description: "Failed to unpin content",
        variant: "destructive",
      });
    }
  };

  const handleOpen = (item: ContentItem) => {
    if (item.type === 'link') {
      trackLinkClick(item.id);
    }
    window.open(item.url, '_blank');
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Pin className="h-5 w-5" />
            Pinned Content
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">Loading pinned content...</div>
        </CardContent>
      </Card>
    );
  }

  if (pinnedItems.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Pin className="h-5 w-5" />
            Pinned Content
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">
            <Pin className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No pinned content yet</p>
            <p className="text-sm">Pin your favorite resources from the Content page</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Pin className="h-5 w-5" />
          Pinned Content
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {pinnedItems.slice(0, 6).map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {item.type === 'link' ? (
                  <LinkIcon className="h-4 w-4 text-primary flex-shrink-0" />
                ) : (
                  <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                )}
                
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm truncate">{item.title}</h4>
                  <div className="flex items-center gap-1 mt-1">
                    {item.job_category && (
                      <Badge variant="outline" className="text-xs">
                        {item.job_category}
                      </Badge>
                    )}
                    {item.content_type && (
                      <Badge variant="secondary" className="text-xs">
                        {item.content_type}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 ml-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleOpen(item)}
                  className="h-8 w-8 p-0"
                >
                  <ExternalLink className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleUnpin(item)}
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                >
                  <Pin className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
          
          {pinnedItems.length > 6 && (
            <div className="col-span-full text-center text-sm text-muted-foreground pt-2">
              +{pinnedItems.length - 6} more pinned items
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
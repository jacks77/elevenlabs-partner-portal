import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, FileText, ExternalLink, Star, HelpCircle, MessageSquare, Calendar } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAnalytics } from "@/hooks/useAnalytics";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { ContentItem, Company, PartnerManager, PinnedContent as PinnedContentType } from "@/types/content";
import SmartSearch, { SearchFilters } from "@/components/SmartSearch";
import ContentCard from "@/components/ContentCard";
import ContentFilters from "@/components/ContentFilters";
import AddContentDialog from "@/components/AddContentDialog";
import EditContentDialog from "@/components/EditContentDialog";

export default function ContentHub() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<ContentItem[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [partnerManager, setPartnerManager] = useState<PartnerManager | null>(null);
  const [pinnedContentIds, setPinnedContentIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ContentItem | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState<SearchFilters>({});
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("all");

  const { user, profile, memberships } = useAuth();
  const { trackLinkClick } = useAnalytics();

  const canManageContent = profile?.is_super_admin || memberships?.some(m => m.is_admin && m.is_approved);
  const userCompany = memberships?.find(m => m.is_approved);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (user) {
      fetchPinnedContent();
      fetchPartnerManager();
    }
  }, [user, userCompany]);

  useEffect(() => {
    filterContent();
  }, [items, searchTerm, filters, selectedTags, activeTab]);

  const fetchData = async () => {
    try {
      await Promise.all([
        fetchItems(),
        fetchCompanies()
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchItems = async () => {
    try {
      // Fetch links (exclude drafts for non-admins)
      const linksQuery = supabase
        .from("links")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (!canManageContent) {
        linksQuery.neq('status', 'draft');
      }
      
      const { data: linksData, error: linksError } = await linksQuery;

      if (linksError) throw linksError;

      // Fetch documents (exclude drafts for non-admins)
      const documentsQuery = supabase
        .from("documents")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (!canManageContent) {
        documentsQuery.neq('status', 'draft');
      }
      
      const { data: documentsData, error: documentsError } = await documentsQuery;

      if (documentsError) throw documentsError;

      // Combine and mark type
      const combinedItems: ContentItem[] = [
        ...(linksData || []).map(item => ({ ...item, type: 'link' as const })),
        ...(documentsData || []).map(item => ({ ...item, url: item.drive_url, type: 'document' as const }))
      ].sort((a, b) => {
        // Featured content first, then by date
        if (a.is_featured && !b.is_featured) return -1;
        if (!a.is_featured && b.is_featured) return 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      setItems(combinedItems);

      // Extract unique tags
      const tags = new Set<string>();
      combinedItems.forEach(item => item.tags?.forEach(tag => tags.add(tag)));
      setAllTags(Array.from(tags).sort());
    } catch (error) {
      console.error("Error fetching content:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load content"
      });
    }
  };

  const fetchCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from("companies")
        .select("id, name, partner_manager_id")
        .order("name");

      if (error) throw error;
      setCompanies(data || []);
    } catch (error) {
      console.error("Error fetching companies:", error);
    }
  };

  const fetchPinnedContent = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('pinned_content')
        .select('content_id')
        .eq('user_id', user.id);

      if (error) throw error;
      
      const pinnedIds = new Set(data?.map(p => p.content_id) || []);
      setPinnedContentIds(pinnedIds);
    } catch (error) {
      console.error('Error fetching pinned content:', error);
    }
  };

  const fetchPartnerManager = async () => {
    if (!userCompany?.company_id) return;

    try {
      const company = companies.find(c => c.id === userCompany.company_id);
      if (!company?.partner_manager_id) return;

      const { data, error } = await supabase
        .rpc('get_partner_manager_profile', { manager_id: company.partner_manager_id });

      if (error) throw error;
      
      if (data && data.length > 0) {
        setPartnerManager(data[0]);
      }
    } catch (error) {
      console.error('Error fetching partner manager:', error);
    }
  };

  const filterContent = () => {
    let filtered = items;

    // Filter by job category tab
    if (activeTab !== "all") {
      filtered = filtered.filter(item => item.job_category === activeTab);
    }

    // Filter by search term with synonym support
    if (searchTerm) {
      const synonyms: Record<string, string[]> = {
        'voice cloning': ['voice ai', 'voice synthesis', 'speech synthesis'],
        'tts': ['text to speech', 'speech synthesis'],
        'stt': ['speech to text', 'transcription'],
        'api': ['integration', 'sdk', 'developer'],
        'pricing': ['cost', 'price', 'billing'],
        'demo': ['example', 'sample', 'tutorial']
      };

      const searchTerms = [searchTerm.toLowerCase()];
      Object.entries(synonyms).forEach(([key, values]) => {
        if (key.includes(searchTerm.toLowerCase()) || values.some(v => v.includes(searchTerm.toLowerCase()))) {
          searchTerms.push(key, ...values);
        }
      });

      filtered = filtered.filter(item =>
        searchTerms.some(term =>
          item.title.toLowerCase().includes(term) ||
          item.description?.toLowerCase().includes(term) ||
          item.tags?.some(tag => tag.toLowerCase().includes(term))
        )
      );
    }

    // Apply filters
    if (filters.persona && filters.persona.length > 0) {
      filtered = filtered.filter(item => 
        item.persona?.some(p => filters.persona!.includes(p))
      );
    }

    if (filters.product_area && filters.product_area.length > 0) {
      filtered = filtered.filter(item => 
        item.product_area?.some(p => filters.product_area!.includes(p))
      );
    }

    if (filters.content_type) {
      filtered = filtered.filter(item => item.content_type === filters.content_type);
    }

    if (filters.level) {
      filtered = filtered.filter(item => item.level === filters.level);
    }

    if (filters.is_featured) {
      filtered = filtered.filter(item => item.is_featured);
    }

    // Filter by selected tags
    if (selectedTags.length > 0) {
      filtered = filtered.filter(item =>
        selectedTags.every(tag => item.tags?.includes(tag))
      );
    }

    setFilteredItems(filtered);
  };

  const handleItemClick = (item: ContentItem) => {
    if (item.type === 'link') {
      trackLinkClick(item.id);
    }
    window.open(item.url, '_blank');
  };

  const handlePin = async (item: ContentItem) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('pinned_content')
        .insert({
          user_id: user.id,
          content_type: item.type,
          content_id: item.id
        });

      if (error) throw error;

      setPinnedContentIds(prev => new Set([...prev, item.id]));
      
      toast({
        title: "Pinned",
        description: `${item.title} has been pinned to your dashboard`,
      });
    } catch (error) {
      console.error('Error pinning content:', error);
      toast({
        title: "Error",
        description: "Failed to pin content",
        variant: "destructive",
      });
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

      setPinnedContentIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(item.id);
        return newSet;
      });
      
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

  const handleDelete = async (id: string, type: 'link' | 'document') => {
    try {
      const { error } = await supabase
        .from(type === 'link' ? 'links' : 'documents')
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `${type === 'link' ? 'Link' : 'Document'} deleted successfully`
      });
      fetchItems();
    } catch (error) {
      console.error("Error deleting content:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to delete ${type}`
      });
    }
  };

  const handleEdit = (item: ContentItem) => {
    setEditingItem(item);
    setIsEditDialogOpen(true);
  };

  const getCompanyName = (companyId?: string) => {
    if (!companyId) return "Global";
    const company = companies.find(c => c.id === companyId);
    return company?.name || "Unknown Company";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">Loading content...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">Partner Resource Hub</h1>
          <p className="text-xl text-muted-foreground">
            Everything you need to succeed with ElevenLabs
          </p>
        </div>
        
        <div className="flex gap-2 mt-4 md:mt-0">
          {partnerManager && (
            <Button
              variant="outline"
              onClick={() => window.open(`mailto:${partnerManager.first_name}@elevenlabs.io`, '_blank')}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Contact Partner Manager
            </Button>
          )}
          
          {partnerManager?.scheduling_link && (
            <Button
              variant="outline"
              onClick={() => window.open(partnerManager.scheduling_link!, '_blank')}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Book a Call
            </Button>
          )}

          {canManageContent && (
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Content
            </Button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <SmartSearch
          onSearch={(term, searchFilters) => {
            setSearchTerm(term);
            setFilters(searchFilters);
          }}
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          items={items}
          loading={loading}
        />
      </div>

      {/* Job Categories Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">All Content</TabsTrigger>
          <TabsTrigger value="sell">Sell</TabsTrigger>
          <TabsTrigger value="integrate">Integrate</TabsTrigger>
          <TabsTrigger value="market">Market</TabsTrigger>
          <TabsTrigger value="support">Support</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <p className="text-muted-foreground mb-4">
            Browse all available resources and content
          </p>
        </TabsContent>
        
        <TabsContent value="sell">
          <p className="text-muted-foreground mb-4">
            Pitch decks, battlecards, pricing guidance, and sales enablement materials
          </p>
        </TabsContent>
        
        <TabsContent value="integrate">
          <p className="text-muted-foreground mb-4">
            SDKs, API keys, reference apps, and technical integration resources
          </p>
        </TabsContent>
        
        <TabsContent value="market">
          <p className="text-muted-foreground mb-4">
            Co-branding materials, campaigns, logos, and brand guidelines
          </p>
        </TabsContent>
        
        <TabsContent value="support">
          <p className="text-muted-foreground mb-4">
            FAQ, SLA information, contact routes, and support resources
          </p>
        </TabsContent>
      </Tabs>

      {/* Filters */}
      <div className="mb-6">
        <ContentFilters
          filters={filters}
          onFiltersChange={setFilters}
          availableTags={allTags}
          selectedTags={selectedTags}
          onTagsChange={setSelectedTags}
        />
      </div>

      {/* Content Grid */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-12">
          {items.length === 0 ? (
            <div>
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No content available</h3>
              <p className="text-muted-foreground mb-4">
                {canManageContent 
                  ? "Start by adding some resources to share with your team."
                  : "Check back later for useful resources and documents."
                }
              </p>
            </div>
          ) : (
            <div>
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No content matches your filters</h3>
              <p className="text-muted-foreground mb-4">
                Try adjusting your search terms or filters to find what you're looking for.
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm("");
                  setFilters({});
                  setSelectedTags([]);
                  setActiveTab("all");
                }}
              >
                Clear all filters
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((item) => (
            <ContentCard
              key={item.id}
              item={item}
              companyName={getCompanyName(item.company_id)}
              canManage={canManageContent}
              isPinned={pinnedContentIds.has(item.id)}
              onOpen={handleItemClick}
              onDelete={handleDelete}
              onPin={handlePin}
              onUnpin={handleUnpin}
              onEdit={handleEdit}
            />
          ))}
        </div>
      )}

      {/* Add Content Dialog */}
      {canManageContent && (
        <AddContentDialog
          open={isAddDialogOpen}
          onOpenChange={setIsAddDialogOpen}
          companies={companies}
          onSuccess={fetchItems}
          availableTags={allTags}
        />
      )}

      {/* Edit Content Dialog */}
      {canManageContent && (
        <EditContentDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          companies={companies}
          onSuccess={fetchItems}
          item={editingItem}
          availableTags={allTags}
        />
      )}
    </div>
  );
}
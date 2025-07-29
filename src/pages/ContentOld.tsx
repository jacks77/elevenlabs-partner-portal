import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Plus, Search, X, ExternalLink, FileText, Link } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAnalytics } from "@/hooks/useAnalytics";

interface ContentItem {
  id: string;
  title: string;
  url?: string;
  drive_url?: string;
  company_id?: string;
  tags: string[];
  created_at: string;
  type: 'link' | 'document';
}

interface Company {
  id: string;
  name: string;
}

export default function Content() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [filteredItems, setFilteredItems] = useState<ContentItem[]>([]);

  const [newItem, setNewItem] = useState({
    type: 'link' as 'link' | 'document',
    title: "",
    url: "",
    company_id: "",
    tags: [] as string[]
  });
  const [newTag, setNewTag] = useState("");
  const [open, setOpen] = useState(false);

  const { user, profile, memberships } = useAuth();
  const { trackLinkClick } = useAnalytics();

  const canManageContent = profile?.is_super_admin || memberships?.some(m => m.is_admin && m.is_approved);

  useEffect(() => {
    fetchItems();
    fetchCompanies();
  }, []);

  useEffect(() => {
    let filtered = items;

    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (selectedTags.length > 0) {
      filtered = filtered.filter(item =>
        selectedTags.every(tag => item.tags.includes(tag))
      );
    }

    setFilteredItems(filtered);
  }, [items, searchTerm, selectedTags]);

  const fetchItems = async () => {
    try {
      // Fetch links
      const { data: linksData, error: linksError } = await supabase
        .from("links")
        .select("id, title, url, company_id, tags, created_at")
        .order("created_at", { ascending: false });

      if (linksError) throw linksError;

      // Fetch documents  
      const { data: documentsData, error: documentsError } = await supabase
        .from("documents")
        .select("id, title, drive_url, company_id, tags, created_at")
        .order("created_at", { ascending: false });

      if (documentsError) throw documentsError;

      // Combine and mark type
      const combinedItems: ContentItem[] = [
        ...(linksData || []).map(item => ({ ...item, type: 'link' as const })),
        ...(documentsData || []).map(item => ({ ...item, url: item.drive_url, type: 'document' as const }))
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setItems(combinedItems);

      // Extract unique tags
      const tags = new Set<string>();
      combinedItems.forEach(item => item.tags.forEach(tag => tags.add(tag)));
      setAllTags(Array.from(tags));
    } catch (error) {
      console.error("Error fetching content:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load content"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from("companies")
        .select("id, name")
        .order("name");

      if (error) throw error;
      setCompanies(data || []);
    } catch (error) {
      console.error("Error fetching companies:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newItem.title || !newItem.url) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please fill in all required fields"
      });
      return;
    }

    try {
      const itemData = {
        title: newItem.title,
        [newItem.type === 'link' ? 'url' : 'drive_url']: newItem.url,
        company_id: newItem.company_id || null,
        tags: newItem.tags
      };

      const { error } = await supabase
        .from(newItem.type === 'link' ? 'links' : 'documents')
        .insert([itemData]);

      if (error) throw error;

      toast({
        title: "Success",
        description: `${newItem.type === 'link' ? 'Link' : 'Document'} added successfully`
      });
      setIsDialogOpen(false);
      setNewItem({ type: 'link', title: "", url: "", company_id: "", tags: [] });
      fetchItems();
    } catch (error) {
      console.error("Error adding content:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to add ${newItem.type}`
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

  const handleItemClick = (item: ContentItem) => {
    if (item.type === 'link') {
      trackLinkClick(item.id);
    }
    window.open(item.url, '_blank');
  };

  const getCompanyName = (companyId?: string) => {
    if (!companyId) return "Global";
    const company = companies.find(c => c.id === companyId);
    return company?.name || "Unknown Company";
  };

  const addTag = () => {
    if (newTag && !newItem.tags.includes(newTag)) {
      setNewItem(prev => ({
        ...prev,
        tags: [...prev.tags, newTag]
      }));
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setNewItem(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const toggleTagFilter = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedTags([]);
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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Content</h1>
          <p className="text-muted-foreground">
            Quick access to important links and documents for your work.
          </p>
        </div>
        
        {canManageContent && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="mt-4 md:mt-0">
                <Plus className="h-4 w-4 mr-2" />
                Add Content
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Content</DialogTitle>
                <DialogDescription>
                  Add a new link or document to the content library.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Type</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={newItem.type === 'link' ? 'default' : 'outline'}
                      onClick={() => setNewItem(prev => ({ ...prev, type: 'link' }))}
                      className="flex-1"
                    >
                      <Link className="h-4 w-4 mr-2" />
                      Link
                    </Button>
                    <Button
                      type="button"
                      variant={newItem.type === 'document' ? 'default' : 'outline'}
                      onClick={() => setNewItem(prev => ({ ...prev, type: 'document' }))}
                      className="flex-1"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Document
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    placeholder="Enter title"
                    value={newItem.title}
                    onChange={(e) => setNewItem(prev => ({ ...prev, title: e.target.value }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="url">{newItem.type === 'link' ? 'URL' : 'Document URL'}</Label>
                  <Input
                    id="url"
                    type="url"
                    placeholder={`Enter ${newItem.type === 'link' ? 'URL' : 'document URL'}`}
                    value={newItem.url}
                    onChange={(e) => setNewItem(prev => ({ ...prev, url: e.target.value }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company">Company (Optional)</Label>
                  <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className="w-full justify-between"
                      >
                        {newItem.company_id
                          ? companies.find(company => company.id === newItem.company_id)?.name
                          : "Select company..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                      <Command>
                        <CommandInput placeholder="Search companies..." />
                        <CommandList>
                          <CommandEmpty>No company found.</CommandEmpty>
                          <CommandGroup>
                            <CommandItem
                              value=""
                              onSelect={() => {
                                setNewItem(prev => ({ ...prev, company_id: "" }));
                                setOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  newItem.company_id === "" ? "opacity-100" : "opacity-0"
                                )}
                              />
                              Global (No Company)
                            </CommandItem>
                            {companies.map((company) => (
                              <CommandItem
                                key={company.id}
                                value={company.name}
                                onSelect={() => {
                                  setNewItem(prev => ({ ...prev, company_id: company.id }));
                                  setOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    newItem.company_id === company.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {company.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Tags</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a tag"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addTag();
                        }
                      }}
                    />
                    <Button type="button" onClick={addTag} variant="outline">
                      Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {newItem.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="text-xs hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button type="submit" className="flex-1">Add Content</Button>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Search and Filter Section */}
      <div className="mb-6 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search content..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {allTags.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Filter by tags:</Label>
              {(searchTerm || selectedTags.length > 0) && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Clear filters
                </Button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {allTags.map((tag) => (
                <Badge
                  key={tag}
                  variant={selectedTags.includes(tag) ? "default" : "outline"}
                  className="cursor-pointer hover:bg-primary/80"
                  onClick={() => toggleTagFilter(tag)}
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}
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
                  ? "Start by adding some links or documents to share with your team."
                  : "Check back later for useful links and documents."
                }
              </p>
            </div>
          ) : (
            <div>
              <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No content matches your search</h3>
              <p className="text-muted-foreground">Try adjusting your search terms or filters.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <Card key={item.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {item.type === 'link' ? (
                      <Link className="h-5 w-5 text-primary" />
                    ) : (
                      <FileText className="h-5 w-5 text-primary" />
                    )}
                    <CardTitle className="text-lg leading-tight">{item.title}</CardTitle>
                  </div>
                  {canManageContent && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(item.id, item.type);
                      }}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <CardDescription>
                  {getCompanyName(item.company_id)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {item.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => handleItemClick(item)}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open {item.type === 'link' ? 'Link' : 'Document'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
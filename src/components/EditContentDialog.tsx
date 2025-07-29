import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Plus, X, Check, ChevronsUpDown, Link as LinkIcon, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Company, ContentItem, JOB_CATEGORIES, PERSONAS, PRODUCT_AREAS, REGIONS, CONTENT_TYPES, LEVELS, STATUS_OPTIONS } from "@/types/content";

interface EditContentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companies: Company[];
  onSuccess: () => void;
  item: ContentItem | null;
  availableTags?: string[];
}

interface EditContent {
  type: 'link' | 'document';
  title: string;
  description: string;
  url: string;
  company_id: string;
  tags: string[];
  persona: string[];
  job_category: string;
  product_area: string[];
  region: string[];
  content_type: string;
  level: string;
  status: string;
  version: string;
  is_featured: boolean;
  youtube_id: string;
}

export default function EditContentDialog({ open, onOpenChange, companies, onSuccess, item, availableTags = [] }: EditContentDialogProps) {
  const [editContent, setEditContent] = useState<EditContent>({
    type: 'link',
    title: "",
    description: "",
    url: "",
    company_id: "",
    tags: [],
    persona: [],
    job_category: "",
    product_area: [],
    region: [],
    content_type: "",
    level: "",
    status: "current",
    version: "",
    is_featured: false,
    youtube_id: ""
  });
  
  const [newTag, setNewTag] = useState("");
  const [companySelectOpen, setCompanySelectOpen] = useState(false);
  const [tagSelectOpen, setTagSelectOpen] = useState(false);

  // Initialize form with item data when dialog opens
  useEffect(() => {
    if (item && open) {
      setEditContent({
        type: item.type,
        title: item.title || "",
        description: item.description || "",
        url: item.url || item.drive_url || "",
        company_id: item.company_id || "",
        tags: item.tags || [],
        persona: item.persona || [],
        job_category: item.job_category || "",
        product_area: item.product_area || [],
        region: item.region || [],
        content_type: item.content_type || "",
        level: item.level || "",
        status: item.status || "current",
        version: item.version || "",
        is_featured: item.is_featured || false,
        youtube_id: item.youtube_id || ""
      });
    }
  }, [item, open]);

  const extractYouTubeId = (url: string) => {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editContent.title || !editContent.url || !item) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please fill in all required fields"
      });
      return;
    }

    try {
      // Extract YouTube ID if it's a YouTube video
      const youtubeId = editContent.url.includes('youtube.com') || editContent.url.includes('youtu.be') 
        ? extractYouTubeId(editContent.url) 
        : editContent.youtube_id;

      const contentData = {
        title: editContent.title,
        description: editContent.description || null,
        [editContent.type === 'link' ? 'url' : 'drive_url']: editContent.url,
        company_id: editContent.company_id || null,
        tags: editContent.tags,
        persona: editContent.persona.length > 0 ? editContent.persona : null,
        job_category: editContent.job_category || null,
        product_area: editContent.product_area.length > 0 ? editContent.product_area : null,
        region: editContent.region.length > 0 ? editContent.region : null,
        content_type: editContent.content_type || null,
        level: editContent.level || null,
        status: editContent.status,
        version: editContent.version || null,
        is_featured: editContent.is_featured,
        ...(editContent.type === 'link' && youtubeId && { youtube_id: youtubeId })
      };

      const { error } = await supabase
        .from(editContent.type === 'link' ? 'links' : 'documents')
        .update(contentData)
        .eq('id', item.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `${editContent.type === 'link' ? 'Link' : 'Document'} updated successfully`
      });

      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Error updating content:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to update ${editContent.type}`
      });
    }
  };

  const addTag = (tag: string) => {
    if (tag && !editContent.tags.includes(tag)) {
      setEditContent(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }));
    }
  };

  const addNewTag = () => {
    if (newTag && !editContent.tags.includes(newTag)) {
      addTag(newTag);
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setEditContent(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const toggleArrayValue = (key: keyof EditContent, value: string) => {
    setEditContent(prev => {
      const currentArray = (prev[key] as string[]) || [];
      const newArray = currentArray.includes(value)
        ? currentArray.filter(item => item !== value)
        : [...currentArray, value];
      return { ...prev, [key]: newArray };
    });
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Content</DialogTitle>
          <DialogDescription>
            Update the properties of this {item.type === 'link' ? 'link' : 'document'}.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Type Display (read-only) */}
          <div className="space-y-2">
            <Label>Content Type</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={editContent.type === 'link' ? 'default' : 'outline'}
                disabled
                className="flex-1"
              >
                <LinkIcon className="h-4 w-4 mr-2" />
                Link
              </Button>
              <Button
                type="button"
                variant={editContent.type === 'document' ? 'default' : 'outline'}
                disabled
                className="flex-1"
              >
                <FileText className="h-4 w-4 mr-2" />
                Document
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Basic Information */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  placeholder="Enter title"
                  value={editContent.title}
                  onChange={(e) => setEditContent(prev => ({ ...prev, title: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Brief description of the content"
                  value={editContent.description}
                  onChange={(e) => setEditContent(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="url">{editContent.type === 'link' ? 'URL' : 'Document URL'} *</Label>
                <Input
                  id="url"
                  type="url"
                  placeholder={`Enter ${editContent.type === 'link' ? 'URL' : 'document URL'}`}
                  value={editContent.url}
                  onChange={(e) => setEditContent(prev => ({ ...prev, url: e.target.value }))}
                  required
                />
              </div>

              {/* Company Selection */}
              <div className="space-y-2">
                <Label>Company (Optional)</Label>
                <Popover open={companySelectOpen} onOpenChange={setCompanySelectOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={companySelectOpen}
                      className="w-full justify-between"
                    >
                      {editContent.company_id
                        ? companies.find(company => company.id === editContent.company_id)?.name
                        : "Global (All Users)"}
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
                              setEditContent(prev => ({ ...prev, company_id: "" }));
                              setCompanySelectOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                editContent.company_id === "" ? "opacity-100" : "opacity-0"
                              )}
                            />
                            Global (All Users)
                          </CommandItem>
                          {companies.map((company) => (
                            <CommandItem
                              key={company.id}
                              value={company.name}
                              onSelect={() => {
                                setEditContent(prev => ({ ...prev, company_id: company.id }));
                                setCompanySelectOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  editContent.company_id === company.id ? "opacity-100" : "opacity-0"
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
            </div>

            {/* Enhanced Categorization */}
            <div className="space-y-4">
              {/* Job Category */}
              <div className="space-y-2">
                <Label>Job Category</Label>
                <Select
                  value={editContent.job_category}
                  onValueChange={(value) => setEditContent(prev => ({ ...prev, job_category: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select job category" />
                  </SelectTrigger>
                  <SelectContent>
                    {JOB_CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Content Type & Level */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label>Content Type</Label>
                  <Select
                    value={editContent.content_type || "none"}
                    onValueChange={(value) => setEditContent(prev => ({ 
                      ...prev, 
                      content_type: value === "none" ? "" : value 
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select content type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Type Selected</SelectItem>
                      {CONTENT_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Level</Label>
                  <Select
                    value={editContent.level || "none"}
                    onValueChange={(value) => setEditContent(prev => ({ 
                      ...prev, 
                      level: value === "none" ? "" : value 
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Level Selected</SelectItem>
                      {LEVELS.map((level) => (
                        <SelectItem key={level} value={level}>
                          {level}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Status & Version */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={editContent.status}
                    onValueChange={(value) => setEditContent(prev => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Version</Label>
                  <Input
                    placeholder="v1.0, 2024.1, etc."
                    value={editContent.version}
                    onChange={(e) => setEditContent(prev => ({ ...prev, version: e.target.value }))}
                  />
                </div>
              </div>

              {/* Featured Toggle */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="featured"
                  checked={editContent.is_featured}
                  onCheckedChange={(checked) => setEditContent(prev => ({ ...prev, is_featured: checked as boolean }))}
                />
                <Label htmlFor="featured">Featured Content</Label>
              </div>
            </div>
          </div>

          {/* Persona Selection */}
          <div className="space-y-2">
            <Label>Target Personas</Label>
            <div className="flex flex-wrap gap-2">
              {PERSONAS.map((persona) => (
                <Badge
                  key={persona}
                  variant={editContent.persona.includes(persona) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleArrayValue('persona', persona)}
                >
                  {persona}
                </Badge>
              ))}
            </div>
          </div>

          {/* Product Areas */}
          <div className="space-y-2">
            <Label>Product Areas</Label>
            <div className="flex flex-wrap gap-2">
              {PRODUCT_AREAS.map((area) => (
                <Badge
                  key={area}
                  variant={editContent.product_area.includes(area) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleArrayValue('product_area', area)}
                >
                  {area}
                </Badge>
              ))}
            </div>
          </div>

          {/* Regions */}
          <div className="space-y-2">
            <Label>Regions</Label>
            <div className="flex flex-wrap gap-2">
              {REGIONS.map((region) => (
                <Badge
                  key={region}
                  variant={editContent.region.includes(region) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleArrayValue('region', region)}
                >
                  {region}
                </Badge>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label>Tags</Label>
            
            {/* Existing Tags Selection */}
            {availableTags.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Select from existing tags:</Label>
                <Popover open={tagSelectOpen} onOpenChange={setTagSelectOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={tagSelectOpen}
                      className="w-full justify-between"
                    >
                      Select existing tags...
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Search tags..." />
                      <CommandList>
                        <CommandEmpty>No tag found.</CommandEmpty>
                        <CommandGroup>
                          {availableTags
                            .filter(tag => !editContent.tags.includes(tag))
                            .map((tag) => (
                            <CommandItem
                              key={tag}
                              value={tag}
                              onSelect={() => {
                                addTag(tag);
                                setTagSelectOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  editContent.tags.includes(tag) ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {tag}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            )}

            {/* Add New Tag */}
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Or add a new tag:</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Add a new tag"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addNewTag();
                    }
                  }}
                />
                <Button type="button" onClick={addNewTag} size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {/* Selected Tags */}
            {editContent.tags.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Selected tags:</Label>
                <div className="flex flex-wrap gap-2">
                  {editContent.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1">
                      {tag}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => removeTag(tag)}
                      />
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* YouTube ID for links */}
          {editContent.type === 'link' && (
            <div className="space-y-2">
              <Label>YouTube ID (Optional)</Label>
              <Input
                placeholder="For YouTube videos, leave empty for auto-detection"
                value={editContent.youtube_id}
                onChange={(e) => setEditContent(prev => ({ ...prev, youtube_id: e.target.value }))}
              />
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">
              Update {editContent.type === 'link' ? 'Link' : 'Document'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { FileText, Plus, ExternalLink, Trash2, Search, X, Tag } from "lucide-react";
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Document {
  id: string;
  title: string;
  drive_url: string;
  company_id: string | null;
  created_at: string;
  tags: string[];
}

export default function Documents() {
  const { user, memberships, profile } = useAuth();
  const { toast } = useToast();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [newDocument, setNewDocument] = useState({
    title: '',
    drive_url: '',
    company_id: null as string | null,
    tags: [] as string[]
  });
  const [currentTag, setCurrentTag] = useState('');

  // Check if user is super admin or company admin
  const isSuperAdmin = profile?.is_super_admin;
  const isCompanyAdmin = memberships?.some(m => m.is_admin && m.is_approved);
  const canManageContent = isSuperAdmin || isCompanyAdmin;

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const documentsData = data || [];
      setDocuments(documentsData);
      
      // Extract all unique tags
      const allTags = new Set<string>();
      documentsData.forEach(doc => {
        if (doc.tags) {
          doc.tags.forEach(tag => allTags.add(tag));
        }
      });
      setAvailableTags(Array.from(allTags).sort());
      
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast({
        title: "Error",
        description: "Failed to load documents",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  // Filter documents based on search term and selected tags
  useEffect(() => {
    let filtered = documents;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(doc =>
        doc.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by selected tags
    if (selectedTags.length > 0) {
      filtered = filtered.filter(doc =>
        selectedTags.every(tag => doc.tags?.includes(tag))
      );
    }

    setFilteredDocuments(filtered);
  }, [documents, searchTerm, selectedTags]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { error } = await supabase
        .from('documents')
        .insert([newDocument]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Document added successfully",
      });

      setNewDocument({ title: '', drive_url: '', company_id: null, tags: [] });
      setCurrentTag('');
      setIsDialogOpen(false);
      fetchDocuments();
    } catch (error) {
      console.error('Error adding document:', error);
      toast({
        title: "Error",
        description: "Failed to add document",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Document deleted successfully",
      });
      
      fetchDocuments();
    } catch (error) {
      console.error('Error deleting document:', error);
      toast({
        title: "Error",
        description: "Failed to delete document",
        variant: "destructive",
      });
    }
  };

  const addTag = () => {
    if (currentTag.trim() && !newDocument.tags.includes(currentTag.trim())) {
      setNewDocument(prev => ({
        ...prev,
        tags: [...prev.tags, currentTag.trim()]
      }));
      setCurrentTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setNewDocument(prev => ({
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
    setSearchTerm('');
    setSelectedTags([]);
  };

  const getCompanyName = (companyId: string | null) => {
    if (!companyId) return 'Global';
    const company = memberships?.find(m => m.company_id === companyId);
    return company?.company?.name || 'Unknown Company';
  };

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="text-center">Loading documents...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1>Documents</h1>
          <p className="text-muted-foreground mt-2">
            Manage shared documents and resources
          </p>
        </div>
        
        {canManageContent && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Document
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Document</DialogTitle>
              <DialogDescription>
                Add a new document or resource link for your team.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={newDocument.title}
                  onChange={(e) => setNewDocument(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Document title"
                  required
                />
              </div>
              <div>
                <Label htmlFor="url">Document URL</Label>
                <Input
                  id="url"
                  type="url"
                  value={newDocument.drive_url}
                  onChange={(e) => setNewDocument(prev => ({ ...prev, drive_url: e.target.value }))}
                  placeholder="https://docs.google.com/..."
                  required
                />
              </div>
              <div>
                <Label htmlFor="company">Company (Optional)</Label>
                <select
                  id="company"
                  className="w-full px-3 py-2 border border-input rounded-md"
                  value={newDocument.company_id || ''}
                  onChange={(e) => setNewDocument(prev => ({ 
                    ...prev, 
                    company_id: e.target.value || null 
                  }))}
                >
                  <option value="">Global (All Users)</option>
                  {memberships?.map(membership => (
                    <option key={membership.company_id} value={membership.company_id}>
                      {membership.company?.name}
                    </option>
                  ))}
                </select>
              </div>
              {canManageContent && (
                <div>
                  <Label htmlFor="tags">Tags</Label>
                  <div className="space-y-2">
                    <div className="flex space-x-2">
                      <Input
                        id="tags"
                        value={currentTag}
                        onChange={(e) => setCurrentTag(e.target.value)}
                        placeholder="Add a tag"
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                      />
                      <Button type="button" onClick={addTag} variant="outline" size="sm">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    {newDocument.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {newDocument.tags.map((tag, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {tag}
                            <button
                              type="button"
                              onClick={() => removeTag(tag)}
                              className="ml-1 text-muted-foreground hover:text-foreground"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Add Document</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        )}
      </div>

      {/* Search and Filter Section */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          {(searchTerm || selectedTags.length > 0) && (
            <Button onClick={clearFilters} variant="outline" size="sm">
              <X className="w-4 h-4 mr-2" />
              Clear Filters
            </Button>
          )}
        </div>

        {/* Available Tags Filter */}
        {availableTags.length > 0 && (
          <div>
            <Label className="text-sm font-medium mb-2 block">Filter by tags:</Label>
            <div className="flex flex-wrap gap-2">
              {availableTags.map((tag) => (
                <Badge
                  key={tag}
                  variant={selectedTags.includes(tag) ? "default" : "outline"}
                  className="cursor-pointer hover:bg-primary/10 text-xs"
                  onClick={() => toggleTagFilter(tag)}
                >
                  <Tag className="w-3 h-3 mr-1" />
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredDocuments.map((document) => (
          <Card key={document.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <FileText className="w-8 h-8 text-primary" />
                {canManageContent && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(document.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
              <CardTitle className="text-lg">{document.title}</CardTitle>
              <CardDescription>
                <div className="space-y-2">
                  <Badge variant="secondary" className="text-xs">
                    {getCompanyName(document.company_id)}
                  </Badge>
                  {document.tags && document.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {document.tags.map((tag, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          <Tag className="w-3 h-3 mr-1" />
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(document.drive_url, '_blank')}
                className="w-full"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Open Document
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredDocuments.length === 0 && documents.length > 0 && (
        <div className="text-center py-12 col-span-full">
          <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No documents match your filters</h3>
          <p className="text-muted-foreground mb-4">
            Try adjusting your search terms or selected tags.
          </p>
          <Button onClick={clearFilters} variant="outline">
            Clear Filters
          </Button>
        </div>
      )}

      {documents.length === 0 && (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No documents yet</h3>
          <p className="text-muted-foreground mb-4">
            {canManageContent 
              ? "Start by adding your first document or resource link."
              : "Documents will appear here once an admin adds them."
            }
          </p>
          {canManageContent && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Document
                </Button>
              </DialogTrigger>
            </Dialog>
          )}
        </div>
      )}
    </div>
  );
}
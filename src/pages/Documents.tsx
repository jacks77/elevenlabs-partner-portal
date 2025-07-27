import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { FileText, Plus, ExternalLink, Trash2 } from "lucide-react";
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Document {
  id: string;
  title: string;
  drive_url: string;
  company_id: string | null;
  created_at: string;
}

export default function Documents() {
  const { user, memberships, profile } = useAuth();
  const { toast } = useToast();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newDocument, setNewDocument] = useState({
    title: '',
    drive_url: '',
    company_id: null as string | null
  });

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
      setDocuments(data || []);
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

      setNewDocument({ title: '', drive_url: '', company_id: null });
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

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {documents.map((document) => (
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
                <Badge variant="secondary" className="text-xs">
                  {getCompanyName(document.company_id)}
                </Badge>
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
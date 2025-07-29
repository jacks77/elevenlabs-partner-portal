import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Newspaper, Plus, Edit, Trash2, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface NewsStory {
  id: string;
  headline: string;
  subheading?: string;
  content?: string;
  image_url?: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export function NewsManagement() {
  const [newsStories, setNewsStories] = useState<NewsStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedStory, setSelectedStory] = useState<NewsStory | null>(null);
  const [newStory, setNewStory] = useState({
    headline: '',
    subheading: '',
    content: '',
    image_url: '',
    is_published: false,
  });

  useEffect(() => {
    fetchNewsStories();
  }, []);

  const fetchNewsStories = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('news_stories')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNewsStories(data || []);
    } catch (error) {
      console.error('Error fetching news stories:', error);
      toast({
        title: "Error",
        description: "Failed to load news stories",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createStory = async () => {
    try {
      const { data, error } = await supabase
        .from('news_stories')
        .insert([newStory])
        .select()
        .single();

      if (error) throw error;

      setNewsStories(prev => [data, ...prev]);
      setCreateDialogOpen(false);
      setNewStory({
        headline: '',
        subheading: '',
        content: '',
        image_url: '',
        is_published: false,
      });

      toast({
        title: "News story created",
        description: `"${data.headline}" has been created successfully.`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const updateStory = async (storyId: string, updates: Partial<NewsStory>) => {
    try {
      const { data, error } = await supabase
        .from('news_stories')
        .update(updates)
        .eq('id', storyId)
        .select()
        .single();

      if (error) throw error;

      setNewsStories(prev => prev.map(story => 
        story.id === storyId ? data : story
      ));

      toast({
        title: "Story updated",
        description: "News story has been updated successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteStory = async (storyId: string) => {
    try {
      const { error } = await supabase
        .from('news_stories')
        .delete()
        .eq('id', storyId);

      if (error) throw error;

      setNewsStories(prev => prev.filter(story => story.id !== storyId));
      
      toast({
        title: "Story deleted",
        description: "News story has been deleted successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const togglePublishStatus = async (story: NewsStory) => {
    await updateStory(story.id, { is_published: !story.is_published });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">Loading news stories...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">News Management</h2>
          <p className="text-muted-foreground">Manage recent updates and announcements</p>
        </div>
        
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create News Story
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create News Story</DialogTitle>
              <DialogDescription>
                Create a new news story or announcement.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="headline">Headline</Label>
                <Input
                  id="headline"
                  value={newStory.headline}
                  onChange={(e) => setNewStory(prev => ({ ...prev, headline: e.target.value }))}
                  placeholder="Enter headline"
                />
              </div>
              
              <div>
                <Label htmlFor="subheading">Subheading</Label>
                <Input
                  id="subheading"
                  value={newStory.subheading}
                  onChange={(e) => setNewStory(prev => ({ ...prev, subheading: e.target.value }))}
                  placeholder="Enter subheading (optional)"
                />
              </div>
              
              <div>
                <Label htmlFor="content">Content</Label>
                <Textarea
                  id="content"
                  value={newStory.content}
                  onChange={(e) => setNewStory(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Enter story content"
                  rows={6}
                />
              </div>
              
              <div>
                <Label htmlFor="image-url">Image URL</Label>
                <Input
                  id="image-url"
                  value={newStory.image_url}
                  onChange={(e) => setNewStory(prev => ({ ...prev, image_url: e.target.value }))}
                  placeholder="https://example.com/image.jpg"
                  type="url"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="published"
                  checked={newStory.is_published}
                  onCheckedChange={(checked) => setNewStory(prev => ({ ...prev, is_published: checked }))}
                />
                <Label htmlFor="published">Publish immediately</Label>
              </div>
            </div>
            
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={createStory} disabled={!newStory.headline.trim()}>
                Create Story
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6">
        {newsStories.map((story) => (
          <Card key={story.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <CardTitle className="flex items-center gap-2">
                      <Newspaper className="h-5 w-5" />
                      {story.headline}
                    </CardTitle>
                    <Badge variant={story.is_published ? "default" : "secondary"}>
                      {story.is_published ? "Published" : "Draft"}
                    </Badge>
                  </div>
                  {story.subheading && (
                    <CardDescription>{story.subheading}</CardDescription>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => togglePublishStatus(story)}
                  >
                    {story.is_published ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedStory(story);
                      setEditDialogOpen(true);
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteStory(story.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              {story.image_url && (
                <div className="mb-4">
                  <img 
                    src={story.image_url} 
                    alt={story.headline}
                    className="w-full h-48 object-cover rounded-lg"
                  />
                </div>
              )}
              
              {story.content && (
                <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                  {story.content}
                </p>
              )}
              
              <div className="text-xs text-muted-foreground">
                Created: {new Date(story.created_at).toLocaleDateString()} • 
                Updated: {new Date(story.updated_at).toLocaleDateString()}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {newsStories.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Newspaper className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No news stories found</p>
            <p className="text-sm text-muted-foreground mt-2">
              Create your first news story to get started.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
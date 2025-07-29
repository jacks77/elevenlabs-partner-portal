import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Bell, Plus, Edit, Trash2, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface NotificationBanner {
  id: string;
  message: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function NotificationManagement() {
  const [notifications, setNotifications] = useState<NotificationBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<NotificationBanner | null>(null);
  const [newNotification, setNewNotification] = useState({
    message: '',
    is_active: false,
  });
  const [editingNotification, setEditingNotification] = useState({
    message: '',
    is_active: false,
  });

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('notification_banners')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast({
        title: "Error",
        description: "Failed to load notifications",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createNotification = async () => {
    try {
      // If this notification is being set to active, deactivate all others
      if (newNotification.is_active) {
        await supabase
          .from('notification_banners')
          .update({ is_active: false })
          .neq('id', '');
      }

      const { data, error } = await supabase
        .from('notification_banners')
        .insert([newNotification])
        .select()
        .single();

      if (error) throw error;

      setNotifications(prev => [data, ...prev.map(n => ({ ...n, is_active: false }))]);
      setCreateDialogOpen(false);
      setNewNotification({
        message: '',
        is_active: false,
      });

      toast({
        title: "Notification created",
        description: "Notification banner has been created successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const updateNotification = async (notificationId: string, updates: Partial<NotificationBanner>) => {
    try {
      // If this notification is being set to active, deactivate all others
      if (updates.is_active) {
        await supabase
          .from('notification_banners')
          .update({ is_active: false })
          .neq('id', notificationId);
      }

      const { data, error } = await supabase
        .from('notification_banners')
        .update(updates)
        .eq('id', notificationId)
        .select()
        .single();

      if (error) throw error;

      setNotifications(prev => prev.map(notification => {
        if (notification.id === notificationId) {
          return data;
        }
        // If we're activating this notification, deactivate others
        if (updates.is_active) {
          return { ...notification, is_active: false };
        }
        return notification;
      }));

      toast({
        title: "Notification updated",
        description: "Notification banner has been updated successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notification_banners')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev => prev.filter(notification => notification.id !== notificationId));
      
      toast({
        title: "Notification deleted",
        description: "Notification banner has been deleted successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const toggleActiveStatus = async (notification: NotificationBanner) => {
    await updateNotification(notification.id, { is_active: !notification.is_active });
  };

  const handleEditClick = (notification: NotificationBanner) => {
    setSelectedNotification(notification);
    setEditingNotification({
      message: notification.message,
      is_active: notification.is_active,
    });
    setEditDialogOpen(true);
  };

  const handleEditSave = async () => {
    if (!selectedNotification) return;
    
    await updateNotification(selectedNotification.id, editingNotification);
    setEditDialogOpen(false);
    setSelectedNotification(null);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">Loading notifications...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Notification Management</h2>
          <p className="text-muted-foreground">Manage global notification banners</p>
        </div>
        
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Notification
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Notification Banner</DialogTitle>
              <DialogDescription>
                Create a new global notification that will appear at the top of all pages.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="message">Message</Label>
                <Input
                  id="message"
                  value={newNotification.message}
                  onChange={(e) => setNewNotification(prev => ({ ...prev, message: e.target.value }))}
                  placeholder="Enter notification message"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="active"
                  checked={newNotification.is_active}
                  onCheckedChange={(checked) => setNewNotification(prev => ({ ...prev, is_active: checked }))}
                />
                <Label htmlFor="active">Make active immediately</Label>
              </div>
              
              {newNotification.is_active && (
                <p className="text-sm text-amber-600">
                  ⚠️ Making this notification active will deactivate any existing active notifications.
                </p>
              )}
            </div>
            
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={createNotification} disabled={!newNotification.message.trim()}>
                Create Notification
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {notifications.map((notification) => (
          <Card key={notification.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <CardTitle className="flex items-center gap-2">
                      <Bell className="h-5 w-5" />
                      Notification Banner
                    </CardTitle>
                    <Badge variant={notification.is_active ? "default" : "secondary"}>
                      {notification.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <CardDescription className="text-base">
                    {notification.message}
                  </CardDescription>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleActiveStatus(notification)}
                  >
                    {notification.is_active ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditClick(notification)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteNotification(notification.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="text-xs text-muted-foreground">
                Created: {new Date(notification.created_at).toLocaleDateString()} • 
                Updated: {new Date(notification.updated_at).toLocaleDateString()}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {notifications.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No notifications found</p>
            <p className="text-sm text-muted-foreground mt-2">
              Create your first notification banner to get started.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Notification Banner</DialogTitle>
            <DialogDescription>
              Update the notification banner message and status.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-message">Message</Label>
              <Input
                id="edit-message"
                value={editingNotification.message}
                onChange={(e) => setEditingNotification(prev => ({ ...prev, message: e.target.value }))}
                placeholder="Enter notification message"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="edit-active"
                checked={editingNotification.is_active}
                onCheckedChange={(checked) => setEditingNotification(prev => ({ ...prev, is_active: checked }))}
              />
              <Label htmlFor="edit-active">Make active</Label>
            </div>
            
            {editingNotification.is_active && !selectedNotification?.is_active && (
              <p className="text-sm text-amber-600">
                ⚠️ Making this notification active will deactivate any existing active notifications.
              </p>
            )}
          </div>
          
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditSave} disabled={!editingNotification.message.trim()}>
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
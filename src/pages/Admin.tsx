import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { UserManagement } from "@/components/UserManagement";
import SearchAnalyticsDashboard from "@/components/SearchAnalyticsDashboard";
import { CompanyManagement } from "@/components/CompanyManagement";
import { NewsManagement } from "@/components/NewsManagement";
import { NotificationManagement } from "@/components/NotificationManagement";
import { BarChart3, Users, Building2, Newspaper, Bell } from "lucide-react";

export default function Admin() {
  const { profile } = useAuth();

  // Only allow super admins
  if (!profile?.is_super_admin) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="container mx-auto px-6 py-8">
      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>
      
      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="companies" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Companies
          </TabsTrigger>
          <TabsTrigger value="news" className="flex items-center gap-2">
            <Newspaper className="h-4 w-4" />
            News
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <UserManagement />
        </TabsContent>
        
        <TabsContent value="companies">
          <CompanyManagement />
        </TabsContent>
        
        <TabsContent value="news">
          <NewsManagement />
        </TabsContent>

        <TabsContent value="notifications">
          <NotificationManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
}
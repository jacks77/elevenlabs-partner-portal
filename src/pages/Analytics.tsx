import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Calendar, Users, MousePointer, Eye } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PageView {
  page: string;
  views: number;
}

interface DailyStats {
  date: string;
  page_views: number;
  link_clicks: number;
}

const chartConfig = {
  page_views: {
    label: "Page Views",
    color: "hsl(var(--primary))",
  },
  link_clicks: {
    label: "Link Clicks", 
    color: "hsl(var(--secondary))",
  },
};

export default function Analytics() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [totalPageViews, setTotalPageViews] = useState(0);
  const [totalLinkClicks, setTotalLinkClicks] = useState(0);
  const [uniqueUsers, setUniqueUsers] = useState(0);
  const [topPages, setTopPages] = useState<PageView[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);

  const fetchAnalytics = async () => {
    try {
      // Fetch total page views
      const { count: pageViewCount } = await supabase
        .from('analytics_page_views')
        .select('*', { count: 'exact', head: true });

      // Fetch total link clicks
      const { count: linkClickCount } = await supabase
        .from('analytics_link_clicks')
        .select('*', { count: 'exact', head: true });

      // Fetch unique users from page views
      const { data: uniqueUserData } = await supabase
        .from('analytics_page_views')
        .select('user_id')
        .not('user_id', 'is', null);

      const uniqueUserIds = new Set(uniqueUserData?.map(item => item.user_id) || []);

      // Fetch top pages
      const { data: pageViewData } = await supabase
        .from('analytics_page_views')
        .select('page')
        .not('page', 'is', null);

      const pageCounts = pageViewData?.reduce((acc, item) => {
        acc[item.page] = (acc[item.page] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const topPagesData = Object.entries(pageCounts)
        .map(([page, views]) => ({ page, views }))
        .sort((a, b) => b.views - a.views)
        .slice(0, 5);

      // Fetch daily stats for the last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: pageViewsByDay } = await supabase
        .from('analytics_page_views')
        .select('created_at')
        .gte('created_at', sevenDaysAgo.toISOString());

      const { data: linkClicksByDay } = await supabase
        .from('analytics_link_clicks')
        .select('created_at')
        .gte('created_at', sevenDaysAgo.toISOString());

      // Process daily stats
      const dailyData: Record<string, { page_views: number; link_clicks: number }> = {};
      
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        dailyData[dateStr] = { page_views: 0, link_clicks: 0 };
      }

      pageViewsByDay?.forEach(item => {
        const date = item.created_at.split('T')[0];
        if (dailyData[date]) {
          dailyData[date].page_views++;
        }
      });

      linkClicksByDay?.forEach(item => {
        const date = item.created_at.split('T')[0];
        if (dailyData[date]) {
          dailyData[date].link_clicks++;
        }
      });

      const dailyStatsData = Object.entries(dailyData).map(([date, stats]) => ({
        date: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
        ...stats
      }));

      setTotalPageViews(pageViewCount || 0);
      setTotalLinkClicks(linkClickCount || 0);
      setUniqueUsers(uniqueUserIds.size);
      setTopPages(topPagesData);
      setDailyStats(dailyStatsData);

    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast({
        title: "Error",
        description: "Failed to load analytics data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="text-center">Loading analytics...</div>
      </div>
    );
  }

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))', 'hsl(var(--border))'];

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8">
        <h1>Analytics Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Track user engagement and platform usage
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Page Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPageViews}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Link Clicks</CardTitle>
            <MousePointer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLinkClicks}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueUsers}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Views/User</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {uniqueUsers > 0 ? Math.round(totalPageViews / uniqueUsers) : 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 mb-8">
        {/* Daily Activity Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Activity (Last 7 Days)</CardTitle>
            <CardDescription>Page views and link clicks over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyStats}>
                  <XAxis dataKey="date" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line 
                    type="monotone" 
                    dataKey="page_views" 
                    stroke="var(--color-page_views)" 
                    strokeWidth={2}
                    name="Page Views"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="link_clicks" 
                    stroke="var(--color-link_clicks)" 
                    strokeWidth={2}
                    name="Link Clicks"
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Top Pages */}
        <Card>
          <CardHeader>
            <CardTitle>Most Visited Pages</CardTitle>
            <CardDescription>Pages with the highest traffic</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topPages} layout="horizontal">
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="page" width={100} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="views" fill="var(--color-page_views)" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {topPages.length === 0 && totalPageViews === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Eye className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No analytics data yet</h3>
            <p className="text-muted-foreground">
              Start using the platform to see analytics data appear here.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
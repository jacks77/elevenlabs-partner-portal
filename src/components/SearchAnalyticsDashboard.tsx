import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search, 
  TrendingDown, 
  TrendingUp, 
  Clock, 
  BarChart3,
  Calendar,
  Download
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

interface SearchAnalyticsData {
  id: string;
  search_term: string;
  results_count: number;
  created_at: string;
  category?: string;
}

interface SearchInsight {
  term: string;
  count: number;
  avgResults: number;
}

export default function SearchAnalyticsDashboard() {
  const [searchData, setSearchData] = useState<SearchAnalyticsData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('7'); // days
  const { profile } = useAuth();

  useEffect(() => {
    if (profile?.is_super_admin) {
      fetchSearchAnalytics();
    }
  }, [profile, dateRange]);

  const fetchSearchAnalytics = async () => {
    try {
      setLoading(true);
      
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(dateRange));

      const { data, error } = await supabase
        .from('search_analytics')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setSearchData(data || []);
    } catch (error) {
      console.error('Error fetching search analytics:', error);
      toast({
        title: "Error",
        description: "Failed to load search analytics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Only show for super admins
  if (!profile?.is_super_admin) {
    return null;
  }

  const emptySearches = searchData.filter(s => s.results_count === 0);
  const popularSearches = searchData
    .reduce((acc, search) => {
      const existing = acc.find(item => item.term === search.search_term);
      if (existing) {
        existing.count++;
        existing.avgResults = (existing.avgResults + search.results_count) / 2;
      } else {
        acc.push({
          term: search.search_term,
          count: 1,
          avgResults: search.results_count
        });
      }
      return acc;
    }, [] as SearchInsight[])
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const exportData = () => {
    const csv = [
      ['Search Term', 'Results Count', 'Date', 'Category'],
      ...searchData.map(item => [
        item.search_term,
        item.results_count.toString(),
        new Date(item.created_at).toLocaleDateString(),
        item.category || ''
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `search-analytics-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Search Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">Loading analytics...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Search Analytics Dashboard
            </CardTitle>
            <div className="flex gap-2">
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="px-3 py-1 border rounded-md text-sm"
              >
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
              </select>
              <Button variant="outline" size="sm" onClick={exportData}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Search className="h-4 w-4" />
                Total Searches
              </div>
              <div className="text-2xl font-bold">{searchData.length}</div>
            </div>
            
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <TrendingDown className="h-4 w-4 text-red-500" />
                Empty Results
              </div>
              <div className="text-2xl font-bold">{emptySearches.length}</div>
              <div className="text-xs text-muted-foreground">
                {searchData.length > 0 ? Math.round((emptySearches.length / searchData.length) * 100) : 0}% of searches
              </div>
            </div>
            
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <TrendingUp className="h-4 w-4 text-green-500" />
                Avg Results
              </div>
              <div className="text-2xl font-bold">
                {searchData.length > 0 ? Math.round(searchData.reduce((sum, s) => sum + s.results_count, 0) / searchData.length) : 0}
              </div>
            </div>
          </div>

          <Tabs defaultValue="popular" className="w-full">
            <TabsList>
              <TabsTrigger value="popular">Popular Searches</TabsTrigger>
              <TabsTrigger value="empty">Empty Results</TabsTrigger>
              <TabsTrigger value="recent">Recent Searches</TabsTrigger>
            </TabsList>
            
            <TabsContent value="popular">
              <div className="space-y-2">
                <h3 className="font-medium">Most Searched Terms</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Search Term</TableHead>
                      <TableHead>Count</TableHead>
                      <TableHead>Avg Results</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {popularSearches.map((search, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{search.term}</TableCell>
                        <TableCell>{search.count}</TableCell>
                        <TableCell>{Math.round(search.avgResults)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
            
            <TabsContent value="empty">
              <div className="space-y-2">
                <h3 className="font-medium">Searches with No Results</h3>
                <p className="text-sm text-muted-foreground">
                  These searches didn't return any content - consider adding relevant resources.
                </p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Search Term</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Category</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {emptySearches.slice(0, 20).map((search) => (
                      <TableRow key={search.id}>
                        <TableCell className="font-medium">{search.search_term}</TableCell>
                        <TableCell>{new Date(search.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          {search.category && (
                            <Badge variant="outline">{search.category}</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
            
            <TabsContent value="recent">
              <div className="space-y-2">
                <h3 className="font-medium">Recent Search Activity</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Search Term</TableHead>
                      <TableHead>Results</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Category</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {searchData.slice(0, 20).map((search) => (
                      <TableRow key={search.id}>
                        <TableCell className="font-medium">{search.search_term}</TableCell>
                        <TableCell>
                          <Badge variant={search.results_count === 0 ? "destructive" : "default"}>
                            {search.results_count}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {new Date(search.created_at).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          {search.category && (
                            <Badge variant="outline">{search.category}</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
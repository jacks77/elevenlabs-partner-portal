import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Search, X, Clock, TrendingUp, Star } from "lucide-react";
import { ContentItem } from "@/types/content";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface SmartSearchProps {
  onSearch: (term: string, filters: SearchFilters) => void;
  searchTerm: string;
  onSearchTermChange: (term: string) => void;
  items: ContentItem[];
  loading?: boolean;
}

export interface SearchFilters {
  job_category?: string;
  persona?: string[];
  product_area?: string[];
  region?: string[];
  content_type?: string;
  level?: string;
  status?: string;
  is_featured?: boolean;
}

interface SearchSuggestion {
  term: string;
  type: 'recent' | 'popular' | 'synonym';
  count?: number;
}

export default function SmartSearch({ 
  onSearch, 
  searchTerm, 
  onSearchTermChange, 
  items,
  loading 
}: SmartSearchProps) {
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [popularSearches, setPopularSearches] = useState<SearchSuggestion[]>([]);
  const [filters, setFilters] = useState<SearchFilters>({});
  const { user } = useAuth();
  const searchRef = useRef<HTMLInputElement>(null);

  // Synonym mapping for better search
  const synonyms: Record<string, string[]> = {
    'voice cloning': ['voice ai', 'voice synthesis', 'speech synthesis'],
    'tts': ['text to speech', 'speech synthesis'],
    'stt': ['speech to text', 'transcription'],
    'api': ['integration', 'sdk', 'developer'],
    'pricing': ['cost', 'price', 'billing'],
    'demo': ['example', 'sample', 'tutorial']
  };

  useEffect(() => {
    loadRecentSearches();
    loadPopularSearches();
  }, []);

  useEffect(() => {
    if (searchTerm.length > 0) {
      generateSuggestions();
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  }, [searchTerm, items]);

  const loadRecentSearches = () => {
    const stored = localStorage.getItem('recentSearches');
    if (stored) {
      setRecentSearches(JSON.parse(stored));
    }
  };

  const loadPopularSearches = async () => {
    try {
      const { data } = await supabase
        .from('search_analytics')
        .select('search_term, results_count')
        .gte('results_count', 1)
        .order('created_at', { ascending: false })
        .limit(10);

      if (data) {
        const termCounts = data.reduce((acc, item) => {
          acc[item.search_term] = (acc[item.search_term] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        const popular = Object.entries(termCounts)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 5)
          .map(([term, count]) => ({ term, type: 'popular' as const, count }));

        setPopularSearches(popular);
      }
    } catch (error) {
      console.error('Error loading popular searches:', error);
    }
  };

  const generateSuggestions = () => {
    const term = searchTerm.toLowerCase();
    const newSuggestions: SearchSuggestion[] = [];

    // Add recent searches that match
    recentSearches
      .filter(search => search.toLowerCase().includes(term))
      .slice(0, 3)
      .forEach(search => {
        newSuggestions.push({ term: search, type: 'recent' });
      });

    // Add synonym suggestions
    Object.entries(synonyms).forEach(([key, values]) => {
      if (key.includes(term) || values.some(v => v.includes(term))) {
        [key, ...values].forEach(synonym => {
          if (synonym.includes(term) && synonym !== term && 
              !newSuggestions.some(s => s.term === synonym)) {
            newSuggestions.push({ term: synonym, type: 'synonym' });
          }
        });
      }
    });

    // Add content-based suggestions
    const contentTerms = new Set<string>();
    items.forEach(item => {
      [item.title, item.description, ...item.tags].forEach(text => {
        if (text && text.toLowerCase().includes(term)) {
          const words = text.toLowerCase().split(/\s+/);
          words.forEach(word => {
            if (word.includes(term) && word.length > 2) {
              contentTerms.add(word);
            }
          });
        }
      });
    });

    Array.from(contentTerms)
      .filter(t => !newSuggestions.some(s => s.term === t))
      .slice(0, 3)
      .forEach(term => {
        newSuggestions.push({ term, type: 'synonym' });
      });

    setSuggestions(newSuggestions.slice(0, 8));
  };

  const handleSearch = (term: string) => {
    if (term.trim()) {
      // Save to recent searches
      const updated = [term, ...recentSearches.filter(s => s !== term)].slice(0, 10);
      setRecentSearches(updated);
      localStorage.setItem('recentSearches', JSON.stringify(updated));

      // Track search analytics
      trackSearch(term);
    }

    onSearchTermChange(term);
    onSearch(term, filters);
    setShowSuggestions(false);
  };

  const trackSearch = async (term: string) => {
    console.log('trackSearch called with term:', term);
    console.log('user:', user);
    
    if (!user) {
      console.log('No user found, skipping search tracking');
      return;
    }

    // Count results for this search
    const results = items.filter(item => 
      item.title.toLowerCase().includes(term.toLowerCase()) ||
      item.description?.toLowerCase().includes(term.toLowerCase()) ||
      item.tags.some(tag => tag.toLowerCase().includes(term.toLowerCase()))
    );

    console.log('Search results count:', results.length);
    console.log('Current filters:', filters);

    try {
      const insertData = {
        search_term: term,
        results_count: results.length,
        category: filters.job_category || null
      };
      
      console.log('Inserting search analytics:', insertData);
      
      const { data, error } = await supabase
        .from('search_analytics')
        .insert(insertData);
        
      if (error) {
        console.error('Search analytics error:', error);
        throw error;
      }
      
      console.log('Search analytics inserted successfully:', data);
    } catch (error) {
      console.error('Error tracking search:', error);
    }
  };

  const getSuggestionIcon = (type: SearchSuggestion['type']) => {
    switch (type) {
      case 'recent': return <Clock className="h-3 w-3" />;
      case 'popular': return <TrendingUp className="h-3 w-3" />;
      case 'synonym': return <Search className="h-3 w-3" />;
    }
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          ref={searchRef}
          placeholder="Search content... (try typing 'voice cloning' or 'api')"
          value={searchTerm}
          onChange={(e) => onSearchTermChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleSearch(searchTerm);
            }
          }}
          onFocus={() => setShowSuggestions(true)}
          className="pl-10 pr-10"
        />
        {searchTerm && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleSearch('')}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Search Suggestions Dropdown */}
      {showSuggestions && (searchTerm.length > 0 || recentSearches.length > 0) && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-popover border rounded-md shadow-lg max-h-64 overflow-y-auto">
          <Command>
            <CommandList>
              {searchTerm.length === 0 && recentSearches.length > 0 && (
                <CommandGroup heading="Recent Searches">
                  {recentSearches.slice(0, 5).map((search) => (
                    <CommandItem
                      key={search}
                      onSelect={() => handleSearch(search)}
                      className="cursor-pointer"
                    >
                      <Clock className="h-3 w-3 mr-2" />
                      {search}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {searchTerm.length === 0 && popularSearches.length > 0 && (
                <CommandGroup heading="Popular Searches">
                  {popularSearches.map((search) => (
                    <CommandItem
                      key={search.term}
                      onSelect={() => handleSearch(search.term)}
                      className="cursor-pointer"
                    >
                      <TrendingUp className="h-3 w-3 mr-2" />
                      {search.term}
                      {search.count && (
                        <Badge variant="secondary" className="ml-auto text-xs">
                          {search.count}
                        </Badge>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {suggestions.length > 0 && (
                <CommandGroup heading="Suggestions">
                  {suggestions.map((suggestion, index) => (
                    <CommandItem
                      key={`${suggestion.term}-${index}`}
                      onSelect={() => handleSearch(suggestion.term)}
                      className="cursor-pointer"
                    >
                      {getSuggestionIcon(suggestion.type)}
                      <span className="ml-2">{suggestion.term}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {searchTerm.length > 0 && suggestions.length === 0 && (
                <CommandEmpty>
                  <div className="text-center py-4">
                    <Search className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      No suggestions found for "{searchTerm}"
                    </p>
                  </div>
                </CommandEmpty>
              )}
            </CommandList>
          </Command>
        </div>
      )}

      {/* Search with no results - show featured content */}
      {searchTerm.length > 0 && items.length === 0 && !loading && (
        <div className="mt-4 p-4 border rounded-lg bg-muted/50">
          <h3 className="font-medium mb-2">No results found for "{searchTerm}"</h3>
          <p className="text-sm text-muted-foreground mb-3">
            Try these suggestions:
          </p>
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {Object.keys(synonyms).map(term => (
                <Badge
                  key={term}
                  variant="outline"
                  className="cursor-pointer hover:bg-primary/10"
                  onClick={() => handleSearch(term)}
                >
                  {term}
                </Badge>
              ))}
            </div>
            <Button
              variant="link"
              size="sm"
              className="text-xs p-0 h-auto"
              onClick={() => window.open('mailto:support@elevenlabs.io?subject=Content Request: ' + encodeURIComponent(searchTerm), '_blank')}
            >
              Can't find what you're looking for? Request this content →
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
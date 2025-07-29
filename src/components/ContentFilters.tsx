import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter, X } from "lucide-react";
import { SearchFilters } from "@/components/SmartSearch";
import { 
  JOB_CATEGORIES, 
  PERSONAS, 
  PRODUCT_AREAS, 
  REGIONS, 
  CONTENT_TYPES, 
  LEVELS, 
  STATUS_OPTIONS 
} from "@/types/content";

interface ContentFiltersProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  availableTags: string[];
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
}

export default function ContentFilters({
  filters,
  onFiltersChange,
  availableTags,
  selectedTags,
  onTagsChange
}: ContentFiltersProps) {
  const hasActiveFilters = Object.keys(filters).some(key => 
    filters[key as keyof SearchFilters] !== undefined && 
    filters[key as keyof SearchFilters] !== '' &&
    !(Array.isArray(filters[key as keyof SearchFilters]) && 
      (filters[key as keyof SearchFilters] as any[]).length === 0)
  ) || selectedTags.length > 0;

  const clearAllFilters = () => {
    onFiltersChange({});
    onTagsChange([]);
  };

  const updateArrayFilter = (key: keyof SearchFilters, value: string, checked: boolean) => {
    const currentArray = (filters[key] as string[]) || [];
    const newArray = checked 
      ? [...currentArray, value]
      : currentArray.filter(item => item !== value);
    
    onFiltersChange({
      ...filters,
      [key]: newArray.length > 0 ? newArray : undefined
    });
  };

  const toggleTag = (tag: string) => {
    const newTags = selectedTags.includes(tag)
      ? selectedTags.filter(t => t !== tag)
      : [...selectedTags, tag];
    onTagsChange(newTags);
  };

  return (
    <div className="space-y-4">
      {/* Job Categories */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Jobs to be done:</Label>
        <div className="flex flex-wrap gap-2">
          {JOB_CATEGORIES.map((category) => (
            <Badge
              key={category}
              variant={filters.job_category === category ? "default" : "outline"}
              className="cursor-pointer hover:bg-primary/10 capitalize"
              onClick={() => onFiltersChange({
                ...filters,
                job_category: filters.job_category === category ? undefined : category
              })}
            >
              {category}
            </Badge>
          ))}
        </div>
      </div>

      {/* Quick Filters Row */}
      <div className="flex flex-wrap gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Persona
              {filters.persona && filters.persona.length > 0 && (
                <Badge variant="secondary" className="ml-2 h-5 px-2">
                  {filters.persona.length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56">
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Target Persona</h4>
              {PERSONAS.map((persona) => (
                <div key={persona} className="flex items-center space-x-2">
                  <Checkbox
                    id={`persona-${persona}`}
                    checked={filters.persona?.includes(persona) || false}
                    onCheckedChange={(checked) => 
                      updateArrayFilter('persona', persona, checked as boolean)
                    }
                  />
                  <Label htmlFor={`persona-${persona}`} className="text-sm">
                    {persona}
                  </Label>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              Product Area
              {filters.product_area && filters.product_area.length > 0 && (
                <Badge variant="secondary" className="ml-2 h-5 px-2">
                  {filters.product_area.length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56">
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Product Area</h4>
              {PRODUCT_AREAS.map((area) => (
                <div key={area} className="flex items-center space-x-2">
                  <Checkbox
                    id={`product-${area}`}
                    checked={filters.product_area?.includes(area) || false}
                    onCheckedChange={(checked) => 
                      updateArrayFilter('product_area', area, checked as boolean)
                    }
                  />
                  <Label htmlFor={`product-${area}`} className="text-sm">
                    {area}
                  </Label>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <Select
          value={filters.content_type || "all"}
          onValueChange={(value) => onFiltersChange({
            ...filters,
            content_type: value === "all" ? undefined : value
          })}
        >
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Content Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {CONTENT_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.level || "all"}
          onValueChange={(value) => onFiltersChange({
            ...filters,
            level: value === "all" ? undefined : value
          })}
        >
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            {LEVELS.map((level) => (
              <SelectItem key={level} value={level}>
                {level}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onFiltersChange({
            ...filters,
            is_featured: !filters.is_featured
          })}
          className={filters.is_featured ? "bg-primary text-primary-foreground" : ""}
        >
          Featured Only
        </Button>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="text-muted-foreground"
          >
            <X className="h-4 w-4 mr-1" />
            Clear All
          </Button>
        )}
      </div>

      {/* Tags */}
      {availableTags.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Tags:</Label>
          <div className="flex flex-wrap gap-2">
            {availableTags.map((tag) => (
              <Badge
                key={tag}
                variant={selectedTags.includes(tag) ? "default" : "outline"}
                className="cursor-pointer hover:bg-primary/10"
                onClick={() => toggleTag(tag)}
              >
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <div className="p-3 bg-muted/50 rounded-lg space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Active Filters:</Label>
            <Button variant="ghost" size="sm" onClick={clearAllFilters}>
              Clear All
            </Button>
          </div>
          <div className="flex flex-wrap gap-1">
            {filters.job_category && (
              <Badge variant="secondary" className="text-xs">
                Job: {filters.job_category}
              </Badge>
            )}
            {filters.persona?.map(persona => (
              <Badge key={persona} variant="secondary" className="text-xs">
                Persona: {persona}
              </Badge>
            ))}
            {filters.product_area?.map(area => (
              <Badge key={area} variant="secondary" className="text-xs">
                Product: {area}
              </Badge>
            ))}
            {filters.content_type && (
              <Badge variant="secondary" className="text-xs">
                Type: {filters.content_type}
              </Badge>
            )}
            {filters.level && (
              <Badge variant="secondary" className="text-xs">
                Level: {filters.level}
              </Badge>
            )}
            {filters.is_featured && (
              <Badge variant="secondary" className="text-xs">
                Featured
              </Badge>
            )}
            {selectedTags.map(tag => (
              <Badge key={tag} variant="secondary" className="text-xs">
                Tag: {tag}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
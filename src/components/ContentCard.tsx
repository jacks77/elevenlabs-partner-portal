import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ExternalLink, 
  FileText, 
  Link as LinkIcon, 
  Trash2, 
  Star, 
  Pin,
  PinOff,
  Play,
  Calendar
} from "lucide-react";
import { ContentItem } from "@/types/content";
import { cn } from "@/lib/utils";

interface ContentCardProps {
  item: ContentItem;
  companyName: string;
  canManage: boolean;
  isPinned: boolean;
  onOpen: (item: ContentItem) => void;
  onDelete: (id: string, type: 'link' | 'document') => void;
  onPin: (item: ContentItem) => void;
  onUnpin: (item: ContentItem) => void;
}

export default function ContentCard({ 
  item, 
  companyName, 
  canManage, 
  isPinned,
  onOpen, 
  onDelete,
  onPin,
  onUnpin
}: ContentCardProps) {
  const isNew = new Date(item.created_at) > new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const isYouTubeVideo = item.youtube_id || (item.url && item.url.includes('youtube.com'));

  const getJobCategoryColor = (category?: string) => {
    switch (category) {
      case 'sell': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'integrate': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'market': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'support': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getLevelColor = (level?: string) => {
    switch (level) {
      case 'Intro': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300';
      case 'Intermediate': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'Advanced': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  return (
    <Card className={cn(
      "hover:shadow-md transition-all duration-200 group relative",
      item.status === 'draft' && "opacity-75",
      item.is_featured && "ring-2 ring-primary/20 shadow-lg"
    )}>
      {/* Featured Star */}
      {item.is_featured && (
        <div className="absolute -top-2 -right-2 z-10">
          <div className="bg-primary text-primary-foreground rounded-full p-1">
            <Star className="h-3 w-3 fill-current" />
          </div>
        </div>
      )}

      {/* New Badge */}
      {isNew && (
        <div className="absolute top-2 left-2 z-10">
          <Badge variant="default" className="text-xs">
            New
          </Badge>
        </div>
      )}

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {item.type === 'link' ? (
              <LinkIcon className="w-6 h-6 text-primary" />
            ) : (
              <FileText className="w-6 h-6 text-primary" />
            )}
            {isYouTubeVideo && (
              <div className="relative">
                <Play className="w-4 h-4 text-red-600" />
              </div>
            )}
          </div>
          
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => isPinned ? onUnpin(item) : onPin(item)}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              {isPinned ? (
                <PinOff className="w-4 h-4" />
              ) : (
                <Pin className="w-4 h-4" />
              )}
            </Button>
            
            {canManage && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(item.id, item.type)}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
        
        <CardTitle className="text-lg leading-tight">
          {item.title}
        </CardTitle>
        
        {item.description && (
          <CardDescription className="text-sm line-clamp-2">
            {item.description}
          </CardDescription>
        )}
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* YouTube Preview for YouTube videos */}
        {isYouTubeVideo && item.youtube_id && (
          <div className="aspect-video rounded-md overflow-hidden bg-muted">
            <img
              src={`https://img.youtube.com/vi/${item.youtube_id}/maxresdefault.jpg`}
              alt={`${item.title} preview`}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${item.youtube_id}/hqdefault.jpg`;
              }}
            />
          </div>
        )}

        {/* Metadata Badges */}
        <div className="flex flex-wrap gap-1">
          {item.job_category && (
            <Badge className={cn("text-xs", getJobCategoryColor(item.job_category))}>
              {item.job_category.charAt(0).toUpperCase() + item.job_category.slice(1)}
            </Badge>
          )}
          
          {item.level && (
            <Badge className={cn("text-xs", getLevelColor(item.level))}>
              {item.level}
            </Badge>
          )}
          
          {item.content_type && (
            <Badge variant="outline" className="text-xs">
              {item.content_type}
            </Badge>
          )}
          
          <Badge variant="secondary" className="text-xs">
            {companyName}
          </Badge>
        </div>

        {/* Product Areas & Personas */}
        {(item.product_area && item.product_area.length > 0) && (
          <div className="flex flex-wrap gap-1">
            {item.product_area.slice(0, 3).map((area) => (
              <Badge key={area} variant="outline" className="text-xs">
                {area}
              </Badge>
            ))}
            {item.product_area.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{item.product_area.length - 3} more
              </Badge>
            )}
          </div>
        )}

        {/* Tags */}
        {item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {item.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
            {item.tags.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{item.tags.length - 3} more
              </Badge>
            )}
          </div>
        )}

        {/* Version & Date */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            {item.version && (
              <span>{item.version}</span>
            )}
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {new Date(item.created_at).toLocaleDateString()}
            </div>
          </div>
          
          {item.status === 'deprecated' && (
            <Badge variant="destructive" className="text-xs">
              Deprecated
            </Badge>
          )}
        </div>

        {/* Action Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onOpen(item)}
          className="w-full"
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          Open
        </Button>
      </CardContent>
    </Card>
  );
}
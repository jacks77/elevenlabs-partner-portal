export interface ContentItem {
  id: string;
  title: string;
  description?: string;
  url?: string;
  drive_url?: string;
  company_id?: string;
  tags: string[];
  persona?: string[];
  job_category?: string;
  product_area?: string[];
  region?: string[];
  content_type?: string;
  level?: string;
  status?: string;
  version?: string;
  is_featured?: boolean;
  youtube_id?: string;
  created_at: string;
  type: 'link' | 'document';
}

export interface Company {
  id: string;
  name: string;
  partner_manager_id?: string;
}

export interface PartnerManager {
  user_id: string;
  first_name: string;
  last_name: string;
  scheduling_link?: string;
}

export interface PinnedContent {
  id: string;
  user_id: string;
  content_type: 'link' | 'document';
  content_id: string;
  created_at: string;
}

export interface SearchAnalytics {
  id: string;
  user_id: string;
  search_term: string;
  results_count: number;
  category?: string;
  created_at: string;
}

// Content organization constants
export const JOB_CATEGORIES = [
  'sell',
  'integrate', 
  'market',
  'support'
] as const;

export const PERSONAS = [
  'Sales',
  'SE', 
  'PM',
  'Engineer',
  'Marketing',
  'C-level'
] as const;

export const PRODUCT_AREAS = [
  'TTS',
  'Dubbing',
  'Voice Library',
  'STT',
  'ConvAI',
  'Studio',
  'Audio Native'
] as const;

export const REGIONS = [
  'Global',
  'NAMR',
  'LATAM', 
  'EMEA',
  'APAC'
] as const;

export const CONTENT_TYPES = [
  'Deck',
  'One-pager',
  'Playbook',
  'Case Study',
  'Tutorial',
  'Video',
  'API ref'
] as const;

export const LEVELS = [
  'Intro',
  'Intermediate', 
  'Advanced'
] as const;

export const STATUS_OPTIONS = [
  'current',
  'deprecated',
  'draft'
] as const;

export type JobCategory = typeof JOB_CATEGORIES[number];
export type Persona = typeof PERSONAS[number];
export type ProductArea = typeof PRODUCT_AREAS[number];
export type Region = typeof REGIONS[number];
export type ContentType = typeof CONTENT_TYPES[number];
export type Level = typeof LEVELS[number];
export type Status = typeof STATUS_OPTIONS[number];
export interface Listing {
  id: string;
  title: string;
  description: string;
  area: number;
  price: number;
  location: string;
  type: string;
  floor: number;
  totalFloors: number;
  hasParking: boolean;
  hasStorage: boolean;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  images: string[];
  createdAt: string;
  isActive: boolean;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface Filters {
  search: string;
  type: string;
  minArea: string;
  maxArea: string;
  minPrice: string;
  maxPrice: string;
}

export interface Pagination {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  limit: number;
}

export interface ListingsResponse {
  listings: Listing[];
  pagination: Pagination;
}

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface SearchResult {
  listing: Listing;
  score: number;
  matchedFeatures: string[];
}

export type ListingType = 'Магазин' | 'Ресторан/Кафе' | 'Офис' | 'Склад';

export const LISTING_TYPES: Record<ListingType, string> = {
  'Магазин': 'Магазин',
  'Ресторан/Кафе': 'Ресторан/Кафе',
  'Офис': 'Офис',
  'Склад': 'Склад'
} as const;

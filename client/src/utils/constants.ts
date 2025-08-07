export const API_BASE = 'http://localhost:3001/api';

export const DEFAULT_FILTERS = {
  search: '',
  type: 'all',
  minArea: '',
  maxArea: '',
  minPrice: '',
  maxPrice: ''
};

export const DEBOUNCE_DELAY = 300;
export const CACHE_DURATION = 5 * 60 * 1000; // 5 минут

export const ERROR_MESSAGES = {
  FETCH_LISTINGS: 'Ошибка загрузки объявлений',
  NETWORK_ERROR: 'Ошибка сети',
  GENERIC_ERROR: 'Произошла ошибка'
} as const;

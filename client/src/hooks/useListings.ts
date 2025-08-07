import { useState, useEffect, useCallback } from 'react';
import type { Listing, Filters, ListingsResponse, Pagination } from '../types';
import { API_BASE, DEFAULT_FILTERS } from '../utils/constants';
import { buildQueryParams } from '../utils/helpers';
import { useApi } from './useApi';

export function useListings() {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [filteredListings, setFilteredListings] = useState<Listing[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [isAISearch] = useState(false);
  
  const api = useApi<ListingsResponse>();

  const fetchListings = useCallback(async (filtersToUse: Filters, page: number = 1) => {
    const params = buildQueryParams(filtersToUse);
    params.append('page', page.toString());
    params.append('limit', '20');
    const cacheKey = `listings-${params.toString()}`;
    
    return api.execute(
      async () => {
        const response = await fetch(`${API_BASE}/listings?${params}`);
        if (!response.ok) throw new Error('Ошибка загрузки объявлений');
        return response.json();
      },
      { 
        cache: true, 
        cacheKey 
      }
    );
  }, [api.execute]);

  // Эффект для загрузки данных при изменении примененных фильтров (сбрасываем на страницу 1)
  useEffect(() => {
    setCurrentPage(1);
  }, [appliedFilters]);

  // Отдельный эффект для загрузки данных
  useEffect(() => {
    fetchListings(appliedFilters, currentPage);
  }, [appliedFilters, currentPage, fetchListings]);

  // Обновление данных при получении ответа от API
  useEffect(() => {
    if (!isAISearch && api.data) {
      setFilteredListings(api.data.listings || []);
      setPagination(api.data.pagination || null);
    }
  }, [api.data, isAISearch]);

  const handleFilterChange = useCallback((key: keyof Filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const applyFilters = useCallback(() => {
    setAppliedFilters(filters);
  }, [filters]);

  const clearFilter = useCallback((key: keyof Filters, value: string = '') => {
    // Обновляем состояние формы
    setFilters(prev => ({ ...prev, [key]: value }));
    // Сразу применяем новые фильтры
    setAppliedFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  // const handleAISearchResults = useCallback((results: Listing[]) => {
  //   setFilteredListings(results);
  //   setIsAISearch(true);
  // }, []);

  // const handleAISearchClear = useCallback(() => {
  //   setIsAISearch(false);
  //   if (api.data) {
  //     setFilteredListings(api.data);
  //   }
  // }, [api.data]);

  const refreshListings = useCallback(() => {
    fetchListings(appliedFilters, currentPage);
  }, [appliedFilters, currentPage, fetchListings]);

  return {
    listings: api.data?.listings || [],
    filteredListings,
    loading: api.loading,
    error: api.error,
    filters,
    appliedFilters,
    pagination,
    currentPage,
    isAISearch,
    handleFilterChange,
    applyFilters,
    clearFilter,
    handlePageChange,
    // handleAISearchResults,
    // handleAISearchClear,
    refreshListings
  };
}

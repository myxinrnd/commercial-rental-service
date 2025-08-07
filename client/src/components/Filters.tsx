import React, { memo } from 'react';
import type { Filters as FiltersType } from '../types';
import { LISTING_TYPES } from '../types';

interface FiltersProps {
  filters: FiltersType;
  appliedFilters: FiltersType;
  onFilterChange: (key: keyof FiltersType, value: string) => void;
  onApplyFilters: () => void;
  onClearFilter: (key: keyof FiltersType, value?: string) => void;
}

const Filters: React.FC<FiltersProps> = memo(({ filters, appliedFilters, onFilterChange, onApplyFilters, onClearFilter }) => {
  const hasActiveFilters = appliedFilters.search || appliedFilters.type !== 'all' || 
    appliedFilters.minArea || appliedFilters.maxArea || appliedFilters.minPrice || appliedFilters.maxPrice;

  const clearAllFilters = () => {
    onFilterChange('search', '');
    onFilterChange('type', 'all');
    onFilterChange('minArea', '');
    onFilterChange('maxArea', '');
    onFilterChange('minPrice', '');
    onFilterChange('maxPrice', '');
    // Применяем очищенные фильтры сразу
    setTimeout(() => onApplyFilters(), 0);
  };

  return (
    <div className="filters-container">
      {/* Основной поисковый блок */}
      <div className="search-section">
        <div className="search-input-wrapper">
          <div className="search-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <input
            type="text"
            placeholder="Поиск по названию, описанию, адресу..."
            value={filters.search}
            onChange={(e) => onFilterChange('search', e.target.value)}
            className="search-input-modern"
            onKeyPress={(e) => e.key === 'Enter' && onApplyFilters()}
          />
          {filters.search && (
            <button 
              className="clear-search-btn"
              onClick={() => onFilterChange('search', '')}
              type="button"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}
          <button 
            type="button"
            className="search-icon-btn"
            onClick={onApplyFilters}
            title="Найти"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Панель фильтров */}
      <div className="filters-panel">
        <div className="filters-header">
          <h3 className="filters-title">Фильтры</h3>
          {hasActiveFilters && (
            <button 
              className="clear-filters-btn"
              onClick={clearAllFilters}
              type="button"
            >
              Сбросить все
            </button>
          )}
        </div>

        <div className="filters-grid">
          {/* Тип помещения */}
          <div className="filter-group">
            <label className="filter-label">
              <span className="filter-icon">🏢</span>
              Тип помещения
            </label>
            <select
              value={filters.type}
              onChange={(e) => onFilterChange('type', e.target.value)}
              className="filter-select-modern"
            >
              <option value="all">Любой тип</option>
              {Object.entries(LISTING_TYPES).map(([key, value]) => (
                <option key={key} value={key}>{value}</option>
              ))}
            </select>
          </div>

          {/* Площадь */}
          <div className="filter-group">
            <label className="filter-label">
              <span className="filter-icon">📐</span>
              Площадь, м²
            </label>
            <div className="range-inputs-modern">
              <input
                type="number"
                placeholder="от"
                value={filters.minArea}
                onChange={(e) => onFilterChange('minArea', e.target.value)}
                className="range-input-modern"
              />
              <span className="range-separator">—</span>
              <input
                type="number"
                placeholder="до"
                value={filters.maxArea}
                onChange={(e) => onFilterChange('maxArea', e.target.value)}
                className="range-input-modern"
              />
            </div>
          </div>

          {/* Цена */}
          <div className="filter-group">
            <label className="filter-label">
              <span className="filter-icon">💰</span>
              Цена в месяц, ₽
            </label>
            <div className="range-inputs-modern">
              <input
                type="number"
                placeholder="от"
                value={filters.minPrice}
                onChange={(e) => onFilterChange('minPrice', e.target.value)}
                className="range-input-modern"
              />
              <span className="range-separator">—</span>
              <input
                type="number"
                placeholder="до"
                value={filters.maxPrice}
                onChange={(e) => onFilterChange('maxPrice', e.target.value)}
                className="range-input-modern"
              />
            </div>
          </div>
        </div>

        {/* Кнопка применения фильтров */}
        <div className="filters-actions">
          <button 
            type="button"
            className="filters-apply-btn"
            onClick={onApplyFilters}
          >
            🔍 Найти объявления
          </button>
        </div>

        {/* Активные фильтры (chips) */}
        {hasActiveFilters && (
          <div className="active-filters">
            <span className="active-filters-label">Активные фильтры:</span>
            <div className="filter-chips">
              {appliedFilters.search && (
                <div className="filter-chip">
                  <span>Поиск: "{appliedFilters.search}"</span>
                  <button onClick={() => onClearFilter('search', '')} type="button">×</button>
                </div>
              )}
              {appliedFilters.type !== 'all' && (
                <div className="filter-chip">
                  <span>{LISTING_TYPES[appliedFilters.type as keyof typeof LISTING_TYPES]}</span>
                  <button onClick={() => onClearFilter('type', 'all')} type="button">×</button>
                </div>
              )}
              {(appliedFilters.minArea || appliedFilters.maxArea) && (
                <div className="filter-chip">
                  <span>
                    Площадь: {appliedFilters.minArea || '0'} — {appliedFilters.maxArea || '∞'} м²
                  </span>
                  <button onClick={() => {
                    onClearFilter('minArea', '');
                    onClearFilter('maxArea', '');
                  }} type="button">×</button>
                </div>
              )}
              {(appliedFilters.minPrice || appliedFilters.maxPrice) && (
                <div className="filter-chip">
                  <span>
                    Цена: {appliedFilters.minPrice || '0'} — {appliedFilters.maxPrice || '∞'} ₽
                  </span>
                  <button onClick={() => {
                    onClearFilter('minPrice', '');
                    onClearFilter('maxPrice', '');
                  }} type="button">×</button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

Filters.displayName = 'Filters';

export default Filters;

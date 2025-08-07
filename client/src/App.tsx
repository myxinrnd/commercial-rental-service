import { useState, useCallback, memo, useMemo } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AuthModal from './components/AuthModal';
import UserMenu from './components/UserMenu';
import Pagination from './components/Pagination';
import SkeletonCard from './components/SkeletonCard';
import Filters from './components/Filters';
import YandexMap from './components/YandexMap';
import ViewToggle from './components/ViewToggle';
// import SelfLearningAI from './components/SelfLearningAI';
import type { Listing } from './types';
import { formatPrice, formatDate } from './utils/helpers';
import { useListings } from './hooks/useListings';
import './App.css';
import './components/Filters.css';
import './components/YandexMap.css';

// Мемоизированный компонент карточки объявления
const ListingCard = memo(({ listing, onSelect }: { listing: Listing; onSelect: (listing: Listing) => void }) => (
  <div
    className="listing-card"
    onClick={() => onSelect(listing)}
  >
    <div className="listing-badge">
      <span className="listing-type">{listing.type}</span>
    </div>
    
    <div className="listing-content">
      <h3 className="listing-title">{listing.title}</h3>
      <p className="listing-description">{listing.description}</p>
      
      <div className="listing-details">
        <div className="detail-item">
          <span className="detail-icon">📐</span>
          <span>{listing.area} м²</span>
        </div>
        <div className="detail-item">
          <span className="detail-icon">🏢</span>
          <span>{listing.floor}/{listing.totalFloors} этаж</span>
        </div>
        {listing.hasParking && (
          <div className="detail-item">
            <span className="detail-icon">🅿️</span>
            <span>Парковка</span>
          </div>
        )}
        {listing.hasStorage && (
          <div className="detail-item">
            <span className="detail-icon">📦</span>
            <span>Склад</span>
          </div>
        )}
      </div>
      
      <div className="listing-location">
        <span className="detail-icon">📍</span>
        <span>{listing.location}</span>
      </div>
      
      <div className="listing-footer">
        <div className="listing-price">{formatPrice(listing.price)}</div>
        <div className="listing-date">{formatDate(listing.createdAt)}</div>
      </div>
    </div>
  </div>
));

ListingCard.displayName = 'ListingCard';



// Мемоизированная модалка с деталями
const ListingModal = memo(({ 
  listing, 
  onClose 
}: { 
  listing: Listing | null; 
  onClose: () => void; 
}) => {
  if (!listing) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        
        <div className="modal-header">
          <h2>{listing.title}</h2>
          <div className="modal-badges">
            <span className="listing-type-badge">{listing.type}</span>
          </div>
        </div>

        <div className="modal-body">
          <p className="modal-description">{listing.description}</p>
          
          <div className="modal-details">
            <div className="detail-row">
              <span className="detail-label">Площадь:</span>
              <span className="detail-value">{listing.area} м²</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Этаж:</span>
              <span className="detail-value">{listing.floor} из {listing.totalFloors}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Адрес:</span>
              <span className="detail-value">{listing.location}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Парковка:</span>
              <span className="detail-value">{listing.hasParking ? 'Есть' : 'Нет'}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Склад:</span>
              <span className="detail-value">{listing.hasStorage ? 'Есть' : 'Нет'}</span>
            </div>
          </div>

          <div className="modal-contact">
            <h3>Контактная информация</h3>
            <div className="contact-item">
              <span className="contact-label">Контактное лицо:</span>
              <span className="contact-value">{listing.contactName}</span>
            </div>
            <div className="contact-item">
              <span className="contact-label">Телефон:</span>
              <span className="contact-value">{listing.contactPhone}</span>
            </div>
            <div className="contact-item">
              <span className="contact-label">Email:</span>
              <span className="contact-value">{listing.contactEmail}</span>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <div className="modal-price">{formatPrice(listing.price)}</div>
          <div className="modal-date">Размещено {formatDate(listing.createdAt)}</div>
        </div>
      </div>
    </div>
  );
});

ListingModal.displayName = 'ListingModal';

function AppContent() {
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [view, setView] = useState<'list' | 'map'>('list');

  const { user } = useAuth();
  const {
    listings,
    filteredListings,
    loading,
    error,
    filters,
    appliedFilters,
    pagination,
    isAISearch,
    handleFilterChange,
    applyFilters,
    clearFilter,
    handlePageChange
    // handleAISearchResults,
    // handleAISearchClear
  } = useListings();

  const handleListingSelect = useCallback((listing: Listing) => {
    setSelectedListing(listing);
    // Отправляем событие для самообучающегося AI
    const event = new CustomEvent('listingClick', {
      detail: { listingId: listing.id }
    });
    window.dispatchEvent(event);
  }, []);

  const handleAuthOpen = useCallback((mode: 'login' | 'register') => {
    setAuthMode(mode);
    setShowAuthModal(true);
  }, []);

  const handleModalClose = useCallback(() => {
    setSelectedListing(null);
    setShowAuthModal(false);
  }, []);

  const displayedListings = useMemo(() => {
    return isAISearch ? filteredListings : listings;
  }, [isAISearch, filteredListings, listings]);

  // Мемоизируем объявления с координатами для карты
  const mapListings = useMemo(() => {
    return displayedListings.filter(listing => listing.coordinates);
  }, [displayedListings]);

  // Функция для рендеринга skeleton карточек
  const renderSkeletonCards = useCallback(() => {
    return Array.from({ length: 20 }, (_, index) => (
      <SkeletonCard key={`skeleton-${index}`} index={index} />
    ));
  }, []);

  // Показываем skeleton при первоначальной загрузке
  const showSkeleton = loading && listings.length === 0;

  return (
    <div className="app">
      <header className="header">
        <div className="container">
          <div className="header-content">
            <div className="header-text">
              <h1>🏢 TutEstate</h1>
              <p>Найдите идеальное место для вашего бизнеса</p>
            </div>
            <div className="header-auth">
              {user ? (
                <UserMenu />
              ) : (
                <div className="auth-buttons">
                  <button 
                    onClick={() => handleAuthOpen('login')}
                    className="auth-btn login-btn"
                  >
                    Войти
                  </button>
                  <button 
                    onClick={() => handleAuthOpen('register')}
                    className="auth-btn register-btn"
                  >
                    Регистрация
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="main">
        <div className="container">
          {/* AI-Поиск */}
          {/* <SelfLearningAI 
            listings={listings}
            onResults={handleAISearchResults}
            onClear={handleAISearchClear}
          /> */}

          {/* Фильтры */}
          <Filters 
            filters={filters}
            appliedFilters={appliedFilters}
            onFilterChange={handleFilterChange}
            onApplyFilters={applyFilters}
            onClearFilter={clearFilter}
          />

          {/* Переключатель видов */}
          <ViewToggle 
            view={view}
            onViewChange={setView}
          />

          {/* Результаты */}
          <div className="results">
            <div className="results-info">
              <p>
                Найдено: <strong>{pagination?.totalCount || displayedListings.length}</strong> объявлений
                {pagination && pagination.totalPages > 1 && (
                  <span className="page-info">
                    {" "}• Показано {((pagination.currentPage - 1) * pagination.limit) + 1}–{Math.min(pagination.currentPage * pagination.limit, pagination.totalCount)} из {pagination.totalCount}
                    {" "}• Страница {pagination.currentPage} из {pagination.totalPages}
                  </span>
                )}
              </p>
            </div>

          {error && (
            <div className="error-message">
                {error}
            </div>
          )}

            <div className="results-content">
              {view === 'map' ? (
                // Отображение карты
                <YandexMap
                  listings={mapListings}
                  onMarkerClick={handleListingSelect}
                  className="main-map"
                />
              ) : (
                // Отображение списка
                showSkeleton ? (
                  <div className="listings-grid">
                    {renderSkeletonCards()}
                  </div>
                ) : loading && displayedListings.length > 0 ? (
                  <div className="listings-grid loading">
                    {displayedListings.map((listing) => (
                      <ListingCard
                        key={listing.id}
                        listing={listing}
                        onSelect={handleListingSelect}
                      />
                    ))}
                  </div>
                ) : displayedListings.length === 0 ? (
                  <div className="listings-grid">
                    <div className="no-results">
                      <div className="no-results-icon">🔍</div>
                      <h3>Объявления не найдены</h3>
                      <p>Попробуйте изменить параметры поиска или сбросить фильтры</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className={`listings-grid ${loading ? 'loading' : ''}`}>
                      {displayedListings.map((listing) => (
                        <ListingCard
                          key={listing.id}
                          listing={listing}
                          onSelect={handleListingSelect}
                        />
                      ))}
                    </div>
                    
                    {/* Пагинация */}
                    {pagination && (
                      <Pagination 
                        pagination={pagination}
                        onPageChange={handlePageChange}
                      />
                    )}
                  </>
                )
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Модалки */}
      <ListingModal 
        listing={selectedListing}
        onClose={handleModalClose}
      />

      {showAuthModal && (
      <AuthModal 
        isOpen={showAuthModal}
          onClose={handleModalClose}
        initialMode={authMode}
      />
      )}
      </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;

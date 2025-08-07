import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AuthModal from './components/AuthModal';
import UserMenu from './components/UserMenu';
import './App.css';

interface Listing {
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
}

interface Filters {
  search: string;
  type: string;
  minArea: string;
  maxArea: string;
  minPrice: string;
  maxPrice: string;
}

function AppContent() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [filters, setFilters] = useState<Filters>({
    search: '',
    type: 'all',
    minArea: '',
    maxArea: '',
    minPrice: '',
    maxPrice: ''
  });

  const { user, loading: authLoading } = useAuth();

  const API_BASE = 'http://localhost:3001/api';

  useEffect(() => {
    fetchListings();
  }, [filters]);

  const fetchListings = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== 'all') {
          params.append(key, value);
        }
      });

      const response = await fetch(`${API_BASE}/listings?${params}`);
      if (!response.ok) throw new Error('Ошибка загрузки объявлений');
      
      const data = await response.json();
      setListings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Произошла ошибка');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ru-RU').format(price) + ' ₽';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU');
  };

  if (loading && listings.length === 0) {
  return (
      <div className="app">
        <div className="loading">Загрузка объявлений...</div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <div className="container">
          <div className="header-content">
            <div className="header-text">
              <h1>🏢 Сервис торговых помещений</h1>
              <p>Найдите идеальное место для вашего бизнеса</p>
            </div>
            <div className="header-auth">
              {user ? (
                <UserMenu />
              ) : (
                <div className="auth-buttons">
                  <button 
                    onClick={() => {
                      setAuthMode('login');
                      setShowAuthModal(true);
                    }}
                    className="auth-btn login-btn"
                  >
                    Войти
                  </button>
                  <button 
                    onClick={() => {
                      setAuthMode('register');
                      setShowAuthModal(true);
                    }}
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
          {/* Фильтры и поиск */}
          <div className="filters">
            <div className="search-box">
              <input
                type="text"
                placeholder="Поиск по названию, описанию, адресу..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="search-input"
              />
            </div>

            <div className="filter-row">
              <select
                value={filters.type}
                onChange={(e) => handleFilterChange('type', e.target.value)}
                className="filter-select"
              >
                <option value="all">Все типы</option>
                <option value="Магазин">Магазин</option>
                <option value="Ресторан/Кафе">Ресторан/Кафе</option>
                <option value="Офис">Офис</option>
                <option value="Склад">Склад</option>
              </select>

              <div className="range-inputs">
                <input
                  type="number"
                  placeholder="Площадь от"
                  value={filters.minArea}
                  onChange={(e) => handleFilterChange('minArea', e.target.value)}
                  className="filter-input"
                />
                <input
                  type="number"
                  placeholder="Площадь до"
                  value={filters.maxArea}
                  onChange={(e) => handleFilterChange('maxArea', e.target.value)}
                  className="filter-input"
                />
              </div>

              <div className="range-inputs">
                <input
                  type="number"
                  placeholder="Цена от"
                  value={filters.minPrice}
                  onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                  className="filter-input"
                />
                <input
                  type="number"
                  placeholder="Цена до"
                  value={filters.maxPrice}
                  onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                  className="filter-input"
                />
              </div>

              <button
                onClick={() => {
                  if (user) {
                    setShowAddForm(true);
                  } else {
                    setAuthMode('register');
                    setShowAuthModal(true);
                  }
                }}
                className="add-button"
              >
                + Добавить объявление
              </button>
            </div>
          </div>

          {/* Результаты */}
          {error && (
            <div className="error-message">
              ❌ {error}
            </div>
          )}

          <div className="results-info">
            Найдено объявлений: <strong>{listings.length}</strong>
          </div>

          {/* Список объявлений в стиле Авито */}
          <div className="listings-grid">
            {listings.map((listing) => (
              <div
                key={listing.id}
                className="listing-card"
                onClick={() => setSelectedListing(listing)}
              >
                <div className="listing-card-content">
                  <div className="listing-header">
                    <h3 className="listing-title">{listing.title}</h3>
                    <span className="listing-type">{listing.type}</span>
                  </div>

                  <div className="listing-info">
                    <div className="location">📍 {listing.location}</div>
                    <div className="details">
                      <span>{listing.area} м²</span>
                      <span>{listing.floor}/{listing.totalFloors} эт.</span>
                    </div>
                  </div>

                  <div className="listing-description">
                    {listing.description.substring(0, 120)}
                    {listing.description.length > 120 && '...'}
                  </div>

                  <div className="listing-features">
                    {listing.hasParking && <span className="feature">Парковка</span>}
                    {listing.hasStorage && <span className="feature">Склад</span>}
                  </div>

                  <div className="listing-footer">
                    <div className="price">{formatPrice(listing.price)} ₽/мес</div>
                    <div className="date">{formatDate(listing.createdAt)}</div>
                  </div>

                  <div className="contact-preview">
                    {listing.contactName}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {listings.length === 0 && !loading && (
            <div className="no-results">
              <h3>Объявления не найдены</h3>
              <p>Попробуйте изменить параметры поиска</p>
            </div>
          )}
        </div>
      </main>

      {/* Модальное окно с деталями */}
      {selectedListing && (
        <div className="modal-overlay" onClick={() => setSelectedListing(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button
              className="modal-close"
              onClick={() => setSelectedListing(null)}
            >
              ×
            </button>

            <h2>{selectedListing.title}</h2>
            
            <div className="modal-details">
              <div className="detail-row">
                <strong>Тип:</strong> {selectedListing.type}
              </div>
              <div className="detail-row">
                <strong>Площадь:</strong> {selectedListing.area} м²
              </div>
              <div className="detail-row">
                <strong>Этаж:</strong> {selectedListing.floor} из {selectedListing.totalFloors}
              </div>
              <div className="detail-row">
                <strong>Адрес:</strong> {selectedListing.location}
              </div>
              <div className="detail-row">
                <strong>Цена:</strong> {formatPrice(selectedListing.price)} в месяц
              </div>
            </div>

            <div className="modal-description">
              <h4>Описание</h4>
              <p>{selectedListing.description}</p>
            </div>

            <div className="modal-features">
              <h4>Дополнительно</h4>
              <div className="features-list">
                {selectedListing.hasParking && <span className="feature">🚗 Парковка</span>}
                {selectedListing.hasStorage && <span className="feature">📦 Склад</span>}
              </div>
            </div>

            <div className="modal-contact">
              <h4>Контакты</h4>
              <div className="contact-info">
                <div><strong>Имя:</strong> {selectedListing.contactName}</div>
                <div><strong>Телефон:</strong> <a href={`tel:${selectedListing.contactPhone}`}>{selectedListing.contactPhone}</a></div>
                {selectedListing.contactEmail && (
                  <div><strong>Email:</strong> <a href={`mailto:${selectedListing.contactEmail}`}>{selectedListing.contactEmail}</a></div>
                )}
              </div>

              <button className="contact-button">
                📞 Связаться с арендодателем
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Форма добавления объявления */}
      {showAddForm && (
        <div className="modal-overlay" onClick={() => setShowAddForm(false)}>
          <div className="modal-content form-modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="modal-close"
              onClick={() => setShowAddForm(false)}
            >
              ×
            </button>

            <h2>Добавить объявление</h2>
            <p>Форма добавления будет реализована в следующем этапе</p>
            
            <button
              onClick={() => setShowAddForm(false)}
              className="cancel-button"
            >
              Закрыть
        </button>
          </div>
        </div>
            )}

      {/* Модальное окно авторизации */}
      <AuthModal 
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialMode={authMode}
      />
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
import React, { useState } from 'react';
import './AISearch.css';

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

interface AISearchProps {
  listings: Listing[];
  onResults: (results: Listing[]) => void;
  onClear: () => void;
}

// AI алгоритм для анализа текста и поиска
class AISearchEngine {
  private static readonly KEYWORDS = {
    // Типы помещений
    types: {
      'магазин': ['магазин', 'торговля', 'продажа', 'ритейл', 'розница'],
      'ресторан': ['ресторан', 'кафе', 'бар', 'общепит', 'еда', 'питание', 'кухня'],
      'офис': ['офис', 'работа', 'бизнес', 'деловой', 'административный', 'IT', 'айти'],
      'склад': ['склад', 'хранение', 'логистика', 'товары', 'грузовой']
    },
    
    // Размеры
    sizes: {
      'маленький': { min: 0, max: 50 },
      'небольшой': { min: 50, max: 100 },
      'средний': { min: 100, max: 200 },
      'большой': { min: 200, max: 500 },
      'огромный': { min: 500, max: Infinity }
    },
    
    // Цены
    prices: {
      'дешево': { min: 0, max: 50000 },
      'недорого': { min: 50000, max: 100000 },
      'средняя цена': { min: 100000, max: 200000 },
      'дорого': { min: 200000, max: 500000 },
      'премиум': { min: 500000, max: Infinity }
    },
    
    // Особенности
    features: {
      'парковка': ['парковка', 'паркинг', 'машина', 'авто'],
      'склад': ['склад', 'хранение', 'подсобка'],
      'центр': ['центр', 'центральный', 'downtown'],
      'метро': ['метро', 'станция', 'транспорт'],
      'первый этаж': ['первый этаж', '1 этаж', 'партер'],
      'высокий этаж': ['высокий этаж', 'верхний этаж', 'вид']
    }
  };

  static search(query: string, listings: Listing[]): Listing[] {
    const normalizedQuery = query.toLowerCase().trim();
    
    if (!normalizedQuery) {
      return listings;
    }

    const scoredListings = listings.map(listing => ({
      listing,
      score: this.calculateScore(normalizedQuery, listing)
    }));

    // Сортируем по релевантности (убывание)
    scoredListings.sort((a, b) => b.score - a.score);

    // Возвращаем только релевантные результаты (score > 0)
    return scoredListings
      .filter(item => item.score > 0)
      .map(item => item.listing);
  }

  private static calculateScore(query: string, listing: Listing): number {
    let score = 0;
    const text = `${listing.title} ${listing.description} ${listing.location} ${listing.type}`.toLowerCase();

    // 1. Прямое совпадение в тексте
    if (text.includes(query)) {
      score += 100;
    }

    // 2. Анализ по типам помещений
    for (const [type, keywords] of Object.entries(this.KEYWORDS.types)) {
      if (keywords.some(keyword => query.includes(keyword))) {
        if (listing.type.toLowerCase().includes(type)) {
          score += 50;
        }
      }
    }

    // 3. Анализ размеров
    for (const [size, range] of Object.entries(this.KEYWORDS.sizes)) {
      if (query.includes(size)) {
        if (listing.area >= range.min && listing.area <= range.max) {
          score += 30;
        }
      }
    }

    // 4. Анализ цен
    for (const [priceLevel, range] of Object.entries(this.KEYWORDS.prices)) {
      if (query.includes(priceLevel)) {
        if (listing.price >= range.min && listing.price <= range.max) {
          score += 30;
        }
      }
    }

    // 5. Анализ особенностей
    for (const [feature, keywords] of Object.entries(this.KEYWORDS.features)) {
      if (keywords.some(keyword => query.includes(keyword))) {
        switch (feature) {
          case 'парковка':
            if (listing.hasParking) score += 25;
            break;
          case 'склад':
            if (listing.hasStorage) score += 25;
            break;
          case 'центр':
            if (listing.location.toLowerCase().includes('центр')) score += 20;
            break;
          case 'метро':
            if (listing.location.toLowerCase().includes('метро') || 
                listing.description.toLowerCase().includes('метро')) score += 20;
            break;
          case 'первый этаж':
            if (listing.floor === 1) score += 15;
            break;
          case 'высокий этаж':
            if (listing.floor > 5) score += 15;
            break;
        }
      }
    }

    // 6. Извлечение чисел из запроса (площадь, цена)
    const numbers = query.match(/\d+/g);
    if (numbers) {
      numbers.forEach(numStr => {
        const num = parseInt(numStr);
        
        // Если число похоже на площадь (до 1000)
        if (num <= 1000 && Math.abs(listing.area - num) <= 20) {
          score += 40;
        }
        
        // Если число похоже на цену (больше 1000)
        if (num > 1000 && Math.abs(listing.price - num) <= num * 0.2) {
          score += 40;
        }
      });
    }

    // 7. Бонус за полноту совпадения
    const queryWords = query.split(/\s+/);
    const matchedWords = queryWords.filter(word => 
      word.length > 2 && text.includes(word)
    );
    
    if (matchedWords.length > 0) {
      score += (matchedWords.length / queryWords.length) * 20;
    }

    return score;
  }
}

const AISearch: React.FC<AISearchProps> = ({ listings, onResults, onClear }) => {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [suggestions] = useState([
    "Ищу небольшой магазин в центре с парковкой",
    "Нужен офис до 100 кв.м недорого",
    "Ресторан на первом этаже с большой площадью",
    "Склад с хорошей логистикой",
    "Торговое помещение рядом с метро до 150000",
    "Кафе с террасой в хорошем районе"
  ]);

  const handleSearch = async () => {
    if (!query.trim()) {
      onClear();
      return;
    }

    setIsSearching(true);
    
    // Имитируем небольшую задержку для эффекта "обработки"
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const results = AISearchEngine.search(query, listings);
    onResults(results);
    
    setIsSearching(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
  };

  const handleClear = () => {
    setQuery('');
    onClear();
  };

  return (
    <div className="ai-search">
      <div className="ai-search-header">
        <h3>🤖 AI-Поиск помещений</h3>
        <p>Опишите что вы ищете естественным языком</p>
      </div>

      <div className="ai-search-input">
        <div className="search-input-wrapper">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Например: 'Ищу небольшой офис в центре до 100000 рублей'"
            className="ai-search-field"
            disabled={isSearching}
          />
          {query && (
            <button 
              onClick={handleClear}
              className="clear-button"
              title="Очистить"
            >
              ×
            </button>
          )}
        </div>
        
        <button 
          onClick={handleSearch}
          className={`ai-search-button ${isSearching ? 'searching' : ''}`}
          disabled={isSearching}
        >
          {isSearching ? (
            <>
              <span className="spinner"></span>
              Анализирую...
            </>
          ) : (
            '🔍 Найти'
          )}
        </button>
      </div>

      <div className="ai-suggestions">
        <p>Примеры запросов:</p>
        <div className="suggestions-list">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => handleSuggestionClick(suggestion)}
              className="suggestion-chip"
              disabled={isSearching}
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AISearch;

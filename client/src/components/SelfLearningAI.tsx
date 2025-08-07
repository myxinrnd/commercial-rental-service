import { useState, useEffect } from 'react';
import type { Listing, SearchResult } from '../types';
import './AISearch.css';

interface UserInteraction {
  query: string;
  timestamp: number;
  resultsCount: number;
  clickedListings: string[];
  feedbackRating?: number;
  sessionId: string;
}

interface LearningData {
  queryPatterns: Map<string, number>;
  successfulQueries: UserInteraction[];
  featureWeights: Map<string, number>;
  userPreferences: Map<string, number>;
  contextualMappings: Map<string, string[]>;
}

interface SelfLearningAIProps {
  listings: Listing[];
  onResults: (results: Listing[]) => void;
  onClear: () => void;
}

// Самообучающийся AI-движок
class SelfLearningAIEngine {
  private static instance: SelfLearningAIEngine;
  private learningData: LearningData;
  private currentSessionId: string;
  private currentQuery: string = '';


  private constructor() {
    this.currentSessionId = this.generateSessionId();
    this.learningData = this.loadLearningData();
  }

  public static getInstance(): SelfLearningAIEngine {
    if (!SelfLearningAIEngine.instance) {
      SelfLearningAIEngine.instance = new SelfLearningAIEngine();
    }
    return SelfLearningAIEngine.instance;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private loadLearningData(): LearningData {
    const saved = localStorage.getItem('ai_learning_data');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          queryPatterns: new Map(parsed.queryPatterns || []),
          successfulQueries: parsed.successfulQueries || [],
          featureWeights: new Map(parsed.featureWeights || []),
          userPreferences: new Map(parsed.userPreferences || []),
          contextualMappings: new Map(parsed.contextualMappings || [])
        };
      } catch (e) {
        console.warn('Failed to load learning data:', e);
      }
    }

    // Инициализация базовых весов
    return {
      queryPatterns: new Map(),
      successfulQueries: [],
      featureWeights: new Map([
        ['exact_match', 100],
        ['type_match', 50],
        ['size_match', 30],
        ['price_match', 30],
        ['feature_match', 25],
        ['location_match', 20],
        ['number_match', 40],
        ['word_match', 20]
      ]),
      userPreferences: new Map(),
      contextualMappings: new Map()
    };
  }

  private saveLearningData(): void {
    try {
      const toSave = {
        queryPatterns: Array.from(this.learningData.queryPatterns.entries()),
        successfulQueries: this.learningData.successfulQueries.slice(-1000), // Храним последние 1000
        featureWeights: Array.from(this.learningData.featureWeights.entries()),
        userPreferences: Array.from(this.learningData.userPreferences.entries()),
        contextualMappings: Array.from(this.learningData.contextualMappings.entries())
      };
      localStorage.setItem('ai_learning_data', JSON.stringify(toSave));
    } catch (e) {
      console.warn('Failed to save learning data:', e);
    }
  }

  // Обучение на основе пользовательских взаимодействий
  public recordInteraction(interaction: UserInteraction): void {
    this.learningData.successfulQueries.push(interaction);
    
    // Анализируем успешные паттерны
    if (interaction.clickedListings.length > 0) {
      this.analyzeSuccessfulQuery(interaction);
    }
    
    // Обновляем веса на основе обратной связи
    if (interaction.feedbackRating !== undefined) {
      this.updateWeightsBasedOnFeedback(interaction);
    }

    this.saveLearningData();
  }

  private analyzeSuccessfulQuery(interaction: UserInteraction): void {
    const query = interaction.query.toLowerCase();
    const words = query.split(/\s+/).filter(word => word.length > 2);
    
    // Увеличиваем частоту успешных паттернов
    words.forEach(word => {
      const current = this.learningData.queryPatterns.get(word) || 0;
      this.learningData.queryPatterns.set(word, current + 1);
    });

    // Анализируем контекстные связи
    if (interaction.clickedListings.length > 0) {
      this.learningData.contextualMappings.set(query, interaction.clickedListings);
    }
  }

  private updateWeightsBasedOnFeedback(interaction: UserInteraction): void {
    const rating = interaction.feedbackRating!;
    const adjustment = (rating - 3) * 5; // -10 to +10 adjustment
    
    // Адаптируем веса на основе рейтинга
    this.learningData.featureWeights.forEach((weight, feature) => {
      const newWeight = Math.max(5, Math.min(150, weight + adjustment));
      this.learningData.featureWeights.set(feature, newWeight);
    });
  }

  // Улучшенный поиск с самообучением
  public search(query: string, listings: Listing[]): Listing[] {
    this.currentQuery = query;
    // Начинаем отсчет времени запроса
    
    const normalizedQuery = query.toLowerCase().trim();
    
    if (!normalizedQuery) {
      return listings;
    }

    const scoredListings = listings.map(listing => {
      const result = this.calculateAdaptiveScore(normalizedQuery, listing);
      return {
        listing,
        score: result.score,
        matchedFeatures: result.matchedFeatures
      };
    });

    // Применяем машинное обучение для ранжирования
    const rankedListings = this.applyMLRanking(scoredListings, normalizedQuery);

    // Записываем метрики для обучения
    this.recordSearchMetrics(normalizedQuery, rankedListings.length);

    return rankedListings
      .filter(item => item.score > 0)
      .map(item => item.listing);
  }

  private calculateAdaptiveScore(query: string, listing: Listing): { score: number, matchedFeatures: string[] } {
    let score = 0;
    const matchedFeatures: string[] = [];
    const text = `${listing.title} ${listing.description} ${listing.location} ${listing.type}`.toLowerCase();

    // Получаем адаптивные веса
    const weights = this.learningData.featureWeights;

    // 1. Прямое совпадение (адаптивный вес)
    if (text.includes(query)) {
      score += weights.get('exact_match') || 100;
      matchedFeatures.push('exact_match');
    }

    // 2. Анализ типов с учетом обучения
    const typeKeywords = this.getLearnedTypeKeywords(listing.type);
    if (typeKeywords.some(keyword => query.includes(keyword))) {
      score += weights.get('type_match') || 50;
      matchedFeatures.push('type_match');
    }

    // 3. Размеры с адаптивными диапазонами
    const sizeScore = this.calculateAdaptiveSizeScore(query, listing.area);
    if (sizeScore > 0) {
      score += sizeScore * (weights.get('size_match') || 30) / 30;
      matchedFeatures.push('size_match');
    }

    // 4. Цены с обученными предпочтениями
    const priceScore = this.calculateAdaptivePriceScore(query, listing.price);
    if (priceScore > 0) {
      score += priceScore * (weights.get('price_match') || 30) / 30;
      matchedFeatures.push('price_match');
    }

    // 5. Особенности с учетом пользовательских предпочтений
    const featureScore = this.calculateFeatureScore(query, listing);
    if (featureScore > 0) {
      score += featureScore * (weights.get('feature_match') || 25) / 25;
      matchedFeatures.push('feature_match');
    }

    // 6. Контекстное обучение
    const contextScore = this.calculateContextualScore(query, listing);
    if (contextScore > 0) {
      score += contextScore;
      matchedFeatures.push('context_match');
    }

    // 7. Семантическое сходство на основе истории
    const semanticScore = this.calculateSemanticSimilarity(query, text);
    if (semanticScore > 0) {
      score += semanticScore;
      matchedFeatures.push('semantic_match');
    }

    return { score, matchedFeatures };
  }

  private getLearnedTypeKeywords(type: string): string[] {
    const baseKeywords = {
      'магазин': ['магазин', 'торговля', 'продажа', 'ритейл', 'розница'],
      'ресторан': ['ресторан', 'кафе', 'бар', 'общепит', 'еда', 'питание'],
      'офис': ['офис', 'работа', 'бизнес', 'деловой', 'it'],
      'склад': ['склад', 'хранение', 'логистика', 'товары']
    };

    const typeLower = type.toLowerCase();
    let keywords = baseKeywords[typeLower as keyof typeof baseKeywords] || [];

    // Добавляем изученные синонимы
    this.learningData.queryPatterns.forEach((frequency, word) => {
      if (frequency > 5 && word.includes(typeLower.substring(0, 4))) {
        keywords.push(word);
      }
    });

    return keywords;
  }

  private calculateAdaptiveSizeScore(query: string, area: number): number {
    // Анализируем числа в запросе
    const numbers = query.match(/\d+/g);
    if (numbers) {
      for (const numStr of numbers) {
        const num = parseInt(numStr);
        if (num <= 1000) { // Похоже на площадь
          const diff = Math.abs(area - num);
          if (diff <= 20) return 40;
          if (diff <= 50) return 20;
          if (diff <= 100) return 10;
        }
      }
    }

    // Адаптивные размеры на основе обучения
    const learnedSizes = this.getLearnedSizePreferences();
    for (const [sizeWord, range] of Object.entries(learnedSizes)) {
      if (query.includes(sizeWord)) {
        if (area >= range.min && area <= range.max) {
          return 30;
        }
      }
    }

    return 0;
  }

  private getLearnedSizePreferences(): Record<string, {min: number, max: number}> {
    // Базовые размеры, которые адаптируются
    const baseSizes = {
      'маленький': { min: 0, max: 50 },
      'небольшой': { min: 50, max: 100 },
      'средний': { min: 100, max: 200 },
      'большой': { min: 200, max: 500 }
    };

    // TODO: Адаптировать диапазоны на основе успешных запросов
    return baseSizes;
  }

  private calculateAdaptivePriceScore(query: string, price: number): number {
    const numbers = query.match(/\d+/g);
    if (numbers) {
      for (const numStr of numbers) {
        const num = parseInt(numStr);
        if (num > 1000) { // Похоже на цену
          const diff = Math.abs(price - num);
          if (diff <= num * 0.1) return 40;
          if (diff <= num * 0.2) return 20;
          if (diff <= num * 0.3) return 10;
        }
      }
    }

    // Анализ ценовых предпочтений
    const priceWords = ['дешево', 'недорого', 'дорого', 'премиум'];
    for (const word of priceWords) {
      if (query.includes(word)) {
        const preference = this.learningData.userPreferences.get(`price_${word}`) || 0;
        return Math.min(30, preference / 10);
      }
    }

    return 0;
  }

  private calculateFeatureScore(query: string, listing: Listing): number {
    let score = 0;
    
    const features = [
      { keywords: ['парковка', 'паркинг'], has: listing.hasParking },
      { keywords: ['склад', 'хранение'], has: listing.hasStorage },
      { keywords: ['центр'], has: listing.location.toLowerCase().includes('центр') },
      { keywords: ['метро'], has: listing.location.toLowerCase().includes('метро') },
      { keywords: ['первый этаж', '1 этаж'], has: listing.floor === 1 }
    ];

    features.forEach(feature => {
      if (feature.keywords.some(keyword => query.includes(keyword)) && feature.has) {
        const featureName = feature.keywords[0];
        const learnedWeight = this.learningData.userPreferences.get(`feature_${featureName}`) || 1;
        score += 25 * learnedWeight;
      }
    });

    return score;
  }

  private calculateContextualScore(query: string, listing: Listing): number {
    // Ищем похожие запросы в истории
    const similarQueries = Array.from(this.learningData.contextualMappings.keys())
      .filter(savedQuery => this.calculateStringSimilarity(query, savedQuery) > 0.7);

    for (const similarQuery of similarQueries) {
      const successfulListings = this.learningData.contextualMappings.get(similarQuery) || [];
      if (successfulListings.includes(listing.id)) {
        return 50; // Бонус за контекстное соответствие
      }
    }

    return 0;
  }

  private calculateSemanticSimilarity(query: string, text: string): number {
    const queryWords = query.split(/\s+/);
    const textWords = text.split(/\s+/);
    
    let matchCount = 0;
    queryWords.forEach(qWord => {
      if (qWord.length > 2) {
        const hasMatch = textWords.some(tWord => 
          tWord.includes(qWord) || qWord.includes(tWord) ||
          this.calculateStringSimilarity(qWord, tWord) > 0.8
        );
        if (hasMatch) matchCount++;
      }
    });

    return (matchCount / queryWords.length) * 30;
  }

  private calculateStringSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  private applyMLRanking(results: SearchResult[], query: string): SearchResult[] {
    // Применяем машинное обучение для улучшения ранжирования
    return results.sort((a, b) => {
      let scoreA = a.score;
      let scoreB = b.score;

      // Бонус за разнообразие типов результатов
      const typeBonus = this.calculateTypeBonus(a.listing.type, query);
      scoreA += typeBonus;

      const typeBonusB = this.calculateTypeBonus(b.listing.type, query);
      scoreB += typeBonusB;

      // Бонус за популярность (на основе кликов)
      const popularityA = this.calculatePopularityScore(a.listing.id);
      const popularityB = this.calculatePopularityScore(b.listing.id);
      
      scoreA += popularityA;
      scoreB += popularityB;

      return scoreB - scoreA;
    });
  }

  private calculateTypeBonus(type: string, _query: string): number {
    const typeFrequency = this.learningData.userPreferences.get(`type_${type.toLowerCase()}`) || 0;
    return Math.min(20, typeFrequency / 5);
  }

  private calculatePopularityScore(listingId: string): number {
    const clickCount = this.learningData.successfulQueries.reduce((count, interaction) => {
      return count + (interaction.clickedListings.includes(listingId) ? 1 : 0);
    }, 0);
    
    return Math.min(15, clickCount * 2);
  }

  private recordSearchMetrics(query: string, resultsCount: number): void {
    // Записываем метрики для дальнейшего анализа
    console.log(`[AI Learning] Query: "${query}", Results: ${resultsCount}`);
  }

  // Методы для записи пользовательского поведения
  public recordClick(listingId: string): void {
    if (this.currentQuery) {
      const existing = this.learningData.contextualMappings.get(this.currentQuery) || [];
      if (!existing.includes(listingId)) {
        existing.push(listingId);
        this.learningData.contextualMappings.set(this.currentQuery, existing);
        this.saveLearningData();
      }
    }
  }

  public recordFeedback(rating: number): void {
    if (this.currentQuery) {
      const interaction: UserInteraction = {
        query: this.currentQuery,
        timestamp: Date.now(),
        resultsCount: 0,
        clickedListings: [],
        feedbackRating: rating,
        sessionId: this.currentSessionId
      };
      
      this.recordInteraction(interaction);
    }
  }

  // Получение статистики обучения
  public getLearningStats(): any {
    return {
      totalQueries: this.learningData.successfulQueries.length,
      uniquePatterns: this.learningData.queryPatterns.size,
      learnedWeights: Object.fromEntries(this.learningData.featureWeights),
      topPatterns: Array.from(this.learningData.queryPatterns.entries())
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
    };
  }
}

const SelfLearningAI: React.FC<SelfLearningAIProps> = ({ listings, onResults, onClear }) => {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [_lastResultsCount, setLastResultsCount] = useState(0);
  const [aiEngine] = useState(() => SelfLearningAIEngine.getInstance());
  const [learningStats, setLearningStats] = useState(aiEngine.getLearningStats());

  const suggestions = [
    "Ищу небольшой магазин в центре с парковкой",
    "Нужен офис до 100 кв.м недорого", 
    "Ресторан на первом этаже с большой площадью",
    "Склад с хорошей логистикой",
    "Торговое помещение рядом с метро до 150000",
    "Кафе с террасой в хорошем районе"
  ];

  const handleSearch = async () => {
    if (!query.trim()) {
      onClear();
      return;
    }

    setIsSearching(true);
    
    await new Promise(resolve => setTimeout(resolve, 800)); // Имитация более сложной обработки
    
    const results = aiEngine.search(query, listings);
    setLastResultsCount(results.length);
    onResults(results);
    
    setIsSearching(false);
    setShowFeedback(true);
    
    // Обновляем статистику
    setLearningStats(aiEngine.getLearningStats());
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
    setShowFeedback(false);
    onClear();
  };

  const handleFeedback = (rating: number) => {
    aiEngine.recordFeedback(rating);
    setShowFeedback(false);
    setLearningStats(aiEngine.getLearningStats());
  };

  // Записываем клики по объявлениям
  useEffect(() => {
    const handleListingClick = (event: CustomEvent) => {
      aiEngine.recordClick(event.detail.listingId);
    };

    window.addEventListener('listingClick', handleListingClick as EventListener);
    return () => {
      window.removeEventListener('listingClick', handleListingClick as EventListener);
    };
  }, [aiEngine]);

  return (
    <div className="ai-search">
      <div className="ai-search-header">
        <h3>🧠 Самообучающийся AI-Поиск</h3>
        <p>Становится умнее с каждым вашим запросом • Обучено на {learningStats.totalQueries} запросах</p>
      </div>

      <div className="ai-search-input">
        <div className="search-input-wrapper">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Опишите что ищете - AI запомнит ваши предпочтения"
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
              Обучаюсь...
            </>
          ) : (
            '🔍 Найти'
          )}
        </button>
      </div>

      {showFeedback && (
        <div className="feedback-section">
          <p>Насколько полезными были результаты?</p>
          <div className="feedback-buttons">
            {[1, 2, 3, 4, 5].map(rating => (
              <button
                key={rating}
                onClick={() => handleFeedback(rating)}
                className="feedback-btn"
                title={`${rating} звезд`}
              >
                {'★'.repeat(rating)}{'☆'.repeat(5-rating)}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="ai-suggestions">
        <p>Примеры запросов (попробуйте - AI запомнит что вам нравится):</p>
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

      <div className="learning-stats">
        <details>
          <summary>📊 Статистика обучения AI</summary>
          <div className="stats-content">
            <div>Всего запросов: <strong>{learningStats.totalQueries}</strong></div>
            <div>Изученных паттернов: <strong>{learningStats.uniquePatterns}</strong></div>
            <div>Топ-паттерны: {learningStats.topPatterns.slice(0, 3).map(([word]: [string, number]) => word).join(', ')}</div>
          </div>
        </details>
      </div>
    </div>
  );
};

export default SelfLearningAI;

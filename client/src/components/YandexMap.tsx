import React, { useEffect, useRef, useState, memo, useMemo, useCallback } from 'react';
import type { Listing } from '../types';

interface YandexMapProps {
  listings: Listing[];
  onMarkerClick?: (listing: Listing) => void;
  center?: [number, number];
  zoom?: number;
  className?: string;
}

declare global {
  interface Window {
    ymaps: any;
    showListingDetails: (listingId: string) => void;
  }
}

const YandexMap: React.FC<YandexMapProps> = memo(({
  listings,
  onMarkerClick,
  center = [55.76, 37.64], // Москва по умолчанию
  zoom = 10,
  className = ''
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const lastHashRef = useRef<string>('');

  // Мемоизируем валидные объявления для предотвращения лишних рендеров
  const validListings = useMemo(() => {
    return listings.filter(listing => listing.coordinates);
  }, [listings]);

  // Дополнительная мемоизация для координат чтобы избежать лишних обновлений
  const listingsHash = useMemo(() => {
    return validListings.map(l => `${l.id}-${l.coordinates?.lat}-${l.coordinates?.lng}`).join(',');
  }, [validListings]);

  // Мемоизированная функция для обработки клика по маркеру
  const handleMarkerClick = useCallback((listing: Listing) => {
    if (onMarkerClick) {
      onMarkerClick(listing);
    }
  }, [onMarkerClick]);

  // Загружаем API Yandex Maps
  useEffect(() => {
    if (window.ymaps) {
      setIsLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://api-maps.yandex.ru/2.1/?lang=ru_RU';
    script.async = true;
    script.onload = () => {
      window.ymaps.ready(() => {
        setIsLoaded(true);
      });
    };
    script.onerror = () => {
      console.error('Ошибка загрузки Yandex Maps API');
    };
    document.head.appendChild(script);

    return () => {
      // Очистка не нужна, так как API глобальный
    };
  }, []);

  // Инициализация карты
  useEffect(() => {
    if (!isLoaded || !mapRef.current) return;

    const map = new window.ymaps.Map(mapRef.current, {
      center: center,
      zoom: zoom,
      controls: ['zoomControl', 'fullscreenControl', 'geolocationControl'],
      // Настройки для стабильного отображения маркеров
      type: 'yandex#map',
      // Ограничения зума для предотвращения исчезновения маркеров
      restrictMapArea: false,
      avoidFractionalZoom: false
    });

    mapInstance.current = map;

    return () => {
      if (mapInstance.current) {
        mapInstance.current.destroy();
      }
    };
  }, [isLoaded, center, zoom]);

  // Добавление маркеров
  useEffect(() => {
    console.log('🗺️ Markers effect triggered:', {
      hasMapInstance: !!mapInstance.current,
      listingsHash,
      validListingsCount: validListings.length,
      hasYmaps: !!window.ymaps
    });
    
    if (!mapInstance.current || !listingsHash) {
      console.log('🚫 Exiting early: missing mapInstance or listingsHash');
      return;
    }
    
    // Проверяем, изменился ли реально hash (но не блокируем первую загрузку)
    if (lastHashRef.current === listingsHash && lastHashRef.current !== '') {
      console.log('🔄 Hash unchanged, skipping markers update');
      return;
    }
    
    console.log('✅ Updating markers, hash changed:', lastHashRef.current, '->', listingsHash);
    lastHashRef.current = listingsHash;

    // Очищаем предыдущие маркеры
    mapInstance.current.geoObjects.removeAll();

    if (!validListings.length) {
      console.log('🚫 No valid listings with coordinates');
      return;
    }

    console.log('📍 Creating markers for', validListings.length, 'listings');

    // Создаем ObjectManager для лучшей производительности и стабильности
    const objectManager = new window.ymaps.ObjectManager({
      clusterize: true,
      gridSize: 32,
      clusterDisableClickZoom: true
    });

    console.log('🏗️ ObjectManager created:', objectManager);

    // Подготавливаем данные для ObjectManager
    const features = validListings.map((listing, index) => ({
      type: 'Feature',
      id: index,
      geometry: {
        type: 'Point',
        coordinates: [listing.coordinates!.lat, listing.coordinates!.lng]
      },
      properties: {
        balloonContentHeader: listing.title,
        balloonContentBody: `
          <div style="max-width: 300px;">
            <p><strong>${listing.area} м²</strong></p>
            <p>${listing.description.substring(0, 100)}...</p>
            <p><strong>Цена: ${listing.price.toLocaleString()} ₽/мес</strong></p>
            <p>📍 ${listing.location}</p>
          </div>
        `,
        balloonContentFooter: `<button onclick="window.showListingDetails('${listing.id}')" style="
          background: #0D64A6; 
          color: white; 
          border: none; 
          padding: 8px 16px; 
          border-radius: 4px; 
          cursor: pointer;
        ">Подробнее</button>`,
        hintContent: `${listing.title} - ${listing.price.toLocaleString()} ₽`,
        listingId: listing.id
      },
      options: {
        preset: 'islands#blueCircleDotIcon'
      }
    }));

    // Добавляем данные в ObjectManager
    console.log('🎯 Adding features to ObjectManager:', features.length, 'features');
    objectManager.add({ type: 'FeatureCollection', features: features });

    // Обработчик клика по маркеру
    objectManager.objects.events.add('click', (e: any) => {
      const objectId = e.get('objectId');
      const listing = validListings[objectId];
      console.log('📌 Marker clicked:', { objectId, listing: listing?.title });
      if (listing && handleMarkerClick) {
        handleMarkerClick(listing);
      }
    });

    // Добавляем ObjectManager на карту
    console.log('🗺️ Adding ObjectManager to map');
    mapInstance.current.geoObjects.add(objectManager);
    
    console.log('✨ Markers setup complete!');
    


    // Автоматическое центрирование только при первой загрузке
    if (validListings.length > 0) {
      const coordinates = validListings.map(listing => [listing.coordinates!.lat, listing.coordinates!.lng]);
      
      if (coordinates.length > 1) {
        mapInstance.current.setBounds(coordinates, {
          checkZoomRange: true,
          zoomMargin: 20
        });
      } else if (coordinates.length === 1) {
        mapInstance.current.setCenter(coordinates[0], 15);
      }
    }
  }, [listingsHash, validListings, handleMarkerClick]);

  // Глобальная функция для обработки клика "Подробнее"
  useEffect(() => {
    window.showListingDetails = (listingId: string) => {
      const listing = listings.find(l => l.id === listingId);
      if (listing && onMarkerClick) {
        onMarkerClick(listing);
      }
    };

    return () => {
      if ('showListingDetails' in window) {
        delete (window as any).showListingDetails;
      }
    };
  }, [listings, onMarkerClick]);

  if (!isLoaded) {
    return (
      <div className={`map-container ${className}`}>
        <div className="map-loading">
          <div className="loading-spinner"></div>
          <p>Загружается карта...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`map-container ${className}`}>
      <div ref={mapRef} className="yandex-map" />
    </div>
  );
});

YandexMap.displayName = 'YandexMap';

export default YandexMap;

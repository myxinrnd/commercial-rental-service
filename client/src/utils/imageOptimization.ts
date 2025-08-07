// Утилиты для оптимизации изображений

export interface ImageOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png';
}

/**
 * Сжимает файл изображения
 */
export const compressImage = (
  file: File, 
  options: ImageOptions = {}
): Promise<File> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      const { width = img.width, height = img.height, quality = 0.8, format = 'jpeg' } = options;

      // Устанавливаем размеры canvas
      canvas.width = width;
      canvas.height = height;

      // Рисуем изображение с новыми размерами
      ctx?.drawImage(img, 0, 0, width, height);

      // Конвертируем в blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const optimizedFile = new File([blob], file.name, {
              type: `image/${format}`,
              lastModified: Date.now()
            });
            resolve(optimizedFile);
          } else {
            reject(new Error('Ошибка сжатия изображения'));
          }
        },
        `image/${format}`,
        quality
      );
    };

    img.onerror = () => reject(new Error('Ошибка загрузки изображения'));
    img.src = URL.createObjectURL(file);
  });
};

/**
 * Создает thumbnail изображения
 */
export const createThumbnail = (file: File, size: number = 150): Promise<File> => {
  return compressImage(file, {
    width: size,
    height: size,
    quality: 0.7,
    format: 'webp'
  });
};

/**
 * Конвертирует изображение в WebP формат
 */
export const convertToWebP = (file: File, quality: number = 0.8): Promise<File> => {
  return compressImage(file, {
    quality,
    format: 'webp'
  });
};

/**
 * Проверяет поддержку WebP браузером
 */
export const supportsWebP = (): Promise<boolean> => {
  return new Promise((resolve) => {
    const webP = new Image();
    webP.onload = webP.onerror = () => {
      resolve(webP.height === 2);
    };
    webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
  });
};

/**
 * Создает оптимизированные версии изображения
 */
export const createImageVariants = async (
  file: File
): Promise<{
  original: File;
  compressed: File;
  thumbnail: File;
  webp?: File;
}> => {
  const [compressed, thumbnail, webpSupported] = await Promise.all([
    compressImage(file, { quality: 0.85 }),
    createThumbnail(file),
    supportsWebP()
  ]);

  const result: any = {
    original: file,
    compressed,
    thumbnail
  };

  if (webpSupported) {
    result.webp = await convertToWebP(file);
  }

  return result;
};

/**
 * Validates image file
 */
export const validateImageFile = (file: File): string | null => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const maxSize = 10 * 1024 * 1024; // 10MB

  if (!allowedTypes.includes(file.type)) {
    return 'Неподдерживаемый формат файла. Используйте JPEG, PNG, GIF или WebP.';
  }

  if (file.size > maxSize) {
    return 'Файл слишком большой. Максимальный размер: 10MB.';
  }

  return null;
};

/**
 * Lazy loading для изображений
 */
export const setupLazyLoading = () => {
  if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement;
          const src = img.dataset.src;
          
          if (src) {
            img.src = src;
            img.classList.remove('lazy');
            observer.unobserve(img);
          }
        }
      });
    });

    document.querySelectorAll('img[data-src]').forEach((img) => {
      imageObserver.observe(img);
    });
  }
};

/**
 * Preload критически важных изображений
 */
export const preloadImages = (urls: string[]): Promise<void[]> => {
  return Promise.all(
    urls.map(
      (url) =>
        new Promise<void>((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve();
          img.onerror = reject;
          img.src = url;
        })
    )
  );
};

import { memo } from 'react';
import type { Pagination as PaginationType } from '../types';

interface PaginationProps {
  pagination: PaginationType;
  onPageChange: (page: number) => void;
}

const Pagination = memo(({ pagination, onPageChange }: PaginationProps) => {
  const { currentPage, totalPages, totalCount, hasNextPage, hasPreviousPage } = pagination;

  // Генерируем массив номеров страниц для отображения
  const generatePageNumbers = () => {
    const delta = 2; // Количество страниц слева и справа от текущей
    const range = [];
    const rangeWithDots = [];

    // Всегда показываем первую страницу
    for (let i = Math.max(2, currentPage - delta); 
         i <= Math.min(totalPages - 1, currentPage + delta); 
         i++) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, '...');
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push('...', totalPages);
    } else if (totalPages > 1) {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots;
  };

  const pageNumbers = generatePageNumbers();

  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="pagination">
      <div className="pagination-info">
        Показано объявлений: <strong>{Math.min(currentPage * 20, totalCount)}</strong> из <strong>{totalCount}</strong>
      </div>
      
      <div className="pagination-controls">
        <button
          className="pagination-btn pagination-btn-prev"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!hasPreviousPage}
          aria-label="Предыдущая страница"
        >
          ← Назад
        </button>

        <div className="pagination-numbers">
          {pageNumbers.map((page, index) => (
            <span key={index}>
              {page === '...' ? (
                <span className="pagination-dots">...</span>
              ) : (
                <button
                  className={`pagination-number ${page === currentPage ? 'active' : ''}`}
                  onClick={() => onPageChange(page as number)}
                  aria-label={`Страница ${page}`}
                  aria-current={page === currentPage ? 'page' : undefined}
                >
                  {page}
                </button>
              )}
            </span>
          ))}
        </div>

        <button
          className="pagination-btn pagination-btn-next"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!hasNextPage}
          aria-label="Следующая страница"
        >
          Вперед →
        </button>
      </div>
    </div>
  );
});

Pagination.displayName = 'Pagination';

export default Pagination;

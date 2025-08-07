import React from 'react';

interface SkeletonCardProps {
  index?: number;
}

const SkeletonCard: React.FC<SkeletonCardProps> = ({ index = 0 }) => {
  // Небольшая вариативность для более естественного вида
  const titleWidth = index % 3 === 0 ? '75%' : index % 3 === 1 ? '60%' : '85%';
  const detailsCount = 2 + (index % 3);
  
  return (
    <div className="skeleton-card">
      <div className="skeleton-image"></div>
      <div className="skeleton-content">
        <div className="skeleton-title" style={{ width: titleWidth }}></div>
        <div className="skeleton-title skeleton-title-short"></div>
        <div className="skeleton-description"></div>
        <div className="skeleton-description" style={{ width: '80%' }}></div>
        <div className="skeleton-details">
          {Array.from({ length: detailsCount }, (_, i) => (
            <div key={i} className="skeleton-detail"></div>
          ))}
        </div>
        <div className="skeleton-footer">
          <div className="skeleton-price"></div>
          <div className="skeleton-button"></div>
        </div>
      </div>
    </div>
  );
};

export default SkeletonCard;

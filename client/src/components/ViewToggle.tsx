import React, { memo } from 'react';

interface ViewToggleProps {
  view: 'list' | 'map';
  onViewChange: (view: 'list' | 'map') => void;
}

const ViewToggle: React.FC<ViewToggleProps> = memo(({ view, onViewChange }) => {
  return (
    <div className="view-toggle">
      <div className="view-toggle-buttons">
        <button
          className={`view-toggle-btn ${view === 'list' ? 'active' : ''}`}
          onClick={() => onViewChange('list')}
          type="button"
        >
          <span className="view-toggle-icon">📋</span>
          <span>Список</span>
        </button>
        <button
          className={`view-toggle-btn ${view === 'map' ? 'active' : ''}`}
          onClick={() => onViewChange('map')}
          type="button"
        >
          <span className="view-toggle-icon">🗺️</span>
          <span>На карте</span>
        </button>
      </div>
    </div>
  );
});

ViewToggle.displayName = 'ViewToggle';

export default ViewToggle;

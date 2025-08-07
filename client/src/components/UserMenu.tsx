import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './UserMenu.css';

const UserMenu: React.FC = () => {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    setIsOpen(false);
  };

  if (!user) return null;

  return (
    <div className="user-menu">
      <button 
        className="user-menu-trigger"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="user-avatar">
          {user.name.charAt(0).toUpperCase()}
        </div>
        <span className="user-name">{user.name}</span>
        <svg 
          className={`user-menu-arrow ${isOpen ? 'open' : ''}`}
          width="20" 
          height="20" 
          viewBox="0 0 20 20" 
          fill="currentColor"
        >
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div className="user-menu-overlay" onClick={() => setIsOpen(false)} />
          <div className="user-menu-dropdown">
            <div className="user-menu-header">
              <div className="user-info">
                <strong>{user.name}</strong>
                <span>{user.email}</span>
              </div>
            </div>
            
            <div className="user-menu-items">
              <button className="user-menu-item">
                <span>👤</span>
                Мой профиль
              </button>
              <button className="user-menu-item">
                <span>📋</span>
                Мои объявления
              </button>
              <button className="user-menu-item">
                <span>⚙️</span>
                Настройки
              </button>
              <hr className="user-menu-divider" />
              <button className="user-menu-item logout" onClick={handleLogout}>
                <span>🚪</span>
                Выйти
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default UserMenu;

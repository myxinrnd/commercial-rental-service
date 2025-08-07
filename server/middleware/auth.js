const jwt = require('jsonwebtoken');
const database = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware для проверки авторизации
const authenticateToken = async (req, res, next) => {
  try {
    const token = req.cookies.token;
    
    if (!token) {
      return res.status(401).json({ 
        error: 'Токен авторизации не найден' 
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await database.findUserByEmail(decoded.email);
    
    if (!user) {
      return res.status(401).json({ 
        error: 'Пользователь не найден' 
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Ошибка авторизации:', error);
    return res.status(401).json({ 
      error: 'Недействительный токен' 
    });
  }
};

// Middleware для опциональной авторизации
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.cookies.token;
    
    if (token) {
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await database.findUserByEmail(decoded.email);
      req.user = user;
    }
  } catch (error) {
    // Игнорируем ошибки для опциональной авторизации
  }
  
  next();
};

// Utility функции
const generateToken = (user) => {
  return jwt.sign(
    { 
      userId: user.id, 
      email: user.email 
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};

const setAuthCookie = (res, token) => {
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 дней
  });
};

const clearAuthCookie = (res) => {
  res.clearCookie('token');
};

module.exports = {
  authenticateToken,
  optionalAuth,
  generateToken,
  setAuthCookie,
  clearAuthCookie
};

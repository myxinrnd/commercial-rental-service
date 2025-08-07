const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const database = require('../config/database');
const { 
  generateToken, 
  setAuthCookie, 
  clearAuthCookie, 
  authenticateToken 
} = require('../middleware/auth');
const { 
  validateRegistration, 
  validateLogin 
} = require('../middleware/validation');

const router = express.Router();

// Регистрация
router.post('/register', validateRegistration, async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Проверяем, существует ли пользователь
    const existingUser = await database.findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ 
        error: 'Пользователь с таким email уже существует' 
      });
    }

    // Хэшируем пароль
    const hashedPassword = await bcrypt.hash(password, 12);

    // Создаем пользователя
    const user = {
      id: uuidv4(),
      name: name.trim(),
      email: email.toLowerCase(),
      password: hashedPassword,
      createdAt: new Date().toISOString(),
      isActive: true
    };

    // Сохраняем в базу
    const saved = await database.addUser(user);
    if (!saved) {
      return res.status(500).json({ 
        error: 'Ошибка сохранения пользователя' 
      });
    }

    // Генерируем токен
    const token = generateToken(user);
    setAuthCookie(res, token);

    // Возвращаем данные пользователя (без пароля)
    const { password: _, ...userWithoutPassword } = user;
    res.status(201).json({
      message: 'Пользователь успешно зарегистрирован',
      user: userWithoutPassword
    });

  } catch (error) {
    console.error('Ошибка регистрации:', error);
    res.status(500).json({ 
      error: 'Внутренняя ошибка сервера' 
    });
  }
});

// Вход
router.post('/login', validateLogin, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Находим пользователя
    const user = await database.findUserByEmail(email.toLowerCase());
    if (!user) {
      return res.status(401).json({ 
        error: 'Неверный email или пароль' 
      });
    }

    // Проверяем пароль
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ 
        error: 'Неверный email или пароль' 
      });
    }

    // Проверяем активность аккаунта (по умолчанию активен, если поле не указано)
    if (user.isActive === false) {
      return res.status(401).json({ 
        error: 'Аккаунт заблокирован' 
      });
    }

    // Генерируем токен
    const token = generateToken(user);
    setAuthCookie(res, token);

    // Возвращаем данные пользователя (без пароля)
    const { password: _, ...userWithoutPassword } = user;
    res.json({
      message: 'Успешная авторизация',
      user: userWithoutPassword
    });

  } catch (error) {
    console.error('Ошибка входа:', error);
    res.status(500).json({ 
      error: 'Внутренняя ошибка сервера' 
    });
  }
});

// Выход
router.post('/logout', (req, res) => {
  clearAuthCookie(res);
  res.json({ 
    message: 'Успешный выход' 
  });
});

// Получение текущего пользователя
router.get('/me', authenticateToken, (req, res) => {
  const { password: _, ...userWithoutPassword } = req.user;
  res.json({
    user: userWithoutPassword
  });
});

// Проверка статуса авторизации
router.get('/status', async (req, res) => {
  try {
    const token = req.cookies.token;
    
    if (!token) {
      return res.json({ 
        isAuthenticated: false 
      });
    }

    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
    
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await database.findUserByEmail(decoded.email);
    
    if (!user || !user.isActive) {
      return res.json({ 
        isAuthenticated: false 
      });
    }

    const { password: _, ...userWithoutPassword } = user;
    res.json({
      isAuthenticated: true,
      user: userWithoutPassword
    });

  } catch (error) {
    res.json({ 
      isAuthenticated: false 
    });
  }
});

module.exports = router;

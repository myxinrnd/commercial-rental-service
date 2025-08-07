const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cookieParser = require('cookie-parser');
const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const app = express();
const PORT = 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Swagger конфигурация
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Сервис торговых помещений API',
      version: '1.0.0',
      description: 'API для управления объявлениями о сдаче торговых помещений в аренду',
      contact: {
        name: 'API Support',
        email: 'support@commercial-rental.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'token'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            phone: { type: 'string' },
            role: { type: 'string', enum: ['user', 'admin'] },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        Listing: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            title: { type: 'string' },
            description: { type: 'string' },
            area: { type: 'integer' },
            price: { type: 'integer' },
            location: { type: 'string' },
            type: { type: 'string', enum: ['Магазин', 'Ресторан/Кафе', 'Офис', 'Склад'] },
            floor: { type: 'integer' },
            totalFloors: { type: 'integer' },
            hasParking: { type: 'boolean' },
            hasStorage: { type: 'boolean' },
            contactName: { type: 'string' },
            contactPhone: { type: 'string' },
            contactEmail: { type: 'string', format: 'email' },
            images: { type: 'array', items: { type: 'string' } },
            createdAt: { type: 'string', format: 'date-time' },
            isActive: { type: 'boolean' }
          }
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' }
          }
        }
      }
    }
  },
  apis: ['./index.js'] // путь к файлам с аннотациями
};

const swaggerSpec = swaggerJSDoc(swaggerOptions);

// Middleware
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Swagger UI
app.use('/swagger', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Commercial Rental API'
}));

// Настройка multer для загрузки файлов
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const mimetype = allowedTypes.test(file.mimetype);
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Разрешены только изображения (jpeg, jpg, png, gif, webp)'));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});

// Пути к файлам базы данных
const DB_PATH = path.join(__dirname, 'listings.json');
const USERS_DB_PATH = path.join(__dirname, 'users.json');

// Инициализация базы данных
async function initDB() {
  try {
    await fs.ensureFile(DB_PATH);
    const data = await fs.readFile(DB_PATH, 'utf8');
    if (!data.trim()) {
      await fs.writeJSON(DB_PATH, { listings: [] });
    }
  } catch (error) {
    console.error('Ошибка инициализации БД:', error);
    await fs.writeJSON(DB_PATH, { listings: [] });
  }
}

// Функции для работы с данными
async function getListings() {
  try {
    const data = await fs.readJSON(DB_PATH);
    return data.listings || [];
  } catch (error) {
    console.error('Ошибка чтения объявлений:', error);
    return [];
  }
}

async function saveListings(listings) {
  try {
    await fs.writeJSON(DB_PATH, { listings });
    return true;
  } catch (error) {
    console.error('Ошибка сохранения объявлений:', error);
    return false;
  }
}

// Функции для работы с пользователями
async function initUsersDB() {
  try {
    await fs.ensureFile(USERS_DB_PATH);
    const data = await fs.readFile(USERS_DB_PATH, 'utf8');
    if (!data.trim()) {
      await fs.writeJSON(USERS_DB_PATH, { users: [] });
    }
  } catch (error) {
    console.error('Ошибка инициализации БД пользователей:', error);
    await fs.writeJSON(USERS_DB_PATH, { users: [] });
  }
}

async function getUsers() {
  try {
    const data = await fs.readJSON(USERS_DB_PATH);
    return data.users || [];
  } catch (error) {
    console.error('Ошибка чтения пользователей:', error);
    return [];
  }
}

async function saveUsers(users) {
  try {
    await fs.writeJSON(USERS_DB_PATH, { users });
    return true;
  } catch (error) {
    console.error('Ошибка сохранения пользователей:', error);
    return false;
  }
}

async function findUserByEmail(email) {
  const users = await getUsers();
  return users.find(user => user.email === email);
}

async function createUser(userData) {
  const users = await getUsers();
  const user = {
    id: uuidv4(),
    ...userData,
    createdAt: new Date().toISOString()
  };
  users.push(user);
  await saveUsers(users);
  return user;
}

// Middleware для проверки авторизации
function authenticateToken(req, res, next) {
  const token = req.cookies.token || req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Токен доступа отсутствует' });
  }

  jwt.verify(token, JWT_SECRET, async (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Недействительный токен' });
    }
    
    const users = await getUsers();
    const user = users.find(u => u.id === decoded.userId);
    if (!user) {
      return res.status(403).json({ error: 'Пользователь не найден' });
    }
    
    req.user = user;
    next();
  });
}

// Создание тестовых данных
async function createSampleData() {
  const listings = await getListings();
  if (listings.length === 0) {
    const sampleListings = [
      {
        id: uuidv4(),
        title: 'Торговое помещение в центре города',
        description: 'Просторное помещение на первом этаже в самом центре города. Отличная проходимость, рядом станция метро.',
        area: 85,
        price: 120000,
        location: 'Центральный район, ул. Тверская 15',
        type: 'Магазин',
        floor: 1,
        totalFloors: 12,
        hasParking: true,
        hasStorage: false,
        contactName: 'Анна Петрова',
        contactPhone: '+7 (495) 123-45-67',
        contactEmail: 'anna.petrova@email.com',
        images: [],
        createdAt: new Date().toISOString(),
        isActive: true
      },
      {
        id: uuidv4(),
        title: 'Помещение под ресторан с террасой',
        description: 'Уникальное помещение с собственной террасой. Идеально подходит для ресторана или кафе. Полностью оборудованная кухня.',
        area: 200,
        price: 250000,
        location: 'Василеостровский район, Средний пр. 48',
        type: 'Ресторан/Кафе',
        floor: 1,
        totalFloors: 3,
        hasParking: true,
        hasStorage: true,
        contactName: 'Михаил Сидоров',
        contactPhone: '+7 (812) 987-65-43',
        contactEmail: 'mikhail.sidorov@email.com',
        images: [],
        createdAt: new Date().toISOString(),
        isActive: true
      },
      {
        id: uuidv4(),
        title: 'Офисное помещение в бизнес-центре',
        description: 'Современное офисное помещение в престижном бизнес-центре. Полностью готово к заселению.',
        area: 150,
        price: 180000,
        location: 'Деловой квартал, ул. Московская 91',
        type: 'Офис',
        floor: 8,
        totalFloors: 25,
        hasParking: true,
        hasStorage: false,
        contactName: 'Елена Козлова',
        contactPhone: '+7 (495) 555-77-88',
        contactEmail: 'elena.kozlova@email.com',
        images: [],
        createdAt: new Date().toISOString(),
        isActive: true
      }
    ];
    
    await saveListings(sampleListings);
    console.log('Созданы тестовые объявления');
  }
}

// API Routes

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Регистрация нового пользователя
 *     tags: [Авторизация]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *                 description: Имя пользователя
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email адрес
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 description: Пароль (минимум 6 символов)
 *               phone:
 *                 type: string
 *                 description: Номер телефона (необязательно)
 *     responses:
 *       201:
 *         description: Пользователь успешно зарегистрирован
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 message:
 *                   type: string
 *       400:
 *         description: Ошибка валидации
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Ошибка сервера
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    // Валидация
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Заполните все обязательные поля' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Пароль должен содержать минимум 6 символов' });
    }

    // Проверка существования пользователя
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
    }

    // Хеширование пароля
    const hashedPassword = await bcrypt.hash(password, 10);

    // Создание пользователя
    const user = await createUser({
      name,
      email,
      password: hashedPassword,
      phone: phone || '',
      role: 'user'
    });

    // Создание JWT токена
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    // Установка cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 дней
    });

    // Возврат данных пользователя (без пароля)
    const { password: _, ...userWithoutPassword } = user;
    res.status(201).json({
      user: userWithoutPassword,
      message: 'Регистрация успешна'
    });
  } catch (error) {
    console.error('Ошибка регистрации:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Вход пользователя в систему
 *     tags: [Авторизация]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email адрес
 *               password:
 *                 type: string
 *                 description: Пароль
 *     responses:
 *       200:
 *         description: Успешный вход
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 message:
 *                   type: string
 *       400:
 *         description: Неверные учетные данные
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Валидация
    if (!email || !password) {
      return res.status(400).json({ error: 'Введите email и пароль' });
    }

    // Поиск пользователя
    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(400).json({ error: 'Неверный email или пароль' });
    }

    // Проверка пароля
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ error: 'Неверный email или пароль' });
    }

    // Создание JWT токена
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    // Установка cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 дней
    });

    // Возврат данных пользователя (без пароля)
    const { password: _, ...userWithoutPassword } = user;
    res.json({
      user: userWithoutPassword,
      message: 'Вход выполнен успешно'
    });
  } catch (error) {
    console.error('Ошибка входа:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Выход пользователя из системы
 *     tags: [Авторизация]
 *     responses:
 *       200:
 *         description: Успешный выход
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */
app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Выход выполнен успешно' });
});

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Получение информации о текущем пользователе
 *     tags: [Авторизация]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Информация о пользователе
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Не авторизован
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.get('/api/auth/me', authenticateToken, (req, res) => {
  const { password, ...userWithoutPassword } = req.user;
  res.json({ user: userWithoutPassword });
});

/**
 * @swagger
 * /api/listings:
 *   get:
 *     summary: Получить все объявления
 *     tags: [Объявления]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Поиск по названию, описанию или адресу
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [Магазин, Ресторан/Кафе, Офис, Склад]
 *         description: Тип помещения
 *       - in: query
 *         name: minArea
 *         schema:
 *           type: integer
 *         description: Минимальная площадь (м²)
 *       - in: query
 *         name: maxArea
 *         schema:
 *           type: integer
 *         description: Максимальная площадь (м²)
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: integer
 *         description: Минимальная цена (₽/мес)
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: integer
 *         description: Максимальная цена (₽/мес)
 *     responses:
 *       200:
 *         description: Список объявлений
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Listing'
 *       500:
 *         description: Ошибка сервера
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.get('/api/listings', async (req, res) => {
  try {
    const listings = await getListings();
    const { search, type, minArea, maxArea, minPrice, maxPrice } = req.query;
    
    let filteredListings = listings.filter(listing => listing.isActive);
    
    // Фильтрация
    if (search) {
      const searchLower = search.toLowerCase();
      filteredListings = filteredListings.filter(listing =>
        listing.title.toLowerCase().includes(searchLower) ||
        listing.description.toLowerCase().includes(searchLower) ||
        listing.location.toLowerCase().includes(searchLower)
      );
    }
    
    if (type && type !== 'all') {
      filteredListings = filteredListings.filter(listing => listing.type === type);
    }
    
    if (minArea) {
      filteredListings = filteredListings.filter(listing => listing.area >= parseInt(minArea));
    }
    
    if (maxArea) {
      filteredListings = filteredListings.filter(listing => listing.area <= parseInt(maxArea));
    }
    
    if (minPrice) {
      filteredListings = filteredListings.filter(listing => listing.price >= parseInt(minPrice));
    }
    
    if (maxPrice) {
      filteredListings = filteredListings.filter(listing => listing.price <= parseInt(maxPrice));
    }
    
    // Сортировка по дате создания (новые сначала)
    filteredListings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    res.json(filteredListings);
  } catch (error) {
    console.error('Ошибка получения объявлений:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * @swagger
 * /api/listings/{id}:
 *   get:
 *     summary: Получить объявление по ID
 *     tags: [Объявления]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID объявления
 *     responses:
 *       200:
 *         description: Объявление найдено
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Listing'
 *       404:
 *         description: Объявление не найдено
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.get('/api/listings/:id', async (req, res) => {
  try {
    const listings = await getListings();
    const listing = listings.find(l => l.id === req.params.id && l.isActive);
    
    if (!listing) {
      return res.status(404).json({ error: 'Объявление не найдено' });
    }
    
    res.json(listing);
  } catch (error) {
    console.error('Ошибка получения объявления:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * @swagger
 * /api/listings:
 *   post:
 *     summary: Создать новое объявление
 *     tags: [Объявления]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *               - area
 *               - price
 *               - location
 *               - type
 *               - contactName
 *               - contactPhone
 *             properties:
 *               title:
 *                 type: string
 *                 description: Название объявления
 *               description:
 *                 type: string
 *                 description: Описание помещения
 *               area:
 *                 type: integer
 *                 description: Площадь в квадратных метрах
 *               price:
 *                 type: integer
 *                 description: Цена аренды в месяц (₽)
 *               location:
 *                 type: string
 *                 description: Адрес помещения
 *               type:
 *                 type: string
 *                 enum: [Магазин, Ресторан/Кафе, Офис, Склад]
 *                 description: Тип помещения
 *               floor:
 *                 type: integer
 *                 description: Этаж
 *               totalFloors:
 *                 type: integer
 *                 description: Общее количество этажей
 *               hasParking:
 *                 type: boolean
 *                 description: Наличие парковки
 *               hasStorage:
 *                 type: boolean
 *                 description: Наличие склада
 *               contactName:
 *                 type: string
 *                 description: Имя контактного лица
 *               contactPhone:
 *                 type: string
 *                 description: Телефон для связи
 *               contactEmail:
 *                 type: string
 *                 format: email
 *                 description: Email для связи
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Фотографии помещения (до 10 файлов)
 *     responses:
 *       201:
 *         description: Объявление создано
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Listing'
 *       400:
 *         description: Ошибка валидации
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Не авторизован
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.post('/api/listings', upload.array('images', 10), async (req, res) => {
  try {
    const {
      title, description, area, price, location, type, floor, totalFloors,
      hasParking, hasStorage, contactName, contactPhone, contactEmail
    } = req.body;
    
    // Валидация
    if (!title || !description || !area || !price || !location || !type || !contactName || !contactPhone) {
      return res.status(400).json({ error: 'Заполните все обязательные поля' });
    }
    
    const images = req.files ? req.files.map(file => `/uploads/${file.filename}`) : [];
    
    const newListing = {
      id: uuidv4(),
      title,
      description,
      area: parseInt(area),
      price: parseInt(price),
      location,
      type,
      floor: parseInt(floor) || 1,
      totalFloors: parseInt(totalFloors) || 1,
      hasParking: hasParking === 'true',
      hasStorage: hasStorage === 'true',
      contactName,
      contactPhone,
      contactEmail: contactEmail || '',
      images,
      createdAt: new Date().toISOString(),
      isActive: true
    };
    
    const listings = await getListings();
    listings.push(newListing);
    
    const saved = await saveListings(listings);
    if (!saved) {
      return res.status(500).json({ error: 'Ошибка сохранения объявления' });
    }
    
    res.status(201).json(newListing);
  } catch (error) {
    console.error('Ошибка создания объявления:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * @swagger
 * /api/listings/{id}/contact:
 *   post:
 *     summary: Отправить сообщение владельцу объявления
 *     tags: [Объявления]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID объявления
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - phone
 *               - message
 *             properties:
 *               name:
 *                 type: string
 *                 description: Имя отправителя
 *               phone:
 *                 type: string
 *                 description: Телефон отправителя
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email отправителя (необязательно)
 *               message:
 *                 type: string
 *                 description: Текст сообщения
 *     responses:
 *       200:
 *         description: Сообщение отправлено
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Ошибка валидации
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Объявление не найдено
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.post('/api/listings/:id/contact', async (req, res) => {
  try {
    const { name, phone, email, message } = req.body;
    
    if (!name || !phone || !message) {
      return res.status(400).json({ error: 'Заполните все обязательные поля' });
    }
    
    const listings = await getListings();
    const listing = listings.find(l => l.id === req.params.id && l.isActive);
    
    if (!listing) {
      return res.status(404).json({ error: 'Объявление не найдено' });
    }
    
    // В реальном приложении здесь была бы отправка email
    console.log(`Новое сообщение для объявления "${listing.title}":`);
    console.log(`От: ${name} (${phone}, ${email})`);
    console.log(`Сообщение: ${message}`);
    
    res.json({ success: true, message: 'Сообщение отправлено' });
  } catch (error) {
    console.error('Ошибка отправки сообщения:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Запуск сервера
async function startServer() {
  await initDB();
  await initUsersDB();
  await createSampleData();
  
  app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на http://localhost:${PORT}`);
    console.log(`📋 API доступно на http://localhost:${PORT}/api/listings`);
    console.log(`🔐 Авторизация доступна на http://localhost:${PORT}/api/auth`);
    console.log(`📚 Swagger документация: http://localhost:${PORT}/swagger`);
  });
}

startServer().catch(console.error);

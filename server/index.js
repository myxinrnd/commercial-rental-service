const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

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

// Путь к файлу базы данных
const DB_PATH = path.join(__dirname, 'listings.json');

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

// Получить все объявления
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

// Получить объявление по ID
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

// Создать новое объявление
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

// Отправить сообщение владельцу объявления
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
  await createSampleData();
  
  app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на http://localhost:${PORT}`);
    console.log(`📋 API доступно на http://localhost:${PORT}/api/listings`);
  });
}

startServer().catch(console.error);

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

// Импорт модулей
const database = require('./config/database');
const authRoutes = require('./routes/auth');
const listingsRoutes = require('./routes/listings');

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false
}));

// Compression middleware
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 100, // максимум 100 запросов на IP
  message: {
    error: 'Слишком много запросов, попробуйте позже'
  }
});
app.use('/api/', limiter);

// CORS конфигурация
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://yourdomain.com'] // Замените на ваш домен в продакшене
    : ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parsing
app.use(cookieParser());

// Логирование запросов (только в разработке)
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path} - ${new Date().toLocaleTimeString()}`);
    next();
  });
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/listings', listingsRoutes);

// Статические файлы для загруженных изображений
app.use('/uploads', express.static('uploads', {
  maxAge: '1d', // Кэширование на 1 день
  etag: true
}));

// Swagger документация (только в разработке)
if (process.env.NODE_ENV !== 'production') {
  const swaggerUi = require('swagger-ui-express');
  const swaggerJSDoc = require('swagger-jsdoc');

  const swaggerOptions = {
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'Сервис торговых помещений API',
        version: '1.0.0',
        description: 'API для управления объявлениями о сдаче торговых помещений в аренду'
      },
      servers: [
        {
          url: `http://localhost:${PORT}`,
          description: 'Development server'
        }
      ]
    },
    apis: ['./routes/*.js']
  };

  const specs = swaggerJSDoc(swaggerOptions);
  app.use('/swagger', swaggerUi.serve, swaggerUi.setup(specs));
}

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Маршрут не найден',
    path: req.originalUrl
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Глобальная ошибка:', error);
  
  // Не показываем детали ошибок в продакшене
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  res.status(error.status || 500).json({
    error: isDevelopment ? error.message : 'Внутренняя ошибка сервера',
    ...(isDevelopment && { stack: error.stack })
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Получен сигнал SIGTERM. Завершение работы...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Получен сигнал SIGINT. Завершение работы...');
  process.exit(0);
});

// Обработка необработанных ошибок
process.on('unhandledRejection', (reason, promise) => {
  console.error('Необработанное отклонение Promise:', reason);
  // Не завершаем процесс, только логируем
});

process.on('uncaughtException', (error) => {
  console.error('Необработанное исключение:', error);
  process.exit(1);
});

// Запуск сервера
const server = app.listen(PORT, () => {
  console.log('🚀 Сервер запущен на http://localhost:' + PORT);
  console.log('📋 API доступно на http://localhost:' + PORT + '/api/listings');
  console.log('🔐 Авторизация доступна на http://localhost:' + PORT + '/api/auth');
  
  if (process.env.NODE_ENV !== 'production') {
    console.log('📚 Swagger документация: http://localhost:' + PORT + '/swagger');
  }
  
  console.log('✅ Сервер готов к работе');
});

// Конфигурация сервера
server.timeout = 30000; // 30 секунд таймаут

module.exports = app;

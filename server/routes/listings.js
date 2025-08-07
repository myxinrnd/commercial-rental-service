const express = require('express');
const { v4: uuidv4 } = require('uuid');
const database = require('../config/database');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const { 
  validateListingCreation, 
  validateListingUpdate, 
  sanitizeListing 
} = require('../middleware/validation');

const router = express.Router();

// Получение всех объявлений с фильтрацией и пагинацией
router.get('/', async (req, res) => {
  try {
    const filters = {
      search: req.query.search,
      type: req.query.type,
      minArea: req.query.minArea,
      maxArea: req.query.maxArea,
      minPrice: req.query.minPrice,
      maxPrice: req.query.maxPrice
    };

    // Параметры пагинации
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const allListings = await database.filterListings(filters);
    
    // Применяем пагинацию
    const paginatedListings = allListings.slice(offset, offset + limit);
    const totalCount = allListings.length;
    const totalPages = Math.ceil(totalCount / limit);

    // Добавляем кэширование
    res.set('Cache-Control', 'public, max-age=300'); // 5 минут
    
    res.json({
      listings: paginatedListings,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
        limit
      }
    });

  } catch (error) {
    console.error('Ошибка получения объявлений:', error);
    res.status(500).json({ 
      error: 'Ошибка получения объявлений' 
    });
  }
});

// Получение объявления по ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const listing = await database.findListingById(id);
    
    if (!listing) {
      return res.status(404).json({ 
        error: 'Объявление не найдено' 
      });
    }

    res.json(listing);

  } catch (error) {
    console.error('Ошибка получения объявления:', error);
    res.status(500).json({ 
      error: 'Ошибка получения объявления' 
    });
  }
});

// Создание объявления (требует авторизации)
router.post('/', authenticateToken, validateListingCreation, async (req, res) => {
  try {
    const listingData = sanitizeListing(req.body);
    
    const listing = {
      ...listingData,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isActive: true,
      ownerId: req.user.id,
      images: [] // Будет заполнено при загрузке изображений
    };

    const saved = await database.addListing(listing);
    if (!saved) {
      return res.status(500).json({ 
        error: 'Ошибка сохранения объявления' 
      });
    }

    res.status(201).json({
      message: 'Объявление успешно создано',
      listing
    });

  } catch (error) {
    console.error('Ошибка создания объявления:', error);
    res.status(500).json({ 
      error: 'Внутренняя ошибка сервера' 
    });
  }
});

// Обновление объявления (только владелец)
router.put('/:id', authenticateToken, validateListingUpdate, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = sanitizeListing(req.body);
    
    const listing = await database.findListingById(id);
    if (!listing) {
      return res.status(404).json({ 
        error: 'Объявление не найдено' 
      });
    }

    // Проверяем права доступа
    if (listing.ownerId !== req.user.id) {
      return res.status(403).json({ 
        error: 'Нет прав для редактирования этого объявления' 
      });
    }

    const updatedData = {
      ...updates,
      updatedAt: new Date().toISOString()
    };

    const updated = await database.updateListing(id, updatedData);
    if (!updated) {
      return res.status(500).json({ 
        error: 'Ошибка обновления объявления' 
      });
    }

    const updatedListing = await database.findListingById(id);
    res.json({
      message: 'Объявление успешно обновлено',
      listing: updatedListing
    });

  } catch (error) {
    console.error('Ошибка обновления объявления:', error);
    res.status(500).json({ 
      error: 'Внутренняя ошибка сервера' 
    });
  }
});

// Удаление объявления (только владелец)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const listing = await database.findListingById(id);
    if (!listing) {
      return res.status(404).json({ 
        error: 'Объявление не найдено' 
      });
    }

    // Проверяем права доступа
    if (listing.ownerId !== req.user.id) {
      return res.status(403).json({ 
        error: 'Нет прав для удаления этого объявления' 
      });
    }

    const deleted = await database.deleteListing(id);
    if (!deleted) {
      return res.status(500).json({ 
        error: 'Ошибка удаления объявления' 
      });
    }

    res.json({
      message: 'Объявление успешно удалено'
    });

  } catch (error) {
    console.error('Ошибка удаления объявления:', error);
    res.status(500).json({ 
      error: 'Внутренняя ошибка сервера' 
    });
  }
});

// Получение объявлений пользователя
router.get('/user/my', authenticateToken, async (req, res) => {
  try {
    const allListings = await database.getListings();
    const userListings = allListings
      .filter(listing => listing.ownerId === req.user.id)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json(userListings);

  } catch (error) {
    console.error('Ошибка получения объявлений пользователя:', error);
    res.status(500).json({ 
      error: 'Ошибка получения объявлений' 
    });
  }
});

// Статистика объявлений
router.get('/stats/overview', async (req, res) => {
  try {
    const listings = await database.getListings();
    
    const stats = {
      total: listings.length,
      active: listings.filter(l => l.isActive).length,
      byType: {},
      avgPrice: 0,
      avgArea: 0
    };

    // Статистика по типам
    listings.forEach(listing => {
      stats.byType[listing.type] = (stats.byType[listing.type] || 0) + 1;
    });

    // Средние значения
    if (listings.length > 0) {
      stats.avgPrice = Math.round(
        listings.reduce((sum, l) => sum + l.price, 0) / listings.length
      );
      stats.avgArea = Math.round(
        listings.reduce((sum, l) => sum + l.area, 0) / listings.length
      );
    }

    res.set('Cache-Control', 'public, max-age=3600'); // 1 час
    res.json(stats);

  } catch (error) {
    console.error('Ошибка получения статистики:', error);
    res.status(500).json({ 
      error: 'Ошибка получения статистики' 
    });
  }
});

module.exports = router;

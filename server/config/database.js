const fs = require('fs-extra');
const path = require('path');

class Database {
  constructor() {
    this.usersFile = path.join(__dirname, '../users.json');
    this.listingsFile = path.join(__dirname, '../listings.json');
    this.uploadsDir = path.join(__dirname, '../uploads');
    
    this.initializeDatabase();
  }

  async initializeDatabase() {
    try {
      // Создаем директории если они не существуют
      await fs.ensureDir(this.uploadsDir);
      
      // Инициализируем файлы если они не существуют
      await this.ensureFile(this.usersFile, { users: [] });
      await this.ensureFile(this.listingsFile, { listings: [] });
      
      console.log('📁 База данных инициализирована');
    } catch (error) {
      console.error('❌ Ошибка инициализации базы данных:', error);
    }
  }

  async ensureFile(filePath, defaultData) {
    try {
      if (!await fs.pathExists(filePath)) {
        await fs.writeJson(filePath, defaultData, { spaces: 2 });
      }
    } catch (error) {
      console.error(`❌ Ошибка создания файла ${filePath}:`, error);
    }
  }

  async readJson(filePath) {
    try {
      return await fs.readJson(filePath);
    } catch (error) {
      console.error(`❌ Ошибка чтения ${filePath}:`, error);
      return null;
    }
  }

  async writeJson(filePath, data) {
    try {
      await fs.writeJson(filePath, data, { spaces: 2 });
      return true;
    } catch (error) {
      console.error(`❌ Ошибка записи ${filePath}:`, error);
      return false;
    }
  }

  // Методы для пользователей
  async getUsers() {
    const data = await this.readJson(this.usersFile);
    return data ? data.users : [];
  }

  async saveUsers(users) {
    return await this.writeJson(this.usersFile, { users });
  }

  async findUserByEmail(email) {
    const users = await this.getUsers();
    return users.find(user => user.email === email);
  }

  async addUser(user) {
    const users = await this.getUsers();
    users.push(user);
    return await this.saveUsers(users);
  }

  // Методы для объявлений
  async getListings() {
    const data = await this.readJson(this.listingsFile);
    return data ? data.listings : [];
  }

  async saveListings(listings) {
    return await this.writeJson(this.listingsFile, { listings });
  }

  async findListingById(id) {
    const listings = await this.getListings();
    return listings.find(listing => listing.id === id);
  }

  async addListing(listing) {
    const listings = await this.getListings();
    listings.push(listing);
    return await this.saveListings(listings);
  }

  async updateListing(id, updates) {
    const listings = await this.getListings();
    const index = listings.findIndex(listing => listing.id === id);
    
    if (index === -1) return false;
    
    listings[index] = { ...listings[index], ...updates };
    return await this.saveListings(listings);
  }

  async deleteListing(id) {
    const listings = await this.getListings();
    const filteredListings = listings.filter(listing => listing.id !== id);
    
    if (filteredListings.length === listings.length) return false;
    
    return await this.saveListings(filteredListings);
  }

  // Методы для фильтрации
  async filterListings(filters = {}) {
    const listings = await this.getListings();
    
    return listings.filter(listing => {
      // Поиск по тексту
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const searchFields = [
          listing.title,
          listing.description,
          listing.location,
          listing.type
        ].join(' ').toLowerCase();
        
        if (!searchFields.includes(searchLower)) {
          return false;
        }
      }

      // Фильтр по типу
      if (filters.type && filters.type !== 'all' && listing.type !== filters.type) {
        return false;
      }

      // Фильтр по площади
      if (filters.minArea && listing.area < parseInt(filters.minArea)) {
        return false;
      }
      if (filters.maxArea && listing.area > parseInt(filters.maxArea)) {
        return false;
      }

      // Фильтр по цене
      if (filters.minPrice && listing.price < parseInt(filters.minPrice)) {
        return false;
      }
      if (filters.maxPrice && listing.price > parseInt(filters.maxPrice)) {
        return false;
      }

      return true;
    }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }
}

module.exports = new Database();

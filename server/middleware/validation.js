// Validation middleware
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePassword = (password) => {
  return password && password.length >= 6;
};

const validateListing = (listing) => {
  const errors = [];

  if (!listing.title || listing.title.trim().length < 5) {
    errors.push('Название должно содержать минимум 5 символов');
  }

  if (!listing.description || listing.description.trim().length < 20) {
    errors.push('Описание должно содержать минимум 20 символов');
  }

  if (!listing.area || listing.area < 1 || listing.area > 10000) {
    errors.push('Площадь должна быть от 1 до 10000 м²');
  }

  if (!listing.price || listing.price < 1000 || listing.price > 10000000) {
    errors.push('Цена должна быть от 1000 до 10000000 ₽');
  }

  if (!listing.location || listing.location.trim().length < 10) {
    errors.push('Адрес должен содержать минимум 10 символов');
  }

  const validTypes = ['Магазин', 'Ресторан/Кафе', 'Офис', 'Склад'];
  if (!validTypes.includes(listing.type)) {
    errors.push('Некорректный тип помещения');
  }

  if (!listing.floor || listing.floor < 1 || listing.floor > 100) {
    errors.push('Этаж должен быть от 1 до 100');
  }

  if (!listing.totalFloors || listing.totalFloors < listing.floor || listing.totalFloors > 100) {
    errors.push('Общее количество этажей должно быть больше или равно этажу помещения');
  }

  if (!listing.contactName || listing.contactName.trim().length < 2) {
    errors.push('Имя контактного лица должно содержать минимум 2 символа');
  }

  const phoneRegex = /^\+7\s?\(\d{3}\)\s?\d{3}-\d{2}-\d{2}$/;
  if (!listing.contactPhone || !phoneRegex.test(listing.contactPhone)) {
    errors.push('Некорректный формат телефона. Используйте: +7 (XXX) XXX-XX-XX');
  }

  if (!listing.contactEmail || !validateEmail(listing.contactEmail)) {
    errors.push('Некорректный email адрес');
  }

  return errors;
};

const validateRegistration = (req, res, next) => {
  const { name, email, password } = req.body;
  const errors = [];

  if (!name || name.trim().length < 2) {
    errors.push('Имя должно содержать минимум 2 символа');
  }

  if (!validateEmail(email)) {
    errors.push('Некорректный email адрес');
  }

  if (!validatePassword(password)) {
    errors.push('Пароль должен содержать минимум 6 символов');
  }

  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  next();
};

const validateLogin = (req, res, next) => {
  const { email, password } = req.body;
  const errors = [];

  if (!validateEmail(email)) {
    errors.push('Некорректный email адрес');
  }

  if (!password) {
    errors.push('Пароль обязателен');
  }

  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  next();
};

const validateListingCreation = (req, res, next) => {
  const errors = validateListing(req.body);

  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  next();
};

const validateListingUpdate = (req, res, next) => {
  // Для обновления проверяем только переданные поля
  const updates = req.body;
  const errors = [];

  if (updates.title !== undefined && (!updates.title || updates.title.trim().length < 5)) {
    errors.push('Название должно содержать минимум 5 символов');
  }

  if (updates.description !== undefined && (!updates.description || updates.description.trim().length < 20)) {
    errors.push('Описание должно содержать минимум 20 символов');
  }

  if (updates.area !== undefined && (!updates.area || updates.area < 1 || updates.area > 10000)) {
    errors.push('Площадь должна быть от 1 до 10000 м²');
  }

  if (updates.price !== undefined && (!updates.price || updates.price < 1000 || updates.price > 10000000)) {
    errors.push('Цена должна быть от 1000 до 10000000 ₽');
  }

  if (updates.contactEmail !== undefined && !validateEmail(updates.contactEmail)) {
    errors.push('Некорректный email адрес');
  }

  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  next();
};

// Sanitization функции
const sanitizeString = (str) => {
  if (typeof str !== 'string') return str;
  return str.trim().replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
};

const sanitizeListing = (listing) => {
  return {
    ...listing,
    title: sanitizeString(listing.title),
    description: sanitizeString(listing.description),
    location: sanitizeString(listing.location),
    contactName: sanitizeString(listing.contactName),
    contactPhone: sanitizeString(listing.contactPhone),
    contactEmail: sanitizeString(listing.contactEmail)
  };
};

module.exports = {
  validateRegistration,
  validateLogin,
  validateListingCreation,
  validateListingUpdate,
  sanitizeListing,
  validateEmail,
  validatePassword
};

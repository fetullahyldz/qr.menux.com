// Base API service
import apiService from './api.service';

// Auth service
import authService from './auth.service';

// Category service
import categoryService from './category.service';

// Product service
import productService from './product.service';

// Table service
import tableService from './table.service';

// Order service
import orderService from './order.service'; // Correctly imported here

// Waiter Call service
import waiterCallService from './waiterCall.service';

// Feedback service
import feedbackService from './feedback.service';

// Statistics service
import statisticsService from './statistics.service';

// Language service
import languageService from './language.service';

// Settings service
import settingsService from './settings.service'; // Correctly imported here

// Export all services
export {
  apiService,
  authService,
  categoryService,
  productService,
  tableService,
  orderService,
  waiterCallService,
  feedbackService,
  statisticsService,
  languageService,
  settingsService
};

// Default export of all services
export default {
  api: apiService,
  auth: authService,
  category: categoryService,
  product: productService,
  table: tableService,
  order: orderService,
  waiterCall: waiterCallService,
  feedback: feedbackService,
  statistics: statisticsService,
  language: languageService,
  settings: settingsService,
};

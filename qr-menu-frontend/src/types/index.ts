// User types
export interface IUser {
  id: number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role: 'admin' | 'manager' | 'waiter' | 'chef' | 'editor';
  created_at: string;
  updated_at: string;
}

export interface ILoginResponse {
  user: IUser;
  token: string;
}

// Category types
export interface ICategory {
  id: number;
  name: string;
  description?: string;
  image_url?: string;
  is_active: boolean;
  sort_order: number;
  product_count?: number;
  created_at: string;
  updated_at: string;
}

// Product types
export interface IProductOption {
  id: number;
  product_id: number;
  name: string;
  price_modifier: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface IProduct {
  id: number;
  category_id?: number;
  category_name?: string;
  name: string;
  description?: string;
  price: number;
  image_url?: string | null;
  is_active: boolean;
  sort_order: number;
  options?: IProductOption[];
  created_at: string;
  updated_at: string;
}

// Table types
export interface ITable {
  id: number;
  table_number: string;
  status: 'available' | 'occupied' | 'reserved';
  is_active: boolean;
  qr_code_url?: string;
  created_at?: string;
  updated_at?: string;
}

// Order types
export interface IOrderItemOption {
  id: number;
  order_item_id: number;
  product_option_id: number;
  product_option_name?: string;
  price: number;
}

export interface IOrderItem {
  id: number;
  order_id: number;
  product_id: number;
  product_name?: string;
  quantity: number;
  price: number;
  special_instructions?: string;
  options?: IOrderItemOption[];
  created_at: string;
  updated_at: string;
}

export interface IOrder {
  id: number;
  table_id: number;
  table_number?: string;
  status: 'new' | 'processing' | 'ready' | 'completed' | 'cancelled';
  total_amount: number;
  special_instructions?: string;
  items?: IOrderItem[];
  created_at: string;
  updated_at: string;
}

// Waiter call types
export interface IWaiterCall {
  id: number;
  table_id: number;
  table_number?: string;
  status: 'pending' | 'in_progress' | 'completed';
  created_at: string;
  updated_at: string;
}

// Feedback types
export interface IFeedback {
  id: number;
  table_id?: number;
  table_number?: string;
  name: string;
  email?: string;
  food_rating?: number;
  service_rating?: number;
  ambience_rating?: number;
  price_rating?: number;
  overall_rating: number;
  comments?: string;
  created_at: string;
}

// Statistics types
export interface ISalesData {
  date: string;
  orders: number;
  revenue: number;
}

export interface IWeeklySalesData {
  day_name: string;
  orders: number;
  revenue: number;
}

export interface ISalesStatistics {
  totalOrders: number;
  totalRevenue: number;
  avgOrderSize: number;
  weeklyData: IWeeklySalesData[];
}

export interface ITopProduct {
  id: number;
  name: string;
  order_count: number;
  total_revenue: number;
}

export interface IFeedbackStatistics {
  averageRating: number;
  totalCount: number;
  ratings: { rating: number; count: number }[];
}

export interface IDashboardStats {
  totalOrders: number;
  todaySales: number;
  activeWaiterCalls: number;
  activeTables: number;
}

// Cart types for frontend
export interface ICartItemOption {
  product_option_id: number;
  name: string;
  price_modifier: number; // price_modifier field added for order item options
}

export interface ICartItem {
  product_id: number;
  name: string;
  price: number;
  quantity: number;
  image_url?: string | null; // Added image_url property
  special_instructions?: string;
  options?: ICartItemOption[];
}

// Language model
export interface ILanguage {
  id: number;
  code: string;
  name: string;
  native_name: string;
  flag_code: string;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Translation model
export interface ITranslation {
  id: number;
  language_code: string;
  resource_key: string;
  resource_value: string;
  created_at: string;
  updated_at: string;
}

// Category translation model
export interface ICategoryTranslation {
  id: number;
  category_id: number;
  language_code: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

// Product translation model
export interface IProductTranslation {
  id: number;
  product_id: number;
  language_code: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

// Option translation model
export interface IOptionTranslation {
  id: number;
  option_id: number;
  language_code: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

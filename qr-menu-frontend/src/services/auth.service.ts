import type { ICategory } from '../types';
import apiService from './api.service';

interface LoginCredentials {
  username: string;
  password: string;
}

interface RegisterData {
  username: string;
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
  role?: string;
}

interface AuthResponse {
  success: boolean;
  token: string;
  user: UserData;
}

// UserData tipini doğru şekilde tanımla
export interface UserData {
  id: number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role: string;
}

// API yanıtı ile UserData arasındaki uyuşmazlığı gidermek için güncellendi
interface MeResponse {
  success: boolean;
  data: UserData;
}

class AuthService {
  private isAuthenticated = false;
  private currentUser: UserData | null = null;

  constructor() {
    // Check if user is already authenticated
    this.checkAuth();
  }

  // Check if user has stored token and init user data
  private checkAuth(): void {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (token && userData) {
      this.isAuthenticated = true;
      this.currentUser = JSON.parse(userData);
    } else {
      this.isAuthenticated = false;
      this.currentUser = null;
    }
  }

  // Login user
  public async login(credentials: LoginCredentials): Promise<UserData> {
    try {
      console.log('Auth service sending login request:', { username: credentials.username });
      const response = await apiService.post<AuthResponse>('/auth/login', credentials);
      console.log('Auth Service Login Response:', response);

      // Yeni API yanıt formatı: { success: true, token: "...", user: {...} }
      if (response.success && response.data) {
        // Doğrudan token ve user özelliklerini kontrol et
        if (response.data.token && response.data.user) {
          const { token, user } = response.data;
          console.log('Başarılı login yanıtı:', { token: token.substring(0, 10) + '...', user });

          // Store token
          apiService.setToken(token);
          localStorage.setItem('user', JSON.stringify(user));
          localStorage.setItem('token', token);

          // Update auth state
          this.isAuthenticated = true;
          this.currentUser = user;

          return user;
        }

        // Eski format kontrolü (data.user ve data.token)
        if (response.data && response.data.user && response.data.token) {
          const { token, user } = response.data;
          console.log('Eski format başarılı login yanıtı:', { token: token.substring(0, 10) + '...', user });

          // Store token
          apiService.setToken(token);
          localStorage.setItem('user', JSON.stringify(user));
          localStorage.setItem('token', token);

          // Update auth state
          this.isAuthenticated = true;
          this.currentUser = user;

          return user;
        }
      }

      // If we reach here, the response was invalid
      console.error('Geçersiz API yanıtı:', response);
      throw new Error('Geçersiz kullanıcı adı veya şifre');
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  // Register new user
  public async register(userData: RegisterData): Promise<UserData> {
    try {
      const response = await apiService.post<AuthResponse>('/auth/register', userData);
      console.log('Auth Service Register Response:', response);

      // Verify API response format
      if (response && response.success && response.data) {
        // Yeni API yanıt formatı kontrolü
        if (response.data.token && response.data.user) {
          const { token, user } = response.data;

          // Store token
          apiService.setToken(token);
          localStorage.setItem('user', JSON.stringify(user));
          localStorage.setItem('token', token);

          // Update auth state
          this.isAuthenticated = true;
          this.currentUser = user;

          return user;
        }

        // Eski API yanıt formatı kontrolü
        if (response.data && response.data.token && response.data.user) {
          const { token, user } = response.data;

          // Store token
          apiService.setToken(token);
          localStorage.setItem('user', JSON.stringify(user));
          localStorage.setItem('token', token);

          // Update auth state
          this.isAuthenticated = true;
          this.currentUser = user;

          return user;
        }
      }

      throw new Error('Invalid response from server');
    } catch (error) {
      console.error('Register error:', error);
      throw error;
    }
  }

  // Verify email
  public async verifyEmail(token: string): Promise<boolean> {
    try {
      const response = await apiService.post<{ success: boolean }>('/auth/verify-email', { token });
      return response.success || false;
    } catch (error) {
      console.error('Email verification error:', error);
      return false;
    }
  }

  // Get current user
  public async getCurrentUser(): Promise<UserData | null> {
    try {
      const response = await apiService.get<MeResponse>('/auth/me');
      console.log('Get Current User Response:', response);

      // Check if response is successful and has data
      if (response && response.success && response.data) {
        let userData: UserData;

        // Doğrudan response.data bir UserData objesi olabilir
        if (response.data.data.id) {
          userData = response.data as unknown as UserData;
        } else {
          // Eski format - userData response.data.data içinde
          userData = response.data.data;
        }

        // Update local storage and state with user data
        this.isAuthenticated = true;
        this.currentUser = userData;
        localStorage.setItem('user', JSON.stringify(userData));

        return userData;
      }

      // If no data from API, return the cached user
      return this.currentUser;
    } catch (error) {
      console.error('Get current user error:', error);
      return this.currentUser;
    }
  }

  // Logout user
  public logout(): void {
    // Clear token from API service
    apiService.setToken(null);

    // Clear local storage
    localStorage.removeItem('token');
    localStorage.removeItem('user');

    // Reset state
    this.isAuthenticated = false;
    this.currentUser = null;
  }

  // Check if user is authenticated
  public isUserAuthenticated(): boolean {
    return this.isAuthenticated;
  }

  // Alias for isUserAuthenticated for backward compatibility
  public isLoggedIn(): boolean {
    return this.isUserAuthenticated();
  }

  // Get user
  public getUser(): UserData | null {
    return this.currentUser;
  }

  // Request password reset
  public async requestPasswordReset(email: string): Promise<boolean> {
    try {
      const response = await apiService.post<{ success: boolean }>('/auth/forgot-password', { email });
      return response.success || false;
    } catch (error) {
      console.error('Password reset request error:', error);
      return false;
    }
  }

  // Reset password
  public async resetPassword(token: string, password: string): Promise<boolean> {
    try {
      const response = await apiService.post<{ success: boolean }>('/auth/reset-password', { token, password });
      return response.success || false;
    } catch (error) {
      console.error('Password reset error:', error);
      return false;
    }
  }
}

export const authService = new AuthService();
export default authService;

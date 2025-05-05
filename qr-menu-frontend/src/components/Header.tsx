import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import settingsService from '../services/settings.service';
import WaiterCallModal from './WaiterCallModal';
import { authService } from '../services';
import type { IUser, ICartItem } from '../types';
import type { SiteSettings } from '../services/settings.service';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isWaiterModalOpen, setIsWaiterModalOpen] = useState(false);
  const [user, setUser] = useState<IUser | null>(null);
  const [cartItemsCount, setCartItemsCount] = useState<number>(0);
  const [settings, setSettings] = useState<SiteSettings>({
    restaurant_logo: '',
    restaurant_name: '',
  });
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const siteSettings = await settingsService.getSettings();
        setSettings(siteSettings);
      } catch (error) {
        console.error('Error loading footer data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    const getCartCount = () => {
      const cart = localStorage.getItem('cart');
      if (cart) {
        const items = JSON.parse(cart) as ICartItem[];
        return items.reduce((total, item) => total + item.quantity, 0);
      }
      return 0;
    };

    setCartItemsCount(getCartCount());

    const handleStorageChange = () => {
      setCartItemsCount(getCartCount());
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('cartUpdated', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('cartUpdated', handleStorageChange);
    };
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const currentUser = authService.getUser();
        setUser(currentUser as IUser);

        if (location.pathname.startsWith('/admin')) {
          try {
            const isValid = await authService.isUserAuthenticated();
            if (!isValid) {
              setUser(null);
            }
          } catch (err) {
            console.error('Token doğrulama hatası:', err);
            setUser(null);
          }
        }
      } catch (error) {
        console.error('Kullanıcı bilgilerini alma hatası:', error);
        setUser(null);
      }
    })();
  }, [location.pathname]);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const openWaiterModal = () => {
    setIsWaiterModalOpen(true);
    setIsMenuOpen(false);
  };

  const handleLogout = () => {
    authService.logout();
    setUser(null);
    setIsMenuOpen(false);
    window.location.href = '/';
  };

  return (
    <>
      <header className="fixed top-0 z-40 w-full bg-white shadow-sm">
        <div className="container mx-auto flex h-[var(--header-height)] items-center justify-between px-4">
          <Link to="/" className="flex items-center">
            <img
              src={settings.restaurant_logo}
              alt={`${settings.name} Logo`}
              className="h-10 w-auto mr-2"
            />
            <span className="text-xl font-bold text-primary">{settings.restaurant_name}</span>
          </Link>

          <button
            className="p-2 text-gray-600 hover:text-primary md:hidden"
            onClick={toggleMenu}
            aria-label="Toggle menu"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {isMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>

          <nav className="hidden md:block">
            <ul className="flex space-x-8">
              <li>
                <Link
                  to="/menu"
                  className={`flex items-center text-gray-600 hover:text-primary ${
                    location.pathname === '/menu' ? 'text-primary font-medium' : ''
                  }`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 mr-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4 6h16M4 10h16M4 14h16M4 18h16"
                    />
                  </svg>
                  Menü
                </Link>
              </li>
              <li>
                <button
                  className="flex items-center text-gray-600 hover:text-primary"
                  onClick={openWaiterModal}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 mr-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                    />
                  </svg>
                  Garson Çağır
                </button>
              </li>
              <li>
                <Link
                  to="/feedback"
                  className={`flex items-center text-gray-600 hover:text-primary ${
                    location.pathname === '/feedback' ? 'text-primary font-medium' : ''
                  }`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 mr-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
                    />
                  </svg>
                  Geri Bildirim
                </Link>
              </li>
              <li className="relative">
                <Link
                  to="/cart"
                  className={`flex items-center text-gray-600 hover:text-primary ${
                    location.pathname === '/cart' ? 'text-primary font-medium' : ''
                  }`}
                >
                  <span className="relative">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6 mr-1"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"
                      />
                    </svg>
                    {cartItemsCount > 0 && (
                      <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-medium text-white">
                        {cartItemsCount}
                      </span>
                    )}
                  </span>
                  <span>Sepet</span>
                </Link>
              </li>
            </ul>
          </nav>

          {isMenuOpen && (
            <div className="absolute left-0 top-[var(--header-height)] w-full bg-white py-4 shadow-md md:hidden">
              <ul className="flex flex-col space-y-4 px-4">
                <li>
                  <Link
                    to="/menu"
                    className={`flex items-center py-2 text-gray-600 hover:text-primary ${
                      location.pathname === '/menu' ? 'text-primary font-medium' : ''
                    }`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 mr-1"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4 6h16M4 10h16M4 14h16M4 18h16"
                      />
                    </svg>
                    Menü
                  </Link>
                </li>
                <li>
                  <button
                    className="flex items-center w-full py-2 text-left text-gray-600 hover:text-primary"
                    onClick={openWaiterModal}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 mr-1"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                      />
                    </svg>
                    Garson Çağır
                  </button>
                </li>
                <li>
                  <Link
                    to="/feedback"
                    className={`flex items-center py-2 text-gray-600 hover:text-primary ${
                      location.pathname === '/feedback' ? 'text-primary font-medium' : ''
                    }`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 mr-1"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
                      />
                    </svg>
                    Geri Bildirim
                  </Link>
                </li>
                <li className="relative">
                  <Link
                    to="/cart"
                    className={`flex items-center py-2 text-gray-600 hover:text-primary ${
                      location.pathname === '/cart' ? 'text-primary font-medium' : ''
                    }`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <span className="relative">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-6 w-6 mr-1"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"
                        />
                      </svg>
                      {cartItemsCount > 0 && (
                        <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-medium text-white">
                          {cartItemsCount}
                        </span>
                      )}
                    </span>
                    <span>Sepet</span>
                  </Link>
                </li>
              </ul>
            </div>
          )}
        </div>
      </header>

      {/* Sabit Garson Çağır Butonu - Sol Alt Köşede */}
      <button
        onClick={openWaiterModal}
        className="fixed bottom-4 left-4 z-50 flex items-center justify-center w-16 h-16 rounded-full bg-primary text-white shadow-lg hover:bg-primary-dark transition-colors duration-200"
        aria-label="Garson Çağır"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
      </button>

      {/* Waiter Call Modal */}
      {isWaiterModalOpen && (
        <WaiterCallModal onClose={() => setIsWaiterModalOpen(false)} />
      )}
    </>
  );
};

export default Header;
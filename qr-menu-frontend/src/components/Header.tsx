import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import settingsService from '../services/settings.service';
import WaiterCallModal from './WaiterCallModal';
import { authService } from '../services';
import type {IUser, ICartItem } from '../types';
import type {SiteSettings } from '../services/settings.service';

// Logo ve restorant adı bilgileri


const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isWaiterModalOpen, setIsWaiterModalOpen] = useState(false);
  const [user, setUser] = useState<IUser | null>(null);
  const [cartItemsCount, setCartItemsCount] = useState<number>(0);
  const [settings, setSettings] = useState<SiteSettings>({});
  const [loading, setLoading] = useState(true);
  const location = useLocation();

    useEffect(() => {
      const loadData = async () => {
        setLoading(true);
        try {
          // Get settings from database
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

  // Sepet sayısını izle
  useEffect(() => {
    const getCartCount = () => {
      const cart = localStorage.getItem('cart');
      if (cart) {
        const items = JSON.parse(cart) as ICartItem[];
        return items.reduce((total, item) => total + item.quantity, 0);
      }
      return 0;
    };

    // İlk yükleme
    setCartItemsCount(getCartCount());

    // localStorage değişikliklerini dinle
    const handleStorageChange = () => {
      setCartItemsCount(getCartCount());
    };

    window.addEventListener('storage', handleStorageChange);

    // Özel olay dinleyicisi ekle (ürün eklendiğinde tetiklenecek)
    window.addEventListener('cartUpdated', handleStorageChange);

    // Komponent kaldırıldığında dinleyicileri temizle
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('cartUpdated', handleStorageChange);
    };
  }, []);

  useEffect(() => {
    // Asenkron IIFE kullanarak kullanıcı bilgilerini al
    (async () => {
      try {
        // Local storage'daki user bilgisini al
        const currentUser = authService.getUser();
        // Tip hatası düzeltmesi: currentUser burada Promise değil
        setUser(currentUser as IUser);

        // Token doğrulamasını sadece admin sayfalarında yapalım
        if (location.pathname.startsWith('/admin')) {
          try {
            const isValid = await authService.isUserAuthenticated;
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
    setIsMenuOpen(false); // Mobil menüyü kapat
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

          {/* Mobile menu button */}
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

          {/* Desktop menu */}
          <nav className="hidden md:block">
            <ul className="flex space-x-8">
              <li>
                <Link
                  to="/menu"
                  className={`text-gray-600 hover:text-primary ${
                    location.pathname === '/menu' ? 'text-primary font-medium' : ''
                  }`}
                >
                  Menü
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
              <li>
                <button
                  className="text-gray-600 hover:text-primary"
                  onClick={openWaiterModal}
                >
                  Garson Çağır
                </button>
              </li>
              <li>
                <Link
                  to="/feedback"
                  className={`text-gray-600 hover:text-primary ${
                    location.pathname === '/feedback' ? 'text-primary font-medium' : ''
                  }`}
                >
                  Geri Bildirim
                </Link>
              </li>

              {/* Login/Logout buttons */}
              <li>
                {user ? (
                  <button
                    onClick={handleLogout}
                    className="rounded-md border border-gray-300 px-3 py-1 text-sm text-gray-600 hover:bg-gray-100"
                  >
                    Çıkış Yap
                  </button>
                ) : (
                  <Link
                    to="/login"
                    className="rounded-md border border-gray-300 px-3 py-1 text-sm text-gray-600 hover:bg-gray-100"
                  >
                    Giriş Yap
                  </Link>
                )}
              </li>
            </ul>
          </nav>

          {/* Mobile menu */}
          {isMenuOpen && (
            <div className="absolute left-0 top-[var(--header-height)] w-full bg-white py-4 shadow-md md:hidden">
              <ul className="flex flex-col space-y-4 px-4">
                <li>
                  <Link
                    to="/menu"
                    className={`block py-2 text-gray-600 hover:text-primary ${
                      location.pathname === '/menu' ? 'text-primary font-medium' : ''
                    }`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Menü
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
                <li>
                  <button
                    className="block w-full py-2 text-left text-gray-600 hover:text-primary"
                    onClick={openWaiterModal}
                  >
                    Garson Çağır
                  </button>
                </li>
                <li>
                  <Link
                    to="/feedback"
                    className={`block py-2 text-gray-600 hover:text-primary ${
                      location.pathname === '/feedback' ? 'text-primary font-medium' : ''
                    }`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Geri Bildirim
                  </Link>
                </li>

                {/* Login/Logout buttons */}
                <li>
                  {user ? (
                    <button
                      onClick={handleLogout}
                      className="block w-full py-2 text-left text-gray-600 hover:text-primary"
                    >
                      Çıkış Yap ({user.username})
                    </button>
                  ) : (
                    <Link
                      to="/login"
                      className="block py-2 text-gray-600 hover:text-primary"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Giriş Yap
                    </Link>
                  )}
                </li>
              </ul>
            </div>
          )}
        </div>
      </header>

      {/* Waiter Call Modal */}
      {isWaiterModalOpen && (
        <WaiterCallModal onClose={() => setIsWaiterModalOpen(false)} />
      )}
    </>
  );
};

export default Header;

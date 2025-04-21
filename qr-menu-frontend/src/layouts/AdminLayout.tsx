import { Outlet, NavLink } from 'react-router-dom';
import authService from '../services/auth.service';
import { useEffect, useState } from 'react';

const AdminLayout = () => {
  const [userRole, setUserRole] = useState<string>('');

  useEffect(() => {
    // Kullanıcı rolünü al
    const user = authService.getUser();
    if (user) {
      setUserRole(user.role);
    }
  }, []);

  // Admin veya Manager rolünde olup olmadığını kontrol et
  const isAdminOrManager = userRole === 'admin' || userRole === 'manager';

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-md">
        <div className="p-4 border-b">
          <h1 className="text-xl font-semibold text-primary">QR Menu Admin</h1>
          <p className="text-sm text-gray-500 mt-1">Rol: {userRole}</p>
        </div>
        <nav className="p-4">
          <ul className="space-y-2">
            {/* Sadece Admin ve Manager rolleri için görünür */}
            {isAdminOrManager && (
              <>
                <li>
                  <NavLink
                    to="/admin"
                    end
                    className={({ isActive }) =>
                      `flex items-center p-2 rounded-md ${isActive ? 'bg-primary text-white' : 'text-gray-700 hover:bg-gray-100'}`
                    }
                  >
                    <svg
                      className="w-5 h-5 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                      />
                    </svg>
                    Panel
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/admin/statistics"
                    className={({ isActive }) =>
                      `flex items-center p-2 rounded-md ${isActive ? 'bg-primary text-white' : 'text-gray-700 hover:bg-gray-100'}`
                    }
                  >
                    <svg
                      className="w-5 h-5 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                      />
                    </svg>
                    İstatistikler
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/admin/categories"
                    className={({ isActive }) =>
                      `flex items-center p-2 rounded-md ${isActive ? 'bg-primary text-white' : 'text-gray-700 hover:bg-gray-100'}`
                    }
                  >
                    <svg
                      className="w-5 h-5 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                      />
                    </svg>
                    Kategoriler
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/admin/products"
                    className={({ isActive }) =>
                      `flex items-center p-2 rounded-md ${isActive ? 'bg-primary text-white' : 'text-gray-700 hover:bg-gray-100'}`
                    }
                  >
                    <svg
                      className="w-5 h-5 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                      />
                    </svg>
                    Ürünler
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/admin/tables"
                    className={({ isActive }) =>
                      `flex items-center p-2 rounded-md ${isActive ? 'bg-primary text-white' : 'text-gray-700 hover:bg-gray-100'}`
                    }
                  >
                    <svg
                      className="w-5 h-5 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                    Masalar
                  </NavLink>
                </li>
              </>
            )}

            {/* Tüm roller için görünür (Admin, Manager, Editor) */}
            <li>
              <NavLink
                to="/admin/orders"
                className={({ isActive }) =>
                  `flex items-center p-2 rounded-md ${isActive ? 'bg-primary text-white' : 'text-gray-700 hover:bg-gray-100'}`
                }
              >
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
                Siparişler
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/admin/waiter-calls"
                className={({ isActive }) =>
                  `flex items-center p-2 rounded-md ${isActive ? 'bg-primary text-white' : 'text-gray-700 hover:bg-gray-100'}`
                }
              >
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
                Garson Çağrıları
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/admin/feedbacks"
                className={({ isActive }) =>
                  `flex items-center p-2 rounded-md ${isActive ? 'bg-primary text-white' : 'text-gray-700 hover:bg-gray-100'}`
                }
              >
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                  />
                </svg>
                Geri Bildirimler
              </NavLink>
            </li>

            {/* Sadece Admin ve Manager rolleri için görünür */}
            {isAdminOrManager && (
              <li>
                <NavLink
                  to="/admin/settings"
                  className={({ isActive }) =>
                    `flex items-center p-2 rounded-md ${isActive ? 'bg-primary text-white' : 'text-gray-700 hover:bg-gray-100'}`
                  }
                >
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  Ayarlar
                </NavLink>
              </li>
            )}
          </ul>
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 p-8">
        <Outlet />
      </div>
    </div>
  );
};

export default AdminLayout;

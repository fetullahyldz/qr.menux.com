import type React from 'react';
import { useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { authService } from '../services/auth.service';
import Logo from '../components/Logo';

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect if already logged in
  if (authService.isLoggedIn()) {
    return <Navigate to="/admin/dashboard" />;
  }

  // Get the redirect path from location state or default to '/admin/dashboard'
  const from = location.state?.from?.pathname || '/admin/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username || !password) {
      toast.error('Lütfen kullanıcı adı ve şifre giriniz');
      setError('Lütfen kullanıcı adı ve şifre giriniz');
      return;
    }

    setLoading(true);

    try {
      console.log('Login formundan gönderilen bilgiler:', { username, passwordLength: password.length });

      // Login işlemini gerçekleştir
      await authService.login({ username, password });
      toast.success('Giriş başarılı!');

      // Get user role and redirect to appropriate page
      const user = authService.getUser();
      console.log('Login sonrası kullanıcı bilgisi:', user);

      // Kullanıcı rolüne göre yönlendirme yap
      if (user?.role === 'admin' || user?.role === 'manager'|| user?.role=== 'editor') {
        navigate('/admin/dashboard');
      } else {
        navigate('/');
      }
    } catch (error) {
      // Hata mesajını kontrol et ve daha kullanıcı dostu bir formatta göster
      let errorMessage = 'Giriş başarısız. Lütfen kullanıcı adı ve şifrenizi kontrol ediniz.';

      if (error instanceof Error) {
        errorMessage = error.message || errorMessage;
      }

      console.error('Login error:', error);
      toast.error(errorMessage);
      setError(errorMessage);

      // Şifre alanını temizleyelim
      setPassword('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>

        <h1 className="mb-6 text-center text-2xl font-bold text-gray-800">Yönetim Paneli</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="mb-1 block text-sm font-medium text-gray-700">
              Kullanıcı Adı
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-md border border-gray-300 p-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="Kullanıcı adınızı giriniz"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700">
              Şifre
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-gray-300 p-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="Şifrenizi giriniz"
              disabled={loading}
            />
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <div>
            <button
              type="submit"
              className="w-full rounded-md bg-primary py-2 font-medium text-white transition-colors hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 disabled:bg-gray-400"
              disabled={loading}
            >
              {loading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
            </button>
          </div>
        </form>

        <div className="mt-4 text-center text-sm text-gray-600">
        
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

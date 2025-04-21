import { Outlet } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';

const MainLayout = () => {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 bg-gray-50 pt-[var(--header-height)]">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default MainLayout;

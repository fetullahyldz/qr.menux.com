import { Outlet, useOutletContext } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import SEO from '../components/seo'; // Corrected import (ensure case matches file name)
import { FaArrowUp } from 'react-icons/fa';

// Define SEO context type
interface SEOContext {
  seoProps?: {
    title?: string;
    description?: string;
    keywords?: string;
    image?: string;
    url?: string;
    bannerId?: number;
  };
  setSeoProps: React.Dispatch<React.SetStateAction<SEOContext['seoProps']>>;
}

// Hook for child routes to access SEO context
export const useSEO = () => {
  return useOutletContext<SEOContext>();
};

const MainLayout = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [seoProps, setSeoProps] = useState<SEOContext['seoProps']>({}); // Added state for SEO props

  const toggleVisibility = () => {
    if (window.pageYOffset > 300) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  };

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  useEffect(() => {
    window.addEventListener('scroll', toggleVisibility);
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  return (
    <div className="flex min-h-screen flex-col">
      {/* Add SEO component with dynamic props */}
      <SEO
        title={seoProps?.title}
        description={seoProps?.description}
        keywords={seoProps?.keywords}
        image={seoProps?.image}
        url={seoProps?.url}
        bannerId={seoProps?.bannerId}
      />
      <Header />
      <main className="flex-1 bg-gray-50 pt-[var(--header-height)]">
        {/* Pass seoProps and setSeoProps to child routes via context */}
        <Outlet context={{ seoProps, setSeoProps }} />
      </main>
      <Footer />

      {/* Back to Top Button */}
      {isVisible && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg transition-all hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          aria-label="Back to top"
        >
          <FaArrowUp className="h-5 w-5" />
        </button>
      )}
    </div>
  );
};

export default MainLayout;
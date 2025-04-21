import { Link } from 'react-router-dom';

const NotFoundPage = () => {
  return (
    <div className="container mx-auto flex min-h-[calc(100vh-var(--header-height)-96px)] flex-col items-center justify-center py-12 text-center">
      <div className="mb-6 text-9xl font-bold text-primary">404</div>
      <h1 className="mb-4 text-3xl font-bold text-gray-800">Sayfa Bulunamadı</h1>
      <p className="mb-8 text-gray-600">
        Aradığınız sayfa mevcut değil veya taşınmış olabilir.
      </p>
      <Link
        to="/"
        className="inline-flex items-center rounded-lg bg-primary px-6 py-3 text-white transition-colors hover:bg-primary-dark"
      >
        Ana Sayfaya Dön
        <svg
          className="ml-2 h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M10 19l-7-7m0 0l7-7m-7 7h18"
          />
        </svg>
      </Link>
    </div>
  );
};

export default NotFoundPage;

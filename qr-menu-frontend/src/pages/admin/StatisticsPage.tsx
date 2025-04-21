import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { statisticsService } from '../../services';
import type { ISalesData, ITopProduct, IFeedbackStatistics, ISalesStatistics, IWeeklySalesData } from '../../types';

// Helper functions to ensure numeric values
const ensureNumeric = (value: any): number => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value) || 0;
  return 0;
};

// Satış raporu bileşeni
const SalesReport = ({ data }: { data: ISalesData[] }) => (
  <div className="mt-6 overflow-hidden rounded-lg bg-white shadow-md">
    <div className="p-6">
      <h2 className="mb-4 text-lg font-semibold text-gray-800">Satış Raporu</h2>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full table-auto border-collapse">
        <thead className="bg-gray-50">
          <tr>
            <th className="border-b border-gray-200 px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Tarih</th>
            <th className="border-b border-gray-200 px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Sipariş Sayısı</th>
            <th className="border-b border-gray-200 px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Ciro</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {data.length > 0 ? (
            data.map((item, index) => (
              <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-800">{item.date}</td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-800">{ensureNumeric(item.orders)}</td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-800">{ensureNumeric(item.revenue).toFixed(2)} ₺</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-500">
                Veri bulunamadı
              </td>
            </tr>
          )}
        </tbody>
        {data.length > 0 && (
          <tfoot className="bg-gray-50">
            <tr>
              <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-800">Toplam</td>
              <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-800">
                {data.reduce((sum, item) => sum + ensureNumeric(item.orders), 0)}
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-800">
                {data.reduce((sum, item) => sum + ensureNumeric(item.revenue), 0).toFixed(2)} ₺
              </td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  </div>
);

// En çok sipariş edilen ürünler bileşeni
const TopProducts = ({
  products
}: {
  products: ITopProduct[]
}) => (
  <div className="mt-6 overflow-hidden rounded-lg bg-white shadow-md">
    <div className="p-6">
      <h2 className="mb-4 text-lg font-semibold text-gray-800">En Çok Sipariş Edilen Ürünler</h2>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full table-auto border-collapse">
        <thead className="bg-gray-50">
          <tr>
            <th className="border-b border-gray-200 px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Ürün</th>
            <th className="border-b border-gray-200 px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Sipariş Sayısı</th>
            <th className="border-b border-gray-200 px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Toplam Ciro</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {products.length > 0 ? (
            products.map((product) => (
              <tr key={product.id} className="hover:bg-gray-50">
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-800">{product.name}</td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-800">{ensureNumeric(product.order_count)}</td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-800">{ensureNumeric(product.total_revenue).toFixed(2)} ₺</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-500">
                Veri bulunamadı
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </div>
);

// Geribildirim özeti bileşeni
const FeedbackSummary = ({
  feedback
}: {
  feedback: IFeedbackStatistics
}) => (
  <div className="mt-6 overflow-hidden rounded-lg bg-white shadow-md">
    <div className="p-6">
      <h2 className="mb-4 text-lg font-semibold text-gray-800">Müşteri Geribildirimleri</h2>
      <div className="mb-4 flex items-center">
        <div className="mr-4 text-4xl font-bold text-primary">{ensureNumeric(feedback.averageRating).toFixed(1)}</div>
        <div>
          <div className="flex">
            {[1, 2, 3, 4, 5].map((star) => (
              <svg
                key={star}
                className={`h-5 w-5 ${
                  star <= Math.round(ensureNumeric(feedback.averageRating)) ? 'text-yellow-500' : 'text-gray-300'
                }`}
                fill="currentColor"
                viewBox="0 0 20 20"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118l-2.799-2.034c-.784-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
          </div>
          <div className="text-sm text-gray-600">{ensureNumeric(feedback.totalCount)} değerlendirme</div>
        </div>
      </div>
    </div>

    <div className="px-6 pb-6">
      <h3 className="mb-2 text-sm font-medium text-gray-700">Derecelendirme Dağılımı</h3>
      {feedback.ratings.map((item) => (
        <div key={ensureNumeric(item.rating)} className="mb-2 flex items-center">
          <div className="mr-2 w-10 text-sm">{ensureNumeric(item.rating)} ★</div>
          <div className="flex-1">
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${(ensureNumeric(item.count) / ensureNumeric(feedback.totalCount)) * 100}%` }}
              ></div>
            </div>
          </div>
          <div className="ml-2 w-10 text-right text-sm text-gray-600">
            {Math.round((ensureNumeric(item.count) / ensureNumeric(feedback.totalCount)) * 100)}%
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Özet istatistikler bileşeni
const SummaryStats = ({
  totalOrders,
  totalRevenue,
  averageOrder
}: {
  totalOrders: number;
  totalRevenue: number;
  averageOrder: number
}) => (
  <div className="grid gap-6 md:grid-cols-3">
    <div className="rounded-lg bg-white p-6 shadow-md">
      <h2 className="mb-1 text-sm font-medium text-gray-500">Toplam Sipariş</h2>
      <p className="text-3xl font-bold text-gray-800">{ensureNumeric(totalOrders)}</p>
    </div>
    <div className="rounded-lg bg-white p-6 shadow-md">
      <h2 className="mb-1 text-sm font-medium text-gray-500">Toplam Ciro</h2>
      <p className="text-3xl font-bold text-gray-800">{ensureNumeric(totalRevenue).toFixed(2)} ₺</p>
    </div>
    <div className="rounded-lg bg-white p-6 shadow-md">
      <h2 className="mb-1 text-sm font-medium text-gray-500">Ortalama Sepet</h2>
      <p className="text-3xl font-bold text-gray-800">{ensureNumeric(averageOrder).toFixed(2)} ₺</p>
    </div>
  </div>
);

// Haftalık satış raporu bileşeni
const WeeklySalesReport = ({ data }: { data: IWeeklySalesData[] }) => (
  <div className="mt-6 overflow-hidden rounded-lg bg-white shadow-md">
    <div className="p-6">
      <h2 className="mb-4 text-lg font-semibold text-gray-800">Haftalık Satış Raporu</h2>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full table-auto border-collapse">
        <thead className="bg-gray-50">
          <tr>
            <th className="border-b border-gray-200 px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Tarih</th>
            <th className="border-b border-gray-200 px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Sipariş Sayısı</th>
            <th className="border-b border-gray-200 px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Ciro</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {data.length > 0 ? (
            data.map((item, index) => (
              <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-800">{item.day_name}</td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-800">{ensureNumeric(item.orders)}</td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-800">{ensureNumeric(item.revenue).toFixed(2)} ₺</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-500">
                Veri bulunamadı
              </td>
            </tr>
          )}
        </tbody>
        {data.length > 0 && (
          <tfoot className="bg-gray-50">
            <tr>
              <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-800">Toplam</td>
              <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-800">
                {data.reduce((sum, item) => sum + ensureNumeric(item.orders), 0)}
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-800">
                {data.reduce((sum, item) => sum + ensureNumeric(item.revenue), 0).toFixed(2)} ₺
              </td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  </div>
);

const StatisticsPage = () => {
  // State tanımlamaları
  const [period, setPeriod] = useState<'day' | 'week' | 'month' | 'year'>('week');
  const [salesData, setSalesData] = useState<ISalesData[]>([]);
  const [weeklyData, setWeeklyData] = useState<IWeeklySalesData[]>([]);
  const [topProducts, setTopProducts] = useState<ITopProduct[]>([]);
  const [feedbackData, setFeedbackData] = useState<IFeedbackStatistics>({
    averageRating: 0,
    totalCount: 0,
    ratings: []
  });
  const [loading, setLoading] = useState(true);
  const [summaryStats, setSummaryStats] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    averageOrder: 0
  });

  // API'den veri çekme fonksiyonu
  const fetchStatisticsData = async () => {
    setLoading(true);
    try {
      // 1. Satış verilerini al
      const salesResponse = await statisticsService.getSalesData({ period });

      if (period === 'week' && 'weeklyData' in salesResponse) {
        // Haftalık veri işleme
        const weekData = Array.isArray(salesResponse.weeklyData) ? salesResponse.weeklyData : [];

        setWeeklyData(weekData);
        setSummaryStats({
          totalOrders: ensureNumeric(salesResponse.totalOrders),
          totalRevenue: ensureNumeric(salesResponse.totalRevenue),
          averageOrder: ensureNumeric(salesResponse.avgOrderSize)
        });
      } else {
        // Diğer periyodlar için standart veriler
        const formattedSalesData = Array.isArray(salesResponse) ? salesResponse : [];
        setSalesData(formattedSalesData);

        // Özet istatistikleri hesapla
        const totalOrders = formattedSalesData.reduce((sum, item) => sum + ensureNumeric(item.orders), 0);
        const totalRevenue = formattedSalesData.reduce((sum, item) => sum + ensureNumeric(item.revenue), 0);
        const averageOrder = totalOrders > 0 ? totalRevenue / totalOrders : 0;

        setSummaryStats({
          totalOrders,
          totalRevenue,
          averageOrder
        });
      }
      const validPeriod = period === 'year' ? 'all' : period;
      // 2. En çok satılan ürünleri al
      const products = await statisticsService.getTopProducts({
        limit: 5,
        period: validPeriod,
      });

      const formattedProducts = Array.isArray(products) ? products : [];
      setTopProducts(formattedProducts);

      // 3. Feedback istatistiklerini al
      const feedback = await statisticsService.getFeedbackStats();
      if (feedback) {
        setFeedbackData({
          averageRating: ensureNumeric(feedback.averageRating),
          totalCount: ensureNumeric(feedback.totalCount),
          ratings: Array.isArray(feedback.ratings) ? feedback.ratings : []
        });
      }

    } catch (error) {
      console.error('İstatistik verileri yüklenirken hata:', error);
      toast.error('İstatistik verileri yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  // Period değiştiğinde verileri yeniden çek
  useEffect(() => {
    fetchStatisticsData();
  }, [period]);

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">İstatistikler ve Raporlar</h1>
        <div>
          <select
            className="rounded-md border-gray-300 px-4 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            value={period}
            onChange={(e) => setPeriod(e.target.value as 'day' | 'week' | 'month' | 'year')}
          >
            <option value="day">Günlük</option>
            <option value="week">Haftalık</option>
            <option value="month">Aylık</option>
            <option value="year">Yıllık</option>
          </select>
          <button
            className="ml-2 rounded-md bg-primary px-4 py-2 text-white"
            onClick={fetchStatisticsData}
            disabled={loading}
          >
            {loading ? 'Yükleniyor...' : 'Yenile'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <p className="text-gray-500">Veriler yükleniyor...</p>
        </div>
      ) : (
        <>
          <SummaryStats
            totalOrders={summaryStats.totalOrders}
            totalRevenue={summaryStats.totalRevenue}
            averageOrder={summaryStats.averageOrder}
          />

          {period === 'week' && weeklyData.length > 0 ? (
            <WeeklySalesReport data={weeklyData} />
          ) : (
            <SalesReport data={salesData} />
          )}

          <TopProducts products={topProducts} />
          <FeedbackSummary feedback={feedbackData} />
        </>
      )}
    </div>
  );
};

export default StatisticsPage;

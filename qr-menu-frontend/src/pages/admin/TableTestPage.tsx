import { useState, useEffect } from 'react';
import tableService from '../../services/table.service';
import type { ITable } from '../../types';
import { toast } from 'react-hot-toast';

const TableTestPage = () => {
  const [tables, setTables] = useState<ITable[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [tableNumber, setTableNumber] = useState<string>('');
  const [selectedTable, setSelectedTable] = useState<ITable | null>(null);

  useEffect(() => {
    loadTables();
  }, []);

  const loadTables = async () => {
    setLoading(true);
    try {
      const data = await tableService.getTables();
      setTables(data);
    } catch (error) {
      console.error('Error loading tables:', error);
      toast.error('Masalar yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tableNumber.trim()) {
      toast.error('Masa numarası gereklidir.');
      return;
    }

    try {
      const newTable = await tableService.createTable({
        table_number: tableNumber.trim(),
        is_active: true,
        status: 'available'
      });

      if (newTable) {
        toast.success(`${tableNumber} numaralı masa başarıyla oluşturuldu.`);
        setTableNumber('');
        loadTables();
      }
    } catch (error) {
      console.error('Error creating table:', error);
      toast.error('Masa oluşturulurken bir hata oluştu.');
    }
  };

  const generateQRCode = async (tableId: number) => {
    try {
      const result = await tableService.generateQrCode(tableId);
      if (result) {
        toast.success('QR kod başarıyla oluşturuldu.');
        loadTables();
      }
    } catch (error) {
      console.error('Error generating QR code:', error);
      toast.error('QR kod oluşturulurken bir hata oluştu.');
    }
  };

  const handleTableClick = (table: ITable) => {
    setSelectedTable(table);
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Masalar Test Sayfası</h1>

      {/* Masa oluşturma formu */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-xl font-semibold mb-4">Yeni Masa Ekle</h2>
        <form onSubmit={handleCreateTable} className="flex gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Masa numarası (örn: A-1, Masa 3)"
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              className="w-full p-2 border rounded"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded"
          >
            Masa Ekle
          </button>
        </form>
      </div>

      {/* Masalar listesi */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-xl font-semibold mb-4">Masalar</h2>

        {loading ? (
          <p>Masalar yükleniyor...</p>
        ) : tables.length === 0 ? (
          <p>Henüz masa bulunmuyor.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {tables.map(table => (
              <div
                key={table.id}
                onClick={() => handleTableClick(table)}
                className={`border p-4 rounded-lg cursor-pointer ${
                  selectedTable?.id === table.id ? 'border-blue-500 bg-blue-50' : ''
                }`}
              >
                <h3 className="font-semibold">{table.table_number}</h3>
                <p className="text-sm">
                  Durum: <span className={
                    table.status === 'available' ? 'text-green-600' :
                    table.status === 'occupied' ? 'text-red-600' : 'text-orange-500'
                  }>{table.status}</span>
                </p>
                {table.qr_code_url ? (
                  <img
                    src={table.qr_code_url}
                    alt={`QR Code for ${table.table_number}`}
                    className="w-24 h-24 mt-2"
                  />
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      generateQRCode(table.id);
                    }}
                    className="mt-2 px-2 py-1 bg-green-600 text-white text-sm rounded"
                  >
                    QR Kod Oluştur
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Seçili masa detayları */}
      {selectedTable && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Masa Detayları</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p><strong>ID:</strong> {selectedTable.id}</p>
              <p><strong>Masa No:</strong> {selectedTable.table_number}</p>
              <p><strong>Durum:</strong> {selectedTable.status}</p>
              <p><strong>Aktif:</strong> {selectedTable.is_active ? 'Evet' : 'Hayır'}</p>
              <p>
                  <strong>Oluşturulma:</strong>{' '}
                  {selectedTable.created_at
                  ? new Date(selectedTable.created_at).toLocaleString('tr-TR')
                  : 'Tarih mevcut değil'}
             </p>
              {selectedTable.updated_at && (
                <p><strong>Güncelleme:</strong> {new Date(selectedTable.updated_at).toLocaleString('tr-TR')}</p>
              )}
            </div>
            <div className="flex justify-center">
              {selectedTable.qr_code_url ? (
                <div className="text-center">
                  <img
                    src={selectedTable.qr_code_url}
                    alt={`QR Code for ${selectedTable.table_number}`}
                    className="w-48 h-48 mb-2"
                  />
                  <p>QR kodu taratarak masaya erişim sağlayabilirsiniz.</p>
                </div>
              ) : (
                <button
                  onClick={() => generateQRCode(selectedTable.id)}
                  className="px-4 py-2 bg-green-600 text-white rounded"
                >
                  QR Kod Oluştur
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TableTestPage;

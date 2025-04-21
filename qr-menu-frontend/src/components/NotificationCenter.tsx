import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { toast } from 'react-hot-toast';
import useSocket from '../hooks/useSocket';
import type { IOrder, IWaiterCall } from '../types';

interface Notification {
  id: string;
  type: 'new-order' | 'waiter-call' | 'order-status' | 'system';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  data?: {
    orderId?: number;
    tableId?: number;
    tableNumber?: string;
    status?: string;
  };
}

/**
 * Get user-friendly status text
 */
const getStatusText = (status: string): string => {
  switch (status) {
    case 'new':
      return 'Yeni';
    case 'processing':
      return 'Hazırlanıyor';
    case 'ready':
      return 'Hazır';
    case 'completed':
      return 'Tamamlandı';
    case 'cancelled':
      return 'İptal';
    default:
      return status;
  }
};

/**
 * Play notification sound based on notification type
 */
const playNotificationSound = (type: string) => {
  try {
    const audio = new Audio();

    switch (type) {
      case 'new-order':
        audio.src = '/sounds/new-order.mp3';
        break;
      case 'waiter-call':
        audio.src = '/sounds/waiter-call.mp3';
        break;
      default:
        audio.src = '/sounds/notification.mp3';
    }

    audio.play().catch(err => console.error('Error playing notification sound:', err));
  } catch (error) {
    console.error('Error playing notification sound:', error);
  }
};

const NotificationCenter = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const navigate = useNavigate();
  const { socket } = useSocket();

  // Load notifications from localStorage
  useEffect(() => {
    const savedNotifications = localStorage.getItem('admin_notifications');

    if (savedNotifications) {
      try {
        const parsedNotifications = JSON.parse(savedNotifications);
        // Convert string timestamps to Date objects
        const processedNotifications = parsedNotifications.map((n: any) => ({
          ...n,
          timestamp: new Date(n.timestamp)
        }));

        setNotifications(processedNotifications);
        setUnreadCount(processedNotifications.filter((n: Notification) => !n.read).length);
      } catch (error) {
        console.error('Error parsing saved notifications:', error);
      }
    }
  }, []);

  // Save notifications to localStorage whenever they change
  useEffect(() => {
    if (notifications.length > 0) {
      localStorage.setItem('admin_notifications', JSON.stringify(notifications));
      setUnreadCount(notifications.filter(n => !n.read).length);
    }
  }, [notifications]);

  // Listen for socket events
  useEffect(() => {
    if (!socket) return;

    // New order notification
    const handleNewOrder = (data: { order: IOrder }) => {
      const { order } = data;

      const notification: Notification = {
        id: `order-${order.id}-${Date.now()}`,
        type: 'new-order',
        title: 'Yeni Sipariş',
        message: `${order.table_number} numaralı masadan yeni sipariş geldi.`,
        timestamp: new Date(),
        read: false,
        data: {
          orderId: order.id,
          tableId: order.table_id,
          tableNumber: order.table_number
        }
      };

      setNotifications(prev => [notification, ...prev].slice(0, 50)); // Keep only last 50 notifications

      // Show toast for immediate notification
      toast(
        <div>
          <p className="font-bold">Yeni Sipariş</p>
          <p>Masa {order.table_number}</p>
        </div>,
        { icon: '🛒', duration: 5000 }
      );

      // Play notification sound
      playNotificationSound('new-order');
    };

    // Order status change notification
    const handleOrderStatusChange = (data: { order: IOrder; previousStatus: string }) => {
      const { order, previousStatus } = data;

      const notification: Notification = {
        id: `order-status-${order.id}-${Date.now()}`,
        type: 'order-status',
        title: 'Sipariş Durumu Değişti',
        message: `${order.table_number} numaralı masanın siparişi: "${getStatusText(previousStatus)}" → "${getStatusText(order.status)}"`,
        timestamp: new Date(),
        read: false,
        data: {
          orderId: order.id,
          tableId: order.table_id,
          tableNumber: order.table_number,
          status: order.status
        }
      };

      setNotifications(prev => [notification, ...prev].slice(0, 50));

      // Play notification sound for ready orders only
      if (order.status === 'ready') {
        playNotificationSound('order-status');
      }
    };

    // Waiter call notification
    const handleWaiterCall = (data: { waiterCall: IWaiterCall }) => {
      const { waiterCall } = data;

      const notification: Notification = {
        id: `waiter-call-${waiterCall.id}-${Date.now()}`,
        type: 'waiter-call',
        title: 'Garson Çağrısı',
        message: `${waiterCall.table_number} numaralı masa garson çağırdı.`,
        timestamp: new Date(),
        read: false,
        data: {
          tableId: waiterCall.table_id,
          tableNumber: waiterCall.table_number
        }
      };

      setNotifications(prev => [notification, ...prev].slice(0, 50));

      // Show toast for immediate notification
      toast(
        <div>
          <p className="font-bold">Garson Çağrısı</p>
          <p>Masa {waiterCall.table_number}</p>
        </div>,
        { icon: '🔔', duration: 8000 }
      );

      // Play notification sound
      playNotificationSound('waiter-call');
    };

    // Listen for socket events
    socket.on('new-order', handleNewOrder);
    socket.on('order-status-updated', handleOrderStatusChange);
    socket.on('new-waiter-call', handleWaiterCall);

    // Cleanup
    return () => {
      socket.off('new-order', handleNewOrder);
      socket.off('order-status-updated', handleOrderStatusChange);
      socket.off('new-waiter-call', handleWaiterCall);
    };
  }, [socket]);

  // Mark all notifications as read
  const markAllAsRead = () => {
    setNotifications(notifications.map(notification => ({
      ...notification,
      read: true
    })));
  };

  // Handle notification click
  const handleNotificationClick = (notification: Notification) => {
    // Mark as read
    setNotifications(
      notifications.map(n =>
        n.id === notification.id ? { ...n, read: true } : n
      )
    );

    // Navigate based on notification type
    if (notification.type === 'new-order' || notification.type === 'order-status') {
      if (notification.data?.orderId) {
        navigate(`/admin/orders?id=${notification.data.orderId}`);
      } else {
        navigate('/admin/orders');
      }
    } else if (notification.type === 'waiter-call') {
      navigate('/admin/tables');
    }

    // Close the notification panel
    setShowNotifications(false);
  };

  // Format notification time
  const formatTime = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    // Less than a minute
    if (diff < 60 * 1000) {
      return 'Az önce';
    }

    // Less than an hour
    if (diff < 60 * 60 * 1000) {
      const minutes = Math.floor(diff / (60 * 1000));
      return `${minutes} dakika önce`;
    }

    // Less than a day
    if (diff < 24 * 60 * 60 * 1000) {
      const hours = Math.floor(diff / (60 * 60 * 1000));
      return `${hours} saat önce`;
    }

    // Otherwise, show the date
    return date.toLocaleDateString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="relative">
      <button
        className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-gray-100"
        onClick={() => setShowNotifications(!showNotifications)}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {showNotifications && (
        <div className="absolute right-0 mt-2 w-80 overflow-hidden rounded-lg border bg-white shadow-lg sm:w-96">
          <div className="flex items-center justify-between border-b px-4 py-2">
            <h3 className="font-medium">Bildirimler</h3>
            {unreadCount > 0 && (
              <button
                className="text-sm text-primary hover:text-primary-dark"
                onClick={markAllAsRead}
              >
                Tümünü okundu işaretle
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-6 text-center">
                <Bell className="mb-2 h-8 w-8 text-gray-400" />
                <p className="text-gray-500">Henüz bildirim bulunmuyor</p>
              </div>
            ) : (
              <div>
                {notifications.map(notification => (
                  <div
                    key={notification.id}
                    className={`cursor-pointer border-b px-4 py-3 hover:bg-gray-50 ${
                      !notification.read ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start">
                      <div
                        className={`mr-2 mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${
                          notification.type === 'new-order'
                            ? 'bg-green-100 text-green-600'
                            : notification.type === 'waiter-call'
                            ? 'bg-red-100 text-red-600'
                            : 'bg-blue-100 text-blue-600'
                        }`}
                      >
                        {notification.type === 'new-order' ? (
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                            />
                          </svg>
                        ) : notification.type === 'waiter-call' ? (
                          <svg
                            className="h-4 w-4"
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
                        ) : (
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-gray-800">{notification.title}</p>
                          <p className="text-xs text-gray-500">
                            {formatTime(notification.timestamp)}
                          </p>
                        </div>
                        <p className="text-sm text-gray-600">{notification.message}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;

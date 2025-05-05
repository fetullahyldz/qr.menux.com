// src/hooks/useSocket.ts
import { useEffect, useState } from 'react';
import io, { Socket } from 'socket.io-client';
import { IOrder, IWaiterCall } from '../types';

interface ServerToClientEvents {
  'new-order': (data: { order: IOrder }) => void;
  'order-status-updated': (data: { order: IOrder; previousStatus: string }) => void;
  'new-waiter-call': (data: { waiterCall: IWaiterCall }) => void;
}

interface ClientToServerEvents {}

type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export function useSocket(url: string) {
  const [socket, setSocket] = useState<AppSocket | null>(null);

  useEffect(() => {
    const socketInstance = io(url, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [url]);

  return { socket };
}
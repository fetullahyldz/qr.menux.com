class WebSocketService {
  private ws: WebSocket | null = null; 
  private wsProtocol: string = import.meta.env.VITE_ENV === 'production' ? 'wss://' : 'ws://';
  private url: string = `${this.wsProtocol}${import.meta.env.VITE_BACKEND_URL}`;
  private reconnectInterval = 5000;
  private isConnecting = false;

  public connect(onMessage: (data: any) => void): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('WebSocket zaten bağlı, yeni bağlantı kurulmadı');
      return;
    }

    if (this.isConnecting) {
      console.log('WebSocket bağlantısı kuruluyor, tekrar denenmedi');
      return;
    }

    this.isConnecting = true;
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      console.log('WebSocket bağlantısı kuruldu');
      this.isConnecting = false;
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('WebSocket mesaj alındı:', message); // Hata ayıklamak için
        onMessage(message);
      } catch (error) {
        console.error('WebSocket mesaj işleme hatası:', error);
      }
    };

    this.ws.onclose = () => {
      console.log('WebSocket bağlantısı kapandı, yeniden bağlanılıyor...');
      this.isConnecting = false;
      setTimeout(() => this.connect(onMessage), this.reconnectInterval);
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket hatası:', error);
      this.isConnecting = false;
    };
  }

  public disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.isConnecting = false;
      console.log('WebSocket bağlantısı kapatıldı');
    }
  }
}

export const webSocketService = new WebSocketService();
export default webSocketService;
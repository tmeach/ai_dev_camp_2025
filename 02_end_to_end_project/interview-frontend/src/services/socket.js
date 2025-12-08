import { io } from 'socket.io-client';

const SOCKET_SERVER_URL = import.meta.env.VITE_SOCKET_SERVER_URL || 'http://localhost:3001';

class SocketService {
  constructor() {
    this.socket = null;
    this.roomId = null;
    this.role = null;
    this.listeners = new Map();
    this.connectionCallbacks = [];
  }

  connect(roomId, role = 'candidate') {
    if (this.socket?.connected) {
      this.disconnect();
    }

    this.roomId = roomId;
    this.role = role;

    this.socket = io(SOCKET_SERVER_URL, {
      query: { roomId, role },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    // Базовые обработчики
    this.socket.on('connect', () => {
      console.log('✅ WebSocket connected:', this.socket.id);
      
      // Автоматически присоединяемся к комнате
      this.socket.emit('join-room', {
        roomId,
        role,
        timestamp: new Date().toISOString()
      });
      
      // Уведомляем всех подписчиков о подключении
      this.connectionCallbacks.forEach(cb => cb(true));
    });

    this.socket.on('room-state', (data) => {
      console.log('📦 Received room state:', data);
      this.emitToListeners('room-state', data);
    });

    this.socket.on('code-update', (data) => {
      console.log('📝 Received code update from:', data.senderId);
      this.emitToListeners('code-update', data);
    });

    this.socket.on('language-updated', (data) => {
      console.log('🌐 Language updated to:', data.language);
      this.emitToListeners('language-updated', data);
    });

    this.socket.on('user-joined', (data) => {
      console.log('👤 User joined:', data.userId);
      this.emitToListeners('user-joined', data);
    });

    this.socket.on('execution-result', (data) => {
      console.log('⚡ Execution result received');
      this.emitToListeners('execution-result', data);
    });

    this.socket.on('user-left', (data) => {
      console.log('👋 User left:', data.userId);
      this.emitToListeners('user-left', data);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ WebSocket disconnected:', reason);
      this.connectionCallbacks.forEach(cb => cb(false));
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error.message);
      this.connectionCallbacks.forEach(cb => cb(false));
    });

    return this.socket;
  }

  // Отправка событий
  sendCodeChange(code) {
    if (!this.socket || !this.roomId) {
      console.warn('Cannot send code change: not connected');
      return;
    }
    
    this.socket.emit('code-change', {
      roomId: this.roomId,
      code,
      timestamp: new Date().toISOString()
    });
  }

  changeLanguage(language) {
    if (!this.socket || !this.roomId) {
      console.warn('Cannot change language: not connected');
      return;
    }
    
    this.socket.emit('language-change', {
      roomId: this.roomId,
      language,
      timestamp: new Date().toISOString()
    });
  }

  requestCodeExecution(code, language) {
    if (!this.socket || !this.roomId) {
      console.warn('Cannot request execution: not connected');
      return;
    }
    
    this.socket.emit('execute-code', {
      roomId: this.roomId,
      code,
      language,
      timestamp: new Date().toISOString()
    });
  }

  // Подписка на события
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  // Отслеживание состояния подключения
  onConnectionChange(callback) {
    this.connectionCallbacks.push(callback);
    // Возвращаем текущее состояние сразу
    callback(this.socket?.connected || false);
    
    // Функция для отписки
    return () => {
      const index = this.connectionCallbacks.indexOf(callback);
      if (index > -1) {
        this.connectionCallbacks.splice(index, 1);
      }
    };
  }

  emitToListeners(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => callback(data));
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.roomId = null;
      this.role = null;
      this.listeners.clear();
      this.connectionCallbacks.forEach(cb => cb(false));
      this.connectionCallbacks = [];
    }
  }

  getSocket() {
    return this.socket;
  }

  getRole() {
    return this.role;
  }

  isConnected() {
    return this.socket?.connected || false;
  }
}

export default new SocketService();
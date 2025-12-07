// Временная заглушка для socket.io
let mockSocket = null;

export const initializeSocket = (roomId) => {
  console.log('[Mock Socket] Connecting to room:', roomId);
  
  mockSocket = {
    emit: (event, data) => {
      console.log(`[Mock Socket] Emit ${event}:`, data);
    },
    on: (event, handler) => {
      console.log(`[Mock Socket] Listening to ${event}`);
    },
    disconnect: () => {
      console.log('[Mock Socket] Disconnected');
    }
  };
  
  // Имитация подключения
  setTimeout(() => {
    console.log('[Mock Socket] Connected successfully');
  }, 100);
  
  return mockSocket;
};

export const getSocket = () => mockSocket;
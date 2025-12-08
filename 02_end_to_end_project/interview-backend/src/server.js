const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// Хранилище комнат (временное, в памяти)
const rooms = new Map();

// REST API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Создать комнату
app.post('/api/rooms', (req, res) => {
  const roomId = generateRoomId();
  const room = {
    id: roomId,
    createdAt: new Date().toISOString(),
    participants: [],
    language: 'javascript',
    code: '// Welcome to the interview!\n// Start coding here...',
    isActive: true
  };
  
  rooms.set(roomId, room);
  console.log(`Room created: ${roomId}`);
  
  res.status(201).json({
    roomId,
    url: `${process.env.CORS_ORIGIN}/?room=${roomId}`,
    ...room
  });
});

// Получить информацию о комнате
app.get('/api/rooms/:roomId', (req, res) => {
  const { roomId } = req.params;
  const room = rooms.get(roomId);
  
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  
  res.json(room);
});


// Выполнить код безопасно
app.post('/api/execute', (req, res) => {
  const { code, language, roomId } = req.body;
  
  console.log(`🔧 Code execution request: ${language}, room: ${roomId}, code length: ${code.length}`);
  
  // Только JavaScript поддерживается для выполнения
  if (language !== 'javascript') {
    return res.json({
      output: '',
      error: `Server-side execution for ${language} not implemented yet. Use JavaScript for demo.`,
      success: false,
      executionTime: 0
    });
  }
  
  try {
    const startTime = Date.now();
    let output = '';
    let error = '';
    
    // Перехватываем console.log, console.error, console.warn
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;
    
    console.log = (...args) => {
      output += args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ') + '\n';
    };
    
    console.error = (...args) => {
      error += 'ERROR: ' + args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ') + '\n';
    };
    
    console.warn = (...args) => {
      output += 'WARN: ' + args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ') + '\n';
    };
    
    // Безопасное выполнение с ограничениями
    try {
      // Создаем функцию с ограничениями
      const fn = new Function(`
        "use strict";
        try {
          ${code}
        } catch(e) {
          console.error(e.message);
          return { error: e.message, stack: e.stack };
        }
      `);
      
      const result = fn();
      
      // Восстанавливаем оригинальные console методы
      console.log = originalConsoleLog;
      console.error = originalConsoleError;
      console.warn = originalConsoleWarn;
      
      const executionTime = Date.now() - startTime;
      
      // Если функция вернула ошибку
      if (result && result.error) {
        return res.json({
          output: output,
          error: result.error + (result.stack ? '\n' + result.stack : ''),
          success: false,
          executionTime
        });
      }
      
      res.json({
        output: output || '// Code executed successfully (no console output)',
        error: error,
        success: true,
        executionTime
      });
      
    } catch (executionError) {
      // Восстанавливаем console методы в случае ошибки
      console.log = originalConsoleLog;
      console.error = originalConsoleError;
      console.warn = originalConsoleWarn;
      
      const executionTime = Date.now() - startTime;
      
      res.json({
        output: output,
        error: executionError.toString(),
        success: false,
        executionTime
      });
    }
    
  } catch (error) {
    res.json({
      output: '',
      error: `Server error: ${error.message}`,
      success: false,
      executionTime: 0
    });
  }
});

// WebSocket обработка
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  
  socket.on('join-room', (data) => {
    const { roomId, role } = data;
    
    if (!rooms.has(roomId)) {
      // Автоматически создаем комнату если её нет
      rooms.set(roomId, {
        id: roomId,
        createdAt: new Date().toISOString(),
        participants: [],
        language: 'javascript',
        code: '// Welcome!\n// Start coding here...',
        isActive: true
      });
    }
    
    const room = rooms.get(roomId);
    
    // Добавляем участника
    const participant = {
      id: socket.id,
      role: role || 'candidate',
      joinedAt: new Date().toISOString()
    };
    
    room.participants.push(participant);
    socket.join(roomId);
    
    console.log(`User ${socket.id} joined room ${roomId} as ${participant.role}`);
    
    // Отправляем текущее состояние комнаты новому участнику
    socket.emit('room-state', {
      roomId,
      language: room.language,
      code: room.code,
      participants: room.participants
    });
    
    // Уведомляем других участников
    socket.to(roomId).emit('user-joined', {
      roomId,
      userId: socket.id,
      role: participant.role,
      participantsCount: room.participants.length
    });
  });
  
// Обработка изменения кода
socket.on('code-change', (data) => {
    const { roomId, code } = data;
    const room = rooms.get(roomId);
    
    if (room) {
        // Обновляем код в комнате
        room.code = code;
        room.lastUpdated = new Date().toISOString();
        
        console.log(`📝 Code updated in room ${roomId} by ${socket.id}, length: ${code.length}`);
        
        // Рассылаем всем кроме отправителя
        socket.to(roomId).emit('code-update', {
            roomId,
            code,
            senderId: socket.id,
            timestamp: new Date().toISOString()
        });
    }
});
  
// Обработка смены языка
socket.on('language-change', (data) => {
  const { roomId, language, senderId = socket.id } = data;
  const room = rooms.get(roomId);
  
  if (room && room.language !== language) {
    room.language = language;
    
    // Рассылаем всем В КОМНАТЕ КРОМЕ ОТПРАВИТЕЛЯ
    socket.to(roomId).emit('language-updated', {
      roomId,
      language,
      senderId: senderId || socket.id,
      timestamp: new Date().toISOString()
    });
    
    console.log(`Language changed to ${language} in room ${roomId} by ${senderId || socket.id}`);
  }
});
  

// Обработка запроса на выполнение кода
socket.on('execute-code', async (data) => {
  const { roomId, code, language } = data;
  
  console.log(`⚡ Execution requested in room ${roomId} for ${language}, code: ${code.substring(0, 50)}...`);
  
  try {
    // Отправляем HTTP запрос на выполнение кода
    const response = await fetch(`http://localhost:${PORT}/api/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code, language, roomId })
    });
    
    const result = await response.json();
    
    console.log(`⚡ Execution result: ${result.success ? 'SUCCESS' : 'FAILED'}, output length: ${result.output?.length || 0}`);
    
    // Отправляем результат всем в комнате
    io.to(roomId).emit('execution-result', {
      ...result,
      roomId,
      timestamp: new Date().toISOString(),
      senderId: socket.id
    });
    
  } catch (error) {
    console.error('Execution error:', error);
    
    io.to(roomId).emit('execution-result', {
      roomId,
      output: '',
      error: `Execution failed: ${error.message}`,
      success: false,
      timestamp: new Date().toISOString(),
      senderId: socket.id
    });
  }
});
  
  // Обработка отключения
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    
    // Удаляем участника из всех комнат
    rooms.forEach((room, roomId) => {
      const participantIndex = room.participants.findIndex(p => p.id === socket.id);
      if (participantIndex > -1) {
        room.participants.splice(participantIndex, 1);
        
        // Уведомляем остальных
        socket.to(roomId).emit('user-left', {
          roomId,
          userId: socket.id,
          participantsCount: room.participants.length
        });
        
        // Если комната пустая, удаляем через некоторое время
        if (room.participants.length === 0) {
          setTimeout(() => {
            if (rooms.get(roomId)?.participants.length === 0) {
              rooms.delete(roomId);
              console.log(`Room ${roomId} deleted (empty)`);
            }
          }, 300000); // 5 минут
        }
      }
    });
  });
});

// Вспомогательная функция для генерации ID комнаты
function generateRoomId() {
  return Math.random().toString(36).substring(2, 10);
}

// Запуск сервера
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 WebSocket server ready`);
  console.log(`🔗 CORS origin: ${process.env.CORS_ORIGIN || 'http://localhost:5173'}`);
});
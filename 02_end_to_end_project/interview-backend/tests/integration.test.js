const { Server } = require('socket.io');
const http = require('http');
const express = require('express');
const socketIOClient = require('socket.io-client');

describe('Online Interview Platform - Интеграционные тесты', () => {
  let server, io, serverUrl = 'http://localhost:3002';
  
  beforeAll((done) => {
    const app = express();
    server = http.createServer(app);
    io = new Server(server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });
    
    // Имитация реального сервера - УПРОЩЕННАЯ
    const rooms = new Map();
    
    io.on('connection', (socket) => {
      // Присоединение к комнате
      socket.on('join-room', (data) => {
        const { roomId, role } = data;
        
        if (!rooms.has(roomId)) {
          rooms.set(roomId, {
            participants: [],
            language: 'javascript',
            code: '// Начальный код'
          });
        }
        
        const room = rooms.get(roomId);
        room.participants.push({ id: socket.id, role });
        
        socket.join(roomId);
        
        // ОТПРАВЛЯЕМ СОСТОЯНИЕ ВСЕМ В КОМНАТЕ (включая нового участника)
        io.to(roomId).emit('room-state', {
          roomId,
          language: room.language,
          code: room.code,
          participants: room.participants
        });
        
        // Уведомляем других участников о новом
        socket.to(roomId).emit('user-joined', {
          roomId,
          userId: socket.id,
          role,
          participantsCount: room.participants.length
        });
      });
      
      // Изменение кода
      socket.on('code-change', (data) => {
        const { roomId, code } = data;
        const room = rooms.get(roomId);
        
        if (room) {
          room.code = code;
          socket.to(roomId).emit('code-update', {
            roomId,
            code,
            senderId: socket.id,
            timestamp: new Date().toISOString()
          });
        }
      });
      
      // Изменение языка
      socket.on('language-change', (data) => {
        const { roomId, language } = data;
        const room = rooms.get(roomId);
        
        if (room) {
          room.language = language;
          io.to(roomId).emit('language-updated', {
            roomId,
            language,
            senderId: socket.id
          });
        }
      });
      
      // Запрос на выполнение кода
      socket.on('execute-code', (data) => {
        const { roomId, code, language } = data;
        
        const result = {
          roomId,
          output: `Выполнен код на ${language}:\n${code.substring(0, 100)}`,
          error: '',
          success: true,
          timestamp: new Date().toISOString(),
          senderId: socket.id
        };
        
        io.to(roomId).emit('execution-result', result);
      });
      
      // Отключение клиента - ОТПРАВЛЯЕМ ВСЕМ В КОМНАТЕ
      socket.on('disconnect', () => {
        rooms.forEach((room, roomId) => {
          const participantIndex = room.participants.findIndex(p => p.id === socket.id);
          if (participantIndex !== -1) {
            room.participants.splice(participantIndex, 1);
            // ОТПРАВЛЯЕМ ВСЕМ В КОМНАТЕ
            io.to(roomId).emit('user-left', {
              roomId,
              userId: socket.id,
              participantsCount: room.participants.length
            });
          }
        });
      });
    });
    
    server.listen(3002, done);
  });
  
  afterAll((done) => {
    io.close();
    server.close(done);
  });
  
  describe('Базовое подключение WebSocket', () => {
    test('Клиент может подключиться к серверу', (done) => {
      const client = socketIOClient(serverUrl);
      
      client.on('connect', () => {
        expect(client.connected).toBe(true);
        client.disconnect();
        done();
      });
      
      client.on('connect_error', (err) => {
        done(err);
      });
    }, 10000);
    
    test('Несколько клиентов могут подключиться одновременно', (done) => {
      const client1 = socketIOClient(serverUrl);
      const client2 = socketIOClient(serverUrl);
      const client3 = socketIOClient(serverUrl);
      
      let connectedCount = 0;
      const totalClients = 3;
      
      const checkConnection = () => {
        connectedCount++;
        if (connectedCount === totalClients) {
          expect(client1.connected).toBe(true);
          expect(client2.connected).toBe(true);
          expect(client3.connected).toBe(true);
          client1.disconnect();
          client2.disconnect();
          client3.disconnect();
          done();
        }
      };
      
      client1.on('connect', checkConnection);
      client2.on('connect', checkConnection);
      client3.on('connect', checkConnection);
      
      setTimeout(() => {
        if (connectedCount < totalClients) {
          client1.disconnect();
          client2.disconnect();
          client3.disconnect();
          done(new Error('Не все клиенты подключились'));
        }
      }, 5000);
    }, 10000);
  });
  
  describe('Управление комнатами', () => {
    test('Клиенты могут присоединиться к одной комнате', (done) => {
      const client1 = socketIOClient(serverUrl);
      const client2 = socketIOClient(serverUrl);
      const roomId = `room-${Date.now()}-${Math.random().toString(36).substring(2)}`;
      
      let client1Joined = false;
      let client2Joined = false;
      
      client1.on('connect', () => {
        client1.emit('join-room', { roomId, role: 'interviewer' });
      });
      
      client2.on('connect', () => {
        client2.emit('join-room', { roomId, role: 'candidate' });
      });
      
      // Оба получают room-state
      client1.on('room-state', (data) => {
        expect(data.roomId).toBe(roomId);
        client1Joined = true;
        if (client2Joined) {
          client1.disconnect();
          client2.disconnect();
          done();
        }
      });
      
      client2.on('room-state', (data) => {
        expect(data.roomId).toBe(roomId);
        client2Joined = true;
        if (client1Joined) {
          client1.disconnect();
          client2.disconnect();
          done();
        }
      });
      
      // Убедимся, что client2 получил уведомление о client1
      client2.on('user-joined', (data) => {
        expect(data.roomId).toBe(roomId);
        expect(data.userId).toBe(client1.id);
      });
      
      setTimeout(() => {
        if (!client1Joined || !client2Joined) {
          console.log('Debug: client1Joined=', client1Joined, 'client2Joined=', client2Joined);
          client1.disconnect();
          client2.disconnect();
          done(new Error('Не все клиенты присоединились к комнате'));
        }
      }, 3000);
    }, 10000);
    
    test('При отключении клиента другие получают уведомление', (done) => {
      const client1 = socketIOClient(serverUrl, { forceNew: true });
      const client2 = socketIOClient(serverUrl, { forceNew: true });
      const roomId = `disconnect-test-${Date.now()}`;
      
      client1.on('connect', () => {
        client1.emit('join-room', { roomId, role: 'interviewer' });
      });
      
      client2.on('connect', () => {
        client2.emit('join-room', { roomId, role: 'candidate' });
        
        client2.on('user-left', (data) => {
          expect(data.roomId).toBe(roomId);
          expect(data.userId).toBe(client1.id);
          client2.disconnect();
          done();
        });
        
        // Ждем присоединения обоих клиентов
        setTimeout(() => {
          client1.disconnect();
        }, 1000);
      });
      
      setTimeout(() => {
        client1.disconnect();
        client2.disconnect();
        done(new Error('Тест завершился по таймауту'));
      }, 5000);
    }, 10000);
  });
  
  describe('Синхронизация кода', () => {
    test('Изменения кода синхронизируются между клиентами', (done) => {
      const sender = socketIOClient(serverUrl, { forceNew: true });
      const receiver = socketIOClient(serverUrl, { forceNew: true });
      const roomId = `code-sync-${Date.now()}`;
      const testCode = 'console.log("Тестовое сообщение");';
      
      sender.on('connect', () => {
        sender.emit('join-room', { roomId, role: 'interviewer' });
      });
      
      receiver.on('connect', () => {
        receiver.emit('join-room', { roomId, role: 'candidate' });
        
        receiver.on('code-update', (data) => {
          expect(data.roomId).toBe(roomId);
          expect(data.code).toBe(testCode);
          expect(data.senderId).toBe(sender.id);
          
          sender.disconnect();
          receiver.disconnect();
          done();
        });
        
        // Ждем присоединения к комнате
        setTimeout(() => {
          sender.emit('code-change', {
            roomId,
            code: testCode
          });
        }, 500);
      });
      
      setTimeout(() => {
        sender.disconnect();
        receiver.disconnect();
        done(new Error('Тест завершился по таймауту'));
      }, 5000);
    }, 10000);
    
    test('Множественные изменения корректно обрабатываются', (done) => {
      const client = socketIOClient(serverUrl, { forceNew: true });
      const roomId = `multi-change-${Date.now()}`;
      
      client.on('connect', () => {
        client.emit('join-room', { roomId, role: 'interviewer' });
        
        setTimeout(() => {
          // Отправляем несколько изменений быстро
          client.emit('code-change', { roomId, code: '// Первое' });
          client.emit('code-change', { roomId, code: '// Второе' });
          client.emit('code-change', { roomId, code: '// Третье' });
        }, 200);
        
        setTimeout(() => {
          expect(client.connected).toBe(true);
          client.disconnect();
          done();
        }, 1000);
      });
      
      setTimeout(() => {
        client.disconnect();
        done(new Error('Тест завершился по таймауту'));
      }, 3000);
    }, 10000);
  });
  
  describe('Синхронизация языка программирования', () => {
    test('Изменение языка рассылается всем участникам', (done) => {
      const changer = socketIOClient(serverUrl, { forceNew: true });
      const listener = socketIOClient(serverUrl, { forceNew: true });
      const roomId = `lang-test-${Date.now()}`;
      const newLanguage = 'python';
      
      changer.on('connect', () => {
        changer.emit('join-room', { roomId, role: 'interviewer' });
      });
      
      listener.on('connect', () => {
        listener.emit('join-room', { roomId, role: 'candidate' });
        
        listener.on('language-updated', (data) => {
          expect(data.roomId).toBe(roomId);
          expect(data.language).toBe(newLanguage);
          expect(data.senderId).toBe(changer.id);
          
          changer.disconnect();
          listener.disconnect();
          done();
        });
        
        setTimeout(() => {
          changer.emit('language-change', {
            roomId,
            language: newLanguage
          });
        }, 500);
      });
      
      setTimeout(() => {
        changer.disconnect();
        listener.disconnect();
        done(new Error('Тест завершился по таймауту'));
      }, 5000);
    }, 10000);
  });
  
  describe('Выполнение кода', () => {
    test('Запрос на выполнение кода рассылает результат всем', (done) => {
      const executor = socketIOClient(serverUrl, { forceNew: true });
      const watcher = socketIOClient(serverUrl, { forceNew: true });
      const roomId = `exec-test-${Date.now()}`;
      const testCode = 'console.log("Hello!");';
      
      executor.on('connect', () => {
        executor.emit('join-room', { roomId, role: 'interviewer' });
      });
      
      watcher.on('connect', () => {
        watcher.emit('join-room', { roomId, role: 'candidate' });
        
        watcher.on('execution-result', (data) => {
          expect(data.roomId).toBe(roomId);
          expect(data.output).toContain('Выполнен код');
          expect(data.success).toBe(true);
          expect(data.senderId).toBe(executor.id);
          
          executor.disconnect();
          watcher.disconnect();
          done();
        });
        
        setTimeout(() => {
          executor.emit('execute-code', {
            roomId,
            code: testCode,
            language: 'javascript'
          });
        }, 500);
      });
      
      setTimeout(() => {
        executor.disconnect();
        watcher.disconnect();
        done(new Error('Тест завершился по таймауту'));
      }, 5000);
    }, 10000);
  });
});
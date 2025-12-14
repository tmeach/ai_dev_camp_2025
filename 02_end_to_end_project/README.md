# 💻 Online Code Interview Platform

Реалтайм платформа для проведения технических собеседований с синхронизацией кода между участниками.

## 🎯 Возможности

- ✅ **Real-time синхронизация кода** между всеми участниками
- ✅ **Поддержка множества языков**: JavaScript, Python, Java, C, C++
- ✅ **Выполнение кода** (JavaScript в браузере, другие языки на сервере)
- ✅ **Управление комнатами** с уникальными ссылками
- ✅ **Роли участников**: интервьюер и кандидат
- ✅ **WebSocket соединение** для мгновенной синхронизации
- ✅ **Отслеживание участников** в реальном времени

## 🚀 Быстрый старт

### Предварительные требования

- Node.js 16+ и npm
- Современный браузер с поддержкой WebSocket

### Установка и запуск

#### 1. Backend сервер

```bash
cd interview-backend
npm install
npm run dev
```

Сервер запустится на `http://localhost:3001`

#### 2. Frontend приложение

```bash
cd interview-frontend
npm install
npm run dev
```

Приложение откроется на `http://localhost:5173`

### Конфигурация

#### Backend (.env)
```env
PORT=3001
CORS_ORIGIN=http://localhost:5173
```

#### Frontend (.env)
```env
VITE_SOCKET_SERVER_URL=http://localhost:3001
```

## 🧪 Тестирование

### Backend тесты

```bash
cd interview-backend

# Запуск всех тестов
npm test

# Запуск в watch mode (автоматический перезапуск при изменениях)
npm test -- --watch

# Запуск с coverage
npm test -- --coverage

# Запуск конкретного теста
npm test -- integration.test.js
```

### Что покрывают тесты

**Базовые сценарии:**
- ✅ Подключение клиентов к WebSocket серверу
- ✅ Присоединение к комнатам
- ✅ Синхронизация кода между участниками
- ✅ Синхронизация языка программирования
- ✅ Выполнение кода и получение результатов
- ✅ Отключение участников

**Edge Cases:**
- ✅ Обработка пустого кода
- ✅ Обработка очень большого кода (>20KB)
- ✅ Обработка невалидных данных
- ✅ Множественные быстрые изменения

**Расширенные сценарии:**
- ✅ Три и более участников в одной комнате
- ✅ Переподключение и восстановление состояния
- ✅ Broadcast изменений всем участникам
- ✅ Синхронизация выполнения кода

## 📖 Использование

### Создание интервью

1. Откройте `http://localhost:5173`
2. Автоматически создастся новая комната с уникальным ID
3. Вы станете интервьюером (первый участник)

### Приглашение кандидата

1. Скопируйте ссылку на комнату (кнопка "Copy Link")
2. Отправьте ссылку кандидату
3. Кандидат откроет ссылку и автоматически присоединится

### Работа с кодом

- **Редактирование**: Просто начните печатать - изменения синхронизируются автоматически
- **Смена языка**: Выберите язык из списка - все участники увидят изменение
- **Запуск кода**: 
  - Нажмите кнопку "Run Code"
  - Или используйте `Ctrl+Enter` (⌘+Enter на Mac)
- **Результаты**: Все участники видят результат выполнения

### Тестирование синхронизации

1. Откройте комнату в двух разных вкладках/браузерах
2. Начните печатать в одной вкладке
3. Изменения должны появиться в другой вкладке мгновенно
4. Если синхронизация не работает, нажмите кнопку "🔄 Test Sync"

## 🏗️ Архитектура

### Backend

```
interview-backend/
├── src/
│   ├── server.js           # Основной сервер (Express + Socket.IO)
│   ├── routes/             # REST API маршруты
│   ├── services/           # Бизнес-логика
│   └── socketHandler.js    # WebSocket обработчики
├── tests/
│   └── integration.test.js # Интеграционные тесты
└── package.json
```

**Технологии:**
- Express.js - HTTP сервер
- Socket.IO - WebSocket коммуникация
- In-memory хранилище комнат
- CORS для cross-origin запросов

### Frontend

```
interview-frontend/
├── src/
│   ├── App.jsx              # Главный компонент
│   ├── components/
│   │   ├── CodeEditor.jsx   # Редактор кода
│   │   ├── LanguageSelector.jsx
│   │   ├── ShareLink.jsx
│   │   └── OutputPanel.jsx
│   └── services/
│       └── socket.js        # WebSocket клиент
└── package.json
```

**Технологии:**
- React 18 - UI фреймворк
- Vite - Build tool и dev server
- Socket.IO Client - WebSocket клиент
- React Icons - Иконки

## 📡 API Reference

### REST API Endpoints

#### `GET /api/health`
Health check endpoint

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### `POST /api/rooms`
Создать новую комнату

**Response:**
```json
{
  "roomId": "abc123",
  "url": "http://localhost:5173/?room=abc123",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "language": "javascript",
  "code": "// Welcome!",
  "participants": [],
  "isActive": true
}
```

#### `GET /api/rooms/:roomId`
Получить информацию о комнате

**Response:**
```json
{
  "id": "abc123",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "participants": [
    {
      "id": "socket-id-1",
      "role": "interviewer",
      "joinedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "language": "javascript",
  "code": "console.log('Hello');",
  "isActive": true
}
```

#### `POST /api/execute`
Выполнить код (только JavaScript)

**Request:**
```json
{
  "code": "console.log('Hello');",
  "language": "javascript",
  "roomId": "abc123"
}
```

**Response:**
```json
{
  "output": "Hello\n",
  "error": "",
  "success": true,
  "executionTime": 5
}
```

### WebSocket Events

#### Client → Server

**`join-room`**
```javascript
socket.emit('join-room', {
  roomId: 'abc123',
  role: 'interviewer', // или 'candidate'
  timestamp: '2024-01-01T00:00:00.000Z'
});
```

**`code-change`**
```javascript
socket.emit('code-change', {
  roomId: 'abc123',
  code: 'console.log("Hello");',
  timestamp: '2024-01-01T00:00:00.000Z'
});
```

**`language-change`**
```javascript
socket.emit('language-change', {
  roomId: 'abc123',
  language: 'python',
  timestamp: '2024-01-01T00:00:00.000Z'
});
```

**`execute-code`**
```javascript
socket.emit('execute-code', {
  roomId: 'abc123',
  code: 'console.log("test");',
  language: 'javascript',
  timestamp: '2024-01-01T00:00:00.000Z'
});
```

#### Server → Client

**`room-state`**
```javascript
socket.on('room-state', (data) => {
  // data: { roomId, language, code, participants }
});
```

**`code-update`**
```javascript
socket.on('code-update', (data) => {
  // data: { roomId, code, senderId, timestamp }
});
```

**`language-updated`**
```javascript
socket.on('language-updated', (data) => {
  // data: { roomId, language, senderId, timestamp }
});
```

**`execution-result`**
```javascript
socket.on('execution-result', (data) => {
  // data: { roomId, output, error, success, executionTime, senderId, timestamp }
});
```

**`user-joined`**
```javascript
socket.on('user-joined', (data) => {
  // data: { roomId, userId, role, participantsCount }
});
```

**`user-left`**
```javascript
socket.on('user-left', (data) => {
  // data: { roomId, userId, participantsCount }
});
```

## 🔧 Разработка

### Структура проекта

```
02_end_to_end_project/
├── interview-backend/      # Backend сервер
│   ├── src/               # Исходный код
│   ├── tests/             # Тесты
│   └── package.json
├── interview-frontend/     # Frontend приложение
│   ├── src/               # Исходный код
│   ├── public/            # Статические файлы
│   └── package.json
└── README.md              # Этот файл
```

### Добавление нового языка программирования

1. **Frontend**: Добавьте язык в `LanguageSelector.jsx`
2. **Frontend**: Добавьте шаблон кода в `CodeEditor.jsx` → `getDefaultCode()`
3. **Backend**: Добавьте обработку выполнения в `server.js` → `/api/execute`

### Отладка

**Backend логи:**
```bash
cd interview-backend
npm run dev
# Логи будут в консоли
```

**Frontend логи:**
- Откройте DevTools (F12)
- Вкладка Console
- Все WebSocket события логируются

**WebSocket соединение:**
- Статус подключения показан в UI (🟢 Connected / 🔴 Disconnected)
- Проверьте Network → WS в DevTools

## 🐛 Troubleshooting

### Backend не запускается

```bash
# Проверьте порт
lsof -i :3001
# Если занят, измените PORT в .env

# Переустановите зависимости
rm -rf node_modules package-lock.json
npm install
```

### Frontend не подключается к backend

1. Проверьте что backend запущен на порту 3001
2. Проверьте `VITE_SOCKET_SERVER_URL` в `.env`
3. Проверьте CORS настройки в backend

### Синхронизация не работает

1. Откройте DevTools → Console
2. Проверьте WebSocket соединение (должно быть 🟢 Connected)
3. Нажмите кнопку "🔄 Test Sync"
4. Проверьте логи backend

### Тесты падают

```bash
# Убедитесь что порт 3002 свободен
lsof -i :3002

# Запустите тесты с подробным выводом
npm test -- --verbose

# Запустите один тест для отладки
npm test -- -t "Клиент может подключиться"
```

## 📝 Roadmap

- [ ] Добавить поддержку выполнения Python/Java/C++ на сервере
- [ ] Добавить syntax highlighting (CodeMirror/Monaco)
- [ ] Добавить сохранение истории изменений
- [ ] Добавить видео/аудио чат
- [ ] Добавить whiteboard для рисования
- [ ] Добавить аутентификацию пользователей
- [ ] Добавить сохранение сессий в базу данных
- [ ] Добавить E2E тесты (Playwright/Cypress)

## 🤝 Contributing

1. Fork репозиторий
2. Создайте feature branch (`git checkout -b feature/amazing-feature`)
3. Commit изменения (`git commit -m 'Add amazing feature'`)
4. Push в branch (`git push origin feature/amazing-feature`)
5. Откройте Pull Request

**Требования:**
- Все тесты должны проходить (`npm test`)
- Код должен быть отформатирован
- Добавьте тесты для новой функциональности

## 📄 License

MIT License - см. LICENSE файл

## 👥 Authors

- Разработано в рамках AI Dev Camp 2025

## 🙏 Acknowledgments

- Socket.IO за отличную WebSocket библиотеку
- React команда за React и Vite
- Все контрибьюторы проекта
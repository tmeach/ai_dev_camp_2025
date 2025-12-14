import { useState, useEffect } from 'react';
import LanguageSelector from './components/LanguageSelector';
import CodeEditor from './components/CodeEditor';
import socketService from './services/socket';
import codeExecutor from './services/codeExecutor';
import './App.css';

function App() {
  const [roomId, setRoomId] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [code, setCode] = useState('');
  const [output, setOutput] = useState('// Initializing connection...\n// Waiting for WebSocket...');
  const [isInterviewer, setIsInterviewer] = useState(false);
  const [participants, setParticipants] = useState(1);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [isExecuting, setIsExecuting] = useState(false);
  const [pyodideStatus, setPyodideStatus] = useState('not_loaded');

  // Инициализация комнаты и подключение
  useEffect(() => {
    // Получаем roomId из URL или генерируем новый
    const params = new URLSearchParams(window.location.search);
    let urlRoomId = params.get('room');
    
    if (!urlRoomId) {
      urlRoomId = Math.random().toString(36).substring(2, 10);
      window.history.replaceState({}, '', `/?room=${urlRoomId}`);
    }
    
    setRoomId(urlRoomId);
    
    // Определяем роль пользователя
    const urlRole = params.get('role');
    let userRole = 'candidate';
    
    if (urlRole === 'interviewer') {
      userRole = 'interviewer';
    } else {
      // Проверяем, есть ли уже интервьюер в этой комнате
      const roomKey = `room-${urlRoomId}-interviewer`;
      const hasInterviewer = localStorage.getItem(roomKey);
      
      if (!hasInterviewer) {
        userRole = 'interviewer';
        localStorage.setItem(roomKey, 'true');
        // Обновляем URL с ролью
        window.history.replaceState({}, '', `/?room=${urlRoomId}&role=interviewer`);
      }
    }
    
    setIsInterviewer(userRole === 'interviewer');
    setOutput(prev => `${prev}\n// Role: ${userRole}\n// Room: ${urlRoomId}`);
    
    // Подписываемся на изменения состояния подключения
    const unsubscribeConnection = socketService.onConnectionChange((connected) => {
      setIsConnected(connected);
      setConnectionStatus(connected ? 'connected' : 'disconnected');
      
      if (connected) {
        setOutput(prev => `${prev}\n// ✅ WebSocket connected as ${userRole}`);
      } else {
        setOutput(prev => `${prev}\n// ❌ WebSocket disconnected`);
      }
    });
    
    // Подключаемся к WebSocket
    socketService.connect(urlRoomId, userRole);
    
    // Подписываемся на события WebSocket
    const handleRoomState = (data) => {
      console.log('Room state received:', data);
      if (data.language && data.language !== language) {
        setLanguage(data.language);
      }
      if (data.code && data.code !== code) {
        setCode(data.code);
      }
      if (data.participants) {
        setParticipants(data.participants.length);
      }
      
      setOutput(prev => `${prev}\n// Room synchronized: ${data.language}, ${data.participants?.length || 0} participants`);
    };
    
    const handleUserJoined = (data) => {
      console.log('User joined:', data);
      setParticipants(data.participantsCount);
      setOutput(prev => `${prev}\n// 👤 User ${data.userId.substring(0, 8)}... joined as ${data.role}`);
    };
    
    const handleUserLeft = (data) => {
      setParticipants(data.participantsCount);
      setOutput(prev => `${prev}\n// 👋 User left, ${data.participantsCount} participants remaining`);
    };
    
    const handleLanguageUpdated = (data) => {
      console.log('Language updated from server:', data.language);
      if (data.language && data.language !== language) {
        setLanguage(data.language);
        setOutput(prev => `${prev}\n// 🌐 Language changed to ${data.language} by another user`);
      }
    };
    
    const handleCodeUpdate = (data) => {
      console.log('Code update from server:', data.code?.substring(0, 50));
      if (data.code && data.code !== code) {
        setCode(data.code);
      }
    };
    
    const handleExecutionResult = (data) => {
      console.log('Execution result:', data);
      setOutput(`⚡ Execution Result (${new Date().toLocaleTimeString()}):\n\n${data.output}\n${data.error ? `Error: ${data.error}\n` : ''}${data.success ? '✅ Success' : '❌ Failed'}`);
    };
    
    // Подписываемся на все события
    socketService.on('room-state', handleRoomState);
    socketService.on('user-joined', handleUserJoined);
    socketService.on('user-left', handleUserLeft);
    socketService.on('language-updated', handleLanguageUpdated);
    socketService.on('code-update', handleCodeUpdate);
    socketService.on('execution-result', handleExecutionResult);
    
    // Очистка при размонтировании
    return () => {
      unsubscribeConnection();
      socketService.off('room-state', handleRoomState);
      socketService.off('user-joined', handleUserJoined);
      socketService.off('user-left', handleUserLeft);
      socketService.off('language-updated', handleLanguageUpdated);
      socketService.off('code-update', handleCodeUpdate);
      socketService.off('execution-result', handleExecutionResult);
      socketService.disconnect();
    };
  }, []);

  // Обработка смены языка от других участников
  useEffect(() => {
    const handleExternalLanguageChange = (event) => {
      const { language: newLanguage } = event.detail;
      if (newLanguage && newLanguage !== language) {
        setLanguage(newLanguage);
        setOutput(prev => `${prev}\n// 🌐 Language changed to ${newLanguage} by another user`);
      }
    };

    window.addEventListener('external-language-change', handleExternalLanguageChange);

    return () => {
      window.removeEventListener('external-language-change', handleExternalLanguageChange);
    };
  }, [language]);

  const handleCodeChange = (newCode) => {
    setCode(newCode);
  };

  const handleLanguageChange = (newLanguage) => {
    setLanguage(newLanguage);
    // Отправляем смену языка через WebSocket
    socketService.changeLanguage(newLanguage);
    setOutput(prev => `${prev}\n// 🌐 Language changed to ${newLanguage}`);
  };

  const handleRunCode = async () => {
    setIsExecuting(true);
    
    try {
      // Check if language is supported for WASM execution
      if (!codeExecutor.isLanguageSupported(language)) {
        setOutput(`❌ ${language} execution is not supported in browser.\nOnly JavaScript and Python are supported via WASM.`);
        setIsExecuting(false);
        return;
      }

      // For Python, show loading message if Pyodide is not loaded
      if (language === 'python' && !codeExecutor.isPyodideLoaded()) {
        setOutput(`🐍 Loading Python runtime (Pyodide)...\nThis may take a few seconds on first run.`);
        setPyodideStatus('loading');
      }

      // Execute code using WASM
      const result = await codeExecutor.execute(code, language);
      
      // Update Pyodide status
      if (language === 'python' && codeExecutor.isPyodideLoaded()) {
        setPyodideStatus('loaded');
      }

      // Format output
      const timestamp = new Date().toLocaleTimeString();
      let outputText = `⚡ WASM Execution (${timestamp}):\n\n`;
      
      if (result.success) {
        outputText += result.output;
        outputText += `\n\n✅ Execution successful (${result.executionTime}ms)`;
      } else {
        outputText += `❌ Error:\n${result.error}`;
        if (result.output) {
          outputText += `\n\nOutput:\n${result.output}`;
        }
      }
      
      setOutput(outputText);
      
      // Send result to other participants via WebSocket
      if (socketService.isConnected()) {
        socketService.emit('execution-result', {
          roomId,
          output: result.output,
          error: result.error,
          success: result.success,
          executionTime: result.executionTime,
          timestamp: new Date().toISOString()
        });
      }
    } catch (err) {
      setOutput(`❌ Execution Error (${new Date().toLocaleTimeString()}):\n\n${err.message}`);
    } finally {
      setIsExecuting(false);
    }
  };

  const createNewRoom = () => {
    const newRoomId = Math.random().toString(36).substring(2, 10);
    window.location.href = `/?room=${newRoomId}&role=interviewer`;
  };

  const copyRoomLink = () => {
    const roomLink = `${window.location.origin}/?room=${roomId}${!isInterviewer ? '&role=candidate' : ''}`;
    navigator.clipboard.writeText(roomLink).then(() => {
      alert(`✅ Room link copied!\n${roomLink}`);
    });
  };

  const joinAsCandidate = () => {
    window.location.href = `/?room=${roomId}&role=candidate`;
  };

  const joinAsInterviewer = () => {
    window.location.href = `/?room=${roomId}&role=interviewer`;
  };

  const testSync = () => {
    if (socketService.isConnected()) {
      socketService.sendCodeChange(code);
      setOutput(prev => `${prev}\n// 🔄 Manual sync test sent at ${new Date().toLocaleTimeString()}`);
    } else {
      setOutput(prev => `${prev}\n// ❌ Cannot test sync: WebSocket not connected`);
    }
  };

  return (
    <div style={{ 
      padding: '20px', 
      background: '#0f172a',
      color: 'white',
      minHeight: '100vh'
    }}>
      <header style={{
        background: '#1e293b',
        padding: '1rem 2rem',
        borderRadius: '8px',
        marginBottom: '20px',
        border: '1px solid #334155',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h1 style={{ margin: 0 }}>💻 Online Code Interview</h1>
          <p style={{ margin: '10px 0 0 0', color: '#94a3b8' }}>
            Real-time coding platform | Room: <strong>{roomId}</strong>
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{
            padding: '6px 12px',
            background: isConnected ? '#10b981' : '#ef4444',
            color: 'white',
            borderRadius: '20px',
            fontSize: '14px',
            fontWeight: 'bold'
          }}>
            {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
          </div>
          <div style={{
            padding: '6px 12px',
            background: isInterviewer ? '#3b82f6' : '#8b5cf6',
            color: 'white',
            borderRadius: '20px',
            fontSize: '14px'
          }}>
            {isInterviewer ? '🎤 Interviewer' : '👨‍💻 Candidate'}
          </div>
          <div style={{
            padding: '6px 12px',
            background: '#475569',
            color: 'white',
            borderRadius: '20px',
            fontSize: '14px'
          }}>
            👥 {participants}
          </div>
        </div>
      </header>

      <div style={{
        display: 'flex',
        gap: '20px',
        height: '70vh'
      }}>
        {/* Left Panel */}
        <div style={{
          flex: 3,
          display: 'flex',
          flexDirection: 'column',
          background: '#1e293b',
          borderRadius: '8px',
          overflow: 'hidden',
          border: '1px solid #334155'
        }}>
          <div style={{
            padding: '15px',
            background: '#1a202c',
            borderBottom: '1px solid #334155',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <LanguageSelector 
              selectedLanguage={language}
              onLanguageChange={handleLanguageChange}
            />
            <div style={{ fontSize: '12px', color: '#94a3b8' }}>
              Real-time sync: {isConnected ? 'Active' : 'Inactive'}
            </div>
          </div>
          
          <div style={{
            flex: 1,
            padding: '0',
            overflow: 'hidden'
          }}>
            <CodeEditor
              language={language}
              onCodeChange={handleCodeChange}
              initialCode={code}
            />
          </div>
        </div>

        {/* Right Panel */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          minWidth: '300px'
        }}>
          <div style={{
            flex: 1,
            background: '#1e293b',
            borderRadius: '8px',
            padding: '20px',
            border: '1px solid #334155',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '15px'
            }}>
              <h3 style={{ margin: 0 }}>📤 Output</h3>
              <button
                onClick={() => setOutput('// Output cleared\n// ' + new Date().toLocaleTimeString())}
                style={{
                  padding: '6px 12px',
                  background: '#475569',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                Clear
              </button>
            </div>
            <div style={{
              flex: 1,
              background: '#0f172a',
              padding: '15px',
              borderRadius: '6px',
              overflow: 'auto',
              fontFamily: 'monospace',
              fontSize: '13px',
              color: '#94a3b8',
              whiteSpace: 'pre-wrap',
              lineHeight: '1.4'
            }}>
              {output}
            </div>
            <button
              onClick={handleRunCode}
              disabled={isExecuting}
              style={{
                width: '100%',
                padding: '12px',
                background: isExecuting ? '#6b7280' : (codeExecutor.isLanguageSupported(language) ? '#10b981' : '#ef4444'),
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                marginTop: '15px',
                cursor: isExecuting ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
                opacity: isExecuting ? 0.7 : 1
              }}
            >
              {isExecuting ? '⏳ Executing...' : `▶ Run Code (WASM)`}
            </button>
            <div style={{
              marginTop: '10px',
              fontSize: '11px',
              color: '#64748b',
              textAlign: 'center'
            }}>
              {codeExecutor.isLanguageSupported(language)
                ? (language === 'python'
                    ? `Python via Pyodide ${pyodideStatus === 'loaded' ? '✅' : pyodideStatus === 'loading' ? '⏳' : ''}`
                    : 'JavaScript in browser')
                : `${language} not supported in browser`}
            </div>
          </div>

          <div style={{
            background: '#1e293b',
            borderRadius: '8px',
            padding: '20px',
            border: '1px solid #334155'
          }}>
            <h3 style={{ marginTop: 0 }}>🔗 Room Management</h3>
            
            {/* Role Selection */}
            <div style={{
              display: 'flex',
              gap: '10px',
              marginBottom: '15px'
            }}>
              <button
                onClick={joinAsInterviewer}
                disabled={isInterviewer}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: isInterviewer ? '#1e40af' : '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: isInterviewer ? 'default' : 'pointer',
                  fontSize: '13px',
                  opacity: isInterviewer ? 0.7 : 1
                }}
              >
                {isInterviewer ? '✅ You are Interviewer' : 'Become Interviewer'}
              </button>
              <button
                onClick={joinAsCandidate}
                disabled={!isInterviewer}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: !isInterviewer ? '#7c3aed' : '#8b5cf6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: !isInterviewer ? 'default' : 'pointer',
                  fontSize: '13px',
                  opacity: !isInterviewer ? 0.7 : 1
                }}
              >
                {!isInterviewer ? '✅ You are Candidate' : 'Become Candidate'}
              </button>
            </div>
            
            {/* Link Sharing */}
            <div style={{
              display: 'flex',
              gap: '10px',
              marginBottom: '15px',
              alignItems: 'stretch'
            }}>
              <input
                type="text"
                readOnly
                value={`${window.location.origin}/?room=${roomId}${!isInterviewer ? '&role=candidate' : ''}`}
                style={{
                  flex: '1 1 auto',
                  padding: '10px',
                  background: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '4px',
                  color: 'white',
                  minWidth: '50px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  fontSize: '14px'
                }}
              />
              <button
                onClick={copyRoomLink}
                style={{
                  flex: '0 0 auto',
                  padding: '10px 16px',
                  background: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  whiteSpace: 'nowrap'
                }}
              >
                Copy Link
              </button>
            </div>
            
            {/* Actions */}
            <div style={{
              display: 'flex',
              gap: '10px',
              marginTop: '10px'
            }}>
              <button
                onClick={createNewRoom}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: '#475569',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '13px'
                }}
              >
                🆕 New Room
              </button>
              <button
                onClick={() => window.open(window.location.href, '_blank')}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: '#475569',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '13px'
                }}
              >
                ↗️ New Tab
              </button>
              <button
                onClick={testSync}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: '#dc2626',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '13px'
                }}
              >
                🔄 Test Sync
              </button>
            </div>
            
            {/* Instructions */}
            <div style={{
              marginTop: '15px',
              padding: '12px',
              background: '#0f172a',
              borderRadius: '6px',
              fontSize: '12px',
              color: '#94a3b8',
              lineHeight: '1.5'
            }}>
              <p style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>How to test sync:</p>
              <ol style={{ margin: 0, paddingLeft: '15px' }}>
                <li>Copy link above</li>
                <li>Open in another browser/tab</li>
                <li>Edit code - should sync automatically</li>
                <li>If not, click "🔄 Test Sync" button</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      <footer style={{
        marginTop: '20px',
        padding: '15px',
        background: '#1e293b',
        borderRadius: '8px',
        textAlign: 'center',
        color: '#94a3b8',
        fontSize: '14px',
        border: '1px solid #334155',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          ✅ Frontend | ✅ OpenAPI | ✅ Backend | 🚀 Real-time sync
        </div>
        <div style={{ fontSize: '12px' }}>
          WebSocket: {connectionStatus} | Room: {roomId}
        </div>
      </footer>
    </div>
  );
}

export default App;
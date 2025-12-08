import { useState, useEffect, useRef, useCallback } from 'react';
import socketService from '../services/socket';

const CodeEditor = ({ language, onCodeChange, initialCode }) => {
    const [code, setCode] = useState(initialCode || '// Loading...');
    const [isReceivingUpdate, setIsReceivingUpdate] = useState(false);
    const textareaRef = useRef(null);
    const lastSentCodeRef = useRef('');
    const isInitialMount = useRef(true);

    // Функция для получения стартового кода
    function getDefaultCode(lang) {
        const templates = {
            javascript: `// Welcome to the interview!
// Start coding here...

function hello() {
    console.log("Hello World!");
    return "Done!";
}

// Try running with Ctrl+Enter
hello();`,
            python: `# Welcome to the interview!
# Start coding here...

def hello():
    print("Hello World!");
    return "Done!"

# Try running with Ctrl+Enter
hello()`,
            java: `// Welcome to the interview!
// Start coding here...

public class Main {
    public static void main(String[] args) {
        System.out.println("Hello World!");
    }
}`,
            cpp: `// Welcome to the interview!
// Start coding here...

#include <iostream>
using namespace std;

int main() {
    cout << "Hello World!" << endl;
    return 0;
}`,
            c: `// Welcome to the interview!
// Start coding here...

#include <stdio.h>

int main() {
    printf("Hello World!\\n");
    return 0;
}`
        };
        return templates[language] || templates.javascript;
    }

    // Отправка изменений через WebSocket
    const sendCodeUpdate = useCallback((newCode) => {
        if (!socketService.isConnected()) {
            console.log('WebSocket not connected, skipping sync');
            return;
        }
        
        if (newCode !== lastSentCodeRef.current) {
            console.log('📤 SENDING code update:', newCode.substring(0, 50) + '...');
            lastSentCodeRef.current = newCode;
            socketService.sendCodeChange(newCode);
        }
    }, []);

    // Обработчик изменения кода
    const handleChange = (e) => {
        const newCode = e.target.value;
        setCode(newCode);
        onCodeChange(newCode);
        
        // Немедленная отправка при каждом изменении
        if (!isReceivingUpdate && socketService.isConnected()) {
            sendCodeUpdate(newCode);
        }
    };

    // При смене языка из родительского компонента
    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            const initial = initialCode || getDefaultCode(language);
            setCode(initial);
            lastSentCodeRef.current = initial;
            return;
        }
        
        const newCode = getDefaultCode(language);
        setCode(newCode);
        onCodeChange(newCode);
        lastSentCodeRef.current = newCode;
        
        // Отправляем смену языка
        if (socketService.isConnected()) {
            socketService.changeLanguage(language);
            sendCodeUpdate(newCode);
        }
    }, [language]);

    // Подписка на входящие обновления
    useEffect(() => {
        const handleCodeUpdate = (data) => {
            // Игнорируем свои же сообщения
            const socketId = socketService.getSocket()?.id;
            if (data.senderId === socketId) {
                console.log('Ignoring own update');
                return;
            }
            
            console.log('📥 RECEIVED code update from:', data.senderId?.substring(0, 8));
            if (data.code && data.code !== code) {
                setIsReceivingUpdate(true);
                setCode(data.code);
                onCodeChange(data.code);
                lastSentCodeRef.current = data.code;
                
                setTimeout(() => setIsReceivingUpdate(false), 100);
            }
        };

        const handleLanguageUpdate = (data) => {
            const socketId = socketService.getSocket()?.id;
            if (data.senderId === socketId) {
                console.log('Ignoring own language update');
                return;
            }
            
            console.log('🌐 Language updated from server:', data.language);
            if (data.language !== language) {
                window.dispatchEvent(new CustomEvent('external-language-change', {
                    detail: { language: data.language }
                }));
            }
        };

        const handleRoomState = (data) => {
            console.log('🏠 Received initial room state');
            if (data.code) {
                setCode(data.code);
                onCodeChange(data.code);
                lastSentCodeRef.current = data.code;
            }
        };

        socketService.on('code-update', handleCodeUpdate);
        socketService.on('language-updated', handleLanguageUpdate);
        socketService.on('room-state', handleRoomState);

        return () => {
            socketService.off('code-update', handleCodeUpdate);
            socketService.off('language-updated', handleLanguageUpdate);
            socketService.off('room-state', handleRoomState);
        };
    }, [code, language, onCodeChange]);

    // Горячая клавиша Ctrl+Enter
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                if (socketService.isConnected()) {
                    socketService.requestCodeExecution(code, language);
                }
            }
        };

        const textarea = textareaRef.current;
        if (textarea) {
            textarea.addEventListener('keydown', handleKeyDown);
        }

        return () => {
            if (textarea) {
                textarea.removeEventListener('keydown', handleKeyDown);
            }
        };
    }, [code, language]);

    return (
        <div style={{ 
            width: '100%',
            height: '100%',
            position: 'relative'
        }}>
            <div style={{
                background: '#1a1a1a',
                color: '#888',
                padding: '10px 15px',
                fontSize: '12px',
                borderBottom: '1px solid #333',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <div>
                    <span>📝 {language.toUpperCase()} Editor</span>
                    {isReceivingUpdate && (
                        <span style={{ marginLeft: '10px', color: '#10b981' }}>
                            🔄 Receiving update...
                        </span>
                    )}
                </div>
                <div>
                    <span style={{ 
                        marginRight: '10px',
                        color: socketService.isConnected() ? '#10b981' : '#ef4444'
                    }}>
                        {socketService.isConnected() ? '🟢 Connected' : '🔴 Disconnected'}
                    </span>
                    <span>Press Ctrl+Enter to run</span>
                </div>
            </div>
            <textarea
                ref={textareaRef}
                value={code}
                onChange={handleChange}
                style={{
                    width: '100%',
                    height: 'calc(100% - 40px)',
                    background: isReceivingUpdate ? '#2a2a2a' : '#1e1e1e',
                    color: '#d4d4d4',
                    fontFamily: '"Monaco", "Menlo", "Ubuntu Mono", monospace',
                    fontSize: '14px',
                    lineHeight: '1.5',
                    padding: '20px',
                    border: 'none',
                    resize: 'none',
                    outline: 'none',
                    tabSize: 4
                }}
                spellCheck="false"
                placeholder={`Start writing ${language} code here...`}
            />
        </div>
    );
};

export default CodeEditor;
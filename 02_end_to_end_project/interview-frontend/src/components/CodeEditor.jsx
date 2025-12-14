import { useState, useEffect, useRef, useCallback } from 'react';
import { EditorView, keymap } from '@codemirror/view';
import { EditorState, Compartment } from '@codemirror/state';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { java } from '@codemirror/lang-java';
import { cpp } from '@codemirror/lang-cpp';
import { oneDark } from '@codemirror/theme-one-dark';
import socketService from '../services/socket';

const CodeEditor = ({ language, onCodeChange, initialCode }) => {
    const [code, setCode] = useState(initialCode || '// Loading...');
    const [isReceivingUpdate, setIsReceivingUpdate] = useState(false);
    const editorRef = useRef(null);
    const viewRef = useRef(null);
    const languageCompartment = useRef(new Compartment());
    const lastSentCodeRef = useRef('');
    const isInitialMount = useRef(true);
    const updateFromSocketRef = useRef(false);

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
    print("Hello World!")
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
        return templates[lang] || templates.javascript;
    }

    // Получение языкового расширения для CodeMirror
    const getLanguageExtension = (lang) => {
        const extensions = {
            javascript: javascript(),
            python: python(),
            java: java(),
            cpp: cpp(),
            c: cpp() // C использует тот же парсер что и C++
        };
        return extensions[lang] || javascript();
    };

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

    // Инициализация CodeMirror редактора
    useEffect(() => {
        if (!editorRef.current) return;

        const initialCodeValue = initialCode || getDefaultCode(language);
        
        // Создаем расширение для обработки изменений
        const updateListener = EditorView.updateListener.of((update) => {
            if (update.docChanged && !updateFromSocketRef.current) {
                const newCode = update.state.doc.toString();
                setCode(newCode);
                onCodeChange(newCode);
                
                // Отправляем изменения через WebSocket
                if (socketService.isConnected()) {
                    sendCodeUpdate(newCode);
                }
            }
        });

        // Создаем расширение для Ctrl+Enter
        const runCodeKeymap = keymap.of([
            {
                key: 'Ctrl-Enter',
                mac: 'Cmd-Enter',
                run: () => {
                    const currentCode = viewRef.current?.state.doc.toString() || '';
                    if (socketService.isConnected()) {
                        socketService.requestCodeExecution(currentCode, language);
                    }
                    return true;
                }
            }
        ]);

        // Создаем состояние редактора с Compartment для языка
        const startState = EditorState.create({
            doc: initialCodeValue,
            extensions: [
                languageCompartment.current.of(getLanguageExtension(language)),
                oneDark,
                updateListener,
                runCodeKeymap,
                EditorView.lineWrapping
            ]
        });

        // Создаем view
        const view = new EditorView({
            state: startState,
            parent: editorRef.current
        });

        viewRef.current = view;
        setCode(initialCodeValue);
        lastSentCodeRef.current = initialCodeValue;

        // Cleanup
        return () => {
            view.destroy();
            viewRef.current = null;
        };
    }, []); // Запускаем только один раз при монтировании

    // Обработка смены языка
    useEffect(() => {
        if (!viewRef.current || isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }

        const newCode = getDefaultCode(language);
        
        // Обновляем язык через Compartment
        updateFromSocketRef.current = true;
        viewRef.current.dispatch({
            changes: {
                from: 0,
                to: viewRef.current.state.doc.length,
                insert: newCode
            },
            effects: languageCompartment.current.reconfigure(getLanguageExtension(language))
        });
        
        setTimeout(() => {
            updateFromSocketRef.current = false;
        }, 100);

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
            if (data.code && data.code !== code && viewRef.current) {
                setIsReceivingUpdate(true);
                
                // Обновляем CodeMirror редактор
                updateFromSocketRef.current = true;
                viewRef.current.dispatch({
                    changes: {
                        from: 0,
                        to: viewRef.current.state.doc.length,
                        insert: data.code
                    }
                });
                
                setCode(data.code);
                onCodeChange(data.code);
                lastSentCodeRef.current = data.code;
                
                setTimeout(() => {
                    setIsReceivingUpdate(false);
                    updateFromSocketRef.current = false;
                }, 100);
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
            if (data.code && viewRef.current) {
                updateFromSocketRef.current = true;
                viewRef.current.dispatch({
                    changes: {
                        from: 0,
                        to: viewRef.current.state.doc.length,
                        insert: data.code
                    }
                });
                
                setCode(data.code);
                onCodeChange(data.code);
                lastSentCodeRef.current = data.code;
                
                setTimeout(() => {
                    updateFromSocketRef.current = false;
                }, 100);
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

    return (
        <div style={{ 
            width: '100%',
            height: '100%',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column'
        }}>
            <div style={{
                background: '#1a1a1a',
                color: '#888',
                padding: '10px 15px',
                fontSize: '12px',
                borderBottom: '1px solid #333',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexShrink: 0
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
            <div 
                ref={editorRef}
                style={{
                    flex: 1,
                    overflow: 'auto',
                    background: isReceivingUpdate ? '#2a2a2a' : '#282c34'
                }}
            />
        </div>
    );
};

export default CodeEditor;
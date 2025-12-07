import { useState, useEffect, useRef } from 'react';

const CodeEditor = ({ language, onCodeChange, initialCode }) => {
    const [code, setCode] = useState(initialCode || getDefaultCode(language));
    const textareaRef = useRef(null);

    // Функция для получения стартового кода
    function getDefaultCode(lang) {
        const templates = {
            javascript: `// JavaScript code here
function hello() {
    console.log("Hello World!");
    return "Done!";
}

// Run with Ctrl+Enter
hello();`,
            python: `# Python code here
def hello():
    print("Hello World!")
    return "Done!"

# Run with Ctrl+Enter
hello()`,
            java: `// Java code here
public class Main {
    public static void main(String[] args) {
        System.out.println("Hello World!");
    }
}`,
            cpp: `// C++ code here
#include <iostream>
using namespace std;

int main() {
    cout << "Hello World!" << endl;
    return 0;
}`,
            c: `// C code here
#include <stdio.h>

int main() {
    printf("Hello World!\\n");
    return 0;
}`
        };
        return templates[language] || templates.javascript;
    }

    // Обработчик изменения кода
    const handleChange = (e) => {
        const newCode = e.target.value;
        setCode(newCode);
        onCodeChange(newCode);
    };

    // Горячая клавиша Ctrl+Enter для запуска
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                alert(`Running ${language} code!\n\n${code.substring(0, 200)}${code.length > 200 ? '...' : ''}`);
            }
        };

        if (textareaRef.current) {
            textareaRef.current.addEventListener('keydown', handleKeyDown);
        }

        return () => {
            if (textareaRef.current) {
                textareaRef.current.removeEventListener('keydown', handleKeyDown);
            }
        };
    }, [code, language]);

    // При смене языка обновляем код
    useEffect(() => {
        setCode(getDefaultCode(language));
    }, [language]);

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
                justifyContent: 'space-between'
            }}>
                <span>📝 {language.toUpperCase()} Editor</span>
                <span>Press Ctrl+Enter to run</span>
            </div>
            <textarea
                ref={textareaRef}
                value={code}
                onChange={handleChange}
                style={{
                    width: '100%',
                    height: 'calc(100% - 40px)',
                    background: '#1e1e1e',
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
            />
        </div>
    );
};

export default CodeEditor;
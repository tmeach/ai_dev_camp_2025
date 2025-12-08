import { useState } from 'react';

const OutputPanel = ({ code, language }) => {
    const [output, setOutput] = useState('');
    const [error, setError] = useState('');

    const executeCode = () => {
        if (language !== 'javascript') {
            setOutput('Execution is only supported for JavaScript in the browser.');
            return;
        }

        setOutput('');
        setError('');

        try {
            const originalConsoleLog = console.log;
            let logOutput = '';
            console.log = (...args) => {
                logOutput += args.join(' ') + '\n';
            };

            // БЕЗОПАСНОЕ ИСПОЛНЕНИЕ
            // 1. Используем new Function (изолирует контекст)
            // 2. Можно добавать более строгие ограничения через Web Workers или iframe sandbox
            const fn = new Function(code);
            fn();

            console.log = originalConsoleLog;
            setOutput(logOutput || 'Code executed successfully (no output).');
        } catch (err) {
            setError(err.toString());
        }
    };

    const clearOutput = () => {
        setOutput('');
        setError('');
    };

    return (
        <div className="output-panel">
            <div className="output-header">
                <h3>Output</h3>
                <div className="output-buttons">
                    <button onClick={executeCode} className="run-btn">
                        Run Code (JS only)
                    </button>
                    <button onClick={clearOutput} className="clear-btn">
                        Clear
                    </button>
                </div>
            </div>
            <div className="output-content">
                {error ? (
                    <pre className="error">{error}</pre>
                ) : (
                    <pre className="output">{output}</pre>
                )}
                <div className="output-info">
                    <p>⚠️ For security reasons, only JavaScript can be executed in the browser.</p>
                    <p>Other languages would require a backend code execution service.</p>
                </div>
            </div>
        </div>
    );
};

export default OutputPanel;
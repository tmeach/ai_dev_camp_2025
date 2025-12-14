/**
 * Code Executor Service
 * Executes code in the browser using WASM (Pyodide for Python) and native JS
 */

class CodeExecutor {
    constructor() {
        this.pyodide = null;
        this.pyodideLoading = false;
        this.pyodideLoaded = false;
    }

    /**
     * Load Pyodide (Python WASM runtime)
     */
    async loadPyodide() {
        if (this.pyodideLoaded) {
            return this.pyodide;
        }

        if (this.pyodideLoading) {
            // Wait for existing load to complete
            while (this.pyodideLoading) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            return this.pyodide;
        }

        try {
            this.pyodideLoading = true;
            console.log('🐍 Loading Pyodide...');
            
            // Load Pyodide from CDN
            const pyodideModule = await import('https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js');
            this.pyodide = await pyodideModule.loadPyodide({
                indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/'
            });
            
            // Redirect Python stdout to capture output
            await this.pyodide.runPythonAsync(`
import sys
import io
sys.stdout = io.StringIO()
sys.stderr = io.StringIO()
            `);
            
            this.pyodideLoaded = true;
            console.log('✅ Pyodide loaded successfully');
            return this.pyodide;
        } catch (error) {
            console.error('❌ Failed to load Pyodide:', error);
            throw new Error(`Failed to load Python runtime: ${error.message}`);
        } finally {
            this.pyodideLoading = false;
        }
    }

    /**
     * Execute JavaScript code
     */
    async executeJavaScript(code) {
        const startTime = performance.now();
        let output = '';
        let error = '';
        let success = true;

        try {
            // Create a safe console that captures output
            const logs = [];
            const safeConsole = {
                log: (...args) => logs.push(args.map(arg => 
                    typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
                ).join(' ')),
                error: (...args) => logs.push('ERROR: ' + args.map(arg => 
                    typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
                ).join(' ')),
                warn: (...args) => logs.push('WARNING: ' + args.map(arg => 
                    typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
                ).join(' ')),
                info: (...args) => logs.push('INFO: ' + args.map(arg => 
                    typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
                ).join(' '))
            };

            // Execute code in a function scope with safe console
            const func = new Function('console', code);
            const result = func(safeConsole);
            
            // Capture output
            output = logs.join('\n');
            if (result !== undefined) {
                output += (output ? '\n' : '') + '=> ' + (
                    typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result)
                );
            }
            
            if (!output) {
                output = '(no output)';
            }
        } catch (err) {
            success = false;
            error = err.message;
            output = '';
        }

        const executionTime = Math.round(performance.now() - startTime);

        return {
            output,
            error,
            success,
            executionTime
        };
    }

    /**
     * Execute Python code using Pyodide
     */
    async executePython(code) {
        const startTime = performance.now();
        let output = '';
        let error = '';
        let success = true;

        try {
            // Load Pyodide if not already loaded
            if (!this.pyodideLoaded) {
                await this.loadPyodide();
            }

            // Clear previous output
            await this.pyodide.runPythonAsync(`
import sys
import io
sys.stdout = io.StringIO()
sys.stderr = io.StringIO()
            `);

            // Execute user code
            await this.pyodide.runPythonAsync(code);

            // Get stdout and stderr
            const stdout = await this.pyodide.runPythonAsync('sys.stdout.getvalue()');
            const stderr = await this.pyodide.runPythonAsync('sys.stderr.getvalue()');

            output = stdout || '';
            if (stderr) {
                error = stderr;
                success = false;
            }

            if (!output && !error) {
                output = '(no output)';
            }
        } catch (err) {
            success = false;
            error = err.message;
            output = '';
        }

        const executionTime = Math.round(performance.now() - startTime);

        return {
            output,
            error,
            success,
            executionTime
        };
    }

    /**
     * Execute code based on language
     */
    async execute(code, language) {
        console.log(`🚀 Executing ${language} code...`);

        try {
            let result;

            switch (language.toLowerCase()) {
                case 'javascript':
                    result = await this.executeJavaScript(code);
                    break;

                case 'python':
                    result = await this.executePython(code);
                    break;

                case 'java':
                case 'cpp':
                case 'c':
                    result = {
                        output: '',
                        error: `${language} execution is not supported in browser. Only JavaScript and Python are supported via WASM.`,
                        success: false,
                        executionTime: 0
                    };
                    break;

                default:
                    result = {
                        output: '',
                        error: `Unsupported language: ${language}`,
                        success: false,
                        executionTime: 0
                    };
            }

            console.log(`✅ Execution completed in ${result.executionTime}ms`);
            return result;
        } catch (err) {
            console.error('❌ Execution failed:', err);
            return {
                output: '',
                error: err.message,
                success: false,
                executionTime: 0
            };
        }
    }

    /**
     * Check if Pyodide is loaded
     */
    isPyodideLoaded() {
        return this.pyodideLoaded;
    }

    /**
     * Check if language is supported
     */
    isLanguageSupported(language) {
        return ['javascript', 'python'].includes(language.toLowerCase());
    }
}

// Export singleton instance
const codeExecutor = new CodeExecutor();
export default codeExecutor;
import { useState } from 'react';
import LanguageSelector from './components/LanguageSelector';
import CodeEditor from './components/CodeEditor';
import './App.css';

function App() {
  const [language, setLanguage] = useState('javascript');
  const [code, setCode] = useState('');

  const handleCodeChange = (newCode) => {
    setCode(newCode);
    console.log('Code updated, length:', newCode.length);
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
        border: '1px solid #334155'
      }}>
        <h1 style={{ margin: 0 }}>💻 Online Code Interview</h1>
        <p style={{ margin: '10px 0 0 0', color: '#94a3b8' }}>
          Real-time coding platform for technical interviews
        </p>
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
            borderBottom: '1px solid #334155'
          }}>
            <LanguageSelector 
              selectedLanguage={language}
              onLanguageChange={setLanguage}
            />
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
            border: '1px solid #334155'
          }}>
            <h3 style={{ marginTop: 0 }}>📤 Output</h3>
            <div style={{
              background: '#0f172a',
              padding: '15px',
              borderRadius: '6px',
              height: '200px',
              overflow: 'auto',
              fontFamily: 'monospace',
              fontSize: '14px',
              color: '#94a3b8'
            }}>
              <p>// Output will appear here</p>
              <p>// Click "Run Code" to execute</p>
              <p>// Current language: {language}</p>
              <p>// Code length: {code.length} characters</p>
            </div>
            <button
              onClick={() => {
                if (language === 'javascript') {
                  try {
                    const output = eval(code);
                    alert(`Code executed!\nOutput: ${output}`);
                  } catch (err) {
                    alert(`Error: ${err.message}`);
                  }
                } else {
                  alert(`Can only execute JavaScript in browser\nSelected: ${language}`);
                }
              }}
              style={{
                width: '100%',
                padding: '12px',
                background: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                marginTop: '15px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              ▶ Run Code (JavaScript only)
            </button>
          </div>

          <div style={{
            background: '#1e293b',
            borderRadius: '8px',
            padding: '20px',
            border: '1px solid #334155'
          }}>
            <h3 style={{ marginTop: 0 }}>🔗 Share Interview</h3>
            <div style={{
              display: 'flex',
              gap: '10px',
              marginBottom: '15px',
              alignItems: 'stretch'
            }}>
              <input
                type="text"
                readOnly
                value={`${window.location.origin}/?room=test123`}
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
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  alert('✅ Link copied to clipboard!');
                }}
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
                Copy
              </button>
            </div>
            <p style={{ fontSize: '14px', color: '#94a3b8', margin: 0 }}>
              Share this link with candidate for real-time collaboration
            </p>
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
        border: '1px solid #334155'
      }}>
        <p>✅ Step 1: Frontend UI complete | ⏳ Step 2: Backend coming next</p>
      </footer>
    </div>
  );
}

export default App;
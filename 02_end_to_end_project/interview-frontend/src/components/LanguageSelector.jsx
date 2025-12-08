import { FaJs, FaPython, FaJava, FaCuttlefish } from 'react-icons/fa';
import { SiCplusplus } from 'react-icons/si';

const languages = [
    { id: 'javascript', name: 'JavaScript', icon: <FaJs /> },
    { id: 'python', name: 'Python', icon: <FaPython /> },
    { id: 'java', name: 'Java', icon: <FaJava /> },
    { id: 'c', name: 'C', icon: <FaCuttlefish /> },
    { id: 'cpp', name: 'C++', icon: <SiCplusplus /> },
];

const LanguageSelector = ({ selectedLanguage, onLanguageChange }) => {
    return (
        <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>
                Select Language:
            </label>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {languages.map((lang) => (
                    <button
                        key={lang.id}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px 15px',
                            background: selectedLanguage === lang.id ? '#3b82f6' : '#334155',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '14px'
                        }}
                        onClick={() => onLanguageChange(lang.id)}
                        title={lang.name}
                    >
                        {lang.icon}
                        <span>{lang.name}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default LanguageSelector;
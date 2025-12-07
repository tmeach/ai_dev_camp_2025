import { useState } from 'react';
import { FaCopy, FaLink } from 'react-icons/fa';

const ShareLink = ({ roomId }) => {
    const [copied, setCopied] = useState(false);
    const interviewUrl = `${window.location.origin}/interview/${roomId}`;

    const handleCopy = () => {
        navigator.clipboard.writeText(interviewUrl)
            .then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            })
            .catch(err => {
                console.error('Failed to copy: ', err);
                // Fallback для старых браузеров
                const textArea = document.createElement('textarea');
                textArea.value = interviewUrl;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            });
    };

    return (
        <div className="share-link">
            <FaLink className="link-icon" />
            <input
                type="text"
                value={interviewUrl}
                readOnly
                className="link-input"
            />
            <button onClick={handleCopy} className="copy-btn">
                <FaCopy />
                {copied ? 'Copied!' : 'Copy'}
            </button>
            <p className="link-hint">
                Share this link with your candidate. Anyone with the link can join and edit code in real-time.
            </p>
        </div>
    );
};

export default ShareLink;
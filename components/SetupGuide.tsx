
import React, { useState, useEffect } from 'react';
import Icon from './Icon.tsx';
import { ApiKeys } from '../types.ts';

interface ApiManagerProps {
    sessionId: string;
    apiKeys: ApiKeys | null;
    setApiKeys: (keys: ApiKeys | null) => void;
    keysLoading: boolean;
}

const ApiKeyInput = ({ label, value, onChange, placeholder, type = "password" }) => (
    <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">{label}</label>
        <input
            type={type}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500"
        />
    </div>
);

const SetupGuide: React.FC<ApiManagerProps> = ({ sessionId, apiKeys, setApiKeys, keysLoading }) => {
    const [isOpen, setIsOpen] = useState(true);
    const [pageSpeedKey, setPageSpeedKey] = useState('');
    const [geminiKey, setGeminiKey] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [editMode, setEditMode] = useState(!apiKeys);

    useEffect(() => {
        setEditMode(!apiKeys);
        setPageSpeedKey('');
        setGeminiKey('');
    }, [apiKeys]);
    
    const maskKey = (key?: string) => key ? `************${key.slice(-4)}` : 'Not Set';

    const handleSave = async () => {
        setIsLoading(true);
        setMessage('');
        try {
            const res = await fetch('/api/keys', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId,
                    pageSpeedApiKey: pageSpeedKey || apiKeys?.pageSpeedApiKey,
                    geminiApiKey: geminiKey || apiKeys?.geminiApiKey,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);
            
            setApiKeys({
                pageSpeedApiKey: pageSpeedKey || apiKeys?.pageSpeedApiKey,
                geminiApiKey: geminiKey || apiKeys?.geminiApiKey,
            });
            setMessage('API keys saved successfully for this session.');
            setEditMode(false);
        } catch (error: any) {
            setMessage(`Error: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleClear = async () => {
         if (!window.confirm('Are you sure you want to clear your saved API keys for this session?')) return;
        setIsLoading(true);
        setMessage('');
        try {
            const res = await fetch(`/api/keys?sessionId=${sessionId}`, { method: 'DELETE' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);
            
            setApiKeys(null);
            setMessage('API keys cleared successfully.');
            setEditMode(true);
        } catch (error: any) {
             setMessage(`Error: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-gray-900 rounded-xl border border-gray-800">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex justify-between items-center p-4 text-lg font-semibold text-left text-yellow-300"
                aria-expanded={isOpen}
                aria-controls="api-key-content"
            >
                <span className="flex items-center gap-2"><Icon name="key" className="w-5 h-5"/>API Key Configuration</span>
                <Icon name="chevronDown" className={`w-5 h-5 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            <div
                id="api-key-content"
                className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[2000px]' : 'max-h-0'}`}
            >
                <div className="p-6 border-t border-gray-800 text-gray-400 text-sm space-y-4">
                    <p>
                        You can provide your own API keys to use this tool. Keys are stored securely on the server, associated with your browser session, and are never exposed to the client. Clearing your browser data will remove your keys. If no keys are provided, the app will attempt to use the developer's default keys.
                    </p>

                    {keysLoading ? (
                        <p>Loading API key status...</p>
                    ) : editMode ? (
                        <div className="space-y-4">
                            <ApiKeyInput label="PageSpeed API Key" value={pageSpeedKey} onChange={e => setPageSpeedKey(e.target.value)} placeholder="Enter your Google PageSpeed API Key" />
                            <ApiKeyInput label="Gemini API Key" value={geminiKey} onChange={e => setGeminiKey(e.target.value)} placeholder="Enter your Google Gemini API Key" />
                            <div>
                                <button onClick={handleSave} disabled={isLoading} className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:bg-gray-600">
                                    {isLoading ? 'Saving...' : 'Save Keys for Session'}
                                </button>
                                 {apiKeys && <button onClick={() => setEditMode(false)} className="ml-2 text-gray-400 py-2 px-4 rounded-lg hover:bg-gray-700">Cancel</button>}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3">
                           <div>
                               <p className="font-medium text-gray-300">PageSpeed API Key:</p>
                               <p className="font-mono text-green-400">{maskKey(apiKeys?.pageSpeedApiKey)}</p>
                           </div>
                           <div>
                               <p className="font-medium text-gray-300">Gemini API Key:</p>
                               <p className="font-mono text-green-400">{maskKey(apiKeys?.geminiApiKey)}</p>
                           </div>
                            <div className="flex gap-2 pt-2">
                                <button onClick={() => setEditMode(true)} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                                    Edit Keys
                                </button>
                                <button onClick={handleClear} disabled={isLoading} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:bg-gray-600">
                                    {isLoading ? 'Clearing...' : 'Clear Keys'}
                                </button>
                            </div>
                        </div>
                    )}
                    {message && <p className={`mt-2 ${message.startsWith('Error') ? 'text-red-400' : 'text-green-400'}`}>{message}</p>}
                </div>
            </div>
        </div>
    );
};

export default SetupGuide;

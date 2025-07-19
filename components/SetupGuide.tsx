
import React, { useState } from 'react';
import Icon from './Icon.tsx';

const SetupGuide = () => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="bg-gray-900 rounded-xl border border-gray-800">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex justify-between items-center p-4 text-lg font-semibold text-left text-yellow-300"
                aria-expanded={isOpen}
                aria-controls="setup-guide-content"
            >
                <span>Vercel Deployment & Setup Guide</span>
                <Icon name="chevronDown" className={`w-5 h-5 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            <div
                id="setup-guide-content"
                className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[2000px]' : 'max-h-0'}`}
            >
                <div className="p-6 border-t border-gray-800 text-gray-400 text-sm space-y-6">
                    <div>
                        <h4 className="font-semibold text-gray-300 text-base mb-2">Deploying to Vercel</h4>
                        <p className="mb-3">
                           This application is designed for a secure deployment on Vercel. All sensitive API keys are stored as Environment Variables on Vercel, not in the code or on the client-side.
                        </p>
                        <ol className="list-decimal list-inside space-y-2 mt-1">
                            <li>Fork this repository on GitHub.</li>
                            <li>Go to your <a href="https://vercel.com/new" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Vercel Dashboard</a> and import the forked repository.</li>
                            <li>Vercel will automatically detect it as a Vite project.</li>
                            <li>Before deploying, you must configure the Environment Variables listed below. Go to your Vercel project's <code className="text-xs p-1 bg-gray-700 rounded">Settings {'>'} Environment Variables</code>.</li>
                        </ol>
                    </div>

                    <div>
                         <h4 className="font-semibold text-red-400 text-base mb-2">Required Environment Variables</h4>
                         <p>The application requires the following API keys to function correctly. Please add them to your Vercel project's environment variables.</p>

                         <ol className="list-decimal list-inside space-y-2 mt-3">
                            <li><strong className="text-yellow-300">PAGESPEED_API_KEY</strong>: Your Google PageSpeed Insights API Key. You can get one from the <a href="https://developers.google.com/speed/docs/insights/v5/get-started" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Google Cloud Console</a>. Add it as an environment variable named <code className="text-xs p-1 bg-gray-700 rounded">PAGESPEED_API_KEY</code>.</li>
                            <li><strong className="text-yellow-300">GEMINI_API_KEY</strong>: Your Google Gemini API key. You can get one from <a href="https://ai.google.dev/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Google AI Studio</a>. Add it as an environment variable named <code className="text-xs p-1 bg-gray-700 rounded">GEMINI_API_KEY</code>.</li>
                         </ol>
                    </div>

                    <div className="mt-6 p-4 bg-gray-850 rounded-lg">
                        <p className="font-semibold text-gray-200">After setting all variables, redeploy your application on Vercel for the changes to take effect.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SetupGuide;

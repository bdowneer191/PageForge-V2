import React from 'react';
import Icon from './Icon.tsx';

const Auth = () => {
    // The Client ID is public and intended to be used in the frontend.
    const GITHUB_CLIENT_ID = 'Ov23liORUZydbvvsU5wA';
    // The scope requests read access to user profile data and email.
    const GITHUB_AUTH_URL = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&scope=read:user%20user:email`;

    return (
        <div className="w-full max-w-sm p-8 space-y-6 bg-gray-900 rounded-2xl border border-gray-800 shadow-lg">
             <h2 className="text-2xl font-bold text-center text-white">
                Login or Signup
             </h2>
             <a
                href={GITHUB_AUTH_URL}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 focus:ring-offset-gray-900 transition-colors"
              >
                <Icon name="github" className="w-5 h-5" />
                Continue with GitHub
              </a>
              <div className="text-center text-xs text-gray-500 pt-4 border-t border-gray-800">
                    Prod by
                    <a href="https://github.com/nion-dev" target="_blank" rel="noopener noreferrer" className="font-semibold text-teal-400 hover:text-teal-300 ml-1">
                         Nion
                    </a>
              </div>
        </div>
    );
};

export default Auth;

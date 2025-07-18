
import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth.tsx';

const Auth = () => {
  const [isLoginView, setIsLoginView] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, signup } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const action = isLoginView ? login : signup;
      const data = await action(email, password);
      if (data.error) {
        setError(data.error);
      }
    } catch (err: any) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm p-8 space-y-6 bg-gray-900 rounded-2xl border border-gray-800 shadow-lg">
      <h2 className="text-2xl font-bold text-center text-white">
        {isLoginView ? 'Welcome Back' : 'Create Account'}
      </h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="email" className="text-sm font-medium text-gray-400 sr-only">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label htmlFor="password" className="text-sm font-medium text-gray-400 sr-only">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete={isLoginView ? "current-password" : "new-password"}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        {error && <p className="text-sm text-red-400 text-center">{error}</p>}
        <div>
          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-gray-900 disabled:bg-gray-500 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              isLoginView ? 'Log In' : 'Sign Up'
            )}
          </button>
        </div>
      </form>
      <div className="text-center">
        <button onClick={() => setIsLoginView(!isLoginView)} className="text-sm text-blue-400 hover:underline">
          {isLoginView ? 'Need an account? Sign up' : 'Already have an account? Log in'}
        </button>
      </div>
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

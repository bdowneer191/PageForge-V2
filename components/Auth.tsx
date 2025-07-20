import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth.tsx';
import Icon from './Icon.tsx';

const Auth = () => {
    const { login, signup, signInWithGoogle, signInWithGitHub, error } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoginView, setIsLoginView] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);
    const [isGitHubLoading, setIsGitHubLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        if (isLoginView) {
            await login(email, password);
        } else {
            await signup(email, password);
        }
        setIsLoading(false);
    };
    
    const handleGoogleSignIn = async () => {
        setIsGoogleLoading(true);
        await signInWithGoogle();
        setIsGoogleLoading(false);
    }

    const handleGitHubSignIn = async () => {
        setIsGitHubLoading(true);
        await signInWithGitHub();
        setIsGitHubLoading(false);
    }

    const anyLoading = isLoading || isGoogleLoading || isGitHubLoading;

    return (
        <div className="w-full max-w-sm p-8 space-y-6 bg-gray-900 rounded-2xl border border-gray-800 shadow-lg">
             <div className="text-center">
                <h2 className="text-2xl font-bold text-white">
                    {isLoginView ? 'Welcome Back' : 'Create an Account'}
                </h2>
                <p className="text-sm text-gray-400 mt-1">
                    {isLoginView ? "Sign in to continue" : "Get started with PageForge"}
                </p>
             </div>
            
             <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="email" className="sr-only">Email address</label>
                    <input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-4 py-2 text-white bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Email address"
                    />
                </div>
                <div>
                    <label htmlFor="password" className="sr-only">Password</label>
                    <input
                        id="password"
                        name="password"
                        type="password"
                        autoComplete={isLoginView ? "current-password" : "new-password"}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-4 py-2 text-white bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Password"
                    />
                </div>

                {error && <p className="text-sm text-red-400 text-center">{error}</p>}

                <div>
                    <button
                        type="submit"
                        disabled={anyLoading}
                        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-gray-900 disabled:bg-gray-600 disabled:cursor-wait transition-colors"
                    >
                        {isLoading ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : <Icon name="lock" className="w-5 h-5"/>}
                        {isLoginView ? 'Login' : 'Sign Up'}
                    </button>
                </div>
            </form>

            <div className="relative">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-700" />
                </div>
                <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-gray-900 text-gray-500">Or continue with</span>
                </div>
            </div>
            
             <div className="space-y-3">
                <button
                    onClick={handleGoogleSignIn}
                    disabled={anyLoading}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-gray-600 rounded-lg shadow-sm text-sm font-medium text-white bg-gray-800 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-gray-900 disabled:bg-gray-600 disabled:cursor-wait transition-colors"
                >
                     {isGoogleLoading ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : <Icon name="google" className="w-5 h-5"/>}
                    Sign in with Google
                </button>
                 <button
                    onClick={handleGitHubSignIn}
                    disabled={anyLoading}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-gray-600 rounded-lg shadow-sm text-sm font-medium text-white bg-gray-800 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-gray-900 disabled:bg-gray-600 disabled:cursor-wait transition-colors"
                >
                     {isGitHubLoading ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : <Icon name="github" className="w-5 h-5"/>}
                    Sign in with GitHub
                </button>
            </div>


            <p className="text-sm text-center text-gray-400">
                {isLoginView ? "Don't have an account?" : "Already have an account?"}
                <button onClick={() => setIsLoginView(!isLoginView)} className="font-medium text-blue-400 hover:text-blue-300 ml-1">
                    {isLoginView ? 'Sign Up' : 'Login'}
                </button>
            </p>
        </div>
    );
};

export default Auth;
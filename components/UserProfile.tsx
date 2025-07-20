import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth.tsx';

const UserProfileDropdown = () => {
    const { user, logout } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (!user) return null;

    return (
        <div className="relative" ref={dropdownRef}>
            <button onClick={() => setIsOpen(!isOpen)} className="flex items-center space-x-2">
                <img
                    src={user.photoURL || `https://api.dicebear.com/8.x/initials/svg?seed=${user.email}`}
                    alt="User Avatar"
                    className="w-10 h-10 rounded-full border-2 border-gray-600 hover:border-blue-400 transition"
                />
            </button>
            {isOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-gray-800 rounded-md shadow-lg border border-gray-700 z-10">
                    <div className="p-4 border-b border-gray-700">
                        <p className="text-sm font-semibold text-white truncate">{user.displayName || 'User'}</p>
                        <p className="text-xs text-gray-400 truncate">{user.email}</p>
                    </div>
                    <div className="p-2">
                        <button
                            onClick={logout}
                            className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-900/50 rounded-md"
                        >
                            Logout
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserProfileDropdown;

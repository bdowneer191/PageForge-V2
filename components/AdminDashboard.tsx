
import React from 'react';

interface AdminDashboardProps {
  onBack: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBack }) => {
  return (
    <div className="max-w-7xl mx-auto w-full text-white bg-gray-950 p-4 sm:p-6 lg:p-8 font-sans">
      <header className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-300">Admin Dashboard</h1>
        <button
          onClick={onBack}
          className="text-sm font-semibold py-2 px-4 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors"
        >
          &larr; Back to Main App
        </button>
      </header>
      <main className="bg-gray-900 rounded-xl border border-gray-800 p-6">
        <p className="text-gray-300">Admin dashboard content goes here. You can manage users and view all sessions from here in a future update.</p>
        {/* Future implementation of admin features can be added here */}
      </main>
    </div>
  );
};

export default AdminDashboard;

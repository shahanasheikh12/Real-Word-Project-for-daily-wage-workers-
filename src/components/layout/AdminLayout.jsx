import React from 'react';
import { Outlet, NavLink, Link } from 'react-router-dom';

export default function AdminLayout() {
  const linkClass = ({ isActive }) =>
    `block px-4 py-2 rounded-md transition-colors ${
      isActive ? 'bg-gray-800 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
    }`;

  return (
    <div className="w-screen h-screen flex overflow-hidden bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-[#111827] flex flex-col h-full text-white flex-shrink-0">
        <div className="p-6">
          <Link to="/admin/dashboard" className="text-2xl font-bold tracking-tight">
            Admin Panel
          </Link>
        </div>
        <nav className="flex-1 px-4 space-y-2">
          <NavLink to="/admin/dashboard" className={linkClass}>
            Dashboard
          </NavLink>
          <NavLink to="/admin/jobs" className={linkClass}>
            Jobs
          </NavLink>
          <NavLink to="/admin/users" className={linkClass}>
            Users
          </NavLink>
        </nav>
        <div className="p-4 border-t border-gray-800">
          <Link to="/" className="text-sm text-gray-400 hover:text-white transition-colors">
            &larr; Back to App
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto bg-gray-50 p-8">
        <Outlet />
      </main>
    </div>
  );
}

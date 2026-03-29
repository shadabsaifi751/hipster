import React from 'react';
import { Bell, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import Logo from '../../assets/Logo.png';

export const Header = () => {
  return (
    <header className="flex items-center justify-between px-6 py-3 bg-[#4A3B32] text-white">
      <div className="flex items-center space-x-8">
        <Link to="/" className="text-2xl font-bold tracking-wider">
          <img src={Logo} alt="Logo" className="w-full h-10" />
        </Link>
      </div>
      
      <nav className="hidden md:flex items-center space-x-6 text-sm">
        <Link to="#" className="text-yellow-500 font-semibold border-b-2 border-yellow-500 pb-1">Home</Link>
        <Link to="#" className="text-gray-300 hover:text-white transition">Therapists</Link>
        <Link to="#" className="text-gray-300 hover:text-white transition">Sales</Link>
        <Link to="#" className="text-gray-300 hover:text-white transition">Clients</Link>
        <Link to="#" className="text-gray-300 hover:text-white transition">Transactions</Link>
        <Link to="#" className="text-gray-300 hover:text-white transition">Reports</Link>
      </nav>
      
      <div className="flex items-center space-x-4 shrink-0">
        <button className="p-1 hover:bg-white/10 rounded-full transition cursor-pointer">
          <Bell className="w-5 h-5 text-gray-300" />
        </button>
        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center overflow-hidden border border-white/20 cursor-pointer">
          <User className="w-5 h-5 text-white" />
        </div>
      </div>
    </header>
  );
};

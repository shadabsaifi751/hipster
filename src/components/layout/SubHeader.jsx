import React from 'react';
import { ChevronDown, Search, SlidersHorizontal, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { useBookingStore } from '../../store/useBookingStore';
import { format } from 'date-fns';

export const SubHeader = () => {
  const { currentOutlet, selectedDate, setSelectedDate, searchQuery, setSearchQuery, openSidebar } =
    useBookingStore();

  const handlePrevDay = () => setSelectedDate(new Date(selectedDate.getTime() - 86400000));
  const handleNextDay = () => setSelectedDate(new Date(selectedDate.getTime() + 86400000));

  return (
    <div className="flex flex-wrap items-center justify-between px-4 py-3 bg-white border-b border-gray-200 gap-4 shadow-sm z-10">
      {/* Outlet & Display Mode */}
      <div className="flex flex-col">
        <button className="flex items-center gap-2 font-semibold text-gray-800 text-base cursor-pointer">
          {currentOutlet} <ChevronDown className="w-4 h-4 text-gray-500" />
        </button>
        <span className="text-xs text-gray-500 font-medium cursor-pointer flex items-center gap-1 mt-0.5">
          Display : 15 Min <ChevronDown className="w-3 h-3" />
        </span>
      </div>

      <div className="flex flex-1 items-center justify-center max-w-2xl gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md shadow-sm rounded-lg">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text"
            placeholder="Search Sales by phone/name" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-gray-400"
          />
        </div>
        
        {/* Filter */}
        <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm cursor-pointer">
          Filter <SlidersHorizontal className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      <div className="flex items-center gap-1 bg-gray-50 rounded-lg border border-gray-200 p-1 shrink-0">
        <button
          type="button"
          className="px-3 py-1.5 text-sm font-semibold hover:bg-white hover:shadow-sm rounded transition-all cursor-pointer text-[#4A3B32]"
          onClick={() => openSidebar('create')}
        >
          New booking
        </button>
        <div className="w-px h-4 bg-gray-300 mx-1" />
        <button 
          className="px-3 py-1.5 text-sm font-medium hover:bg-white hover:shadow-sm rounded transition-all cursor-pointer text-gray-700" 
          onClick={() => setSelectedDate(new Date())}
        >
          Today
        </button>
        <div className="w-px h-4 bg-gray-300 mx-1"></div>
        <button className="p-1 hover:bg-gray-200 rounded transition-colors text-gray-500 cursor-pointer" onClick={handlePrevDay}>
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="px-2 text-sm font-semibold min-w-32 text-center text-gray-800">
          {format(selectedDate, 'E, MMM d')}
        </span>
        <button className="p-1 hover:bg-gray-200 rounded transition-colors text-gray-500 cursor-pointer" onClick={handleNextDay}>
          <ChevronRight className="w-4 h-4" />
        </button>
        <div className="w-px h-4 bg-gray-300 mx-1"></div>
        <button className="p-1 hover:bg-gray-200 rounded transition-colors text-gray-500 cursor-pointer">
          <CalendarIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

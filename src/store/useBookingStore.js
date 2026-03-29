import { create } from 'zustand';
import { format, isValid, parseISO } from 'date-fns';
import { DEFAULT_OUTLET_ID } from '../utils/constants';

const CAL_DATE_KEY = 'calendar_selected_date';

function readPersistedSelectedDate() {
  try {
    const raw = sessionStorage.getItem(CAL_DATE_KEY);
    if (!raw) return new Date();
    const d = parseISO(raw);
    return isValid(d) ? d : new Date();
  } catch {
    return new Date();
  }
}

export const useBookingStore = create((set) => ({
  selectedDate: readPersistedSelectedDate(),
  setSelectedDate: (date) => {
    try {
      sessionStorage.setItem(CAL_DATE_KEY, format(date, 'yyyy-MM-dd'));
    } catch {
      /* ignore */
    }
    set({ selectedDate: date });
  },

  isSidebarOpen: false,
  activeBookingId: null,
  activeItemId: null,
  sidebarMode: 'create',

  openSidebar: (mode = 'create', bookingId = null, itemId = null, initialTime = null) =>
    set({
      isSidebarOpen: true,
      sidebarMode: mode,
      activeBookingId: mode === 'create' ? null : bookingId,
      activeItemId: mode === 'create' ? null : itemId,
      selectedSlot: initialTime,
    }),

  closeSidebar: () =>
    set({ isSidebarOpen: false, activeBookingId: null, activeItemId: null, selectedSlot: null }),

  selectedSlot: null,
  setSelectedSlot: (slot) => set({ selectedSlot: slot }),

  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),

  currentOutlet: 'Clarke Quay',
  setCurrentOutlet: (outlet) => set({ currentOutlet: outlet }),

  outletId: DEFAULT_OUTLET_ID,
  setOutletId: (id) => set({ outletId: id }),
}));

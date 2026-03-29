import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { endOfDay, format, startOfDay } from 'date-fns';
import { addYears, subYears } from 'date-fns';
import {
  cancelBookingRequest,
  createBookingForm,
  deleteBookingRequest,
  fetchBookingDetail,
  fetchBookingsList,
  fetchRoomsForOutlet,
  fetchServiceCategories,
  fetchTherapists,
  fetchUsersForSearch,
  updateBookingForm,
  updateBookingStatusRequest,
} from '../api/bookingApi';
import { DEFAULT_OUTLET_ID } from '../utils/constants';
import { formatDateRangeParam } from '../utils/helpers';
import { logAction } from '../utils/logger';

export function useBookingsQuery({ outletId = DEFAULT_OUTLET_ID, selectedDate, enabled = true }) {
  const start = startOfDay(selectedDate);
  const end = endOfDay(selectedDate);

  return useQuery({
    queryKey: ['bookings', outletId, format(selectedDate, 'yyyy-MM-dd')],
    queryFn: () => fetchBookingsList({ outletId, startDate: start, endDate: end }),
    enabled,
    staleTime: 30_000,
  });
}

export function useTherapistsQuery({ outletId = DEFAULT_OUTLET_ID, selectedDate, enabled = true }) {
  return useQuery({
    queryKey: ['therapists', outletId, format(selectedDate, 'yyyy-MM-dd')],
    queryFn: () => fetchTherapists({ outletId, serviceAtDate: selectedDate }),
    enabled,
    staleTime: 60_000,
  });
}

export function useBookingDetailQuery(bookingId, enabled) {
  return useQuery({
    queryKey: ['booking-detail', bookingId],
    queryFn: () => fetchBookingDetail(bookingId),
    enabled: Boolean(bookingId) && enabled,
  });
}

export function useServiceCategoriesQuery({ outletId = DEFAULT_OUTLET_ID, enabled = true }) {
  return useQuery({
    queryKey: ['service-categories', outletId],
    queryFn: () => fetchServiceCategories({ outletId }),
    enabled,
    staleTime: 300_000,
  });
}

export function useRoomsForBookingQuery({ outletId = DEFAULT_OUTLET_ID, date, duration, enabled = true }) {
  return useQuery({
    queryKey: ['rooms', outletId, format(date, 'yyyy-MM-dd'), duration],
    queryFn: () => fetchRoomsForOutlet({ outletId, date, duration }),
    enabled: Boolean(enabled && outletId && date && duration),
  });
}

export function useUsersDirectoryQuery({ enabled = true }) {
  const rangeStart = subYears(new Date(), 2);
  const rangeEnd = addYears(new Date(), 3);
  return useQuery({
    queryKey: ['users-directory'],
    queryFn: () =>
      fetchUsersForSearch({
        dateRange: formatDateRangeParam(rangeStart, rangeEnd),
      }),
    enabled,
    staleTime: 120_000,
  });
}

export function useCreateBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => createBookingForm(payload),
    onSuccess: (data, variables) => {
      logAction('booking.create', { ok: true, payloadKeys: Object.keys(variables || {}) });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
    onError: (err) => {
      logAction('booking.create', { ok: false, message: err?.message });
    },
  });
}

export function useUpdateBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => updateBookingForm(id, payload),
    onSuccess: (data, variables) => {
      logAction('booking.update', { id: variables?.id, ok: true });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['booking-detail', variables?.id] });
    },
    onError: (err) => {
      logAction('booking.update', { ok: false, message: err?.message });
    },
  });
}

export function useCancelBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ bookingId, type }) => cancelBookingRequest({ bookingId, type }),
    onSuccess: (data, variables) => {
      logAction('booking.cancel', { id: variables?.bookingId, type: variables?.type });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['booking-detail', variables?.bookingId] });
    },
    onError: (err) => {
      logAction('booking.cancel', { ok: false, message: err?.message });
    },
  });
}

export function useDeleteBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => deleteBookingRequest(id),
    onSuccess: (data, id) => {
      logAction('booking.delete', { id });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.removeQueries({ queryKey: ['booking-detail', id] });
    },
    onError: (err) => {
      logAction('booking.delete', { ok: false, message: err?.message });
    },
  });
}

export function useUpdateBookingStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ bookingId, status }) => updateBookingStatusRequest({ bookingId, status }),
    onSuccess: (data, variables) => {
      logAction('booking.status', { id: variables?.bookingId, status: variables?.status });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['booking-detail', variables?.bookingId] });
    },
    onError: (err) => {
      logAction('booking.status', { ok: false, message: err?.message });
    },
  });
}

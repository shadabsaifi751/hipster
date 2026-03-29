import { axiosInstance } from './axios';
import {
  DEFAULT_COMPANY_ID,
  DEFAULT_OUTLET_ID,
  LOGIN_EMAIL,
  LOGIN_KEY_PASS,
  LOGIN_PASSWORD,
  OUTLET_TYPE,
} from '../utils/constants';
import { format } from 'date-fns';
import { formatDateRangeParam, formatServiceAtForTherapists } from '../utils/helpers';

function unwrapPayload(root) {
  return root?.data?.data ?? root?.data ?? root;
}

function extractBookingsArray(root) {
  const payload = unwrapPayload(root);
  if (Array.isArray(payload)) return payload;
  const fromList = payload?.list?.bookings;
  if (Array.isArray(fromList)) return fromList;
  if (Array.isArray(payload?.bookings)) return payload.bookings;
  const nested = payload?.data?.bookings ?? payload?.data?.list?.bookings;
  if (Array.isArray(nested)) return nested;
  return [];
}

export async function loginWithDefaults() {
  const body = new FormData();
  body.append('email', LOGIN_EMAIL);
  body.append('password', LOGIN_PASSWORD);
  body.append('key_pass', LOGIN_KEY_PASS);
  const { data } = await axiosInstance.post('/login', body);
  const inner = unwrapPayload(data);
  const token = inner?.token?.token;
  if (!token) {
    throw new Error('Login response missing token');
  }
  localStorage.setItem('auth_token', token);
  if (inner?.user) {
    localStorage.setItem('auth_user', JSON.stringify(inner.user));
  }
  return { token, user: inner?.user };
}

export async function fetchBookingsList({ outletId, startDate, endDate }) {
  const daterange = formatDateRangeParam(startDate, endDate);
  const { data } = await axiosInstance.get('/bookings/outlet/booking/list', {
    params: {
      pagination: 0,
      daterange,
      outlet: outletId ?? DEFAULT_OUTLET_ID,
      panel: 'outlet',
      view_type: 'calendar',
    },
  });
  return extractBookingsArray(data);
}

export async function fetchBookingDetail(bookingId) {
  const { data } = await axiosInstance.get(`/bookings/booking-details/${bookingId}`);
  const payload = unwrapPayload(data);
  const list = payload?.booking?.bookings;
  if (Array.isArray(list) && list[0]) return list[0];
  return payload ?? data;
}

export async function fetchTherapists({ outletId, serviceAtDate }) {
  const service_at = formatServiceAtForTherapists(serviceAtDate);
  const { data } = await axiosInstance.get('/therapists', {
    params: {
      availability: 1,
      outlet: outletId ?? DEFAULT_OUTLET_ID,
      service_at,
      services: 1,
      status: 1,
      pagination: 0,
      panel: 'outlet',
      outlet_type: OUTLET_TYPE,
      leave: 0,
    },
  });
  const payload = unwrapPayload(data);
  return payload?.list?.staffs ?? [];
}

export async function fetchUsersForSearch({ page = 1, dateRange }) {
  const { data } = await axiosInstance.get('/users', {
    params: {
      pagination: page,
      daterange: dateRange,
    },
  });
  const payload = unwrapPayload(data);
  return payload?.list?.users ?? [];
}

export async function fetchServiceCategories({ outletId }) {
  const { data } = await axiosInstance.get('/service-category', {
    params: {
      outlet_type: OUTLET_TYPE,
      outlet: outletId ?? DEFAULT_OUTLET_ID,
      pagination: 0,
      panel: 'outlet',
    },
  });
  const payload = unwrapPayload(data);
  return payload?.list?.category ?? [];
}

export async function fetchRoomsForOutlet({ outletId, date, duration }) {
  const dateStr = format(date, 'dd-MM-yyyy');
  const { data } = await axiosInstance.get(`/room-bookings/outlet/${outletId ?? DEFAULT_OUTLET_ID}`, {
    params: {
      date: dateStr,
      panel: 'outlet',
      duration: String(duration),
    },
  });
  const payload = unwrapPayload(data);
  if (Array.isArray(payload)) return payload;
  return Array.isArray(payload?.data) ? payload.data : [];
}

export async function createBookingForm(payload) {
  const body = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    body.append(key, value);
  });
  const { data } = await axiosInstance.post('/bookings/create', body);
  return data;
}

export async function updateBookingForm(bookingId, payload) {
  const body = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    body.append(key, value);
  });
  const { data } = await axiosInstance.post(`/bookings/${bookingId}`, body);
  return data;
}

export async function cancelBookingRequest({ bookingId, type = 'normal' }) {
  const body = new FormData();
  body.append('company', String(DEFAULT_COMPANY_ID));
  body.append('id', String(bookingId));
  body.append('type', type);
  body.append('panel', 'outlet');
  const { data } = await axiosInstance.post('/bookings/item/cancel', body);
  return data;
}

export async function deleteBookingRequest(bookingId) {
  const { data } = await axiosInstance.delete(`/bookings/destroy/${bookingId}`);
  return data;
}

export async function updateBookingStatusRequest({ bookingId, status }) {
  const body = new FormData();
  body.append('company', String(DEFAULT_COMPANY_ID));
  body.append('id', String(bookingId));
  body.append('status', status);
  body.append('panel', 'outlet');
  body.append('outlet_type', OUTLET_TYPE);
  const { data } = await axiosInstance.post('/bookings/update/payment-status', body);
  return data;
}

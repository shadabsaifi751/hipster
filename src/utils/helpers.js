import { format, isValid, parse, parseISO } from 'date-fns';
import { UI_STATUS } from './constants';

export function formatDateRangeParam(startDate, endDate) {
  const a = format(startDate, 'dd-MM-yyyy');
  const b = format(endDate, 'dd-MM-yyyy');
  return `${a} / ${b}`;
}

export function formatServiceAtForTherapists(date) {
  return format(date, 'dd-MM-yyyy HH:mm:ss');
}

export function mapBookingStatusToUi(apiStatus) {
  const s = String(apiStatus || '').toLowerCase();
  if (s.includes('cancel')) return UI_STATUS.CANCELLED;
  if (s.includes('progress') || s.includes('check-in')) return UI_STATUS.IN_PROGRESS;
  if (s.includes('complete')) return UI_STATUS.COMPLETED;
  if (s.includes('confirm')) return UI_STATUS.CONFIRMED;
  if (s.includes('no-show')) return UI_STATUS.CANCELLED;
  return UI_STATUS.CONFIRMED;
}

export function parseTimeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const parts = String(timeStr).trim().split(':');
  const h = Number(parts[0]);
  const m = Number(parts[1] || 0);
  if (Number.isNaN(h)) return 0;
  return h * 60 + (Number.isNaN(m) ? 0 : m);
}

export function rowIndexToTimeString(rowIndex, startHour) {
  const total = startHour * 60 + rowIndex * 15;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
}

export function addMinutesToTimeString(timeStr, minutes) {
  const base = parseTimeToMinutes(timeStr);
  const total = base + Number(minutes || 0);
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
}

export function addMinutesToHHmm(timeHHmm, minutes) {
  const base = parseTimeToMinutes(timeHHmm);
  const total = base + Number(minutes || 0);
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function formatServiceAtForCreate(date, timeHHmm) {
  return `${format(date, 'dd-MM-yyyy')} ${timeHHmm}`;
}

export function getStoredAuthUser() {
  try {
    return JSON.parse(localStorage.getItem('auth_user') || 'null');
  } catch {
    return null;
  }
}

export function combineServiceDateTime(serviceDateStr, timeStr) {
  if (!timeStr) return null;
  const tRaw = String(timeStr).trim();
  const hasAmPm = /\b(AM|PM)\b/i.test(tRaw);
  const t = tRaw.length <= 5 && !hasAmPm ? `${tRaw}:00` : tRaw;

  if (serviceDateStr) {
    const ds = String(serviceDateStr).trim();
    const combined = `${ds} ${t}`;
    const patterns = [
      'dd-MM-yyyy HH:mm:ss',
      'dd-MM-yyyy HH:mm',
      'dd-MM-yyyy hh:mm:ss a',
      'dd-MM-yyyy h:mm:ss a',
      'dd-MM-yyyy hh:mm a',
      'dd-MM-yyyy h:mm a',
      'yyyy-MM-dd HH:mm:ss',
      'yyyy-MM-dd hh:mm:ss a',
      'yyyy-MM-dd HH:mm',
      'dd/MM/yyyy HH:mm:ss',
      'dd/MM/yyyy hh:mm:ss a',
    ];
    for (const p of patterns) {
      try {
        const d = parse(combined, p, new Date());
        if (isValid(d)) return d;
      } catch {
        /* try next */
      }
    }
  }
  return null;
}

export function getItemStartDateTime(item, booking) {
  if (item?.service_at) {
    const raw = String(item.service_at).trim().replace('T', ' ');
    const attempts = ['yyyy-MM-dd HH:mm:ss', 'yyyy-MM-dd HH:mm:ss.SSS', 'dd-MM-yyyy HH:mm:ss'];
    for (const p of attempts) {
      try {
        const d = parse(raw, p, new Date());
        if (isValid(d)) return d;
      } catch {
        /* continue */
      }
    }
    try {
      const iso = parseISO(String(item.service_at));
      if (isValid(iso)) return iso;
    } catch {
      /* ignore */
    }
  }
  return (
    combineServiceDateTime(booking?.service_date, item?.start_time) ||
    combineServiceDateTime(booking?.service_date, booking?.service_time)
  );
}

export function flattenBookingItems(booking) {
  const bag = booking?.booking_item;
  if (!bag || typeof bag !== 'object') return [];
  const rows = [];
  for (const group of Object.values(bag)) {
    if (!Array.isArray(group)) continue;
    for (const item of group) {
      rows.push({
        item,
        booking,
      });
    }
  }
  return rows;
}

export function bookingMatchesSelectedDay(booking, selectedDate) {
  const dayKey = format(selectedDate, 'yyyy-MM-dd');
  if (booking?.service_date) {
    const raw = String(booking.service_date).trim();
    for (const fmt of ['dd-MM-yyyy', 'yyyy-MM-dd', 'dd/MM/yyyy']) {
      const d = parse(raw, fmt, new Date());
      if (isValid(d) && format(d, 'yyyy-MM-dd') === dayKey) return true;
    }
  }
  const rows = flattenBookingItems(booking);
  for (const { item, booking: b } of rows) {
    const dt = getItemStartDateTime(item, b);
    if (dt && format(dt, 'yyyy-MM-dd') === dayKey) return true;
  }
  return false;
}

export function buildTherapistColumnMap(therapists) {
  const map = new Map();
  (therapists || []).forEach((t, index) => {
    const id = t.therapist_id ?? t.id;
    if (id != null) map.set(Number(id), index);
  });
  return map;
}

export function therapistDisplayName(t) {
  const alias = t.alias || t.name || t.therapist || '';
  const last = t.lastname || '';
  return `${alias}${last ? ` ${last}` : ''}`.trim() || `Staff ${t.id}`;
}

export function filterBookingsForViewport(items, {
  colStart,
  colEnd,
  rowStart,
  rowEnd,
}) {
  return items.filter((b) => {
    const c = b.therapistIndex;
    if (c < colStart || c > colEnd) return false;
    const rs = b.rowStart;
    const re = b.rowEnd;
    return re >= rowStart && rs <= rowEnd;
  });
}

export function applyRescheduleToBookings(bookings, bookingId, itemId, patch) {
  return (bookings || []).map((b) => {
    if (b.id !== bookingId) return b;
    const nextItems = {};
    const bag = b.booking_item || {};
    for (const [groupKey, group] of Object.entries(bag)) {
      if (!Array.isArray(group)) {
        nextItems[groupKey] = group;
        continue;
      }
      nextItems[groupKey] = group.map((it) => {
        if (it.id !== itemId) return it;
        return {
          ...it,
          ...patch,
        };
      });
    }
    return { ...b, booking_item: nextItems };
  });
}

export function buildCalendarModel(bookings, therapists, startHour) {
  const cols = Array.isArray(therapists) ? [...therapists] : [];
  const map = buildTherapistColumnMap(cols);

  const blocks = [];

  const ensureColumn = (tid, fallbackName) => {
    const id = Number(tid);
    if (map.has(id)) return map.get(id);
    const idx = cols.length;
    map.set(id, idx);
    cols.push({
      id,
      therapist_id: id,
      alias: fallbackName || `T${id}`,
      gender: 'female',
    });
    return idx;
  };

  for (const booking of bookings || []) {
    const rows = flattenBookingItems(booking);
    for (const { item, booking: b } of rows) {
      const therapistIndex = ensureColumn(item.therapist_id, item.therapist);
      const start = getItemStartDateTime(item, b);
      if (!start) continue;
      const hours = start.getHours();
      const minutes = start.getMinutes();
      let rowStart = (hours - startHour) * 4 + Math.floor(minutes / 15);
      if (rowStart < 0) rowStart = 0;
      const durationSlots = Math.max(1, Math.ceil((item.duration || 60) / 15));
      const rowEnd = rowStart + durationSlots - 1;

      blocks.push({
        key: `${b.id}-${item.id}`,
        bookingId: b.id,
        itemId: item.id,
        therapistIndex,
        therapistId: item.therapist_id,
        rowStart,
        rowEnd,
        time: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`,
        duration: item.duration || 60,
        service: item.service || 'Service',
        clientName: b.customer_name || item.customer_name || '',
        clientPhone: b.mobile_number || '',
        status: mapBookingStatusToUi(b.status),
        rawBooking: b,
        rawItem: item,
      });
    }
  }

  return { columnTherapists: cols, blocks };
}

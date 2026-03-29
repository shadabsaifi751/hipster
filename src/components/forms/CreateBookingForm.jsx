import React, { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { UserPlus } from 'lucide-react';
import { useBookingStore } from '../../store/useBookingStore';
import {
  useCreateBooking,
  useRoomsForBookingQuery,
  useServiceCategoriesQuery,
  useTherapistsQuery,
  useUsersDirectoryQuery,
} from '../../hooks/useBookings';
import { useDebounce } from '../../hooks/useDebounce';
import {
  addMinutesToHHmm,
  formatServiceAtForCreate,
  getStoredAuthUser,
  therapistDisplayName,
} from '../../utils/helpers';
import {
  DEFAULT_COMPANY_ID,
  DEFAULT_OUTLET_ID,
  OUTLET_TYPE,
} from '../../utils/constants';

function flattenServices(categories) {
  if (!Array.isArray(categories)) return [];
  return categories.flatMap((cat) =>
    (cat.services || []).map((s) => ({
      ...s,
      categoryName: cat.name,
    })),
  );
}

export function CreateBookingForm({ onClose }) {
  const selectedDate = useBookingStore((s) => s.selectedDate);
  const currentOutlet = useBookingStore((s) => s.currentOutlet);
  const outletId = useBookingStore((s) => s.outletId) ?? DEFAULT_OUTLET_ID;
  const closeSidebar = useBookingStore((s) => s.closeSidebar);

  const [clientQuery, setClientQuery] = useState('');
  const debouncedClient = useDebounce(clientQuery, 300);
  const [selectedClient, setSelectedClient] = useState(null);
  const [manualCustomerId, setManualCustomerId] = useState('');
  const [manualCustomerName, setManualCustomerName] = useState('');
  const [showManualId, setShowManualId] = useState(false);

  const [serviceId, setServiceId] = useState('');
  const [therapistId, setTherapistId] = useState('');
  const [roomKey, setRoomKey] = useState('');
  const [startTime, setStartTime] = useState('09:30');
  const [source, setSource] = useState('Walk-in');
  const [note, setNote] = useState('');
  const [formError, setFormError] = useState('');

  const categoriesQuery = useServiceCategoriesQuery({ outletId, enabled: true });
  const services = useMemo(() => flattenServices(categoriesQuery.data), [categoriesQuery.data]);

  const selectedService = useMemo(
    () => services.find((s) => String(s.id) === String(serviceId)),
    [services, serviceId],
  );

  const durationNum = selectedService ? Number(selectedService.duration) || 60 : 60;

  const therapistsQuery = useTherapistsQuery({ outletId, selectedDate, enabled: true });
  const roomsQuery = useRoomsForBookingQuery({
    outletId,
    date: selectedDate,
    duration: durationNum,
    enabled: Boolean(selectedService),
  });

  const usersQuery = useUsersDirectoryQuery({ enabled: true });

  const filteredClients = useMemo(() => {
    const list = usersQuery.data || [];
    const q = debouncedClient.trim().toLowerCase();
    if (q.length < 1) return [];
    return list.filter((u) => {
      const name = `${u.name || ''} ${u.lastname || ''}`.trim().toLowerCase();
      const phone = String(u.contact_number || '').toLowerCase();
      return name.includes(q) || phone.includes(q);
    }).slice(0, 25);
  }, [usersQuery.data, debouncedClient]);

  useEffect(() => {
    if (services.length && !serviceId) {
      const first = services.find((s) => s.status === 1) || services[0];
      if (first) setServiceId(String(first.id));
    }
  }, [services, serviceId]);

  useEffect(() => {
    const staffs = therapistsQuery.data || [];
    if (staffs.length && !therapistId) {
      const t = staffs[0];
      setTherapistId(String(t.therapist_id ?? t.id));
    }
  }, [therapistsQuery.data, therapistId]);

  useEffect(() => {
    const rooms = roomsQuery.data || [];
    if (!rooms.length) {
      setRoomKey('');
      return;
    }
    const r = rooms[0];
    const item = r.items?.[0];
    if (item) setRoomKey(`${r.room_id}:${item.item_id}`);
  }, [roomsQuery.data, selectedService?.id]);

  const createMutation = useCreateBooking();

  const resolveRoomSegment = () => {
    const rooms = roomsQuery.data || [];
    const [rid, iid] = String(roomKey).split(':');
    const room = rooms.find((x) => String(x.room_id) === String(rid));
    const item = room?.items?.find((it) => String(it.item_id) === String(iid)) || room?.items?.[0];
    if (!room || !item) return null;
    const st = startTime.length === 5 ? startTime : startTime.slice(0, 5);
    const et = addMinutesToHHmm(st, durationNum);
    return {
      room_id: item.item_id,
      item_type: item.item || 'single-bed',
      meta_service: null,
      start_time: st,
      end_time: et,
      duration: durationNum,
      priority: 1,
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    const authUser = getStoredAuthUser();
    const createdBy = authUser?.id;
    if (!createdBy) {
      setFormError('Missing logged-in user. Sign out and reload to log in again.');
      return;
    }

    const customerId = selectedClient?.id ?? Number(manualCustomerId);
    if (!customerId || Number.isNaN(customerId)) {
      setFormError('Select a client from search or enter a customer ID.');
      return;
    }

    const customerName = selectedClient
      ? `${selectedClient.name || ''} ${selectedClient.lastname || ''}`.trim() || 'Guest'
      : manualCustomerName.trim() || 'Guest';

    if (!selectedService || !therapistId) {
      setFormError('Choose a service and therapist.');
      return;
    }

    const roomSegment = resolveRoomSegment();
    if (!roomSegment) {
      setFormError('No room available for this duration. Try another service or time.');
      return;
    }

    const st = startTime.length === 5 ? startTime : startTime.slice(0, 5);
    const et = addMinutesToHHmm(st, durationNum);

    const itemPayload = {
      service: selectedService.id,
      start_time: st,
      end_time: et,
      duration: durationNum,
      therapist: Number(therapistId),
      requested_person: 0,
      price: String(selectedService.price),
      quantity: '1',
      service_request: '',
      commission: null,
      customer_name: customerName,
      primary: 1,
      item_number: 1,
      room_segments: [roomSegment],
    };

    const payload = {
      company: String(DEFAULT_COMPANY_ID),
      outlet: String(outletId),
      outlet_type: String(OUTLET_TYPE),
      booking_type: '1',
      customer: String(customerId),
      created_by: String(createdBy),
      items: JSON.stringify([itemPayload]),
      currency: 'SGD',
      source,
      payment_type: 'payatstore',
      service_at: formatServiceAtForCreate(selectedDate, st),
      note: note.trim(),
      membership: '0',
      panel: 'outlet',
      type: 'manual',
    };

    try {
      await createMutation.mutateAsync(payload);
      closeSidebar();
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.errors ||
        err?.message ||
        'Could not create booking';
      setFormError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <div className="flex items-center text-sm">
          <span className="w-20 text-gray-400">Outlet</span>
          <span className="font-semibold text-gray-800">{currentOutlet}</span>
        </div>
        <div className="flex items-center border border-gray-200 rounded divide-x divide-gray-200">
          <div className="w-1/2 p-2.5 flex gap-2">
            <span className="text-gray-400 italic">On</span>
            <span className="font-semibold text-gray-800">{format(selectedDate, 'E, MMM d')}</span>
          </div>
          <div className="w-1/2 p-2.5 flex gap-2 items-center">
            <span className="text-gray-400 italic shrink-0">At</span>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="font-semibold text-gray-800 bg-transparent border-none outline-none min-w-0 flex-1"
              aria-label="Start time"
            />
          </div>
        </div>
      </div>

      {formError ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">{formError}</div>
      ) : null}

      <div className="space-y-1">
        <label className="text-xs font-semibold text-gray-600">Client</label>
        <div className="relative">
          <input
            type="text"
            value={clientQuery}
            onChange={(e) => {
              setClientQuery(e.target.value);
              setSelectedClient(null);
            }}
            placeholder="Search by name or phone"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            autoComplete="off"
            aria-label="Search client"
          />
          <button
            type="button"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-gray-100 text-gray-500"
            aria-label="Enter customer ID manually"
            title="Enter customer ID"
            onClick={() => {
              setShowManualId((v) => !v);
              setSelectedClient(null);
            }}
          >
            <UserPlus className="w-4 h-4" />
          </button>
          {filteredClients.length > 0 && !selectedClient ? (
            <ul
              className="absolute z-30 mt-1 max-h-44 w-full overflow-auto rounded-md border border-gray-200 bg-white shadow-lg text-sm"
              role="listbox"
            >
              {filteredClients.map((u) => (
                <li key={u.id}>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left hover:bg-[#4A3B32] hover:text-white"
                    onClick={() => {
                      setSelectedClient(u);
                      setClientQuery(
                        `${u.name || ''} ${u.lastname || ''}`.trim() + (u.contact_number ? ` · ${u.contact_number}` : ''),
                      );
                    }}
                  >
                    <span className="font-semibold block">
                      {`${u.name || ''} ${u.lastname || ''}`.trim() || `User #${u.id}`}
                    </span>
                    <span className="text-xs opacity-80">{u.contact_number || ''}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        {selectedClient ? (
          <p className="text-xs text-green-700">Customer ID: {selectedClient.id}</p>
        ) : null}

        {showManualId ? (
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div>
              <label className="text-[10px] uppercase text-gray-500">Customer ID</label>
              <input
                type="number"
                value={manualCustomerId}
                onChange={(e) => setManualCustomerId(e.target.value)}
                placeholder="e.g. 980"
                className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase text-gray-500">Name on booking</label>
              <input
                type="text"
                value={manualCustomerName}
                onChange={(e) => setManualCustomerName(e.target.value)}
                placeholder="Guest name"
                className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm"
              />
            </div>
          </div>
        ) : null}
      </div>

      <div className="space-y-1">
        <label className="text-xs font-semibold text-gray-600">Service</label>
        <select
          value={serviceId}
          onChange={(e) => {
            setServiceId(e.target.value);
            setRoomKey('');
          }}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">Select service</option>
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} · {s.duration} min · ${s.price}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-semibold text-gray-600">Therapist</label>
        <select
          value={therapistId}
          onChange={(e) => setTherapistId(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">Select therapist</option>
          {(therapistsQuery.data || []).map((t) => {
            const id = t.therapist_id ?? t.id;
            const g = String(t.gender || '').toLowerCase();
            return (
              <option key={id} value={id}>
                {therapistDisplayName(t)} ({g === 'male' ? 'Male' : 'Female'}) · {id}
              </option>
            );
          })}
        </select>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-semibold text-gray-600">Room</label>
        <select
          value={roomKey}
          onChange={(e) => setRoomKey(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
          disabled={roomsQuery.isLoading}
        >
          <option value="">Select room</option>
          {(roomsQuery.data || []).flatMap((room) =>
            (room.items || []).map((item) => (
              <option key={`${room.room_id}-${item.item_id}`} value={`${room.room_id}:${item.item_id}`}>
                {room.room_name} — {item.item_name}
              </option>
            )),
          )}
        </select>
        {roomsQuery.isLoading ? <p className="text-[10px] text-gray-400">Loading rooms…</p> : null}
      </div>

      <div className="space-y-1">
        <label className="text-xs font-semibold text-gray-600">Source</label>
        <select
          value={source}
          onChange={(e) => setSource(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
        >
          <option value="Walk-in">Walk-in</option>
          <option value="By Phone">By Phone</option>
          <option value="WhatsApp">WhatsApp</option>
        </select>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-semibold text-gray-600">Notes (optional)</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
          placeholder="Allergies, preferences…"
        />
      </div>

      <div className="flex flex-col gap-2 pt-2 border-t border-gray-100">
        <button
          type="submit"
          disabled={createMutation.isPending}
          className="w-full py-3 bg-[#4A3B32] text-white font-bold rounded shadow-md hover:bg-[#3A2E2B] transition-colors text-sm disabled:opacity-60"
        >
          {createMutation.isPending ? 'Creating…' : 'Create booking'}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 border border-gray-300 text-gray-800 font-semibold rounded text-sm hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

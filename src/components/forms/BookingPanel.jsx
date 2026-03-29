import React, { useMemo, useState } from 'react';
import { Trash2, Info } from 'lucide-react';
import { format } from 'date-fns';
import { useBookingStore } from '../../store/useBookingStore';
import {
  useBookingDetailQuery,
  useCancelBooking,
  useDeleteBooking,
  useUpdateBookingStatus,
} from '../../hooks/useBookings';
import { Modal } from '../common/Modal';
import { CreateBookingForm } from './CreateBookingForm';
import { mapBookingStatusToUi } from '../../utils/helpers';
import { FEMALE_COLOR, MALE_COLOR } from '../../utils/constants';

function flattenItems(booking) {
  const bag = booking?.booking_item;
  if (!bag || typeof bag !== 'object') return [];
  return Object.values(bag).flat();
}

export function BookingPanel() {
  const {
    isSidebarOpen,
    closeSidebar,
    selectedDate,
    currentOutlet,
    sidebarMode,
    activeBookingId,
    openSidebar,
  } = useBookingStore();

  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelType, setCancelType] = useState('normal');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [formError, setFormError] = useState('');

  const detailQuery = useBookingDetailQuery(
    activeBookingId,
    Boolean(isSidebarOpen && activeBookingId && sidebarMode !== 'create'),
  );
  const booking = detailQuery.data;
  const items = useMemo(() => flattenItems(booking), [booking]);

  const cancelMutation = useCancelBooking();
  const deleteMutation = useDeleteBooking();
  const statusMutation = useUpdateBookingStatus();

  if (!isSidebarOpen) return null;

  const title =
    sidebarMode === 'create' ? 'New Booking' : sidebarMode === 'edit' ? 'Update Booking' : 'Appointment';

  const handleCancelNext = async () => {
    setFormError('');
    try {
      await cancelMutation.mutateAsync({ bookingId: activeBookingId, type: cancelType });
      setCancelOpen(false);
      closeSidebar();
    } catch (e) {
      setFormError(e?.response?.data?.message || e?.message || 'Cancel failed');
    }
  };

  const handleDelete = async () => {
    setFormError('');
    try {
      await deleteMutation.mutateAsync(activeBookingId);
      setDeleteOpen(false);
      closeSidebar();
    } catch (e) {
      setFormError(e?.response?.data?.message || e?.message || 'Delete failed');
    }
  };

  const handleStatus = async (status) => {
    setFormError('');
    try {
      await statusMutation.mutateAsync({ bookingId: activeBookingId, status });
    } catch (e) {
      setFormError(e?.response?.data?.message || e?.message || 'Update failed');
    }
  };

  const uiStatus = mapBookingStatusToUi(booking?.status);

  return (
    <>
      <aside
        className="w-[min(420px,100vw)] shrink-0 bg-white border-l border-gray-200 flex flex-col shadow-xl z-20 h-full text-sm"
        aria-label="Booking panel"
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-800">{title}</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={closeSidebar}
              className="px-4 py-1.5 font-medium text-gray-600 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-6">
            {formError ? (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
                {formError}
              </div>
            ) : null}

            {sidebarMode === 'create' ? (
              <CreateBookingForm onClose={closeSidebar} />
            ) : detailQuery.isLoading ? (
              <div className="text-sm text-gray-500">Loading booking…</div>
            ) : detailQuery.isError ? (
              <div className="text-sm text-red-700">Unable to load booking details.</div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Status</div>
                    <div className="mt-1 inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-800">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{
                          backgroundColor:
                            uiStatus === 'confirmed'
                              ? '#38bdf8'
                              : uiStatus === 'inProgress'
                                ? '#f472b6'
                                : uiStatus === 'cancelled'
                                  ? '#94a3b8'
                                  : '#34d399',
                        }}
                      />
                      {booking?.status || '—'}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-end">
                    {booking?.status === 'Confirmed' ? (
                      <button
                        type="button"
                        onClick={() => handleStatus('Check-in (In Progress)')}
                        disabled={statusMutation.isPending}
                        className="rounded-md bg-[#4A3B32] px-3 py-2 text-xs font-bold text-white hover:bg-[#3A2E2B] disabled:opacity-60"
                      >
                        Check-in
                      </button>
                    ) : null}
                    {String(booking?.status || '').includes('Progress') ? (
                      <button
                        type="button"
                        onClick={() => handleStatus('Completed')}
                        disabled={statusMutation.isPending}
                        className="rounded-md bg-[#4A3B32] px-3 py-2 text-xs font-bold text-white hover:bg-[#3A2E2B] disabled:opacity-60"
                      >
                        Checkout
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center text-sm">
                    <span className="w-20 text-gray-400">Outlet</span>
                    <span className="font-semibold text-gray-800">{booking?.outlet?.[0]?.name || currentOutlet}</span>
                  </div>
                  <div className="flex items-center border border-gray-200 rounded divide-x divide-gray-200">
                    <div className="w-1/2 p-2.5 flex gap-2">
                      <span className="text-gray-400 italic">On</span>
                      <span className="font-semibold text-gray-800">{format(selectedDate, 'E, MMM d')}</span>
                    </div>
                    <div className="w-1/2 p-2.5 flex gap-2">
                      <span className="text-gray-400 italic">At</span>
                      <span className="font-semibold text-gray-800">{booking?.service_time || '—'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 pb-4 border-b border-gray-100">
                  <div
                    className="w-10 h-10 rounded-full text-white flex items-center justify-center font-bold"
                    style={{ backgroundColor: '#fb923c' }}
                    aria-hidden
                  >
                    {(booking?.user?.name || 'C').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-800 text-base">
                      {booking?.user?.contact_number || ''} {booking?.user?.name || booking?.customer_name || ''}
                    </h3>
                    <p className="text-xs text-gray-500">Client record</p>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <p className="text-xs text-gray-500">
                        <span className="italic">Phone:</span>{' '}
                        <span className="font-semibold text-gray-700">{booking?.user?.contact_number || '—'}</span>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Services</div>
                  {items.length === 0 ? (
                    <div className="text-sm text-gray-500">No line items.</div>
                  ) : (
                    items.map((it) => {
                      const gender = String(it?.gender || '').toLowerCase();
                      const badge = gender === 'male' ? MALE_COLOR : FEMALE_COLOR;
                      return (
                        <div key={it.id} className="rounded-lg border border-gray-200 p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="font-bold text-gray-900">{it.service}</div>
                            <button type="button" className="text-gray-400 hover:text-red-500" aria-label="Remove service">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="mt-2 space-y-2 pl-2 border-l-2 border-gray-100">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="text-gray-400 italic">With:</span>
                                <span
                                  className="text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold text-white"
                                  style={{ backgroundColor: badge }}
                                >
                                  {String(it.therapist_id || '').slice(-2) || 'T'}
                                </span>
                                <span className="font-semibold">{it.therapist}</span>
                              </div>
                              <label className="flex items-center gap-1 text-xs text-gray-600 font-medium">
                                <input type="checkbox" defaultChecked={Boolean(it.requested_person)} readOnly />
                                ⭐ Requested <Info className="w-3 h-3 text-gray-400" />
                              </label>
                            </div>
                            <div className="flex flex-wrap gap-6">
                              <div className="flex items-center gap-2">
                                <span className="text-gray-400 italic">For:</span>
                                <span className="font-semibold">{it.duration} min</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-gray-400 italic">At:</span>
                                <span className="font-semibold">{it.start_time}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 pt-1">
                              <span className="text-gray-400 italic">Using:</span>
                              <span className="font-semibold">{it.room_name || it.room_items?.[0]?.room_name || '—'}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {booking?.note ? (
                  <div className="rounded-md border border-amber-200 bg-[#FEF9C3] px-3 py-2 text-xs text-gray-900">
                    <div className="font-semibold text-gray-800 mb-1">Notes</div>
                    {booking.note}
                  </div>
                ) : null}

                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setCancelOpen(true)}
                    className="rounded-md border border-[#4A3B32] bg-white px-3 py-2 text-xs font-bold text-[#4A3B32] hover:bg-gray-50"
                  >
                    Cancel booking
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteOpen(true)}
                    className="rounded-md border border-red-200 bg-white px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </aside>

      {cancelOpen ? (
        <Modal
          title="Cancel / Delete Booking"
          onClose={() => setCancelOpen(false)}
          footer={
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800"
                onClick={() => setCancelOpen(false)}
              >
                Back
              </button>
              <button
                type="button"
                className="rounded-md bg-[#4A3B32] px-4 py-2 text-sm font-bold text-white"
                onClick={handleCancelNext}
                disabled={cancelMutation.isPending}
              >
                Next
              </button>
            </div>
          }
        >
          <p className="mb-3 text-sm text-gray-700">Please select the cancellation type.</p>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="cancelType"
                checked={cancelType === 'normal'}
                onChange={() => setCancelType('normal')}
              />
              Normal cancellation
            </label>
            <label className="flex items-center gap-2 text-sm opacity-60">
              <input type="radio" name="cancelType" disabled />
              No show
            </label>
          </div>
        </Modal>
      ) : null}

      {deleteOpen ? (
        <Modal
          title="Delete booking"
          onClose={() => setDeleteOpen(false)}
          footer={
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800"
                onClick={() => setDeleteOpen(false)}
              >
                Close
              </button>
              <button
                type="button"
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-bold text-white"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
              >
                Delete
              </button>
            </div>
          }
        >
          This removes the booking from the schedule. Continue?
        </Modal>
      ) : null}
    </>
  );
}


import {
  useCancelBooking,
  useCreateBooking,
  useDeleteBooking,
  useUpdateBooking,
} from './useBookings';
import { useBookingStore } from '../store/useBookingStore';

export function useBookingActions() {
  const createMutation = useCreateBooking();
  const updateMutation = useUpdateBooking();
  const cancelMutation = useCancelBooking();
  const deleteMutation = useDeleteBooking();
  const closeSidebar = useBookingStore((s) => s.closeSidebar);

  const handleCreate = async (payload) => {
    await createMutation.mutateAsync(payload);
    closeSidebar();
  };

  const handleUpdate = async (id, payload) => {
    await updateMutation.mutateAsync({ id, payload });
    closeSidebar();
  };

  const handleCancel = async (bookingId, type = 'normal') => {
    await cancelMutation.mutateAsync({ bookingId, type });
    closeSidebar();
  };

  const handleDelete = async (id) => {
    await deleteMutation.mutateAsync(id);
    closeSidebar();
  };

  return {
    handleCreate,
    handleUpdate,
    handleCancel,
    handleDelete,
    isSubmitting:
      createMutation.isPending ||
      updateMutation.isPending ||
      deleteMutation.isPending ||
      cancelMutation.isPending,
    createMutation,
    updateMutation,
    cancelMutation,
    deleteMutation,
  };
}

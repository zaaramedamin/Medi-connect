import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

/**
 * Live appointment updates over Supabase Realtime.
 *
 * When any appointment the current user can see changes (a new booking, a
 * cancellation, a completion), refresh the cached appointment lists and slot
 * grids so the doctor's calendar and the patient's dashboard update without a
 * manual reload — and two patients can't unknowingly race the same slot.
 *
 * RLS applies to realtime, so this only fires for rows the user is allowed to
 * see. Requires seed/realtime.sql (adds appointments to the realtime publication).
 */
export function useRealtimeAppointments() {
  const queryClient = useQueryClient();
  const user = useAuthStore(s => s.user);

  useEffect(() => {
    if (!user) return;

    const refresh = () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['slots'] });
    };

    const channel = supabase
      .channel('appointments-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, refresh)
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [user, queryClient]);
}

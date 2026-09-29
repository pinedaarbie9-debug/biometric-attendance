import { supabase } from '../lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Generic helper para mag-subscribe sa kahit anong table.
 *
 * FIXED: dati, kapag walang channelName na binigay, gumagawa ng random
 * suffix — pero ang mga caller (subscribeToAttendance, subscribeToNotifications)
 * ay nag-o-override nito ng FIXED string ('attendance-live', etc.), na
 * pwedeng mag-conflict kung dalawang subscription (hal. dalawang employee,
 * o admin +studentview) ang buhay nang sabay sa parehong tab.
 * Ngayon, laging unique ang default channel name kahit walang override.
 */
export function subscribeToTable(
  table: string,
  filter: string | undefined,
  onChange: (payload: any) => void,
  channelName?: string
): RealtimeChannel {
  const name =
    channelName ??
    `${table}${filter ? `-${filter}` : ''}-${Math.random().toString(36).slice(2)}`;

  const channel = supabase
    .channel(name)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table,
        ...(filter ? { filter } : {}),
      },
      onChange
    )
    .subscribe();

  return channel;
}

export function unsubscribe(channel: RealtimeChannel | null | undefined) {
  if (channel) {
    supabase.removeChannel(channel);
  }
}
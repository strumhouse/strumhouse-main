import type {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
} from '@supabase/supabase-js';
import { supabase } from './supabase';

type SubscriptionConfig = {
  event: '*' | 'INSERT' | 'UPDATE' | 'DELETE';
  schema: string;
  table?: string;
  filter?: string;
};

type CleanupFn = () => void;

/**
 * Lightweight registry that keeps websocket subscriptions in sync with the
 * authenticated Supabase session. Consumers can call `subscribe` after auth is
 * ready and always receive a cleanup function for unmount.
 */
class RealtimeClient {
  private channels = new Map<string, RealtimeChannel>();

  subscribe(
    key: string,
    config: SubscriptionConfig,
    callback: (payload: RealtimePostgresChangesPayload<any>) => void
  ): CleanupFn {
    // ensure duplicate subscriptions for the same key don't leak sockets
    this.unsubscribe(key);

    const channel = supabase
      .channel(key)
      .on('postgres_changes' as any, config as any, callback as any)
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error(`Realtime channel ${key} failed to open`, status);
        }
      });

    this.channels.set(key, channel);
    return () => this.unsubscribe(key);
  }

  unsubscribe(key: string) {
    const channel = this.channels.get(key);
    if (channel) {
      supabase.removeChannel(channel);
      this.channels.delete(key);
    }
  }

  unsubscribeAll() {
    this.channels.forEach((channel, key) => {
      supabase.removeChannel(channel);
      this.channels.delete(key);
    });
  }
}

export const realtimeClient = new RealtimeClient();

"use client";

import { useState, useEffect } from "react";
import { fetchMessages, supabase } from "@/lib/supabaseClient";
import { markRoomAsSeen } from "@/lib/supabaseClient";


interface UseMessagesProps {
  onNewMessage?: () => void;
}

export function useMessages(roomId: string | null | undefined, userId: string | null | undefined) {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roomId) {
      setLoading(false);
      return;
    }

    // Initial fetch
    fetchMessages(roomId)
      .then(setMessages)
      .finally(() => setLoading(false));

    // Subscribe to real-time changes
    const channel = supabase
      .channel(`messages:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${roomId}`
        },
        async (payload) => {
          // Fetch the full message with sender info
          const { data } = await supabase
            .from('messages')
            .select('*,sender(*)')
            .eq('id', payload.new.id)
            .single();
          
          if (data) {
            setMessages(prev => [...prev, data]);

            if (roomId && userId) {
                markRoomAsSeen(roomId, userId);
              }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${roomId}`
        },
        async (payload) => {
          // The bug was here. The UPDATE payload doesn't contain the nested
          // sender info, so we must re-fetch the message to get it.
          const { data } = await supabase
            .from('messages')
            .select('*,sender(*)') // <-- This gets the full sender object
            .eq('id', payload.new.id)
            .single();

          if (data) {
            // Find the message in the state and replace it with the full new data
            setMessages(prev =>
              prev.map(msg => (msg.id === data.id ? data : msg))
            );
          }
        }
      )
      .subscribe();

    // Cleanup subscription
    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, userId]);

  const refetch = () => {
    if (roomId) {
      fetchMessages(roomId).then(setMessages);
    }
  };

  return { messages, loading, refetch };
}
"use client";

import { useState, useEffect } from "react";
import { fetchMessages, supabase } from "@/lib/supabaseClient";

interface UseMessagesProps {
  onNewMessage?: () => void;
}

export function useMessages(roomId: string | null | undefined) {
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
          }
        }
      )
      .subscribe();

    // Cleanup subscription
    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  const refetch = () => {
    if (roomId) {
      fetchMessages(roomId).then(setMessages);
    }
  };

  return { messages, loading, refetch };
}
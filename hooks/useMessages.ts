"use client";

import { useState, useEffect } from "react";
import { fetchMessages } from "@/lib/supabaseClient";

export function useMessages(roomId: string | null | undefined) {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refetchKey, setRefetchKey] = useState(0);

  useEffect(() => {
    if (!roomId) {
      setLoading(false);
      return;
    }

    fetchMessages(roomId)
      .then(setMessages)
      .finally(() => setLoading(false));
  }, [roomId, refetchKey]);

  const refetch = () => setRefetchKey(prev => prev + 1);

  return { messages, loading, refetch };
}


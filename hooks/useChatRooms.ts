"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchUserRooms } from "@/lib/supabaseClient";

export function useChatRooms(userId: string | null | undefined) {
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    fetchUserRooms(userId)
      .then(setRooms)
      .finally(() => setLoading(false));
  }, [userId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { rooms, loading, refetch, setRooms };
}
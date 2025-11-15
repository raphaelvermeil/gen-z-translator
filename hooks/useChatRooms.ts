"use client";

import { useState, useEffect } from "react";
import { fetchUserRooms } from "@/lib/supabaseClient";

export function useChatRooms(userId: string | null | undefined) {
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    fetchUserRooms(userId)
      .then(setRooms)
      .finally(() => setLoading(false));
  }, [userId]);

  return { rooms, loading };
}


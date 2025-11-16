import { useState, useEffect } from 'react';
import { useChatRooms } from '@/hooks/useChatRooms';
import { useSupabaseUser } from '@/hooks/useSupabaseUser';

import { fetchAllUsers, createChatRoom, supabase, markRoomAsSeen } from '@/lib/supabaseClient';

interface ChatRoomListProps {
  onSelect: (roomId: string) => void;
  selectedId: string | null;
}

export default function ChatRoomList({ onSelect, selectedId }: ChatRoomListProps) {
  const { user } = useSupabaseUser();
  const { rooms, loading, refetch, setRooms } = useChatRooms(user?.id);
  const [showNewChat, setShowNewChat] = useState(false);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    if (showNewChat) {
      setLoadingUsers(true);
      fetchAllUsers().then((users) => {
        // Filter out current user
        const filtered = users.filter((u: any) => u.id !== user?.id);
        setAllUsers(filtered);
        setLoadingUsers(false);
      });
    }
  }, [showNewChat, user]);

  // Listen to all message inserts to update room order
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('all-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
            if (payload.new.room_id !== selectedId) {
                console.log('New message for a *different* room. Refetching.', payload);
                // Small delay to ensure the message is fully committed
                setTimeout(() => {
                  refetch();
                }, 100);
              } else {
                // New message for the *current* room.
                // DO NOT refetch. The useMessages hook is handling it.
                console.log('New message for current room. Ignoring refetch.', payload);
              }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, refetch, selectedId]);

  const handleCreateRoom = async (otherUserId: string) => {
    if (!user) return;
    await createChatRoom(user.id, otherUserId);
    setShowNewChat(false);
    refetch();
  };

  const handleRoomSelect = (room: any) => {
    if (user?.id) {
      // Call the DB update in the background (fire-and-forget)
      markRoomAsSeen(room.id, user.id);

      // Update the local state *immediately*
      setRooms(prevRooms => 
        prevRooms.map(r => {
          if (r.id === room.id) {
            // Find out which profile key to update
            const myProfileKey = user.id === r.profile_1.id 
              ? 'profile_1_last_seen_at' 
              : 'profile_2_last_seen_at';
            
            // Return a new room object with the updated timestamp
            return {
              ...r,
              [myProfileKey]: new Date().toISOString()
            };
          }
          return r; // Return all other rooms unchanged
        })
      );
    }
    
    // Tell the parent page to select the room
    onSelect(room.id);
  };
  const getOtherUser = (room: any) => {
    if (!user) return null;
    return room.profile_1.id === user.id ? room.profile_2 : room.profile_1;
  }
  
  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-5 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-900">Conversations</h2>
          <button
            onClick={() => setShowNewChat(!showNewChat)}
            className="button-hover px-3 py-1.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg text-sm font-semibold shadow-md hover:shadow-lg hover:from-blue-600 hover:to-blue-700"
          >
            {showNewChat ? '✕ Cancel' : '+ New'}
          </button>
        </div>
      </div>

      {/* New chat section */}
      {showNewChat && (
        <div className="px-5 py-4 border-b border-slate-200 bg-blue-50">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">Select a user:</h3>
          {loadingUsers ? (
            <div className="text-sm text-slate-600 py-4 text-center">Loading users...</div>
          ) : (() => {
              const availableUsers = allUsers.filter((u: any) => 
                !rooms.some((r: any) => 
                  r.profile_1.id === u.id || r.profile_2.id === u.id
                )
              );
              
              return availableUsers.length === 0 ? (
                <div className="text-sm text-slate-600 py-4 text-center">No available users</div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {availableUsers.map((u: any) => (
                    <div
                      key={u.id}
                      onClick={() => handleCreateRoom(u.id)}
                      className="room-item-hover p-3 bg-white rounded-lg cursor-pointer border border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-slate-900 text-sm font-medium"
                    >
                      <div className="flex items-center justify-between">
                        <span>{u.username}</span>
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                          {u.persona_type}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()
          }
        </div>
      )}

     <div className="flex-1 overflow-y-auto">
        <div className="p-3 space-y-2">
        {loading  && rooms.length===0? (
          <div className="text-center text-slate-600 py-8">Loading conversations...</div>
        ) : rooms.length === 0 ? (
          <div className="text-center text-slate-600 py-12">
              <div className="text-3xl mb-2">🔍</div>
              <p className="text-sm">No conversations yet</p>
            </div>
        ) : (
          rooms.map((room) => {
            
            const myLastSeen = (user?.id === room.profile_1.id)
            ? room.profile_1_last_seen_at
            : room.profile_2_last_seen_at;
          
          const hasNewMessage = new Date(room.latest_message_time) > new Date(myLastSeen || 0);

            return (
            <div
                key={room.id}
                onClick={() => handleRoomSelect(room)} // *** USE NEW HANDLER ***
                className={`relative room-item-hover p-4 rounded-xl cursor-pointer transition-all border-2 ${
                  selectedId === room.id
                    ? 'bg-gradient-to-r from-blue-50 to-blue-100 border-blue-400 shadow-md'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* --- UNREAD MARKER --- */}
                {hasNewMessage && selectedId !== room.id && (
                  <div className="absolute top-3 right-3 w-3 h-3 bg-blue-500 rounded-full" />
                )}
                {/* --------------------- */}

                <div className="font-semibold text-slate-900">
                  {getOtherUser(room)?.username}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
    </div>
  );
}
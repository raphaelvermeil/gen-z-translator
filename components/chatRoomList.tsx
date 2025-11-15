import { useState, useEffect } from 'react';
import { useChatRooms } from '@/hooks/useChatRooms';
import { useSupabaseUser } from '@/hooks/useSupabaseUser';
import { fetchAllUsers, createChatRoom } from '@/lib/supabaseClient';

interface ChatRoomListProps {
  onSelect: (roomId: string) => void;
  selectedId: string | null;
}

export default function ChatRoomList({ onSelect, selectedId }: ChatRoomListProps) {
  const { user } = useSupabaseUser();
  const { rooms, loading } = useChatRooms(user?.id);
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

  const handleCreateRoom = async (otherUserId: string) => {
    if (!user) return;
    await createChatRoom(user.id, otherUserId);
    setShowNewChat(false);
    window.location.reload();
  };
  
  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-black">Chat Rooms</h2>
        <button
          onClick={() => setShowNewChat(!showNewChat)}
          className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
        >
          {showNewChat ? 'Cancel' : '+ New'}
        </button>
      </div>

      {showNewChat && (
        <div className="mb-4 p-3 bg-gray-100 rounded">
          <h3 className="text-sm font-medium mb-2 text-black">Select a user:</h3>
          {loadingUsers ? (
            <div className="text-sm text-gray-600">Loading...</div>
          ) : (() => {
              const availableUsers = allUsers.filter((u: any) => 
                !rooms.some((r: any) => 
                  r.profile_1.id === u.id || r.profile_2.id === u.id
                )
              );
              
              return availableUsers.length === 0 ? (
                <div className="text-sm text-gray-600">No available users</div>
              ) : (
                <div className="space-y-1 max-h-60 overflow-y-auto">
                  {availableUsers.map((u: any) => (
                    <div
                      key={u.id}
                      onClick={() => handleCreateRoom(u.id)}
                      className="p-2 bg-white rounded cursor-pointer hover:bg-blue-50 text-black text-sm"
                    >
                      {u.username} ({u.persona_type})
                    </div>
                  ))}
                </div>
              );
            })()
          }
        </div>
      )}

      <div className="space-y-2">
        {loading ? (
          <div className="text-center text-black">Loading...</div>
        ) : rooms.length === 0 ? (
          <div className="text-center text-black">No rooms found</div>
        ) : (
          rooms.map((room: any) => (
            <div
              key={room.id}
              onClick={() => onSelect(room.id)}
              className={`p-4 border rounded cursor-pointer text-black ${
                selectedId === room.id ? 'bg-blue-100' : 'bg-white'
              }`}
            >
              {room.profile_1.username} & {room.profile_2.username}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
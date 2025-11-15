"use client";

import { useState } from 'react';
import ChatRoomList from '@/components/chatRoomList';
import { supabase, sendMessage } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { useSupabaseUser } from '@/hooks/useSupabaseUser';
import { useMessages } from '@/hooks/useMessages';
import { LogOut } from 'lucide-react';

export default function DiscussionsPage() {
  const router = useRouter();
  const { user, loading } = useSupabaseUser();
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const { messages, loading: loadingMessages } = useMessages(selectedRoom);
  const [input, setInput] = useState('');

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      router.push('/login');
    } catch (error) {
      console.error('Error logging out:', error);
      alert('Failed to log out');
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !selectedRoom || !user) return;
    
    await sendMessage(selectedRoom, input, user.id);
    setInput('');
    // No need to refetch - real-time subscription will handle it
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with logout button */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Discussions</h1>
            <p className="text-sm text-gray-500 mt-1" suppressHydrationWarning>
              {loading ? 'Loading...' : user?.email || 'Guest'}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex h-[calc(100vh-88px)]">
        {/* Rooms sidebar */}
        <div className="w-80 border-r overflow-y-auto">
          <ChatRoomList onSelect={setSelectedRoom} selectedId={selectedRoom} />
        </div>

        {/* Messages */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 p-4 overflow-y-auto">
            {!selectedRoom ? (
              <div className="text-center text-gray-500 mt-8">Select a room</div>
            ) : loadingMessages ? (
              <div className="text-center text-gray-500 mt-8">Loading...</div>
            ) : messages.length === 0 ? (
              <div className="text-center text-gray-500 mt-8">No messages</div>
            ) : (
              <div className="space-y-3">
                {messages.map((msg: any) => (
                  <div key={msg.id} className="bg-white p-3 rounded shadow-sm">
                    <div className="text-sm text-gray-600">{msg.sender.username}</div>
                    <div className="mt-1">{msg.original_text}</div>
                    {msg.translated_text && (
                      <div className="mt-1 text-sm text-gray-600 italic">{msg.translated_text}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Message input */}
          {selectedRoom && (
            <div className="p-4 border-t bg-white">
              <div className="flex gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Type a message..."
                  className="flex-1 px-3 py-2 border rounded text-black"
                />
                <button
                  onClick={handleSend}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Send
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
"use client";

import { useState,useRef, useEffect } from 'react';
import ChatRoomList from '@/components/chatRoomList';
import { supabase, sendMessage, getProfile } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { useSupabaseUser } from '@/hooks/useSupabaseUser';
import { useMessages } from '@/hooks/useMessages';
import { LogOut } from 'lucide-react';
import { get } from 'http';

type Profile = {
  id?: string;
  username?: string;
  persona_type?: string;
  created_at?: string;
};

export default function DiscussionsPage() {
  const router = useRouter();
  const { user, loading } = useSupabaseUser();
  const [currentProfile, setCurrentProfile] = useState<Profile[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const { messages, loading: loadingMessages } = useMessages(selectedRoom, user?.id);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const fetchProfile = async () => {
      if (user?.id) {
        const profile = await getProfile(user.id);
        setCurrentProfile(profile || []);
      }
    };
    fetchProfile();
  }, [user?.id]);
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
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
    
    // Part A: Send message immediately - appears instantly in chat
    // SECURITY: Only sending room ID, text, and user ID
    // The API securely fetches all other data from the database
    await sendMessage(selectedRoom, input, user.id);
    
    setInput('');
    // Part B happens automatically in sendMessage - translation will appear 1-2 seconds later
    // Real-time subscription will update the UI when translation is ready
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header with logout button */}
      <header className="bg-white shadow-md border-b border-slate-200">
        <div className="container mx-auto px-4 py-5 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Discussions with {currentProfile[0]?.persona_type == 'gen-z' ? 'Boomers':'Gen Zs' }
            </h1>
            <p className="text-sm text-slate-500 mt-1" suppressHydrationWarning>
              {loading ? 'Loading...' : user?.email || 'Guest'}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="button-hover flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl hover:from-red-600 hover:to-red-700 active:from-red-700 active:to-red-800"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex h-[calc(100vh-92px)] gap-0">
        {/* Rooms sidebar */}
        <div className="w-80 bg-white border-r border-slate-200 overflow-y-auto shadow-sm">
          <ChatRoomList onSelect={setSelectedRoom} selectedId={selectedRoom} />
        </div>

        {/* Messages */}
        <div className="flex-1 flex flex-col bg-slate-50">
          <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col">
            {!selectedRoom ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="text-6xl mb-4">💬</div>
                  <p className="text-lg text-slate-500 font-medium">Select a conversation to start</p>
                </div>
              </div>
            ) : loadingMessages ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="animate-spin mb-3">⏳</div>
                  <p className="text-slate-500">Loading messages...</p>
                </div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="text-5xl mb-3">👋</div>
                  <p className="text-slate-500">No messages yet. Start the conversation!</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4 flex flex-col">
                {messages.map((msg: any) => {
                  const isCurrentUser = msg.sender.id === user?.id;
                  const hasTranslated = msg.translated_text && msg.translated_text !== msg.original_text;
                  return (
                    <div
                      key={msg.id}
                      className={`message-enter flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${
                          isCurrentUser
                            ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-md'
                            : 'bg-white text-slate-900 shadow-sm border border-slate-200'
                        }`}
                      >
                        {!isCurrentUser && (
                          <div className="text-xs font-semibold text-slate-500 mb-1">
                            {msg.sender.username}
                          </div>
                        )}
                        {hasTranslated ? (
                          <>
                            <div className="text-sm leading-relaxed">{msg.translated_text}</div>
                            <div
                              className={`mt-2 pt-2 border-t ${
                                isCurrentUser
                                  ? 'border-blue-400 text-blue-100'
                                  : 'border-slate-200 text-slate-500'
                              } text-xs italic`}
                            >
                              original: {msg.original_text}
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="text-sm leading-relaxed">{msg.original_text}</div>
                            {!msg.translated_text && (
                              <div
                                className={`mt-2 pt-2 border-t ${
                                  isCurrentUser
                                    ? 'border-blue-400 text-blue-100'
                                    : 'border-slate-200 text-slate-500'
                                } text-xs italic`}
                              >
                                <span className="animate-pulse">Translating...</span>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
          
          {/* Message input */}
          {selectedRoom && (
            <div className="px-6 py-5 border-t border-slate-200 bg-white shadow-lg">
              <div className="flex gap-3">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Type a message..."
                  className="input-focus flex-1 px-4 py-3 border border-slate-300 rounded-full text-slate-900 placeholder-slate-400 shadow-sm focus:shadow-md"
                />
                <button
                  onClick={handleSend}
                  className="button-hover px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-full font-semibold shadow-md hover:shadow-lg hover:from-blue-600 hover:to-blue-700 active:from-blue-700 active:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!input.trim()}
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
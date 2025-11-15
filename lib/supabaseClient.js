import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)




export async function fetchUserRooms(userId) {
    try {
        console.log('Fetching user rooms for user: in supabaseClient.js', userId);
        
        // First get the rooms
        const { data: rooms, error } = await supabase
            .from('chat_rooms')
            .select('*, profile_1(*), profile_2(*), profile_1_last_seen_at, profile_2_last_seen_at')
            .or(`profile_1.eq.${userId},profile_2.eq.${userId}`);
        
        if (error) {
            console.error('Error fetching user rooms:', error);
            return [];
        }

        if (!rooms || rooms.length === 0) {
            return [];
        }

        // Get the latest message for each room
        const roomsWithLatestMessage = await Promise.all(
            rooms.map(async (room) => {
                const { data: latestMessage, error: msgError } = await supabase
                    .from('messages')
                    .select('created_at')
                    .eq('room_id', room.id)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();
                
                return {
                    ...room,
                    latest_message_time: latestMessage?.created_at || room.created_at
                };
            })
        );

        // Sort by latest message time (newest first)
        roomsWithLatestMessage.sort((a, b) => 
            new Date(b.latest_message_time).getTime() - new Date(a.latest_message_time).getTime()
        );
        
        console.log('Sorted rooms by latest message:', roomsWithLatestMessage.map(r => ({
            id: r.id,
            users: `${r.profile_1.username} & ${r.profile_2.username}`,
            latest: r.latest_message_time
        })));
        
        return roomsWithLatestMessage;
    } catch (error) {
        console.error('Error fetching user rooms:', error);
        return [];
    }
}


export async function fetchMessages(roomId) {
    try {
        const { data, error } = await supabase
            .from('messages')
            .select('*,sender(*)')
            .eq('room_id', roomId)
            .order('created_at', { ascending: true });
        
        if (error) {
            console.error('Error fetching messages:', error);
            return [];
        }
        
        return data || [];
    } catch (error) {
        console.error('Error fetching messages:', error);
        return [];
    }
}


export async function sendMessage(roomId, originalText, sender) {
    try {
        const { data, error } = await supabase
            .from('messages')
            .insert({ 
                room_id: roomId, 
                original_text: originalText,
                translated_text: originalText,
                sender: sender 
            })
            .select();
        
        if (error) {
            console.error('Error sending message:', error);
            return null;
        }
        
        return data;
    } catch (error) {
        console.error('Error sending message:', error);
        return null;
    }
}

export async function fetchAllUsers() {
    const { data: {user} } = await supabase.auth.getUser();
    const currentProfile = await getProfile(user.id);
    const personaType = currentProfile[0].persona_type;
   
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .neq('persona_type', personaType);
        
        if (error) {
            console.error('Error fetching users:', error);
            return [];
        }
        
        return data || [];
    } catch (error) {
        console.error('Error fetching users:', error);
        return [];
    }
}

export async function createChatRoom(profile1Id, profile2Id) {
    try {
        const { data, error } = await supabase
            .from('chat_rooms')
            .insert({ 
                profile_1: profile1Id, 
                profile_2: profile2Id 
            })
            .select();
        
        if (error) {
            console.error('Error creating chat room:', error);
            return null;
        }
        
        return data;
    } catch (error) {
        console.error('Error creating chat room:', error);
        return null;
    }
}
export async function getProfile(userId) {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId);
        console.log('Profile:', data);
        return data;
        }
        catch (error) {
            console.error('Error fetching profile:', error);
            return null;
        }
    }

    export async function markRoomAsSeen(roomId, userId) {
        if (!roomId || !userId) return;
      
        try {
          // First, find out if the user is profile_1 or profile_2 for this room
          const { data: room, error: fetchError } = await supabase
            .from('chat_rooms')
            .select('profile_1, profile_2')
            .eq('id', roomId)
            .single();
      
          if (fetchError) throw fetchError;
          if (!room) return;
      
          // Create the update object for the correct user
          const updateData = {};
          const now = new Date().toISOString();
      
          if (room.profile_1 === userId) {
            updateData.profile_1_last_seen_at = now;
          } else if (room.profile_2 === userId) {
            updateData.profile_2_last_seen_at = now;
          } else {
            // User isn't part of this room, which shouldn't happen
            return;
          }
      
          // Perform the update
          const { error: updateError } = await supabase
            .from('chat_rooms')
            .update(updateData)
            .eq('id', roomId);
      
          if (updateError) throw updateError;
          
        } catch (error) {
          console.error('Error marking room as seen:', error);
        }
      }
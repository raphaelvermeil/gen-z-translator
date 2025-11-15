import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)




export async function fetchUserRooms(userId) {
    try {
        console.log('Fetching user rooms for user: in supabaseClient.js', userId);
        const { data, error } = await supabase
            .from('chat_rooms')
            .select('*,profile_1(*),profile_2(*)')
            
            .or(`profile_1.eq.${userId},profile_2.eq.${userId}`)
        
        if (error) {
            console.error('Error fetching user rooms:', error);
            return [];
        }
        
        console.log('User rooms: in supabaseClient.js', data);

        return data || [];
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

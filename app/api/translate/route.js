/**
 * SECURE TRANSLATION API ENDPOINT
 * 
 * This API route implements multiple layers of security to prevent abuse:
 * 
 * 1. AUTHENTICATION: Verifies user is logged in via Supabase auth cookies
 * 2. RATE LIMITING: Max 10 requests per 30 seconds per user (via Upstash Redis)
 * 3. AUTHORIZATION: Verifies user is part of the conversation room
 * 4. SERVER-SIDE VALIDATION: Fetches all data from DB, doesn't trust client input
 * 5. DUPLICATE PREVENTION: Skips already-translated messages
 * 
 * Client sends ONLY messageId. Server fetches and validates everything else.
 * This prevents malicious users from translating arbitrary text at your expense.
 */

import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { Ratelimit } from '@upstash/ratelimit';
import { kv } from '@vercel/kv';

// Use admin client with service role key for secure server-side updates
// This bypasses Row Level Security (RLS) policies
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Initialize OpenAI API
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// SECURITY: Rate limiting - Allow 10 translation requests per 30 seconds per user
// TEMPORARY: Disabled for testing - enable after setting up Vercel KV
const ratelimit = process.env.KV_REST_API_URL ? new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(10, '30 s'),
}) : null;

export async function POST(request) {
  try {
    // SECURITY STEP 1: Authentication - Verify user is logged in
    // Check Authorization header first (more reliable than cookies)
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    let user = null;
    let authError = null;

    if (token) {
      // Verify token using admin client
      const { data, error } = await supabaseAdmin.auth.getUser(token);
      user = data.user;
      authError = error;
    } else {
      // Fallback to cookie-based auth
      const cookieStore = await cookies();
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
          cookies: {
            getAll() {
              return cookieStore.getAll();
            },
            setAll(cookiesToSet) {
              try {
                cookiesToSet.forEach(({ name, value, options }) =>
                  cookieStore.set(name, value, options)
                );
              } catch (error) {
                // Cookies can't be set in API routes, that's okay
              }
            },
          },
        }
      );

      const { data, error } = await supabase.auth.getUser();
      user = data.user;
      authError = error;
    }

    // Debug logging - remove after testing
    console.log('Auth check:', { 
      hasUser: !!user, 
      userId: user?.id,
      authMethod: token ? 'header' : 'cookie',
      authError: authError?.message
    });

    if (authError || !user) {
      console.error('Authentication failed:', authError);
      return NextResponse.json(
        { 
          error: 'Unauthorized - You must be logged in', 
          details: authError?.message
        },
        { status: 401 }
      );
    }

    // SECURITY STEP 2: Rate Limiting - Prevent spam/abuse
    if (ratelimit) {
      const { success: rateLimitOk } = await ratelimit.limit(user.id);

      if (!rateLimitOk) {
        return NextResponse.json(
          { error: 'Too many requests. Please wait before translating more messages.' },
          { status: 429 }
        );
      }
    }

    // SECURITY STEP 3: Don't Trust Client - Only accept messageId
    const { messageId } = await request.json();

    if (!messageId) {
      return NextResponse.json(
        { error: 'Message ID is required' },
        { status: 400 }
      );
    }

    // Fetch the message from the database (don't trust client data!)
    const { data: message, error: fetchError } = await supabaseAdmin
      .from('messages')
      .select('original_text, translated_text, sender, room_id')
      .eq('id', messageId)
      .single();

    if (fetchError || !message) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      );
    }

    // SECURITY: Verify this message belongs to a room the user is part of
    const { data: room, error: roomError } = await supabaseAdmin
      .from('chat_rooms')
      .select('profile_1, profile_2')
      .eq('id', message.room_id)
      .single();

    if (roomError || !room) {
      return NextResponse.json(
        { error: 'Room not found' },
        { status: 404 }
      );
    }

    // Verify user is actually part of this room
    if (room.profile_1 !== user.id && room.profile_2 !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized - You are not part of this conversation' },
        { status: 403 }
      );
    }

    // Don't re-translate messages that are already translated
    if (message.translated_text) {
      return NextResponse.json({
        success: true,
        message: 'Already translated',
        translatedText: message.translated_text
      });
    }

    // Get personas from database profiles (don't trust client!)
    const { data: senderProfile, error: senderError } = await supabaseAdmin
      .from('profiles')
      .select('persona_type')
      .eq('id', message.sender)
      .single();

    const targetUserId = room.profile_1 === message.sender 
      ? room.profile_2 
      : room.profile_1;

    const { data: targetProfile, error: targetError } = await supabaseAdmin
      .from('profiles')
      .select('persona_type')
      .eq('id', targetUserId)
      .single();

    if (senderError || !senderProfile || targetError || !targetProfile) {
      return NextResponse.json(
        { error: 'Could not fetch user profiles' },
        { status: 500 }
      );
    }

    const senderPersona = senderProfile.persona_type;
    const targetPersona = targetProfile.persona_type;

    // If personas are the same, no translation needed
    if (senderPersona === targetPersona) {
      const { error: updateError } = await supabaseAdmin
        .from('messages')
        .update({ translated_text: message.original_text })
        .eq('id', messageId);

      if (updateError) {
        console.error('Error updating message:', updateError);
      }

      return NextResponse.json({
        success: true,
        translatedText: message.original_text,
        note: 'Same persona, no translation needed'
      });
    }

    // Define the system prompt for ChatGPT
    const systemPrompt = `You are a language translator specializing in generational slang and communication styles. Your task is to translate a message from a sender's persona to a target's persona.

Guidelines:
- Gen Z slang includes terms like: "no cap", "bussin", "fr", "lowkey", "highkey", "slaps", "hits different", "vibe check", "bet", "fire", "lit", "slay", "stan", "tea", "salty", "flex", "sus", "simp", "ghosting", "fam", "squad", "goat", "receipts", "shade", "clout", "mood", "periodt", "rent-free", "main character energy", "understood the assignment", "it's giving", "serve", "ate and left no crumbs", "cooked", "sigma", "ligma".
- Gen Z slang also contains acronyms such as: "wdym", "lmao", "frl", "brb", "idk", "tbh", "ttyl", "lol", "rofl", "wtf", "wth".
- Boomer communication is more formal, joyful and uses complete sentences, includes more context, and avoids modern internet slang.
- Keep the core meaning and intent of the message, including emotional and humorous tones.
- Try to change emoji usage to be more appropriate for the target persona. For example, the skull emoji means something funny in Gen Z slang, but not in Boomer slang.  
- Make it sound natural for the target persona, implying a good traduction towards the gen z slang too.
- Don't add extra information, just translate the style.
- If the message is already neutral or doesn't need much translation, keep it mostly the same but adjust the tone appropriately.
- Provide ONLY the translated message, no explanation or additional text.`;
    
    // Define the user prompt
    const userPrompt = `Translate the following message from ${senderPersona} to ${targetPersona}:\n\n"${message.original_text}"`;

    // The NEW syntax for OpenAI
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // Use the fast and cost-effective model
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 150,
    });

    const translatedText = response.choices[0].message.content.trim();

    // Update the message in Supabase with the translation
    // Using admin client to bypass RLS
    const { error: updateError } = await supabaseAdmin
      .from('messages')
      .update({ translated_text: translatedText })
      .eq('id', messageId);

    if (updateError) {
      console.error('Error updating message with translation:', updateError);
      return NextResponse.json(
        { error: 'Failed to update message' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      originalText: message.original_text,
      translatedText: translatedText,
      senderPersona,
      targetPersona
    });

  } catch (error) {
    console.error('Translation error:', error);
    return NextResponse.json(
      { error: 'Translation failed', details: error.message },
      { status: 500 }
    );
  }
}


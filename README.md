This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Gen Z Translator

A real-time messaging app that automatically translates messages between Gen Z and Boomer communication styles using OpenAI's ChatGPT.

## Environment Setup

### Required Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Supabase Service Role Key (for server-side operations)
# IMPORTANT: Keep this secret! Never expose in client-side code
# Find this in: Supabase Dashboard > Project Settings > API > service_role key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# OpenAI (ChatGPT) API Configuration
# Get your API key from: https://platform.openai.com/api-keys
OPENAI_API_KEY=your_openai_api_key_here

# Vercel KV (for rate limiting)
# These are automatically set when you add KV storage in Vercel Dashboard
# For local development, get these from: Vercel Dashboard > Storage > KV > .env.local tab
KV_URL=your_kv_url
KV_REST_API_URL=your_kv_rest_api_url
KV_REST_API_TOKEN=your_kv_rest_api_token
KV_REST_API_READ_ONLY_TOKEN=your_kv_rest_api_read_only_token
```

### Vercel KV Setup (Required for Rate Limiting)

1. Go to your [Vercel Dashboard](https://vercel.com/dashboard)
2. Click on your project
3. Go to "Storage" tab
4. Click "Create Database" → Select "KV" (Redis)
5. Follow the prompts (it's free for hobby tier)
6. Copy the environment variables to your `.env.local` file
7. For production, these variables are automatically added to your deployment

## Getting Started

First, install dependencies:

```bash
npm install
```

Then, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## How Translation Works

The app follows a fast, non-blocking flow for instant message delivery with background translation:

### Part A: Instant Message Delivery (< 50ms)
1. User types a message (e.g., "ngl this is mid") and hits Send
2. Frontend immediately inserts the message into Supabase with only `original_text`, leaving `translated_text` as null
3. Supabase real-time subscription fires instantly - message appears immediately for all users in the chat

### Part B: Background AI Translation (1-2 seconds)
4. Frontend makes a non-blocking (fire-and-forget) call to `/api/translate` with:
   - `messageId`: The newly created message ID
   - `originalText`: The message text
   - `senderPersona`: The sender's persona (gen-z or boomer)
   - `targetPersona`: The recipient's persona (gen-z or boomer)

5. The serverless API route:
   - Uses OpenAI's gpt-3.5-turbo to translate between communication styles
   - Uses Supabase admin client (with service role key) to securely update the message
   - Bypasses Row Level Security (RLS) for reliable server-side updates

6. When translation completes, the UPDATE subscription fires
7. All chat clients receive the updated message with `translated_text` filled in
8. UI smoothly updates to show the translation (replaces "Translating..." spinner)

### User Experience
- ✅ Message appears **instantly** (no waiting)
- ⏳ "Translating..." indicator shows briefly
- ✨ Translation appears **1-2 seconds later**
- 🔄 Real-time for all participants

## Features

- 🔄 **Automatic Translation**: Messages are automatically translated when sent
- 👥 **Persona-Based**: Translates between Gen Z and Boomer communication styles
- 🤖 **AI-Powered**: Uses OpenAI's gpt-3.5-turbo for natural translations
- ⚡ **Real-Time**: Built with Supabase real-time subscriptions
- 💬 **Chat Rooms**: Direct messaging between users with different personas
- 🔒 **Secure**: Multi-layer security with authentication, authorization, and rate limiting

## Security Features

This app implements enterprise-grade security to protect against abuse and unauthorized access:

### 1. Authentication 🔐
- All API requests verify the user is logged in via Supabase auth cookies
- Unauthorized requests are immediately rejected with 401 status

### 2. Authorization ✅
- Server verifies users can only translate messages from rooms they're actually part of
- Prevents users from accessing or translating other people's conversations
- Returns 403 Forbidden if user tries to access unauthorized rooms

### 3. Server-Side Validation 🛡️
- API only accepts message IDs from clients
- All message content and user personas are fetched directly from the database
- Prevents malicious users from:
  - Sending fake or modified message content
  - Translating arbitrary text at your expense
  - Bypassing persona validation

### 4. Duplicate Prevention ⚠️
- Already-translated messages are skipped
- Prevents unnecessary API calls and costs

### 5. Rate Limiting ⏱️
- Maximum 10 translation requests per 30 seconds per user
- Powered by Upstash Redis (Vercel KV)
- Prevents spam and abuse even from authenticated users
- Returns 429 Too Many Requests when limit exceeded

### Why This Matters
Without these protections, a malicious user could:
- ❌ Send thousands of translation requests per second
- ❌ Rack up massive AI API bills
- ❌ Translate arbitrary content at your expense
- ❌ Access other users' private conversations

With these protections:
- ✅ Only authenticated users in valid rooms can request translations
- ✅ Server controls all data validation
- ✅ Abuse is automatically throttled
- ✅ Your API costs stay predictable and safe

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Remember to add your environment variables in the Vercel project settings!

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

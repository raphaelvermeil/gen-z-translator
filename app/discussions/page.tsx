"use client";

import { useEffect, useMemo, useState, useRef } from "react";

// A single-file Discussions hub. Modularity is achieved via small inner components.
// This component simulates fetching conversations and messages and simulates live updates.

type User = {
  id: string;
  name: string;
};

type Message = {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: string; // ISO
};

type Conversation = {
  id: string;
  participantIds: string[]; // user ids
  lastMessage?: Message;
};

// --- Mock data + API simulation ---
// In a real app these would call your backend / database.

const MOCK_USERS: Record<string, User> = {
  u1: { id: "u1", name: "Alex" },
  u2: { id: "u2", name: "Sam" },
  u3: { id: "u3", name: "Taylor" },
  me: { id: "me", name: "You" },
};

// Create base conversations with lastMessage placeholders
const MOCK_CONVERSATIONS: Conversation[] = [
  { id: "c1", participantIds: ["me", "u1"] },
  { id: "c2", participantIds: ["me", "u2"] },
  { id: "c3", participantIds: ["me", "u3"] },
];

// In-memory messages store for simulation
const MESSAGES_DB: Message[] = [
  {
    id: "m1",
    conversationId: "c1",
    senderId: "u1",
    content: "Hey! Did you try the new prompt feature?",
    createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
  },
  {
    id: "m2",
    conversationId: "c1",
    senderId: "me",
    content: "Not yet — I'll check it after lunch.",
    createdAt: new Date(Date.now() - 1000 * 60 * 58).toISOString(),
  },
  {
    id: "m3",
    conversationId: "c2",
    senderId: "u2",
    content: "Let's pair program tomorrow.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
  },
  {
    id: "m4",
    conversationId: "c3",
    senderId: "u3",
    content: "Here's a funny meme.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
];

// Utility: return a shallow-copied conversations array updated with lastMessage from MESSAGES_DB
function buildConversations(): Conversation[] {
  return MOCK_CONVERSATIONS.map((conv) => {
    const last = [...MESSAGES_DB]
      .filter((m) => m.conversationId === conv.id)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))[0];
    return { ...conv, lastMessage: last };
  });
}

// Mock fetch functions
function fetchConversations(): Promise<Conversation[]> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(buildConversations()), 300);
  });
}

function fetchMessages(conversationId: string): Promise<Message[]> {
  return new Promise((resolve) => {
    setTimeout(
      () => resolve(MESSAGES_DB.filter((m) => m.conversationId === conversationId).sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1))),
      250
    );
  });
}

// Simulate server-side push: subscriptions keyed by conversationId
const SUBSCRIBERS: Record<string, ((msg: Message) => void)[]> = {};

function subscribeToConversation(conversationId: string, cb: (msg: Message) => void) {
  SUBSCRIBERS[conversationId] = SUBSCRIBERS[conversationId] || [];
  SUBSCRIBERS[conversationId].push(cb);
  return () => {
    SUBSCRIBERS[conversationId] = SUBSCRIBERS[conversationId].filter((c) => c !== cb);
  };
}

function pushMessageToSubscribers(message: Message) {
  const subs = SUBSCRIBERS[message.conversationId] || [];
  subs.forEach((cb) => cb(message));
}

// Send a message (writes to in-memory DB and notifies subscribers)
function sendMessage(conversationId: string, senderId: string, content: string): Promise<Message> {
  return new Promise((resolve) => {
    const msg: Message = {
      id: "m" + (MESSAGES_DB.length + 1),
      conversationId,
      senderId,
      content,
      createdAt: new Date().toISOString(),
    };
    MESSAGES_DB.push(msg);
    // Notify subscribers after a tiny delay, simulating network
    setTimeout(() => pushMessageToSubscribers(msg), 50);
    resolve(msg);
  });
}

// Simulate other participants sending messages randomly
function startRandomIncomingMessages() {
  // every 8-18 seconds, pick a random conversation and user (not me) and push a message
  const timer = setInterval(() => {
    const conv = MOCK_CONVERSATIONS[Math.floor(Math.random() * MOCK_CONVERSATIONS.length)];
    const other = conv.participantIds.find((p) => p !== "me") || "u1";
    const sampleReplies = [
      "Nice — I'm in.",
      "Lol that's great!",
      "Can you share the code?",
      "I'll review it soon.",
      "Haha love that",
    ];
    const content = sampleReplies[Math.floor(Math.random() * sampleReplies.length)];
    sendMessage(conv.id, other, content);
  }, 10000);

  return () => clearInterval(timer);
}

// --- UI: small inner components ---

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function ConversationItem({
  conv,
  users,
  active,
  onClick,
}: {
  conv: Conversation;
  users: Record<string, User>;
  active: boolean;
  onClick: () => void;
}) {
  const otherNames = conv.participantIds
    .filter((id) => id !== "me")
    .map((id) => users[id]?.name || id)
    .join(", ");

  return (
    <div
      onClick={onClick}
      style={{
        padding: 12,
        borderRadius: 8,
        cursor: "pointer",
        background: active ? "#eef2ff" : "transparent",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 8,
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600 }}>{otherNames}</div>
        <div style={{ color: "#6b7280", fontSize: 13, marginTop: 6 }}>
          {conv.lastMessage ? conv.lastMessage.content : "No messages yet"}
        </div>
      </div>
      <div style={{ marginLeft: 8, textAlign: "right", color: "#9ca3af", fontSize: 12 }}>
        {conv.lastMessage ? formatTime(conv.lastMessage.createdAt) : ""}
      </div>
    </div>
  );
}

export default function DiscussionsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [input, setInput] = useState("");
  const users = useMemo(() => MOCK_USERS, []);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Fetch conversations on mount
  useEffect(() => {
    let mounted = true;
    fetchConversations().then((convs) => {
      if (!mounted) return;
      setConversations(convs);
      // auto-select the first conversation
      if (convs.length > 0) setSelectedConvId((id) => id ?? convs[0].id);
    });

    const stopRandom = startRandomIncomingMessages();

    return () => {
      mounted = false;
      stopRandom();
    };
  }, []);

  // When selected conversation changes, load messages and subscribe to live updates
  useEffect(() => {
    if (!selectedConvId) return;
    setLoadingMessages(true);
    let mounted = true;

    fetchMessages(selectedConvId).then((msgs) => {
      if (!mounted) return;
      setMessages(msgs);
      setLoadingMessages(false);
      // scroll to bottom soon after render
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    });

    // Subscribe to live updates for the selected convo
    const unsub = subscribeToConversation(selectedConvId, (msg) => {
      // On incoming message, append and update conversation preview
      setMessages((prev) => [...prev, msg]);
      setConversations((prev) =>
        prev.map((c) => (c.id === msg.conversationId ? { ...c, lastMessage: msg } : c))
      );
    });

    return () => {
      mounted = false;
      unsub();
    };
  }, [selectedConvId]);

  // Global subscription to any message to update conversation previews
  useEffect(() => {
    // For simplicity, subscribe to each conversation and update previews
    const unsubAll = MOCK_CONVERSATIONS.map((conv) =>
      subscribeToConversation(conv.id, (msg) => {
        setConversations((prev) => prev.map((c) => (c.id === msg.conversationId ? { ...c, lastMessage: msg } : c)));
      })
    );

    return () => {
      unsubAll.forEach((u) => u());
    };
  }, []);

  const handleSend = async () => {
    if (!selectedConvId || input.trim() === "") return;
    const content = input.trim();
    setInput("");
    // Optimistically add the message to UI
    const optimistic: Message = {
      id: "optim-" + Math.random().toString(36).slice(2, 9),
      conversationId: selectedConvId,
      senderId: "me",
      content,
      createdAt: new Date().toISOString(),
    };
    setMessages((m) => [...m, optimistic]);
    setConversations((prev) => prev.map((c) => (c.id === selectedConvId ? { ...c, lastMessage: optimistic } : c)));
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

    // Send to the mock server
    const saved = await sendMessage(selectedConvId, "me", content);
    // Replace optimistic id with real message data
    setMessages((prev) => prev.map((p) => (p.id === optimistic.id ? saved : p)));
    setConversations((prev) => prev.map((c) => (c.id === saved.conversationId ? { ...c, lastMessage: saved } : c)));
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div style={{ height: "100vh", display: "flex", background: "#f8fafc", color: "#0f172a" }}>
      {/* Left panel: Conversations list */}
      <aside
        style={{
          width: 360,
          minWidth: 260,
          borderRight: "1px solid #e6eef8",
          padding: 16,
          boxSizing: "border-box",
          overflowY: "auto",
          background: "#ffffff",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h3 style={{ margin: 0 }}>Discussions</h3>
          <div style={{ color: "#6b7280", fontSize: 13 }}>{conversations.length}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {conversations.length === 0 ? (
            <div style={{ color: "#6b7280" }}>Loading...</div>
          ) : (
            conversations.map((conv) => (
              <ConversationItem
                key={conv.id}
                conv={conv}
                users={users}
                active={conv.id === selectedConvId}
                onClick={() => setSelectedConvId(conv.id)}
              />
            ))
          )}
        </div>
      </aside>

      {/* Right panel: Messages */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ padding: 20, borderBottom: "1px solid #eef2ff", background: "#ffffff" }}>
          <div style={{ fontWeight: 700 }}>
            {selectedConvId
              ? MOCK_CONVERSATIONS.find((c) => c.id === selectedConvId)
                  ?.participantIds.filter((id) => id !== "me")
                  .map((id) => users[id]?.name || id)
                  .join(", ")
              : "Select a conversation"}
          </div>
        </div>

        <div style={{ flex: 1, padding: 20, overflowY: "auto", background: "#f8fafc" }}>
          {loadingMessages ? (
            <div style={{ color: "#6b7280" }}>Loading messages...</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {messages.map((m) => {
                const mine = m.senderId === "me";
                return (
                  <div
                    key={m.id}
                    style={{
                      alignSelf: mine ? "flex-end" : "flex-start",
                      maxWidth: "72%",
                      background: mine ? "#2563eb" : "#ffffff",
                      color: mine ? "white" : "#0f172a",
                      padding: "10px 12px",
                      borderRadius: 10,
                      boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
                    }}
                  >
                    <div style={{ fontSize: 14 }}>{m.content}</div>
                    <div style={{ fontSize: 11, color: mine ? "rgba(255,255,255,0.8)" : "#6b7280", marginTop: 6, textAlign: "right" }}>
                      {formatTime(m.createdAt)}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Composer */}
        <div style={{ padding: 12, borderTop: "1px solid #eef2ff", display: "flex", gap: 8, alignItems: "center", background: "#ffffff" }}>
          <input
            aria-label="Message input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={selectedConvId ? "Write a message..." : "Select a conversation to start"}
            disabled={!selectedConvId}
            style={{ flex: 1, padding: 10, borderRadius: 8, border: "1px solid #e6eef8" }}
          />
          <button
            onClick={handleSend}
            disabled={!selectedConvId || input.trim() === ""}
            style={{ padding: "8px 12px", borderRadius: 8, background: "#2563eb", color: "white", border: "none", fontWeight: 600 }}
          >
            Send
          </button>
        </div>
      </main>
    </div>
  );
}

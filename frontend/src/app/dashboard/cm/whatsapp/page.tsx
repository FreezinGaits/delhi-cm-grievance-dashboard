'use client';

import { useState, useEffect, useCallback } from 'react';

interface Session {
  _id: string;
  phoneNumber: string;
  currentConversationState: string;
  conversationData: {
    name?: string;
    category?: string;
    description?: string;
    ward?: string;
  };
  lastMessageAt: string;
  isActive: boolean;
  messageCount: number;
  createdAt: string;
}

interface Message {
  _id: string;
  sender: string;
  receiver: string;
  direction: 'inbound' | 'outbound';
  messageType: string;
  content: string;
  timestamp: string;
  deliveryStatus?: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const stateLabels: Record<string, { label: string; color: string }> = {
  START: { label: 'Started', color: '#94a3b8' },
  AWAITING_NAME: { label: 'Awaiting Name', color: '#fbbf24' },
  AWAITING_LOCATION: { label: 'Awaiting Location', color: '#f59e0b' },
  AWAITING_CATEGORY: { label: 'Awaiting Category', color: '#3b82f6' },
  AWAITING_COMPLAINT: { label: 'Awaiting Description', color: '#8b5cf6' },
  AWAITING_IMAGE: { label: 'Awaiting Image', color: '#c4b5fd' },
  CONFIRMATION: { label: 'Confirming', color: '#06b6d4' },
  COMPLETE: { label: 'Complete', color: '#10b981' },
};

export default function WhatsAppAdminPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [testPhone, setTestPhone] = useState('919876543210');
  const [testMessage, setTestMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/webhooks/whatsapp/sessions`);
      const data = await res.json();
      if (data.success) setSessions(data.data || []);
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  const viewMessages = async (phone: string) => {
    setSelectedPhone(phone);
    setMessagesLoading(true);
    try {
      const res = await fetch(`${API_BASE}/webhooks/whatsapp/messages/${phone}`);
      const data = await res.json();
      if (data.success) setMessages(data.data || []);
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    } finally {
      setMessagesLoading(false);
    }
  };

  const sendTestMessage = async () => {
    if (!testPhone || !testMessage) return;
    setSending(true);
    setTestResult(null);
    try {
      const res = await fetch(`${API_BASE}/webhooks/whatsapp/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: testPhone,
          message: { type: 'text', text: { body: testMessage } },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTestResult('✅ Message processed');
        setTestMessage('');
        fetchSessions();
        if (selectedPhone === testPhone) viewMessages(testPhone);
      } else {
        setTestResult(`❌ ${data.error?.message || 'Failed'}`);
      }
    } catch (err) {
      setTestResult('❌ Connection failed');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' });
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '4px' }}>📱 WhatsApp Intake Monitor</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Active sessions, message history, and test console</p>
        </div>
        <button onClick={fetchSessions} className="btn btn-ghost">🔄 Refresh</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Left: Sessions + Test Console */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Test Console */}
          <div className="glass-card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '14px' }}>🧪 Test Console</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
              Simulate WhatsApp messages without Meta API. Try sending &ldquo;Hi&rdquo; to start a conversation.
            </p>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
              <input className="input" placeholder="Phone number"
                value={testPhone} onChange={e => setTestPhone(e.target.value)}
                style={{ maxWidth: '160px' }} />
              <input className="input" placeholder="Message text (e.g. Hi)"
                value={testMessage} onChange={e => setTestMessage(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendTestMessage()} style={{ flex: 1 }} />
              <button onClick={sendTestMessage} className="btn btn-primary" disabled={sending}
                style={{ whiteSpace: 'nowrap' }}>
                {sending ? '⏳' : '📤 Send'}
              </button>
            </div>
            {testResult && (
              <div style={{ fontSize: '0.8rem', padding: '8px 12px', borderRadius: '8px', background: testResult.startsWith('✅') ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: testResult.startsWith('✅') ? '#6ee7b7' : '#fca5a5' }}>
                {testResult}
              </div>
            )}
          </div>

          {/* Active Sessions */}
          <div className="glass-card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '14px' }}>
              📞 Active Sessions ({sessions.length})
            </h3>
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[1,2,3].map(i => <div key={i} style={{ height: '60px' }} className="skeleton" />)}
              </div>
            ) : sessions.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No active sessions. Use the test console above to simulate one.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {sessions.map(session => {
                  const state = stateLabels[session.currentConversationState] || stateLabels.START;
                  const isSelected = selectedPhone === session.phoneNumber;
                  return (
                    <div key={session._id}
                      onClick={() => viewMessages(session.phoneNumber)}
                      style={{
                        padding: '12px 14px', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.15s',
                        background: isSelected ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg-secondary)',
                        border: `1px solid ${isSelected ? 'rgba(59, 130, 246, 0.3)' : 'var(--border-color)'}`,
                      }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>📱 {session.phoneNumber}</span>
                        <span style={{
                          padding: '2px 8px', borderRadius: '999px', fontSize: '0.65rem', fontWeight: 600,
                          color: state.color, background: `${state.color}20`,
                        }}>
                          {state.label}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '16px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {session.conversationData?.name && <span>👤 {session.conversationData.name}</span>}
                        <span>💬 {session.messageCount} messages</span>
                        <span>🕐 {formatTime(session.lastMessageAt)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Message History */}
        <div className="glass-card" style={{ padding: '20px', maxHeight: '70vh', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '14px' }}>
            💬 {selectedPhone ? `Messages — ${selectedPhone}` : 'Select a session'}
          </h3>

          {!selectedPhone ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Click on a session to view the message history
            </div>
          ) : messagesLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[1,2,3,4,5].map(i => <div key={i} style={{ height: '40px' }} className="skeleton" />)}
            </div>
          ) : (
            <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {messages.map(msg => (
                <div key={msg._id} style={{
                  display: 'flex', justifyContent: msg.direction === 'outbound' ? 'flex-start' : 'flex-end',
                }}>
                  <div style={{
                    maxWidth: '80%', padding: '10px 14px', borderRadius: '12px',
                    background: msg.direction === 'outbound' ? 'rgba(59, 130, 246, 0.12)' : 'var(--bg-secondary)',
                    border: `1px solid ${msg.direction === 'outbound' ? 'rgba(59, 130, 246, 0.2)' : 'var(--border-color)'}`,
                  }}>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '0.65rem', fontWeight: 600, color: msg.direction === 'outbound' ? '#93c5fd' : '#fbbf24' }}>
                        {msg.direction === 'outbound' ? '🤖 Bot' : '👤 Citizen'}
                      </span>
                      <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>
                        {formatTime(msg.timestamp)}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.85rem', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                      {msg.content}
                    </div>
                    {msg.messageType !== 'text' && (
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                        📎 {msg.messageType}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

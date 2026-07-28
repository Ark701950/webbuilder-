import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MainLayout } from '../components/MainLayout';
import { apiClient } from '../utils/api';
import { PageHeader, Modal, Input, Button, Badge, EmptyState } from '../components/ui-kit';
import { useAuth } from '../context/AuthContext';
import { Hash, Plus, Send, Users, MessageSquare, Lock } from 'lucide-react';

export const Messages = () => {
  const { user } = useAuth();
  const [channels, setChannels] = useState([]);
  const [activeChannel, setActiveChannel] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [showNewChannel, setShowNewChannel] = useState(false);
  const [chForm, setChForm] = useState({ name: '', description: '', channel_type: 'public' });
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);
  const pollingRef = useRef(null);
// eslint-disable-next-line react-hooks/exhaustive-deps
useEffect(() => {
  fetchChannels();
}, [fetchChannels]);
  fetchChannels();
}, []);
  useEffect(() => { fetchChannels(); }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

 const fetchChannels = useCallback(async () => {
  setLoading(true);
  try {
    const res = await apiClient.get('/channels');
    const chs = res.data.channels || [];

    setChannels(chs);

    if (chs.length > 0 && !activeChannel) {
      setActiveChannel(chs[0]);
    }
  } catch (e) {
    console.error(e);
  } finally {
    setLoading(false);
  }
}, [activeChannel]);

useEffect(() => {
  if (!activeChannel) {
    if (pollingRef.current) clearInterval(pollingRef.current);
    return;
  }

  fetchMessages(activeChannel.channel_id);

  pollingRef.current = setInterval(() => {
    fetchMessages(activeChannel.channel_id, true);
  }, 5000);

  return () => {
    if (pollingRef.current) clearInterval(pollingRef.current);
  };
}, [activeChannel]);
  const fetchMessages = async (channelId, silent = false) => {
    try {
      const res = await apiClient.get('/messages', { params: { channel_id: channelId } });
      setMessages(res.data.messages || []);
    } catch (e) { if (!silent) console.error(e); }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || !activeChannel || sending) return;
    setSending(true);
    try {
      await apiClient.post('/messages', {
        channel_id: activeChannel.channel_id,
        content: input.trim(),
        message_type: 'text'
      });
      setInput('');
      fetchMessages(activeChannel.channel_id);
    } catch (err) {
      console.error(err);
    } finally { setSending(false); }
  };

  const createChannel = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await apiClient.post('/channels', chForm);
      setShowNewChannel(false);
      setChForm({ name: '', description: '', channel_type: 'public' });
      fetchChannels();
    } catch (err) {
      const d = err.response?.data?.detail;
      setError(typeof d === 'string' ? d : 'Failed to create channel');
    }
  };

  return (
    <MainLayout>
      <div className="flex h-[calc(100vh-8rem)] gap-4">
        {/* Channels Sidebar */}
        <div className="w-64 flex flex-col rounded-xl border border-border bg-surface">
          <div className="flex items-center justify-between border-b border-border p-4">
            <h3 className="font-semibold text-foreground">Channels</h3>
            <button
              onClick={() => setShowNewChannel(true)}
              className="rounded p-1.5 text-muted-foreground hover:bg-surface-elevated hover:text-primary transition-colors"
              data-testid="create-channel-button"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {loading ? (
              <div className="flex justify-center py-8"><div className="animate-spin h-6 w-6 border-4 border-primary border-t-transparent rounded-full"></div></div>
            ) : channels.length === 0 ? (
              <p className="p-4 text-center text-sm text-muted-foreground">No channels yet</p>
            ) : (
              channels.map((ch) => (
                <button
                  key={ch.channel_id}
                  onClick={() => setActiveChannel(ch)}
                  className={`w-full flex items-center gap-2 p-2.5 rounded-lg text-sm transition-colors ${
                    activeChannel?.channel_id === ch.channel_id ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-surface-elevated'
                  }`}
                  data-testid={`channel-${ch.channel_id}`}
                >
                  {ch.channel_type === 'private' ? <Lock className="h-3.5 w-3.5" /> : <Hash className="h-3.5 w-3.5" />}
                  <span className="truncate">{ch.name}</span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col rounded-xl border border-border bg-surface">
          {!activeChannel ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="mx-auto h-16 w-16 text-muted-foreground" />
                <h3 className="mt-4 text-xl font-semibold text-foreground">Select a channel</h3>
                <p className="mt-2 text-muted-foreground">Choose a channel to start chatting or create a new one</p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between border-b border-border p-4">
                <div className="flex items-center gap-3">
                  <Hash className="h-5 w-5 text-primary" />
                  <div>
                    <h2 className="font-semibold text-foreground">{activeChannel.name}</h2>
                    {activeChannel.description && <p className="text-xs text-muted-foreground">{activeChannel.description}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  {activeChannel.members?.length || 0}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3" data-testid="messages-list">
                {messages.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-12">No messages yet. Say hello!</p>
                ) : (
                  messages.map((msg) => (
                    <div key={msg.message_id} className={`flex gap-3 ${msg.sender_id === user?.user_id ? 'flex-row-reverse' : ''}`} data-testid="message-item">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-white">
                        {msg.sender_id === user?.user_id ? user?.name?.charAt(0)?.toUpperCase() : msg.sender_id?.slice(-2)?.toUpperCase()}
                      </div>
                      <div className={`max-w-lg rounded-xl px-4 py-2 ${
                        msg.sender_id === user?.user_id ? 'bg-primary text-white' : 'bg-surface-elevated text-foreground'
                      }`}>
                        <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                        <p className={`mt-1 text-xs ${msg.sender_id === user?.user_id ? 'text-white/70' : 'text-muted-foreground'}`}>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={sendMessage} className="border-t border-border p-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={`Message #${activeChannel.name}`}
                    disabled={sending}
                    data-testid="message-input"
                    className="flex-1 rounded-lg border border-input bg-background px-4 py-2.5 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <button
                    type="submit"
                    disabled={sending || !input.trim()}
                    className="rounded-lg bg-primary px-4 py-2.5 text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
                    data-testid="send-message-button"
                  >
                    <Send className="h-5 w-5" />
                  </button>
                </div>
              </form>
            </>
          )}
        </div>

        <Modal open={showNewChannel} onClose={() => setShowNewChannel(false)} title="Create Channel">
          {error && <div className="mt-4 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
          <form onSubmit={createChannel} className="mt-6 space-y-4">
            <Input label="Channel Name" required value={chForm.name} onChange={(e) => setChForm({ ...chForm, name: e.target.value })} placeholder="general" data-testid="channel-name-input" />
            <Input label="Description" value={chForm.description} onChange={(e) => setChForm({ ...chForm, description: e.target.value })} placeholder="What is this channel about?" />
            <div className="flex gap-3">
              {['public', 'private'].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setChForm({ ...chForm, channel_type: t })}
                  className={`flex-1 rounded-lg border px-4 py-2 text-sm font-medium capitalize transition-colors ${
                    chForm.channel_type === t ? 'border-primary bg-primary/10 text-primary' : 'border-input text-muted-foreground hover:bg-surface-elevated'
                  }`}
                >
                  {t === 'private' ? <Lock className="mr-1 inline h-3.5 w-3.5" /> : <Hash className="mr-1 inline h-3.5 w-3.5" />}
                  {t}
                </button>
              ))}
            </div>
            <div className="flex gap-3 pt-4">
              <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowNewChannel(false)}>Cancel</Button>
              <Button type="submit" className="flex-1" data-testid="submit-channel-button">Create Channel</Button>
            </div>
          </form>
        </Modal>
      </div>
    </MainLayout>
  );
};

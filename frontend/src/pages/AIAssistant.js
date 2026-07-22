import React, { useState, useEffect, useRef } from 'react';
import { MainLayout } from '../components/MainLayout';
import { apiClient } from '../utils/api';
import { Bot, Send, Sparkles, Trash2, Plus, User as UserIcon } from 'lucide-react';
import { AI } from '../constants/testIds';

const MODELS = [
  { value: 'gpt-5.2', label: 'GPT-5.2 (OpenAI)' },
  { value: 'gpt-5.4', label: 'GPT-5.4 (OpenAI)' },
  { value: 'gpt-4.1', label: 'GPT-4.1 (OpenAI)' },
  { value: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6 (Anthropic)' },
  { value: 'claude-sonnet-4-5-20250929', label: 'Claude Sonnet 4.5 (Anthropic)' },
];

export const AIAssistant = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [selectedModel, setSelectedModel] = useState('gpt-5.2');
  const [conversationId, setConversationId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [conversations, setConversations] = useState([]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchConversations = async () => {
    try {
      const response = await apiClient.get('/ai/conversations');
      setConversations(response.data.conversations || []);
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    }
  };

  const loadConversation = async (convId) => {
    try {
      const response = await apiClient.get(`/ai/conversations/${convId}`);
      setMessages(response.data.messages || []);
      setConversationId(convId);
      setSelectedModel(response.data.model || 'gpt-5.2');
    } catch (error) {
      console.error('Failed to load conversation:', error);
    }
  };

  const newConversation = () => {
    setMessages([]);
    setConversationId(null);
  };

  const deleteConversation = async (convId, e) => {
    e.stopPropagation();
    try {
      await apiClient.delete(`/ai/conversations/${convId}`);
      if (conversationId === convId) newConversation();
      fetchConversations();
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setInput('');
    setLoading(true);

    try {
      const response = await apiClient.post('/ai/message', {
        message: userMessage,
        model: selectedModel,
        conversation_id: conversationId
      });

      setMessages((prev) => [...prev, { role: 'assistant', content: response.data.response }]);
      if (!conversationId) {
        setConversationId(response.data.conversation_id);
        fetchConversations();
      }
    } catch (error) {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Error: ' + (error.response?.data?.detail || 'Failed to get response') }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="flex h-[calc(100vh-8rem)] gap-4">
        {/* Conversation List */}
        <div className="hidden lg:flex w-72 flex-col rounded-xl border border-border bg-surface">
          <div className="border-b border-border p-4">
            <button
              onClick={newConversation}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-accent-hover transition-colors"
              data-testid="new-conversation-button"
            >
              <Plus className="h-4 w-4" />
              New Chat
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {conversations.length === 0 ? (
              <p className="p-4 text-center text-sm text-muted-foreground">No conversations yet</p>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv.conversation_id}
                  onClick={() => loadConversation(conv.conversation_id)}
                  className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                    conversationId === conv.conversation_id ? 'bg-primary/10' : 'hover:bg-surface-elevated'
                  }`}
                >
                  <p className="text-sm text-foreground truncate flex-1">{conv.title || 'New Chat'}</p>
                  <button
                    onClick={(e) => deleteConversation(conv.conversation_id, e)}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col rounded-xl border border-border bg-surface">
          <div className="flex items-center justify-between border-b border-border p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-foreground">AI Assistant</h2>
                <p className="text-xs text-muted-foreground">Powered by {selectedModel}</p>
              </div>
            </div>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
              data-testid="ai-model-selector"
            >
              {MODELS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <Bot className="mx-auto h-16 w-16 text-muted-foreground" />
                  <h3 className="mt-4 text-xl font-semibold text-foreground">How can I help you today?</h3>
                  <p className="mt-2 text-muted-foreground">Ask me anything about your business.</p>
                  <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3 max-w-lg mx-auto">
                    {[
                      'Summarize this week\'s tasks',
                      'Analyze my client portfolio',
                      'Draft a project proposal',
                      'Generate a business report'
                    ].map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => setInput(suggestion)}
                        className="rounded-lg border border-border bg-surface px-4 py-3 text-left text-sm text-foreground hover:border-primary/50 hover:bg-surface-elevated transition-colors"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`} data-testid={AI.chatMessage}>
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                    msg.role === 'user' ? 'bg-primary' : 'bg-primary/10'
                  }`}>
                    {msg.role === 'user' ? (
                      <UserIcon className="h-4 w-4 text-white" />
                    ) : (
                      <Sparkles className="h-4 w-4 text-primary" />
                    )}
                  </div>
                  <div className={`max-w-2xl rounded-xl px-4 py-3 ${
                    msg.role === 'user' ? 'bg-primary text-white' : 'bg-surface-elevated text-foreground'
                  }`}>
                    <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                  </div>
                </div>
              ))
            )}
            {loading && (
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                <div className="rounded-xl bg-surface-elevated px-4 py-3">
                  <div className="flex gap-1">
                    <span className="h-2 w-2 rounded-full bg-primary animate-pulse"></span>
                    <span className="h-2 w-2 rounded-full bg-primary animate-pulse" style={{ animationDelay: '150ms' }}></span>
                    <span className="h-2 w-2 rounded-full bg-primary animate-pulse" style={{ animationDelay: '300ms' }}></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={sendMessage} className="border-t border-border p-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask me anything..."
                disabled={loading}
                data-testid={AI.chatInput}
                className="flex-1 rounded-lg border border-input bg-background px-4 py-3 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                data-testid={AI.chatSend}
                className="rounded-lg bg-primary px-4 py-3 text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
              >
                <Send className="h-5 w-5" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </MainLayout>
  );
};

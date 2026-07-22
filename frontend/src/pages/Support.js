import React, { useState, useEffect } from 'react';
import { MainLayout } from '../components/MainLayout';
import { apiClient } from '../utils/api';
import { PageHeader, StatCard, EmptyState, Modal, Input, Select, Textarea, Button, Badge } from '../components/ui-kit';
import { HeadphonesIcon, Plus, BookOpen, AlertCircle, CheckCircle, Clock, Ticket as TicketIcon } from 'lucide-react';

const PRIORITY = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

const STATUS = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'pending', label: 'Pending' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
];

export const Support = () => {
  const [tab, setTab] = useState('tickets');
  const [tickets, setTickets] = useState([]);
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [showArticleModal, setShowArticleModal] = useState(false);
  const [editingTicket, setEditingTicket] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [ticketForm, setTicketForm] = useState({ title: '', description: '', category: '', priority: 'medium', status: 'open' });
  const [articleForm, setArticleForm] = useState({ title: '', content: '', category: 'general' });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [t, a] = await Promise.all([
        apiClient.get('/tickets'),
        apiClient.get('/kb-articles'),
      ]);
      setTickets(t.data.tickets || []);
      setArticles(a.data.articles || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const createTicket = async (e) => {
    e.preventDefault();
    setError(''); setSubmitting(true);
    try {
      await apiClient.post('/tickets', ticketForm);
      setShowTicketModal(false);
      setTicketForm({ title: '', description: '', category: '', priority: 'medium', status: 'open' });
      fetchData();
    } catch (err) {
      const d = err.response?.data?.detail;
      setError(typeof d === 'string' ? d : 'Failed to create ticket');
    } finally { setSubmitting(false); }
  };

  const createArticle = async (e) => {
    e.preventDefault();
    setError(''); setSubmitting(true);
    try {
      await apiClient.post('/kb-articles', articleForm);
      setShowArticleModal(false);
      setArticleForm({ title: '', content: '', category: 'general' });
      fetchData();
    } catch (err) {
      const d = err.response?.data?.detail;
      setError(typeof d === 'string' ? d : 'Failed to create article');
    } finally { setSubmitting(false); }
  };

  const updateTicket = async (e) => {
    e.preventDefault();
    setError(''); setSubmitting(true);
    try {
      await apiClient.put(`/tickets/${editingTicket.ticket_id}`, {
        status: editingTicket.status,
        priority: editingTicket.priority,
        category: editingTicket.category,
      });
      setEditingTicket(null);
      fetchData();
    } catch (err) {
      setError('Failed to update');
    } finally { setSubmitting(false); }
  };

  const priorityVariant = (p) => ({ low: 'default', medium: 'info', high: 'warning', critical: 'error' })[p] || 'default';
  const statusVariant = (s) => ({ open: 'warning', in_progress: 'info', resolved: 'success', closed: 'default', pending: 'warning' })[s] || 'default';

  const stats = {
    open: tickets.filter(t => t.status === 'open').length,
    inProgress: tickets.filter(t => t.status === 'in_progress').length,
    resolved: tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length,
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Customer Support"
          description="Manage tickets, knowledge base, and customer inquiries"
          action={
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setShowArticleModal(true)} data-testid="create-article-button">
                <BookOpen className="mr-2 inline h-5 w-5" /> New Article
              </Button>
              <Button onClick={() => setShowTicketModal(true)} data-testid="create-ticket-button">
                <Plus className="mr-2 inline h-5 w-5" /> New Ticket
              </Button>
            </div>
          }
        />

        <div className="bento-grid">
          <StatCard title="Total Tickets" value={tickets.length} icon={TicketIcon} testId="stat-total-tickets" />
          <StatCard title="Open" value={stats.open} icon={AlertCircle} testId="stat-open-tickets" />
          <StatCard title="In Progress" value={stats.inProgress} icon={Clock} testId="stat-progress-tickets" />
          <StatCard title="Resolved" value={stats.resolved} icon={CheckCircle} testId="stat-resolved-tickets" />
        </div>

        <div className="border-b border-border">
          <div className="flex gap-8">
            {['tickets', 'knowledge_base'].map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`border-b-2 pb-3 text-sm font-medium capitalize transition-colors ${
                  tab === t ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
                data-testid={`support-tab-${t}`}
              >
                {t.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div></div>
        ) : tab === 'tickets' ? (
          tickets.length === 0 ? (
            <EmptyState icon={TicketIcon} title="No tickets yet" description="Create your first support ticket" />
          ) : (
            <div className="rounded-xl border border-border bg-surface overflow-hidden" data-testid="tickets-list">
              <table className="w-full data-table">
                <thead className="bg-surface-elevated border-b border-border">
                  <tr>
                    <th className="px-6 py-3 text-left">Title</th>
                    <th className="px-6 py-3 text-left">Priority</th>
                    <th className="px-6 py-3 text-left">Status</th>
                    <th className="px-6 py-3 text-left">Created</th>
                    <th className="px-6 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((t) => (
                    <tr key={t.ticket_id} className="border-b border-border hover:bg-surface-elevated transition-colors" data-testid="ticket-row">
                      <td className="px-6 py-4">
                        <p className="font-medium text-foreground">{t.title}</p>
                        {t.description && <p className="text-xs text-muted-foreground line-clamp-1">{t.description}</p>}
                      </td>
                      <td className="px-6 py-4"><Badge variant={priorityVariant(t.priority)}>{t.priority}</Badge></td>
                      <td className="px-6 py-4"><Badge variant={statusVariant(t.status)}>{t.status.replace('_', ' ')}</Badge></td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">{new Date(t.created_at).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => setEditingTicket({ ...t })}
                          className="rounded px-3 py-1 text-sm text-primary hover:bg-primary/10 transition-colors"
                          data-testid={`edit-ticket-${t.ticket_id}`}
                        >
                          Manage
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          articles.length === 0 ? (
            <EmptyState icon={BookOpen} title="No articles yet" description="Create knowledge base articles to help customers" />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" data-testid="articles-list">
              {articles.map((a) => (
                <div key={a.article_id} className="rounded-xl border border-border bg-surface p-6 card-hover" data-testid="article-card">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-primary" />
                    <Badge>{a.category}</Badge>
                  </div>
                  <h3 className="mt-3 font-semibold text-foreground">{a.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground line-clamp-3">{a.content?.replace(/<[^>]*>/g, '').slice(0, 120)}</p>
                  <p className="mt-4 text-xs text-muted-foreground">{a.views || 0} views</p>
                </div>
              ))}
            </div>
          )
        )}

        <Modal open={showTicketModal} onClose={() => setShowTicketModal(false)} title="Create Support Ticket" size="lg">
          {error && <div className="mt-4 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
          <form onSubmit={createTicket} className="mt-6 space-y-4">
            <Input label="Title" required value={ticketForm.title} onChange={(e) => setTicketForm({ ...ticketForm, title: e.target.value })} data-testid="ticket-title-input" />
            <Textarea label="Description" rows={4} required value={ticketForm.description} onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })} data-testid="ticket-description-input" />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Category" value={ticketForm.category} onChange={(e) => setTicketForm({ ...ticketForm, category: e.target.value })} placeholder="Billing, Tech, etc." />
              <Select label="Priority" value={ticketForm.priority} onChange={(e) => setTicketForm({ ...ticketForm, priority: e.target.value })} options={PRIORITY} />
            </div>
            <div className="flex gap-3 pt-4">
              <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowTicketModal(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting} className="flex-1" data-testid="submit-ticket-button">
                {submitting ? 'Creating...' : 'Create Ticket'}
              </Button>
            </div>
          </form>
        </Modal>

        <Modal open={showArticleModal} onClose={() => setShowArticleModal(false)} title="Create Article" size="lg">
          {error && <div className="mt-4 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
          <form onSubmit={createArticle} className="mt-6 space-y-4">
            <Input label="Title" required value={articleForm.title} onChange={(e) => setArticleForm({ ...articleForm, title: e.target.value })} data-testid="article-title-input" />
            <Input label="Category" value={articleForm.category} onChange={(e) => setArticleForm({ ...articleForm, category: e.target.value })} />
            <Textarea label="Content" rows={6} required value={articleForm.content} onChange={(e) => setArticleForm({ ...articleForm, content: e.target.value })} data-testid="article-content-input" />
            <div className="flex gap-3 pt-4">
              <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowArticleModal(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting} className="flex-1" data-testid="submit-article-button">
                {submitting ? 'Publishing...' : 'Publish Article'}
              </Button>
            </div>
          </form>
        </Modal>

        {editingTicket && (
          <Modal open={!!editingTicket} onClose={() => setEditingTicket(null)} title={`Ticket: ${editingTicket.title}`}>
            <form onSubmit={updateTicket} className="mt-6 space-y-4">
              <div className="rounded-lg border border-border bg-background p-4">
                <p className="text-sm text-muted-foreground">{editingTicket.description}</p>
              </div>
              <Select label="Status" value={editingTicket.status} onChange={(e) => setEditingTicket({ ...editingTicket, status: e.target.value })} options={STATUS} data-testid="edit-ticket-status" />
              <Select label="Priority" value={editingTicket.priority} onChange={(e) => setEditingTicket({ ...editingTicket, priority: e.target.value })} options={PRIORITY} data-testid="edit-ticket-priority" />
              <div className="flex gap-3 pt-4">
                <Button type="button" variant="secondary" className="flex-1" onClick={() => setEditingTicket(null)}>Cancel</Button>
                <Button type="submit" disabled={submitting} className="flex-1" data-testid="save-ticket-button">
                  {submitting ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </form>
          </Modal>
        )}
      </div>
    </MainLayout>
  );
};

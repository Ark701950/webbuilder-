import React, { useState, useEffect } from 'react';
import { MainLayout } from '../components/MainLayout';
import { apiClient } from '../utils/api';
import { PageHeader, StatCard, EmptyState, Modal, Input, Select, Textarea, Button, Badge } from '../components/ui-kit';
import { useAuth } from '../context/AuthContext';
import { Crown, Target, CheckSquare, TrendingUp, DollarSign, Users, Briefcase, Sparkles, Plus, Trash2, Shield, Building2 } from 'lucide-react';

const CATEGORIES = [
  { value: 'growth', label: 'Growth' },
  { value: 'revenue', label: 'Revenue' },
  { value: 'product', label: 'Product' },
  { value: 'team', label: 'Team' },
  { value: 'general', label: 'General' },
];

const STRATEGY_STATUS = [
  { value: 'planning', label: 'Planning' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'achieved', label: 'Achieved' },
  { value: 'paused', label: 'Paused' },
];

export const FounderOffice = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState('overview');
  const [overview, setOverview] = useState({});
  const [strategy, setStrategy] = useState([]);
  const [checklist, setChecklist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showStratModal, setShowStratModal] = useState(false);
  const [newTask, setNewTask] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [aiInsight, setAiInsight] = useState('');
  const [gettingInsight, setGettingInsight] = useState(false);
  const [stratForm, setStratForm] = useState({ title: '', description: '', category: 'growth', status: 'planning', priority: 'high', target_date: '' });

  const isFounder = user?.role === 'owner' || user?.role === 'admin';

  useEffect(() => { if (isFounder) fetchData(); else setLoading(false); }, [isFounder]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [o, s, c] = await Promise.all([
        apiClient.get('/founder/overview'),
        apiClient.get('/strategy'),
        apiClient.get('/checklist'),
      ]);
      setOverview(o.data || {});
      setStrategy(s.data.strategy_items || []);
      setChecklist(c.data.items || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const createStrategy = async (e) => {
    e.preventDefault();
    setError(''); setSubmitting(true);
    try {
      await apiClient.post('/strategy', stratForm);
      setShowStratModal(false);
      setStratForm({ title: '', description: '', category: 'growth', status: 'planning', priority: 'high', target_date: '' });
      fetchData();
    } catch (err) {
      const d = err.response?.data?.detail;
      setError(typeof d === 'string' ? d : 'Failed to create strategy');
    } finally { setSubmitting(false); }
  };

  const addTask = async (e) => {
    e.preventDefault();
    if (!newTask.trim()) return;
    try {
      await apiClient.post('/checklist', { title: newTask.trim(), completed: false, priority: 'medium' });
      setNewTask('');
      fetchData();
    } catch (err) { console.error(err); }
  };

  const toggleTask = async (item) => {
    try {
      await apiClient.put(`/checklist/${item.item_id}`, { completed: !item.completed });
      fetchData();
    } catch (err) { console.error(err); }
  };

  const deleteTask = async (itemId) => {
    try {
      await apiClient.delete(`/checklist/${itemId}`);
      fetchData();
    } catch (err) { console.error(err); }
  };

  const getAIInsight = async () => {
    setGettingInsight(true);
    setAiInsight('');
    try {
      const prompt = `Analyze this business: ${overview.total_clients} clients, ${overview.active_projects} active projects, ${overview.total_employees} employees, $${overview.total_income} income, $${overview.total_expense} expenses, ${overview.open_tickets} open tickets. Health score: ${overview.company_health_score}/100. Provide 3 strategic recommendations in 4-5 sentences.`;
      const res = await apiClient.post('/ai/message', { message: prompt, model: 'gpt-5.2' });
      setAiInsight(res.data.response);
    } catch (err) {
      setAiInsight('Unable to generate insights. Please try again.');
    } finally { setGettingInsight(false); }
  };

  const fmt = (n) => `$${(n || 0).toLocaleString()}`;

  if (!isFounder) {
    return (
      <MainLayout>
        <EmptyState icon={Shield} title="Founder Access Only" description="This is a restricted area for executives and owners." />
      </MainLayout>
    );
  }

  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-surface to-surface p-8 animate-fade-in">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Crown className="h-6 w-6 text-primary" />
                <span className="text-sm font-medium text-primary">Founder Office</span>
              </div>
              <h1 className="mt-3 text-4xl font-bold text-foreground">{greeting}, {user?.name?.split(' ')[0]}</h1>
              <p className="mt-2 text-muted-foreground">
                {now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
              <p className="mt-4 text-muted-foreground max-w-2xl">
                Welcome to your command center. Today you have <span className="font-semibold text-foreground">{overview.active_projects || 0} active projects</span>,{' '}
                <span className="font-semibold text-foreground">{overview.open_tickets || 0} open tickets</span>, and your business health score is{' '}
                <span className="font-semibold text-primary">{overview.company_health_score || 0}/100</span>.
              </p>
            </div>
            <div className="hidden md:flex flex-col items-end">
              <div className="rounded-full border-4 border-primary/30 p-1">
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary text-3xl font-bold text-white">
                  {overview.company_health_score || 0}
                </div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Health Score</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div></div>
        ) : (
          <>
            <div className="bento-grid">
              <StatCard title="Net Worth" value={fmt(overview.net_worth)} icon={DollarSign} color="success" />
              <StatCard title="Valuation Est." value={fmt(overview.valuation_estimate)} icon={TrendingUp} color="primary" />
              <StatCard title="Total Clients" value={overview.total_clients || 0} icon={Building2} />
              <StatCard title="Team Size" value={overview.total_employees || 0} icon={Users} />
            </div>

            <div className="border-b border-border">
              <div className="flex gap-8">
                {['overview', 'strategy', 'checklist', 'ai_insights'].map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`border-b-2 pb-3 text-sm font-medium capitalize transition-colors ${
                      tab === t ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                    data-testid={`founder-tab-${t}`}
                  >
                    {t.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {tab === 'overview' && (
              <div className="grid gap-6 md:grid-cols-2">
                <div className="rounded-xl border border-border bg-surface p-6">
                  <h3 className="font-semibold text-foreground">Business Snapshot</h3>
                  <div className="mt-4 space-y-3">
                    {[
                      { label: 'Revenue', value: fmt(overview.total_income), color: 'text-success' },
                      { label: 'Expenses', value: fmt(overview.total_expense), color: 'text-destructive' },
                      { label: 'Net Profit', value: fmt(overview.net_worth), color: 'text-primary' },
                      { label: 'Active Projects', value: overview.active_projects || 0 },
                      { label: 'Open Support Tickets', value: overview.open_tickets || 0 },
                    ].map((it) => (
                      <div key={it.label} className="flex justify-between border-b border-border pb-2 last:border-0">
                        <span className="text-sm text-muted-foreground">{it.label}</span>
                        <span className={`font-mono font-semibold ${it.color || 'text-foreground'}`}>{it.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-xl border border-border bg-surface p-6">
                  <h3 className="font-semibold text-foreground">Company Details</h3>
                  <div className="mt-4 space-y-3">
                    <div className="flex justify-between border-b border-border pb-2">
                      <span className="text-sm text-muted-foreground">Company</span>
                      <span className="text-sm font-medium text-foreground">WebBuilder</span>
                    </div>
                    <div className="flex justify-between border-b border-border pb-2">
                      <span className="text-sm text-muted-foreground">Founder</span>
                      <span className="text-sm font-medium text-foreground">Ark Dwivedi</span>
                    </div>
                    <div className="flex justify-between border-b border-border pb-2">
                      <span className="text-sm text-muted-foreground">Co-Founder</span>
                      <span className="text-sm font-medium text-foreground">Utkarsh Mishra</span>
                    </div>
                    <div className="flex justify-between border-b border-border pb-2">
                      <span className="text-sm text-muted-foreground">Contact</span>
                      <span className="text-sm font-medium text-foreground">webbuilder.teampvt@gmail.com</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {tab === 'strategy' && (
              <div className="space-y-4">
                <div className="flex justify-end">
                  <Button onClick={() => setShowStratModal(true)} data-testid="create-strategy-button">
                    <Plus className="mr-2 inline h-5 w-5" /> New Strategy
                  </Button>
                </div>
                {strategy.length === 0 ? (
                  <EmptyState icon={Target} title="No strategy items yet" description="Define strategic goals to drive your business forward" />
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {strategy.map((s) => (
                      <div key={s.strategy_id} className="rounded-xl border border-border bg-surface p-6 card-hover" data-testid="strategy-card">
                        <div className="flex items-start justify-between">
                          <Target className="h-6 w-6 text-primary" />
                          <Badge variant={s.status === 'achieved' ? 'success' : s.status === 'in_progress' ? 'info' : 'default'}>{s.status.replace('_', ' ')}</Badge>
                        </div>
                        <h3 className="mt-4 font-semibold text-foreground">{s.title}</h3>
                        {s.description && <p className="mt-2 text-sm text-muted-foreground">{s.description}</p>}
                        <div className="mt-4 flex gap-2">
                          <Badge>{s.category}</Badge>
                          <Badge variant={s.priority === 'high' ? 'error' : 'default'}>{s.priority}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {tab === 'checklist' && (
              <div className="rounded-xl border border-border bg-surface p-6">
                <form onSubmit={addTask} className="flex gap-2">
                  <input
                    type="text"
                    value={newTask}
                    onChange={(e) => setNewTask(e.target.value)}
                    placeholder="Add a task..."
                    className="flex-1 rounded-lg border border-input bg-background px-4 py-2.5 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    data-testid="new-task-input"
                  />
                  <Button type="submit" data-testid="add-task-button">
                    <Plus className="h-5 w-5" />
                  </Button>
                </form>
                <div className="mt-6 space-y-2" data-testid="checklist-list">
                  {checklist.length === 0 ? (
                    <p className="text-center text-sm text-muted-foreground py-8">Your checklist is empty. Add a task to get started!</p>
                  ) : (
                    checklist.map((item) => (
                      <div key={item.item_id} className="group flex items-center gap-3 rounded-lg border border-border p-3 hover:bg-surface-elevated transition-colors" data-testid="checklist-item">
                        <input
                          type="checkbox"
                          checked={item.completed}
                          onChange={() => toggleTask(item)}
                          className="h-5 w-5 rounded border-input accent-indigo-500 cursor-pointer"
                          data-testid={`toggle-task-${item.item_id}`}
                        />
                        <span className={`flex-1 text-sm ${item.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                          {item.title}
                        </span>
                        <button
                          onClick={() => deleteTask(item.item_id)}
                          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                          data-testid={`delete-task-${item.item_id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {tab === 'ai_insights' && (
              <div className="rounded-xl border border-border bg-surface p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Sparkles className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">AI Executive Insights</h3>
                      <p className="text-xs text-muted-foreground">Powered by GPT-5.2</p>
                    </div>
                  </div>
                  <Button onClick={getAIInsight} disabled={gettingInsight} data-testid="get-ai-insight-button">
                    {gettingInsight ? 'Analyzing...' : 'Generate Insights'}
                  </Button>
                </div>
                {aiInsight ? (
                  <div className="mt-6 rounded-lg border border-primary/20 bg-primary/5 p-6" data-testid="ai-insight-content">
                    <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{aiInsight}</p>
                  </div>
                ) : (
                  <p className="mt-6 text-sm text-muted-foreground text-center py-8">
                    Click "Generate Insights" to get AI-powered strategic recommendations based on your business data.
                  </p>
                )}
              </div>
            )}
          </>
        )}

        <Modal open={showStratModal} onClose={() => setShowStratModal(false)} title="New Strategy Item" size="lg">
          {error && <div className="mt-4 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
          <form onSubmit={createStrategy} className="mt-6 space-y-4">
            <Input label="Title" required value={stratForm.title} onChange={(e) => setStratForm({ ...stratForm, title: e.target.value })} data-testid="strategy-title-input" />
            <Textarea label="Description" rows={3} value={stratForm.description} onChange={(e) => setStratForm({ ...stratForm, description: e.target.value })} />
            <div className="grid grid-cols-2 gap-4">
              <Select label="Category" value={stratForm.category} onChange={(e) => setStratForm({ ...stratForm, category: e.target.value })} options={CATEGORIES} />
              <Select label="Status" value={stratForm.status} onChange={(e) => setStratForm({ ...stratForm, status: e.target.value })} options={STRATEGY_STATUS} />
            </div>
            <Input label="Target Date" type="date" value={stratForm.target_date} onChange={(e) => setStratForm({ ...stratForm, target_date: e.target.value })} />
            <div className="flex gap-3 pt-4">
              <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowStratModal(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting} className="flex-1" data-testid="submit-strategy-button">
                {submitting ? 'Creating...' : 'Create Strategy'}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </MainLayout>
  );
};

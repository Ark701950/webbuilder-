import React, { useState, useEffect } from 'react';
import { MainLayout } from '../components/MainLayout';
import { apiClient } from '../utils/api';
import { PageHeader, StatCard } from '../components/ui-kit';
import { BarChart3, TrendingUp, DollarSign, Users, Briefcase, CheckSquare, Building2 } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts';

const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#6366F1'];

export const Analytics = () => {
  const [stats, setStats] = useState({});
  const [finance, setFinance] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [s, f] = await Promise.all([
        apiClient.get('/dashboard/stats'),
        apiClient.get('/finance/summary').catch(() => ({ data: {} })),
      ]);
      setStats(s.data || {});
      setFinance(f.data || {});
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  // Mock trend data (in production, this would come from time-series API)
  const revenueData = [
    { month: 'Jan', revenue: 12000, expense: 8000 },
    { month: 'Feb', revenue: 15000, expense: 9500 },
    { month: 'Mar', revenue: 18000, expense: 10000 },
    { month: 'Apr', revenue: 22000, expense: 12000 },
    { month: 'May', revenue: 25000, expense: 13500 },
    { month: 'Jun', revenue: 28000, expense: 15000 },
  ];

  const projectStatusData = [
    { name: 'Active', value: stats.active_projects || 0 },
    { name: 'Completed', value: Math.max((stats.total_projects || 0) - (stats.active_projects || 0), 0) },
  ];

  const taskData = [
    { name: 'Pending', tasks: stats.pending_tasks || 0 },
    { name: 'Completed', tasks: Math.max((stats.total_tasks || 0) - (stats.pending_tasks || 0), 0) },
  ];

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader title="Analytics" description="Business intelligence and performance metrics" />

        <div className="bento-grid">
          <StatCard title="Revenue" value={`$${(finance.total_income || 0).toLocaleString()}`} icon={DollarSign} trend="+15%" />
          <StatCard title="Clients" value={stats.total_clients || 0} icon={Building2} trend="+8%" />
          <StatCard title="Projects" value={stats.total_projects || 0} icon={Briefcase} trend="+12%" />
          <StatCard title="Tasks" value={stats.total_tasks || 0} icon={CheckSquare} />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-border bg-surface p-6" data-testid="revenue-chart">
            <h3 className="font-semibold text-foreground">Revenue & Expenses (6 months)</h3>
            <p className="text-sm text-muted-foreground">Trend analysis</p>
            <ResponsiveContainer width="100%" height={280} className="mt-4">
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272A" />
                <XAxis dataKey="month" stroke="#A1A1AA" />
                <YAxis stroke="#A1A1AA" />
                <Tooltip contentStyle={{ background: '#141418', border: '1px solid #27272A', borderRadius: '8px' }} />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="#10B981" strokeWidth={2} />
                <Line type="monotone" dataKey="expense" stroke="#EF4444" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-xl border border-border bg-surface p-6" data-testid="tasks-chart">
            <h3 className="font-semibold text-foreground">Task Distribution</h3>
            <p className="text-sm text-muted-foreground">Pending vs. Completed</p>
            <ResponsiveContainer width="100%" height={280} className="mt-4">
              <BarChart data={taskData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272A" />
                <XAxis dataKey="name" stroke="#A1A1AA" />
                <YAxis stroke="#A1A1AA" />
                <Tooltip contentStyle={{ background: '#141418', border: '1px solid #27272A', borderRadius: '8px' }} />
                <Bar dataKey="tasks" fill="#4F46E5" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-xl border border-border bg-surface p-6" data-testid="projects-chart">
            <h3 className="font-semibold text-foreground">Project Status</h3>
            <p className="text-sm text-muted-foreground">Active vs. Completed</p>
            <ResponsiveContainer width="100%" height={280} className="mt-4">
              <PieChart>
                <Pie
                  data={projectStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {projectStatusData.map((entry, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: '#141418', border: '1px solid #27272A', borderRadius: '8px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-xl border border-border bg-surface p-6">
            <h3 className="font-semibold text-foreground">Key Performance Indicators</h3>
            <div className="mt-4 space-y-4">
              {[
                { label: 'Revenue Growth', value: '+15%', color: 'text-success' },
                { label: 'Client Retention', value: '92%', color: 'text-primary' },
                { label: 'Task Completion', value: `${stats.total_tasks ? Math.round(((stats.total_tasks - stats.pending_tasks) / stats.total_tasks) * 100) : 0}%`, color: 'text-primary' },
                { label: 'Team Productivity', value: '87%', color: 'text-success' },
                { label: 'Profit Margin', value: `${finance.total_income ? Math.round((finance.net_profit / finance.total_income) * 100) : 0}%`, color: 'text-primary' },
              ].map((kpi) => (
                <div key={kpi.label} className="flex items-center justify-between border-b border-border pb-3 last:border-0">
                  <span className="text-sm text-muted-foreground">{kpi.label}</span>
                  <span className={`text-lg font-bold font-mono ${kpi.color}`}>{kpi.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

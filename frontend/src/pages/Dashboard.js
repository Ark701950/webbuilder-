import React, { useEffect, useState } from 'react';
import { MainLayout } from '../components/MainLayout';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../utils/api';
import { DASHBOARD } from '../constants/testIds';
import { Users, Briefcase, CheckSquare, TrendingUp, Plus, Building2, FileText } from 'lucide-react';

const StatCard = ({ title, value, icon: Icon, trend, testId }) => (
  <div 
    className="rounded-xl border border-border bg-surface p-6 card-hover animate-fade-in"
    data-testid={testId}
  >
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <p className="mt-2 text-3xl font-bold text-foreground">{value}</p>
        {trend && (
          <p className="mt-2 flex items-center gap-1 text-sm text-success">
            <TrendingUp className="h-4 w-4" />
            {trend}
          </p>
        )}
      </div>
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
        <Icon className="h-6 w-6 text-primary" />
      </div>
    </div>
  </div>
);

const QuickAction = ({ title, description, icon: Icon, onClick }) => (
  <button
    onClick={onClick}
    className="flex items-start gap-4 rounded-lg border border-border bg-surface p-4 text-left transition-colors hover:border-primary/50 hover:bg-surface-elevated"
  >
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
      <Icon className="h-5 w-5 text-primary" />
    </div>
    <div>
      <p className="font-medium text-foreground">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  </button>
);

export const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    total_clients: 0,
    total_projects: 0,
    active_projects: 0,
    total_tasks: 0,
    pending_tasks: 0,
    total_employees: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await apiClient.get('/dashboard/stats');
        setStats(response.data);
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const quickActions = [
    { title: 'New Client', description: 'Add a new client to CRM', icon: Building2 },
    { title: 'New Project', description: 'Start a new project', icon: Briefcase },
    { title: 'Create Task', description: 'Add a task to your board', icon: CheckSquare },
    { title: 'New Document', description: 'Create a new document', icon: FileText },
  ];

  return (
    <MainLayout>
      <div className="space-y-6" data-testid={DASHBOARD.container}>
        {/* Welcome Section */}
        <div className="animate-fade-in" data-testid={DASHBOARD.welcomeMessage}>
          <h1 className="text-4xl font-bold text-foreground">
            Welcome back, {user?.name?.split(' ')[0] || 'User'} 👋
          </h1>
          <p className="mt-2 text-muted-foreground">
            Here's what's happening with your business today.
          </p>
        </div>

        {/* Stats Grid */}
        {loading ? (
          <div className="grid gap-6 md:grid-cols-3 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 animate-pulse rounded-xl bg-surface-elevated"></div>
            ))}
          </div>
        ) : (
          <div className="bento-grid">
            <StatCard
              title="Total Clients"
              value={stats.total_clients}
              icon={Users}
              trend="+12% this month"
              testId="stat-clients"
            />
            <StatCard
              title="Active Projects"
              value={stats.active_projects}
              icon={Briefcase}
              trend="+8% this month"
              testId="stat-projects"
            />
            <StatCard
              title="Pending Tasks"
              value={stats.pending_tasks}
              icon={CheckSquare}
              testId="stat-tasks"
            />
            <StatCard
              title="Team Members"
              value={stats.total_employees}
              icon={Users}
              testId="stat-employees"
            />
          </div>
        )}

        {/* Quick Actions */}
        <div data-testid={DASHBOARD.quickActions}>
          <h2 className="mb-4 text-xl font-semibold text-foreground">Quick Actions</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {quickActions.map((action, index) => (
              <QuickAction key={index} {...action} onClick={() => {}} />
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <h2 className="mb-4 text-xl font-semibold text-foreground">Recent Activity</h2>
          <div className="rounded-xl border border-border bg-surface p-6">
            <div className="space-y-4">
              {[1, 2, 3].map((item) => (
                <div key={item} className="flex items-center gap-4 border-b border-border pb-4 last:border-0">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">Activity {item}</p>
                    <p className="text-sm text-muted-foreground">2 hours ago</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

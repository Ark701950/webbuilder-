import React, { useState, useEffect } from 'react';
import { MainLayout } from '../components/MainLayout';
import { apiClient } from '../utils/api';
import { PageHeader, StatCard, EmptyState, Modal, Input, Select, Button, Badge } from '../components/ui-kit';
import { useAuth } from '../context/AuthContext';
import { Users, Shield, Building2, Database, UserCog, UserX, RefreshCw } from 'lucide-react';

const ROLES = [
  { value: 'user', label: 'User' },
  { value: 'employee', label: 'Employee' },
  { value: 'team_lead', label: 'Team Lead' },
  { value: 'manager', label: 'Manager' },
  { value: 'admin', label: 'Admin' },
  { value: 'owner', label: 'Owner' },
];

const STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'suspended', label: 'Suspended' },
];

export const Admin = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, statsRes] = await Promise.all([
        apiClient.get('/users'),
        apiClient.get('/admin/stats'),
      ]);
      setUsers(usersRes.data.users || []);
      setStats(statsRes.data || {});
    } catch (error) {
      console.error('Failed to fetch admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await apiClient.put(`/admin/users/${editingUser.user_id}`, {
        role: editingUser.role,
        status: editingUser.status,
        name: editingUser.name,
      });
      setEditingUser(null);
      fetchData();
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Failed to update user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSuspend = async (userId) => {
    if (!window.confirm('Are you sure you want to suspend this user?')) return;
    try {
      await apiClient.delete(`/admin/users/${userId}`);
      fetchData();
    } catch (err) {
      alert('Failed: ' + (err.response?.data?.detail || err.message));
    }
  };

  const isAdmin = user?.role === 'owner' || user?.role === 'admin';

  if (!isAdmin) {
    return (
      <MainLayout>
        <EmptyState icon={Shield} title="Access Denied" description="You need admin privileges to access this page." />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6" data-testid="admin-panel">
        <PageHeader title="Admin Portal" description="Manage users, roles, permissions, and system settings" />

        <div className="bento-grid">
          <StatCard title="Total Users" value={stats.total_users || 0} icon={Users} />
          <StatCard title="Active Users" value={stats.active_users || 0} icon={UserCog} />
          <StatCard title="Organizations" value={stats.total_organizations || 0} icon={Building2} />
          <StatCard title="Files Stored" value={stats.total_files || 0} icon={Database} />
        </div>

        <div className="border-b border-border">
          <div className="flex gap-8">
            {['users', 'roles', 'settings'].map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`border-b-2 pb-3 text-sm font-medium capitalize transition-colors ${
                  tab === t ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
                data-testid={`admin-tab-${t}`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {tab === 'users' && (
          <div className="rounded-xl border border-border bg-surface overflow-hidden" data-testid="admin-users-table">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
              </div>
            ) : users.length === 0 ? (
              <EmptyState icon={Users} title="No users yet" />
            ) : (
              <table className="w-full data-table">
                <thead className="bg-surface-elevated border-b border-border">
                  <tr>
                    <th className="px-6 py-3 text-left">Name</th>
                    <th className="px-6 py-3 text-left">Email</th>
                    <th className="px-6 py-3 text-left">Role</th>
                    <th className="px-6 py-3 text-left">Status</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.user_id} className="border-b border-border hover:bg-surface-elevated transition-colors" data-testid="admin-user-row">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-medium text-white">
                            {u.name?.charAt(0)?.toUpperCase() || 'U'}
                          </div>
                          <span className="font-medium text-foreground">{u.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">{u.email}</td>
                      <td className="px-6 py-4">
                        <Badge variant={u.role === 'owner' ? 'info' : 'default'}>{u.role}</Badge>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={u.status === 'active' ? 'success' : u.status === 'suspended' ? 'error' : 'warning'}>
                          {u.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setEditingUser({ ...u })}
                            className="rounded p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                            data-testid={`edit-user-${u.user_id}`}
                            title="Edit"
                          >
                            <UserCog className="h-4 w-4" />
                          </button>
                          {u.user_id !== user?.user_id && u.status !== 'suspended' && (
                            <button
                              onClick={() => handleSuspend(u.user_id)}
                              className="rounded p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                              data-testid={`suspend-user-${u.user_id}`}
                              title="Suspend"
                            >
                              <UserX className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {tab === 'roles' && (
          <div className="rounded-xl border border-border bg-surface p-6">
            <h3 className="mb-4 text-lg font-semibold text-foreground">System Roles</h3>
            <div className="space-y-3">
              {ROLES.map((role) => (
                <div key={role.value} className="flex items-center justify-between rounded-lg border border-border p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Shield className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{role.label}</p>
                      <p className="text-sm text-muted-foreground">{users.filter(u => u.role === role.value).length} users</p>
                    </div>
                  </div>
                  <Badge variant="info">{role.value}</Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'settings' && (
          <div className="rounded-xl border border-border bg-surface p-6">
            <h3 className="mb-4 text-lg font-semibold text-foreground">System Settings</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border border-border p-4">
                <div>
                  <p className="font-medium text-foreground">Organization Name</p>
                  <p className="text-sm text-muted-foreground">WebBuilder</p>
                </div>
                <Button variant="secondary" size="sm">Edit</Button>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border p-4">
                <div>
                  <p className="font-medium text-foreground">Founder</p>
                  <p className="text-sm text-muted-foreground">Ark Dwivedi</p>
                </div>
                <Badge variant="info">Owner</Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border p-4">
                <div>
                  <p className="font-medium text-foreground">Co-Founder</p>
                  <p className="text-sm text-muted-foreground">Utkarsh Mishra</p>
                </div>
                <Badge variant="info">Co-Founder</Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border p-4">
                <div>
                  <p className="font-medium text-foreground">Refresh Data</p>
                  <p className="text-sm text-muted-foreground">Reload latest statistics</p>
                </div>
                <Button variant="secondary" size="sm" onClick={fetchData}>
                  <RefreshCw className="mr-2 inline h-4 w-4" />Refresh
                </Button>
              </div>
            </div>
          </div>
        )}

        {editingUser && (
          <Modal open={!!editingUser} onClose={() => setEditingUser(null)} title="Edit User">
            {error && <div className="mt-4 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
            <form onSubmit={handleUpdateUser} className="mt-6 space-y-4">
              <Input label="Name" value={editingUser.name || ''} onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })} data-testid="edit-user-name" />
              <Input label="Email" value={editingUser.email} disabled />
              <Select label="Role" value={editingUser.role} onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })} options={ROLES} data-testid="edit-user-role" />
              <Select label="Status" value={editingUser.status || 'active'} onChange={(e) => setEditingUser({ ...editingUser, status: e.target.value })} options={STATUSES} data-testid="edit-user-status" />
              <div className="flex gap-3 pt-4">
                <Button type="button" variant="secondary" className="flex-1" onClick={() => setEditingUser(null)}>Cancel</Button>
                <Button type="submit" disabled={submitting} className="flex-1" data-testid="save-user-button">
                  {submitting ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </Modal>
        )}
      </div>
    </MainLayout>
  );
};

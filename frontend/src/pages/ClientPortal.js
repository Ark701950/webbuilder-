import React, { useState, useEffect } from 'react';
import { MainLayout } from '../components/MainLayout';
import { apiClient } from '../utils/api';
import { PageHeader, StatCard, EmptyState, Badge } from '../components/ui-kit';
import { useAuth } from '../context/AuthContext';
import { Briefcase, FileText, Receipt, TicketIcon, ExternalLink, CheckCircle } from 'lucide-react';

export const ClientPortal = () => {
  const { user } = useAuth();
  const [data, setData] = useState({ projects: [], invoices: [], tickets: [], documents: [], stats: {} });
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/client-portal/overview');
      setData(res.data || {});
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fmt = (n) => `$${(n || 0).toLocaleString()}`;

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-surface to-surface p-8 animate-fade-in">
          <div className="flex items-center gap-3">
            <Briefcase className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium text-primary">Client Portal</span>
          </div>
          <h1 className="mt-3 text-4xl font-bold text-foreground">Welcome, {user?.name?.split(' ')[0]}</h1>
          <p className="mt-2 text-muted-foreground">Access your projects, invoices, documents, and support tickets in one place.</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div></div>
        ) : (
          <>
            <div className="bento-grid">
              <StatCard title="Active Projects" value={data.stats?.active_projects || 0} icon={Briefcase} testId="portal-stat-projects" />
              <StatCard title="Pending Invoices" value={data.stats?.pending_invoices || 0} icon={Receipt} testId="portal-stat-invoices" />
              <StatCard title="Open Tickets" value={data.stats?.open_tickets || 0} icon={TicketIcon} testId="portal-stat-tickets" />
              <StatCard title="Documents" value={data.documents?.length || 0} icon={FileText} testId="portal-stat-docs" />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              {/* Projects */}
              <div className="rounded-xl border border-border bg-surface p-6" data-testid="portal-projects">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground">Your Projects</h3>
                  <Briefcase className="h-5 w-5 text-primary" />
                </div>
                {data.projects?.length === 0 ? (
                  <p className="mt-4 text-sm text-muted-foreground">No projects assigned yet</p>
                ) : (
                  <div className="mt-4 space-y-3">
                    {data.projects?.slice(0, 5).map((p) => (
                      <div key={p.project_id} className="border-b border-border pb-3 last:border-0" data-testid="portal-project-item">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-foreground">{p.name}</p>
                            <p className="text-xs text-muted-foreground line-clamp-1">{p.description || 'No description'}</p>
                          </div>
                          <Badge variant={p.status === 'active' ? 'success' : 'default'}>{p.status}</Badge>
                        </div>
                        <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                          <span>Progress: {p.progress || 0}%</span>
                          <div className="flex-1 h-1.5 rounded-full bg-surface-elevated overflow-hidden">
                            <div className="h-full bg-primary" style={{ width: `${p.progress || 0}%` }}></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Invoices */}
              <div className="rounded-xl border border-border bg-surface p-6" data-testid="portal-invoices">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground">Recent Invoices</h3>
                  <Receipt className="h-5 w-5 text-primary" />
                </div>
                {data.invoices?.length === 0 ? (
                  <p className="mt-4 text-sm text-muted-foreground">No invoices yet</p>
                ) : (
                  <div className="mt-4 space-y-3">
                    {data.invoices?.slice(0, 5).map((i) => (
                      <div key={i.invoice_id} className="flex items-center justify-between border-b border-border pb-3 last:border-0" data-testid="portal-invoice-item">
                        <div>
                          <p className="font-medium text-foreground">{i.invoice_number}</p>
                          <p className="text-xs text-muted-foreground">Due: {i.due_date}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-mono font-semibold text-foreground">{fmt(i.total_amount)}</p>
                          <Badge variant={i.payment_status === 'paid' ? 'success' : i.payment_status === 'overdue' ? 'error' : 'warning'}>
                            {i.payment_status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Tickets */}
              <div className="rounded-xl border border-border bg-surface p-6" data-testid="portal-tickets">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground">Support Tickets</h3>
                  <TicketIcon className="h-5 w-5 text-primary" />
                </div>
                {data.tickets?.length === 0 ? (
                  <p className="mt-4 text-sm text-muted-foreground">No support tickets</p>
                ) : (
                  <div className="mt-4 space-y-3">
                    {data.tickets?.slice(0, 5).map((t) => (
                      <div key={t.ticket_id} className="flex items-start justify-between border-b border-border pb-3 last:border-0" data-testid="portal-ticket-item">
                        <div className="flex-1">
                          <p className="font-medium text-foreground">{t.title}</p>
                          <p className="text-xs text-muted-foreground line-clamp-1">{t.description}</p>
                        </div>
                        <Badge variant={t.status === 'resolved' ? 'success' : t.status === 'open' ? 'warning' : 'info'}>{t.status}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Documents */}
              <div className="rounded-xl border border-border bg-surface p-6" data-testid="portal-docs">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground">Shared Documents</h3>
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                {data.documents?.length === 0 ? (
                  <p className="mt-4 text-sm text-muted-foreground">No documents shared with you</p>
                ) : (
                  <div className="mt-4 space-y-3">
                    {data.documents?.slice(0, 5).map((d) => (
                      <div key={d.doc_id} className="flex items-center justify-between border-b border-border pb-3 last:border-0" data-testid="portal-doc-item">
                        <div className="flex items-center gap-3">
                          <FileText className="h-4 w-4 text-primary" />
                          <div>
                            <p className="font-medium text-foreground">{d.title}</p>
                            <p className="text-xs text-muted-foreground">v{d.version || 1} • {d.status}</p>
                          </div>
                        </div>
                        <ExternalLink className="h-4 w-4 text-muted-foreground cursor-pointer" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
};

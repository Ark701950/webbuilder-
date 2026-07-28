import React, { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '../components/MainLayout';
import { apiClient } from '../utils/api';
import { Plus, Building2, Users, TrendingUp, Mail, Phone, Globe } from 'lucide-react';
import { CRM as CRM_TESTIDS } from '../constants/testIds';

export const CRM = () => {
  const [activeTab, setActiveTab] = useState('clients');
  const [clients, setClients] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showClientForm, setShowClientForm] = useState(false);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [clientForm, setClientForm] = useState({
    company_name: '',
    contact_person: '',
    email: '',
    phone: '',
    industry: '',
    status: 'active'
  });

 const fetchData = useCallback(async () => {
  setLoading(true);

  try {
    if (activeTab === 'clients') {
      const response = await apiClient.get('/clients');
      setClients(response.data.clients || []);
    } else {
      const response = await apiClient.get('/leads');
      setLeads(response.data.leads || []);
    }
  } catch (error) {
    console.error('Failed to fetch data:', error);
  } finally {
    setLoading(false);
  }
}, [activeTab]);

useEffect(() => {
  fetchData();
}, [fetchData]);

  const handleCreateClient = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      await apiClient.post('/clients', clientForm);
      setShowClientForm(false);
      setClientForm({ company_name: '', contact_person: '', email: '', phone: '', industry: '', status: 'active' });
      fetchData();
    } catch (error) {
      console.error('Failed to create client:', error);
      const detail = error.response?.data?.detail;
      setFormError(typeof detail === 'string' ? detail : 'Failed to create client. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground">CRM</h1>
            <p className="mt-2 text-muted-foreground">Manage clients, leads, and deals</p>
          </div>
          <button
            onClick={() => setShowClientForm(true)}
            data-testid={CRM_TESTIDS.createClientButton}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-medium text-white hover:bg-accent-hover transition-colors btn-scale"
          >
            <Plus className="h-5 w-5" />
            Add Client
          </button>
        </div>

        {/* Stats */}
        <div className="bento-grid">
          <div className="rounded-xl border border-border bg-surface p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Clients</p>
                <p className="mt-2 text-3xl font-bold text-foreground">{clients.length}</p>
              </div>
              <Building2 className="h-8 w-8 text-primary" />
            </div>
          </div>
          <div className="rounded-xl border border-border bg-surface p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Leads</p>
                <p className="mt-2 text-3xl font-bold text-foreground">{leads.length}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-success" />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-border">
          <div className="flex gap-8">
            <button
              onClick={() => setActiveTab('clients')}
              className={`border-b-2 pb-3 text-sm font-medium transition-colors ${
                activeTab === 'clients'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Clients
            </button>
            <button
              onClick={() => setActiveTab('leads')}
              className={`border-b-2 pb-3 text-sm font-medium transition-colors ${
                activeTab === 'leads'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Leads
            </button>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        ) : activeTab === 'clients' ? (
          <div className="rounded-xl border border-border bg-surface" data-testid={CRM_TESTIDS.clientsList}>
            {clients.length === 0 ? (
              <div className="py-12 text-center">
                <Building2 className="mx-auto h-12 w-12 text-muted-foreground" />
                <p className="mt-4 text-foreground">No clients yet</p>
                <p className="mt-2 text-sm text-muted-foreground">Add your first client to get started</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {clients.map((client) => (
                  <div key={client.client_id} className="p-6 hover:bg-surface-elevated transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground">{client.company_name}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">{client.contact_person}</p>
                        <div className="mt-3 flex flex-wrap gap-4 text-sm">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Mail className="h-4 w-4" />
                            {client.email}
                          </div>
                          {client.phone && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Phone className="h-4 w-4" />
                              {client.phone}
                            </div>
                          )}
                        </div>
                      </div>
                      <span className="badge badge-success">{client.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-surface" data-testid={CRM_TESTIDS.leadsList}>
            {leads.length === 0 ? (
              <div className="py-12 text-center">
                <TrendingUp className="mx-auto h-12 w-12 text-muted-foreground" />
                <p className="mt-4 text-foreground">No leads yet</p>
                <p className="mt-2 text-sm text-muted-foreground">Start capturing leads for your business</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {leads.map((lead) => (
                  <div key={lead.lead_id} className="p-6">
                    <h3 className="font-semibold text-foreground">{lead.contact_name}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{lead.company}</p>
                    <div className="mt-2 flex gap-2">
                      <span className="badge badge-info">{lead.stage}</span>
                      <span className="badge">{lead.priority} priority</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Create Client Modal */}
        {showClientForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-xl border border-border bg-surface p-6">
              <h2 className="text-2xl font-bold text-foreground">Add New Client</h2>
              {formError && (
                <div className="mt-4 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive" data-testid="client-form-error">
                  {formError}
                </div>
              )}
              <form onSubmit={handleCreateClient} className="mt-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground">Company Name</label>
                  <input
                    type="text"
                    required
                    value={clientForm.company_name}
                    onChange={(e) => setClientForm({ ...clientForm, company_name: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-input bg-background px-4 py-2.5 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground">Contact Person</label>
                  <input
                    type="text"
                    required
                    value={clientForm.contact_person}
                    onChange={(e) => setClientForm({ ...clientForm, contact_person: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-input bg-background px-4 py-2.5 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground">Email</label>
                  <input
                    type="email"
                    required
                    value={clientForm.email}
                    onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-input bg-background px-4 py-2.5 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground">Phone</label>
                  <input
                    type="tel"
                    value={clientForm.phone}
                    onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-input bg-background px-4 py-2.5 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowClientForm(false)}
                    className="flex-1 rounded-lg border border-input px-4 py-2.5 font-medium text-foreground hover:bg-surface-elevated transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 rounded-lg bg-primary px-4 py-2.5 font-medium text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
                    data-testid="submit-client-button"
                  >
                    {submitting ? 'Creating...' : 'Create Client'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

import React, { useState, useEffect } from 'react';
import { MainLayout } from '../components/MainLayout';
import { apiClient } from '../utils/api';
import { PageHeader, StatCard, EmptyState, Modal, Input, Select, Button, Badge } from '../components/ui-kit';
import { RichTextEditor } from '../components/RichTextEditor';
import { Globe, Plus, Layout, Eye, ExternalLink, Layers, Sparkles, Save } from 'lucide-react';

const TEMPLATES = [
  { value: 'blank', label: 'Blank' },
  { value: 'business', label: 'Business Landing' },
  { value: 'portfolio', label: 'Portfolio' },
  { value: 'ecommerce', label: 'E-Commerce' },
  { value: 'blog', label: 'Blog' },
];

export const WebsiteBuilder = () => {
  const [websites, setWebsites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewSite, setShowNewSite] = useState(false);
  const [siteForm, setSiteForm] = useState({ name: '', domain: '', template: 'blank', status: 'draft' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingSite, setEditingSite] = useState(null);
  const [pages, setPages] = useState([]);
  const [activePage, setActivePage] = useState(null);
  const [pageContent, setPageContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);

  useEffect(() => { fetchWebsites(); }, []);

  const fetchWebsites = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/websites');
      setWebsites(res.data.websites || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const createWebsite = async (e) => {
    e.preventDefault();
    setError(''); setSubmitting(true);
    try {
      await apiClient.post('/websites', siteForm);
      setShowNewSite(false);
      setSiteForm({ name: '', domain: '', template: 'blank', status: 'draft' });
      fetchWebsites();
    } catch (err) {
      const d = err.response?.data?.detail;
      setError(typeof d === 'string' ? d : 'Failed to create website');
    } finally { setSubmitting(false); }
  };

  const openEditor = async (site) => {
    setEditingSite(site);
    try {
      const res = await apiClient.get(`/websites/${site.website_id}/pages`);
      const pgs = res.data.pages || [];
      setPages(pgs);
      const home = pgs.find(p => p.is_homepage) || pgs[0];
      if (home) {
        setActivePage(home);
        setPageContent(home.content || '');
      }
    } catch (err) { console.error(err); }
  };

  const savePage = async () => {
    if (!activePage) return;
    setSaving(true);
    try {
      await apiClient.put(`/websites/${editingSite.website_id}/pages/${activePage.page_id}`, {
        content: pageContent,
      });
      setSavedMsg(true);
      setTimeout(() => setSavedMsg(false), 2500);
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  const publishSite = async () => {
    if (!editingSite) return;
    try {
      await apiClient.put(`/websites/${editingSite.website_id}/publish`);
      fetchWebsites();
      alert('Website published successfully!');
    } catch (err) { alert('Failed to publish'); }
  };

  if (editingSite) {
    return (
      <MainLayout>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <button onClick={() => { setEditingSite(null); setActivePage(null); }} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                ← Back to websites
              </button>
              <h1 className="mt-2 text-3xl font-bold text-foreground">{editingSite.name}</h1>
              {editingSite.domain && <p className="text-sm text-muted-foreground">{editingSite.domain}</p>}
            </div>
            <div className="flex items-center gap-3">
              {savedMsg && <span className="text-sm text-success">Saved!</span>}
              <Button variant="secondary" onClick={savePage} disabled={saving} data-testid="save-page-button">
                <Save className="mr-2 inline h-5 w-5" /> {saving ? 'Saving...' : 'Save Draft'}
              </Button>
              <Button onClick={publishSite} data-testid="publish-website-button">
                <Globe className="mr-2 inline h-5 w-5" /> Publish
              </Button>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-4">
            <div className="rounded-xl border border-border bg-surface p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground text-sm">Pages</h3>
                <span className="text-xs text-muted-foreground">{pages.length}</span>
              </div>
              <div className="space-y-1">
                {pages.map((p) => (
                  <button
                    key={p.page_id}
                    onClick={() => { setActivePage(p); setPageContent(p.content || ''); }}
                    className={`w-full flex items-center gap-2 rounded-lg p-2 text-sm text-left transition-colors ${
                      activePage?.page_id === p.page_id ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-surface-elevated'
                    }`}
                    data-testid={`page-${p.page_id}`}
                  >
                    <Layout className="h-4 w-4" />
                    <span className="flex-1 truncate">{p.name}</span>
                    {p.is_homepage && <Badge variant="info">Home</Badge>}
                  </button>
                ))}
              </div>
            </div>

            <div className="lg:col-span-3 rounded-xl border border-border bg-surface p-6" data-testid="page-editor">
              {activePage ? (
                <>
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h2 className="font-semibold text-foreground">{activePage.name}</h2>
                      <p className="text-xs text-muted-foreground">/{activePage.slug}</p>
                    </div>
                    <Badge variant={editingSite.status === 'published' ? 'success' : 'default'}>{editingSite.status}</Badge>
                  </div>
                  <RichTextEditor
                    value={pageContent}
                    onChange={setPageContent}
                    placeholder="Start building your page..."
                    testId="page-content-editor"
                  />
                </>
              ) : (
                <EmptyState icon={Layout} title="No page selected" />
              )}
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Website Builder"
          description="Create and deploy websites with drag-and-drop simplicity"
          action={
            <Button onClick={() => setShowNewSite(true)} data-testid="create-website-button">
              <Plus className="mr-2 inline h-5 w-5" /> New Website
            </Button>
          }
        />

        <div className="bento-grid">
          <StatCard title="Total Websites" value={websites.length} icon={Globe} />
          <StatCard title="Published" value={websites.filter(w => w.status === 'published').length} icon={ExternalLink} />
          <StatCard title="Drafts" value={websites.filter(w => w.status === 'draft').length} icon={Layers} />
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div></div>
        ) : websites.length === 0 ? (
          <EmptyState
            icon={Globe}
            title="No websites yet"
            description="Create your first website to start building"
            action={<Button onClick={() => setShowNewSite(true)}><Plus className="mr-2 inline h-5 w-5" /> Create Website</Button>}
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" data-testid="websites-list">
            {websites.map((site) => (
              <div key={site.website_id} className="rounded-xl border border-border bg-surface p-6 card-hover" data-testid="website-card">
                <div className="flex items-start justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <Globe className="h-6 w-6 text-primary" />
                  </div>
                  <Badge variant={site.status === 'published' ? 'success' : 'default'}>{site.status}</Badge>
                </div>
                <h3 className="mt-4 font-semibold text-foreground">{site.name}</h3>
                {site.domain && <p className="text-sm text-muted-foreground truncate">{site.domain}</p>}
                <p className="mt-2 text-xs text-muted-foreground">Template: {site.template}</p>
                <div className="mt-4 flex gap-2">
                  <Button size="sm" className="flex-1" onClick={() => openEditor(site)} data-testid={`edit-website-${site.website_id}`}>
                    <Layout className="mr-1 inline h-4 w-4" /> Edit
                  </Button>
                  <Button size="sm" variant="secondary" data-testid={`preview-website-${site.website_id}`}>
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <Modal open={showNewSite} onClose={() => setShowNewSite(false)} title="Create Website">
          {error && <div className="mt-4 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
          <form onSubmit={createWebsite} className="mt-6 space-y-4">
            <Input label="Website Name" required value={siteForm.name} onChange={(e) => setSiteForm({ ...siteForm, name: e.target.value })} placeholder="My Awesome Site" data-testid="website-name-input" />
            <Input label="Domain (optional)" value={siteForm.domain} onChange={(e) => setSiteForm({ ...siteForm, domain: e.target.value })} placeholder="example.com" />
            <Select label="Template" value={siteForm.template} onChange={(e) => setSiteForm({ ...siteForm, template: e.target.value })} options={TEMPLATES} />
            <div className="flex gap-3 pt-4">
              <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowNewSite(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting} className="flex-1" data-testid="submit-website-button">
                {submitting ? 'Creating...' : 'Create Website'}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </MainLayout>
  );
};

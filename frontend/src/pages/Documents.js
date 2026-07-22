import React, { useState, useEffect, useRef } from 'react';
import { MainLayout } from '../components/MainLayout';
import { apiClient } from '../utils/api';
import { PageHeader, StatCard, EmptyState, Modal, Input, Textarea, Button, Badge } from '../components/ui-kit';
import { RichTextEditor } from '../components/RichTextEditor';
import { FileText, Upload, Plus, Search, File, Download, Trash2 } from 'lucide-react';

export const Documents = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDocModal, setShowDocModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [docForm, setDocForm] = useState({ title: '', description: '', content: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => { fetchDocuments(); }, []);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/documents');
      setDocuments(response.data.documents || []);
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDoc = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await apiClient.post('/documents', docForm);
      setShowDocModal(false);
      setDocForm({ title: '', description: '', content: '' });
      fetchDocuments();
    } catch (error) {
      const detail = error.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Failed to create document');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      await apiClient.post('/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert('File uploaded successfully!');
    } catch (error) {
      alert('Upload failed: ' + (error.response?.data?.detail || error.message));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const filteredDocs = documents.filter((d) =>
    d.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Documents"
          description="Manage documents, files, and knowledge base"
          action={
            <div className="flex gap-3">
              <input ref={fileInputRef} type="file" onChange={handleFileUpload} className="hidden" data-testid="file-upload-input" />
              <Button variant="secondary" onClick={() => fileInputRef.current?.click()} disabled={uploading} data-testid="upload-file-button">
                <Upload className="mr-2 inline h-5 w-5" />
                {uploading ? 'Uploading...' : 'Upload File'}
              </Button>
              <Button onClick={() => setShowDocModal(true)} data-testid="create-document-button">
                <Plus className="mr-2 inline h-5 w-5" />
                New Document
              </Button>
            </div>
          }
        />

        <div className="bento-grid">
          <StatCard title="Total Documents" value={documents.length} icon={FileText} />
          <StatCard title="Published" value={documents.filter(d => d.status === 'published').length} icon={File} />
          <StatCard title="Drafts" value={documents.filter(d => d.status === 'draft').length} icon={FileText} />
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-input bg-background py-2.5 pl-10 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            data-testid="documents-search"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        ) : filteredDocs.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No documents yet"
            description="Create your first document to get started"
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" data-testid="documents-list">
            {filteredDocs.map((doc) => (
              <div key={doc.doc_id} className="rounded-xl border border-border bg-surface p-6 card-hover" data-testid="document-card">
                <div className="flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <Badge variant={doc.status === 'published' ? 'success' : 'default'}>{doc.status || 'draft'}</Badge>
                </div>
                <h3 className="mt-4 font-semibold text-foreground">{doc.title}</h3>
                {doc.description && <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{doc.description}</p>}
                <p className="mt-4 text-xs text-muted-foreground">v{doc.version || 1}</p>
              </div>
            ))}
          </div>
        )}

        <Modal open={showDocModal} onClose={() => setShowDocModal(false)} title="Create Document" size="lg">
          {error && (
            <div className="mt-4 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive" data-testid="document-form-error">
              {error}
            </div>
          )}
          <form onSubmit={handleCreateDoc} className="mt-6 space-y-4">
            <Input label="Title" required value={docForm.title} onChange={(e) => setDocForm({ ...docForm, title: e.target.value })} data-testid="doc-title-input" />
            <Input label="Description" value={docForm.description} onChange={(e) => setDocForm({ ...docForm, description: e.target.value })} data-testid="doc-description-input" />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Content</label>
              <RichTextEditor
                value={docForm.content}
                onChange={(html) => setDocForm({ ...docForm, content: html })}
                placeholder="Start typing your document..."
                testId="doc-content-editor"
              />
            </div>
            <div className="flex gap-3 pt-4">
              <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowDocModal(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting} className="flex-1" data-testid="submit-document-button">
                {submitting ? 'Creating...' : 'Create Document'}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </MainLayout>
  );
};

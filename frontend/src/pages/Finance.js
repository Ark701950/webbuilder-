import React, { useState, useEffect } from 'react';
import { MainLayout } from '../components/MainLayout';
import { apiClient } from '../utils/api';
import { PageHeader, StatCard, EmptyState, Modal, Input, Select, Textarea, Button, Badge } from '../components/ui-kit';
import { DollarSign, TrendingUp, TrendingDown, FileText, Plus, Receipt } from 'lucide-react';

export const Finance = () => {
  const [tab, setTab] = useState('overview');
  const [transactions, setTransactions] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [showTxnModal, setShowTxnModal] = useState(false);
  const [showInvModal, setShowInvModal] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [txnForm, setTxnForm] = useState({
    type: 'income', category: '', amount: 0, currency: 'USD',
    date: new Date().toISOString().split('T')[0], status: 'completed'
  });
  const [invForm, setInvForm] = useState({
    invoice_number: `INV-${Date.now()}`, client_id: '',
    issue_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    items: [], subtotal: 0, tax: 0, discount: 0, total_amount: 0, payment_status: 'pending'
  });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tx, inv, sm] = await Promise.all([
        apiClient.get('/transactions'),
        apiClient.get('/invoices'),
        apiClient.get('/finance/summary'),
      ]);
      setTransactions(tx.data.transactions || []);
      setInvoices(inv.data.invoices || []);
      setSummary(sm.data || {});
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const createTransaction = async (e) => {
    e.preventDefault();
    setError(''); setSubmitting(true);
    try {
      await apiClient.post('/transactions', { ...txnForm, amount: parseFloat(txnForm.amount) });
      setShowTxnModal(false);
      setTxnForm({ type: 'income', category: '', amount: 0, currency: 'USD', date: new Date().toISOString().split('T')[0], status: 'completed' });
      fetchData();
    } catch (err) {
      const d = err.response?.data?.detail;
      setError(typeof d === 'string' ? d : 'Failed to create transaction');
    } finally { setSubmitting(false); }
  };

  const createInvoice = async (e) => {
    e.preventDefault();
    setError(''); setSubmitting(true);
    try {
      const total = parseFloat(invForm.subtotal) + parseFloat(invForm.tax) - parseFloat(invForm.discount);
      await apiClient.post('/invoices', { ...invForm, subtotal: parseFloat(invForm.subtotal), tax: parseFloat(invForm.tax), discount: parseFloat(invForm.discount), total_amount: total });
      setShowInvModal(false);
      setInvForm({ invoice_number: `INV-${Date.now()}`, client_id: '', issue_date: new Date().toISOString().split('T')[0], due_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0], items: [], subtotal: 0, tax: 0, discount: 0, total_amount: 0, payment_status: 'pending' });
      fetchData();
    } catch (err) {
      const d = err.response?.data?.detail;
      setError(typeof d === 'string' ? d : 'Failed to create invoice');
    } finally { setSubmitting(false); }
  };

  const fmt = (n) => `$${(n || 0).toLocaleString()}`;

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Finance"
          description="Track income, expenses, and manage invoices"
          action={
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setShowInvModal(true)} data-testid="create-invoice-button">
                <Receipt className="mr-2 inline h-5 w-5" /> New Invoice
              </Button>
              <Button onClick={() => setShowTxnModal(true)} data-testid="create-transaction-button">
                <Plus className="mr-2 inline h-5 w-5" /> Add Transaction
              </Button>
            </div>
          }
        />

        <div className="bento-grid">
          <StatCard title="Total Income" value={fmt(summary.total_income)} icon={TrendingUp} testId="stat-income" />
          <StatCard title="Total Expenses" value={fmt(summary.total_expense)} icon={TrendingDown} testId="stat-expense" />
          <StatCard title="Net Profit" value={fmt(summary.net_profit)} icon={DollarSign} testId="stat-profit" />
          <StatCard title="Pending Invoices" value={fmt(summary.pending_invoices_amount)} icon={FileText} testId="stat-pending" />
        </div>

        <div className="border-b border-border">
          <div className="flex gap-8">
            {['overview', 'transactions', 'invoices'].map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`border-b-2 pb-3 text-sm font-medium capitalize transition-colors ${
                  tab === t ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
                data-testid={`finance-tab-${t}`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        ) : tab === 'overview' ? (
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-xl border border-border bg-surface p-6">
              <h3 className="font-semibold text-foreground">Recent Transactions</h3>
              {transactions.slice(0, 5).length === 0 ? (
                <p className="mt-4 text-sm text-muted-foreground">No transactions yet</p>
              ) : (
                <div className="mt-4 space-y-3">
                  {transactions.slice(0, 5).map((t) => (
                    <div key={t.transaction_id} className="flex items-center justify-between border-b border-border pb-3 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-foreground">{t.category}</p>
                        <p className="text-xs text-muted-foreground">{t.date}</p>
                      </div>
                      <p className={`font-mono text-sm ${t.type === 'income' ? 'text-success' : 'text-destructive'}`}>
                        {t.type === 'income' ? '+' : '-'}{fmt(t.amount)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="rounded-xl border border-border bg-surface p-6">
              <h3 className="font-semibold text-foreground">Pending Invoices</h3>
              {invoices.filter(i => i.payment_status === 'pending').slice(0, 5).length === 0 ? (
                <p className="mt-4 text-sm text-muted-foreground">No pending invoices</p>
              ) : (
                <div className="mt-4 space-y-3">
                  {invoices.filter(i => i.payment_status === 'pending').slice(0, 5).map((i) => (
                    <div key={i.invoice_id} className="flex items-center justify-between border-b border-border pb-3 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-foreground">{i.invoice_number}</p>
                        <p className="text-xs text-muted-foreground">Due: {i.due_date}</p>
                      </div>
                      <p className="font-mono text-sm text-foreground">{fmt(i.total_amount)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : tab === 'transactions' ? (
          transactions.length === 0 ? (
            <EmptyState icon={Receipt} title="No transactions yet" />
          ) : (
            <div className="rounded-xl border border-border bg-surface overflow-hidden">
              <table className="w-full data-table">
                <thead className="bg-surface-elevated border-b border-border">
                  <tr>
                    <th className="px-6 py-3 text-left">Date</th>
                    <th className="px-6 py-3 text-left">Category</th>
                    <th className="px-6 py-3 text-left">Type</th>
                    <th className="px-6 py-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((t) => (
                    <tr key={t.transaction_id} className="border-b border-border hover:bg-surface-elevated" data-testid="transaction-row">
                      <td className="px-6 py-4 text-muted-foreground">{t.date}</td>
                      <td className="px-6 py-4 text-foreground">{t.category}</td>
                      <td className="px-6 py-4"><Badge variant={t.type === 'income' ? 'success' : 'error'}>{t.type}</Badge></td>
                      <td className={`px-6 py-4 text-right font-mono ${t.type === 'income' ? 'text-success' : 'text-destructive'}`}>{fmt(t.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          invoices.length === 0 ? (
            <EmptyState icon={FileText} title="No invoices yet" />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {invoices.map((i) => (
                <div key={i.invoice_id} className="rounded-xl border border-border bg-surface p-6 card-hover" data-testid="invoice-card">
                  <div className="flex items-start justify-between">
                    <FileText className="h-6 w-6 text-primary" />
                    <Badge variant={i.payment_status === 'paid' ? 'success' : i.payment_status === 'overdue' ? 'error' : 'warning'}>
                      {i.payment_status}
                    </Badge>
                  </div>
                  <h3 className="mt-4 font-semibold text-foreground">{i.invoice_number}</h3>
                  <p className="mt-2 text-2xl font-bold text-foreground font-mono">{fmt(i.total_amount)}</p>
                  <p className="mt-2 text-xs text-muted-foreground">Due: {i.due_date}</p>
                </div>
              ))}
            </div>
          )
        )}

        <Modal open={showTxnModal} onClose={() => setShowTxnModal(false)} title="Add Transaction">
          {error && <div className="mt-4 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
          <form onSubmit={createTransaction} className="mt-6 space-y-4">
            <Select label="Type" value={txnForm.type} onChange={(e) => setTxnForm({ ...txnForm, type: e.target.value })} options={[
              { value: 'income', label: 'Income' }, { value: 'expense', label: 'Expense' }
            ]} />
            <Input label="Category" required value={txnForm.category} onChange={(e) => setTxnForm({ ...txnForm, category: e.target.value })} data-testid="txn-category-input" />
            <Input label="Amount" type="number" step="0.01" required value={txnForm.amount} onChange={(e) => setTxnForm({ ...txnForm, amount: e.target.value })} data-testid="txn-amount-input" />
            <Input label="Date" type="date" required value={txnForm.date} onChange={(e) => setTxnForm({ ...txnForm, date: e.target.value })} data-testid="txn-date-input" />
            <div className="flex gap-3 pt-4">
              <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowTxnModal(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting} className="flex-1" data-testid="submit-transaction-button">
                {submitting ? 'Creating...' : 'Create Transaction'}
              </Button>
            </div>
          </form>
        </Modal>

        <Modal open={showInvModal} onClose={() => setShowInvModal(false)} title="Create Invoice">
          {error && <div className="mt-4 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
          <form onSubmit={createInvoice} className="mt-6 space-y-4">
            <Input label="Invoice Number" required value={invForm.invoice_number} onChange={(e) => setInvForm({ ...invForm, invoice_number: e.target.value })} />
            <Input label="Client ID" required value={invForm.client_id} onChange={(e) => setInvForm({ ...invForm, client_id: e.target.value })} data-testid="inv-client-input" />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Issue Date" type="date" required value={invForm.issue_date} onChange={(e) => setInvForm({ ...invForm, issue_date: e.target.value })} />
              <Input label="Due Date" type="date" required value={invForm.due_date} onChange={(e) => setInvForm({ ...invForm, due_date: e.target.value })} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Input label="Subtotal" type="number" step="0.01" value={invForm.subtotal} onChange={(e) => setInvForm({ ...invForm, subtotal: e.target.value })} />
              <Input label="Tax" type="number" step="0.01" value={invForm.tax} onChange={(e) => setInvForm({ ...invForm, tax: e.target.value })} />
              <Input label="Discount" type="number" step="0.01" value={invForm.discount} onChange={(e) => setInvForm({ ...invForm, discount: e.target.value })} />
            </div>
            <div className="flex gap-3 pt-4">
              <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowInvModal(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting} className="flex-1" data-testid="submit-invoice-button">
                {submitting ? 'Creating...' : 'Create Invoice'}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </MainLayout>
  );
};

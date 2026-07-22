import React, { useState, useEffect } from 'react';
import { MainLayout } from '../components/MainLayout';
import { apiClient } from '../utils/api';
import { PageHeader, StatCard, EmptyState, Modal, Input, Select, Button, Badge } from '../components/ui-kit';
import { Users, Building2, Plus, UserPlus, Calendar as CalendarIcon } from 'lucide-react';

export const HR = () => {
  const [tab, setTab] = useState('employees');
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEmpModal, setShowEmpModal] = useState(false);
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [empForm, setEmpForm] = useState({ user_id: '', position: '', joining_date: new Date().toISOString().split('T')[0], employment_type: 'full_time', status: 'active' });
  const [deptForm, setDeptForm] = useState({ name: '', description: '' });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [emp, dept, lv] = await Promise.all([
        apiClient.get('/employees'),
        apiClient.get('/departments'),
        apiClient.get('/leaves'),
      ]);
      setEmployees(emp.data.employees || []);
      setDepartments(dept.data.departments || []);
      setLeaves(lv.data.leaves || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const createEmployee = async (e) => {
    e.preventDefault();
    setError(''); setSubmitting(true);
    try {
      await apiClient.post('/employees', empForm);
      setShowEmpModal(false);
      setEmpForm({ user_id: '', position: '', joining_date: new Date().toISOString().split('T')[0], employment_type: 'full_time', status: 'active' });
      fetchData();
    } catch (err) {
      const d = err.response?.data?.detail;
      setError(typeof d === 'string' ? d : 'Failed to create employee');
    } finally { setSubmitting(false); }
  };

  const createDepartment = async (e) => {
    e.preventDefault();
    setError(''); setSubmitting(true);
    try {
      await apiClient.post('/departments', deptForm);
      setShowDeptModal(false);
      setDeptForm({ name: '', description: '' });
      fetchData();
    } catch (err) {
      const d = err.response?.data?.detail;
      setError(typeof d === 'string' ? d : 'Failed to create department');
    } finally { setSubmitting(false); }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Human Resources"
          description="Manage employees, departments, and workforce"
          action={
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setShowDeptModal(true)} data-testid="add-department-button">
                <Building2 className="mr-2 inline h-5 w-5" /> Add Department
              </Button>
              <Button onClick={() => setShowEmpModal(true)} data-testid="add-employee-button">
                <UserPlus className="mr-2 inline h-5 w-5" /> Add Employee
              </Button>
            </div>
          }
        />

        <div className="bento-grid">
          <StatCard title="Total Employees" value={employees.length} icon={Users} />
          <StatCard title="Departments" value={departments.length} icon={Building2} />
          <StatCard title="Leave Requests" value={leaves.filter(l => l.status === 'pending').length} icon={CalendarIcon} />
          <StatCard title="Active Now" value={employees.filter(e => e.status === 'active').length} icon={Users} />
        </div>

        <div className="border-b border-border">
          <div className="flex gap-8">
            {['employees', 'departments', 'leaves'].map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`border-b-2 pb-3 text-sm font-medium capitalize transition-colors ${
                  tab === t ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
                data-testid={`hr-tab-${t}`}
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
        ) : tab === 'employees' ? (
          employees.length === 0 ? (
            <EmptyState icon={Users} title="No employees yet" description="Add your first employee to get started" />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {employees.map((emp) => (
                <div key={emp.employee_id} className="rounded-xl border border-border bg-surface p-6 card-hover">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white font-medium">
                      {emp.position?.charAt(0)?.toUpperCase() || 'E'}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{emp.position}</p>
                      <p className="text-sm text-muted-foreground">{emp.employment_type}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Badge variant="success">{emp.status}</Badge>
                    <Badge>{emp.employment_type}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : tab === 'departments' ? (
          departments.length === 0 ? (
            <EmptyState icon={Building2} title="No departments yet" />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {departments.map((dept) => (
                <div key={dept.dept_id} className="rounded-xl border border-border bg-surface p-6 card-hover">
                  <div className="flex items-center gap-3">
                    <Building2 className="h-6 w-6 text-primary" />
                    <h3 className="font-semibold text-foreground">{dept.name}</h3>
                  </div>
                  {dept.description && <p className="mt-2 text-sm text-muted-foreground">{dept.description}</p>}
                  <p className="mt-4 text-sm text-muted-foreground">{dept.members?.length || 0} members</p>
                </div>
              ))}
            </div>
          )
        ) : (
          leaves.length === 0 ? (
            <EmptyState icon={CalendarIcon} title="No leave requests" />
          ) : (
            <div className="rounded-xl border border-border bg-surface divide-y divide-border">
              {leaves.map((lv) => (
                <div key={lv.leave_id} className="p-6 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">{lv.leave_type} leave</p>
                    <p className="text-sm text-muted-foreground">{lv.start_date} → {lv.end_date}</p>
                  </div>
                  <Badge variant={lv.status === 'approved' ? 'success' : lv.status === 'rejected' ? 'error' : 'warning'}>
                    {lv.status}
                  </Badge>
                </div>
              ))}
            </div>
          )
        )}

        <Modal open={showEmpModal} onClose={() => setShowEmpModal(false)} title="Add Employee">
          {error && <div className="mt-4 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
          <form onSubmit={createEmployee} className="mt-6 space-y-4">
            <Input label="User ID / Email" required value={empForm.user_id} onChange={(e) => setEmpForm({ ...empForm, user_id: e.target.value })} data-testid="emp-user-id-input" />
            <Input label="Position" required value={empForm.position} onChange={(e) => setEmpForm({ ...empForm, position: e.target.value })} data-testid="emp-position-input" />
            <Input label="Joining Date" type="date" required value={empForm.joining_date} onChange={(e) => setEmpForm({ ...empForm, joining_date: e.target.value })} data-testid="emp-joining-input" />
            <Select label="Employment Type" value={empForm.employment_type} onChange={(e) => setEmpForm({ ...empForm, employment_type: e.target.value })} options={[
              { value: 'full_time', label: 'Full Time' }, { value: 'part_time', label: 'Part Time' },
              { value: 'contract', label: 'Contract' }, { value: 'intern', label: 'Intern' },
            ]} />
            <div className="flex gap-3 pt-4">
              <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowEmpModal(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting} className="flex-1" data-testid="submit-employee-button">
                {submitting ? 'Creating...' : 'Create Employee'}
              </Button>
            </div>
          </form>
        </Modal>

        <Modal open={showDeptModal} onClose={() => setShowDeptModal(false)} title="Add Department">
          {error && <div className="mt-4 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
          <form onSubmit={createDepartment} className="mt-6 space-y-4">
            <Input label="Department Name" required value={deptForm.name} onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })} data-testid="dept-name-input" />
            <Input label="Description" value={deptForm.description} onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })} data-testid="dept-description-input" />
            <div className="flex gap-3 pt-4">
              <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowDeptModal(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting} className="flex-1" data-testid="submit-department-button">
                {submitting ? 'Creating...' : 'Create Department'}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </MainLayout>
  );
};

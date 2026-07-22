import React, { useState, useEffect } from 'react';
import { MainLayout } from '../components/MainLayout';
import { apiClient } from '../utils/api';
import { Plus, Briefcase, CheckSquare, Clock, AlertCircle } from 'lucide-react';
import { PROJECTS } from '../constants/testIds';

export const Projects = () => {
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [projectForm, setProjectForm] = useState({
    name: '',
    description: '',
    status: 'planning',
    priority: 'medium'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [projectsRes, tasksRes] = await Promise.all([
        apiClient.get('/projects'),
        apiClient.get('/tasks')
      ]);
      setProjects(projectsRes.data.projects || []);
      setTasks(tasksRes.data.tasks || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    try {
      await apiClient.post('/projects', projectForm);
      setShowProjectForm(false);
      setProjectForm({ name: '', description: '', status: 'planning', priority: 'medium' });
      fetchData();
    } catch (error) {
      console.error('Failed to create project:', error);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      planning: 'bg-muted/10 text-muted-foreground border-muted/20',
      active: 'bg-success/10 text-success border-success/20',
      on_hold: 'bg-warning/10 text-warning border-warning/20',
      completed: 'bg-primary/10 text-primary border-primary/20',
      cancelled: 'bg-destructive/10 text-destructive border-destructive/20'
    };
    return colors[status] || colors.planning;
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: 'bg-muted/10 text-muted-foreground border-muted/20',
      medium: 'bg-primary/10 text-primary border-primary/20',
      high: 'bg-destructive/10 text-destructive border-destructive/20'
    };
    return colors[priority] || colors.medium;
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground">Projects</h1>
            <p className="mt-2 text-muted-foreground">Manage projects and track progress</p>
          </div>
          <button
            onClick={() => setShowProjectForm(true)}
            data-testid={PROJECTS.createProjectButton}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-medium text-white hover:bg-accent-hover transition-colors btn-scale"
          >
            <Plus className="h-5 w-5" />
            New Project
          </button>
        </div>

        {/* Stats */}
        <div className="bento-grid">
          <div className="rounded-xl border border-border bg-surface p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Projects</p>
                <p className="mt-2 text-3xl font-bold text-foreground">{projects.length}</p>
              </div>
              <Briefcase className="h-8 w-8 text-primary" />
            </div>
          </div>
          <div className="rounded-xl border border-border bg-surface p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Projects</p>
                <p className="mt-2 text-3xl font-bold text-foreground">
                  {projects.filter(p => p.status === 'active').length}
                </p>
              </div>
              <Clock className="h-8 w-8 text-success" />
            </div>
          </div>
          <div className="rounded-xl border border-border bg-surface p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Tasks</p>
                <p className="mt-2 text-3xl font-bold text-foreground">{tasks.length}</p>
              </div>
              <CheckSquare className="h-8 w-8 text-primary" />
            </div>
          </div>
        </div>

        {/* Projects Grid */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        ) : projects.length === 0 ? (
          <div className="rounded-xl border border-border bg-surface py-12 text-center" data-testid={PROJECTS.projectsList}>
            <Briefcase className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-foreground">No projects yet</p>
            <p className="mt-2 text-sm text-muted-foreground">Create your first project to get started</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3" data-testid={PROJECTS.projectsList}>
            {projects.map((project) => (
              <div
                key={project.project_id}
                data-testid={PROJECTS.projectCard}
                className="rounded-xl border border-border bg-surface p-6 card-hover transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">{project.name}</h3>
                    <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                      {project.description || 'No description'}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <span className={`badge ${getStatusColor(project.status)}`}>
                    {project.status}
                  </span>
                  <span className={`badge ${getPriorityColor(project.priority)}`}>
                    {project.priority}
                  </span>
                </div>
                <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                  <span>Progress</span>
                  <span className="font-medium">{project.progress || 0}%</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-surface-elevated overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${project.progress || 0}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Project Modal */}
        {showProjectForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-xl border border-border bg-surface p-6">
              <h2 className="text-2xl font-bold text-foreground">Create New Project</h2>
              <form onSubmit={handleCreateProject} className="mt-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground">Project Name</label>
                  <input
                    type="text"
                    required
                    value={projectForm.name}
                    onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-input bg-background px-4 py-2.5 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="Enter project name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground">Description</label>
                  <textarea
                    rows={3}
                    value={projectForm.description}
                    onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-input bg-background px-4 py-2.5 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="Describe your project"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground">Status</label>
                  <select
                    value={projectForm.status}
                    onChange={(e) => setProjectForm({ ...projectForm, status: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-input bg-background px-4 py-2.5 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="planning">Planning</option>
                    <option value="active">Active</option>
                    <option value="on_hold">On Hold</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground">Priority</label>
                  <select
                    value={projectForm.priority}
                    onChange={(e) => setProjectForm({ ...projectForm, priority: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-input bg-background px-4 py-2.5 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowProjectForm(false)}
                    className="flex-1 rounded-lg border border-input px-4 py-2.5 font-medium text-foreground hover:bg-surface-elevated transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 rounded-lg bg-primary px-4 py-2.5 font-medium text-white hover:bg-accent-hover transition-colors"
                  >
                    Create Project
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
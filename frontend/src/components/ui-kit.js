import React from 'react';

export const PageHeader = ({ title, description, action }) => (
  <div className="flex items-center justify-between animate-fade-in">
    <div>
      <h1 className="text-4xl font-bold text-foreground">{title}</h1>
      {description && <p className="mt-2 text-muted-foreground">{description}</p>}
    </div>
    {action}
  </div>
);

export const StatCard = ({ title, value, icon: Icon, trend, color = 'primary', testId }) => (
  <div className="rounded-xl border border-border bg-surface p-6 card-hover animate-fade-in" data-testid={testId}>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <p className="mt-2 text-3xl font-bold text-foreground">{value}</p>
        {trend && <p className="mt-2 text-sm text-success">{trend}</p>}
      </div>
      {Icon && (
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-6 w-6 text-primary" />
        </div>
      )}
    </div>
  </div>
);

export const EmptyState = ({ icon: Icon, title, description, action }) => (
  <div className="rounded-xl border border-border bg-surface py-16 text-center">
    {Icon && <Icon className="mx-auto h-12 w-12 text-muted-foreground" />}
    <p className="mt-4 text-lg font-medium text-foreground">{title}</p>
    {description && <p className="mt-2 text-sm text-muted-foreground">{description}</p>}
    {action && <div className="mt-6">{action}</div>}
  </div>
);

export const Modal = ({ open, onClose, title, children, size = 'md' }) => {
  if (!open) return null;
  const sizeClass = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-2xl', xl: 'max-w-4xl' }[size];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className={`w-full ${sizeClass} rounded-xl border border-border bg-surface p-6 mx-4`} onClick={(e) => e.stopPropagation()}>
        <h2 className="text-2xl font-bold text-foreground">{title}</h2>
        {children}
      </div>
    </div>
  );
};

export const Input = ({ label, error, ...props }) => (
  <div>
    {label && <label className="mb-1.5 block text-sm font-medium text-foreground">{label}</label>}
    <input
      {...props}
      className={`w-full rounded-lg border ${error ? 'border-destructive' : 'border-input'} bg-background px-4 py-2.5 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20`}
    />
    {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
  </div>
);

export const Select = ({ label, options = [], ...props }) => (
  <div>
    {label && <label className="mb-1.5 block text-sm font-medium text-foreground">{label}</label>}
    <select {...props} className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20">
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  </div>
);

export const Textarea = ({ label, ...props }) => (
  <div>
    {label && <label className="mb-1.5 block text-sm font-medium text-foreground">{label}</label>}
    <textarea {...props} className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
  </div>
);

export const Button = ({ variant = 'primary', size = 'md', children, className = '', ...props }) => {
  const variants = {
    primary: 'bg-primary text-white hover:bg-accent-hover',
    secondary: 'border border-input text-foreground hover:bg-surface-elevated',
    danger: 'bg-destructive text-white hover:opacity-90',
    ghost: 'text-foreground hover:bg-surface-elevated'
  };
  const sizes = { sm: 'px-3 py-1.5 text-sm', md: 'px-4 py-2.5', lg: 'px-6 py-3 text-lg' };
  return (
    <button {...props} className={`rounded-lg font-medium transition-colors btn-scale disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`}>
      {children}
    </button>
  );
};

export const Badge = ({ variant = 'default', children }) => {
  const variants = {
    default: 'bg-surface-elevated text-muted-foreground border border-border',
    success: 'bg-success/10 text-success border border-success/20',
    warning: 'bg-warning/10 text-warning border border-warning/20',
    error: 'bg-destructive/10 text-destructive border border-destructive/20',
    info: 'bg-primary/10 text-primary border border-primary/20'
  };
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]}`}>{children}</span>;
};

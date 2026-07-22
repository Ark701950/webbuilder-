import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AuthCallback } from './components/AuthCallback';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { CRM } from './pages/CRM';
import { Projects } from './pages/Projects';
import './App.css';

// Placeholder pages for other modules
const PlaceholderPage = ({ title }) => {
  const { MainLayout } = require('./components/MainLayout');
  return (
    <MainLayout>
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-foreground">{title}</h1>
          <p className="mt-4 text-muted-foreground">This module is under development</p>
        </div>
      </div>
    </MainLayout>
  );
};

const Documents = () => <PlaceholderPage title="Documents" />;
const HR = () => <PlaceholderPage title="HR Management" />;
const Finance = () => <PlaceholderPage title="Finance" />;
const Calendar = () => <PlaceholderPage title="Calendar" />;
const Messages = () => <PlaceholderPage title="Messages" />;
const Analytics = () => <PlaceholderPage title="Analytics" />;
const AI = () => <PlaceholderPage title="AI Assistant" />;
const Support = () => <PlaceholderPage title="Customer Support" />;
const Admin = () => <PlaceholderPage title="Admin Portal" />;

function AppRouter() {
  const location = useLocation();
  
  // Check URL fragment for session_id during render (NOT in useEffect)
  // This synchronous check prevents race conditions
  if (location.hash?.includes('session_id=')) {
    return <AuthCallback />;
  }

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      
      {/* Protected Routes */}
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/crm/*" element={<ProtectedRoute><CRM /></ProtectedRoute>} />
      <Route path="/projects/*" element={<ProtectedRoute><Projects /></ProtectedRoute>} />
      <Route path="/documents/*" element={<ProtectedRoute><Documents /></ProtectedRoute>} />
      <Route path="/hr/*" element={<ProtectedRoute><HR /></ProtectedRoute>} />
      <Route path="/finance/*" element={<ProtectedRoute><Finance /></ProtectedRoute>} />
      <Route path="/calendar" element={<ProtectedRoute><Calendar /></ProtectedRoute>} />
      <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
      <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
      <Route path="/ai" element={<ProtectedRoute><AI /></ProtectedRoute>} />
      <Route path="/support/*" element={<ProtectedRoute><Support /></ProtectedRoute>} />
      <Route path="/admin/*" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
      
      {/* Redirect root to dashboard */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <div className="App dark">
      <AuthProvider>
        <BrowserRouter>
          <AppRouter />
        </BrowserRouter>
      </AuthProvider>
    </div>
  );
}

export default App;

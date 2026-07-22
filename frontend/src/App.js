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
import { Documents } from './pages/Documents';
import { HR } from './pages/HR';
import { Finance } from './pages/Finance';
import { Calendar } from './pages/Calendar';
import { Analytics } from './pages/Analytics';
import { AIAssistant } from './pages/AIAssistant';
import { Admin } from './pages/Admin';
import { DesignStudio } from './pages/DesignStudio';
import { Messages } from './pages/Messages';
import { Support } from './pages/Support';
import { FounderOffice } from './pages/FounderOffice';
import { WebsiteBuilder } from './pages/WebsiteBuilder';
import { ClientPortal } from './pages/ClientPortal';
import './App.css';

function AppRouter() {
  const location = useLocation();
  
  // CRITICAL: Check URL fragment for session_id during render (NOT in useEffect)
  // This synchronous check prevents race conditions with OAuth callback
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
      <Route path="/ai" element={<ProtectedRoute><AIAssistant /></ProtectedRoute>} />
      <Route path="/support/*" element={<ProtectedRoute><Support /></ProtectedRoute>} />
      <Route path="/admin/*" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
      <Route path="/design-studio" element={<ProtectedRoute><DesignStudio /></ProtectedRoute>} />
      <Route path="/founder-office" element={<ProtectedRoute><FounderOffice /></ProtectedRoute>} />
      <Route path="/website-builder" element={<ProtectedRoute><WebsiteBuilder /></ProtectedRoute>} />
      <Route path="/client-portal" element={<ProtectedRoute><ClientPortal /></ProtectedRoute>} />
      
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

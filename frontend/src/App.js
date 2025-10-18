import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import '@/App.css';
import { Toaster } from 'sonner';
import { ThemeProvider } from './contexts/ThemeContext';

// Import components
import AuthScreen from './components/AuthScreen';
import Dashboard from './components/Dashboard';
import NotesManager from './components/NotesManager';
import TasksManager from './components/TasksManager';
import CalendarView from './components/CalendarView';
import ProjectsManager from './components/ProjectsManager';
import AiChat from './components/AiChat';
import SettingsScreen from './components/SettingsScreen';
import MainLayout from './components/MainLayout';
import SmartScheduling from './components/SmartScheduling';
import HabitTracker from './components/HabitTracker';
import SmartHome from './components/SmartHome';
import SupportCenter from './components/SupportCenter';
import IntegrationsHub from './components/IntegrationsHub';
import UpgradeScreen from './components/UpgradeScreen';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Auth context
const AuthContext = React.createContext();

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

// Main App Component
function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  // Configure axios defaults
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  // Check authentication on app load
  useEffect(() => {
    const checkAuth = async () => {
      if (token) {
        try {
          const response = await axios.get(`${API}/dashboard/stats`);
          if (response.status === 200) {
            const userData = JSON.parse(localStorage.getItem('user'));
            setUser(userData);
          }
        } catch (error) {
          console.error('Auth check failed:', error);
          logout();
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, [token]);

  const login = (userData, authToken) => {
    setUser(userData);
    setToken(authToken);
    localStorage.setItem('token', authToken);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
  };

  const authContextValue = {
    user,
    token,
    login,
    logout,
    isAuthenticated: !!user
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <ThemeProvider>
      <AuthContext.Provider value={authContextValue}>
        <BrowserRouter>
          <div className="min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
            <Routes>
              <Route 
                path="/auth" 
                element={!user ? <AuthScreen /> : <Navigate to="/" />} 
              />
              
              {user ? (
                <Route path="/" element={<MainLayout />}>
                  <Route index element={<Dashboard />} />
                  <Route path="chat" element={<AiChat />} />
                  <Route path="habits" element={<HabitTracker />} />
                  <Route path="notes" element={<NotesManager />} />
                  <Route path="tasks" element={<TasksManager />} />
                  <Route path="calendar" element={<CalendarView />} />
                  <Route path="projects" element={<ProjectsManager />} />
                  <Route path="support" element={<SupportCenter />} />
                  <Route path="upgrade" element={<UpgradeScreen />} />
                  <Route path="settings" element={<SettingsScreen />} />
                </Route>
              ) : (
                <Route path="*" element={<Navigate to="/auth" />} />
              )}
            </Routes>
            
            <Toaster 
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: 'var(--color-surface)',
                  color: 'var(--color-text)',
                  border: '1px solid var(--color-border)'
                }
              }}
            />
          </div>
        </BrowserRouter>
      </AuthContext.Provider>
    </ThemeProvider>
  );
}

export default App;
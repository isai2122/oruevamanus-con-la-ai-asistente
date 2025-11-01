import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Home, 
  FileText, 
  CheckSquare, 
  Calendar, 
  FolderOpen, 
  MessageCircle, 
  Settings, 
  LogOut,
  Menu,
  X,
  User,
  Sparkles,
  Zap,
  Flame,
  Headphones,
  Puzzle,
  Crown
} from 'lucide-react';
import { Button } from './ui/button';
import { Avatar, AvatarFallback } from './ui/avatar';
import { useAuth } from '../App';
import { toast } from 'sonner';

const MainLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const navigation = [
    { name: 'Dashboard', href: '/', icon: Home },
    { name: 'Chat IA', href: '/chat', icon: MessageCircle },
    { name: 'Hábitos', href: '/habits', icon: Flame },
    { name: 'Notas', href: '/notes', icon: FileText },
    { name: 'Tareas', href: '/tasks', icon: CheckSquare },
    { name: 'Calendario', href: '/calendar', icon: Calendar },
    { name: 'Proyectos', href: '/projects', icon: FolderOpen },
    { name: 'Soporte', href: '/support', icon: Headphones },
    { name: 'Premium', href: '/upgrade', icon: Crown },
    { name: 'Configuración', href: '/settings', icon: Settings },
  ];

  const handleLogout = () => {
    logout();
    toast.success('Sesión cerrada exitosamente');
    navigate('/auth');
  };

  const isActivePage = (href) => {
    if (href === '/') return location.pathname === '/';
    return location.pathname.startsWith(href);
  };

  return (
    <div className="h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex overflow-hidden">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 lg:hidden bg-black bg-opacity-50" 
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white/80 backdrop-blur-xl border-r border-slate-200/50
        transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Sidebar Header */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-slate-200/50">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold gradient-text">Jika</h1>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors"
            data-testid="close-sidebar-btn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = isActivePage(item.href);
            
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200
                  ${active 
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg' 
                    : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  }
                `}
                data-testid={`nav-${item.name.toLowerCase()}`}
              >
                <Icon className={`w-5 h-5 mr-3 ${active ? 'text-white' : 'text-slate-500'}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t border-slate-200/50">
          <div className="flex items-center space-x-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
            <Avatar className="w-10 h-10">
              <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-semibold">
                {user?.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">
                {user?.full_name || 'Usuario'}
              </p>
              <p className="text-xs text-slate-500 truncate">
                {user?.email}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-slate-500 hover:text-red-600 p-2"
              data-testid="logout-btn"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden h-16 bg-white/80 backdrop-blur-xl border-b border-slate-200/50 flex items-center px-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors mr-4"
            data-testid="open-sidebar-btn"
          >
            <Menu className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-semibold gradient-text">Jika</h1>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-6 space-y-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
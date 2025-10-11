import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  CheckSquare, 
  Calendar, 
  FolderOpen, 
  TrendingUp,
  Clock,
  Target,
  Zap,
  Plus,
  ArrowRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import axios from 'axios';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API}/dashboard/stats`);
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
      toast.error('Error al cargar estadísticas');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-8 bg-slate-200 rounded mb-4"></div>
                <div className="h-12 bg-slate-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Notas',
      value: stats?.notes_count || 0,
      icon: FileText,
      color: 'from-blue-500 to-cyan-500',
      href: '/notes'
    },
    {
      title: 'Tareas',
      value: stats?.tasks_count || 0,
      icon: CheckSquare,
      color: 'from-green-500 to-emerald-500',
      href: '/tasks'
    },
    {
      title: 'Eventos',
      value: stats?.events_count || 0,
      icon: Calendar,
      color: 'from-purple-500 to-indigo-500',
      href: '/calendar'
    },
    {
      title: 'Proyectos',
      value: stats?.projects_count || 0,
      icon: FolderOpen,
      color: 'from-orange-500 to-red-500',
      href: '/projects'
    }
  ];

  return (
    <div className="space-y-8 animate-fade-in" data-testid="dashboard">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">¡Bienvenido de vuelta!</h1>
          <p className="text-slate-600">Aquí tienes un resumen de tu actividad reciente</p>
        </div>
        <div className="flex gap-3">
          <Link to="/chat">
            <Button className="btn-modern" data-testid="quick-chat-btn">
              <Zap className="w-4 h-4 mr-2" />
              Chat IA
            </Button>
          </Link>
          <Link to="/notes">
            <Button variant="outline" className="btn-secondary" data-testid="quick-note-btn">
              <Plus className="w-4 h-4 mr-2" />
              Nota rápida
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <Link key={card.title} to={card.href} className="group">
              <Card className="modern-card hover-lift group-hover:shadow-xl transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${card.color} flex items-center justify-center`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-600 mb-1">{card.title}</p>
                    <p className="text-3xl font-bold text-slate-900">{card.value}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Progress Section */}
      {stats && stats.tasks_count > 0 && (
        <Card className="modern-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-indigo-600" />
              Progreso de Tareas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Completadas</span>
                <span className="font-semibold text-slate-900">
                  {stats.completed_tasks} de {stats.tasks_count}
                </span>
              </div>
              <Progress value={stats.completion_rate} className="h-3" />
              <p className="text-sm text-slate-600">
                {stats.completion_rate.toFixed(1)}% de tus tareas completadas
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Content Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Today's Events */}
        <Card className="modern-card" data-testid="today-events">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-purple-600" />
              Eventos de Hoy
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.today_events?.length > 0 ? (
              <div className="space-y-3">
                {stats.today_events.slice(0, 4).map((event, index) => (
                  <div key={event.id} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: event.color || '#6366f1' }}></div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 truncate">{event.title}</p>
                      {event.start_date && (
                        <p className="text-sm text-slate-500">
                          {format(new Date(event.start_date), 'HH:mm', { locale: es })}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                <Link to="/calendar">
                  <Button variant="outline" className="w-full mt-3" data-testid="view-all-events-btn">
                    Ver todos los eventos
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">No tienes eventos programados para hoy</p>
                <Link to="/calendar">
                  <Button variant="outline" className="mt-3" data-testid="create-event-btn">
                    Crear evento
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Tasks */}
        <Card className="modern-card" data-testid="pending-tasks">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-green-600" />
              Tareas Pendientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.pending_tasks?.length > 0 ? (
              <div className="space-y-3">
                {stats.pending_tasks.slice(0, 5).map((task, index) => (
                  <div key={task.id} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 truncate">{task.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge 
                          variant={task.priority === 'high' ? 'destructive' : task.priority === 'medium' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Media' : 'Baja'}
                        </Badge>
                        {task.due_date && (
                          <span className="text-xs text-slate-500">
                            {format(new Date(task.due_date), 'dd MMM', { locale: es })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                <Link to="/tasks">
                  <Button variant="outline" className="w-full mt-3" data-testid="view-all-tasks-btn">
                    Ver todas las tareas
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="text-center py-8">
                <CheckSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">¡Genial! No tienes tareas pendientes</p>
                <Link to="/tasks">
                  <Button variant="outline" className="mt-3" data-testid="create-task-btn">
                    Crear tarea
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Notes */}
      {stats?.recent_notes?.length > 0 && (
        <Card className="modern-card" data-testid="recent-notes">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Notas Recientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stats.recent_notes.map((note, index) => (
                <div key={note.id} className="p-4 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                  <h4 className="font-medium text-slate-900 mb-2 truncate">{note.title}</h4>
                  <p className="text-sm text-slate-600 mb-3 line-clamp-2">
                    {note.content.substring(0, 100)}...
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {note.tags?.slice(0, 2).map((tag, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <Link to="/notes">
              <Button variant="outline" className="w-full mt-4" data-testid="view-all-notes-btn">
                Ver todas las notas
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;
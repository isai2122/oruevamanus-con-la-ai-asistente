import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  CheckSquare, 
  Square,
  Calendar,
  Clock,
  Flag,
  Edit3,
  Trash2,
  Save,
  X,
  Filter,
  Target,
  TrendingUp
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Checkbox } from './ui/checkbox';
import { Progress } from './ui/progress';
import axios from 'axios';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const TasksManager = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterCompleted, setFilterCompleted] = useState(null);
  const [filterPriority, setFilterPriority] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    due_date: '',
    category: 'general',
    estimated_time: ''
  });

  useEffect(() => {
    fetchTasks();
  }, [filterCompleted, filterPriority, filterCategory]);

  const fetchTasks = async () => {
    try {
      const params = new URLSearchParams();
      if (filterCompleted !== null) params.append('completed', filterCompleted.toString());
      if (filterPriority) params.append('priority', filterPriority);
      if (filterCategory) params.append('category', filterCategory);
      
      const response = await axios.get(`${API}/tasks?${params}`);
      setTasks(response.data.tasks || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast.error('Error al cargar tareas');
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const taskData = {
        ...formData,
        due_date: formData.due_date ? new Date(formData.due_date).toISOString() : null,
        estimated_time: formData.estimated_time ? parseInt(formData.estimated_time) : null
      };

      if (editingTask) {
        await axios.put(`${API}/tasks/${editingTask.id}`, taskData);
        toast.success('Tarea actualizada exitosamente');
      } else {
        await axios.post(`${API}/tasks`, taskData);
        toast.success('Tarea creada exitosamente');
      }
      
      setIsDialogOpen(false);
      setEditingTask(null);
      resetForm();
      fetchTasks();
    } catch (error) {
      console.error('Error saving task:', error);
      toast.error('Error al guardar tarea');
    }
  };

  const handleEdit = (task) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description,
      priority: task.priority,
      due_date: task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : '',
      category: task.category,
      estimated_time: task.estimated_time || ''
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (taskId) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar esta tarea?')) {
      try {
        await axios.delete(`${API}/tasks/${taskId}`);
        toast.success('Tarea eliminada exitosamente');
        fetchTasks();
      } catch (error) {
        console.error('Error deleting task:', error);
        toast.error('Error al eliminar tarea');
      }
    }
  };

  const handleToggleComplete = async (task) => {
    try {
      if (!task.completed) {
        await axios.put(`${API}/tasks/${task.id}/complete`);
        toast.success('Tarea completada');
      } else {
        // For uncompleting, we need to update the task
        await axios.put(`${API}/tasks/${task.id}`, { ...task, completed: false });
        toast.success('Tarea marcada como pendiente');
      }
      fetchTasks();
    } catch (error) {
      console.error('Error updating task status:', error);
      toast.error('Error al actualizar tarea');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      priority: 'medium',
      due_date: '',
      category: 'general',
      estimated_time: ''
    });
  };

  const handleNewTask = () => {
    resetForm();
    setEditingTask(null);
    setIsDialogOpen(true);
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-slate-600 bg-slate-50 border-slate-200';
    }
  };

  const getPriorityLabel = (priority) => {
    switch (priority) {
      case 'high': return 'Alta';
      case 'medium': return 'Media';
      case 'low': return 'Baja';
      default: return 'Sin prioridad';
    }
  };

  const completedTasks = tasks.filter(task => task.completed).length;
  const totalTasks = tasks.length;
  const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  const allCategories = [...new Set(tasks.map(task => task.category))];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-6 bg-slate-200 rounded mb-4"></div>
                <div className="space-y-2 mb-4">
                  <div className="h-4 bg-slate-200 rounded"></div>
                  <div className="h-4 bg-slate-200 rounded w-4/5"></div>
                </div>
                <div className="flex gap-2">
                  <div className="h-6 bg-slate-200 rounded w-16"></div>
                  <div className="h-6 bg-slate-200 rounded w-20"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="tasks-manager">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Gestor de Tareas</h1>
          <p className="text-slate-600">Organiza y completa tus actividades de forma eficiente</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleNewTask} className="btn-modern" data-testid="create-task-btn">
              <Plus className="w-4 h-4 mr-2" />
              Nueva Tarea
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingTask ? 'Editar Tarea' : 'Nueva Tarea'}
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Título</label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Título de la tarea"
                  required
                  className="modern-input"
                  data-testid="task-title-input"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Descripción</label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descripción de la tarea (opcional)"
                  rows={3}
                  className="modern-input resize-none"
                  data-testid="task-description-input"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Prioridad</label>
                  <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
                    <SelectTrigger data-testid="task-priority-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">Alta</SelectItem>
                      <SelectItem value="medium">Media</SelectItem>
                      <SelectItem value="low">Baja</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Categoría</label>
                  <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                    <SelectTrigger data-testid="task-category-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="trabajo">Trabajo</SelectItem>
                      <SelectItem value="personal">Personal</SelectItem>
                      <SelectItem value="urgent">Urgente</SelectItem>
                      <SelectItem value="proyecto">Proyecto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Tiempo estimado (min)</label>
                  <Input
                    type="number"
                    value={formData.estimated_time}
                    onChange={(e) => setFormData({ ...formData, estimated_time: e.target.value })}
                    placeholder="60"
                    min="1"
                    className="modern-input"
                    data-testid="task-time-input"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Fecha límite</label>
                <Input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  className="modern-input"
                  data-testid="task-due-date-input"
                />
              </div>
              
              <div className="flex justify-end gap-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsDialogOpen(false)}
                  data-testid="cancel-task-btn"
                >
                  Cancelar
                </Button>
                <Button type="submit" className="btn-modern" data-testid="save-task-btn">
                  <Save className="w-4 h-4 mr-2" />
                  {editingTask ? 'Actualizar' : 'Crear'} Tarea
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Progress Card */}
      {totalTasks > 0 && (
        <Card className="modern-card" data-testid="task-progress">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center">
                  <Target className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Progreso de Tareas</h3>
                  <p className="text-sm text-slate-600">{completedTasks} de {totalTasks} completadas</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-slate-900">{completionRate.toFixed(0)}%</p>
                <p className="text-sm text-slate-600">Completado</p>
              </div>
            </div>
            <Progress value={completionRate} className="h-3" />
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card className="modern-card">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4 items-center">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-medium text-slate-700">Filtros:</span>
            </div>
            
            <div className="flex flex-wrap gap-3 flex-1">
              <Select value={filterCompleted?.toString() || 'all'} onValueChange={(value) => setFilterCompleted(value === 'all' ? null : value === 'true')}>
                <SelectTrigger className="w-40" data-testid="filter-status-select">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="false">Pendientes</SelectItem>
                  <SelectItem value="true">Completadas</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={filterPriority || 'all'} onValueChange={(value) => setFilterPriority(value === 'all' ? '' : value)}>
                <SelectTrigger className="w-40" data-testid="filter-priority-select">
                  <Flag className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Prioridad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="medium">Media</SelectItem>
                  <SelectItem value="low">Baja</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={filterCategory || 'all'} onValueChange={(value) => setFilterCategory(value === 'all' ? '' : value)}>
                <SelectTrigger className="w-40" data-testid="filter-category-select">
                  <SelectValue placeholder="Categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {allCategories.map(category => (
                    <SelectItem key={category} value={category}>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tasks Grid */}
      {tasks.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tasks.map((task, index) => (
            <Card key={task.id} className={`modern-card hover-lift group transition-all duration-300 ${task.completed ? 'opacity-75' : ''}`}>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => handleToggleComplete(task)}
                      className="mt-0.5 flex-shrink-0"
                      data-testid={`toggle-task-${index}`}
                    >
                      {task.completed ? (
                        <CheckSquare className="w-5 h-5 text-green-600" />
                      ) : (
                        <Square className="w-5 h-5 text-slate-400 hover:text-green-600 transition-colors" />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2 ${
                        task.completed ? 'line-through text-slate-500' : ''
                      }`}>
                        {task.title}
                      </h3>
                      {task.description && (
                        <p className="text-sm text-slate-600 mt-1 line-clamp-2">
                          {task.description}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(task)}
                        className="h-8 w-8 p-0 text-slate-500 hover:text-indigo-600"
                        data-testid={`edit-task-${index}`}
                      >
                        <Edit3 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(task.id)}
                        className="h-8 w-8 p-0 text-slate-500 hover:text-red-600"
                        data-testid={`delete-task-${index}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    <Badge className={getPriorityColor(task.priority)}>
                      {getPriorityLabel(task.priority)}
                    </Badge>
                    <Badge variant="outline">
                      {task.category}
                    </Badge>
                    {task.estimated_time && (
                      <Badge variant="secondary">
                        <Clock className="w-3 h-3 mr-1" />
                        {task.estimated_time}min
                      </Badge>
                    )}
                  </div>
                  
                  {task.due_date && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Calendar className="w-4 h-4" />
                      <span>Vence: {format(new Date(task.due_date), 'dd MMM yyyy', { locale: es })}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                    <span>Creada: {format(new Date(task.created_date), 'dd MMM', { locale: es })}</span>
                    {task.completed && task.completed_date && (
                      <span>✓ {format(new Date(task.completed_date), 'dd MMM', { locale: es })}</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="modern-card">
          <CardContent className="text-center py-12">
            <CheckSquare className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              {filterCompleted !== null || filterPriority || filterCategory 
                ? 'No se encontraron tareas' 
                : 'No tienes tareas aún'}
            </h3>
            <p className="text-slate-600 mb-6">
              {filterCompleted !== null || filterPriority || filterCategory
                ? 'Prueba ajustando los filtros' 
                : 'Crea tu primera tarea para comenzar a organizarte'}
            </p>
            <Button onClick={handleNewTask} className="btn-modern" data-testid="empty-state-create-task-btn">
              <Plus className="w-4 h-4 mr-2" />
              Crear Primera Tarea
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TasksManager;
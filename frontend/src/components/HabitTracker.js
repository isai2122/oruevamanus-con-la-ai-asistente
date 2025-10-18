import React, { useState, useEffect } from 'react';
import { 
  Flame, 
  Plus,
  Target,
  TrendingUp,
  Calendar,
  Check,
  Award,
  Sparkles
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const HabitTracker = () => {
  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newHabit, setNewHabit] = useState({
    name: '',
    description: '',
    frequency: 'daily',
    duration_minutes: 30,
    auto_schedule: true
  });

  useEffect(() => {
    fetchHabits();
  }, []);

  const fetchHabits = async () => {
    try {
      const response = await axios.get(`${API}/super/habits`);
      setHabits(response.data.habits || []);
    } catch (error) {
      console.error('Error fetching habits:', error);
      toast.error('Error al cargar hábitos');
    } finally {
      setLoading(false);
    }
  };

  const createHabit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${API}/super/habits`, newHabit);
      toast.success('¡Hábito creado con programación IA!');
      setHabits([response.data.habit, ...habits]);
      setIsDialogOpen(false);
      setNewHabit({
        name: '',
        description: '',
        frequency: 'daily',
        duration_minutes: 30,
        auto_schedule: true
      });
    } catch (error) {
      console.error('Error creating habit:', error);
      toast.error('Error al crear hábito');
    }
  };

  const getStreakColor = (streak) => {
    if (streak === 0) return 'text-slate-400';
    if (streak < 7) return 'text-orange-500';
    if (streak < 30) return 'text-blue-500';
    return 'text-purple-500';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2 flex items-center gap-3">
            <Flame className="w-8 h-8 text-orange-500" />
            Seguimiento de Hábitos
          </h1>
          <p className="text-slate-600">Auto-programación IA como Reclaim</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="btn-modern">
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Hábito
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Crear Nuevo Hábito</DialogTitle>
            </DialogHeader>
            <form onSubmit={createHabit} className="space-y-4">
              <div>
                <Label htmlFor="name">Nombre del Hábito</Label>
                <Input
                  id="name"
                  value={newHabit.name}
                  onChange={(e) => setNewHabit({ ...newHabit, name: e.target.value })}
                  placeholder="Ej: Meditación matutina"
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Descripción</Label>
                <Input
                  id="description"
                  value={newHabit.description}
                  onChange={(e) => setNewHabit({ ...newHabit, description: e.target.value })}
                  placeholder="Detalles opcionales"
                />
              </div>
              <div>
                <Label htmlFor="frequency">Frecuencia</Label>
                <Select
                  value={newHabit.frequency}
                  onValueChange={(value) => setNewHabit({ ...newHabit, frequency: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona frecuencia" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Diario</SelectItem>
                    <SelectItem value="weekly">Semanal</SelectItem>
                    <SelectItem value="monthly">Mensual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="duration">Duración (minutos)</Label>
                <Input
                  id="duration"
                  type="number"
                  value={newHabit.duration_minutes}
                  onChange={(e) => setNewHabit({ ...newHabit, duration_minutes: parseInt(e.target.value) })}
                  min="5"
                  max="240"
                />
              </div>
              <div className="flex items-center gap-2 p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span className="text-sm text-indigo-900">
                  ✅ Auto-programación IA activada
                </span>
              </div>
              <Button type="submit" className="w-full btn-modern">
                Crear Hábito
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="modern-card hover-lift">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 flex items-center justify-center">
                <Flame className="w-6 h-6 text-white" />
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600 mb-1">Racha Actual</p>
              <p className="text-3xl font-bold text-slate-900">
                {habits.reduce((max, h) => Math.max(max, h.streak || 0), 0)} días
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="modern-card hover-lift">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center">
                <Target className="w-6 h-6 text-white" />
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600 mb-1">Hábitos Activos</p>
              <p className="text-3xl font-bold text-slate-900">{habits.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="modern-card hover-lift">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center">
                <Award className="w-6 h-6 text-white" />
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600 mb-1">Completados Hoy</p>
              <p className="text-3xl font-bold text-slate-900">0</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Habits List */}
      {habits.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {habits.map((habit) => (
            <Card key={habit.id} className="modern-card hover-lift">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="text-lg">{habit.name}</span>
                  {habit.auto_schedule && (
                    <Badge className="bg-indigo-600">
                      <Sparkles className="w-3 h-3 mr-1" />
                      IA
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {habit.description && (
                  <p className="text-sm text-slate-600">{habit.description}</p>
                )}
                
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-slate-600 capitalize">{habit.frequency}</span>
                  <span className="text-sm text-slate-400">•</span>
                  <span className="text-sm text-slate-600">{habit.duration_minutes} min</span>
                </div>

                <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg border border-orange-200">
                  <Flame className={`w-6 h-6 ${getStreakColor(habit.streak)}`} />
                  <div>
                    <p className="text-sm font-medium text-slate-900">Racha</p>
                    <p className={`text-xl font-bold ${getStreakColor(habit.streak)}`}>
                      {habit.streak || 0} días
                    </p>
                  </div>
                </div>

                {habit.ai_suggestions && habit.ai_suggestions.length > 0 && (
                  <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                    <p className="text-xs font-semibold text-indigo-900 mb-1 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      Sugerencia IA
                    </p>
                    <p className="text-sm text-indigo-800">{habit.ai_suggestions[0]}</p>
                  </div>
                )}

                <Button className="w-full btn-secondary">
                  <Check className="w-4 h-4 mr-2" />
                  Marcar como completado
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="modern-card">
          <CardContent className="text-center py-12">
            <Flame className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">
              No hay hábitos todavía
            </h3>
            <p className="text-slate-600 mb-6">
              Crea tu primer hábito y deja que la IA lo programe automáticamente
            </p>
            <Button onClick={() => setIsDialogOpen(true)} className="btn-modern">
              <Plus className="w-4 h-4 mr-2" />
              Crear Primer Hábito
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default HabitTracker;

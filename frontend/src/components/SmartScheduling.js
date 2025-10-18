import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  Zap, 
  TrendingUp,
  Target,
  Coffee,
  Sun,
  Moon,
  Sparkles
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import axios from 'axios';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const SmartScheduling = () => {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [optimizing, setOptimizing] = useState(false);

  const optimizeSchedule = async (type = 'daily') => {
    setOptimizing(true);
    try {
      const response = await axios.post(`${API}/super/smart-schedule`, {
        type,
        date: new Date().toISOString().split('T')[0]
      });
      
      toast.success('¡Agenda optimizada con IA!');
      setSchedules([response.data.schedule, ...schedules]);
      
      // Show optimization tips
      if (response.data.optimization_tips) {
        response.data.optimization_tips.forEach((tip, i) => {
          setTimeout(() => {
            toast.info(tip);
          }, (i + 1) * 1000);
        });
      }
    } catch (error) {
      console.error('Error optimizing schedule:', error);
      toast.error('Error al optimizar agenda');
    } finally {
      setOptimizing(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2 flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-indigo-600" />
            Programación Inteligente
          </h1>
          <p className="text-slate-600">IA optimiza tu agenda automáticamente como Motion</p>
        </div>
      </div>

      {/* Optimization Actions */}
      <Card className="modern-card bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-indigo-600" />
            Optimizar con IA
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-700 mb-4">
            Deja que la IA organice tu tiempo automáticamente, priorizando tareas importantes
            y creando bloques de enfoque para máxima productividad.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button 
              onClick={() => optimizeSchedule('daily')}
              disabled={optimizing}
              className="btn-modern bg-indigo-600 hover:bg-indigo-700"
            >
              {optimizing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Optimizando...
                </>
              ) : (
                <>
                  <Sun className="w-4 h-4 mr-2" />
                  Optimizar Hoy
                </>
              )}
            </Button>
            <Button 
              onClick={() => optimizeSchedule('weekly')}
              disabled={optimizing}
              variant="outline"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Optimizar Semana
            </Button>
            <Button 
              onClick={() => optimizeSchedule('monthly')}
              disabled={optimizing}
              variant="outline"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Optimizar Mes
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Schedule Blocks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Focus Blocks */}
        <Card className="modern-card hover-lift">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Target className="w-5 h-5 text-blue-600" />
              Bloques de Enfoque
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <span className="font-semibold text-blue-900">09:00 - 11:00</span>
                </div>
                <p className="text-sm text-blue-800">Trabajo profundo - Alta prioridad</p>
                <Badge className="mt-2 bg-blue-600">IA Optimizado</Badge>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <span className="font-semibold text-blue-900">14:00 - 16:00</span>
                </div>
                <p className="text-sm text-blue-800">Desarrollo creativo</p>
                <Badge className="mt-2 bg-blue-600">IA Optimizado</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Meeting Blocks */}
        <Card className="modern-card hover-lift">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="w-5 h-5 text-purple-600" />
              Reuniones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-purple-600" />
                  <span className="font-semibold text-purple-900">11:00 - 11:30</span>
                </div>
                <p className="text-sm text-purple-800">Daily Standup</p>
                <Badge className="mt-2 bg-purple-600">Auto-programado</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Break Blocks */}
        <Card className="modern-card hover-lift">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Coffee className="w-5 h-5 text-green-600" />
              Descansos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-green-600" />
                  <span className="font-semibold text-green-900">12:00 - 13:00</span>
                </div>
                <p className="text-sm text-green-800">Almuerzo y recarga</p>
                <Badge className="mt-2 bg-green-600">Protegido</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Optimization Insights */}
      <Card className="modern-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-600" />
            Insights de IA
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Sun className="w-5 h-5 text-blue-600" />
                <span className="font-semibold text-blue-900">Horas Pico</span>
              </div>
              <p className="text-sm text-blue-800">
                Tu productividad es máxima entre 9AM-11AM. IA ha bloqueado este tiempo para trabajo profundo.
              </p>
            </div>
            <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Moon className="w-5 h-5 text-purple-600" />
                <span className="font-semibold text-purple-900">Tiempo Buffer</span>
              </div>
              <p className="text-sm text-purple-800">
                Se agregaron 15 minutos entre reuniones para preparación y descanso.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Schedule History */}
      {schedules.length > 0 && (
        <Card className="modern-card">
          <CardHeader>
            <CardTitle>Historial de Optimizaciones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {schedules.map((schedule, index) => (
                <div key={schedule.id} className="p-4 bg-slate-50 rounded-lg flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-slate-900">{schedule.schedule_type} - {schedule.date}</p>
                    <p className="text-sm text-slate-600">Score de optimización: {(schedule.optimization_score * 100).toFixed(0)}%</p>
                  </div>
                  <Badge variant="secondary">IA Optimizado</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SmartScheduling;

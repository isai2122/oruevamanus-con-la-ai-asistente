import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Calendar as CalendarIcon, 
  Clock,
  MapPin,
  Edit3,
  Trash2,
  Save,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarClock,
  Bell
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Checkbox } from './ui/checkbox';
import axios from 'axios';
import { toast } from 'sonner';
import { format, addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CalendarView = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('week'); // week, month
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start_date: '',
    end_date: '',
    all_day: false,
    location: '',
    category: 'general',
    color: '#6366f1',
    reminder_minutes: 15
  });

  useEffect(() => {
    fetchEvents();
  }, [currentDate, viewMode]);

  const fetchEvents = async () => {
    try {
      const startDate = viewMode === 'week' 
        ? startOfWeek(currentDate, { weekStartsOn: 1 })
        : startOfMonth(currentDate);
      const endDate = viewMode === 'week'
        ? endOfWeek(currentDate, { weekStartsOn: 1 })
        : endOfMonth(currentDate);
      
      const response = await axios.get(`${API}/events`, {
        params: {
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString()
        }
      });
      setEvents(response.data.events || []);
    } catch (error) {
      console.error('Error fetching events:', error);
      toast.error('Error al cargar eventos');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const eventData = {
        ...formData,
        start_date: new Date(formData.start_date).toISOString(),
        end_date: new Date(formData.end_date).toISOString(),
        reminder_minutes: parseInt(formData.reminder_minutes)
      };

      if (editingEvent) {
        await axios.put(`${API}/events/${editingEvent.id}`, eventData);
        toast.success('Evento actualizado exitosamente');
      } else {
        await axios.post(`${API}/events`, eventData);
        toast.success('Evento creado exitosamente');
      }
      
      setIsDialogOpen(false);
      setEditingEvent(null);
      resetForm();
      fetchEvents();
    } catch (error) {
      console.error('Error saving event:', error);
      toast.error('Error al guardar evento');
    }
  };

  const handleEdit = (event) => {
    setEditingEvent(event);
    const startDate = new Date(event.start_date);
    const endDate = new Date(event.end_date);
    
    setFormData({
      title: event.title,
      description: event.description,
      start_date: format(startDate, "yyyy-MM-dd'T'HH:mm"),
      end_date: format(endDate, "yyyy-MM-dd'T'HH:mm"),
      all_day: event.all_day,
      location: event.location,
      category: event.category,
      color: event.color,
      reminder_minutes: event.reminder_minutes
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (eventId) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este evento?')) {
      try {
        await axios.delete(`${API}/events/${eventId}`);
        toast.success('Evento eliminado exitosamente');
        fetchEvents();
      } catch (error) {
        console.error('Error deleting event:', error);
        toast.error('Error al eliminar evento');
      }
    }
  };

  const resetForm = () => {
    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
    
    setFormData({
      title: '',
      description: '',
      start_date: format(now, "yyyy-MM-dd'T'HH:mm"),
      end_date: format(oneHourLater, "yyyy-MM-dd'T'HH:mm"),
      all_day: false,
      location: '',
      category: 'general',
      color: '#6366f1',
      reminder_minutes: 15
    });
  };

  const handleNewEvent = (selectedDate = null) => {
    resetForm();
    if (selectedDate) {
      const start = new Date(selectedDate);
      start.setHours(9, 0, 0, 0);
      const end = new Date(selectedDate);
      end.setHours(10, 0, 0, 0);
      
      setFormData(prev => ({
        ...prev,
        start_date: format(start, "yyyy-MM-dd'T'HH:mm"),
        end_date: format(end, "yyyy-MM-dd'T'HH:mm")
      }));
    }
    setEditingEvent(null);
    setIsDialogOpen(true);
  };

  const navigateCalendar = (direction) => {
    const newDate = new Date(currentDate);
    if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    } else {
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const getEventsForDay = (date) => {
    return events.filter(event => {
      const eventStart = new Date(event.start_date);
      return isSameDay(eventStart, date);
    });
  };

  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

    return (
      <div className="grid grid-cols-7 gap-4">
        {days.map((day, index) => {
          const dayEvents = getEventsForDay(day);
          const isToday = isSameDay(day, new Date());
          
          return (
            <Card key={index} className={`modern-card min-h-32 ${isToday ? 'ring-2 ring-indigo-500' : ''}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="text-center">
                    <p className="text-xs font-medium text-slate-600 uppercase">
                      {format(day, 'EEE', { locale: es })}
                    </p>
                    <p className={`text-lg font-bold ${isToday ? 'text-indigo-600' : 'text-slate-900'}`}>
                      {format(day, 'd')}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleNewEvent(day)}
                    className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                    data-testid={`add-event-${index}`}
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-1">
                {dayEvents.slice(0, 3).map((event, eventIndex) => (
                  <div
                    key={event.id}
                    className="p-2 rounded-lg text-xs cursor-pointer hover:opacity-80 transition-opacity group"
                    style={{ backgroundColor: `${event.color}20`, borderLeft: `3px solid ${event.color}` }}
                    onClick={() => handleEdit(event)}
                    data-testid={`event-${day.getDate()}-${eventIndex}`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-medium truncate" style={{ color: event.color }}>
                        {event.title}
                      </p>
                      <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(event);
                          }}
                          className="text-slate-500 hover:text-indigo-600"
                          data-testid={`edit-event-${day.getDate()}-${eventIndex}`}
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(event.id);
                          }}
                          className="text-slate-500 hover:text-red-600"
                          data-testid={`delete-event-${day.getDate()}-${eventIndex}`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    {!event.all_day && (
                      <p className="text-slate-600 mt-1">
                        {format(new Date(event.start_date), 'HH:mm')}
                      </p>
                    )}
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <p className="text-xs text-slate-500 text-center py-1">
                    +{dayEvents.length - 3} más
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    
    const days = [];
    let currentDay = calendarStart;
    
    while (currentDay <= calendarEnd) {
      days.push(new Date(currentDay));
      currentDay = addDays(currentDay, 1);
    }

    return (
      <div className="grid grid-cols-7 gap-2">
        {/* Week headers */}
        {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(day => (
          <div key={day} className="p-3 text-center text-sm font-semibold text-slate-600">
            {day}
          </div>
        ))}
        
        {/* Calendar days */}
        {days.map((day, index) => {
          const dayEvents = getEventsForDay(day);
          const isToday = isSameDay(day, new Date());
          const isCurrentMonth = day.getMonth() === currentDate.getMonth();
          
          return (
            <Card 
              key={index} 
              className={`modern-card min-h-24 cursor-pointer hover-lift group ${
                isToday ? 'ring-2 ring-indigo-500' : ''
              } ${!isCurrentMonth ? 'opacity-50' : ''}`}
              onClick={() => handleNewEvent(day)}
            >
              <CardContent className="p-2">
                <div className="flex items-center justify-between mb-1">
                  <p className={`text-sm font-semibold ${
                    isToday ? 'text-indigo-600' : isCurrentMonth ? 'text-slate-900' : 'text-slate-400'
                  }`}>
                    {format(day, 'd')}
                  </p>
                  <Plus className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="space-y-1">
                  {dayEvents.slice(0, 2).map((event, eventIndex) => (
                    <div
                      key={event.id}
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: event.color }}
                      title={event.title}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(event);
                      }}
                    />
                  ))}
                  {dayEvents.length > 2 && (
                    <p className="text-xs text-slate-500">+{dayEvents.length - 2}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="h-8 bg-slate-200 rounded w-48 animate-pulse"></div>
          <div className="h-10 bg-slate-200 rounded w-32 animate-pulse"></div>
        </div>
        <div className="grid grid-cols-7 gap-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-32 bg-slate-200 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="calendar-view">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Calendario</h1>
          <p className="text-slate-600">Planifica y organiza tus eventos</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button onClick={goToToday} variant="outline" className="btn-secondary" data-testid="today-btn">
            <CalendarClock className="w-4 h-4 mr-2" />
            Hoy
          </Button>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleNewEvent()} className="btn-modern" data-testid="create-event-btn">
                <Plus className="w-4 h-4 mr-2" />
                Nuevo Evento
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingEvent ? 'Editar Evento' : 'Nuevo Evento'}
                </DialogTitle>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Título</label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Título del evento"
                    required
                    className="modern-input"
                    data-testid="event-title-input"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Descripción</label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descripción del evento (opcional)"
                    rows={3}
                    className="modern-input resize-none"
                    data-testid="event-description-input"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Fecha y hora de inicio</label>
                    <Input
                      type="datetime-local"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      required
                      className="modern-input"
                      data-testid="event-start-date-input"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Fecha y hora de fin</label>
                    <Input
                      type="datetime-local"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      required
                      className="modern-input"
                      data-testid="event-end-date-input"
                    />
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="all-day"
                    checked={formData.all_day}
                    onCheckedChange={(checked) => setFormData({ ...formData, all_day: checked })}
                    data-testid="event-all-day-checkbox"
                  />
                  <label htmlFor="all-day" className="text-sm font-medium text-slate-700">
                    Todo el día
                  </label>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Ubicación</label>
                    <Input
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="Ubicación (opcional)"
                      className="modern-input"
                      data-testid="event-location-input"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Categoría</label>
                    <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                      <SelectTrigger data-testid="event-category-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">General</SelectItem>
                        <SelectItem value="trabajo">Trabajo</SelectItem>
                        <SelectItem value="personal">Personal</SelectItem>
                        <SelectItem value="reunion">Reunión</SelectItem>
                        <SelectItem value="cita">Cita</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Color</label>
                    <div className="flex gap-2 flex-wrap">
                      {['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#6b7280'].map(color => (
                        <button
                          key={color}
                          type="button"
                          className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${
                            formData.color === color ? 'border-slate-400 scale-110' : 'border-slate-200'
                          }`}
                          style={{ backgroundColor: color }}
                          onClick={() => setFormData({ ...formData, color })}
                          data-testid={`color-${color}`}
                        />
                      ))}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Recordatorio</label>
                    <Select 
                      value={formData.reminder_minutes.toString()} 
                      onValueChange={(value) => setFormData({ ...formData, reminder_minutes: parseInt(value) })}
                    >
                      <SelectTrigger data-testid="event-reminder-select">
                        <Bell className="w-4 h-4 mr-2" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Sin recordatorio</SelectItem>
                        <SelectItem value="15">15 minutos antes</SelectItem>
                        <SelectItem value="30">30 minutos antes</SelectItem>
                        <SelectItem value="60">1 hora antes</SelectItem>
                        <SelectItem value="1440">1 día antes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="flex justify-end gap-3">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsDialogOpen(false)}
                    data-testid="cancel-event-btn"
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" className="btn-modern" data-testid="save-event-btn">
                    <Save className="w-4 h-4 mr-2" />
                    {editingEvent ? 'Actualizar' : 'Crear'} Evento
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Navigation and View Controls */}
      <Card className="modern-card">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateCalendar('prev')}
                data-testid="prev-period-btn"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              
              <h2 className="text-xl font-bold text-slate-900 min-w-48 text-center">
                {format(currentDate, viewMode === 'week' ? 'MMMM yyyy' : 'MMMM yyyy', { locale: es })}
              </h2>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateCalendar('next')}
                data-testid="next-period-btn"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'week' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('week')}
                data-testid="week-view-btn"
              >
                Semana
              </Button>
              <Button
                variant={viewMode === 'month' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('month')}
                data-testid="month-view-btn"
              >
                Mes
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendar Grid */}
      <div data-testid="calendar-grid">
        {viewMode === 'week' ? renderWeekView() : renderMonthView()}
      </div>

      {/* Today's Events */}
      {events.filter(event => isSameDay(new Date(event.start_date), new Date())).length > 0 && (
        <Card className="modern-card" data-testid="today-events">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-indigo-600" />
              Eventos de Hoy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {events
                .filter(event => isSameDay(new Date(event.start_date), new Date()))
                .sort((a, b) => new Date(a.start_date) - new Date(b.start_date))
                .map((event, index) => (
                  <div key={event.id} className="flex items-center gap-4 p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors group">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: event.color }}></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-slate-900 truncate">{event.title}</p>
                        <Badge variant="outline" className="text-xs">{event.category}</Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-600">
                        {!event.all_day && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {format(new Date(event.start_date), 'HH:mm')} - {format(new Date(event.end_date), 'HH:mm')}
                          </div>
                        )}
                        {event.location && (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            <span className="truncate">{event.location}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(event)}
                        className="h-8 w-8 p-0 text-slate-500 hover:text-indigo-600"
                        data-testid={`edit-today-event-${index}`}
                      >
                        <Edit3 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(event.id)}
                        className="h-8 w-8 p-0 text-slate-500 hover:text-red-600"
                        data-testid={`delete-today-event-${index}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CalendarView;
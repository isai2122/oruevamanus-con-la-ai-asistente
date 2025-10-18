import React, { useState, useEffect } from 'react';
import { 
  Headphones, 
  Plus,
  AlertCircle,
  CheckCircle2,
  Clock,
  Sparkles,
  Send
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const SupportCenter = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newTicket, setNewTicket] = useState({
    title: '',
    description: '',
    category: 'general',
    priority: 'medium'
  });

  const createTicket = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${API}/super/support/ticket`, newTicket);
      toast.success('¡Ticket creado y analizado por IA!');
      
      // Show auto response
      if (response.data.auto_response) {
        setTimeout(() => {
          toast.info('Respuesta automática: ' + response.data.auto_response);
        }, 1000);
      }
      
      setTickets([response.data.ticket, ...tickets]);
      setIsDialogOpen(false);
      setNewTicket({ title: '', description: '', category: 'general', priority: 'medium' });
    } catch (error) {
      console.error('Error creating ticket:', error);
      toast.error('Error al crear ticket');
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'open':
        return <AlertCircle className="w-5 h-5 text-orange-500" />;
      case 'in_progress':
        return <Clock className="w-5 h-5 text-blue-500" />;
      case 'resolved':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-slate-400" />;
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      open: { label: 'Abierto', variant: 'default' },
      in_progress: { label: 'En Progreso', variant: 'secondary' },
      resolved: { label: 'Resuelto', variant: 'secondary' },
      closed: { label: 'Cerrado', variant: 'secondary' }
    };
    const config = statusMap[status] || statusMap.open;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getPriorityBadge = (priority) => {
    const priorityMap = {
      low: { label: 'Baja', variant: 'secondary' },
      medium: { label: 'Media', variant: 'default' },
      high: { label: 'Alta', variant: 'destructive' }
    };
    const config = priorityMap[priority] || priorityMap.medium;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2 flex items-center gap-3">
            <Headphones className="w-8 h-8 text-indigo-600" />
            Centro de Soporte
          </h1>
          <p className="text-slate-600">Análisis automático con IA como eesel AI</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="btn-modern">
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Ticket
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Crear Ticket de Soporte</DialogTitle>
            </DialogHeader>
            <form onSubmit={createTicket} className="space-y-4">
              <div>
                <Label htmlFor="title">Título</Label>
                <Input
                  id="title"
                  value={newTicket.title}
                  onChange={(e) => setNewTicket({ ...newTicket, title: e.target.value })}
                  placeholder="Describe el problema brevemente"
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Descripción Detallada</Label>
                <Textarea
                  id="description"
                  value={newTicket.description}
                  onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                  placeholder="Explica el problema en detalle..."
                  rows={5}
                  required
                />
              </div>
              <div>
                <Label htmlFor="category">Categoría</Label>
                <Select
                  value={newTicket.category}
                  onValueChange={(value) => setNewTicket({ ...newTicket, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="technical">Técnico</SelectItem>
                    <SelectItem value="billing">Facturación</SelectItem>
                    <SelectItem value="feature_request">Solicitud de Función</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="priority">Prioridad</Label>
                <Select
                  value={newTicket.priority}
                  onValueChange={(value) => setNewTicket({ ...newTicket, priority: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona prioridad" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baja</SelectItem>
                    <SelectItem value="medium">Media</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span className="text-sm text-indigo-900">
                  ✅ Análisis automático con IA activado
                </span>
              </div>
              <Button type="submit" className="w-full btn-modern">
                <Send className="w-4 h-4 mr-2" />
                Crear Ticket
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* AI Features Banner */}
      <Card className="modern-card bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 mb-2">Soporte Automatizado con IA</h3>
              <p className="text-sm text-slate-700 mb-3">
                Cada ticket es analizado automáticamente por IA para:
              </p>
              <ul className="text-sm text-slate-700 space-y-1">
                <li>✓ Detectar categoría y prioridad automáticamente</li>
                <li>✓ Sugerir respuestas y soluciones instantáneas</li>
                <li>✓ Identificar patrones y problemas comunes</li>
                <li>✓ Proporcionar pasos de resolución personalizados</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tickets List */}
      {tickets.length > 0 ? (
        <div className="space-y-4">
          {tickets.map((ticket) => (
            <Card key={ticket.id} className="modern-card hover-lift">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-3">
                    {getStatusIcon(ticket.status)}
                    <div>
                      <h3 className="font-semibold text-slate-900 mb-1">{ticket.title}</h3>
                      <p className="text-sm text-slate-600">{ticket.description}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {getStatusBadge(ticket.status)}
                    {getPriorityBadge(ticket.priority)}
                  </div>
                </div>

                {ticket.ai_analysis && (
                  <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200 mt-4">
                    <p className="text-xs font-semibold text-indigo-900 mb-2 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      Análisis de IA
                    </p>
                    <p className="text-sm text-indigo-800">{ticket.ai_analysis.analysis}</p>
                  </div>
                )}

                {ticket.auto_responses && ticket.auto_responses.length > 0 && (
                  <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-xs font-semibold text-green-900 mb-2">Respuesta Automática</p>
                    <p className="text-sm text-green-800">{ticket.auto_responses[0]}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="modern-card">
          <CardContent className="text-center py-12">
            <Headphones className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">
              No hay tickets todavía
            </h3>
            <p className="text-slate-600 mb-6">
              Crea un ticket y obtén análisis automático con IA
            </p>
            <Button onClick={() => setIsDialogOpen(true)} className="btn-modern">
              <Plus className="w-4 h-4 mr-2" />
              Crear Primer Ticket
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SupportCenter;
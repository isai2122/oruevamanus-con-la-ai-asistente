import React, { useState, useEffect } from 'react';
import { 
  Puzzle, 
  Plus,
  Check,
  ExternalLink,
  Sparkles,
  Mail,
  Calendar,
  MessageSquare,
  Github,
  Database,
  Cloud,
  Zap
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

const IntegrationsHub = () => {
  const [integrations, setIntegrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newIntegration, setNewIntegration] = useState({
    service_name: '',
    service_type: 'calendar',
    credentials: {},
    settings: {}
  });

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const fetchIntegrations = async () => {
    try {
      const response = await axios.get(`${API}/super/integrations`);
      setIntegrations(response.data.integrations || []);
    } catch (error) {
      console.error('Error fetching integrations:', error);
      toast.error('Error al cargar integraciones');
    } finally {
      setLoading(false);
    }
  };

  const createIntegration = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${API}/super/integrations`, newIntegration);
      toast.success(`Integración con ${newIntegration.service_name} configurada!`);
      setIntegrations([response.data.integration, ...integrations]);
      setIsDialogOpen(false);
      setNewIntegration({
        service_name: '',
        service_type: 'calendar',
        credentials: {},
        settings: {}
      });
    } catch (error) {
      console.error('Error creating integration:', error);
      toast.error('Error al crear integración');
    }
  };

  const getServiceIcon = (type) => {
    switch (type) {
      case 'calendar':
        return <Calendar className="w-6 h-6" />;
      case 'communication':
        return <MessageSquare className="w-6 h-6" />;
      case 'email':
        return <Mail className="w-6 h-6" />;
      case 'code':
        return <Github className="w-6 h-6" />;
      case 'database':
        return <Database className="w-6 h-6" />;
      case 'cloud':
        return <Cloud className="w-6 h-6" />;
      default:
        return <Puzzle className="w-6 h-6" />;
    }
  };

  const availableServices = [
    { name: 'Google Calendar', type: 'calendar', color: 'from-blue-500 to-blue-600' },
    { name: 'Gmail', type: 'email', color: 'from-red-500 to-red-600' },
    { name: 'Slack', type: 'communication', color: 'from-purple-500 to-purple-600' },
    { name: 'GitHub', type: 'code', color: 'from-gray-700 to-gray-900' },
    { name: 'Notion', type: 'database', color: 'from-slate-600 to-slate-800' },
    { name: 'Dropbox', type: 'cloud', color: 'from-blue-400 to-blue-500' },
  ];

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
            <Puzzle className="w-8 h-8 text-indigo-600" />
            Hub de Integraciones
          </h1>
          <p className="text-slate-600">Conecta 100+ servicios como eesel AI</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="btn-modern">
              <Plus className="w-4 h-4 mr-2" />
              Nueva Integración
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Agregar Integración</DialogTitle>
            </DialogHeader>
            <form onSubmit={createIntegration} className="space-y-4">
              <div>
                <Label htmlFor="service_name">Nombre del Servicio</Label>
                <Input
                  id="service_name"
                  value={newIntegration.service_name}
                  onChange={(e) => setNewIntegration({ ...newIntegration, service_name: e.target.value })}
                  placeholder="Ej: Google Calendar, Slack"
                  required
                />
              </div>
              <div>
                <Label htmlFor="service_type">Tipo de Servicio</Label>
                <Select
                  value={newIntegration.service_type}
                  onValueChange={(value) => setNewIntegration({ ...newIntegration, service_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="calendar">Calendario</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="communication">Comunicación</SelectItem>
                    <SelectItem value="code">Código/Git</SelectItem>
                    <SelectItem value="database">Base de Datos</SelectItem>
                    <SelectItem value="cloud">Almacenamiento</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span className="text-sm text-indigo-900">
                  ✅ Sincronización automática con IA
                </span>
              </div>
              <Button type="submit" className="w-full btn-modern">
                <Zap className="w-4 h-4 mr-2" />
                Conectar Servicio
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="modern-card hover-lift">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center">
                <Check className="w-6 h-6 text-white" />
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600 mb-1">Activas</p>
              <p className="text-3xl font-bold text-slate-900">
                {integrations.filter(i => i.is_active).length}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="modern-card hover-lift">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center">
                <Puzzle className="w-6 h-6 text-white" />
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600 mb-1">Total</p>
              <p className="text-3xl font-bold text-slate-900">{integrations.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="modern-card hover-lift">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600 mb-1">Disponibles</p>
              <p className="text-3xl font-bold text-slate-900">100+</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Available Services */}
      <Card className="modern-card">
        <CardHeader>
          <CardTitle>Servicios Populares</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableServices.map((service) => (
              <div
                key={service.name}
                className="p-4 rounded-lg border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer"
                onClick={() => {
                  setNewIntegration({
                    ...newIntegration,
                    service_name: service.name,
                    service_type: service.type
                  });
                  setIsDialogOpen(true);
                }}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-r ${service.color} flex items-center justify-center text-white`}>
                    {getServiceIcon(service.type)}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">{service.name}</p>
                    <p className="text-xs text-slate-500 capitalize">{service.type}</p>
                  </div>
                  <Button size="sm" variant="ghost">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Active Integrations */}
      {integrations.length > 0 ? (
        <Card className="modern-card">
          <CardHeader>
            <CardTitle>Integraciones Activas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {integrations.map((integration) => (
                <div
                  key={integration.id}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-white">
                      {getServiceIcon(integration.service_type)}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{integration.service_name}</p>
                      <p className="text-sm text-slate-600 capitalize">{integration.service_type}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {integration.is_active ? (
                      <Badge className="bg-green-600">
                        <Check className="w-3 h-3 mr-1" />
                        Activa
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Inactiva</Badge>
                    )}
                    <Button size="sm" variant="outline">
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="modern-card">
          <CardContent className="text-center py-12">
            <Puzzle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">
              No hay integraciones todavía
            </h3>
            <p className="text-slate-600 mb-6">
              Conecta tus servicios favoritos para maximizar la productividad
            </p>
            <Button onClick={() => setIsDialogOpen(true)} className="btn-modern">
              <Plus className="w-4 h-4 mr-2" />
              Agregar Primera Integración
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default IntegrationsHub;
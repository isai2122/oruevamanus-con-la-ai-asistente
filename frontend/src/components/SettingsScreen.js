import React, { useState, useEffect } from 'react';
import { 
  User,
  Settings,
  Palette,
  Bell,
  Shield,
  Smartphone,
  Brain,
  Save,
  Upload,
  Download,
  Trash2,
  Key,
  Globe,
  Moon,
  Sun,
  Volume2,
  VolumeX,
  Camera
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import axios from 'axios';
import { toast } from 'sonner';
import { useAuth } from '../App';
import { useTheme, COLOR_PALETTES } from '../contexts/ThemeContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const SettingsScreen = () => {
  const { user } = useAuth();
  const { currentPalette, changePalette, assistantConfig, updateAssistantConfig } = useTheme();
  const [localAssistantConfig, setLocalAssistantConfig] = useState({
    name: 'Asistente',
    photo: '',
    tone: 'amable'
  });
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    sound: true,
    taskReminders: true,
    eventReminders: true
  });
  const [preferences, setPreferences] = useState({
    theme: 'light',
    language: 'es',
    timezone: 'America/Mexico_City',
    dateFormat: 'dd/MM/yyyy',
    autoSave: true,
    offlineMode: true
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAssistantConfig();
    fetchPreferences();
  }, []);

  const fetchAssistantConfig = async () => {
    try {
      const response = await axios.get(`${API}/assistant/config`);
      setLocalAssistantConfig(response.data);
      updateAssistantConfig(response.data); // Actualizar en contexto también
    } catch (error) {
      console.error('Error fetching assistant config:', error);
    }
  };

  const fetchPreferences = async () => {
    try {
      const response = await axios.get(`${API}/user/preferences`);
      setPreferences(response.data);
      // Si tiene tema guardado, aplicarlo
      if (response.data.colorPalette) {
        changePalette(response.data.colorPalette);
      }
    } catch (error) {
      console.error('Error fetching preferences:', error);
    }
  };

  const saveAssistantConfig = async () => {
    setLoading(true);
    try {
      await axios.put(`${API}/assistant/config`, localAssistantConfig);
      updateAssistantConfig(localAssistantConfig); // Actualizar contexto
      toast.success('Configuración del asistente actualizada');
    } catch (error) {
      console.error('Error saving assistant config:', error);
      toast.error('Error al guardar configuración');
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    setLoading(true);
    try {
      const prefsWithPalette = {
        ...preferences,
        colorPalette: currentPalette
      };
      await axios.put(`${API}/user/preferences`, prefsWithPalette);
      toast.success('Preferencias guardadas');
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error('Error al guardar preferencias');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setLocalAssistantConfig({
          ...localAssistantConfig,
          photo: e.target.result
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const exportData = () => {
    const data = {
      user: user,
      assistantConfig: localAssistantConfig,
      notifications: notifications,
      preferences: preferences,
      exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `asistente-definitivo-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Datos exportados exitosamente');
  };

  const toneOptions = [
    { value: 'amable', label: 'Amable y cordial', description: 'Un asistente cálido y cercano' },
    { value: 'formal', label: 'Formal y profesional', description: 'Comunicación profesional y directa' },
    { value: 'energetico', label: 'Energético y motivador', description: 'Actitud positiva y motivacional' },
    { value: 'conciso', label: 'Conciso y directo', description: 'Respuestas breves y al punto' }
  ];

  return (
    <div className="space-y-6 animate-fade-in" data-testid="settings-screen">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Configuración</h1>
        <p className="text-slate-600">Personaliza tu experiencia con Jika</p>
      </div>

      <Tabs defaultValue="assistant" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-5">
          <TabsTrigger value="assistant" className="flex items-center gap-2" data-testid="assistant-tab">
            <Brain className="w-4 h-4" />
            <span className="hidden sm:inline">Asistente</span>
          </TabsTrigger>
          <TabsTrigger value="account" className="flex items-center gap-2" data-testid="account-tab">
            <User className="w-4 h-4" />
            <span className="hidden sm:inline">Cuenta</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2" data-testid="notifications-tab">
            <Bell className="w-4 h-4" />
            <span className="hidden sm:inline">Notificaciones</span>
          </TabsTrigger>
          <TabsTrigger value="preferences" className="flex items-center gap-2" data-testid="preferences-tab">
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Preferencias</span>
          </TabsTrigger>
          <TabsTrigger value="data" className="flex items-center gap-2" data-testid="data-tab">
            <Shield className="w-4 h-4" />
            <span className="hidden sm:inline">Datos</span>
          </TabsTrigger>
        </TabsList>

        {/* Assistant Configuration */}
        <TabsContent value="assistant">
          <Card className="modern-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-indigo-600" />
                Configuración del Asistente IA
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Assistant Photo */}
              <div className="flex items-center gap-6">
                <div className="relative">
                  <Avatar className="w-20 h-20">
                    {localAssistantConfig.photo ? (
                      <AvatarImage src={localAssistantConfig.photo} alt={localAssistantConfig.name} />
                    ) : (
                      <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-2xl font-bold">
                        {localAssistantConfig.name.charAt(0)}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <label className="absolute bottom-0 right-0 bg-indigo-600 text-white p-2 rounded-full cursor-pointer hover:bg-indigo-700 transition-colors">
                    <Camera className="w-4 h-4" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      data-testid="assistant-photo-input"
                    />
                  </label>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900 mb-2">Foto del Asistente</h3>
                  <p className="text-sm text-slate-600">Personaliza la imagen de tu asistente IA</p>
                </div>
              </div>

              {/* Assistant Name */}
              <div className="space-y-2">
                <Label htmlFor="assistant-name">Nombre del Asistente</Label>
                <Input
                  id="assistant-name"
                  value={localAssistantConfig.name}
                  onChange={(e) => setLocalAssistantConfig({ ...assistantConfig, name: e.target.value })}
                  placeholder="Nombre de tu asistente"
                  className="modern-input"
                  data-testid="assistant-name-input"
                />
                <p className="text-sm text-slate-500">Así se referirá a sí mismo en las conversaciones</p>
              </div>

              {/* Assistant Tone */}
              <div className="space-y-4">
                <Label>Personalidad y Tono</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {toneOptions.map((option) => (
                    <div
                      key={option.value}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                        localAssistantConfig.tone === option.value
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                      onClick={() => setLocalAssistantConfig({ ...assistantConfig, tone: option.value })}
                      data-testid={`tone-${option.value}`}
                    >
                      <h4 className="font-medium text-slate-900 mb-1">{option.label}</h4>
                      <p className="text-sm text-slate-600">{option.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end">
                <Button 
                  onClick={saveAssistantConfig} 
                  disabled={loading}
                  className="btn-modern"
                  data-testid="save-assistant-config-btn"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Guardando...
                    </div>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Guardar Configuración
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Account Settings */}
        <TabsContent value="account">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Profile Information */}
            <Card className="modern-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5 text-indigo-600" />
                  Información del Perfil
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Nombre completo</Label>
                  <Input value={user?.full_name || ''} disabled className="modern-input" />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={user?.email || ''} disabled className="modern-input" />
                </div>
                <div className="space-y-2">
                  <Label>Plan actual</Label>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{user?.plan || 'free'}</Badge>
                    <span className="text-sm text-slate-600">
                      {user?.plan === 'free' ? 'Plan Gratuito' : 'Plan Premium'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Device Management */}
            <Card className="modern-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-indigo-600" />
                  Dispositivos Conectados
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {user?.device_ids?.map((device, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Smartphone className="w-4 h-4 text-slate-500" />
                        <div>
                          <p className="font-medium text-slate-900">Dispositivo {index + 1}</p>
                          <p className="text-xs text-slate-500 truncate max-w-48">{device}</p>
                        </div>
                      </div>
                      <Badge variant="secondary">Activo</Badge>
                    </div>
                  )) || (
                    <p className="text-sm text-slate-500">No hay dispositivos conectados</p>
                  )}
                </div>
                <p className="text-xs text-slate-500">
                  Límite: {user?.device_ids?.length || 0}/4 dispositivos
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications">
          <Card className="modern-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-indigo-600" />
                Configuración de Notificaciones
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div className="space-y-1">
                    <Label>Notificaciones por email</Label>
                    <p className="text-sm text-slate-600">Recibe actualizaciones por correo electrónico</p>
                  </div>
                  <Switch
                    checked={notifications.email}
                    onCheckedChange={(checked) => setNotifications({ ...notifications, email: checked })}
                    data-testid="email-notifications-switch"
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div className="space-y-1">
                    <Label>Notificaciones push</Label>
                    <p className="text-sm text-slate-600">Notificaciones en tiempo real en el navegador</p>
                  </div>
                  <Switch
                    checked={notifications.push}
                    onCheckedChange={(checked) => setNotifications({ ...notifications, push: checked })}
                    data-testid="push-notifications-switch"
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div className="space-y-1">
                    <Label>Sonidos de notificación</Label>
                    <p className="text-sm text-slate-600">Reproducir sonidos para notificaciones</p>
                  </div>
                  <Switch
                    checked={notifications.sound}
                    onCheckedChange={(checked) => setNotifications({ ...notifications, sound: checked })}
                    data-testid="sound-notifications-switch"
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div className="space-y-1">
                    <Label>Recordatorios de tareas</Label>
                    <p className="text-sm text-slate-600">Notificaciones para tareas pendientes y vencidas</p>
                  </div>
                  <Switch
                    checked={notifications.taskReminders}
                    onCheckedChange={(checked) => setNotifications({ ...notifications, taskReminders: checked })}
                    data-testid="task-reminders-switch"
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div className="space-y-1">
                    <Label>Recordatorios de eventos</Label>
                    <p className="text-sm text-slate-600">Alertas antes de eventos programados</p>
                  </div>
                  <Switch
                    checked={notifications.eventReminders}
                    onCheckedChange={(checked) => setNotifications({ ...notifications, eventReminders: checked })}
                    data-testid="event-reminders-switch"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preferences */}
        <TabsContent value="preferences">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Appearance */}
            <Card className="modern-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="w-5 h-5 text-indigo-600" />
                  Apariencia
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <Label>Paleta de Colores</Label>
                  <p className="text-xs text-slate-600 mb-3">Elige la combinación de colores para toda la aplicación</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {Object.entries(COLOR_PALETTES).map(([key, palette]) => (
                      <button
                        key={key}
                        onClick={() => {
                          changePalette(key);
                          setPreferences({ ...preferences, colorPalette: key });
                        }}
                        className={`p-4 rounded-lg border-2 transition-all hover:scale-105 ${
                          currentPalette === key 
                            ? 'border-indigo-500 ring-2 ring-indigo-200' 
                            : 'border-slate-200'
                        }`}
                      >
                        <div className="space-y-2">
                          <div className="flex gap-1 h-8">
                            <div className="flex-1 rounded" style={{ backgroundColor: palette.primary }}></div>
                            <div className="flex-1 rounded" style={{ backgroundColor: palette.secondary }}></div>
                            <div className="flex-1 rounded" style={{ backgroundColor: palette.accent }}></div>
                          </div>
                          <p className="text-xs font-medium text-center">{palette.name}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Idioma</Label>
                  <Select 
                    value={preferences.language} 
                    onValueChange={(value) => setPreferences({ ...preferences, language: value })}
                  >
                    <SelectTrigger data-testid="language-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="es">
                        <div className="flex items-center gap-2">
                          <Globe className="w-4 h-4" />
                          Español
                        </div>
                      </SelectItem>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="fr">Français</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Formato de fecha</Label>
                  <Select 
                    value={preferences.dateFormat} 
                    onValueChange={(value) => setPreferences({ ...preferences, dateFormat: value })}
                  >
                    <SelectTrigger data-testid="date-format-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dd/MM/yyyy">DD/MM/AAAA</SelectItem>
                      <SelectItem value="MM/dd/yyyy">MM/DD/AAAA</SelectItem>
                      <SelectItem value="yyyy-MM-dd">AAAA-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Functionality */}
            <Card className="modern-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-indigo-600" />
                  Funcionalidad
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="space-y-1">
                    <Label>Guardado automático</Label>
                    <p className="text-xs text-slate-600">Guardar cambios automáticamente</p>
                  </div>
                  <Switch
                    checked={preferences.autoSave}
                    onCheckedChange={(checked) => setPreferences({ ...preferences, autoSave: checked })}
                    data-testid="auto-save-switch"
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="space-y-1">
                    <Label>Modo offline</Label>
                    <p className="text-xs text-slate-600">Trabajar sin conexión a internet</p>
                  </div>
                  <Switch
                    checked={preferences.offlineMode}
                    onCheckedChange={(checked) => setPreferences({ ...preferences, offlineMode: checked })}
                    data-testid="offline-mode-switch"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Zona horaria</Label>
                  <Select 
                    value={preferences.timezone} 
                    onValueChange={(value) => setPreferences({ ...preferences, timezone: value })}
                  >
                    <SelectTrigger data-testid="timezone-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="America/Mexico_City">México (GMT-6)</SelectItem>
                      <SelectItem value="America/New_York">Nueva York (GMT-5)</SelectItem>
                      <SelectItem value="Europe/Madrid">Madrid (GMT+1)</SelectItem>
                      <SelectItem value="Asia/Tokyo">Tokio (GMT+9)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="pt-4">
                  <Button 
                    onClick={savePreferences} 
                    disabled={loading}
                    className="w-full btn-modern"
                  >
                    {loading ? 'Guardando...' : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Guardar Preferencias
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Data Management */}
        <TabsContent value="data">
          <div className="space-y-6">
            {/* Export & Import */}
            <Card className="modern-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-indigo-600" />
                  Gestión de Datos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border border-slate-200 rounded-lg">
                    <h4 className="font-semibold text-slate-900 mb-2">Exportar datos</h4>
                    <p className="text-sm text-slate-600 mb-4">
                      Descarga una copia de seguridad de todos tus datos
                    </p>
                    <Button onClick={exportData} variant="outline" className="w-full" data-testid="export-data-btn">
                      <Download className="w-4 h-4 mr-2" />
                      Exportar datos
                    </Button>
                  </div>

                  <div className="p-4 border border-slate-200 rounded-lg">
                    <h4 className="font-semibold text-slate-900 mb-2">Importar datos</h4>
                    <p className="text-sm text-slate-600 mb-4">
                      Restaura tus datos desde una copia de seguridad
                    </p>
                    <Button variant="outline" className="w-full" data-testid="import-data-btn">
                      <Upload className="w-4 h-4 mr-2" />
                      Importar datos
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card className="modern-card border-red-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <Trash2 className="w-5 h-5" />
                  Zona Peligrosa
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <h4 className="font-semibold text-red-900 mb-2">Eliminar cuenta</h4>
                  <p className="text-sm text-red-700 mb-4">
                    Esta acción eliminará permanentemente tu cuenta y todos los datos asociados. Esta acción no se puede deshacer.
                  </p>
                  <Button variant="destructive" data-testid="delete-account-btn">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Eliminar cuenta
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsScreen;
import React, { useState, useEffect } from 'react';
import { 
  Home, 
  Lightbulb, 
  Thermometer,
  Volume2,
  Camera,
  Wifi,
  WifiOff,
  Plus,
  Settings,
  Zap,
  Power,
  MoreHorizontal,
  Smartphone,
  Speaker,
  Monitor,
  Lock,
  Unlock,
  Sun,
  Moon
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Switch } from './ui/switch';
import { Slider } from './ui/slider';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const SmartHome = () => {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddingDevice, setIsAddingDevice] = useState(false);
  const [newDevice, setNewDevice] = useState({
    name: '',
    type: 'light',
    room: 'living_room',
    brand: 'philips_hue',
    device_id: ''
  });
  const [voiceCommand, setVoiceCommand] = useState('');
  const [isListening, setIsListening] = useState(false);

  useEffect(() => {
    fetchDevices();
  }, []);

  const fetchDevices = async () => {
    try {
      // Simulate devices for demo (in real app, fetch from API)
      const mockDevices = [
        {
          id: '1',
          device_name: 'Luz de Sala',
          device_type: 'light',
          room: 'Sala',
          brand: 'philips_hue',
          is_online: true,
          last_command: 'Encender 80%'
        },
        {
          id: '2', 
          device_name: 'Termostato Principal',
          device_type: 'thermostat',
          room: 'Sala',
          brand: 'nest',
          is_online: true,
          last_command: '22°C'
        },
        {
          id: '3',
          device_name: 'Alexa Cocina',
          device_type: 'speaker', 
          room: 'Cocina',
          brand: 'amazon',
          is_online: true,
          last_command: 'Reproducir música'
        },
        {
          id: '4',
          device_name: 'Cámara Entrada',
          device_type: 'camera',
          room: 'Entrada',
          brand: 'ring',
          is_online: false,
          last_command: 'Activar grabación'
        }
      ];
      setDevices(mockDevices);
    } catch (error) {
      console.error('Error fetching devices:', error);
      toast.error('Error al cargar dispositivos');
    } finally {
      setLoading(false);
    }
  };

  const handleAddDevice = async () => {
    try {
      await axios.post(`${API}/super/smart-home/device`, newDevice);
      toast.success('Dispositivo agregado exitosamente');
      setIsAddingDevice(false);
      setNewDevice({
        name: '',
        type: 'light',
        room: 'living_room', 
        brand: 'philips_hue',
        device_id: ''
      });
      fetchDevices();
    } catch (error) {
      console.error('Error adding device:', error);
      toast.error('Error al agregar dispositivo');
    }
  };

  const handleDeviceControl = async (deviceId, command) => {
    try {
      await axios.post(`${API}/super/smart-home/control`, {
        device_id: deviceId,
        command: command
      });
      toast.success(`Comando "${command}" ejecutado`);
      fetchDevices();
    } catch (error) {
      console.error('Error controlling device:', error);
      toast.error('Error al controlar dispositivo');
    }
  };

  const handleVoiceCommand = () => {
    if ('webkitSpeechRecognition' in window) {
      const recognition = new window.webkitSpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'es-ES';

      recognition.onstart = () => {
        setIsListening(true);
        toast.success('🎤 Escuchando comando de voz...');
      };

      recognition.onresult = (event) => {
        const command = event.results[0][0].transcript;
        setVoiceCommand(command);
        processVoiceCommand(command);
        setIsListening(false);
      };

      recognition.onerror = () => {
        setIsListening(false);
        toast.error('Error en reconocimiento de voz');
      };

      recognition.start();
    } else {
      toast.error('Reconocimiento de voz no disponible');
    }
  };

  const processVoiceCommand = (command) => {
    const lowerCommand = command.toLowerCase();
    
    if (lowerCommand.includes('encender') || lowerCommand.includes('prender')) {
      if (lowerCommand.includes('luz')) {
        handleDeviceControl('1', 'Encender');
        toast.success(`🗣️ "${command}" - Encendiendo luces`);
      }
    } else if (lowerCommand.includes('apagar')) {
      if (lowerCommand.includes('luz')) {
        handleDeviceControl('1', 'Apagar');
        toast.success(`🗣️ "${command}" - Apagando luces`);
      }
    } else if (lowerCommand.includes('música')) {
      handleDeviceControl('3', 'Reproducir música');
      toast.success(`🗣️ "${command}" - Reproduciendo música`);
    } else {
      toast.info(`🗣️ Comando recibido: "${command}"`);
    }
  };

  const getDeviceIcon = (type) => {
    switch (type) {
      case 'light': return Lightbulb;
      case 'thermostat': return Thermometer;
      case 'speaker': return Speaker;
      case 'camera': return Camera;
      case 'lock': return Lock;
      case 'tv': return Monitor;
      default: return Smartphone;
    }
  };

  const getDeviceColor = (type, isOnline) => {
    if (!isOnline) return 'from-gray-400 to-gray-500';
    
    switch (type) {
      case 'light': return 'from-yellow-400 to-orange-500';
      case 'thermostat': return 'from-blue-400 to-cyan-500';
      case 'speaker': return 'from-purple-400 to-pink-500';
      case 'camera': return 'from-green-400 to-emerald-500';
      case 'lock': return 'from-red-400 to-rose-500';
      default: return 'from-slate-400 to-slate-500';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
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

  return (
    <div className="space-y-6 animate-fade-in" data-testid="smart-home">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">🏠 Hogar Inteligente</h1>
          <p className="text-slate-600">Control total de tu casa con IA avanzada estilo Alexa</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button 
            onClick={handleVoiceCommand}
            disabled={isListening}
            className={`btn-modern ${isListening ? 'animate-pulse' : ''}`}
            data-testid="voice-control-btn"
          >
            {isListening ? (
              <>
                <Volume2 className="w-4 h-4 mr-2 animate-pulse" />
                Escuchando...
              </>
            ) : (
              <>
                <Volume2 className="w-4 h-4 mr-2" />
                Control por Voz
              </>
            )}
          </Button>
          
          <Dialog open={isAddingDevice} onOpenChange={setIsAddingDevice}>
            <DialogTrigger asChild>
              <Button className="btn-secondary" data-testid="add-device-btn">
                <Plus className="w-4 h-4 mr-2" />
                Agregar Dispositivo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Agregar Nuevo Dispositivo</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nombre del dispositivo</label>
                  <Input
                    value={newDevice.name}
                    onChange={(e) => setNewDevice({...newDevice, name: e.target.value})}
                    placeholder="Ej: Luz de la sala"
                    data-testid="device-name-input"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Tipo</label>
                    <Select value={newDevice.type} onValueChange={(value) => setNewDevice({...newDevice, type: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">💡 Luz</SelectItem>
                        <SelectItem value="thermostat">🌡️ Termostato</SelectItem>
                        <SelectItem value="speaker">🔊 Altavoz</SelectItem>
                        <SelectItem value="camera">📷 Cámara</SelectItem>
                        <SelectItem value="lock">🔒 Cerradura</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Habitación</label>
                    <Select value={newDevice.room} onValueChange={(value) => setNewDevice({...newDevice, room: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="living_room">Sala</SelectItem>
                        <SelectItem value="bedroom">Dormitorio</SelectItem>
                        <SelectItem value="kitchen">Cocina</SelectItem>
                        <SelectItem value="bathroom">Baño</SelectItem>
                        <SelectItem value="office">Oficina</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">ID del dispositivo</label>
                  <Input
                    value={newDevice.device_id}
                    onChange={(e) => setNewDevice({...newDevice, device_id: e.target.value})}
                    placeholder="ID único del dispositivo"
                    data-testid="device-id-input"
                  />
                </div>
                
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setIsAddingDevice(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleAddDevice} className="btn-modern">
                    Agregar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Voice Command Display */}
      {voiceCommand && (
        <Card className="modern-card border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Volume2 className="w-5 h-5 text-indigo-600" />
              <div>
                <p className="font-medium text-indigo-800">Último comando de voz:</p>
                <p className="text-indigo-700">"{voiceCommand}"</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Controls */}
      <Card className="modern-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" />
            Controles Rápidos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button 
              onClick={() => handleDeviceControl('all', 'Encender todas las luces')}
              className="h-20 flex-col bg-gradient-to-r from-yellow-50 to-orange-50 hover:from-yellow-100 hover:to-orange-100 border-yellow-200 text-yellow-800"
              variant="outline"
            >
              <Sun className="w-6 h-6 mb-2" />
              <span className="text-sm">Todas las Luces ON</span>
            </Button>
            
            <Button 
              onClick={() => handleDeviceControl('all', 'Apagar todas las luces')}
              className="h-20 flex-col bg-gradient-to-r from-slate-50 to-gray-50 hover:from-slate-100 hover:to-gray-100 border-slate-200 text-slate-700"
              variant="outline"
            >
              <Moon className="w-6 h-6 mb-2" />
              <span className="text-sm">Todas las Luces OFF</span>
            </Button>
            
            <Button 
              onClick={() => handleDeviceControl('3', 'Reproducir música relajante')}
              className="h-20 flex-col bg-gradient-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 border-purple-200 text-purple-800"
              variant="outline"
            >
              <Volume2 className="w-6 h-6 mb-2" />
              <span className="text-sm">Música Relajante</span>
            </Button>
            
            <Button 
              onClick={() => handleDeviceControl('all', 'Modo noche activado')}
              className="h-20 flex-col bg-gradient-to-r from-indigo-50 to-blue-50 hover:from-indigo-100 hover:to-blue-100 border-indigo-200 text-indigo-800"
              variant="outline"
            >
              <Home className="w-6 h-6 mb-2" />
              <span className="text-sm">Modo Noche</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Devices Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {devices.map((device, index) => {
          const Icon = getDeviceIcon(device.device_type);
          const colorClass = getDeviceColor(device.device_type, device.is_online);
          
          return (
            <Card key={device.id} className="modern-card hover-lift group transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${colorClass} flex items-center justify-center shadow-lg`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">{device.device_name}</h3>
                      <p className="text-sm text-slate-600 capitalize">{device.room}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {device.is_online ? (
                      <Wifi className="w-4 h-4 text-green-500" />
                    ) : (
                      <WifiOff className="w-4 h-4 text-red-500" />
                    )}
                    <Badge variant={device.is_online ? "default" : "secondary"}>
                      {device.is_online ? 'Conectado' : 'Desconectado'}
                    </Badge>
                  </div>
                </div>
                
                {device.last_command && (
                  <div className="mb-4 p-3 bg-slate-50 rounded-lg">
                    <p className="text-xs font-medium text-slate-600 mb-1">Último comando:</p>
                    <p className="text-sm text-slate-800">{device.last_command}</p>
                  </div>
                )}
                
                {/* Device-specific controls */}
                <div className="space-y-3">
                  {device.device_type === 'light' && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Intensidad</span>
                        <span className="text-sm text-slate-600">80%</span>
                      </div>
                      <Slider 
                        value={[80]} 
                        max={100} 
                        step={1}
                        className="w-full"
                        onValueChange={(value) => handleDeviceControl(device.id, `Intensidad ${value[0]}%`)}
                      />
                    </div>
                  )}
                  
                  {device.device_type === 'thermostat' && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Temperatura</span>
                      <div className="flex items-center gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleDeviceControl(device.id, 'Bajar temperatura')}
                        >
                          -
                        </Button>
                        <span className="font-medium">22°C</span>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleDeviceControl(device.id, 'Subir temperatura')}
                        >
                          +
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      className="flex-1"
                      onClick={() => handleDeviceControl(device.id, device.device_type === 'light' ? 'Encender' : 'Activar')}
                      disabled={!device.is_online}
                    >
                      <Power className="w-3 h-3 mr-2" />
                      {device.device_type === 'light' ? 'Encender' : 'Activar'}
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => handleDeviceControl(device.id, device.device_type === 'light' ? 'Apagar' : 'Desactivar')}
                      disabled={!device.is_online}
                    >
                      {device.device_type === 'light' ? 'Apagar' : 'Desactivar'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {devices.length === 0 && (
        <Card className="modern-card">
          <CardContent className="text-center py-12">
            <Home className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No hay dispositivos configurados</h3>
            <p className="text-slate-600 mb-6">Agrega tu primer dispositivo inteligente para comenzar</p>
            <Button onClick={() => setIsAddingDevice(true)} className="btn-modern">
              <Plus className="w-4 h-4 mr-2" />
              Agregar Primer Dispositivo
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SmartHome;
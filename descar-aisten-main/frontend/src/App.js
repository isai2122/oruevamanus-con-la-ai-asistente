import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import axios from 'axios';

// Import Shadcn components
import { Button } from './components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Textarea } from './components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
import { Badge } from './components/ui/badge';
import { Calendar } from './components/ui/calendar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Alert, AlertDescription } from './components/ui/alert';
import { Avatar, AvatarFallback } from './components/ui/avatar';
import { Progress } from './components/ui/progress';
import { Switch } from './components/ui/switch';
import { Checkbox } from './components/ui/checkbox';
import { toast } from './hooks/use-toast';
import { Toaster } from './components/ui/toaster';

// Icons from Lucide React
import { 
  Calendar as CalendarIcon, 
  FileText, 
  CheckSquare, 
  Clock, 
  Search, 
  Plus, 
  Settings, 
  User, 
  Bell, 
  BarChart3,
  PlusCircle,
  BookOpen,
  Target,
  Zap,
  Brain,
  Filter,
  Archive,
  Upload,
  MessageSquare,
  Timer,
  Star,
  Tag,
  Folder,
  TrendingUp,
  Activity,
  Globe,
  Smartphone,
  Menu,
  X,
  Home,
  Edit,
  Trash2,
  Play,
  Pause,
  RotateCcw,
  Mic,
  MicOff,
  Send,
  Sparkles,
  Heart,
  CheckCircle2,
  Circle,
  AlertCircle,
  Info,
  Users,
  Lightbulb,
  MessageCircle,
  Headphones,
  Rocket,
  Bot,
  Wand2,
  Eye,
  Camera,
  FileSearch,
  Calculator,
  File,
  Download
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Auth Context
const AuthContext = React.createContext();

const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Auth Provider
const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
    }
    setLoading(false);
  }, []);

  const login = (userData, authToken) => {
    setUser(userData);
    setToken(authToken);
    localStorage.setItem('token', authToken);
    localStorage.setItem('user', JSON.stringify(userData));
    axios.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

// IA Chat Component REAL Y FUNCIONAL
const IAChat = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'ia',
      text: '¡Hola! Soy tu asistente IA personal. Puedo responder cualquier pregunta, ayudarte a organizar tareas, crear resúmenes y mucho más. ¿En qué puedo ayudarte?',
      time: new Date()
    }
  ]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    const userMessage = {
      id: Date.now(),
      sender: 'user',
      text: newMessage,
      time: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentMessage = newMessage;
    setNewMessage('');
    setIsTyping(true);

    try {
      // LLAMADA REAL A LA IA
      const response = await axios.post(`${API}/ai/chat`, {
        text: currentMessage
      });

      const iaResponse = {
        id: Date.now() + 1,
        sender: 'ia',
        text: response.data.response,
        time: new Date()
      };
      
      setMessages(prev => [...prev, iaResponse]);
    } catch (error) {
      console.error('Error calling AI:', error);
      const errorMessage = {
        id: Date.now() + 1,
        sender: 'ia',
        text: `Disculpa, hubo un error: ${error.response?.data?.detail || 'Error de conexión'}. Pero puedo ayudarte localmente con análisis básico y respuestas generales.`,
        time: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm">
      <div className="fixed right-4 top-4 bottom-4 w-96 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl flex flex-col">
        <div className="p-4 border-b bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <Brain className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold">IA Administradora</h3>
                <p className="text-sm opacity-90">Pregúntame cualquier cosa</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} className="text-white hover:bg-white/10">
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl p-3 ${
                message.sender === 'user' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-900'
              }`}>
                <p className="text-sm whitespace-pre-line">{message.text}</p>
                <p className="text-xs opacity-70 mt-2">
                  {message.time.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
          
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-2xl p-3">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Pregunta cualquier cosa..."
              className="flex-1"
            />
            <Button onClick={sendMessage} className="bg-purple-600 hover:bg-purple-700">
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setNewMessage('¿Cómo puedo ser más productivo?')}
              className="text-xs"
            >
              Consejos productividad
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setNewMessage('Extrae tareas de este texto: Mañana tengo que llamar a Juan, revisar el informe y enviar el email al cliente')}
              className="text-xs"
            >
              Extraer tareas
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Welcome Screen
const WelcomeScreen = ({ onStart }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
      <div className="max-w-4xl mx-auto text-center text-white">
        <div className="mb-12">
          <div className="w-32 h-32 bg-gradient-to-br from-purple-400 to-blue-500 rounded-3xl mx-auto mb-8 flex items-center justify-center shadow-2xl">
            <Brain className="w-16 h-16 text-white" />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
            IA Asistente Personal
          </h1>
          <p className="text-xl md:text-2xl text-purple-200 mb-8">
            Tu compañero inteligente que lo conoce todo y te puede ayudar a organizarte
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          <Card className="bg-white/10 backdrop-blur-md border-white/20 text-white">
            <CardContent className="p-6 text-center">
              <Wand2 className="w-12 h-12 mx-auto mb-4 text-purple-400" />
              <h3 className="text-lg font-semibold mb-2">IA Inteligente</h3>
              <p className="text-sm text-purple-200">Resúmenes automáticos y extracción de tareas desde cualquier texto</p>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-md border-white/20 text-white">
            <CardContent className="p-6 text-center">
              <MessageCircle className="w-12 h-12 mx-auto mb-4 text-blue-400" />
              <h3 className="text-lg font-semibold mb-2">Chat Inteligente</h3>
              <p className="text-sm text-purple-200">Conversa con tu IA para organizar, planificar y obtener respuestas</p>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-md border-white/20 text-white">
            <CardContent className="p-6 text-center">
              <Archive className="w-12 h-12 mx-auto mb-4 text-green-400" />
              <h3 className="text-lg font-semibold mb-2">Gestión de Archivos</h3>
              <p className="text-sm text-purple-200">Sube documentos, ZIPs y archivos para análisis automático</p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Button 
            onClick={onStart}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-8 py-4 text-lg rounded-2xl shadow-2xl"
          >
            <Sparkles className="w-5 h-5 mr-2" />
            Comenzar con mi IA Asistente
          </Button>
        </div>
      </div>
    </div>
  );
};

// Login/Register Component
const AuthPage = ({ showWelcome = false }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: ''
  });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const payload = isLogin 
        ? { email: formData.email, password: formData.password }
        : formData;

      const response = await axios.post(`${API}${endpoint}`, payload);
      const { access_token, user } = response.data;
      
      login(user, access_token);
      toast({
        title: "¡Bienvenido!",
        description: isLogin ? "Has iniciado sesión correctamente" : "Cuenta creada exitosamente"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Error de conexión",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  if (showWelcome) {
    return <WelcomeScreen onStart={() => window.location.reload()} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md backdrop-blur-sm bg-white/90 shadow-2xl border-0">
        <CardHeader className="text-center pb-8">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mb-4">
            <Brain className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Asistente Personal IA
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="tu@email.com"
                value={formData.email}
                onChange={handleInputChange}
                required
              />
            </div>
            
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="full_name">Nombre completo</Label>
                <Input
                  id="full_name"
                  name="full_name"
                  placeholder="Tu nombre"
                  value={formData.full_name}
                  onChange={handleInputChange}
                  required
                />
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleInputChange}
                required
              />
            </div>
            
            <Button type="submit" className="w-full bg-gradient-to-r from-indigo-500 to-purple-600" disabled={loading}>
              {loading ? 'Procesando...' : (isLogin ? 'Iniciar Sesión' : 'Crear Cuenta')}
            </Button>
          </form>
          
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-indigo-600 hover:text-indigo-700 font-medium"
            >
              {isLogin ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Dashboard Component
const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await axios.get(`${API}/dashboard/stats`);
      setDashboardData(response.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Notas</p>
                <p className="text-2xl font-bold">{dashboardData?.notes_count || 0}</p>
              </div>
              <FileText className="w-8 h-8 text-blue-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Eventos</p>
                <p className="text-2xl font-bold">{dashboardData?.events_count || 0}</p>
              </div>
              <CalendarIcon className="w-8 h-8 text-green-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">Tareas</p>
                <p className="text-2xl font-bold">{dashboardData?.tasks_count || 0}</p>
              </div>
              <CheckSquare className="w-8 h-8 text-purple-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm">Completado</p>
                <p className="text-2xl font-bold">{Math.round(dashboardData?.completion_rate || 0)}%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-orange-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Content Areas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5" />
              Eventos de Hoy
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dashboardData?.today_events?.length > 0 ? (
              <div className="space-y-3">
                {dashboardData.today_events.slice(0, 3).map((event) => (
                  <div key={event.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: event.color }}></div>
                    <div className="flex-1">
                      <p className="font-medium">{event.title}</p>
                      <p className="text-sm text-gray-600">
                        {new Date(event.start_date).toLocaleTimeString('es-ES', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <CalendarIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No hay eventos para hoy</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckSquare className="w-5 h-5" />
              Tareas Pendientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dashboardData?.pending_tasks?.length > 0 ? (
              <div className="space-y-3">
                {dashboardData.pending_tasks.slice(0, 3).map((task) => (
                  <div key={task.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className={`w-3 h-3 rounded-full ${
                      task.priority === 'urgent' ? 'bg-red-500' :
                      task.priority === 'high' ? 'bg-orange-500' :
                      task.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                    }`}></div>
                    <div className="flex-1">
                      <p className="font-medium">{task.title}</p>
                      <p className="text-sm text-gray-600">{task.category}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <CheckSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">¡No hay tareas pendientes!</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// NOTAS FUNCIONALES COMPLETAS
const NotesPage = () => {
  const [notes, setNotes] = useState([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFolder, setSelectedFolder] = useState('all');
  const [newNote, setNewNote] = useState({
    title: '',
    content: '',
    tags: '',
    folder: 'general'
  });
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
    try {
      let url = `${API}/notes`;
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (selectedFolder && selectedFolder !== 'all') params.append('folder', selectedFolder);
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const response = await axios.get(url);
      setNotes(response.data);
    } catch (error) {
      console.error('Error fetching notes:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las notas",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createNote = async () => {
    if (!newNote.title.trim()) {
      toast({
        title: "Error",
        description: "El título es requerido",
        variant: "destructive"
      });
      return;
    }

    setCreating(true);
    try {
      const noteData = {
        title: newNote.title,
        content: newNote.content,
        folder: newNote.folder,
        tags: newNote.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
      };

      await axios.post(`${API}/notes`, noteData);
      
      setShowCreateDialog(false);
      setNewNote({ title: '', content: '', tags: '', folder: 'general' });
      await fetchNotes();
      
      toast({
        title: "¡Nota creada!",
        description: "Tu nota ha sido guardada y procesada con IA"
      });
    } catch (error) {
      console.error('Error creating note:', error);
      toast({
        title: "Error",
        description: error.response?.data?.detail || "No se pudo crear la nota",
        variant: "destructive"
      });
    } finally {
      setCreating(false);
    }
  };

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      fetchNotes();
    }, 300);
    return () => clearTimeout(delayedSearch);
  }, [searchTerm, selectedFolder]);

  const folders = ['general', 'trabajo', 'personal', 'proyectos', 'ideas', 'finanzas'];

  if (loading) {
    return <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
    </div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Mis Notas</h1>
          <p className="text-gray-600">Organiza y encuentra tus ideas con IA</p>
        </div>
        
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="w-full md:w-auto bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700">
              <PlusCircle className="w-4 h-4 mr-2" />
              Nueva Nota con IA
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] max-w-lg mx-auto">
            <DialogHeader>
              <DialogTitle>Crear Nueva Nota</DialogTitle>
              <DialogDescription>
                La IA creará un resumen automático si el contenido es largo
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Título</Label>
                <Input
                  id="title"
                  value={newNote.title}
                  onChange={(e) => setNewNote({...newNote, title: e.target.value})}
                  placeholder="Título de la nota..."
                />
              </div>
              <div>
                <Label htmlFor="folder">Carpeta</Label>
                <Select value={newNote.folder} onValueChange={(value) => setNewNote({...newNote, folder: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {folders.map((folder) => (
                      <SelectItem key={folder} value={folder}>
                        {folder.charAt(0).toUpperCase() + folder.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="content">Contenido</Label>
                <Textarea
                  id="content"
                  value={newNote.content}
                  onChange={(e) => setNewNote({...newNote, content: e.target.value})}
                  placeholder="Escribe tu nota aquí... La IA la analizará automáticamente"
                  className="min-h-[120px]"
                />
              </div>
              <div>
                <Label htmlFor="tags">Etiquetas (separadas por coma)</Label>
                <Input
                  id="tags"
                  value={newNote.tags}
                  onChange={(e) => setNewNote({...newNote, tags: e.target.value})}
                  placeholder="etiqueta1, etiqueta2, etiqueta3"
                />
              </div>
              <Button onClick={createNote} disabled={creating} className="w-full bg-gradient-to-r from-indigo-500 to-purple-600">
                {creating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creando con IA...
                  </>
                ) : (
                  'Crear Nota'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Buscar notas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Select value={selectedFolder} onValueChange={setSelectedFolder}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filtrar por carpeta" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las carpetas</SelectItem>
            {folders.map((folder) => (
              <SelectItem key={folder} value={folder}>
                {folder.charAt(0).toUpperCase() + folder.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Notas Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {notes.map((note) => (
          <Card key={note.id} className="hover:shadow-lg transition-all duration-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold text-gray-900 line-clamp-2">
                {note.title}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  <Folder className="w-3 h-3 mr-1" />
                  {note.folder}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {new Date(note.created_date).toLocaleDateString()}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 text-sm line-clamp-3 mb-4">{note.content}</p>
              {note.ai_summary && (
                <Alert className="mb-4">
                  <Brain className="w-4 h-4" />
                  <AlertDescription className="text-xs">
                    <strong>IA Resume:</strong> {note.ai_summary}
                  </AlertDescription>
                </Alert>
              )}
              {note.tags && note.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {note.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      <Tag className="w-2 h-2 mr-1" />
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {notes.length === 0 && (
        <div className="text-center py-12">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-gray-900 mb-2">
            {searchTerm || selectedFolder !== 'all' ? 'No se encontraron notas' : 'Crea tu primera nota inteligente'}
          </h3>
          <p className="text-gray-600 mb-6">La IA automáticamente resumirá tu contenido y extraerá tareas</p>
          <Button onClick={() => setShowCreateDialog(true)} className="bg-purple-600 hover:bg-purple-700">
            <Sparkles className="w-4 h-4 mr-2" />
            Comenzar con IA
          </Button>
        </div>
      )}
    </div>
  );
};

// CALENDARIO FUNCIONAL COMPLETO
const CalendarPage = () => {
  const [events, setEvents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    start_date: new Date().toISOString().slice(0, 16),
    end_date: new Date(Date.now() + 3600000).toISOString().slice(0, 16),
    location: '',
    category: 'personal',
    color: '#3b82f6'
  });
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const response = await axios.get(`${API}/events`);
      setEvents(response.data);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const createEvent = async () => {
    if (!newEvent.title.trim()) {
      toast({
        title: "Error",
        description: "El título es requerido",
        variant: "destructive"
      });
      return;
    }

    setCreating(true);
    try {
      await axios.post(`${API}/events`, {
        ...newEvent,
        start_date: new Date(newEvent.start_date).toISOString(),
        end_date: new Date(newEvent.end_date).toISOString()
      });
      
      setShowCreateDialog(false);
      setNewEvent({
        title: '',
        description: '',
        start_date: new Date().toISOString().slice(0, 16),
        end_date: new Date(Date.now() + 3600000).toISOString().slice(0, 16),
        location: '',
        category: 'personal',
        color: '#3b82f6'
      });
      
      await fetchEvents();
      
      toast({
        title: "¡Evento creado!",
        description: "Tu evento ha sido añadido al calendario"
      });
    } catch (error) {
      console.error('Error creating event:', error);
      toast({
        title: "Error",
        description: "No se pudo crear el evento",
        variant: "destructive"
      });
    } finally {
      setCreating(false);
    }
  };

  const todayEvents = events.filter(event => {
    const eventDate = new Date(event.start_date).toDateString();
    const today = selectedDate.toDateString();
    return eventDate === today;
  });

  const categories = ['personal', 'trabajo', 'salud', 'social', 'estudio'];
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  if (loading) {
    return <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
    </div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Mi Calendario</h1>
          <p className="text-gray-600">Organiza tu tiempo inteligentemente</p>
        </div>
        
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="w-full md:w-auto bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700">
              <PlusCircle className="w-4 h-4 mr-2" />
              Nuevo Evento
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] max-w-lg mx-auto max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Crear Nuevo Evento</DialogTitle>
              <DialogDescription>
                Añade un evento a tu calendario personal
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="event-title">Título del evento</Label>
                <Input
                  id="event-title"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({...newEvent, title: e.target.value})}
                  placeholder="Reunión, cita, etc..."
                />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start-date">Fecha/hora inicio</Label>
                  <Input
                    id="start-date"
                    type="datetime-local"
                    value={newEvent.start_date}
                    onChange={(e) => setNewEvent({...newEvent, start_date: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="end-date">Fecha/hora fin</Label>
                  <Input
                    id="end-date"
                    type="datetime-local"
                    value={newEvent.end_date}
                    onChange={(e) => setNewEvent({...newEvent, end_date: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="category">Categoría</Label>
                <Select value={newEvent.category} onValueChange={(value) => setNewEvent({...newEvent, category: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Color</Label>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {colors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`w-8 h-8 rounded-full ${newEvent.color === color ? 'ring-2 ring-gray-400 ring-offset-2' : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setNewEvent({...newEvent, color: color})}
                    />
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="location">Ubicación (opcional)</Label>
                <Input
                  id="location"
                  value={newEvent.location}
                  onChange={(e) => setNewEvent({...newEvent, location: e.target.value})}
                  placeholder="Dirección, sala, enlace..."
                />
              </div>

              <div>
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({...newEvent, description: e.target.value})}
                  placeholder="Detalles adicionales..."
                />
              </div>

              <Button onClick={createEvent} disabled={creating} className="w-full bg-gradient-to-r from-green-500 to-blue-600">
                {creating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creando...
                  </>
                ) : (
                  'Crear Evento'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Calendar y Events */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Calendario</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-md border w-full"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CalendarIcon className="w-5 h-5" />
              Eventos del {selectedDate.toLocaleDateString()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {todayEvents.length > 0 ? (
              <div className="space-y-3">
                {todayEvents.map((event) => (
                  <div key={event.id} className="p-3 rounded-lg border-l-4 bg-gray-50" style={{ borderLeftColor: event.color }}>
                    <h4 className="font-semibold text-gray-900">{event.title}</h4>
                    <p className="text-sm text-gray-600">
                      {new Date(event.start_date).toLocaleTimeString('es-ES', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })} - {new Date(event.end_date).toLocaleTimeString('es-ES', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                    {event.location && (
                      <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                        <Globe className="w-3 h-3" />
                        {event.location}
                      </p>
                    )}
                    <Badge variant="outline" className="text-xs mt-2">
                      {event.category}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <CalendarIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No hay eventos para este día</p>
                <Button onClick={() => setShowCreateDialog(true)} variant="outline" className="mt-4" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Añadir evento
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// TAREAS FUNCIONALES COMPLETAS
const TasksPage = () => {
  const [tasks, setTasks] = useState([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'medium',
    due_date: '',
    category: 'general'
  });
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const response = await axios.get(`${API}/tasks`);
      setTasks(response.data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const createTask = async () => {
    if (!newTask.title.trim()) {
      toast({
        title: "Error",
        description: "El título es requerido",
        variant: "destructive"
      });
      return;
    }

    setCreating(true);
    try {
      const taskData = { ...newTask };
      if (taskData.due_date) {
        taskData.due_date = new Date(taskData.due_date).toISOString();
      } else {
        delete taskData.due_date;
      }

      await axios.post(`${API}/tasks`, taskData);
      
      setShowCreateDialog(false);
      setNewTask({
        title: '',
        description: '',
        priority: 'medium',
        due_date: '',
        category: 'general'
      });
      
      await fetchTasks();
      
      toast({
        title: "¡Tarea creada!",
        description: "Tu tarea ha sido añadida"
      });
    } catch (error) {
      console.error('Error creating task:', error);
      toast({
        title: "Error",
        description: "No se pudo crear la tarea",
        variant: "destructive"
      });
    } finally {
      setCreating(false);
    }
  };

  const completeTask = async (taskId) => {
    try {
      await axios.put(`${API}/tasks/${taskId}/complete`);
      await fetchTasks();
      toast({
        title: "¡Tarea completada!",
        description: "Buen trabajo 🎉"
      });
    } catch (error) {
      console.error('Error completing task:', error);
      toast({
        title: "Error",
        description: "No se pudo completar la tarea",
        variant: "destructive"
      });
    }
  };

  const priorities = ['low', 'medium', 'high', 'urgent'];
  const categories = ['general', 'trabajo', 'personal', 'estudio', 'salud'];

  const pendingTasks = tasks.filter(task => !task.completed);
  const completedTasks = tasks.filter(task => task.completed);

  if (loading) {
    return <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
    </div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Mis Tareas</h1>
          <p className="text-gray-600">Gestiona tu productividad con IA</p>
        </div>
        
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="w-full md:w-auto bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700">
              <PlusCircle className="w-4 h-4 mr-2" />
              Nueva Tarea
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] max-w-lg mx-auto">
            <DialogHeader>
              <DialogTitle>Crear Nueva Tarea</DialogTitle>
              <DialogDescription>
                Añade una nueva tarea a tu lista
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="task-title">Título</Label>
                <Input
                  id="task-title"
                  value={newTask.title}
                  onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                  placeholder="¿Qué necesitas hacer?"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="priority">Prioridad</Label>
                  <Select value={newTask.priority} onValueChange={(value) => setNewTask({...newTask, priority: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {priorities.map((priority) => (
                        <SelectItem key={priority} value={priority}>
                          {priority === 'low' ? 'Baja' :
                           priority === 'medium' ? 'Media' :
                           priority === 'high' ? 'Alta' : 'Urgente'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="category">Categoría</Label>
                  <Select value={newTask.category} onValueChange={(value) => setNewTask({...newTask, category: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category.charAt(0).toUpperCase() + category.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="due-date">Fecha límite (opcional)</Label>
                <Input
                  id="due-date"
                  type="datetime-local"
                  value={newTask.due_date}
                  onChange={(e) => setNewTask({...newTask, due_date: e.target.value})}
                />
              </div>

              <div>
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={newTask.description}
                  onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                  placeholder="Detalles adicionales..."
                />
              </div>

              <Button onClick={createTask} disabled={creating} className="w-full bg-gradient-to-r from-purple-500 to-pink-600">
                {creating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creando...
                  </>
                ) : (
                  'Crear Tarea'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tareas Pendientes */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Circle className="w-5 h-5 text-orange-500" />
          Tareas Pendientes ({pendingTasks.length})
        </h2>
        
        {pendingTasks.length > 0 ? (
          <div className="space-y-3">
            {pendingTasks.map((task) => (
              <Card key={task.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={false}
                      onCheckedChange={() => completeTask(task.id)}
                      className="mt-1"
                    />
                    
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-medium text-gray-900">{task.title}</h3>
                        <div className={`w-3 h-3 rounded-full ${
                          task.priority === 'urgent' ? 'bg-red-500' :
                          task.priority === 'high' ? 'bg-orange-500' :
                          task.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                        }`}></div>
                      </div>
                      
                      {task.description && (
                        <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                      )}
                      
                      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                        <Badge variant="outline" className="text-xs">
                          {task.category}
                        </Badge>
                        
                        {task.due_date && (
                          <Badge variant="outline" className="text-xs">
                            <Clock className="w-3 h-3 mr-1" />
                            {new Date(task.due_date).toLocaleDateString()}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <CheckCircle2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">¡No hay tareas pendientes!</p>
            <Button onClick={() => setShowCreateDialog(true)} variant="outline" className="mt-4" size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Crear tarea
            </Button>
          </div>
        )}
      </div>

      {/* Tareas Completadas */}
      {completedTasks.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            Completadas ({completedTasks.length})
          </h2>
          
          <div className="space-y-3">
            {completedTasks.slice(0, 5).map((task) => (
              <Card key={task.id} className="bg-gray-50/80 opacity-75">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-500 mt-1" />
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-700 line-through">{task.title}</h3>
                      {task.completed_date && (
                        <p className="text-xs text-gray-500 mt-1">
                          Completada el {new Date(task.completed_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// PROYECTOS FUNCIONALES COMPLETOS
const ProjectsPage = () => {
  const [projects, setProjects] = useState([]);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadData, setUploadData] = useState({
    name: '',
    description: '',
    file: null
  });

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await axios.get(`${API}/projects`);
      setProjects(response.data);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const uploadProject = async () => {
    if (!uploadData.name.trim() || !uploadData.file) {
      toast({
        title: "Error",
        description: "Nombre y archivo son requeridos",
        variant: "destructive"
      });
      return;
    }

    if (!uploadData.file.name.endsWith('.zip')) {
      toast({
        title: "Error",
        description: "Solo se permiten archivos ZIP",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadData.file);
      formData.append('name', uploadData.name);
      formData.append('description', uploadData.description);

      await axios.post(`${API}/projects/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      setShowUploadDialog(false);
      setUploadData({ name: '', description: '', file: null });
      await fetchProjects();
      
      toast({
        title: "¡Proyecto subido!",
        description: "Tu proyecto ha sido procesado y indexado"
      });
    } catch (error) {
      console.error('Error uploading project:', error);
      toast({
        title: "Error",
        description: "No se pudo subir el proyecto",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadData({...uploadData, file: file});
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
    </div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Mis Proyectos</h1>
          <p className="text-gray-600">Sube y gestiona tus archivos de proyecto</p>
        </div>
        
        <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
          <DialogTrigger asChild>
            <Button className="w-full md:w-auto bg-gradient-to-r from-blue-500 to-green-600 hover:from-blue-600 hover:to-green-700">
              <Upload className="w-4 h-4 mr-2" />
              Subir Proyecto ZIP
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] max-w-lg mx-auto">
            <DialogHeader>
              <DialogTitle>Subir Nuevo Proyecto</DialogTitle>
              <DialogDescription>
                Sube un archivo ZIP con tu proyecto. La IA lo analizará automáticamente.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="project-name">Nombre del proyecto</Label>
                <Input
                  id="project-name"
                  value={uploadData.name}
                  onChange={(e) => setUploadData({...uploadData, name: e.target.value})}
                  placeholder="Mi Proyecto Increíble"
                />
              </div>
              
              <div>
                <Label htmlFor="project-file">Archivo ZIP</Label>
                <Input
                  id="project-file"
                  type="file"
                  accept=".zip"
                  onChange={handleFileChange}
                  className="cursor-pointer"
                />
                <p className="text-sm text-gray-500 mt-1">Solo archivos .zip permitidos</p>
              </div>

              <div>
                <Label htmlFor="project-description">Descripción (opcional)</Label>
                <Textarea
                  id="project-description"
                  value={uploadData.description}
                  onChange={(e) => setUploadData({...uploadData, description: e.target.value})}
                  placeholder="Descripción del proyecto..."
                />
              </div>

              <Button onClick={uploadProject} disabled={uploading} className="w-full bg-gradient-to-r from-blue-500 to-green-600">
                {uploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Subiendo y analizando...
                  </>
                ) : (
                  'Subir Proyecto'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {projects.map((project) => (
          <Card key={project.id} className="hover:shadow-lg transition-all duration-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold text-gray-900 line-clamp-2">
                {project.name}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  v{project.version}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {Math.round(project.file_size / 1024)} KB
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {new Date(project.created_date).toLocaleDateString()}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {project.description && (
                <p className="text-gray-600 text-sm mb-4">{project.description}</p>
              )}
              
              {project.extracted_info && (
                <div className="space-y-3">
                  {project.extracted_info.files && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">Archivos encontrados:</p>
                      <p className="text-xs text-gray-600">{project.extracted_info.files.length} archivos</p>
                    </div>
                  )}
                  
                  {Object.entries(project.extracted_info).map(([key, value]) => {
                    if (key === 'files' || key === 'error') return null;
                    return (
                      <div key={key}>
                        <p className="text-sm font-medium text-gray-700 mb-1">{key}:</p>
                        <p className="text-xs text-gray-600 line-clamp-3">{String(value).substring(0, 200)}...</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {projects.length === 0 && (
        <div className="text-center py-12">
          <Archive className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-gray-900 mb-2">Sube tu primer proyecto</h3>
          <p className="text-gray-600 mb-6">La IA analizará automáticamente la estructura y contenido</p>
          <Button onClick={() => setShowUploadDialog(true)} className="bg-blue-600 hover:bg-blue-700">
            <Upload className="w-4 h-4 mr-2" />
            Subir Proyecto ZIP
          </Button>
        </div>
      )}
    </div>
  );
};

// Layout Principal
const Layout = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showIAChat, setShowIAChat] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const navigation = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'notes', label: 'Notas', icon: FileText },
    { id: 'calendar', label: 'Calendario', icon: CalendarIcon },
    { id: 'tasks', label: 'Tareas', icon: CheckSquare },
    { id: 'projects', label: 'Proyectos', icon: Archive }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'notes':
        return <NotesPage />;
      case 'calendar':
        return <CalendarPage />;
      case 'tasks':
        return <TasksPage />;
      case 'projects':
        return <ProjectsPage />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
      {/* IA Chat REAL */}
      <IAChat isOpen={showIAChat} onClose={() => setShowIAChat(false)} />

      {/* Mobile Menu */}
      {showMobileMenu && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="bg-black/50 backdrop-blur-sm absolute inset-0" onClick={() => setShowMobileMenu(false)}></div>
          <div className="absolute left-0 top-0 h-full w-72 bg-white shadow-xl p-6">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-bold">Menú</h2>
              <Button variant="ghost" size="sm" onClick={() => setShowMobileMenu(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="space-y-4">
              {navigation.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setShowMobileMenu(false);
                  }}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                    activeTab === item.id ? 'bg-indigo-100 text-indigo-600' : 'hover:bg-gray-100'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </button>
              ))}
              <button
                onClick={() => {
                  setShowIAChat(true);
                  setShowMobileMenu(false);
                }}
                className="w-full flex items-center gap-3 p-3 rounded-lg transition-colors hover:bg-purple-100"
              >
                <MessageCircle className="w-5 h-5" />
                Chat IA
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Navigation */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200/50 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm" 
                className="md:hidden"
                onClick={() => setShowMobileMenu(true)}
              >
                <Menu className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <Brain className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  Asistente IA
                </h1>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowIAChat(true)}
                className="relative bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:from-purple-600 hover:to-blue-600"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Chat IA
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              </Button>
              
              <div className="flex items-center gap-2">
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-sm">
                    {user?.full_name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden md:block">
                  <p className="text-sm font-medium">{user?.full_name}</p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                </div>
              </div>
              
              <Button variant="ghost" size="sm" onClick={logout}>
                Salir
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          {/* Desktop Navigation */}
          <div className="hidden md:block bg-white/60 backdrop-blur-sm rounded-2xl p-2 shadow-lg border border-white/20">
            <TabsList className="grid w-full grid-cols-5 bg-transparent">
              {navigation.map((item) => (
                <TabsTrigger
                  key={item.id}
                  value={item.id}
                  className="data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-indigo-600 transition-all duration-200"
                >
                  <item.icon className="w-4 h-4 mr-2" />
                  {item.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {/* Content */}
          <div className="bg-white/40 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-white/20 mb-20 md:mb-0">
            {renderContent()}
          </div>

          {/* Mobile Bottom Navigation */}
          <div className="fixed bottom-4 left-4 right-4 md:hidden bg-white/90 backdrop-blur-sm rounded-2xl p-3 shadow-xl border border-white/20">
            <div className="grid grid-cols-6 gap-1">
              {navigation.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${
                    activeTab === item.id ? 'bg-indigo-100 text-indigo-600' : 'text-gray-600'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="text-xs font-medium">{item.label}</span>
                </button>
              ))}
              <button
                onClick={() => setShowIAChat(true)}
                className="flex flex-col items-center gap-1 p-2 rounded-lg transition-all text-purple-600 bg-purple-50"
              >
                <MessageCircle className="w-5 h-5" />
                <span className="text-xs font-medium">IA</span>
              </button>
            </div>
          </div>
        </Tabs>
      </div>
    </div>
  );
};

// Main App Component
function App() {
  const { user, loading } = useAuth();
  const [showWelcome, setShowWelcome] = useState(!user && !localStorage.getItem('hasSeenWelcome'));

  useEffect(() => {
    if (!user && !localStorage.getItem('hasSeenWelcome')) {
      setShowWelcome(true);
      localStorage.setItem('hasSeenWelcome', 'true');
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mb-4 mx-auto animate-pulse">
            <Brain className="w-8 h-8 text-white" />
          </div>
          <p className="text-gray-600">Cargando tu asistente IA...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={user ? <Layout /> : <Navigate to="/auth" replace />} />
          <Route path="/auth" element={!user ? <AuthPage showWelcome={showWelcome} /> : <Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default function AppWithAuth() {
  return (
    <AuthProvider>
      <App />
      <Toaster />
    </AuthProvider>
  );
}
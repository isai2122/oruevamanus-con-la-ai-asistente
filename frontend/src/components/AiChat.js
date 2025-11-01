import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Brain, 
  User, 
  Sparkles,
  Mic,
  MicOff,
  FileText,
  CheckSquare,
  Calendar,
  Lightbulb,
  Clock,
  Copy,
  Download,
  Loader,
  Plus,
  Zap,
  MessageCircle,
  Target,
  PenTool,
  Paperclip,
  Image,
  Upload,
  File,
  X,
  Camera
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import axios from 'axios';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '../App';
import { useTheme } from '../contexts/ThemeContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AiChat = () => {
  const { user } = useAuth();
  const { assistantConfig } = useTheme();
  const [messages, setMessages] = useState([
    {
      id: Date.now(),
      type: 'ai',
      content: `¡Hola ${user?.full_name?.split(' ')[0] || 'amigo'}! 👋 Soy tu Jika con IA avanzada. 

🚀 Puedo ayudarte con CUALQUIER COSA:
• **Crear tareas automáticamente** - solo dime "tengo que hacer X" y las creo
• **Tomar notas inteligentes** - convierte conversaciones en notas organizadas
• **Analizar documentos** - extraigo información clave de cualquier texto
• **Organizar tu día** - sugiero horarios y prioridades personalizadas
• **Recordar todo** - nunca más olvides algo importante

💡 **¡Prueba ahora!** Dime algo como:
- "Tengo que llamar al doctor mañana"
- "Necesito comprar leche y pan"
- "Recordar enviar el reporte el viernes"

¿En qué te ayudo hoy?`,
      timestamp: new Date(),
      suggestions: [
        '¡Organiza mi día de hoy!',
        'Tengo varias cosas pendientes...',
        'Ayúdame a ser más productivo',
        '¿Qué debería hacer primero?'
      ]
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);
  const [analysisText, setAnalysisText] = useState('');
  const [extractTasksOpen, setExtractTasksOpen] = useState(false);
  const [extractText, setExtractText] = useState('');
  const [conversationContext, setConversationContext] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (message = inputMessage) => {
    if ((!message.trim() && uploadedFiles.length === 0) || isLoading) return;

    // Analyze uploaded files first
    let fileAnalysis = '';
    if (uploadedFiles.length > 0) {
      fileAnalysis = await analyzeUploadedFiles();
    }

    const fullMessage = fileAnalysis ? `${message}\n\n📎 Archivos analizados:\n${fileAnalysis}` : message;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: message,
      files: uploadedFiles.length > 0 ? uploadedFiles.map(f => ({name: f.name, type: f.type, size: f.size})) : undefined,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setUploadedFiles([]); // Clear uploaded files after sending
    setIsLoading(true);

    // Update conversation context
    const newContext = [...conversationContext, fullMessage].slice(-10);
    setConversationContext(newContext);

    try {
      const response = await axios.post(`${API}/ai/super-chat`, {
        message: fullMessage,
        context: newContext
      });

      const aiMessage = {
        id: Date.now() + 1,
        type: 'ai',
        content: response.data.response,
        timestamp: new Date(),
        suggestions: response.data.suggestions || [],
        actions: response.data.actions || [],
        autoCreated: response.data.auto_created_tasks || response.data.response.includes('He creado automáticamente')
      };

      setMessages(prev => [...prev, aiMessage]);
      
      // Show success if tasks were auto-created
      if (aiMessage.autoCreated) {
        toast.success('¡Tareas creadas automáticamente desde la conversación!');
      }
      
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Error al enviar mensaje');
      
      const errorMessage = {
        id: Date.now() + 1,
        type: 'ai',
        content: 'Disculpa, hubo un error al procesar tu mensaje. 🤔 ¿Podrías intentarlo de nuevo? Estoy aquí para ayudarte con tareas, notas, análisis y organización.',
        timestamp: new Date(),
        suggestions: [
          'Intenta de nuevo',
          '¿Qué tareas tienes pendientes?',
          'Ayúdame a organizarme'
        ]
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = async (actionType, content = '') => {
    let message = '';
    switch (actionType) {
      case 'create_task':
        message = `Quiero crear una tarea: ${content || inputMessage}`;
        break;
      case 'create_note':
        message = `Necesito tomar una nota sobre: ${content || inputMessage}`;
        break;
      case 'organize_day':
        message = 'Ayúdame a organizar mi día de hoy con mis tareas pendientes';
        break;
      case 'analyze_productivity':
        message = '¿Cómo puedo ser más productivo? Analiza mis patrones';
        break;
      default:
        message = content;
    }
    await sendMessage(message);
  };

  const handleAnalyzeText = async () => {
    if (!analysisText.trim()) {
      toast.error('Escribe el texto que quieres analizar');
      return;
    }

    try {
      const response = await axios.post(`${API}/ai/analyze-text`, 
        new URLSearchParams({ text: analysisText }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );
      
      const analysisMessage = {
        id: Date.now(),
        type: 'ai',
        content: `📊 **Análisis Completo del Texto:**\n\n${response.data.summary ? `**📝 Resumen:**\n${response.data.summary}\n\n` : ''}${response.data.tasks?.length ? `**✅ Tareas Extraídas (${response.data.tasks.length}):**\n${response.data.tasks.map((task, i) => `${i + 1}. ${task}`).join('\n')}\n\n` : ''}${response.data.dates?.length ? `**📅 Fechas Importantes (${response.data.dates.length}):**\n${response.data.dates.join(', ')}\n\n` : ''}${response.data.key_points?.length ? `**🔑 Puntos Clave:**\n${response.data.key_points.map((point, i) => `• ${point}`).join('\n')}` : ''}`,
        timestamp: new Date(),
        analysisData: response.data,
        suggestions: [
          '¿Crear estas tareas automáticamente?',
          '¿Necesitas más análisis?',
          '¿Quieres que organice esto mejor?'
        ]
      };
      
      setMessages(prev => [...prev, analysisMessage]);
      setIsAnalysisOpen(false);
      setAnalysisText('');
      toast.success('Análisis completado con IA avanzada');
    } catch (error) {
      console.error('Error analyzing text:', error);
      toast.error('Error al analizar texto');
    }
  };

  const handleExtractTasks = async (autoCreate = false) => {
    if (!extractText.trim()) {
      toast.error('Escribe el texto del que quieres extraer tareas');
      return;
    }

    try {
      const response = await axios.post(`${API}/ai/extract-tasks`,
        new URLSearchParams({ 
          text: extractText,
          auto_create: autoCreate.toString()
        }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );
      
      const tasksMessage = {
        id: Date.now(),
        type: 'ai',
        content: `🎯 **Extracción Inteligente Completada:**\n\n**${response.data.count} tareas detectadas${autoCreate ? ' y creadas automáticamente' : ''}:**\n\n${response.data.extracted_tasks.map((task, i) => `${i + 1}. **${task.title}**${task.description ? `\n   📋 ${task.description}` : ''}${autoCreate ? ' ✅' : ''}`).join('\n\n')}${autoCreate ? '\n\n🚀 **¡Todas las tareas han sido añadidas a tu lista automáticamente!**' : '\n\n💡 *¿Quieres que las cree automáticamente en tu lista de tareas?*'}`,
        timestamp: new Date(),
        extractedTasks: response.data.extracted_tasks,
        createdTasks: response.data.created_tasks,
        suggestions: autoCreate ? [
          '¿Organizar estas tareas por prioridad?',
          '¿Añadir fechas límite?',
          '¿Qué hago primero?'
        ] : [
          'Sí, crear todas automáticamente',
          '¿Revisar las tareas detectadas?',
          '¿Analizar más texto?'
        ]
      };
      
      setMessages(prev => [...prev, tasksMessage]);
      setExtractTasksOpen(false);
      setExtractText('');
      
      if (autoCreate && response.data.created_tasks?.length > 0) {
        toast.success(`🎉 ${response.data.created_tasks.length} tareas creadas automáticamente`);
      } else {
        toast.success('✨ Tareas extraídas con IA inteligente');
      }
    } catch (error) {
      console.error('Error extracting tasks:', error);
      toast.error('Error al extraer tareas');
    }
  };

  const handleVoiceInput = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'es-ES';
      
      recognition.onstart = () => {
        setIsListening(true);
        toast.success('🎤 Escuchando... habla ahora');
      };
      
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInputMessage(transcript);
        toast.success(`Texto reconocido: "${transcript}"`);
        setIsListening(false);
      };
      
      recognition.onerror = () => {
        setIsListening(false);
        toast.error('Error al reconocer voz');
      };
      
      recognition.onend = () => {
        setIsListening(false);
      };
      
      recognition.start();
    } else {
      toast.error('Reconocimiento de voz no soportado en este navegador');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success('📋 Copiado al portapapeles');
    }).catch(() => {
      toast.error('Error al copiar');
    });
  };

  const handleFileUpload = async (files) => {
    const validFiles = [];
    
    for (let file of files) {
      // Validate file type and size
      const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'text/plain', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      const maxSize = 10 * 1024 * 1024; // 10MB
      
      if (!validTypes.includes(file.type)) {
        toast.error(`Tipo de archivo no soportado: ${file.name}`);
        continue;
      }
      
      if (file.size > maxSize) {
        toast.error(`Archivo muy grande: ${file.name}. Máximo 10MB`);
        continue;
      }
      
      validFiles.push(file);
    }
    
    if (validFiles.length > 0) {
      setUploadedFiles(prev => [...prev, ...validFiles]);
      toast.success(`${validFiles.length} archivo(s) listo(s) para análisis IA`);
    }
  };

  const removeFile = (index) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const analyzeUploadedFiles = async () => {
    if (uploadedFiles.length === 0) return '';
    
    let analysisResults = '';
    
    for (let file of uploadedFiles) {
      try {
        // Determine action based on message context
        const shouldSaveToProjects = inputMessage.toLowerCase().includes('guarda') || 
                                      inputMessage.toLowerCase().includes('guardar') ||
                                      inputMessage.toLowerCase().includes('proyecto');
        
        const action = shouldSaveToProjects ? 'both' : 'analyze';
        
        // Create form data
        const formData = new FormData();
        formData.append('file', file);
        formData.append('action', action);
        if (shouldSaveToProjects) {
          formData.append('project_name', file.name);
        }
        
        // Upload and analyze
        const response = await axios.post(`${API}/ai/analyze-document`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
        
        if (response.data.saved_to_projects) {
          toast.success(`✅ ${file.name} guardado en Proyectos`);
          analysisResults += `\n📁 **Guardado en Proyectos**: ${file.name}\n`;
        }
        
        analysisResults += `\n📄 **${file.name}**\n${response.data.analysis}\n\n`;
        
      } catch (error) {
        console.error('Error analyzing file:', file.name, error);
        
        // Handle different error types with specific messages
        if (error.response) {
          const status = error.response.status;
          const detail = error.response.data?.detail || 'Error desconocido';
          
          if (status === 403) {
            // Plan limit reached
            analysisResults += `⚠️ **${file.name}**: ${detail}\n`;
            toast.error(detail, { duration: 5000 });
          } else if (status === 401) {
            // Authentication error
            analysisResults += `🔒 **${file.name}**: Sesión expirada. Por favor inicia sesión nuevamente.\n`;
            toast.error('Sesión expirada');
          } else {
            // Other errors
            analysisResults += `❌ **${file.name}**: ${detail}\n`;
            toast.error(`Error: ${detail}`);
          }
        } else {
          analysisResults += `❌ Error analizando ${file.name}\n`;
          toast.error(`Error procesando ${file.name}`);
        }
      }
    }
    
    return analysisResults;
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    handleFileUpload(files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const formatTimestamp = (timestamp) => {
    return format(new Date(timestamp), 'HH:mm', { locale: es });
  };

  return (
    <div className="space-y-6 animate-fade-in" data-testid="ai-chat">
      {/* Header with Enhanced Info */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold gradient-text mb-2">Chat IA Inteligente 🧠</h1>
          <p className="text-slate-600">Tu asistente personal que entiende, aprende y se adapta a ti • Powered by GPT-4o</p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Quick Actions */}
          <Button 
            onClick={() => handleQuickAction('organize_day')}
            variant="outline" 
            className="btn-secondary" 
            data-testid="quick-organize-btn"
          >
            <Target className="w-4 h-4 mr-2" />
            Organizar Día
          </Button>
          
          <Dialog open={extractTasksOpen} onOpenChange={setExtractTasksOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="btn-secondary" data-testid="extract-tasks-btn">
                <CheckSquare className="w-4 h-4 mr-2" />
                Extraer Tareas IA
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>🤖 Extracción Inteligente de Tareas</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Texto para analizar con IA</label>
                  <Textarea
                    value={extractText}
                    onChange={(e) => setExtractText(e.target.value)}
                    placeholder="Pega cualquier texto, email, mensaje, notas... La IA detectará automáticamente todas las tareas y acciones pendientes.\n\nEjemplo: 'Reunión con cliente lunes, enviar propuesta antes del miércoles, llamar a proveedor para cotización...'"
                    rows={8}
                    className="modern-input resize-none"
                    data-testid="extract-text-input"
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setExtractTasksOpen(false)} data-testid="cancel-extract-btn">
                    Cancelar
                  </Button>
                  <Button onClick={() => handleExtractTasks(false)} className="btn-secondary" data-testid="extract-only-btn">
                    <Brain className="w-4 h-4 mr-2" />
                    Solo Detectar
                  </Button>
                  <Button onClick={() => handleExtractTasks(true)} className="btn-modern" data-testid="extract-create-btn">
                    <Zap className="w-4 h-4 mr-2" />
                    Detectar y Crear
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          
          <Dialog open={isAnalysisOpen} onOpenChange={setIsAnalysisOpen}>
            <DialogTrigger asChild>
              <Button className="btn-modern" data-testid="analyze-text-btn">
                <Brain className="w-4 h-4 mr-2" />
                Análisis IA
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>🔍 Análisis Inteligente Completo</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Texto para análisis profundo</label>
                  <Textarea
                    value={analysisText}
                    onChange={(e) => setAnalysisText(e.target.value)}
                    placeholder="La IA analizará automáticamente y extraerá:\n• Resumen inteligente\n• Tareas y acciones\n• Fechas importantes\n• Contactos y datos clave\n• Insights y recomendaciones"
                    rows={8}
                    className="modern-input resize-none"
                    data-testid="analysis-text-input"
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setIsAnalysisOpen(false)} data-testid="cancel-analysis-btn">
                    Cancelar
                  </Button>
                  <Button onClick={handleAnalyzeText} className="btn-modern" data-testid="submit-analysis-btn">
                    <Sparkles className="w-4 h-4 mr-2" />
                    Analizar con IA
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Enhanced Chat Container */}
      <Card className="modern-card h-[650px] flex flex-col shadow-xl">
        {/* Messages Area */}
        <ScrollArea className="flex-1 p-6" data-testid="chat-messages">
          <div className="space-y-6">
            {messages.map((message) => (
              <div key={message.id} className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                {message.type === 'ai' && (
                  <Avatar className="w-12 h-12 flex-shrink-0 shadow-lg">
                    {assistantConfig.photo ? (
                      <AvatarImage src={assistantConfig.photo} alt={assistantConfig.name || 'Asistente'} />
                    ) : (
                      <AvatarFallback className="bg-gradient-to-r from-indigo-500 to-purple-600">
                        <Brain className="w-6 h-6 text-white" />
                      </AvatarFallback>
                    )}
                  </Avatar>
                )}
                
                {message.type === 'user' && (
                  <Avatar className="w-12 h-12 flex-shrink-0 shadow-lg order-2">
                    <AvatarFallback className="bg-gradient-to-r from-blue-500 to-cyan-500">
                      <User className="w-6 h-6 text-white" />
                    </AvatarFallback>
                  </Avatar>
                )}
                
                <div className={`max-w-[85%] ${message.type === 'user' ? 'order-1' : ''}`}>
                  <div className={`p-4 rounded-2xl shadow-sm ${
                    message.type === 'user' 
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white' 
                      : 'bg-white border border-slate-200 text-slate-900'
                  }`}>
                    <div className="whitespace-pre-wrap text-sm leading-relaxed">
                      {message.content}
                    </div>
                    
                    {/* Show attached files for user messages */}
                    {message.files && message.files.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-white/20">
                        <div className="flex flex-wrap gap-2">
                          {message.files.map((file, i) => (
                            <div key={i} className="flex items-center gap-1 bg-white/20 px-2 py-1 rounded-lg text-xs">
                              {file.type.startsWith('image/') ? (
                                <Image className="w-3 h-3" />
                              ) : (
                                <File className="w-3 h-3" />
                              )}
                              <span className="truncate max-w-24">{file.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {message.autoCreated && (
                      <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center gap-2 text-green-700 text-xs font-semibold">
                          <CheckSquare className="w-3 h-3" />
                          Acción automática completada
                        </div>
                      </div>
                    )}
                    
                    {message.type === 'ai' && (
                      <div className="flex justify-end mt-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(message.content)}
                          className="h-8 w-8 p-0 text-slate-500 hover:text-slate-700"
                          data-testid={`copy-message-${message.id}`}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 mt-2 px-1">
                    {message.type === 'ai' && (
                      <span className="text-xs font-semibold text-indigo-600">
                        {assistantConfig.name || 'Jika'}
                      </span>
                    )}
                    <span className="text-xs text-slate-500">
                      {formatTimestamp(message.timestamp)}
                    </span>
                    {message.type === 'ai' && (
                      <Badge variant="secondary" className="text-xs">
                        <Sparkles className="w-3 h-3 mr-1" />
                        GPT-4o
                      </Badge>
                    )}
                  </div>
                  
                  {/* Enhanced Suggestions */}
                  {message.suggestions && message.suggestions.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <p className="text-xs font-medium text-slate-600 flex items-center gap-1">
                        <Lightbulb className="w-3 h-3" />
                        Sugerencias inteligentes:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {message.suggestions.map((suggestion, index) => (
                          <Button
                            key={index}
                            variant="outline"
                            size="sm"
                            onClick={() => sendMessage(suggestion)}
                            className="text-xs h-8 hover:bg-indigo-50 hover:border-indigo-300"
                            data-testid={`suggestion-${index}`}
                          >
                            {suggestion}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Enhanced Action Buttons */}
                  {message.actions && message.actions.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <p className="text-xs font-medium text-slate-600 flex items-center gap-1">
                        <Zap className="w-3 h-3" />
                        Acciones rápidas:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {message.actions.map((action, index) => {
                          const Icon = action.type === 'create_task' ? CheckSquare : 
                                     action.type === 'create_event' ? Calendar :
                                     action.type === 'create_note' ? PenTool :
                                     action.type === 'create_alarm' ? Clock : Plus;
                          return (
                            <Button
                              key={index}
                              variant="secondary"
                              size="sm"
                              onClick={() => handleQuickAction(action.type, '')}
                              className="text-xs h-8 bg-gradient-to-r from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 border-green-200"
                              data-testid={`action-${action.type}-${index}`}
                            >
                              <Icon className="w-3 h-3 mr-2" />
                              {action.text}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
                
                {message.type === 'user' && (
                  <div className="w-12 h-12 bg-gradient-to-r from-slate-400 to-slate-600 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg">
                    <User className="w-6 h-6 text-white" />
                  </div>
                )}
              </div>
            ))}
            
            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <Brain className="w-6 h-6 text-white" />
                </div>
                <div className="bg-white border border-slate-200 text-slate-900 p-4 rounded-2xl shadow-sm">
                  <div className="flex items-center gap-2">
                    <Loader className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Analizando con IA avanzada...</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
        
        {/* Enhanced Input Area */}
        <div className="p-6 border-t border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50">
          {/* Quick Action Buttons */}
          <div className="flex gap-2 mb-4 flex-wrap">
            <Button
              onClick={() => sendMessage('Tengo varias tareas pendientes, ayúdame a organizarlas')}
              variant="outline"
              size="sm"
              className="text-xs h-8"
              data-testid="quick-organize"
            >
              <Target className="w-3 h-3 mr-1" />
              Organizar tareas
            </Button>
            <Button
              onClick={() => sendMessage('¿Qué debería hacer primero hoy?')}
              variant="outline"
              size="sm"
              className="text-xs h-8"
              data-testid="quick-priority"
            >
              <Lightbulb className="w-3 h-3 mr-1" />
              Prioridades
            </Button>
            <Button
              onClick={() => sendMessage('Ayúdame a ser más productivo')}
              variant="outline"
              size="sm"
              className="text-xs h-8"
              data-testid="quick-productivity"
            >
              <Zap className="w-3 h-3 mr-1" />
              Productividad
            </Button>
          </div>
          
          {/* File Upload Area */}
          {uploadedFiles.length > 0 && (
            <div className="mb-4 p-3 bg-indigo-50 border border-indigo-200 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-indigo-800 flex items-center gap-1">
                  <Paperclip className="w-4 h-4" />
                  Archivos para análisis IA ({uploadedFiles.length})
                </h4>
              </div>
              <div className="space-y-2">
                {uploadedFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between bg-white p-2 rounded-lg border border-indigo-200">
                    <div className="flex items-center gap-2">
                      {file.type.startsWith('image/') ? (
                        <Image className="w-4 h-4 text-green-600" />
                      ) : (
                        <File className="w-4 h-4 text-blue-600" />
                      )}
                      <span className="text-sm text-slate-700 truncate max-w-48">{file.name}</span>
                      <span className="text-xs text-slate-500">({(file.size / 1024).toFixed(1)}KB)</span>
                    </div>
                    <Button
                      onClick={() => removeFile(index)}
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-slate-500 hover:text-red-600"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Drop Zone */}
          <div 
            className={`relative ${isDragOver ? 'border-2 border-dashed border-indigo-400 bg-indigo-50 rounded-xl p-2' : ''}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            {isDragOver && (
              <div className="absolute inset-0 flex items-center justify-center bg-indigo-50 border-2 border-dashed border-indigo-400 rounded-xl z-10">
                <div className="text-center">
                  <Upload className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
                  <p className="text-indigo-700 font-semibold">Suelta los archivos aquí</p>
                  <p className="text-indigo-600 text-sm">Imágenes, PDFs, documentos...</p>
                </div>
              </div>
            )}

            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <Textarea
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder={uploadedFiles.length > 0 ? 
                    "📎 Archivos listos para análisis... Escribe tu pregunta o deja vacío para análisis automático" :
                    "💬 Escribe cualquier cosa... 'Tengo que hacer X', 'Recordar Y', '¿Cómo organizo Z?'\n\n📎 Arrastra archivos aquí o usa el botón de adjuntar\n🤖 Soy muy inteligente y entiendo contexto natural. ¡Pruébame!"
                  }
                  rows={3}
                  className="modern-input resize-none border-2 border-indigo-200 focus:border-indigo-400"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  disabled={isLoading}
                  data-testid="chat-input"
                />
              </div>
              
              <div className="flex flex-col gap-2">
                {/* File Upload Button */}
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading}
                  variant="outline"
                  size="sm"
                  className="h-12 w-12 p-0 hover:bg-indigo-50"
                  data-testid="file-upload-btn"
                  title="Subir archivo para análisis IA"
                >
                  <Paperclip className="w-5 h-5" />
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,text/*,.pdf,.doc,.docx"
                  onChange={(e) => handleFileUpload(Array.from(e.target.files || []))}
                  className="hidden"
                />

                <Button
                  onClick={handleVoiceInput}
                  disabled={isListening || isLoading}
                  variant="outline"
                  size="sm"
                  className={`h-12 w-12 p-0 ${isListening ? 'bg-red-50 border-red-200' : 'hover:bg-indigo-50'}`}
                  data-testid="voice-input-btn"
                  title="Comando de voz"
                >
                  {isListening ? (
                    <MicOff className="w-5 h-5 text-red-600 animate-pulse" />
                  ) : (
                    <Mic className="w-5 h-5" />
                  )}
                </Button>
                
                <Button
                  onClick={() => sendMessage()}
                  disabled={(!inputMessage.trim() && uploadedFiles.length === 0) || isLoading}
                  className="h-12 w-12 p-0 btn-modern shadow-lg"
                  data-testid="send-message-btn"
                  title="Enviar mensaje"
                >
                  {isLoading ? (
                    <Loader className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </Button>
              </div>
            </div>
          </div>
          
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
            <span>Enter = enviar • Shift+Enter = nueva línea • 🎤 = dictado por voz</span>
            <div className="flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              <span>IA Contextual GPT-4o</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AiChat;
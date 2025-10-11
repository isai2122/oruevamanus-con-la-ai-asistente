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
  Plus
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import axios from 'axios';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AiChat = () => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'ai',
      content: '¡Hola! Soy tu Asistente-Definitivo con IA. Puedo ayudarte a organizar tareas, analizar textos, extraer información y mucho más. ¿En qué puedo ayudarte hoy?',
      timestamp: new Date(),
      suggestions: [
        '¿Puedes ayudarme a organizar mi día?',
        'Extrae tareas de este texto',
        'Crea un resumen de mis notas',
        'Analiza este documento'
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
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (message = inputMessage) => {
    if (!message.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: message,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await axios.post(`${API}/ai/chat`, {
        text: message,
        context: messages.slice(-5).map(msg => msg.content).join('\n')
      });

      const aiMessage = {
        id: Date.now() + 1,
        type: 'ai',
        content: response.data.response,
        timestamp: new Date(),
        suggestions: response.data.suggestions,
        actions: response.data.actions
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Error al enviar mensaje');
      
      const errorMessage = {
        id: Date.now() + 1,
        type: 'ai',
        content: 'Disculpa, hubo un error al procesar tu mensaje. ¿Podrías intentarlo de nuevo?',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
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
        content: `He analizado tu texto. Aquí están los resultados:\n\n**Resumen:** ${response.data.summary || 'No disponible'}\n\n**Tareas extraídas:** ${response.data.tasks?.length || 0}\n**Fechas encontradas:** ${response.data.dates?.length || 0}\n**Contactos:** ${response.data.contacts?.length || 0}\n**Puntos clave:** ${response.data.key_points?.length || 0}`,
        timestamp: new Date(),
        analysisData: response.data
      };
      
      setMessages(prev => [...prev, analysisMessage]);
      setIsAnalysisOpen(false);
      setAnalysisText('');
      toast.success('Análisis completado');
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
        content: `He extraído ${response.data.count} tareas de tu texto${autoCreate ? ' y las he creado automáticamente' : ''}:\n\n${response.data.extracted_tasks.map((task, i) => `${i + 1}. **${task.title}**${task.description ? `\n   - ${task.description}` : ''}`).join('\n\n')}`,
        timestamp: new Date(),
        extractedTasks: response.data.extracted_tasks,
        createdTasks: response.data.created_tasks
      };
      
      setMessages(prev => [...prev, tasksMessage]);
      setExtractTasksOpen(false);
      setExtractText('');
      
      if (autoCreate && response.data.created_tasks?.length > 0) {
        toast.success(`${response.data.created_tasks.length} tareas creadas automáticamente`);
      } else {
        toast.success('Tareas extraídas exitosamente');
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
      };
      
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInputMessage(transcript);
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
      toast.success('Copiado al portapapeles');
    }).catch(() => {
      toast.error('Error al copiar');
    });
  };

  const formatTimestamp = (timestamp) => {
    return format(new Date(timestamp), 'HH:mm', { locale: es });
  };

  return (
    <div className="space-y-6 animate-fade-in" data-testid="ai-chat">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Chat con IA</h1>
          <p className="text-slate-600">Conversa con tu asistente inteligente powered by GPT-4o</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Dialog open={extractTasksOpen} onOpenChange={setExtractTasksOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="btn-secondary" data-testid="extract-tasks-btn">
                <CheckSquare className="w-4 h-4 mr-2" />
                Extraer Tareas
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Extraer Tareas con IA</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Texto para analizar</label>
                  <Textarea
                    value={extractText}
                    onChange={(e) => setExtractText(e.target.value)}
                    placeholder="Pega o escribe el texto del que quieres extraer tareas..."
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
                    Solo Extraer
                  </Button>
                  <Button onClick={() => handleExtractTasks(true)} className="btn-modern" data-testid="extract-create-btn">
                    Extraer y Crear
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          
          <Dialog open={isAnalysisOpen} onOpenChange={setIsAnalysisOpen}>
            <DialogTrigger asChild>
              <Button className="btn-modern" data-testid="analyze-text-btn">
                <Brain className="w-4 h-4 mr-2" />
                Analizar Texto
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Análisis Inteligente de Texto</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Texto para analizar</label>
                  <Textarea
                    value={analysisText}
                    onChange={(e) => setAnalysisText(e.target.value)}
                    placeholder="Pega o escribe el texto que quieres que analice la IA..."
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
                    <Brain className="w-4 h-4 mr-2" />
                    Analizar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Chat Container */}
      <Card className="modern-card h-[600px] flex flex-col">
        {/* Messages Area */}
        <ScrollArea className="flex-1 p-6" data-testid="chat-messages">
          <div className="space-y-6">
            {messages.map((message) => (
              <div key={message.id} className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                {message.type === 'ai' && (
                  <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Brain className="w-5 h-5 text-white" />
                  </div>
                )}
                
                <div className={`max-w-[80%] ${message.type === 'user' ? 'order-1' : ''}`}>
                  <div className={`p-4 rounded-2xl ${
                    message.type === 'user' 
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white' 
                      : 'bg-slate-50 text-slate-900'
                  }`}>
                    <div className="whitespace-pre-wrap text-sm leading-relaxed">
                      {message.content}
                    </div>
                    
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
                    <span className="text-xs text-slate-500">
                      {formatTimestamp(message.timestamp)}
                    </span>
                  </div>
                  
                  {/* Suggestions */}
                  {message.suggestions && message.suggestions.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <p className="text-xs font-medium text-slate-600">Sugerencias:</p>
                      <div className="flex flex-wrap gap-2">
                        {message.suggestions.map((suggestion, index) => (
                          <Button
                            key={index}
                            variant="outline"
                            size="sm"
                            onClick={() => sendMessage(suggestion)}
                            className="text-xs h-8"
                            data-testid={`suggestion-${index}`}
                          >
                            {suggestion}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Action Buttons */}
                  {message.actions && message.actions.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <p className="text-xs font-medium text-slate-600">Acciones rápidas:</p>
                      <div className="flex flex-wrap gap-2">
                        {message.actions.map((action, index) => {
                          const Icon = action.type === 'create_task' ? CheckSquare : 
                                     action.type === 'create_event' ? Calendar : 
                                     action.type === 'create_alarm' ? Clock : Plus;
                          return (
                            <Button
                              key={index}
                              variant="secondary"
                              size="sm"
                              className="text-xs h-8"
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
                  <div className="w-10 h-10 bg-gradient-to-r from-slate-400 to-slate-600 rounded-xl flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-white" />
                  </div>
                )}
              </div>
            ))}
            
            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <Brain className="w-5 h-5 text-white" />
                </div>
                <div className="bg-slate-50 text-slate-900 p-4 rounded-2xl">
                  <div className="flex items-center gap-2">
                    <Loader className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Pensando...</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
        
        {/* Input Area */}
        <div className="p-6 border-t border-slate-200">
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <Textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Escribe tu mensaje aquí... ¿En qué puedo ayudarte?"
                rows={3}
                className="modern-input resize-none"
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
              <Button
                onClick={handleVoiceInput}
                disabled={isListening || isLoading}
                variant="outline"
                size="sm"
                className={`h-10 w-10 p-0 ${isListening ? 'bg-red-50 border-red-200' : ''}`}
                data-testid="voice-input-btn"
              >
                {isListening ? (
                  <MicOff className="w-4 h-4 text-red-600" />
                ) : (
                  <Mic className="w-4 h-4" />
                )}
              </Button>
              
              <Button
                onClick={() => sendMessage()}
                disabled={!inputMessage.trim() || isLoading}
                className="h-10 w-10 p-0 btn-modern"
                data-testid="send-message-btn"
              >
                {isLoading ? (
                  <Loader className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
          
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
            <span>Presiona Enter para enviar, Shift+Enter para nueva línea</span>
            <div className="flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              <span>Powered by GPT-4o</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AiChat;
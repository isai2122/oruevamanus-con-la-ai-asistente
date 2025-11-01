import React, { useState } from 'react';
import { Eye, EyeOff, Sparkles, Brain, Calendar, MessageSquare } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { toast } from 'sonner';
import axios from 'axios';
import { useAuth } from '../App';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AuthScreen = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    device_id: navigator.userAgent
  });

  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const payload = isLogin 
        ? { email: formData.email, password: formData.password, device_id: formData.device_id }
        : formData;

      const response = await axios.post(`${API}${endpoint}`, payload);
      
      login(response.data.user, response.data.access_token);
      toast.success(isLogin ? '¡Bienvenido de nuevo!' : '¡Cuenta creada exitosamente!');
    } catch (error) {
      const message = error.response?.data?.detail || 
        (isLogin ? 'Error al iniciar sesión' : 'Error al crear cuenta');
      toast.error(message);
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-purple-400 to-indigo-600 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-blue-400 to-cyan-600 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10 w-full max-w-6xl flex flex-col lg:flex-row items-center gap-12">
        {/* Hero Section */}
        <div className="flex-1 text-center lg:text-left space-y-8">
          <div className="space-y-4">
            <h1 className="text-5xl lg:text-6xl font-bold text-slate-900 leading-tight">
              <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 bg-clip-text text-transparent">
                Jika
              </span>
            </h1>
            <p className="text-xl text-slate-600 leading-relaxed max-w-2xl">
              Tu compañero inteligente para organizar la vida, automatizar tareas y potenciar tu productividad con IA avanzada.
            </p>
          </div>

          {/* Features Preview */}
          <div className="grid grid-cols-2 gap-6 max-w-md mx-auto lg:mx-0">
            <div className="glass p-4 rounded-xl hover-lift">
              <Brain className="w-8 h-8 text-indigo-600 mb-2" />
              <h3 className="font-semibold text-slate-800">IA Avanzada</h3>
              <p className="text-sm text-slate-600">GPT-4o para análisis inteligente</p>
            </div>
            <div className="glass p-4 rounded-xl hover-lift">
              <Calendar className="w-8 h-8 text-purple-600 mb-2" />
              <h3 className="font-semibold text-slate-800">Gestión Total</h3>
              <p className="text-sm text-slate-600">Tareas, eventos y notas</p>
            </div>
            <div className="glass p-4 rounded-xl hover-lift">
              <MessageSquare className="w-8 h-8 text-blue-600 mb-2" />
              <h3 className="font-semibold text-slate-800">Chat Inteligente</h3>
              <p className="text-sm text-slate-600">Asistente conversacional</p>
            </div>
            <div className="glass p-4 rounded-xl hover-lift">
              <Sparkles className="w-8 h-8 text-amber-600 mb-2" />
              <h3 className="font-semibold text-slate-800">Automatización</h3>
              <p className="text-sm text-slate-600">Reglas personalizables</p>
            </div>
          </div>
        </div>

        {/* Auth Form */}
        <div className="flex-1 w-full max-w-md">
          <Card className="modern-card animate-scale-in">
            <CardHeader className="text-center space-y-2">
              <CardTitle className="text-2xl font-bold text-slate-900">
                {isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
              </CardTitle>
              <CardDescription className="text-slate-600">
                {isLogin 
                  ? 'Accede a tu asistente personal inteligente' 
                  : 'Únete y comienza a organizar tu vida'}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                {!isLogin && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Nombre completo</label>
                    <Input
                      name="full_name"
                      type="text"
                      placeholder="Tu nombre completo"
                      value={formData.full_name}
                      onChange={handleInputChange}
                      required={!isLogin}
                      className="modern-input"
                      data-testid="fullname-input"
                    />
                  </div>
                )}
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Email</label>
                  <Input
                    name="email"
                    type="email"
                    placeholder="tu@email.com"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="modern-input"
                    data-testid="email-input"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Contraseña</label>
                  <div className="relative">
                    <Input
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={handleInputChange}
                      required
                      className="modern-input pr-12"
                      data-testid="password-input"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      data-testid="toggle-password-btn"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                
                <Button 
                  type="submit" 
                  disabled={loading}
                  className="w-full btn-modern h-12 text-base"
                  data-testid="auth-submit-btn"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      {isLogin ? 'Iniciando...' : 'Creando cuenta...'}
                    </div>
                  ) : (
                    isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'
                  )}
                </Button>
              </form>
              
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
                  data-testid="switch-auth-mode-btn"
                >
                  {isLogin 
                    ? '¿No tienes cuenta? Crear una' 
                    : '¿Ya tienes cuenta? Iniciar sesión'}
                </button>
              </div>
              
              {/* Plan info */}
              <div className="mt-6 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl">
                <h4 className="font-semibold text-slate-800 mb-2">Plan Gratuito Incluye:</h4>
                <ul className="text-sm text-slate-600 space-y-1">
                  <li>• Hasta 4 dispositivos por cuenta</li>
                  <li>• Notas y tareas ilimitadas</li>
                  <li>• IA básica para análisis</li>
                  <li>• 10 automatizaciones/mes</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;
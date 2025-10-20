import React, { useState } from 'react';
import { 
  CreditCard,
  Phone,
  Mail,
  User,
  Lock,
  CheckCircle2,
  ArrowLeft,
  Shield,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const NequiCheckout = ({ onBack, onSuccess, amount }) => {
  const [step, setStep] = useState(1); // 1: info, 2: payment, 3: success
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    fullName: '',
    phone: '',
    nequiPhone: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Simular proceso de pago con Nequi
      // En producción real, aquí se integraría con API de Nequi
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Notificar al backend
      await axios.post(`${API}/payment/notify`, {
        amount: amount,
        currency: 'COP',
        phone: formData.nequiPhone,
        email: formData.email,
        notes: `Pago desde ${formData.phone}`
      });

      setStep(3);
      
      setTimeout(() => {
        toast.success('¡Pago procesado! Tu cuenta será actualizada pronto.');
        if (onSuccess) onSuccess();
      }, 2000);

    } catch (error) {
      console.error('Error processing payment:', error);
      toast.error('Error al procesar el pago. Por favor intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  if (step === 3) {
    return (
      <div className="text-center py-12 space-y-6">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-12 h-12 text-green-600" />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-slate-900 mb-2">¡Pago Recibido!</h3>
          <p className="text-slate-600">
            Tu solicitud ha sido enviada. Tu cuenta será actualizada a Premium en las próximas 24 horas.
          </p>
        </div>
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 text-left">
          <p className="text-sm text-blue-900">
            <Shield className="w-4 h-4 inline mr-2" />
            Recibirás un email de confirmación a <strong>{formData.email}</strong> una vez verificado el pago.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h3 className="text-xl font-semibold text-slate-900">Pago con Nequi</h3>
          <p className="text-sm text-slate-600">Completa la información para continuar</p>
        </div>
      </div>

      {/* Price Summary */}
      <div className="p-6 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-200">
        <div className="flex justify-between items-center mb-2">
          <span className="text-slate-700">Plan Premium (Mensual)</span>
          <span className="text-2xl font-bold text-slate-900">
            ${amount.toLocaleString()} COP
          </span>
        </div>
        <p className="text-xs text-slate-600">o $10 USD</p>
      </div>

      {/* Payment Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="email" className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-slate-600" />
            Correo electrónico
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="tu@email.com"
            required
            className="h-12"
          />
        </div>

        {/* Full Name */}
        <div className="space-y-2">
          <Label htmlFor="fullName" className="flex items-center gap-2">
            <User className="w-4 h-4 text-slate-600" />
            Nombre completo
          </Label>
          <Input
            id="fullName"
            name="fullName"
            type="text"
            value={formData.fullName}
            onChange={handleChange}
            placeholder="Nombre completo"
            required
            className="h-12"
          />
        </div>

        {/* Phone */}
        <div className="space-y-2">
          <Label htmlFor="phone" className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-slate-600" />
            Teléfono de contacto
          </Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            value={formData.phone}
            onChange={handleChange}
            placeholder="3001234567"
            required
            className="h-12"
          />
        </div>

        <div className="border-t pt-4 mt-6">
          <h4 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-indigo-600" />
            Información de pago Nequi
          </h4>

          {/* Nequi Phone */}
          <div className="space-y-2">
            <Label htmlFor="nequiPhone">
              Número de celular Nequi desde donde realizarás el pago
            </Label>
            <Input
              id="nequiPhone"
              name="nequiPhone"
              type="tel"
              value={formData.nequiPhone}
              onChange={handleChange}
              placeholder="3001234567"
              required
              className="h-12"
            />
            <p className="text-xs text-slate-600">
              Usaremos este número para verificar tu pago
            </p>
          </div>

          {/* Instructions */}
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-2 text-sm text-yellow-900">
                <p className="font-semibold">Instrucciones para pagar:</p>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>Abre tu app Nequi</li>
                  <li>Selecciona "Enviar Dinero"</li>
                  <li>Envía <strong>${amount.toLocaleString()} COP</strong> al número <strong>3215600837</strong></li>
                  <li>En el mensaje incluye tu email: <strong>{formData.email || '{tu_email}'}</strong></li>
                  <li>Completa el pago en Nequi</li>
                  <li>Haz clic en "Confirmar Pago" abajo</li>
                </ol>
              </div>
            </div>
          </div>
        </div>

        {/* Security Note */}
        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
          <p className="text-xs text-slate-600 flex items-center gap-2">
            <Lock className="w-4 h-4" />
            <span>Pago seguro. Tu información está protegida.</span>
          </p>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={loading || !formData.email || !formData.fullName || !formData.phone || !formData.nequiPhone}
          className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              Procesando...
            </div>
          ) : (
            'Confirmar Pago'
          )}
        </Button>

        <p className="text-xs text-center text-slate-500">
          Al hacer clic en "Confirmar Pago", confirmas que has realizado la transferencia Nequi.
        </p>
      </form>
    </div>
  );
};

export default NequiCheckout;

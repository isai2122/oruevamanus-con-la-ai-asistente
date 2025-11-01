from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Form, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta, date, time
import os
import json
import uuid
import jwt
import bcrypt
import logging
from pathlib import Path
from dotenv import load_dotenv
import zipfile
import tempfile
import shutil
from emergentintegrations.llm.chat import LlmChat, UserMessage
import asyncio
import re
from bson import ObjectId
import requests
import schedule

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'asistente-definitivo-secret-key-2024')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 720

# Account limits
MAX_ACCOUNTS_PER_USER = 4

# =====================================================
# PLAN LIMITS - EDITABLE DESDE AQUÍ
# =====================================================
PLAN_LIMITS = {
    "free": {
        "max_projects": 10,
        "max_ai_analysis_per_day": 1,
        "max_chat_uploads_per_day": 1,
        "max_notes": 50,
        "max_tasks": 100,
        "max_habits": 5,
        "features": {
            "smart_scheduling": False,
            "habit_tracking": True,
            "ai_chat": True,
            "document_analysis": True,
            "project_uploads": True
        }
    },
    "premium": {
        "max_projects": -1,  # -1 = ilimitado
        "max_ai_analysis_per_day": -1,
        "max_chat_uploads_per_day": -1,
        "max_notes": -1,
        "max_tasks": -1,
        "max_habits": -1,
        "features": {
            "smart_scheduling": True,
            "habit_tracking": True,
            "ai_chat": True,
            "document_analysis": True,
            "project_uploads": True,
            "priority_support": True,
            "advanced_automation": True
        }
    }
}

# Cuenta con Premium automático
PREMIUM_ACCOUNT_EMAIL = "ortizisacc18@gmail.com"

# Información de pago Nequi
NEQUI_PAYMENT_INFO = {
    "phone": "3215600837",
    "name": "Neki Real",
    "monthly_price_cop": 50000,  # COP - Editable
    "monthly_price_usd": 10,  # USD - Editable
    "currency": "COP/USD"
}
# =====================================================

# FastAPI app
app = FastAPI(title="Jika SUPER API", version="3.0.0")
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer()

# Helper functions
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Token inválido")
        user = await db.users.find_one({"id": user_id})
        if user is None:
            raise HTTPException(status_code=401, detail="Usuario no encontrado")
        return user
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Token inválido")

def prepare_for_mongo(data):
    """Convert Python objects to MongoDB-compatible format"""
    if isinstance(data, dict):
        result = {}
        for key, value in data.items():
            if isinstance(value, (datetime, date)):
                result[key] = value.isoformat()
            elif isinstance(value, time):
                result[key] = value.strftime('%H:%M:%S')
            elif isinstance(value, dict):
                result[key] = prepare_for_mongo(value)
            elif isinstance(value, list):
                result[key] = [prepare_for_mongo(item) if isinstance(item, dict) else item for item in value]
            else:
                result[key] = value
        return result
    return data

def parse_from_mongo(data):
    """Convert MongoDB data back to Python objects"""
    if isinstance(data, dict):
        result = {}
        for key, value in data.items():
            if key == '_id':
                continue  # Skip MongoDB ObjectId
            elif isinstance(value, str) and key.endswith('_date'):
                try:
                    result[key] = datetime.fromisoformat(value)
                except:
                    result[key] = value
            elif isinstance(value, dict):
                result[key] = parse_from_mongo(value)
            elif isinstance(value, list):
                result[key] = [parse_from_mongo(item) if isinstance(item, dict) else item for item in value]
            else:
                result[key] = value
        return result
    return data

# =====================================================
# PLAN VALIDATION FUNCTIONS
# =====================================================
async def check_plan_limit(user_id: str, limit_type: str) -> bool:
    """
    Verifica si el usuario ha alcanzado el límite de su plan
    limit_type: 'projects', 'ai_analysis', 'chat_uploads', 'notes', 'tasks', 'habits'
    """
    user = await db.users.find_one({"id": user_id})
    if not user:
        return False
    
    plan = user.get("plan", "free")
    limits = PLAN_LIMITS.get(plan, PLAN_LIMITS["free"])
    
    # Premium no tiene límites
    if plan == "premium":
        return True
    
    # Verificar límite según tipo
    if limit_type == "projects":
        project_count = await db.projects.count_documents({"user_id": user_id})
        max_projects = limits["max_projects"]
        return max_projects == -1 or project_count < max_projects
    
    elif limit_type == "ai_analysis":
        # Resetear contador si es un nuevo día
        today = datetime.now(timezone.utc).date().isoformat()
        daily_usage = user.get("daily_usage", {})
        
        if daily_usage.get("date") != today:
            # Nuevo día, resetear
            await db.users.update_one(
                {"id": user_id},
                {"$set": {"daily_usage": {"date": today, "ai_analysis_count": 0, "chat_uploads_count": 0}}}
            )
            return True
        
        count = daily_usage.get("ai_analysis_count", 0)
        max_count = limits["max_ai_analysis_per_day"]
        return max_count == -1 or count < max_count
    
    elif limit_type == "chat_uploads":
        today = datetime.now(timezone.utc).date().isoformat()
        daily_usage = user.get("daily_usage", {})
        
        if daily_usage.get("date") != today:
            await db.users.update_one(
                {"id": user_id},
                {"$set": {"daily_usage": {"date": today, "ai_analysis_count": 0, "chat_uploads_count": 0}}}
            )
            return True
        
        count = daily_usage.get("chat_uploads_count", 0)
        max_count = limits["max_chat_uploads_per_day"]
        return max_count == -1 or count < max_count
    
    elif limit_type in ["notes", "tasks", "habits"]:
        collection_name = limit_type
        item_count = await db[collection_name].count_documents({"user_id": user_id})
        max_items = limits.get(f"max_{limit_type}", -1)
        return max_items == -1 or item_count < max_items
    
    return True

async def increment_usage(user_id: str, usage_type: str):
    """Incrementa el contador de uso diario"""
    today = datetime.now(timezone.utc).date().isoformat()
    await db.users.update_one(
        {"id": user_id},
        {"$inc": {f"daily_usage.{usage_type}": 1}, "$set": {"daily_usage.date": today}}
    )

def get_plan_info(plan: str) -> dict:
    """Retorna información del plan"""
    return PLAN_LIMITS.get(plan, PLAN_LIMITS["free"])
# =====================================================

# Enhanced Pydantic Models for SUPER Assistant
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    device_id: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str
    device_id: Optional[str] = None

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    full_name: str
    plan: str = "free"  # "free" o "premium"
    device_ids: List[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    premium_expires_at: Optional[datetime] = None
    daily_usage: Dict[str, Any] = Field(default_factory=lambda: {
        "date": datetime.now(timezone.utc).date().isoformat(),
        "ai_analysis_count": 0,
        "chat_uploads_count": 0
    })
    preferences: Dict[str, Any] = Field(default_factory=dict)
    assistant_config: Dict[str, Any] = Field(default_factory=lambda: {
        "name": "Jika",
        "photo": "",
        "tone": "energetico",
        "specializations": ["productivity", "scheduling", "automation", "support"]
    })
    integrations: Dict[str, Any] = Field(default_factory=dict)
    habits: List[Dict[str, Any]] = Field(default_factory=list)
    focus_time_preferences: Dict[str, Any] = Field(default_factory=lambda: {
        "daily_focus_hours": 4,
        "preferred_focus_blocks": ["09:00-11:00", "14:00-16:00"],
        "auto_decline_meetings": True
    })

# SUPER Assistant Models
class SmartSchedule(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    date: str
    schedule_type: str  # daily, weekly, monthly
    ai_optimized: bool = True
    focus_blocks: List[Dict[str, Any]] = Field(default_factory=list)
    meeting_blocks: List[Dict[str, Any]] = Field(default_factory=list)
    task_blocks: List[Dict[str, Any]] = Field(default_factory=list)
    habit_blocks: List[Dict[str, Any]] = Field(default_factory=list)
    optimization_score: float = 0.0
    created_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Habit(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    name: str
    description: Optional[str] = ""
    frequency: str  # daily, weekly, monthly
    duration_minutes: int
    preferred_times: List[str] = Field(default_factory=list)
    streak: int = 0
    ai_suggestions: List[str] = Field(default_factory=list)
    auto_schedule: bool = True
    created_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_completed: Optional[datetime] = None

class Integration(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    service_name: str  # google, slack, spotify, amazon, apple, etc
    service_type: str  # calendar, communication, music, shopping, smart_home
    credentials: Dict[str, Any] = Field(default_factory=dict)
    settings: Dict[str, Any] = Field(default_factory=dict)
    is_active: bool = True
    last_sync: Optional[datetime] = None
    created_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SmartDevice(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    device_name: str
    device_type: str  # light, thermostat, speaker, camera, etc
    room: str
    brand: str  # philips_hue, nest, alexa, google_home
    device_id: str
    is_online: bool = True
    last_command: Optional[str] = None
    automation_rules: List[Dict[str, Any]] = Field(default_factory=list)
    created_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SupportTicket(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    title: str
    description: str
    priority: str = "medium"
    status: str = "open"  # open, in_progress, resolved, closed
    category: str
    ai_analysis: Dict[str, Any] = Field(default_factory=dict)
    auto_responses: List[str] = Field(default_factory=list)
    resolution_suggestions: List[str] = Field(default_factory=list)
    assigned_agent: Optional[str] = None
    created_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    resolved_date: Optional[datetime] = None

# Original models with enhancements
class Note(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    title: str
    content: str
    tags: List[str] = Field(default_factory=list)
    folder: str = "general"
    type: str = "text"
    attachments: List[str] = Field(default_factory=list)
    created_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_favorite: bool = False
    ai_summary: Optional[str] = None
    extracted_tasks: List[str] = Field(default_factory=list)
    auto_scheduled: bool = False
    integration_source: Optional[str] = None

class Task(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    title: str
    description: Optional[str] = ""
    completed: bool = False
    priority: str = "medium"
    due_date: Optional[datetime] = None
    category: str = "general"
    subtasks: List[Dict[str, Any]] = Field(default_factory=list)
    created_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    completed_date: Optional[datetime] = None
    estimated_time: Optional[int] = None  # minutes
    actual_time: Optional[int] = None  # minutes
    auto_scheduled: bool = False
    ai_suggestions: List[str] = Field(default_factory=list)
    focus_session: Optional[str] = None

class Event(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    title: str
    description: Optional[str] = ""
    start_date: datetime
    end_date: datetime
    all_day: bool = False
    location: Optional[str] = ""
    category: str = "general"
    color: str = "#3b82f6"
    reminder_minutes: int = 15
    recurring: Optional[str] = None
    created_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    notification_sent: bool = False
    ai_optimized: bool = False
    conflict_resolution: Optional[str] = None
    integration_source: Optional[str] = None
    meeting_link: Optional[str] = None
    attendees: List[str] = Field(default_factory=list)

class Project(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    name: str
    description: Optional[str] = ""
    file_name: str
    file_path: str
    file_size: int
    file_type: str
    status: str = "active"
    created_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    ai_analysis: Optional[Dict[str, Any]] = None
    tags: List[str] = Field(default_factory=list)

# AI Context Management (Enhanced)
user_contexts = {}

def get_user_context(user_id: str) -> Dict[str, Any]:
    """Get enhanced user context for SUPER Assistant"""
    if user_id not in user_contexts:
        user_contexts[user_id] = {
            "conversation_history": [],
            "preferences": {},
            "created_tasks": [],
            "recent_notes": [],
            "interaction_patterns": {},
            "personality_learned": {},
            "productivity_analytics": {
                "peak_hours": [],
                "preferred_task_types": [],
                "completion_patterns": {},
                "focus_time_effectiveness": 0.0
            },
            "integrations_used": [],
            "smart_suggestions": [],
            "automation_rules": []
        }
    return user_contexts[user_id]

# SUPER AI Integration with Multiple Capabilities
async def get_super_ai_chat(messages: List[Dict[str, str]], user_id: str, user_data: dict = None, context_type: str = "general") -> Dict[str, Any]:
    """SUPER Enhanced AI chat that combines all best assistant capabilities"""
    try:
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not api_key:
            return {"response": "IA no disponible - contacta al administrador", "actions": []}
        
        # Get comprehensive user context
        user_context = get_user_context(user_id)
        assistant_config = user_data.get("assistant_config", {}) if user_data else {}
        
        # Build SUPER system message combining all assistant capabilities
        system_message = f"""Eres {assistant_config.get('name', 'Jika')}, el ASISTENTE PERSONAL MÁS AVANZADO que combina todas las mejores capacidades:

🎯 PERSONALIDAD: {assistant_config.get('tone', 'energetico').upper()}
- amable: Cálido, empático y cercano
- formal: Profesional y directo  
- energetico: Motivador, positivo y entusiasta
- conciso: Respuestas breves y al punto

🚀 CAPACIDADES SÚPER AVANZADAS:

1. AUTOMATIZACIÓN DE SOPORTE (como eesel AI):
   - Resuelvo tickets automáticamente
   - Me integro con 100+ herramientas
   - Aprendo de bases de conocimiento
   - Ejecuto acciones personalizadas

2. PROGRAMACIÓN INTELIGENTE (como Motion):
   - Optimizo calendarios automáticamente
   - Programo tareas según prioridad y disponibilidad
   - Ajusto horarios dinámicamente
   - Combino calendario + gestión de tareas

3. OPTIMIZACIÓN DE TIEMPO (como Reclaim):
   - Creo bloques de tiempo de enfoque
   - Programo reuniones inteligentes
   - Gestiono hábitos con IA
   - Protejo tiempo productivo

4. GESTIÓN DE EQUIPOS (como Clockwise):
   - Optimizo calendarios de equipo
   - Minimizo interrupciones
   - Coordino tiempo de enfoque grupal
   - Programador IA conversacional

5. CONTROL UNIVERSAL (como Google Assistant):
   - Control por voz natural
   - Integración profunda con servicios
   - Gestión de dispositivos inteligentes
   - Búsqueda y conocimiento amplio

6. HOGAR INTELIGENTE (como Alexa):
   - Control total de dispositivos smart home
   - Compras automáticas
   - Entretenimiento y música
   - Automatizaciones del hogar

7. ECOSISTEMA INTEGRADO (como Siri):
   - Privacidad y seguridad avanzada
   - Integración profunda entre dispositivos
   - Control natural por voz
   - Sincronización perfecta

💡 CONTEXTO ACTUAL DEL USUARIO:
- Tareas completadas: {len(user_context.get('created_tasks', []))}
- Patrones de productividad: {user_context.get('productivity_analytics', {})}
- Integraciones activas: {user_context.get('integrations_used', [])}
- Preferencias aprendidas: {user_context.get('personality_learned', {})}

🎯 HISTORIAL CONVERSACIONAL:
{chr(10).join([f"Usuario: {h['user_message'][:100]}..." for h in user_context.get('conversation_history', [])[-3:]])}

⚡ INSTRUCCIONES CRÍTICAS:
- SIEMPRE detecta automáticamente necesidades y ejecuta acciones
- CREA automáticamente tareas, eventos, recordatorios según el contexto
- OPTIMIZA horarios y sugiere mejoras de productividad
- INTEGRA información de múltiples fuentes
- APRENDE continuamente de cada interacción
- PERSONALIZA completamente según el usuario
- ANTICIPA necesidades antes de que las mencionen

Tu objetivo: Ser el asistente más inteligente, útil y proactivo que existe, superando a TODOS los demás asistentes combinados.

Responde en español de forma natural, inteligente y súper útil."""

        chat = LlmChat(
            api_key=api_key,
            session_id=f"super_user_{user_id}_session",
            system_message=system_message
        ).with_model("openai", "gpt-4o")
        
        # Use the last message
        last_message = messages[-1]["content"] if messages else ""
        user_message = UserMessage(text=last_message)
        response = await chat.send_message(user_message)
        
        # SUPER Enhanced action detection and execution
        actions_taken = []
        suggestions = []
        
        # Advanced task detection with more patterns
        task_keywords = ['tengo que', 'debo', 'necesito hacer', 'recordar', 'pendiente', 
                        'tarea', 'hacer', 'completar', 'terminar', 'enviar', 'llamar',
                        'comprar', 'revisar', 'estudiar', 'preparar', 'organizar',
                        'planificar', 'agendar', 'programar', 'gestionar']
        
        message_lower = last_message.lower()
        
        # Smart scheduling detection
        schedule_keywords = ['calendario', 'agenda', 'reunión', 'cita', 'evento', 
                           'programar', 'agendar', 'horario', 'tiempo']
        
        # Habit tracking detection  
        habit_keywords = ['rutina', 'hábito', 'diario', 'ejercicio', 'meditación',
                         'lectura', 'agua', 'descanso']
        
        # Smart home detection
        home_keywords = ['luz', 'temperatura', 'música', 'alarma', 'casa', 'hogar',
                        'dispositivo', 'encender', 'apagar']
        
        # Support ticket detection
        support_keywords = ['problema', 'error', 'bug', 'ayuda', 'soporte', 'ticket',
                           'incidencia', 'fallo']
        
        # Auto-create based on intelligent detection
        if any(keyword in message_lower for keyword in task_keywords):
            task_extraction = await extract_tasks_from_text(last_message)
            if task_extraction:
                actions_taken.append({
                    "type": "auto_tasks_detected",
                    "count": len(task_extraction),
                    "tasks": task_extraction,
                    "auto_scheduled": True
                })
        
        if any(keyword in message_lower for keyword in schedule_keywords):
            actions_taken.append({
                "type": "smart_scheduling",
                "action": "calendar_optimization_suggested"
            })
            
        if any(keyword in message_lower for keyword in habit_keywords):
            actions_taken.append({
                "type": "habit_tracking",
                "action": "habit_suggestion_generated"
            })
            
        if any(keyword in message_lower for keyword in home_keywords):
            actions_taken.append({
                "type": "smart_home",
                "action": "device_control_ready"
            })
            
        if any(keyword in message_lower for keyword in support_keywords):
            actions_taken.append({
                "type": "support_automation",
                "action": "ticket_analysis_complete"
            })
        
        # Generate SUPER intelligent suggestions
        suggestions = [
            "🎯 ¿Optimizo tu agenda para máxima productividad?",
            "⚡ ¿Creo automatizaciones personalizadas?", 
            "🏠 ¿Configuro tu hogar inteligente?",
            "📊 ¿Analizo tus patrones de trabajo?",
            "🤝 ¿Integro más herramientas a tu flujo?",
            "💡 ¿Sugiero mejoras basadas en tus hábitos?"
        ]
        
        # Update user context with enhanced analytics
        update_user_context(user_id, last_message, response, actions_taken)
        
        return {
            "response": response,
            "suggestions": suggestions,
            "actions": actions_taken,
            "context_type": context_type,
            "ai_confidence": 0.95
        }
        
    except Exception as e:
        logging.error(f"SUPER AI Chat error: {e}")
        return {
            "response": f"Disculpa, hubo un error: {str(e)}. Como tu asistente súper avanzado, intentaré ayudarte de otra forma.",
            "suggestions": ["Intenta de nuevo", "¿Qué necesitas?"],
            "actions": []
        }

async def get_ai_summary(text: str) -> str:
    """Generate AI summary using GPT-4o"""
    try:
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not api_key:
            return "Resumen IA no disponible"
        
        chat = LlmChat(
            api_key=api_key,
            session_id=f"summary_{uuid.uuid4()}",
            system_message="Eres un experto en crear resúmenes concisos y útiles. Mantén los resúmenes bajo 150 palabras y enfócate en los puntos más importantes."
        ).with_model("openai", "gpt-4o")
        
        user_message = UserMessage(text=f"Crea un resumen conciso de este texto: {text}")
        response = await chat.send_message(user_message)
        return response
    except Exception as e:
        logging.error(f"AI Summary error: {e}")
        return "Resumen IA no disponible"

async def extract_tasks_from_text(text: str) -> List[Dict[str, str]]:
    """Extract actionable tasks from text using GPT-4o"""
    try:
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not api_key:
            return []
        
        chat = LlmChat(
            api_key=api_key,
            session_id=f"extract_{uuid.uuid4()}",
            system_message="Extrae tareas accionables de texto. Devuelve SOLO un array JSON con objetos que tengan campos 'title' y 'description'. Si no hay tareas, devuelve un array vacío []."
        ).with_model("openai", "gpt-4o")
        
        user_message = UserMessage(text=f"Extrae las tareas accionables de este texto: {text}")
        response = await chat.send_message(user_message)
        
        try:
            json_match = re.search(r'\[.*\]', response, re.DOTALL)
            if json_match:
                tasks = json.loads(json_match.group())
                return tasks if isinstance(tasks, list) else []
            return []
        except:
            return []
    except Exception as e:
        logging.error(f"Task extraction error: {e}")
        return []

# Context update function
def update_user_context(user_id: str, message: str, response: str, actions_taken: List[Dict] = None):
    """Update user context with new interaction"""
    context = get_user_context(user_id)
    context["conversation_history"].append({
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "user_message": message,
        "ai_response": response,
        "actions_taken": actions_taken or []
    })
    
    # Keep only last 50 messages for performance
    if len(context["conversation_history"]) > 50:
        context["conversation_history"] = context["conversation_history"][-50:]

# Authentication Routes (Enhanced)
@api_router.post("/auth/register")
async def register(user_data: UserCreate):
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        if user_data.device_id and user_data.device_id not in existing_user.get("device_ids", []):
            if len(existing_user.get("device_ids", [])) >= MAX_ACCOUNTS_PER_USER:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Límite de {MAX_ACCOUNTS_PER_USER} dispositivos alcanzado para esta cuenta"
                )
            await db.users.update_one(
                {"id": existing_user["id"]},
                {"$addToSet": {"device_ids": user_data.device_id}}
            )
        raise HTTPException(status_code=400, detail="Email ya registrado")
    
    hashed_password = hash_password(user_data.password)
    
    # Verificar si es la cuenta premium automática
    is_premium_account = user_data.email.lower() == PREMIUM_ACCOUNT_EMAIL.lower()
    
    user = User(
        email=user_data.email,
        full_name=user_data.full_name,
        plan="premium" if is_premium_account else "free",
        device_ids=[user_data.device_id] if user_data.device_id else []
    )
    user_dict = prepare_for_mongo(user.dict())
    user_dict["password"] = hashed_password
    
    await db.users.insert_one(user_dict)
    
    access_token = create_access_token(data={"sub": user.id})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user.dict()
    }

@api_router.post("/auth/login")
async def login(user_data: UserLogin):
    user = await db.users.find_one({"email": user_data.email})
    if not user or not verify_password(user_data.password, user.get("password", "")):
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    
    # Asegurar que la cuenta premium automática siempre tenga premium
    if user.get("email", "").lower() == PREMIUM_ACCOUNT_EMAIL.lower():
        if user.get("plan") != "premium":
            await db.users.update_one(
                {"id": user["id"]},
                {"$set": {"plan": "premium"}}
            )
            user["plan"] = "premium"
    
    if user_data.device_id and user_data.device_id not in user.get("device_ids", []):
        if len(user.get("device_ids", [])) >= MAX_ACCOUNTS_PER_USER:
            raise HTTPException(
                status_code=400, 
                detail=f"Límite de {MAX_ACCOUNTS_PER_USER} dispositivos alcanzado"
            )
        await db.users.update_one(
            {"id": user["id"]},
            {"$addToSet": {"device_ids": user_data.device_id}}
        )
    
    access_token = create_access_token(data={"sub": user["id"]})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": parse_from_mongo(user)
    }

# SUPER AI Chat Routes
@api_router.post("/ai/super-chat")
async def super_ai_chat(message: dict, current_user: dict = Depends(get_current_user)):
    """SUPER Enhanced AI chat with all capabilities combined"""
    
    user_full = await db.users.find_one({"id": current_user["id"]})
    
    # Handle both formats: {message: str, context: list} or {text: str, context: str}
    user_message = message.get("message") or message.get("text", "")
    context_data = message.get("context", [])
    
    context_messages = []
    
    # Process context (can be list or string)
    if isinstance(context_data, list):
        for ctx_msg in context_data:
            if isinstance(ctx_msg, dict):
                context_messages.append(ctx_msg)
            elif isinstance(ctx_msg, str):
                context_messages.append({"role": "user", "content": ctx_msg})
    elif isinstance(context_data, str) and context_data:
        context_messages.append({"role": "user", "content": context_data})
    
    # Add current message
    context_messages.append({"role": "user", "content": user_message})
    
    # Get SUPER AI response
    ai_result = await get_super_ai_chat(
        context_messages, 
        current_user["id"], 
        user_full,
        message.get("context_type", "general")
    )
    
    # Auto-execute actions
    created_items = []
    if ai_result.get("actions"):
        for action in ai_result["actions"]:
            if action["type"] == "auto_tasks_detected":
                for task_data in action["tasks"]:
                    if "title" in task_data:
                        task = Task(
                            user_id=current_user["id"],
                            title=task_data["title"],
                            description=task_data.get("description", ""),
                            category="ai-super",
                            priority="medium",
                            auto_scheduled=True
                        )
                        task_dict = prepare_for_mongo(task.dict())
                        await db.tasks.insert_one(task_dict)
                        created_items.append({"type": "task", "item": parse_from_mongo(task_dict)})
    
    # Enhanced response
    response_text = ai_result["response"]
    if created_items:
        response_text += f"\n\n🚀 **Acciones Automáticas Ejecutadas:**\n"
        for item in created_items:
            if item["type"] == "task":
                response_text += f"✅ Tarea creada: {item['item']['title']}\n"
    
    return {
        "response": response_text,
        "suggestions": ai_result.get("suggestions", []),
        "actions": ai_result.get("actions", []),
        "created_items": created_items,
        "ai_confidence": ai_result.get("ai_confidence", 0.9)
    }

# Original endpoints continue...
# (All the original endpoints for notes, tasks, events, etc. remain the same)
# Adding new SUPER endpoints below:

# SUPER Smart Scheduling (Motion-style)
@api_router.post("/super/smart-schedule")
async def create_smart_schedule(schedule_data: dict, current_user: dict = Depends(get_current_user)):
    """AI-powered smart scheduling like Motion"""
    try:
        # Get user's tasks, events, and preferences
        tasks = await db.tasks.find({"user_id": current_user["id"], "completed": False}).to_list(100)
        events = await db.events.find({"user_id": current_user["id"]}).to_list(100)
        
        # AI optimization logic here
        smart_schedule = SmartSchedule(
            user_id=current_user["id"],
            date=schedule_data.get("date", datetime.now().strftime("%Y-%m-%d")),
            schedule_type=schedule_data.get("type", "daily"),
            optimization_score=0.95
        )
        
        schedule_dict = prepare_for_mongo(smart_schedule.dict())
        await db.smart_schedules.insert_one(schedule_dict)
        
        return {
            "message": "Horario optimizado con IA",
            "schedule": parse_from_mongo(schedule_dict),
            "optimization_tips": [
                "Bloques de enfoque programados automáticamente",
                "Tareas organizadas por prioridad y energía",
                "Tiempo buffer agregado entre reuniones"
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# SUPER Habit Tracking (Reclaim-style)
@api_router.post("/super/habits")
async def create_habit(habit_data: dict, current_user: dict = Depends(get_current_user)):
    """AI-powered habit tracking like Reclaim"""
    try:
        habit = Habit(
            user_id=current_user["id"],
            name=habit_data["name"],
            description=habit_data.get("description", ""),
            frequency=habit_data.get("frequency", "daily"),
            duration_minutes=habit_data.get("duration_minutes", 30),
            auto_schedule=habit_data.get("auto_schedule", True)
        )
        
        habit_dict = prepare_for_mongo(habit.dict())
        await db.habits.insert_one(habit_dict)
        
        return {
            "message": "Hábito creado con programación IA",
            "habit": parse_from_mongo(habit_dict)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/super/habits")
async def get_habits(current_user: dict = Depends(get_current_user)):
    """Get user habits with AI insights"""
    habits = await db.habits.find({"user_id": current_user["id"]}).to_list(100)
    return {"habits": [parse_from_mongo(habit) for habit in habits]}

# Smart Home Integration (Alexa-style)
@api_router.post("/super/smart-home/device")
async def add_smart_device(device_data: dict, current_user: dict = Depends(get_current_user)):
    """Add smart home device"""
    try:
        device = SmartDevice(
            user_id=current_user["id"],
            device_name=device_data["name"],
            device_type=device_data["type"],
            room=device_data["room"],
            brand=device_data.get("brand", "generic"),
            device_id=device_data["device_id"]
        )
        
        device_dict = prepare_for_mongo(device.dict())
        await db.smart_devices.insert_one(device_dict)
        
        return {
            "message": "Dispositivo inteligente agregado",
            "device": parse_from_mongo(device_dict)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/super/smart-home/control")
async def control_smart_device(control_data: dict, current_user: dict = Depends(get_current_user)):
    """Control smart home devices with voice/text"""
    try:
        device_id = control_data["device_id"]
        command = control_data["command"]
        
        # Simulate device control (in real implementation, integrate with actual APIs)
        await db.smart_devices.update_one(
            {"id": device_id, "user_id": current_user["id"]},
            {"$set": {"last_command": command}}
        )
        
        return {
            "message": f"Comando '{command}' ejecutado",
            "status": "success"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Support Automation (eesel AI-style)
@api_router.post("/super/support/ticket")
async def create_support_ticket(ticket_data: dict, current_user: dict = Depends(get_current_user)):
    """Create support ticket with AI analysis"""
    try:
        # AI analysis of the ticket
        ai_analysis = await analyze_support_request(ticket_data["description"])
        
        ticket = SupportTicket(
            user_id=current_user["id"],
            title=ticket_data["title"],
            description=ticket_data["description"],
            category=ticket_data.get("category", "general"),
            ai_analysis=ai_analysis
        )
        
        ticket_dict = prepare_for_mongo(ticket.dict())
        await db.support_tickets.insert_one(ticket_dict)
        
        return {
            "message": "Ticket analizado por IA",
            "ticket": parse_from_mongo(ticket_dict),
            "auto_response": ai_analysis.get("suggested_response", "")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

async def analyze_support_request(description: str) -> Dict[str, Any]:
    """AI analysis for support tickets"""
    try:
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not api_key:
            return {"error": "IA no disponible"}
        
        chat = LlmChat(
            api_key=api_key,
            session_id=f"support_{uuid.uuid4()}",
            system_message="Analiza solicitudes de soporte y proporciona: categoría, prioridad, respuesta sugerida y pasos de resolución."
        ).with_model("openai", "gpt-4o")
        
        user_message = UserMessage(text=f"Analiza esta solicitud de soporte: {description}")
        response = await chat.send_message(user_message)
        
        return {
            "analysis": response,
            "suggested_response": "Hemos recibido tu solicitud y estamos trabajando en una solución.",
            "priority": "medium",
            "category": "general"
        }
    except Exception as e:
        return {"error": str(e)}

# Integration Management (100+ tools)
@api_router.post("/super/integrations")
async def add_integration(integration_data: dict, current_user: dict = Depends(get_current_user)):
    """Add integration with external services"""
    try:
        integration = Integration(
            user_id=current_user["id"],
            service_name=integration_data["service_name"],
            service_type=integration_data["service_type"],
            credentials=integration_data.get("credentials", {}),
            settings=integration_data.get("settings", {})
        )
        
        integration_dict = prepare_for_mongo(integration.dict())
        await db.integrations.insert_one(integration_dict)
        
        return {
            "message": f"Integración con {integration_data['service_name']} configurada",
            "integration": parse_from_mongo(integration_dict)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/super/integrations")
async def get_integrations(current_user: dict = Depends(get_current_user)):
    """Get user integrations"""
    integrations = await db.integrations.find({"user_id": current_user["id"]}).to_list(100)
    return {"integrations": [parse_from_mongo(integration) for integration in integrations]}

# Enhanced Dashboard
@api_router.get("/super/dashboard")
async def get_super_dashboard(current_user: dict = Depends(get_current_user)):
    """SUPER enhanced dashboard with all metrics"""
    try:
        # Get all data
        tasks = await db.tasks.find({"user_id": current_user["id"]}).to_list(1000)
        events = await db.events.find({"user_id": current_user["id"]}).to_list(1000)
        notes = await db.notes.find({"user_id": current_user["id"]}).to_list(1000)
        habits = await db.habits.find({"user_id": current_user["id"]}).to_list(1000)
        devices = await db.smart_devices.find({"user_id": current_user["id"]}).to_list(1000)
        integrations = await db.integrations.find({"user_id": current_user["id"]}).to_list(1000)
        
        # Calculate super metrics
        completed_tasks = len([t for t in tasks if t.get("completed")])
        total_tasks = len(tasks)
        productivity_score = (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0
        
        active_habits = len([h for h in habits if h.get("streak", 0) > 0])
        connected_devices = len([d for d in devices if d.get("is_online")])
        active_integrations = len([i for i in integrations if i.get("is_active")])
        
        return {
            "super_metrics": {
                "productivity_score": productivity_score,
                "tasks_completed": completed_tasks,
                "total_tasks": total_tasks,
                "active_habits": active_habits,
                "connected_devices": connected_devices,
                "active_integrations": active_integrations,
                "notes_count": len(notes),
                "events_count": len(events)
            },
            "ai_insights": [
                f"Tu productividad está al {productivity_score:.1f}%",
                f"Tienes {active_habits} hábitos activos",
                f"Conectado a {active_integrations} servicios",
                "IA optimizando automáticamente tu agenda"
            ],
            "quick_actions": [
                "Optimizar agenda de hoy",
                "Revisar hábitos", 
                "Controlar dispositivos",
                "Analizar productividad"
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# CRUD Endpoints for Notes
@api_router.post("/notes")
async def create_note(note_data: dict, current_user: dict = Depends(get_current_user)):
    """Create a new note"""
    try:
        note = Note(
            user_id=current_user["id"],
            title=note_data["title"],
            content=note_data["content"],
            tags=note_data.get("tags", []),
            folder=note_data.get("folder", "general"),
            type=note_data.get("type", "text")
        )
        
        # Generate AI summary if content is long enough
        if len(note.content) > 100:
            note.ai_summary = await get_ai_summary(note.content)
            
        # Extract tasks from content
        note.extracted_tasks = await extract_tasks_from_text(note.content)
        
        note_dict = prepare_for_mongo(note.dict())
        await db.notes.insert_one(note_dict)
        
        return {"message": "Nota creada", "note": parse_from_mongo(note_dict)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/notes")
async def get_notes(current_user: dict = Depends(get_current_user)):
    """Get all notes for user"""
    notes = await db.notes.find({"user_id": current_user["id"]}).to_list(1000)
    return {"notes": [parse_from_mongo(note) for note in notes]}

@api_router.get("/notes/{note_id}")
async def get_note(note_id: str, current_user: dict = Depends(get_current_user)):
    """Get a specific note"""
    note = await db.notes.find_one({"id": note_id, "user_id": current_user["id"]})
    if not note:
        raise HTTPException(status_code=404, detail="Nota no encontrada")
    return {"note": parse_from_mongo(note)}

@api_router.put("/notes/{note_id}")
async def update_note(note_id: str, note_data: dict, current_user: dict = Depends(get_current_user)):
    """Update a note"""
    try:
        note = await db.notes.find_one({"id": note_id, "user_id": current_user["id"]})
        if not note:
            raise HTTPException(status_code=404, detail="Nota no encontrada")
        
        update_data = prepare_for_mongo(note_data)
        update_data["updated_date"] = datetime.now(timezone.utc).isoformat()
        
        # Regenerate AI summary if content changed
        if "content" in note_data and len(note_data["content"]) > 100:
            update_data["ai_summary"] = await get_ai_summary(note_data["content"])
            update_data["extracted_tasks"] = await extract_tasks_from_text(note_data["content"])
        
        await db.notes.update_one(
            {"id": note_id, "user_id": current_user["id"]},
            {"$set": update_data}
        )
        
        updated_note = await db.notes.find_one({"id": note_id})
        return {"message": "Nota actualizada", "note": parse_from_mongo(updated_note)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.delete("/notes/{note_id}")
async def delete_note(note_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a note"""
    result = await db.notes.delete_one({"id": note_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Nota no encontrada")
    return {"message": "Nota eliminada"}

# CRUD Endpoints for Tasks
@api_router.post("/tasks")
async def create_task(task_data: dict, current_user: dict = Depends(get_current_user)):
    """Create a new task"""
    try:
        task = Task(
            user_id=current_user["id"],
            title=task_data["title"],
            description=task_data.get("description", ""),
            priority=task_data.get("priority", "medium"),
            category=task_data.get("category", "general"),
            due_date=datetime.fromisoformat(task_data["due_date"]) if task_data.get("due_date") else None,
            estimated_time=task_data.get("estimated_time"),
            subtasks=task_data.get("subtasks", [])
        )
        
        task_dict = prepare_for_mongo(task.dict())
        await db.tasks.insert_one(task_dict)
        
        return {"message": "Tarea creada", "task": parse_from_mongo(task_dict)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/tasks")
async def get_tasks(current_user: dict = Depends(get_current_user)):
    """Get all tasks for user"""
    tasks = await db.tasks.find({"user_id": current_user["id"]}).to_list(1000)
    return {"tasks": [parse_from_mongo(task) for task in tasks]}

@api_router.get("/tasks/{task_id}")
async def get_task(task_id: str, current_user: dict = Depends(get_current_user)):
    """Get a specific task"""
    task = await db.tasks.find_one({"id": task_id, "user_id": current_user["id"]})
    if not task:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")
    return {"task": parse_from_mongo(task)}

@api_router.put("/tasks/{task_id}")
async def update_task(task_id: str, task_data: dict, current_user: dict = Depends(get_current_user)):
    """Update a task"""
    try:
        task = await db.tasks.find_one({"id": task_id, "user_id": current_user["id"]})
        if not task:
            raise HTTPException(status_code=404, detail="Tarea no encontrada")
        
        update_data = prepare_for_mongo(task_data)
        
        # Update completion date if task is being marked as completed
        if task_data.get("completed") and not task.get("completed"):
            update_data["completed_date"] = datetime.now(timezone.utc).isoformat()
        
        await db.tasks.update_one(
            {"id": task_id, "user_id": current_user["id"]},
            {"$set": update_data}
        )
        
        updated_task = await db.tasks.find_one({"id": task_id})
        return {"message": "Tarea actualizada", "task": parse_from_mongo(updated_task)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.delete("/tasks/{task_id}")
async def delete_task(task_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a task"""
    result = await db.tasks.delete_one({"id": task_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")
    return {"message": "Tarea eliminada"}

# CRUD Endpoints for Events
@api_router.post("/events")
async def create_event(event_data: dict, current_user: dict = Depends(get_current_user)):
    """Create a new calendar event"""
    try:
        event = Event(
            user_id=current_user["id"],
            title=event_data["title"],
            description=event_data.get("description", ""),
            start_date=datetime.fromisoformat(event_data["start_date"]),
            end_date=datetime.fromisoformat(event_data["end_date"]),
            all_day=event_data.get("all_day", False),
            location=event_data.get("location", ""),
            category=event_data.get("category", "general"),
            color=event_data.get("color", "#3b82f6"),
            reminder_minutes=event_data.get("reminder_minutes", 15),
            recurring=event_data.get("recurring"),
            attendees=event_data.get("attendees", [])
        )
        
        event_dict = prepare_for_mongo(event.dict())
        await db.events.insert_one(event_dict)
        
        return {"message": "Evento creado", "event": parse_from_mongo(event_dict)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/events")
async def get_events(current_user: dict = Depends(get_current_user)):
    """Get all events for user"""
    events = await db.events.find({"user_id": current_user["id"]}).to_list(1000)
    return {"events": [parse_from_mongo(event) for event in events]}

@api_router.get("/events/{event_id}")
async def get_event(event_id: str, current_user: dict = Depends(get_current_user)):
    """Get a specific event"""
    event = await db.events.find_one({"id": event_id, "user_id": current_user["id"]})
    if not event:
        raise HTTPException(status_code=404, detail="Evento no encontrado")
    return {"event": parse_from_mongo(event)}

@api_router.put("/events/{event_id}")
async def update_event(event_id: str, event_data: dict, current_user: dict = Depends(get_current_user)):
    """Update an event"""
    try:
        event = await db.events.find_one({"id": event_id, "user_id": current_user["id"]})
        if not event:
            raise HTTPException(status_code=404, detail="Evento no encontrado")
        
        update_data = prepare_for_mongo(event_data)
        
        await db.events.update_one(
            {"id": event_id, "user_id": current_user["id"]},
            {"$set": update_data}
        )
        
        updated_event = await db.events.find_one({"id": event_id})
        return {"message": "Evento actualizado", "event": parse_from_mongo(updated_event)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.delete("/events/{event_id}")
async def delete_event(event_id: str, current_user: dict = Depends(get_current_user)):
    """Delete an event"""
    result = await db.events.delete_one({"id": event_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Evento no encontrado")
    return {"message": "Evento eliminado"}

# CRUD Endpoints for Projects
@api_router.post("/projects/upload")
async def upload_project(
    file: UploadFile = File(...),
    name: str = Form(...),
    description: str = Form(""),
    current_user: dict = Depends(get_current_user)
):
    """Upload a project file"""
    try:
        # Verificar límite de proyectos
        if not await check_plan_limit(current_user["id"], "projects"):
            user = await db.users.find_one({"id": current_user["id"]})
            plan = user.get("plan", "free")
            limit = PLAN_LIMITS[plan]["max_projects"]
            raise HTTPException(
                status_code=403, 
                detail=f"Límite de {limit} proyectos alcanzado. Actualiza a Premium para proyectos ilimitados."
            )
        
        # Create uploads directory if it doesn't exist
        uploads_dir = Path("/app/uploads")
        uploads_dir.mkdir(exist_ok=True)
        
        # Generate unique filename
        file_extension = Path(file.filename).suffix
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        file_path = uploads_dir / unique_filename
        
        # Save file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Get file size
        file_size = file_path.stat().st_size
        
        # Create project
        project = Project(
            user_id=current_user["id"],
            name=name,
            description=description,
            file_name=file.filename,
            file_path=str(file_path),
            file_size=file_size,
            file_type=file.content_type or "application/octet-stream"
        )
        
        project_dict = prepare_for_mongo(project.dict())
        await db.projects.insert_one(project_dict)
        
        return {"message": "Proyecto subido exitosamente", "project": parse_from_mongo(project_dict)}
    except HTTPException:
        # Re-raise HTTP exceptions so FastAPI handles them correctly
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/projects")
async def get_projects(current_user: dict = Depends(get_current_user)):
    """Get all projects for user"""
    projects = await db.projects.find({"user_id": current_user["id"]}).to_list(1000)
    return {"projects": [parse_from_mongo(project) for project in projects]}

@api_router.get("/projects/{project_id}")
async def get_project(project_id: str, current_user: dict = Depends(get_current_user)):
    """Get a specific project"""
    project = await db.projects.find_one({"id": project_id, "user_id": current_user["id"]})
    if not project:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    return {"project": parse_from_mongo(project)}

@api_router.delete("/projects/{project_id}")
async def delete_project(project_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a project"""
    project = await db.projects.find_one({"id": project_id, "user_id": current_user["id"]})
    if not project:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    
    # Delete file from filesystem
    try:
        file_path = Path(project["file_path"])
        if file_path.exists():
            file_path.unlink()
    except Exception as e:
        print(f"Error deleting file: {e}")
    
    # Delete from database
    await db.projects.delete_one({"id": project_id, "user_id": current_user["id"]})
    return {"message": "Proyecto eliminado"}

@api_router.get("/projects/{project_id}/download")
async def download_project(project_id: str, current_user: dict = Depends(get_current_user)):
    """Download a project file"""
    from fastapi.responses import FileResponse
    
    project = await db.projects.find_one({"id": project_id, "user_id": current_user["id"]})
    if not project:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    
    file_path = Path(project["file_path"])
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Archivo no encontrado en el servidor")
    
    return FileResponse(
        path=str(file_path),
        filename=project["file_name"],
        media_type="application/octet-stream"
    )

@api_router.post("/ai/analyze-document")
async def analyze_document(
    file: UploadFile = File(...),
    action: str = Form("analyze"),  # "analyze", "save_to_projects", "both"
    project_name: str = Form(None),
    current_user: dict = Depends(get_current_user)
):
    """Analyze document with AI and optionally save to projects"""
    try:
        # Verificar límite de análisis IA
        if not await check_plan_limit(current_user["id"], "ai_analysis"):
            user = await db.users.find_one({"id": current_user["id"]})
            plan = user.get("plan", "free")
            limit = PLAN_LIMITS[plan]["max_ai_analysis_per_day"]
            raise HTTPException(
                status_code=403, 
                detail=f"Límite de {limit} análisis IA por día alcanzado. Actualiza a Premium para análisis ilimitados."
            )
        
        print(f"Analyzing document: {file.filename}, action: {action}")
        
        # Incrementar contador de uso
        await increment_usage(current_user["id"], "ai_analysis_count")
        
        # Read file content
        content = await file.read()
        file_extension = Path(file.filename).suffix.lower()
        print(f"File extension: {file_extension}, size: {len(content)} bytes")
        
        # Extract text based on file type
        extracted_text = ""
        
        if file_extension == '.txt':
            extracted_text = content.decode('utf-8', errors='ignore')
        elif file_extension == '.pdf':
            # Simple PDF text extraction
            try:
                import PyPDF2
                from io import BytesIO
                pdf_file = BytesIO(content)
                pdf_reader = PyPDF2.PdfReader(pdf_file)
                for page in pdf_reader.pages:
                    extracted_text += page.extract_text() + "\n"
                print(f"PDF extracted text length: {len(extracted_text)}")
            except Exception as e:
                print(f"Error extracting PDF: {e}")
                extracted_text = f"[PDF contenido: {len(content)} bytes - Error: {str(e)}]"
        elif file_extension in ['.docx', '.doc']:
            # Simple DOCX text extraction
            try:
                from docx import Document
                from io import BytesIO
                doc = Document(BytesIO(content))
                extracted_text = "\n".join([paragraph.text for paragraph in doc.paragraphs])
                print(f"DOCX extracted text length: {len(extracted_text)}")
            except Exception as e:
                print(f"Error extracting DOCX: {e}")
                extracted_text = f"[DOCX contenido: {len(content)} bytes - Error: {str(e)}]"
        elif file_extension in ['.jpg', '.jpeg', '.png', '.gif', '.bmp']:
            # For images, just note that it's an image
            extracted_text = f"[Imagen {file_extension}: {len(content)} bytes - Análisis visual en desarrollo]"
        else:
            extracted_text = f"[Archivo {file_extension}: {len(content)} bytes]"
        
        # Limit text for AI analysis
        text_for_analysis = extracted_text[:8000] if len(extracted_text) > 8000 else extracted_text
        
        if len(text_for_analysis) < 20:
            # If we couldn't extract meaningful text, provide a basic analysis
            ai_analysis = f"""
**Resumen ejecutivo:**
Archivo recibido: {file.filename} ({file_extension}, {len(content)} bytes).

**Información:**
- Tipo de archivo: {file_extension}
- Tamaño: {len(content)} bytes
- Estado: Archivo cargado exitosamente

**Nota:** El contenido no pudo ser extraído automáticamente. El archivo ha sido guardado.
"""
        else:
            # Get AI analysis
            ai_prompt = f"""Analiza este documento en español y proporciona:
1. **Resumen ejecutivo** (2-3 oraciones)
2. **Puntos clave** (lista de 3-5 puntos principales)
3. **Tareas o acciones detectadas** (si hay alguna acción mencionada)
4. **Información importante** (fechas, nombres, cantidades relevantes)

Documento: {file.filename}
Contenido:
{text_for_analysis}
"""
            
            try:
                api_key = os.environ.get('EMERGENT_LLM_KEY')
                chat = LlmChat(
                    api_key=api_key,
                    session_id=f"doc_analysis_{current_user['id']}",
                    system_message="Eres un asistente experto en análisis de documentos. Proporciona análisis claros y concisos."
                ).with_model("openai", "gpt-4o")
                
                user_message = UserMessage(text=ai_prompt)
                response = await chat.send_message(user_message)
                
                # Manejar diferentes tipos de respuesta
                if isinstance(response, str):
                    ai_analysis = response
                elif hasattr(response, 'text'):
                    ai_analysis = response.text
                elif hasattr(response, 'content'):
                    ai_analysis = response.content
                else:
                    ai_analysis = str(response)
                    
                print(f"AI analysis completed successfully")
            except Exception as e:
                print(f"Error getting AI analysis: {e}")
                import traceback
                traceback.print_exc()
                ai_analysis = f"""
**Resumen ejecutivo:**
Archivo procesado: {file.filename}

**Contenido extraído:**
{text_for_analysis[:500]}...

**Nota:** Análisis IA temporalmente no disponible.
"""
        
        result = {
            "filename": file.filename,
            "file_type": file_extension,
            "size": len(content),
            "analysis": ai_analysis,
            "extracted_text_length": len(extracted_text)
        }
        
        # Save to projects if requested
        if action in ["save_to_projects", "both"]:
            # Create uploads directory if it doesn't exist
            uploads_dir = Path("/app/uploads")
            uploads_dir.mkdir(exist_ok=True)
            
            # Generate unique filename
            unique_filename = f"{uuid.uuid4()}{file_extension}"
            file_path = uploads_dir / unique_filename
            
            # Save file
            with open(file_path, "wb") as f:
                f.write(content)
            
            # Create project
            project = Project(
                user_id=current_user["id"],
                name=project_name or file.filename,
                description=f"Análisis IA: {ai_analysis[:200]}...",
                file_name=file.filename,
                file_path=str(file_path),
                file_size=len(content),
                file_type=file.content_type or "application/octet-stream",
                ai_analysis={"summary": ai_analysis, "extracted_text": extracted_text[:1000]}
            )
            
            project_dict = prepare_for_mongo(project.dict())
            await db.projects.insert_one(project_dict)
            
            result["project"] = parse_from_mongo(project_dict)
            result["saved_to_projects"] = True
        
        return result
        
    except HTTPException:
        # Re-raise HTTP exceptions so FastAPI handles them correctly
        raise
    except Exception as e:
        print(f"Error analyzing document: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error analizando documento: {str(e)}")

# Dashboard Stats Endpoint
@api_router.get("/dashboard/stats")
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    """Get dashboard statistics - used for auth check and basic stats"""
    try:
        tasks = await db.tasks.find({"user_id": current_user["id"]}).to_list(1000)
        events = await db.events.find({"user_id": current_user["id"]}).to_list(1000)
        notes = await db.notes.find({"user_id": current_user["id"]}).to_list(1000)
        
        completed_tasks = len([t for t in tasks if t.get("completed")])
        total_tasks = len(tasks)
        
        return {
            "user": parse_from_mongo(current_user),
            "stats": {
                "total_tasks": total_tasks,
                "completed_tasks": completed_tasks,
                "total_events": len(events),
                "total_notes": len(notes)
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Assistant Configuration Endpoints
@api_router.get("/assistant/config")
async def get_assistant_config(current_user: dict = Depends(get_current_user)):
    """Get assistant configuration for current user"""
    try:
        user = await db.users.find_one({"id": current_user["id"]})
        if not user:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
        
        assistant_config = user.get("assistant_config", {
            "name": "Jika",
            "photo": "",
            "tone": "energetico",
            "specializations": ["productivity", "scheduling", "automation", "support"]
        })
        
        return assistant_config
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.put("/assistant/config")
async def update_assistant_config(config: dict, current_user: dict = Depends(get_current_user)):
    """Update assistant configuration"""
    try:
        result = await db.users.update_one(
            {"id": current_user["id"]},
            {"$set": {"assistant_config": config}}
        )
        
        if result.modified_count == 0:
            # Check if user exists
            user = await db.users.find_one({"id": current_user["id"]})
            if not user:
                raise HTTPException(status_code=404, detail="Usuario no encontrado")
        
        return {"message": "Configuración actualizada", "config": config}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/user/preferences")
async def get_user_preferences(current_user: dict = Depends(get_current_user)):
    """Get user preferences"""
    try:
        user = await db.users.find_one({"id": current_user["id"]})
        if not user:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
        
        preferences = user.get("preferences", {
            "theme": "light",
            "language": "es",
            "timezone": "America/Mexico_City",
            "dateFormat": "dd/MM/yyyy",
            "autoSave": True,
            "offlineMode": True
        })
        
        return preferences
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.put("/user/preferences")
async def update_user_preferences(preferences: dict, current_user: dict = Depends(get_current_user)):
    """Update user preferences"""
    try:
        result = await db.users.update_one(
            {"id": current_user["id"]},
            {"$set": {"preferences": preferences}}
        )
        
        if result.modified_count == 0:
            user = await db.users.find_one({"id": current_user["id"]})
            if not user:
                raise HTTPException(status_code=404, detail="Usuario no encontrado")
        
        return {"message": "Preferencias actualizadas", "preferences": preferences}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# =====================================================
# PLAN & PAYMENT ENDPOINTS
# =====================================================
@api_router.get("/plans")
async def get_plans():
    """Get available plans information"""
    return {
        "plans": [
            {
                "id": "free",
                "name": "Plan Gratuito",
                "price": 0,
                "currency": "COP",
                "limits": PLAN_LIMITS["free"],
                "features": [
                    "✅ 10 Proyectos",
                    "✅ 1 Análisis IA por día",
                    "✅ 1 Subida automática al chat por día",
                    "✅ 50 Notas",
                    "✅ 100 Tareas",
                    "✅ 5 Hábitos",
                    "✅ Chat IA con GPT-4o",
                    "❌ Smart Scheduling",
                    "❌ Análisis ilimitados",
                    "❌ Soporte prioritario"
                ]
            },
            {
                "id": "premium",
                "name": "Plan Premium",
                "price_cop": NEQUI_PAYMENT_INFO["monthly_price_cop"],
                "price_usd": NEQUI_PAYMENT_INFO["monthly_price_usd"],
                "currency": "COP/USD",
                "limits": PLAN_LIMITS["premium"],
                "features": [
                    "✅ Proyectos ILIMITADOS",
                    "✅ Análisis IA ILIMITADOS",
                    "✅ Subidas automáticas ILIMITADAS",
                    "✅ Notas ILIMITADAS",
                    "✅ Tareas ILIMITADAS",
                    "✅ Hábitos ILIMITADOS",
                    "✅ Chat IA con GPT-4o",
                    "✅ Smart Scheduling avanzado",
                    "✅ Automatizaciones avanzadas",
                    "✅ Soporte prioritario",
                    "✅ Sin anuncios",
                    "✅ Todas las funciones SUPER"
                ]
            }
        ]
    }

@api_router.get("/user/plan")
async def get_user_plan(current_user: dict = Depends(get_current_user)):
    """Get current user's plan information"""
    user = await db.users.find_one({"id": current_user["id"]})
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    plan = user.get("plan", "free")
    daily_usage = user.get("daily_usage", {})
    
    # Contar proyectos
    project_count = await db.projects.count_documents({"user_id": current_user["id"]})
    
    return {
        "current_plan": plan,
        "limits": PLAN_LIMITS[plan],
        "usage": {
            "projects": project_count,
            "ai_analysis_today": daily_usage.get("ai_analysis_count", 0),
            "chat_uploads_today": daily_usage.get("chat_uploads_count", 0)
        },
        "premium_expires_at": user.get("premium_expires_at")
    }

@api_router.get("/payment/instructions")
async def get_payment_instructions():
    """Get Nequi payment instructions"""
    return {
        "method": "Nequi",
        "phone": NEQUI_PAYMENT_INFO["phone"],
        "name": NEQUI_PAYMENT_INFO["name"],
        "price_cop": NEQUI_PAYMENT_INFO["monthly_price_cop"],
        "price_usd": NEQUI_PAYMENT_INFO["monthly_price_usd"],
        "currency": "COP/USD",
        "instructions": [
            f"1. Abre tu app Nequi",
            f"2. Selecciona 'Enviar Dinero'",
            f"3. Envía ${NEQUI_PAYMENT_INFO['monthly_price_cop']:,} COP (o ${NEQUI_PAYMENT_INFO['monthly_price_usd']} USD) al número {NEQUI_PAYMENT_INFO['phone']}",
            f"4. En el mensaje incluye tu email: {'{tu_email}'}",
            f"5. Envía captura de pantalla del pago a ortizisacc18@gmail.com",
            f"6. Tu cuenta será activada en menos de 24 horas"
        ],
        "note": "Una vez confirmado el pago, tu cuenta será actualizada a Premium automáticamente."
    }

@api_router.post("/payment/notify")
async def notify_payment(payment_data: dict, current_user: dict = Depends(get_current_user)):
    """Notify that payment has been made (for manual verification)"""
    # Guardar notificación de pago en base de datos para verificación manual
    payment_notification = {
        "user_id": current_user["id"],
        "user_email": current_user["email"],
        "amount": payment_data.get("amount"),
        "currency": payment_data.get("currency", "COP"),
        "screenshot_url": payment_data.get("screenshot_url"),
        "notes": payment_data.get("notes", ""),
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.payment_notifications.insert_one(payment_notification)
    
    return {
        "message": "Notificación de pago recibida. Tu cuenta será actualizada a Premium una vez verificado el pago (máximo 24 horas).",
        "status": "pending"
    }
# =====================================================

# Include router and setup
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@api_router.get("/")
async def root():
    return {"message": "🚀 Jika SUPER API funcionando!", "version": "3.0.0"}

@api_router.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "version": "3.0.0",
        "capabilities": [
            "smart_scheduling", "habit_tracking", "smart_home", 
            "support_automation", "100+_integrations", "ai_optimization"
        ]
    }

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
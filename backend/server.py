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

# FastAPI app
app = FastAPI(title="Asistente-Definitivo API", version="2.0.0")
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

# Pydantic Models
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
    plan: str = "free"
    device_ids: List[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    preferences: Dict[str, Any] = Field(default_factory=dict)
    assistant_config: Dict[str, Any] = Field(default_factory=lambda: {
        "name": "Asistente",
        "photo": "",
        "tone": "amable"
    })

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

class NoteCreate(BaseModel):
    title: str
    content: str
    tags: List[str] = Field(default_factory=list)
    folder: str = "general"
    type: str = "text"

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

class EventCreate(BaseModel):
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

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    priority: str = "medium"
    due_date: Optional[datetime] = None
    category: str = "general"
    estimated_time: Optional[int] = None

class Alarm(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    title: str
    description: Optional[str] = ""
    alarm_time: datetime
    repeat_pattern: Optional[str] = None  # daily, weekly, weekdays, etc.
    is_active: bool = True
    snooze_count: int = 0
    max_snooze: int = 3
    created_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AlarmCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    alarm_time: datetime
    repeat_pattern: Optional[str] = None
    max_snooze: int = 3

class Project(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    name: str
    description: Optional[str] = ""
    file_path: str
    file_size: int
    version: str = "1.0.0"
    extracted_info: Dict[str, Any] = Field(default_factory=dict)
    analysis_status: str = "pending"  # pending, processing, completed, failed
    created_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AutomationRule(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    name: str
    description: Optional[str] = ""
    trigger_type: str  # keyword, time, location, email, etc.
    trigger_config: Dict[str, Any]
    action_type: str  # create_task, send_notification, etc.
    action_config: Dict[str, Any]
    is_active: bool = True
    created_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_triggered: Optional[datetime] = None

class ChatMessage(BaseModel):
    text: str
    context: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    suggestions: List[str] = Field(default_factory=list)
    actions: List[Dict[str, Any]] = Field(default_factory=list)

class VoiceCommand(BaseModel):
    audio_data: str  # base64 encoded
    command_type: Optional[str] = None

# User Context Management
user_contexts = {}  # Store user conversation context

def get_user_context(user_id: str) -> Dict[str, Any]:
    """Get user's conversation context and preferences"""
    if user_id not in user_contexts:
        user_contexts[user_id] = {
            "conversation_history": [],
            "preferences": {},
            "created_tasks": [],
            "recent_notes": [],
            "interaction_patterns": {},
            "personality_learned": {}
        }
    return user_contexts[user_id]

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

# AI Integration with Enhanced Context
async def get_ai_chat(messages: List[Dict[str, str]], user_id: str, user_data: dict = None) -> Dict[str, Any]:
    """Enhanced AI chat with personalized context and automatic actions"""
    try:
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not api_key:
            return {"response": "IA no disponible - contacta al administrador", "actions": []}
        
        # Get user context and preferences
        user_context = get_user_context(user_id)
        assistant_config = user_data.get("assistant_config", {}) if user_data else {}
        
        # Build personalized system message
        system_message = f"""Eres {assistant_config.get('name', 'Asistente-Definitivo')}, un asistente personal inteligente y personalizado.

PERSONALIDAD: {assistant_config.get('tone', 'amable').upper()}
- amable: Sé cálido, empático y cercano
- formal: Mantén comunicación profesional y directa  
- energetico: Sé motivador, positivo y entusiasta
- conciso: Da respuestas breves y al punto

CAPACIDADES PRINCIPALES:
1. CREAR AUTOMÁTICAMENTE tareas cuando el usuario lo mencione (ej: "tengo que hacer X", "recordar Y")
2. CREAR AUTOMÁTICAMENTE notas cuando sea apropiado
3. CREAR AUTOMÁTICAMENTE eventos cuando mencione fechas/horarios
4. Analizar y resumir información instantáneamente
5. Extraer información estructurada de textos
6. Dar consejos personalizados basados en el historial

CONTEXTO DEL USUARIO:
- Tareas creadas recientemente: {len(user_context.get('created_tasks', []))}
- Patrones de interacción: {user_context.get('interaction_patterns', {})}
- Preferencias aprendidas: {user_context.get('personality_learned', {})}

HISTORIAL RECIENTE:
{chr(10).join([f"Usuario: {h['user_message'][:100]}..." for h in user_context.get('conversation_history', [])[-3:]])}

INSTRUCCIONES CRÍTICAS:
- SIEMPRE detecta cuando el usuario menciona tareas y responde con actions para crearlas
- Personaliza completamente tu respuesta según su personalidad y historial
- Sé proactivo sugiriendo organizaciones y mejoras
- Aprende de cada interacción para ser más útil

Responde en español de forma natural y útil."""

        chat = LlmChat(
            api_key=api_key,
            session_id=f"user_{user_id}_session",
            system_message=system_message
        ).with_model("openai", "gpt-4o")
        
        # Use the last message for the user message
        last_message = messages[-1]["content"] if messages else ""
        user_message = UserMessage(text=last_message)
        response = await chat.send_message(user_message)
        
        # Detect and create automatic actions
        actions_taken = []
        suggestions = []
        
        # Enhanced task detection
        task_keywords = ['tengo que', 'debo', 'necesito hacer', 'recordar', 'pendiente', 
                        'tarea', 'hacer', 'completar', 'terminar', 'enviar', 'llamar',
                        'comprar', 'revisar', 'estudiar', 'preparar']
        
        message_lower = last_message.lower()
        
        # Auto-create tasks based on natural language
        if any(keyword in message_lower for keyword in task_keywords):
            # Extract potential tasks using AI
            task_extraction_response = await extract_tasks_from_text(last_message)
            if task_extraction_response:
                actions_taken.append({
                    "type": "auto_tasks_detected",
                    "count": len(task_extraction_response),
                    "tasks": task_extraction_response
                })
        
        # Generate smart suggestions based on context
        if 'calendario' in message_lower or 'evento' in message_lower:
            suggestions.extend([
                "¿Quieres que cree un evento en tu calendario?",
                "¿Te ayudo a programar recordatorios?",
                "¿Revisamos tu agenda de esta semana?"
            ])
        
        if 'nota' in message_lower or 'apuntar' in message_lower:
            suggestions.extend([
                "¿Creo una nota con esta información?",
                "¿Quieres que analice y resuma esto?",
                "¿Te ayudo a organizar estas ideas?"
            ])
        
        if 'análisis' in message_lower or 'resumir' in message_lower:
            suggestions.extend([
                "¿Quieres que analice algún documento?",
                "¿Te ayudo a extraer información clave?",
                "¿Necesitas un resumen de tus notas recientes?"
            ])
        
        # Update user context
        update_user_context(user_id, last_message, response, actions_taken)
        
        return {
            "response": response,
            "suggestions": suggestions,
            "actions": actions_taken
        }
        
    except Exception as e:
        logging.error(f"AI Chat error: {e}")
        return {
            "response": f"Disculpa, hubo un error: {str(e)}. Intentaré ayudarte de otra forma.",
            "suggestions": [],
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
            # Clean the response to extract JSON
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

async def analyze_document(content: str, file_type: str) -> Dict[str, Any]:
    """Analyze document content using GPT-4o"""
    try:
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not api_key:
            return {"error": "Análisis IA no disponible"}
        
        chat = LlmChat(
            api_key=api_key,
            session_id=f"analyze_{uuid.uuid4()}",
            system_message="Analiza documentos y extrae información estructurada. Devuelve un JSON con: summary, tasks, dates, amounts, contacts, key_points."
        ).with_model("openai", "gpt-4o")
        
        prompt = f"Analiza este documento ({file_type}) y extrae: resumen, tareas, fechas importantes, montos, contactos y puntos clave. Contenido: {content[:3000]}"
        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        
        try:
            # Try to parse as JSON, fallback to structured text
            json_match = re.search(r'\{.*\}', response, re.DOTALL)
            if json_match:
                return json.loads(json_match.group())
            else:
                return {
                    "summary": response[:500],
                    "tasks": [],
                    "dates": [],
                    "amounts": [],
                    "contacts": [],
                    "key_points": [response[:200]]
                }
        except:
            return {
                "summary": response[:500],
                "analysis_text": response
            }
    except Exception as e:
        logging.error(f"Document analysis error: {e}")
        return {"error": str(e)}

# Authentication Routes
@api_router.post("/auth/register")
async def register(user_data: UserCreate):
    # Check if user already exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        # Check device limit for existing user
        if user_data.device_id and user_data.device_id not in existing_user.get("device_ids", []):
            if len(existing_user.get("device_ids", [])) >= MAX_ACCOUNTS_PER_USER:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Límite de {MAX_ACCOUNTS_PER_USER} dispositivos alcanzado para esta cuenta"
                )
            # Add new device
            await db.users.update_one(
                {"id": existing_user["id"]},
                {"$addToSet": {"device_ids": user_data.device_id}}
            )
        raise HTTPException(status_code=400, detail="Email ya registrado")
    
    hashed_password = hash_password(user_data.password)
    user = User(
        email=user_data.email,
        full_name=user_data.full_name,
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
    
    # Check device limit
    if user_data.device_id and user_data.device_id not in user.get("device_ids", []):
        if len(user.get("device_ids", [])) >= MAX_ACCOUNTS_PER_USER:
            raise HTTPException(
                status_code=400, 
                detail=f"Límite de {MAX_ACCOUNTS_PER_USER} dispositivos alcanzado"
            )
        # Add new device
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

# Notes Routes
@api_router.post("/notes", response_model=Note)
async def create_note(note_data: NoteCreate, current_user: dict = Depends(get_current_user)):
    note = Note(
        user_id=current_user["id"],
        **note_data.dict()
    )
    note_dict = prepare_for_mongo(note.dict())
    
    # Generate AI summary and extract tasks for long content
    if len(note_data.content) > 100:
        note_dict["ai_summary"] = await get_ai_summary(note_data.content)
        extracted_tasks = await extract_tasks_from_text(note_data.content)
        note_dict["extracted_tasks"] = [task["title"] for task in extracted_tasks if "title" in task]
    
    await db.notes.insert_one(note_dict)
    return parse_from_mongo(note_dict)

@api_router.get("/notes", response_model=List[Note])
async def get_notes(
    folder: Optional[str] = None,
    tag: Optional[str] = None,
    search: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {"user_id": current_user["id"]}
    
    if folder:
        query["folder"] = folder
    if tag:
        query["tags"] = {"$in": [tag]}
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"content": {"$regex": search, "$options": "i"}},
            {"tags": {"$in": [re.compile(search, re.IGNORECASE)]}}
        ]
    
    notes = await db.notes.find(query).sort("created_date", -1).to_list(1000)
    return [parse_from_mongo(note) for note in notes]

@api_router.put("/notes/{note_id}")
async def update_note(note_id: str, note_data: NoteCreate, current_user: dict = Depends(get_current_user)):
    update_data = prepare_for_mongo(note_data.dict())
    update_data["updated_date"] = datetime.now(timezone.utc).isoformat()
    
    # Re-generate AI analysis if content changed significantly
    if len(note_data.content) > 100:
        update_data["ai_summary"] = await get_ai_summary(note_data.content)
        extracted_tasks = await extract_tasks_from_text(note_data.content)
        update_data["extracted_tasks"] = [task["title"] for task in extracted_tasks if "title" in task]
    
    result = await db.notes.update_one(
        {"id": note_id, "user_id": current_user["id"]},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Nota no encontrada")
    
    updated_note = await db.notes.find_one({"id": note_id, "user_id": current_user["id"]})
    return parse_from_mongo(updated_note)

@api_router.delete("/notes/{note_id}")
async def delete_note(note_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.notes.delete_one({"id": note_id, "user_id": current_user["id"]})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Nota no encontrada")
    
    return {"message": "Nota eliminada exitosamente"}

# Tasks Routes
@api_router.post("/tasks", response_model=Task)
async def create_task(task_data: TaskCreate, current_user: dict = Depends(get_current_user)):
    task = Task(
        user_id=current_user["id"],
        **task_data.dict()
    )
    task_dict = prepare_for_mongo(task.dict())
    await db.tasks.insert_one(task_dict)
    return parse_from_mongo(task_dict)

@api_router.get("/tasks", response_model=List[Task])
async def get_tasks(
    completed: Optional[bool] = None,
    priority: Optional[str] = None,
    category: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {"user_id": current_user["id"]}
    
    if completed is not None:
        query["completed"] = completed
    if priority:
        query["priority"] = priority
    if category:
        query["category"] = category
    
    tasks = await db.tasks.find(query).sort("created_date", -1).to_list(1000)
    return [parse_from_mongo(task) for task in tasks]

@api_router.put("/tasks/{task_id}/complete")
async def complete_task(task_id: str, current_user: dict = Depends(get_current_user)):
    update_data = {
        "completed": True,
        "completed_date": datetime.now(timezone.utc).isoformat()
    }
    
    result = await db.tasks.update_one(
        {"id": task_id, "user_id": current_user["id"]},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")
    
    return {"message": "Tarea completada exitosamente"}

@api_router.put("/tasks/{task_id}")
async def update_task(task_id: str, task_data: TaskCreate, current_user: dict = Depends(get_current_user)):
    update_data = prepare_for_mongo(task_data.dict())
    
    result = await db.tasks.update_one(
        {"id": task_id, "user_id": current_user["id"]},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")
    
    updated_task = await db.tasks.find_one({"id": task_id, "user_id": current_user["id"]})
    return parse_from_mongo(updated_task)

@api_router.delete("/tasks/{task_id}")
async def delete_task(task_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.tasks.delete_one({"id": task_id, "user_id": current_user["id"]})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")
    
    return {"message": "Tarea eliminada exitosamente"}

# Events/Calendar Routes
@api_router.post("/events", response_model=Event)
async def create_event(event_data: EventCreate, current_user: dict = Depends(get_current_user)):
    event = Event(
        user_id=current_user["id"],
        **event_data.dict()
    )
    event_dict = prepare_for_mongo(event.dict())
    await db.events.insert_one(event_dict)
    return parse_from_mongo(event_dict)

@api_router.get("/events", response_model=List[Event])
async def get_events(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {"user_id": current_user["id"]}
    
    if start_date and end_date:
        query["start_date"] = {
            "$gte": start_date,
            "$lte": end_date
        }
    
    events = await db.events.find(query).sort("start_date", 1).to_list(1000)
    return [parse_from_mongo(event) for event in events]

@api_router.put("/events/{event_id}")
async def update_event(event_id: str, event_data: EventCreate, current_user: dict = Depends(get_current_user)):
    update_data = prepare_for_mongo(event_data.dict())
    
    result = await db.events.update_one(
        {"id": event_id, "user_id": current_user["id"]},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Evento no encontrado")
    
    updated_event = await db.events.find_one({"id": event_id, "user_id": current_user["id"]})
    return parse_from_mongo(updated_event)

@api_router.delete("/events/{event_id}")
async def delete_event(event_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.events.delete_one({"id": event_id, "user_id": current_user["id"]})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Evento no encontrado")
    
    return {"message": "Evento eliminado exitosamente"}

# Alarms Routes
@api_router.post("/alarms", response_model=Alarm)
async def create_alarm(alarm_data: AlarmCreate, current_user: dict = Depends(get_current_user)):
    alarm = Alarm(
        user_id=current_user["id"],
        **alarm_data.dict()
    )
    alarm_dict = prepare_for_mongo(alarm.dict())
    await db.alarms.insert_one(alarm_dict)
    return parse_from_mongo(alarm_dict)

@api_router.get("/alarms", response_model=List[Alarm])
async def get_alarms(current_user: dict = Depends(get_current_user)):
    alarms = await db.alarms.find({"user_id": current_user["id"]}).sort("alarm_time", 1).to_list(1000)
    return [parse_from_mongo(alarm) for alarm in alarms]

@api_router.put("/alarms/{alarm_id}/snooze")
async def snooze_alarm(alarm_id: str, minutes: int = 10, current_user: dict = Depends(get_current_user)):
    alarm = await db.alarms.find_one({"id": alarm_id, "user_id": current_user["id"]})
    if not alarm:
        raise HTTPException(status_code=404, detail="Alarma no encontrada")
    
    if alarm["snooze_count"] >= alarm["max_snooze"]:
        raise HTTPException(status_code=400, detail="Máximo de snooze alcanzado")
    
    # Calculate new alarm time
    current_time = datetime.fromisoformat(alarm["alarm_time"])
    new_time = current_time + timedelta(minutes=minutes)
    
    await db.alarms.update_one(
        {"id": alarm_id, "user_id": current_user["id"]},
        {
            "$set": {
                "alarm_time": new_time.isoformat(),
                "snooze_count": alarm["snooze_count"] + 1
            }
        }
    )
    
    return {"message": f"Alarma pospuesta {minutes} minutos"}

# Projects/Document Management
@api_router.post("/projects/upload")
async def upload_project(
    file: UploadFile = File(...),
    name: str = Form(...),
    description: str = Form(""),
    current_user: dict = Depends(get_current_user)
):
    if not file.filename.endswith(('.zip', '.pdf', '.docx', '.txt')):
        raise HTTPException(status_code=400, detail="Tipo de archivo no soportado")
    
    # Save uploaded file
    file_path = f"/tmp/{uuid.uuid4()}_{file.filename}"
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Extract and analyze content
    extracted_info = {}
    file_content = ""
    
    try:
        if file.filename.endswith('.zip'):
            with zipfile.ZipFile(file_path, 'r') as zip_ref:
                file_list = zip_ref.namelist()
                extracted_info["files"] = file_list[:50]
                
                # Look for key files
                for filename in file_list:
                    if filename.lower().endswith(('readme.md', 'readme.txt', 'package.json')):
                        try:
                            content = zip_ref.read(filename).decode('utf-8')[:2000]
                            extracted_info[filename] = content
                            file_content += content + "\n"
                        except:
                            pass
        elif file.filename.endswith('.txt'):
            with open(file_path, 'r', encoding='utf-8') as f:
                file_content = f.read()
        # For PDF and DOCX, we'd need additional libraries
        
        # AI Analysis
        if file_content:
            analysis = await analyze_document(file_content, file.filename.split('.')[-1])
            extracted_info["ai_analysis"] = analysis
        
    except Exception as e:
        extracted_info["error"] = str(e)
    
    # Create project record
    project = Project(
        user_id=current_user["id"],
        name=name,
        description=description,
        file_path=file_path,
        file_size=os.path.getsize(file_path),
        extracted_info=extracted_info,
        analysis_status="completed" if file_content else "failed"
    )
    
    project_dict = prepare_for_mongo(project.dict())
    await db.projects.insert_one(project_dict)
    
    return parse_from_mongo(project_dict)

@api_router.get("/projects", response_model=List[Project])
async def get_projects(current_user: dict = Depends(get_current_user)):
    projects = await db.projects.find({"user_id": current_user["id"]}).sort("created_date", -1).to_list(1000)
    return [parse_from_mongo(project) for project in projects]

# AI Chat Routes
@api_router.post("/ai/chat", response_model=ChatResponse)
async def chat_with_ai(message: ChatMessage, current_user: dict = Depends(get_current_user)):
    """Enhanced AI chat with personalized context and automatic actions"""
    
    # Get user's assistant configuration
    user_full = await db.users.find_one({"id": current_user["id"]})
    
    # Get recent context if available
    context_messages = []
    if message.context:
        context_messages.append({"role": "user", "content": message.context})
    context_messages.append({"role": "user", "content": message.text})
    
    # Get AI response with enhanced context
    ai_result = await get_ai_chat(context_messages, current_user["id"], user_full)
    
    # Auto-create tasks if detected
    created_tasks = []
    if ai_result.get("actions"):
        for action in ai_result["actions"]:
            if action["type"] == "auto_tasks_detected":
                for task_data in action["tasks"]:
                    if "title" in task_data:
                        task = Task(
                            user_id=current_user["id"],
                            title=task_data["title"],
                            description=task_data.get("description", f"Auto-creada desde conversación: {message.text[:100]}..."),
                            category="ai-auto",
                            priority="medium"
                        )
                        task_dict = prepare_for_mongo(task.dict())
                        await db.tasks.insert_one(task_dict)
                        created_tasks.append(parse_from_mongo(task_dict))
    
    # Enhanced suggestions based on user patterns and context
    personalized_suggestions = ai_result.get("suggestions", [])
    if not personalized_suggestions:
        personalized_suggestions = [
            "¿Qué tienes pendiente para hoy?",
            "¿Te ayudo a organizar tu agenda?",
            "¿Quieres que analice algún documento?",
            "¿Necesitas que extraiga tareas de algo?",
            "¿Te creo recordatorios para algo importante?"
        ]
    
    # Generate contextual actions
    contextual_actions = []
    message_lower = message.text.lower()
    
    if any(word in message_lower for word in ['tarea', 'hacer', 'pendiente', 'debo']):
        contextual_actions.append({"type": "create_task", "text": "Crear tarea ahora"})
    if any(word in message_lower for word in ['recordar', 'alarma', 'avisar']):
        contextual_actions.append({"type": "create_alarm", "text": "Crear recordatorio"})
    if any(word in message_lower for word in ['evento', 'cita', 'reunión', 'calendario']):
        contextual_actions.append({"type": "create_event", "text": "Crear evento"})
    if any(word in message_lower for word in ['nota', 'apuntar', 'escribir']):
        contextual_actions.append({"type": "create_note", "text": "Crear nota"})
    if any(word in message_lower for word in ['analizar', 'resumir', 'documento']):
        contextual_actions.append({"type": "analyze_text", "text": "Analizar texto"})
    
    # Add info about created tasks to response if any
    response_text = ai_result["response"]
    if created_tasks:
        response_text += f"\n\n✅ He creado automáticamente {len(created_tasks)} tarea(s) basada(s) en nuestra conversación:\n"
        for i, task in enumerate(created_tasks, 1):
            response_text += f"{i}. {task['title']}\n"
    
    return ChatResponse(
        response=response_text, 
        suggestions=personalized_suggestions, 
        actions=contextual_actions
    )

@api_router.post("/ai/extract-tasks")
async def ai_extract_tasks(
    text: str = Form(...),
    auto_create: bool = Form(False),
    current_user: dict = Depends(get_current_user)
):
    """Extract tasks from text using AI"""
    tasks = await extract_tasks_from_text(text)
    
    created_tasks = []
    if auto_create:
        for task_data in tasks:
            if "title" in task_data:
                task = Task(
                    user_id=current_user["id"],
                    title=task_data["title"],
                    description=task_data.get("description", ""),
                    category="ai-extracted",
                    priority="medium"
                )
                task_dict = prepare_for_mongo(task.dict())
                await db.tasks.insert_one(task_dict)
                created_tasks.append(parse_from_mongo(task_dict))
    
    return {
        "extracted_tasks": tasks,
        "created_tasks": created_tasks,
        "count": len(tasks)
    }

@api_router.post("/ai/analyze-text")
async def ai_analyze_text(text: str = Form(...), current_user: dict = Depends(get_current_user)):
    """Comprehensive text analysis"""
    analysis = await analyze_document(text, "text")
    
    # Extract and auto-create tasks if requested
    if "tasks" in analysis and analysis["tasks"]:
        for task_title in analysis["tasks"][:5]:  # Limit to 5 auto-tasks
            task = Task(
                user_id=current_user["id"],
                title=task_title,
                description="Extraída automáticamente del análisis de texto",
                category="ai-analysis"
            )
            task_dict = prepare_for_mongo(task.dict())
            await db.tasks.insert_one(task_dict)
    
    return analysis

# Automation Rules
@api_router.post("/automation/rules", response_model=AutomationRule)
async def create_automation_rule(rule_data: dict, current_user: dict = Depends(get_current_user)):
    rule = AutomationRule(
        user_id=current_user["id"],
        **rule_data
    )
    rule_dict = prepare_for_mongo(rule.dict())
    await db.automation_rules.insert_one(rule_dict)
    return parse_from_mongo(rule_dict)

@api_router.get("/automation/rules")
async def get_automation_rules(current_user: dict = Depends(get_current_user)):
    rules = await db.automation_rules.find({"user_id": current_user["id"]}).to_list(1000)
    return [parse_from_mongo(rule) for rule in rules]

# Assistant Configuration
@api_router.put("/assistant/config")
async def update_assistant_config(config: dict, current_user: dict = Depends(get_current_user)):
    """Update assistant personality and configuration"""
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {"assistant_config": config}}
    )
    return {"message": "Configuración del asistente actualizada"}

@api_router.get("/assistant/config")
async def get_assistant_config(current_user: dict = Depends(get_current_user)):
    user = await db.users.find_one({"id": current_user["id"]})
    return user.get("assistant_config", {"name": "Asistente", "photo": "", "tone": "amable"})

# Dashboard/Analytics Routes
@api_router.get("/dashboard/stats")
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    today = datetime.now(timezone.utc).date().isoformat()
    
    # Get counts
    notes_count = await db.notes.count_documents({"user_id": current_user["id"]})
    events_count = await db.events.count_documents({"user_id": current_user["id"]})
    tasks_count = await db.tasks.count_documents({"user_id": current_user["id"]})
    completed_tasks = await db.tasks.count_documents({"user_id": current_user["id"], "completed": True})
    projects_count = await db.projects.count_documents({"user_id": current_user["id"]})
    
    # Today's events
    today_events = await db.events.find({
        "user_id": current_user["id"],
        "start_date": {"$regex": today}
    }).to_list(1000)
    
    # Pending tasks
    pending_tasks = await db.tasks.find({
        "user_id": current_user["id"],
        "completed": False
    }).limit(10).to_list(10)
    
    # Recent notes
    recent_notes = await db.notes.find({
        "user_id": current_user["id"]
    }).sort("created_date", -1).limit(5).to_list(5)
    
    return {
        "notes_count": notes_count,
        "events_count": events_count,
        "tasks_count": tasks_count,
        "completed_tasks": completed_tasks,
        "projects_count": projects_count,
        "completion_rate": (completed_tasks / tasks_count * 100) if tasks_count > 0 else 0,
        "today_events": [parse_from_mongo(event) for event in today_events],
        "pending_tasks": [parse_from_mongo(task) for task in pending_tasks],
        "recent_notes": [parse_from_mongo(note) for note in recent_notes]
    }

# Voice Commands (placeholder for future STT integration)
@api_router.post("/voice/command")
async def process_voice_command(command: VoiceCommand, current_user: dict = Depends(get_current_user)):
    """Process voice commands (placeholder for STT integration)"""
    return {
        "message": "Comando de voz procesado",
        "recognized_text": "Función de voz en desarrollo",
        "action": "none"
    }

# Search functionality
@api_router.get("/search")
async def global_search(
    query: str,
    type: Optional[str] = None,  # notes, tasks, events, projects
    current_user: dict = Depends(get_current_user)
):
    """Global search across all user content"""
    results = {"notes": [], "tasks": [], "events": [], "projects": []}
    
    search_regex = {"$regex": query, "$options": "i"}
    
    if not type or type == "notes":
        notes = await db.notes.find({
            "user_id": current_user["id"],
            "$or": [
                {"title": search_regex},
                {"content": search_regex},
                {"tags": search_regex}
            ]
        }).limit(20).to_list(20)
        results["notes"] = [parse_from_mongo(note) for note in notes]
    
    if not type or type == "tasks":
        tasks = await db.tasks.find({
            "user_id": current_user["id"],
            "$or": [
                {"title": search_regex},
                {"description": search_regex}
            ]
        }).limit(20).to_list(20)
        results["tasks"] = [parse_from_mongo(task) for task in tasks]
    
    if not type or type == "events":
        events = await db.events.find({
            "user_id": current_user["id"],
            "$or": [
                {"title": search_regex},
                {"description": search_regex},
                {"location": search_regex}
            ]
        }).limit(20).to_list(20)
        results["events"] = [parse_from_mongo(event) for event in events]
    
    if not type or type == "projects":
        projects = await db.projects.find({
            "user_id": current_user["id"],
            "$or": [
                {"name": search_regex},
                {"description": search_regex}
            ]
        }).limit(20).to_list(20)
        results["projects"] = [parse_from_mongo(project) for project in projects]
    
    return results

# Include router and middleware
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

@api_router.get("/")
async def root():
    return {"message": "¡Asistente-Definitivo API funcionando!", "version": "2.0.0"}

@api_router.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "version": "2.0.0"
    }
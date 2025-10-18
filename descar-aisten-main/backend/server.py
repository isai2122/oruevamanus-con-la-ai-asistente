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
SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'your-secret-key-change-this')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# FastAPI app
app = FastAPI(title="Personal Assistant API", version="1.0.0")
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
            raise HTTPException(status_code=401, detail="Invalid token")
        user = await db.users.find_one({"id": user_id})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

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

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    full_name: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    preferences: Dict[str, Any] = Field(default_factory=dict)

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

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    priority: str = "medium"
    due_date: Optional[datetime] = None
    category: str = "general"

class Project(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    name: str
    description: Optional[str] = ""
    file_path: str
    file_size: int
    version: str = "1.0.0"
    extracted_info: Dict[str, Any] = Field(default_factory=dict)
    created_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ChatMessage(BaseModel):
    text: str

class ChatResponse(BaseModel):
    response: str
    suggestions: List[str] = Field(default_factory=list)

# AI Integration
async def get_ai_summary(text: str) -> str:
    """Generate AI summary of text using Emergent LLM"""
    try:
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not api_key:
            return "AI summary unavailable - no API key configured"
        
        chat = LlmChat(
            api_key=api_key,
            session_id=f"summary_{uuid.uuid4()}",
            system_message="You are a helpful assistant that creates concise summaries. Keep summaries under 100 words."
        ).with_model("openai", "gpt-4o-mini")
        
        user_message = UserMessage(text=f"Please summarize this text concisely: {text}")
        response = await chat.send_message(user_message)
        return response
    except Exception as e:
        logging.error(f"AI Summary error: {e}")
        return "AI summary unavailable"

async def extract_tasks_from_text(text: str) -> List[Dict[str, str]]:
    """Extract actionable tasks from text using AI"""
    try:
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not api_key:
            return []
        
        chat = LlmChat(
            api_key=api_key,
            session_id=f"extract_{uuid.uuid4()}",
            system_message="Extract actionable tasks from text. Return only JSON array with objects containing 'title' and 'description' fields."
        ).with_model("openai", "gpt-4o-mini")
        
        user_message = UserMessage(text=f"Extract actionable tasks from this text: {text}")
        response = await chat.send_message(user_message)
        
        try:
            import json
            tasks = json.loads(response)
            return tasks if isinstance(tasks, list) else []
        except:
            return []
    except Exception as e:
        logging.error(f"Task extraction error: {e}")
        return []

async def ai_chat_response(message: str) -> str:
    """Generate intelligent chat response"""
    try:
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not api_key:
            return "IA no disponible - contacta al administrador"
        
        chat = LlmChat(
            api_key=api_key,
            session_id=f"chat_{uuid.uuid4()}",
            system_message="""Eres un asistente personal inteligente muy capaz. Puedes:
            - Responder cualquier pregunta
            - Ayudar con tareas y organización
            - Analizar información
            - Dar consejos de productividad
            - Procesar texto y extraer información
            
            Responde de forma útil, inteligente y personalizada. Usa español."""
        ).with_model("openai", "gpt-4o-mini")
        
        user_message = UserMessage(text=message)
        response = await chat.send_message(user_message)
        return response
    except Exception as e:
        logging.error(f"AI Chat error: {e}")
        return f"Disculpa, hubo un error: {str(e)}. Pero puedo ayudarte con análisis básico y respuestas locales."

# Authentication Routes
@api_router.post("/auth/register")
async def register(user_data: UserCreate):
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = hash_password(user_data.password)
    user = User(
        email=user_data.email,
        full_name=user_data.full_name
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
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
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
    
    # Generate AI summary for long content
    if len(note_data.content) > 200:
        note_dict["ai_summary"] = await get_ai_summary(note_data.content)
    
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
            {"content": {"$regex": search, "$options": "i"}}
        ]
    
    notes = await db.notes.find(query).sort("created_date", -1).to_list(1000)
    return [parse_from_mongo(note) for note in notes]

@api_router.put("/notes/{note_id}")
async def update_note(note_id: str, note_data: NoteCreate, current_user: dict = Depends(get_current_user)):
    update_data = prepare_for_mongo(note_data.dict())
    update_data["updated_date"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.notes.update_one(
        {"id": note_id, "user_id": current_user["id"]},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Note not found")
    
    updated_note = await db.notes.find_one({"id": note_id, "user_id": current_user["id"]})
    return parse_from_mongo(updated_note)

@api_router.delete("/notes/{note_id}")
async def delete_note(note_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.notes.delete_one({"id": note_id, "user_id": current_user["id"]})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Note not found")
    
    return {"message": "Note deleted successfully"}

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
    current_user: dict = Depends(get_current_user)
):
    query = {"user_id": current_user["id"]}
    
    if completed is not None:
        query["completed"] = completed
    if priority:
        query["priority"] = priority
    
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
        raise HTTPException(status_code=404, detail="Task not found")
    
    return {"message": "Task completed successfully"}

# Projects/ZIP Management Routes
@api_router.post("/projects/upload")
async def upload_project(
    file: UploadFile = File(...),
    name: str = Form(...),
    description: str = Form(""),
    current_user: dict = Depends(get_current_user)
):
    if not file.filename.endswith('.zip'):
        raise HTTPException(status_code=400, detail="Only ZIP files are allowed")
    
    # Save uploaded file
    file_path = f"/tmp/{uuid.uuid4()}_{file.filename}"
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Extract project info
    extracted_info = {}
    try:
        with zipfile.ZipFile(file_path, 'r') as zip_ref:
            file_list = zip_ref.namelist()
            extracted_info["files"] = file_list[:50]
            
            # Look for README or package.json
            for filename in file_list:
                if filename.lower().endswith(('readme.md', 'readme.txt', 'package.json')):
                    try:
                        content = zip_ref.read(filename).decode('utf-8')[:1000]
                        extracted_info[filename] = content
                    except:
                        pass
    except Exception as e:
        extracted_info["error"] = str(e)
    
    # Create project record
    project = Project(
        user_id=current_user["id"],
        name=name,
        description=description,
        file_path=file_path,
        file_size=os.path.getsize(file_path),
        extracted_info=extracted_info
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
    """Chat with AI assistant"""
    response = await ai_chat_response(message.text)
    
    suggestions = [
        "¿Puedes ayudarme a organizar mis tareas?",
        "Extrae tareas de este texto",
        "Resume esta información",
        "¿Cómo puedo ser más productivo?"
    ]
    
    return ChatResponse(response=response, suggestions=suggestions)

@api_router.post("/ai/extract-tasks")
async def ai_extract_tasks(
    text: str = Form(...),
    current_user: dict = Depends(get_current_user)
):
    """Extract tasks from text using AI"""
    tasks = await extract_tasks_from_text(text)
    
    # Auto-create tasks if user wants
    created_tasks = []
    for task_data in tasks:
        if "title" in task_data:
            task = Task(
                user_id=current_user["id"],
                title=task_data["title"],
                description=task_data.get("description", ""),
                category="ai-extracted"
            )
            task_dict = prepare_for_mongo(task.dict())
            await db.tasks.insert_one(task_dict)
            created_tasks.append(parse_from_mongo(task_dict))
    
    return {
        "extracted_tasks": tasks,
        "created_tasks": created_tasks
    }

# Dashboard/Analytics Routes
@api_router.get("/dashboard/stats")
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    today = datetime.now(timezone.utc).date().isoformat()
    
    # Get counts
    notes_count = await db.notes.count_documents({"user_id": current_user["id"]})
    events_count = await db.events.count_documents({"user_id": current_user["id"]})
    tasks_count = await db.tasks.count_documents({"user_id": current_user["id"]})
    completed_tasks = await db.tasks.count_documents({"user_id": current_user["id"], "completed": True})
    
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
    
    return {
        "notes_count": notes_count,
        "events_count": events_count,
        "tasks_count": tasks_count,
        "completed_tasks": completed_tasks,
        "completion_rate": (completed_tasks / tasks_count * 100) if tasks_count > 0 else 0,
        "today_events": [parse_from_mongo(event) for event in today_events],
        "pending_tasks": [parse_from_mongo(task) for task in pending_tasks]
    }

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
    return {"message": "Personal Assistant API is running!", "version": "1.0.0"}
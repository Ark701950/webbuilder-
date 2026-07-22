from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, Cookie, File, UploadFile
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from datetime import datetime, timezone, timedelta
from typing import List, Optional
import uuid
import requests
from emergentintegrations.llm.chat import LlmChat, UserMessage, TextDelta, StreamDone

# Import models and auth
from models import (
    User, UserSession, LoginRequest, RegisterRequest,
    Organization, Role, Client, Lead, Deal,
    Project, Task, Document, File as FileModel,
    Employee, Department, Attendance, Leave,
    Transaction, Invoice, Message, Event, Ticket,
    AIConversation, Workspace, Notification
)
from auth import (
    hash_password, verify_password, create_jwt_token,
    _get_user_from_token, check_permission, require_permission
)

# Dependency to get current user
async def get_current_user(
    request: Request,
    session_token: Optional[str] = Cookie(None)
) -> User:
    """FastAPI dependency to get current authenticated user."""
    token = session_token
    if not token:
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.replace('Bearer ', '')
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return await _get_user_from_token(token, db)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Configuration
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')
APP_NAME = os.environ.get('APP_NAME', 'webbuilder-os')
STORAGE_URL = os.environ.get('STORAGE_URL')

# Object Storage
storage_key = None

def init_storage():
    """Initialize object storage - call once at startup"""
    global storage_key
    if storage_key:
        return storage_key
    try:
        resp = requests.post(
            f"{STORAGE_URL}/init",
            json={"emergent_key": EMERGENT_LLM_KEY},
            timeout=30
        )
        resp.raise_for_status()
        storage_key = resp.json()["storage_key"]
        logger.info("Storage initialized successfully")
        return storage_key
    except Exception as e:
        logger.error(f"Storage init failed: {e}")
        return None

def put_object(path: str, data: bytes, content_type: str) -> dict:
    """Upload file to object storage"""
    key = init_storage()
    if not key:
        raise HTTPException(status_code=500, detail="Storage not initialized")
    
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data,
        timeout=120
    )
    resp.raise_for_status()
    return resp.json()

def get_object(path: str) -> tuple[bytes, str]:
    """Download file from object storage"""
    key = init_storage()
    if not key:
        raise HTTPException(status_code=500, detail="Storage not initialized")
    
    resp = requests.get(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key},
        timeout=60
    )
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")

# Create the main app
app = FastAPI(title="WebBuilder OS API")

# Create API router
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ==================== AUTHENTICATION ROUTES ====================

@api_router.post("/auth/register")
async def register(data: RegisterRequest):
    """Register new user"""
    # Check if user exists
    existing = await db.users.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user = User(
        name=data.name,
        email=data.email,
        password_hash=hash_password(data.password),
        role="user"
    )
    
    user_dict = user.model_dump()
    await db.users.insert_one(user_dict)
    
    # Create session
    session_token = f"session_{uuid.uuid4().hex}"
    session = UserSession(
        user_id=user.user_id,
        session_token=session_token,
        expires_at=(datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
    )
    
    await db.user_sessions.insert_one(session.model_dump())
    
    return {
        "message": "Registration successful",
        "user": {"user_id": user.user_id, "email": user.email, "name": user.name},
        "session_token": session_token
    }

@api_router.post("/auth/login")
async def login(data: LoginRequest):
    """User login"""
    user_doc = await db.users.find_one({"email": data.email}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not user_doc.get('password_hash'):
        raise HTTPException(status_code=401, detail="Please use Google OAuth to login")
    
    if not verify_password(data.password, user_doc['password_hash']):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Create session
    session_token = f"session_{uuid.uuid4().hex}"
    session = UserSession(
        user_id=user_doc['user_id'],
        session_token=session_token,
        expires_at=(datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
    )
    
    await db.user_sessions.insert_one(session.model_dump())
    
    # Update last login
    await db.users.update_one(
        {"user_id": user_doc['user_id']},
        {"$set": {"last_login": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {
        "message": "Login successful",
        "user": {"user_id": user_doc['user_id'], "email": user_doc['email'], "name": user_doc['name'], "role": user_doc.get('role', 'user')},
        "session_token": session_token
    }

@api_router.post("/auth/session")
async def create_session_from_google(request: Request):
    """Create session from Google OAuth (Emergent Auth)"""
    body = await request.json()
    session_id = body.get('session_id')
    
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")
    
    # Exchange session_id for user data
    try:
        resp = requests.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id},
            timeout=10
        )
        resp.raise_for_status()
        oauth_data = resp.json()
    except Exception as e:
        logger.error(f"OAuth session exchange failed: {e}")
        raise HTTPException(status_code=400, detail="Invalid session_id")
    
    # Check if user exists
    user_doc = await db.users.find_one({"email": oauth_data['email']}, {"_id": 0})
    
    if user_doc:
        user_id = user_doc['user_id']
        # Update user data
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {
                "name": oauth_data.get('name', user_doc.get('name')),
                "picture": oauth_data.get('picture', user_doc.get('picture')),
                "last_login": datetime.now(timezone.utc).isoformat()
            }}
        )
    else:
        # Create new user
        user = User(
            email=oauth_data['email'],
            name=oauth_data.get('name', 'User'),
            picture=oauth_data.get('picture'),
            role="user"
        )
        user_id = user.user_id
        await db.users.insert_one(user.model_dump())
    
    # Create session
    session_token = oauth_data.get('session_token', f"session_{uuid.uuid4().hex}")
    session = UserSession(
        user_id=user_id,
        session_token=session_token,
        expires_at=(datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
    )
    
    await db.user_sessions.insert_one(session.model_dump())
    
    # Get updated user
    updated_user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    
    return {
        "message": "Session created",
        "user": {
            "user_id": updated_user['user_id'],
            "email": updated_user['email'],
            "name": updated_user['name'],
            "picture": updated_user.get('picture'),
            "role": updated_user.get('role', 'user')
        },
        "session_token": session_token
    }

@api_router.get("/auth/me")
async def get_me(user: User = Depends(get_current_user)):
    """Get current user info"""
    return {
        "user_id": user.user_id,
        "email": user.email,
        "name": user.name,
        "picture": user.picture,
        "role": user.role,
        "permissions": user.permissions,
        "organization_id": user.organization_id
    }

@api_router.post("/auth/logout")
async def logout(session_token: Optional[str] = Cookie(None)):
    """Logout user"""
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    return {"message": "Logged out successfully"}

# ==================== USER MANAGEMENT ====================

@api_router.get("/users")
async def list_users(user: User = Depends(get_current_user)):
    """List all users"""
    await require_permission(user, "view_users")
    
    users = await db.users.find(
        {"organization_id": user.organization_id} if user.organization_id else {},
        {"_id": 0, "password_hash": 0, "mfa_secret": 0}
    ).to_list(1000)
    
    return {"users": users}

@api_router.get("/users/{user_id}")
async def get_user(user_id: str, user: User = Depends(get_current_user)):
    """Get user by ID"""
    user_doc = await db.users.find_one(
        {"user_id": user_id},
        {"_id": 0, "password_hash": 0, "mfa_secret": 0}
    )
    
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    
    return user_doc

# ==================== CRM ROUTES ====================

@api_router.post("/clients")
async def create_client(client_data: Client, user: User = Depends(get_current_user)):
    """Create new client"""
    await require_permission(user, "create_client")
    
    client_data.organization_id = user.organization_id or "default"
    client_dict = client_data.model_dump()
    await db.clients.insert_one(client_dict)
    
    return {"message": "Client created", "client": client_data}

@api_router.get("/clients")
async def list_clients(user: User = Depends(get_current_user)):
    """List all clients"""
    clients = await db.clients.find(
        {"organization_id": user.organization_id or "default"},
        {"_id": 0}
    ).to_list(1000)
    
    return {"clients": clients}

@api_router.post("/leads")
async def create_lead(lead_data: Lead, user: User = Depends(get_current_user)):
    """Create new lead"""
    lead_data.organization_id = user.organization_id or "default"
    lead_dict = lead_data.model_dump()
    await db.leads.insert_one(lead_dict)
    
    return {"message": "Lead created", "lead": lead_data}

@api_router.get("/leads")
async def list_leads(user: User = Depends(get_current_user)):
    """List all leads"""
    leads = await db.leads.find(
        {"organization_id": user.organization_id or "default"},
        {"_id": 0}
    ).to_list(1000)
    
    return {"leads": leads}

# ==================== PROJECT MANAGEMENT ====================

@api_router.post("/projects")
async def create_project(project_data: Project, user: User = Depends(get_current_user)):
    """Create new project"""
    project_data.organization_id = user.organization_id or "default"
    project_data.owner_id = user.user_id
    project_dict = project_data.model_dump()
    await db.projects.insert_one(project_dict)
    
    return {"message": "Project created", "project": project_data}

@api_router.get("/projects")
async def list_projects(user: User = Depends(get_current_user)):
    """List all projects"""
    projects = await db.projects.find(
        {"organization_id": user.organization_id or "default"},
        {"_id": 0}
    ).to_list(1000)
    
    return {"projects": projects}

@api_router.post("/tasks")
async def create_task(task_data: Task, user: User = Depends(get_current_user)):
    """Create new task"""
    task_data.organization_id = user.organization_id or "default"
    task_data.reporter_id = user.user_id
    task_dict = task_data.model_dump()
    await db.tasks.insert_one(task_dict)
    
    return {"message": "Task created", "task": task_data}

@api_router.get("/tasks")
async def list_tasks(project_id: Optional[str] = None, user: User = Depends(get_current_user)):
    """List tasks"""
    query = {"organization_id": user.organization_id or "default"}
    if project_id:
        query["project_id"] = project_id
    
    tasks = await db.tasks.find(query, {"_id": 0}).to_list(1000)
    return {"tasks": tasks}

# ==================== DOCUMENT MANAGEMENT ====================

@api_router.post("/documents")
async def create_document(doc_data: Document, user: User = Depends(get_current_user)):
    """Create new document"""
    doc_data.organization_id = user.organization_id or "default"
    doc_data.owner_id = user.user_id
    doc_dict = doc_data.model_dump()
    await db.documents.insert_one(doc_dict)
    
    return {"message": "Document created", "document": doc_data}

@api_router.get("/documents")
async def list_documents(user: User = Depends(get_current_user)):
    """List all documents"""
    documents = await db.documents.find(
        {"organization_id": user.organization_id or "default"},
        {"_id": 0}
    ).to_list(1000)
    
    return {"documents": documents}

@api_router.post("/files/upload")
async def upload_file(file: UploadFile = File(...), user: User = Depends(get_current_user)):
    """Upload file to object storage"""
    ext = file.filename.split(".")[-1] if "." in file.filename else "bin"
    path = f"{APP_NAME}/uploads/{user.user_id}/{uuid.uuid4()}.{ext}"
    
    data = await file.read()
    result = put_object(path, data, file.content_type or "application/octet-stream")
    
    # Store reference in DB
    file_doc = FileModel(
        name=file.filename,
        original_filename=file.filename,
        storage_path=result["path"],
        file_type=file.content_type or "application/octet-stream",
        size=result["size"],
        owner_id=user.user_id,
        organization_id=user.organization_id or "default"
    )
    
    await db.files.insert_one(file_doc.model_dump())
    
    return {"message": "File uploaded", "file": file_doc}

@api_router.get("/files/{file_id}")
async def download_file(file_id: str, user: User = Depends(get_current_user)):
    """Download file"""
    file_doc = await db.files.find_one({"file_id": file_id, "is_deleted": False}, {"_id": 0})
    if not file_doc:
        raise HTTPException(status_code=404, detail="File not found")
    
    data, content_type = get_object(file_doc["storage_path"])
    return Response(content=data, media_type=content_type)

# ==================== AI ASSISTANT ====================

@api_router.post("/ai/chat")
async def ai_chat_stream(request: Request, user: User = Depends(get_current_user)):
    """AI chat with streaming"""
    body = await request.json()
    message = body.get('message', '')
    model = body.get('model', 'gpt-5.2')
    conversation_id = body.get('conversation_id')
    
    # Get or create conversation
    if conversation_id:
        conv_doc = await db.ai_conversations.find_one({"conversation_id": conversation_id}, {"_id": 0})
        if not conv_doc:
            raise HTTPException(status_code=404, detail="Conversation not found")
        messages = conv_doc.get('messages', [])
    else:
        conversation_id = f"conv_{uuid.uuid4().hex[:12]}"
        messages = []
    
    # Add user message
    messages.append({"role": "user", "content": message})
    
    # Determine provider and model
    if model.startswith('gpt'):
        provider = 'openai'
    elif model.startswith('claude'):
        provider = 'anthropic'
    elif model.startswith('gemini'):
        provider = 'gemini'
    else:
        provider = 'openai'
        model = 'gpt-5.2'
    
    # Create chat instance
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=conversation_id,
        system_message="You are a helpful AI assistant for WebBuilder OS, an enterprise business operating system. Help users with their business tasks, data analysis, and decision-making."
    ).with_model(provider, model)
    
    async def generate():
        full_response = ""
        try:
            async for event in chat.stream_message(UserMessage(text=message)):
                if isinstance(event, TextDelta):
                    full_response += event.content
                    yield f"data: {event.content}\n\n"
                elif isinstance(event, StreamDone):
                    break
            
            # Save conversation
            messages.append({"role": "assistant", "content": full_response})
            await db.ai_conversations.update_one(
                {"conversation_id": conversation_id},
                {"$set": {
                    "user_id": user.user_id,
                    "messages": messages,
                    "model": model,
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                    "organization_id": user.organization_id or "default"
                }},
                upsert=True
            )
            
            yield "data: [DONE]\n\n"
        except Exception as e:
            logger.error(f"AI chat error: {e}")
            yield f"data: Error: {str(e)}\n\n"
    
    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"}
    )

@api_router.get("/ai/conversations")
async def list_conversations(user: User = Depends(get_current_user)):
    """List AI conversations"""
    conversations = await db.ai_conversations.find(
        {"user_id": user.user_id},
        {"_id": 0}
    ).to_list(100)
    
    return {"conversations": conversations}

# ==================== NOTIFICATIONS ====================

@api_router.get("/notifications")
async def list_notifications(user: User = Depends(get_current_user)):
    """List user notifications"""
    notifications = await db.notifications.find(
        {"user_id": user.user_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return {"notifications": notifications}

# ==================== DASHBOARD STATS ====================

@api_router.get("/dashboard/stats")
async def get_dashboard_stats(user: User = Depends(get_current_user)):
    """Get dashboard statistics"""
    org_filter = {"organization_id": user.organization_id or "default"}
    
    # Count various entities
    total_clients = await db.clients.count_documents(org_filter)
    total_projects = await db.projects.count_documents(org_filter)
    total_tasks = await db.tasks.count_documents(org_filter)
    total_employees = await db.employees.count_documents(org_filter)
    
    # Active counts
    active_projects = await db.projects.count_documents({**org_filter, "status": "active"})
    pending_tasks = await db.tasks.count_documents({**org_filter, "status": {"$in": ["todo", "in_progress"]}})
    
    return {
        "total_clients": total_clients,
        "total_projects": total_projects,
        "active_projects": active_projects,
        "total_tasks": total_tasks,
        "pending_tasks": pending_tasks,
        "total_employees": total_employees
    }

# Include router
app.include_router(api_router)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    """Startup tasks"""
    logger.info("WebBuilder OS API starting...")
    
    # Initialize storage
    init_storage()
    
    # Create default admin user if not exists
    admin_email = os.environ.get('ADMIN_EMAIL', 'admin@webbuilder.com')
    admin_user = await db.users.find_one({"email": admin_email})
    
    if not admin_user:
        logger.info("Creating default admin user...")
        admin = User(
            name="Admin",
            email=admin_email,
            password_hash=hash_password("Admin@123"),
            role="owner",
            permissions=["*"]
        )
        await db.users.insert_one(admin.model_dump())
        logger.info(f"Admin user created: {admin_email} / Admin@123")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

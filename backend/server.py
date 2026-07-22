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

# ==================== HR MODULE ====================

@api_router.post("/employees")
async def create_employee(emp_data: Employee, user: User = Depends(get_current_user)):
    """Create new employee"""
    emp_data.organization_id = user.organization_id or "default"
    await db.employees.insert_one(emp_data.model_dump())
    return {"message": "Employee created", "employee": emp_data}

@api_router.get("/employees")
async def list_employees(user: User = Depends(get_current_user)):
    """List employees"""
    employees = await db.employees.find(
        {"organization_id": user.organization_id or "default"},
        {"_id": 0}
    ).to_list(1000)
    return {"employees": employees}

@api_router.post("/departments")
async def create_department(dept_data: Department, user: User = Depends(get_current_user)):
    """Create department"""
    dept_data.organization_id = user.organization_id or "default"
    await db.departments.insert_one(dept_data.model_dump())
    return {"message": "Department created", "department": dept_data}

@api_router.get("/departments")
async def list_departments(user: User = Depends(get_current_user)):
    """List departments"""
    depts = await db.departments.find(
        {"organization_id": user.organization_id or "default"},
        {"_id": 0}
    ).to_list(1000)
    return {"departments": depts}

@api_router.post("/leaves")
async def create_leave(leave_data: Leave, user: User = Depends(get_current_user)):
    """Create leave request"""
    leave_data.organization_id = user.organization_id or "default"
    await db.leaves.insert_one(leave_data.model_dump())
    return {"message": "Leave request created", "leave": leave_data}

@api_router.get("/leaves")
async def list_leaves(user: User = Depends(get_current_user)):
    """List leave requests"""
    leaves = await db.leaves.find(
        {"organization_id": user.organization_id or "default"},
        {"_id": 0}
    ).to_list(1000)
    return {"leaves": leaves}

# ==================== FINANCE MODULE ====================

@api_router.post("/transactions")
async def create_transaction(txn_data: Transaction, user: User = Depends(get_current_user)):
    """Create transaction"""
    txn_data.organization_id = user.organization_id or "default"
    await db.transactions.insert_one(txn_data.model_dump())
    return {"message": "Transaction created", "transaction": txn_data}

@api_router.get("/transactions")
async def list_transactions(user: User = Depends(get_current_user)):
    """List transactions"""
    txns = await db.transactions.find(
        {"organization_id": user.organization_id or "default"},
        {"_id": 0}
    ).sort("date", -1).to_list(1000)
    return {"transactions": txns}

@api_router.post("/invoices")
async def create_invoice(inv_data: Invoice, user: User = Depends(get_current_user)):
    """Create invoice"""
    inv_data.organization_id = user.organization_id or "default"
    await db.invoices.insert_one(inv_data.model_dump())
    return {"message": "Invoice created", "invoice": inv_data}

@api_router.get("/invoices")
async def list_invoices(user: User = Depends(get_current_user)):
    """List invoices"""
    invoices = await db.invoices.find(
        {"organization_id": user.organization_id or "default"},
        {"_id": 0}
    ).to_list(1000)
    return {"invoices": invoices}

@api_router.get("/finance/summary")
async def finance_summary(user: User = Depends(get_current_user)):
    """Get finance summary"""
    org_filter = {"organization_id": user.organization_id or "default"}
    
    income_txns = await db.transactions.find({**org_filter, "type": "income"}, {"_id": 0}).to_list(10000)
    expense_txns = await db.transactions.find({**org_filter, "type": "expense"}, {"_id": 0}).to_list(10000)
    
    total_income = sum(t.get('amount', 0) for t in income_txns)
    total_expense = sum(t.get('amount', 0) for t in expense_txns)
    
    invoices = await db.invoices.find(org_filter, {"_id": 0}).to_list(10000)
    pending_invoices = [i for i in invoices if i.get('payment_status') == 'pending']
    total_pending = sum(i.get('total_amount', 0) for i in pending_invoices)
    
    return {
        "total_income": total_income,
        "total_expense": total_expense,
        "net_profit": total_income - total_expense,
        "pending_invoices_count": len(pending_invoices),
        "pending_invoices_amount": total_pending,
        "total_invoices": len(invoices)
    }

# ==================== CALENDAR MODULE ====================

@api_router.post("/events")
async def create_event(event_data: Event, user: User = Depends(get_current_user)):
    """Create event"""
    event_data.organization_id = user.organization_id or "default"
    event_data.organizer_id = user.user_id
    await db.events.insert_one(event_data.model_dump())
    return {"message": "Event created", "event": event_data}

@api_router.get("/events")
async def list_events(user: User = Depends(get_current_user)):
    """List events"""
    events = await db.events.find(
        {"organization_id": user.organization_id or "default"},
        {"_id": 0}
    ).sort("start_time", 1).to_list(1000)
    return {"events": events}

# ==================== ADMIN MODULE ====================

@api_router.get("/admin/stats")
async def admin_stats(user: User = Depends(get_current_user)):
    """Admin panel statistics"""
    if user.role not in ['owner', 'admin']:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    total_users = await db.users.count_documents({})
    active_users = await db.users.count_documents({"status": "active"})
    total_orgs = await db.organizations.count_documents({})
    total_files = await db.files.count_documents({"is_deleted": False})
    
    return {
        "total_users": total_users,
        "active_users": active_users,
        "total_organizations": total_orgs,
        "total_files": total_files
    }

@api_router.put("/admin/users/{user_id}")
async def admin_update_user(user_id: str, request: Request, user: User = Depends(get_current_user)):
    """Admin: update user (role, status, etc.)"""
    if user.role not in ['owner', 'admin']:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    body = await request.json()
    allowed_fields = ['name', 'role', 'status', 'department', 'job_title', 'permissions']
    updates = {k: v for k, v in body.items() if k in allowed_fields}
    updates['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    result = await db.users.update_one({"user_id": user_id}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": "User updated", "user_id": user_id}

@api_router.delete("/admin/users/{user_id}")
async def admin_delete_user(user_id: str, user: User = Depends(get_current_user)):
    """Admin: soft delete (suspend) user"""
    if user.role not in ['owner', 'admin']:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    if user_id == user.user_id:
        raise HTTPException(status_code=400, detail="Cannot suspend yourself")
    
    result = await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"status": "suspended", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Delete active sessions
    await db.user_sessions.delete_many({"user_id": user_id})
    
    return {"message": "User suspended"}

# ==================== AI NON-STREAMING (Simple) ====================

@api_router.post("/ai/message")
async def ai_message(request: Request, user: User = Depends(get_current_user)):
    """AI chat non-streaming (simpler for UI). Returns full response as JSON."""
    body = await request.json()
    message = body.get('message', '')
    model = body.get('model', 'gpt-5.2')
    conversation_id = body.get('conversation_id')
    
    # Get or create conversation
    if conversation_id:
        conv_doc = await db.ai_conversations.find_one({"conversation_id": conversation_id}, {"_id": 0})
        messages = conv_doc.get('messages', []) if conv_doc else []
    else:
        conversation_id = f"conv_{uuid.uuid4().hex[:12]}"
        messages = []
    
    messages.append({"role": "user", "content": message})
    
    # Determine provider
    if model.startswith('gpt') or model.startswith('o1') or model.startswith('o3') or model.startswith('o4'):
        provider = 'openai'
    elif model.startswith('claude'):
        provider = 'anthropic'
    elif model.startswith('gemini'):
        provider = 'gemini'
    else:
        provider = 'openai'
    
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=conversation_id,
        system_message="You are a helpful AI assistant for WebBuilder OS, an enterprise business operating system. Help users with business tasks, data analysis, and decision-making. Be concise and professional."
    ).with_model(provider, model)
    
    try:
        full_response = ""
        async for event in chat.stream_message(UserMessage(text=message)):
            if isinstance(event, TextDelta):
                full_response += event.content
            elif isinstance(event, StreamDone):
                break
        
        messages.append({"role": "assistant", "content": full_response})
        
        # Save conversation
        title = messages[0]['content'][:50] if len(messages) > 0 else 'New Conversation'
        await db.ai_conversations.update_one(
            {"conversation_id": conversation_id},
            {"$set": {
                "conversation_id": conversation_id,
                "user_id": user.user_id,
                "title": title,
                "messages": messages,
                "model": model,
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "organization_id": user.organization_id or "default"
            }},
            upsert=True
        )
        
        return {
            "conversation_id": conversation_id,
            "response": full_response,
            "model": model
        }
    except Exception as e:
        logger.error(f"AI message error: {e}")
        raise HTTPException(status_code=500, detail=f"AI error: {str(e)}")

@api_router.get("/ai/conversations/{conversation_id}")
async def get_conversation(conversation_id: str, user: User = Depends(get_current_user)):
    """Get conversation history"""
    conv = await db.ai_conversations.find_one(
        {"conversation_id": conversation_id, "user_id": user.user_id},
        {"_id": 0}
    )
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conv

@api_router.delete("/ai/conversations/{conversation_id}")
async def delete_conversation(conversation_id: str, user: User = Depends(get_current_user)):
    """Delete conversation"""
    await db.ai_conversations.delete_one({"conversation_id": conversation_id, "user_id": user.user_id})
    return {"message": "Conversation deleted"}

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

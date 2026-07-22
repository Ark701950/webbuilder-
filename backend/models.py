from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime
import uuid

# Base Models
class BaseDocument(BaseModel):
    model_config = ConfigDict(extra="ignore")
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now().isoformat())

# User & Authentication Models
class User(BaseDocument):
    user_id: str = Field(default_factory=lambda: f"user_{uuid.uuid4().hex[:12]}")
    email: str
    name: str
    username: Optional[str] = None
    phone: Optional[str] = None
    picture: Optional[str] = None
    password_hash: Optional[str] = None
    job_title: Optional[str] = None
    department: Optional[str] = None
    bio: Optional[str] = None
    time_zone: str = "UTC"
    language: str = "en"
    status: str = "active"  # active, inactive, suspended
    role: str = "user"  # owner, admin, manager, team_lead, employee, client, guest
    permissions: List[str] = Field(default_factory=list)
    organization_id: Optional[str] = None
    last_login: Optional[str] = None
    mfa_enabled: bool = False
    mfa_secret: Optional[str] = None

class UserSession(BaseModel):
    session_id: str = Field(default_factory=lambda: f"session_{uuid.uuid4().hex[:16]}")
    user_id: str
    session_token: str
    expires_at: str
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())

class LoginRequest(BaseModel):
    email: str
    password: str

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str

class PasswordResetRequest(BaseModel):
    email: str

# Organization Models
class Organization(BaseDocument):
    org_id: str = Field(default_factory=lambda: f"org_{uuid.uuid4().hex[:12]}")
    name: str
    logo: Optional[str] = None
    domain: Optional[str] = None
    address: Optional[str] = None
    industry: Optional[str] = None
    owner_id: Optional[str] = None
    members: List[str] = Field(default_factory=list)
    departments: List[str] = Field(default_factory=list)
    status: str = "active"

# Role & Permission Models
class Role(BaseDocument):
    role_id: str = Field(default_factory=lambda: f"role_{uuid.uuid4().hex[:12]}")
    name: str
    description: Optional[str] = None
    permissions: List[str] = Field(default_factory=list)
    organization_id: Optional[str] = None
    is_system: bool = False

# CRM Models
class Client(BaseDocument):
    client_id: str = Field(default_factory=lambda: f"client_{uuid.uuid4().hex[:12]}")
    company_name: str
    contact_person: str
    email: str
    phone: Optional[str] = None
    website: Optional[str] = None
    industry: Optional[str] = None
    address: Optional[str] = None
    country: Optional[str] = None
    status: str = "active"  # active, inactive, archived
    assigned_manager_id: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    notes: Optional[str] = None
    organization_id: Optional[str] = None

class Lead(BaseDocument):
    lead_id: str = Field(default_factory=lambda: f"lead_{uuid.uuid4().hex[:12]}")
    source: str
    contact_name: str
    contact_email: str
    contact_phone: Optional[str] = None
    company: Optional[str] = None
    interest: Optional[str] = None
    budget: Optional[float] = None
    priority: str = "medium"  # low, medium, high
    stage: str = "new"  # new, contacted, qualified, proposal, negotiation, won, lost
    assigned_user_id: Optional[str] = None
    notes: Optional[str] = None
    follow_up_date: Optional[str] = None
    organization_id: Optional[str] = None

class Deal(BaseDocument):
    deal_id: str = Field(default_factory=lambda: f"deal_{uuid.uuid4().hex[:12]}")
    name: str
    client_id: str
    value: float
    probability: int = 50
    expected_close_date: Optional[str] = None
    stage: str = "proposal"  # proposal, negotiation, closing, won, lost
    owner_id: Optional[str] = None
    notes: Optional[str] = None
    organization_id: Optional[str] = None

# Project Management Models
class Project(BaseDocument):
    project_id: str = Field(default_factory=lambda: f"project_{uuid.uuid4().hex[:12]}")
    name: str
    description: Optional[str] = None
    client_id: Optional[str] = None
    workspace_id: Optional[str] = None
    category: Optional[str] = None
    status: str = "planning"  # planning, active, on_hold, review, completed, cancelled
    priority: str = "medium"  # low, medium, high
    owner_id: Optional[str] = None
    team_members: List[str] = Field(default_factory=list)
    start_date: Optional[str] = None
    deadline: Optional[str] = None
    budget: Optional[float] = None
    progress: int = 0
    tags: List[str] = Field(default_factory=list)
    organization_id: Optional[str] = None

class Task(BaseDocument):
    task_id: str = Field(default_factory=lambda: f"task_{uuid.uuid4().hex[:12]}")
    title: str
    description: Optional[str] = None
    project_id: str
    assignee_id: Optional[str] = None
    reporter_id: Optional[str] = None
    priority: str = "medium"  # low, medium, high
    status: str = "todo"  # todo, in_progress, review, testing, completed, blocked
    labels: List[str] = Field(default_factory=list)
    due_date: Optional[str] = None
    start_date: Optional[str] = None
    estimated_time: Optional[int] = None  # in hours
    actual_time: Optional[int] = None
    organization_id: Optional[str] = None

# Document & File Models
class Document(BaseDocument):
    doc_id: str = Field(default_factory=lambda: f"doc_{uuid.uuid4().hex[:12]}")
    title: str
    description: Optional[str] = None
    content: str = ""
    workspace_id: Optional[str] = None
    project_id: Optional[str] = None
    client_id: Optional[str] = None
    folder_id: Optional[str] = None
    owner_id: Optional[str] = None
    contributors: List[str] = Field(default_factory=list)
    version: int = 1
    status: str = "draft"  # draft, published, archived
    tags: List[str] = Field(default_factory=list)
    organization_id: Optional[str] = None

class File(BaseDocument):
    file_id: str = Field(default_factory=lambda: f"file_{uuid.uuid4().hex[:12]}")
    name: str
    original_filename: str
    storage_path: str
    file_type: str
    size: int
    owner_id: Optional[str] = None
    folder_id: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    is_deleted: bool = False
    organization_id: Optional[str] = None

# HR Models
class Employee(BaseDocument):
    employee_id: str = Field(default_factory=lambda: f"emp_{uuid.uuid4().hex[:12]}")
    user_id: str
    department_id: Optional[str] = None
    position: str
    employment_type: str = "full_time"  # full_time, part_time, contract, intern
    joining_date: str
    manager_id: Optional[str] = None
    skills: List[str] = Field(default_factory=list)
    certifications: List[str] = Field(default_factory=list)
    salary: Optional[float] = None
    status: str = "active"
    organization_id: Optional[str] = None

class Department(BaseDocument):
    dept_id: str = Field(default_factory=lambda: f"dept_{uuid.uuid4().hex[:12]}")
    name: str
    description: Optional[str] = None
    head_id: Optional[str] = None
    members: List[str] = Field(default_factory=list)
    budget: Optional[float] = None
    organization_id: Optional[str] = None

class Attendance(BaseDocument):
    attendance_id: str = Field(default_factory=lambda: f"att_{uuid.uuid4().hex[:12]}")
    employee_id: str
    date: str
    check_in: Optional[str] = None
    check_out: Optional[str] = None
    status: str = "present"  # present, absent, half_day, leave
    notes: Optional[str] = None
    organization_id: Optional[str] = None

class Leave(BaseDocument):
    leave_id: str = Field(default_factory=lambda: f"leave_{uuid.uuid4().hex[:12]}")
    employee_id: str
    leave_type: str  # casual, sick, paid, unpaid, wfh
    start_date: str
    end_date: str
    reason: Optional[str] = None
    status: str = "pending"  # pending, approved, rejected
    approver_id: Optional[str] = None
    organization_id: Optional[str] = None

# Finance Models
class Transaction(BaseDocument):
    transaction_id: str = Field(default_factory=lambda: f"txn_{uuid.uuid4().hex[:12]}")
    type: str  # income, expense
    category: str
    amount: float
    currency: str = "USD"
    date: str
    client_id: Optional[str] = None
    project_id: Optional[str] = None
    payment_method: Optional[str] = None
    status: str = "completed"
    reference_number: Optional[str] = None
    notes: Optional[str] = None
    organization_id: Optional[str] = None

class Invoice(BaseDocument):
    invoice_id: str = Field(default_factory=lambda: f"inv_{uuid.uuid4().hex[:12]}")
    invoice_number: str
    client_id: str
    project_id: Optional[str] = None
    issue_date: str
    due_date: str
    items: List[Dict[str, Any]] = Field(default_factory=list)
    subtotal: float
    tax: float = 0.0
    discount: float = 0.0
    total_amount: float
    payment_status: str = "pending"  # pending, paid, overdue, cancelled
    organization_id: Optional[str] = None

# Communication Models
class Message(BaseDocument):
    message_id: str = Field(default_factory=lambda: f"msg_{uuid.uuid4().hex[:12]}")
    sender_id: str
    receiver_id: Optional[str] = None
    channel_id: Optional[str] = None
    content: str
    message_type: str = "text"  # text, image, file, voice
    attachments: List[str] = Field(default_factory=list)
    is_read: bool = False
    organization_id: Optional[str] = None

# Calendar Models
class Event(BaseDocument):
    event_id: str = Field(default_factory=lambda: f"event_{uuid.uuid4().hex[:12]}")
    title: str
    description: Optional[str] = None
    event_type: str = "meeting"  # meeting, deadline, reminder
    organizer_id: Optional[str] = None
    participants: List[str] = Field(default_factory=list)
    workspace_id: Optional[str] = None
    project_id: Optional[str] = None
    client_id: Optional[str] = None
    location: Optional[str] = None
    meeting_link: Optional[str] = None
    start_time: str
    end_time: str
    status: str = "scheduled"  # scheduled, ongoing, completed, cancelled
    organization_id: Optional[str] = None

# Support Models
class Ticket(BaseDocument):
    ticket_id: str = Field(default_factory=lambda: f"ticket_{uuid.uuid4().hex[:12]}")
    title: str
    description: str
    client_id: str
    category: Optional[str] = None
    priority: str = "medium"  # low, medium, high, critical
    status: str = "open"  # open, pending, in_progress, resolved, closed
    assigned_agent_id: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    organization_id: Optional[str] = None

# AI Chat Models
class AIConversation(BaseDocument):
    conversation_id: str = Field(default_factory=lambda: f"conv_{uuid.uuid4().hex[:12]}")
    user_id: str
    title: str = "New Conversation"
    model: str = "gpt-5.2"
    messages: List[Dict[str, str]] = Field(default_factory=list)
    organization_id: Optional[str] = None

# Workspace Models
class Workspace(BaseDocument):
    workspace_id: str = Field(default_factory=lambda: f"ws_{uuid.uuid4().hex[:12]}")
    name: str
    description: Optional[str] = None
    logo: Optional[str] = None
    members: List[str] = Field(default_factory=list)
    organization_id: Optional[str] = None

# Notification Models
class Notification(BaseDocument):
    notification_id: str = Field(default_factory=lambda: f"notif_{uuid.uuid4().hex[:12]}")
    user_id: str
    title: str
    message: str
    type: str = "info"  # info, success, warning, error
    is_read: bool = False
    link: Optional[str] = None
    organization_id: Optional[str] = None
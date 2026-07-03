from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Form, Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.gzip import GZipMiddleware
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import logging
import asyncio
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
import secrets
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
import base64
import resend
from supabase_store import SupabaseDocumentDB

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Supabase Postgres connection.
# Use the pooled Postgres connection string from Supabase Project Settings > Database.
database_url = (
    os.environ.get('SUPABASE_DB_URL')
    or os.environ.get('POSTGRES_URL')
    or os.environ.get('POSTGRES_PRISMA_URL')
    or os.environ.get('DATABASE_URL')
)
if not database_url:
    raise RuntimeError("SUPABASE_DB_URL, POSTGRES_URL, or DATABASE_URL must be configured before starting the API")

client = SupabaseDocumentDB(database_url)
db = client

# Resend setup
resend.api_key = os.environ.get('RESEND_API_KEY', '')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev')
ADMIN_EMAIL = os.environ.get('ADMIN_EMAIL', '')
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:3000').rstrip('/')

# JWT Settings
JWT_SECRET = os.environ.get('JWT_SECRET')
if not JWT_SECRET:
    raise RuntimeError("JWT_SECRET must be configured before starting the API")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Roles
ROLE_MANAGER = "manager"
ROLE_SUPERVISOR = "supervisor"
ROLE_ADMIN = "admin"
ROLE_MARKETING = "marketing"
ROLE_BRANCH = "branch"

# Task Categories
CATEGORY_GOOGLE_MAPS = "google_maps"
CATEGORY_MARKETING = "marketing"
CATEGORY_GENERAL = "general"

# Request Workflow Status
WORKFLOW_STATUS_PENDING = "pending"
WORKFLOW_STATUS_IN_PROGRESS = "in_progress"
WORKFLOW_STATUS_COMPLETED = "completed"
WORKFLOW_STATUS_CANCELLED = "cancelled"

# Create the main app with optimizations
app = FastAPI(
    title="Aljabr Branch Management API",
    docs_url="/api/docs",
    redoc_url=None
)

# Add GZip compression for responses
app.add_middleware(GZipMiddleware, minimum_size=500)

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer()
optional_security = HTTPBearer(auto_error=False)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Saudi Cities List
SAUDI_CITIES = [
    "Riyadh", "Jeddah", "Makkah", "Madinah", "Dammam",
    "Khobar", "Dhahran", "Al Ahsa", "Qatif", "Jubail",
    "Yanbu", "Taif", "Tabuk", "Buraidah", "Unaizah",
    "Hail", "Najran", "Jazan", "Abha", "Khamis Mushait",
    "Al Baha", "Sakaka", "Arar", "Qassim", "Al Kharj"
]

# ================== MODELS ==================

class UserCreate(BaseModel):
    username: str
    password: str
    email: EmailStr
    name: Optional[str] = ""
    phone: Optional[str] = ""
    role: str = ROLE_SUPERVISOR
    category: str = CATEGORY_GOOGLE_MAPS

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    category: Optional[str] = None

class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None

class UserLogin(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    name: Optional[str] = ""
    phone: Optional[str] = ""
    role: str
    category: str
    email_verified: Optional[bool] = False

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class EmailVerificationRequest(BaseModel):
    token: str

# Branch Request Models
class EditBranchRequest(BaseModel):
    branch_name: str
    city: str
    google_maps_link: str
    new_phone: str
    notes: Optional[str] = ""

class NewBranchRequest(BaseModel):
    branch_name: str
    city: str
    location_link: str
    phone_number: str
    photos: List[str] = []

class BranchRequestResponse(BaseModel):
    id: str
    request_type: str
    category: Optional[str] = CATEGORY_GOOGLE_MAPS
    branch_name: str
    city: str
    location_link: str
    phone_number: str
    notes: Optional[str] = ""
    photos: List[str] = []
    status: str
    assigned_to: Optional[str] = None
    assigned_to_name: Optional[str] = None
    created_at: str
    updated_at: str

class StatusUpdate(BaseModel):
    status: str

class AssignmentUpdate(BaseModel):
    assigned_to: str

class NotificationResponse(BaseModel):
    id: str
    message: str
    request_id: Optional[str] = None
    user_id: Optional[str] = None
    is_read: bool
    created_at: str

# ================== REQUEST MANAGEMENT SYSTEM MODELS ==================

class CustomField(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    field_type: str  # text, number, date, dropdown, file, checkbox, multiselect
    required: bool = False
    options: List[str] = []  # For dropdown/multiselect
    description: Optional[str] = ""

class WorkflowStep(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    step_number: int
    name: str
    description: Optional[str] = ""
    assigned_to: Optional[str] = None  # User ID
    assigned_to_name: Optional[str] = None
    requires_file: bool = True
    allowed_file_types: List[str] = ["pdf", "xlsx", "xls"]

class RequestTypeCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    custom_fields: List[CustomField] = []
    workflow_steps: List[WorkflowStep] = []
    assigned_to: Optional[str] = None  # User ID to assign all requests of this type (used when no workflow steps)
    image_url: Optional[str] = None  # Card image URL
    is_active: bool = True

class RequestTypeUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    custom_fields: Optional[List[CustomField]] = None
    workflow_steps: Optional[List[WorkflowStep]] = None
    assigned_to: Optional[str] = None
    image_url: Optional[str] = None
    is_active: Optional[bool] = None

class RequestTypeResponse(BaseModel):
    id: str
    name: str
    description: str
    custom_fields: List[dict]
    workflow_steps: List[dict]
    is_active: bool
    created_at: str
    updated_at: str

class WorkflowRequestCreate(BaseModel):
    request_type_id: str
    title: str
    description: Optional[str] = ""
    custom_field_values: dict = {}  # Field ID -> Value

class WorkflowRequestResponse(BaseModel):
    id: str
    request_type_id: str
    request_type_name: str
    title: str
    description: str
    custom_field_values: dict
    current_step: int
    total_steps: int
    status: str
    submitted_by: str
    submitted_by_name: str
    step_files: List[dict]
    created_at: str
    updated_at: str

class StepFileUpload(BaseModel):
    step_id: str
    notes: Optional[str] = ""

# ================== AUTH HELPERS ==================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def generate_verification_token() -> str:
    return secrets.token_urlsafe(32)

async def authenticate_credentials(credentials: HTTPAuthorizationCredentials):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    return await authenticate_credentials(credentials)

async def get_manager_user(user = Depends(get_current_user)):
    if user.get("role") != ROLE_MANAGER:
        raise HTTPException(status_code=403, detail="Manager access required")
    return user

# ================== AUTO-ASSIGNMENT HELPER ==================

async def auto_assign_request(category: str):
    """Auto-assign request to a supervisor based on category"""
    supervisor = await db.users.find_one(
        {"role": ROLE_SUPERVISOR, "category": category},
        {"_id": 0}
    )
    if supervisor:
        return supervisor["id"], supervisor["username"]
    return None, None

# ================== EMAIL HELPERS ==================

async def send_verification_email(email: str, token: str, name: str = ""):
    if not resend.api_key:
        logger.info("Email verification disabled - no API key configured")
        return False
    
    verification_link = f"{FRONTEND_URL}/verify-email?token={token}"
    greeting = f"Hello {name}," if name else "Hello,"
    
    try:
        params = {
            "from": SENDER_EMAIL,
            "to": [email],
            "subject": "Verify Your Email - Aljabr Branch Management",
            "html": f"""
            <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #0066CC; margin: 0;">Aljabr Laundry</h1>
                    <p style="color: #6B7280; margin: 5px 0;">Branch Management System</p>
                </div>
                
                <div style="background: #F9FAFB; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
                    <h2 style="color: #111827; margin-top: 0;">Verify Your Email Address</h2>
                    <p style="color: #4B5563;">{greeting}</p>
                    <p style="color: #4B5563;">Please click the button below to verify your email address:</p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{verification_link}" 
                           style="background: #0066CC; color: white; padding: 14px 32px; 
                                  text-decoration: none; border-radius: 8px; font-weight: bold;
                                  display: inline-block;">
                            Verify Email
                        </a>
                    </div>
                    
                    <p style="color: #6B7280; font-size: 14px;">
                        Or copy and paste this link in your browser:<br>
                        <a href="{verification_link}" style="color: #0066CC; word-break: break-all;">
                            {verification_link}
                        </a>
                    </p>
                </div>
                
                <p style="color: #9CA3AF; font-size: 12px; text-align: center;">
                    This link will expire in 24 hours.<br>
                    If you didn't request this, please ignore this email.
                </p>
            </div>
            """
        }
        await asyncio.to_thread(resend.Emails.send, params)
        logger.info(f"Verification email sent to {email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send verification email: {str(e)}")
        return False

async def send_notification_email(request_type: str, branch_name: str, city: str, assigned_to_email: str = None):
    target_email = assigned_to_email or ADMIN_EMAIL
    if not target_email or not resend.api_key:
        logger.info("Email notifications disabled - no API key or email configured")
        return
    
    try:
        type_text = "Edit Branch Request" if request_type == "edit" else "New Branch Request"
        params = {
            "from": SENDER_EMAIL,
            "to": [target_email],
            "subject": f"New Request - {type_text}",
            "html": f"""
            <div style="font-family: Arial, sans-serif; padding: 20px;">
                <h2 style="color: #0066CC;">New Request - Branch Management System</h2>
                <p><strong>Request Type:</strong> {type_text}</p>
                <p><strong>Branch Name:</strong> {branch_name}</p>
                <p><strong>City:</strong> {city}</p>
                <p>Please review the request in the dashboard.</p>
                <hr style="border: 1px solid #E5E7EB;">
                <p style="color: #6B7280; font-size: 12px;">Aljabr Laundry - Branch Management System</p>
            </div>
            """
        }
        await asyncio.to_thread(resend.Emails.send, params)
        logger.info(f"Email notification sent for {request_type} request")
    except Exception as e:
        logger.error(f"Failed to send email: {str(e)}")

# ================== AUTH ROUTES ==================

@api_router.post("/auth/register", response_model=TokenResponse)
async def register_user(
    user_data: UserCreate,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(optional_security)
):
    users_exist = await db.users.estimated_document_count() > 0
    if users_exist:
        if not credentials:
            raise HTTPException(status_code=401, detail="Manager authentication required")
        current_user = await authenticate_credentials(credentials)
        if current_user.get("role") != ROLE_MANAGER:
            raise HTTPException(status_code=403, detail="Manager access required")
    
    existing = await db.users.find_one({"username": user_data.username}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    # Validate role
    if user_data.role not in [ROLE_MANAGER, ROLE_SUPERVISOR]:
        raise HTTPException(status_code=400, detail="Invalid role. Must be 'manager' or 'supervisor'")
    
    # Validate category
    if user_data.category not in [CATEGORY_GOOGLE_MAPS, CATEGORY_MARKETING, CATEGORY_GENERAL]:
        raise HTTPException(status_code=400, detail="Invalid category")
    
    user_id = str(uuid.uuid4())
    verification_token = generate_verification_token()
    
    user_doc = {
        "id": user_id,
        "username": user_data.username,
        "password": hash_password(user_data.password),
        "email": user_data.email,
        "name": user_data.name or "",
        "phone": user_data.phone or "",
        "role": user_data.role,
        "category": user_data.category,
        "email_verified": False,
        "verification_token": verification_token,
        "verification_token_expires": (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    
    # Send verification email
    await send_verification_email(user_data.email, verification_token, user_data.name)
    
    token = create_token(user_id)
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user_id, 
            username=user_data.username, 
            email=user_data.email,
            name=user_data.name or "",
            phone=user_data.phone or "",
            role=user_data.role,
            category=user_data.category,
            email_verified=False
        )
    )

@api_router.post("/auth/login", response_model=TokenResponse)
async def login_user(credentials: UserLogin):
    user = await db.users.find_one({"username": credentials.username}, {"_id": 0})
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(user["id"])
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user["id"], 
            username=user["username"], 
            email=user["email"],
            name=user.get("name", ""),
            phone=user.get("phone", ""),
            role=user.get("role", ROLE_MANAGER),
            category=user.get("category", CATEGORY_GOOGLE_MAPS),
            email_verified=user.get("email_verified", False)
        )
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def get_current_user_info(user = Depends(get_current_user)):
    return UserResponse(
        id=user["id"], 
        username=user["username"], 
        email=user["email"],
        name=user.get("name", ""),
        phone=user.get("phone", ""),
        role=user.get("role", ROLE_MANAGER),
        category=user.get("category", CATEGORY_GOOGLE_MAPS),
        email_verified=user.get("email_verified", False)
    )

# ================== EMAIL VERIFICATION ROUTES ==================

@api_router.post("/auth/verify-email")
async def verify_email(data: EmailVerificationRequest):
    user = await db.users.find_one({"verification_token": data.token}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=400, detail="Invalid verification token")
    
    # Check if token expired
    expires = datetime.fromisoformat(user.get("verification_token_expires", "2000-01-01T00:00:00+00:00"))
    if datetime.now(timezone.utc) > expires:
        raise HTTPException(status_code=400, detail="Verification token expired")
    
    # Mark email as verified
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {
            "email_verified": True,
            "verification_token": None,
            "verification_token_expires": None
        }}
    )
    
    return {"success": True, "message": "Email verified successfully"}

@api_router.post("/auth/resend-verification")
async def resend_verification(user = Depends(get_current_user)):
    if user.get("email_verified"):
        raise HTTPException(status_code=400, detail="Email already verified")
    
    # Generate new token
    verification_token = generate_verification_token()
    
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {
            "verification_token": verification_token,
            "verification_token_expires": (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat()
        }}
    )
    
    # Send new verification email
    sent = await send_verification_email(user["email"], verification_token, user.get("name", ""))
    
    if sent:
        return {"success": True, "message": "Verification email sent"}
    else:
        return {"success": False, "message": "Failed to send email. Please check Resend API key."}

# ================== PROFILE ROUTES ==================

@api_router.get("/profile", response_model=UserResponse)
async def get_profile(user = Depends(get_current_user)):
    return UserResponse(
        id=user["id"], 
        username=user["username"], 
        email=user["email"],
        name=user.get("name", ""),
        phone=user.get("phone", ""),
        role=user.get("role", ROLE_MANAGER),
        category=user.get("category", CATEGORY_GOOGLE_MAPS),
        email_verified=user.get("email_verified", False)
    )

@api_router.patch("/profile", response_model=UserResponse)
async def update_profile(update: ProfileUpdate, user = Depends(get_current_user)):
    update_data = {}
    email_changed = False
    
    if update.name is not None:
        update_data["name"] = update.name
    
    if update.phone is not None:
        update_data["phone"] = update.phone
    
    if update.email is not None and update.email != user["email"]:
        # Check if email is already used
        existing = await db.users.find_one({"email": update.email, "id": {"$ne": user["id"]}}, {"_id": 0})
        if existing:
            raise HTTPException(status_code=400, detail="Email already in use")
        
        update_data["email"] = update.email
        update_data["email_verified"] = False
        email_changed = True
        
        # Generate new verification token
        verification_token = generate_verification_token()
        update_data["verification_token"] = verification_token
        update_data["verification_token_expires"] = (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat()
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided")
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.users.update_one({"id": user["id"]}, {"$set": update_data})
    
    # Send verification email if email changed
    if email_changed:
        await send_verification_email(update.email, update_data["verification_token"], update_data.get("name", user.get("name", "")))
    
    # Get updated user
    updated_user = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    
    return UserResponse(
        id=updated_user["id"], 
        username=updated_user["username"], 
        email=updated_user["email"],
        name=updated_user.get("name", ""),
        phone=updated_user.get("phone", ""),
        role=updated_user.get("role", ROLE_MANAGER),
        category=updated_user.get("category", CATEGORY_GOOGLE_MAPS),
        email_verified=updated_user.get("email_verified", False)
    )

# ================== USER MANAGEMENT ROUTES (Manager Only) ==================

@api_router.get("/users", response_model=List[UserResponse])
async def get_all_users(manager = Depends(get_manager_user)):
    users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(1000)
    return [UserResponse(
        id=u["id"],
        username=u["username"],
        email=u["email"],
        name=u.get("name", ""),
        phone=u.get("phone", ""),
        role=u.get("role", ROLE_MANAGER),
        category=u.get("category", CATEGORY_GOOGLE_MAPS),
        email_verified=u.get("email_verified", False)
    ) for u in users]

@api_router.get("/users/supervisors", response_model=List[UserResponse])
async def get_supervisors(user = Depends(get_current_user)):
    supervisors = await db.users.find({"role": ROLE_SUPERVISOR}, {"_id": 0, "password": 0}).to_list(1000)
    return [UserResponse(
        id=u["id"],
        username=u["username"],
        email=u["email"],
        name=u.get("name", ""),
        phone=u.get("phone", ""),
        role=u.get("role", ROLE_SUPERVISOR),
        category=u.get("category", CATEGORY_GOOGLE_MAPS),
        email_verified=u.get("email_verified", False)
    ) for u in supervisors]

@api_router.patch("/users/{user_id}", response_model=UserResponse)
async def update_user(user_id: str, update: UserUpdate, manager = Depends(get_manager_user)):
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided")
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.users.find_one_and_update(
        {"id": user_id},
        {"$set": update_data},
        return_document=True
    )
    if not result:
        raise HTTPException(status_code=404, detail="User not found")
    
    result.pop("_id", None)
    result.pop("password", None)
    return UserResponse(
        id=result["id"],
        username=result["username"],
        email=result["email"],
        name=result.get("name", ""),
        phone=result.get("phone", ""),
        role=result.get("role", ROLE_MANAGER),
        category=result.get("category", CATEGORY_GOOGLE_MAPS),
        email_verified=result.get("email_verified", False)
    )

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, manager = Depends(get_manager_user)):
    if manager["id"] == user_id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"success": True, "message": "User deleted"}

# ================== CITIES ROUTE ==================

@api_router.get("/cities")
async def get_cities():
    return {"cities": SAUDI_CITIES}

# ================== CATEGORIES ROUTE ==================

@api_router.get("/categories")
async def get_categories():
    return {
        "categories": [
            {"id": CATEGORY_GOOGLE_MAPS, "name": "Google Maps"},
            {"id": CATEGORY_MARKETING, "name": "Marketing"},
            {"id": CATEGORY_GENERAL, "name": "General"}
        ]
    }

# ================== BRANCH REQUEST ROUTES ==================

@api_router.post("/requests/edit", response_model=BranchRequestResponse)
async def create_edit_request(request: EditBranchRequest):
    request_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    # Auto-assign to Google Maps supervisor
    assigned_to, assigned_to_name = await auto_assign_request(CATEGORY_GOOGLE_MAPS)
    
    doc = {
        "id": request_id,
        "request_type": "edit",
        "category": CATEGORY_GOOGLE_MAPS,
        "branch_name": request.branch_name,
        "city": request.city,
        "location_link": request.google_maps_link,
        "phone_number": request.new_phone,
        "notes": request.notes or "",
        "photos": [],
        "status": "new",
        "assigned_to": assigned_to,
        "assigned_to_name": assigned_to_name,
        "created_at": now,
        "updated_at": now
    }
    await db.branch_requests.insert_one(doc)
    
    # Create notification for assigned supervisor
    notification_id = str(uuid.uuid4())
    notification_doc = {
        "id": notification_id,
        "message": f"New edit request: {request.branch_name}",
        "request_id": request_id,
        "user_id": assigned_to,
        "is_read": False,
        "created_at": now
    }
    await db.notifications.insert_one(notification_doc)
    
    # Get supervisor email for notification
    if assigned_to:
        supervisor = await db.users.find_one({"id": assigned_to}, {"_id": 0})
        if supervisor:
            await send_notification_email("edit", request.branch_name, request.city, supervisor.get("email"))
    
    return BranchRequestResponse(**{k: v for k, v in doc.items() if k != "_id"})

@api_router.post("/requests/new", response_model=BranchRequestResponse)
async def create_new_branch_request(request: NewBranchRequest):
    request_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    # Auto-assign to Google Maps supervisor
    assigned_to, assigned_to_name = await auto_assign_request(CATEGORY_GOOGLE_MAPS)
    
    doc = {
        "id": request_id,
        "request_type": "new",
        "category": CATEGORY_GOOGLE_MAPS,
        "branch_name": request.branch_name,
        "city": request.city,
        "location_link": request.location_link,
        "phone_number": request.phone_number,
        "notes": "",
        "photos": request.photos,
        "status": "new",
        "assigned_to": assigned_to,
        "assigned_to_name": assigned_to_name,
        "created_at": now,
        "updated_at": now
    }
    await db.branch_requests.insert_one(doc)
    
    # Create notification for assigned supervisor
    notification_id = str(uuid.uuid4())
    notification_doc = {
        "id": notification_id,
        "message": f"New branch request: {request.branch_name}",
        "request_id": request_id,
        "user_id": assigned_to,
        "is_read": False,
        "created_at": now
    }
    await db.notifications.insert_one(notification_doc)
    
    # Get supervisor email for notification
    if assigned_to:
        supervisor = await db.users.find_one({"id": assigned_to}, {"_id": 0})
        if supervisor:
            await send_notification_email("new", request.branch_name, request.city, supervisor.get("email"))
    
    return BranchRequestResponse(**{k: v for k, v in doc.items() if k != "_id"})

@api_router.get("/requests", response_model=List[BranchRequestResponse])
async def get_all_requests(
    status: Optional[str] = None,
    city: Optional[str] = None,
    search: Optional[str] = None,
    category: Optional[str] = None,
    user = Depends(get_current_user)
):
    query = {}
    
    # Role-based filtering
    if user.get("role") == ROLE_SUPERVISOR:
        # Supervisors only see requests assigned to them
        query["assigned_to"] = user["id"]
    # Managers see all requests
    
    if status:
        query["status"] = status
    if city:
        query["city"] = city
    if category:
        query["category"] = category
    if search:
        query["branch_name"] = {"$regex": search, "$options": "i"}
    
    requests = await db.branch_requests.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return requests

@api_router.get("/requests/{request_id}", response_model=BranchRequestResponse)
async def get_request(request_id: str, user = Depends(get_current_user)):
    request = await db.branch_requests.find_one({"id": request_id}, {"_id": 0})
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    # Check access for supervisors
    if user.get("role") == ROLE_SUPERVISOR and request.get("assigned_to") != user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return request

@api_router.patch("/requests/{request_id}/status", response_model=BranchRequestResponse)
async def update_request_status(request_id: str, status_update: StatusUpdate, user = Depends(get_current_user)):
    if status_update.status not in ["new", "in_progress", "completed"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    # Check access for supervisors
    existing = await db.branch_requests.find_one({"id": request_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Request not found")
    
    if user.get("role") == ROLE_SUPERVISOR and existing.get("assigned_to") != user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    result = await db.branch_requests.find_one_and_update(
        {"id": request_id},
        {"$set": {"status": status_update.status, "updated_at": datetime.now(timezone.utc).isoformat()}},
        return_document=True
    )
    
    result.pop("_id", None)
    return result

# Bulk delete requests (Manager only) - MUST be before {request_id} routes
class BulkDeleteRequest(BaseModel):
    request_ids: List[str]

@api_router.post("/requests/bulk-delete")
async def bulk_delete_requests(data: BulkDeleteRequest, manager = Depends(get_manager_user)):
    if not data.request_ids:
        raise HTTPException(status_code=400, detail="No request IDs provided")
    
    result = await db.branch_requests.delete_many({"id": {"$in": data.request_ids}})
    
    # Also delete related notifications
    await db.notifications.delete_many({"request_id": {"$in": data.request_ids}})
    
    return {"success": True, "deleted_count": result.deleted_count}

# Delete single request (Manager only)
@api_router.delete("/requests/{request_id}")
async def delete_request(request_id: str, manager = Depends(get_manager_user)):
    result = await db.branch_requests.delete_one({"id": request_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Request not found")
    
    # Also delete related notifications
    await db.notifications.delete_many({"request_id": request_id})
    
    return {"success": True, "message": "Request deleted"}

@api_router.patch("/requests/{request_id}/assign", response_model=BranchRequestResponse)
async def assign_request(request_id: str, assignment: AssignmentUpdate, manager = Depends(get_manager_user)):
    # Get assignee info
    assignee = await db.users.find_one({"id": assignment.assigned_to}, {"_id": 0})
    if not assignee:
        raise HTTPException(status_code=404, detail="Assignee not found")
    
    result = await db.branch_requests.find_one_and_update(
        {"id": request_id},
        {"$set": {
            "assigned_to": assignment.assigned_to,
            "assigned_to_name": assignee["username"],
            "updated_at": datetime.now(timezone.utc).isoformat()
        }},
        return_document=True
    )
    if not result:
        raise HTTPException(status_code=404, detail="Request not found")
    
    # Create notification for new assignee
    notification_id = str(uuid.uuid4())
    notification_doc = {
        "id": notification_id,
        "message": f"Request assigned to you: {result['branch_name']}",
        "request_id": request_id,
        "user_id": assignment.assigned_to,
        "is_read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.notifications.insert_one(notification_doc)
    
    result.pop("_id", None)
    return result

# ================== NOTIFICATIONS ROUTES ==================

@api_router.get("/notifications", response_model=List[NotificationResponse])
async def get_notifications(user = Depends(get_current_user)):
    query = {}
    if user.get("role") == ROLE_SUPERVISOR:
        # Supervisors only see their notifications
        query["$or"] = [{"user_id": user["id"]}, {"user_id": None}]
    
    notifications = await db.notifications.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return notifications

@api_router.get("/notifications/unread-count")
async def get_unread_count(user = Depends(get_current_user)):
    query = {"is_read": False}
    if user.get("role") == ROLE_SUPERVISOR:
        query["$or"] = [{"user_id": user["id"]}, {"user_id": None}]
    
    count = await db.notifications.count_documents(query)
    return {"count": count}

@api_router.patch("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, user = Depends(get_current_user)):
    await db.notifications.update_one({"id": notification_id}, {"$set": {"is_read": True}})
    return {"success": True}

@api_router.patch("/notifications/mark-all-read")
async def mark_all_read(user = Depends(get_current_user)):
    query = {}
    if user.get("role") == ROLE_SUPERVISOR:
        query["user_id"] = user["id"]
    await db.notifications.update_many(query, {"$set": {"is_read": True}})
    return {"success": True}

# ================== STATS ROUTE ==================

@api_router.get("/stats")
async def get_stats(user = Depends(get_current_user)):
    query = {}
    if user.get("role") == ROLE_SUPERVISOR:
        query["assigned_to"] = user["id"]
    
    total = await db.branch_requests.count_documents(query)
    
    new_query = {**query, "status": "new"}
    new_count = await db.branch_requests.count_documents(new_query)
    
    progress_query = {**query, "status": "in_progress"}
    in_progress = await db.branch_requests.count_documents(progress_query)
    
    completed_query = {**query, "status": "completed"}
    completed = await db.branch_requests.count_documents(completed_query)
    
    return {
        "total": total,
        "new": new_count,
        "in_progress": in_progress,
        "completed": completed
    }

# ================== ROOT ROUTE ==================

@api_router.get("/")
async def root():
    return {"message": "Aljabr Branch Management API v2.2"}

# ================== IMAGE UPLOAD ROUTES ==================

@api_router.post("/upload-image")
async def upload_image(file: UploadFile = File(...), user = Depends(get_manager_user)):
    """Upload an image and return a URL to serve it"""
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/webp", "image/gif"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Only JPEG, PNG, WebP, and GIF images are allowed")
    
    # Read and encode
    file_content = await file.read()
    file_base64 = base64.b64encode(file_content).decode('utf-8')
    
    image_id = str(uuid.uuid4())
    image_doc = {
        "id": image_id,
        "filename": file.filename,
        "content_type": file.content_type,
        "data": file_base64,
        "uploaded_by": user["id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.uploaded_images.insert_one(image_doc)
    
    return {"id": image_id, "url": f"/api/images/{image_id}"}

@api_router.get("/images/{image_id}")
async def serve_image(image_id: str):
    """Serve an uploaded image"""
    image = await db.uploaded_images.find_one({"id": image_id}, {"_id": 0})
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    
    file_data = base64.b64decode(image["data"])
    return Response(
        content=file_data,
        media_type=image.get("content_type", "image/jpeg"),
        headers={"Cache-Control": "public, max-age=86400"}
    )

# ================== PUBLIC ROUTES (No Auth) ==================

@api_router.get("/public/request-types")
async def get_public_request_types():
    """Get all active request types for public landing page"""
    request_types = await db.request_types.find({"is_active": True}, {"_id": 0}).sort("created_at", 1).to_list(100)
    # Return only needed fields for landing page
    return [{
        "id": rt["id"],
        "name": rt["name"],
        "description": rt.get("description", ""),
        "image_url": rt.get("image_url", ""),
        "has_workflow": len(rt.get("workflow_steps", [])) > 0,
        "workflow_steps_count": len(rt.get("workflow_steps", []))
    } for rt in request_types]

@api_router.get("/public/request-type/{type_id}")
async def get_public_request_type(type_id: str):
    """Get a specific request type details for public form"""
    request_type = await db.request_types.find_one({"id": type_id, "is_active": True}, {"_id": 0})
    if not request_type:
        raise HTTPException(status_code=404, detail="Request type not found")
    return request_type

class DynamicRequestCreate(BaseModel):
    request_type_id: str
    field_values: dict = {}

@api_router.post("/dynamic-requests")
async def create_dynamic_request(data: DynamicRequestCreate):
    """Submit a dynamic request (public). Creates workflow_request if steps exist."""
    # Get request type
    request_type = await db.request_types.find_one({"id": data.request_type_id, "is_active": True}, {"_id": 0})
    if not request_type:
        raise HTTPException(status_code=404, detail="Request type not found")
    
    # Validate required fields
    for field in request_type.get("custom_fields", []):
        if field.get("required") and field["id"] not in data.field_values:
            raise HTTPException(status_code=400, detail=f"Field '{field['name']}' is required")
    
    workflow_steps = request_type.get("workflow_steps", [])
    
    # If request type has workflow steps, create a workflow request
    if workflow_steps:
        # Derive a title from the first field value or request type name
        title = request_type["name"]
        if data.field_values:
            first_value = list(data.field_values.values())[0]
            if isinstance(first_value, str) and first_value.strip():
                title = first_value.strip()
        
        workflow_request = {
            "id": str(uuid.uuid4()),
            "request_type_id": data.request_type_id,
            "request_type_name": request_type["name"],
            "title": title,
            "description": "",
            "custom_field_values": data.field_values,
            "current_step": 1,
            "total_steps": len(workflow_steps),
            "status": WORKFLOW_STATUS_PENDING,
            "submitted_by": "public",
            "submitted_by_name": "Branch Supervisor",
            "step_files": [],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.workflow_requests.insert_one(workflow_request)
        workflow_request.pop("_id", None)
        
        # Notify first step assignee
        first_step = workflow_steps[0]
        if first_step.get("assigned_to"):
            await create_notification(
                user_id=first_step["assigned_to"],
                message=f"New {request_type['name']} request submitted: {title}",
                request_id=workflow_request["id"]
            )
        
        return {"success": True, "request_id": workflow_request["id"], "has_workflow": True}
    
    # No workflow steps - create a simple branch_request (original behavior)
    request_doc = {
        "id": str(uuid.uuid4()),
        "request_type": "dynamic",
        "request_type_id": data.request_type_id,
        "request_type_name": request_type["name"],
        "branch_name": data.field_values.get(list(data.field_values.keys())[0], request_type["name"]) if data.field_values else request_type["name"],
        "city": "N/A",
        "location_link": "",
        "phone_number": "",
        "notes": "",
        "field_values": data.field_values,
        "status": "new",
        "assigned_to": request_type.get("assigned_to"),
        "assigned_to_name": request_type.get("assigned_to_name"),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.branch_requests.insert_one(request_doc)
    
    # Create notification for assigned user
    if request_type.get("assigned_to"):
        notification_doc = {
            "id": str(uuid.uuid4()),
            "message": f"New {request_type['name']} request submitted",
            "request_id": request_doc["id"],
            "user_id": request_type["assigned_to"],
            "is_read": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.notifications.insert_one(notification_doc)
    
    request_doc.pop("_id", None)
    return {"success": True, "request_id": request_doc["id"], "has_workflow": False}

# ================== REQUEST MANAGEMENT SYSTEM ENDPOINTS ==================

# --- Request Types (Admin Only) ---

@api_router.post("/request-types")
async def create_request_type(data: RequestTypeCreate, user = Depends(get_manager_user)):
    """Create a new request type with custom fields and optional workflow steps"""
    # Get assigned user name if provided
    assigned_to_name = None
    if data.assigned_to:
        assigned_user = await db.users.find_one({"id": data.assigned_to}, {"_id": 0})
        if assigned_user:
            assigned_to_name = assigned_user.get("name") or assigned_user.get("username")
    
    # Resolve workflow step assigned_to names
    workflow_steps = []
    for step in data.workflow_steps:
        step_dict = step.model_dump()
        if step.assigned_to:
            step_user = await db.users.find_one({"id": step.assigned_to}, {"_id": 0})
            if step_user:
                step_dict["assigned_to_name"] = step_user.get("name") or step_user.get("username")
        workflow_steps.append(step_dict)
    
    request_type = {
        "id": str(uuid.uuid4()),
        "name": data.name,
        "description": data.description or "",
        "custom_fields": [f.model_dump() for f in data.custom_fields],
        "workflow_steps": workflow_steps,
        "assigned_to": data.assigned_to,
        "assigned_to_name": assigned_to_name,
        "image_url": data.image_url or "",
        "is_active": data.is_active,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.request_types.insert_one(request_type)
    request_type.pop("_id", None)
    return request_type

@api_router.get("/request-types")
async def get_request_types(active_only: bool = False, user = Depends(get_current_user)):
    """Get all request types"""
    query = {"is_active": True} if active_only else {}
    request_types = await db.request_types.find(query, {"_id": 0}).sort("name", 1).to_list(100)
    return request_types

@api_router.get("/request-types/{type_id}")
async def get_request_type(type_id: str, user = Depends(get_current_user)):
    """Get a specific request type"""
    request_type = await db.request_types.find_one({"id": type_id}, {"_id": 0})
    if not request_type:
        raise HTTPException(status_code=404, detail="Request type not found")
    return request_type

@api_router.patch("/request-types/{type_id}")
async def update_request_type(type_id: str, data: RequestTypeUpdate, user = Depends(get_manager_user)):
    """Update a request type"""
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    
    if "custom_fields" in update_data:
        update_data["custom_fields"] = [f if isinstance(f, dict) else f.model_dump() for f in update_data["custom_fields"]]
    
    # Resolve workflow step assigned_to names
    if "workflow_steps" in update_data:
        resolved_steps = []
        for step in update_data["workflow_steps"]:
            step_dict = step if isinstance(step, dict) else step.model_dump()
            if step_dict.get("assigned_to"):
                step_user = await db.users.find_one({"id": step_dict["assigned_to"]}, {"_id": 0})
                if step_user:
                    step_dict["assigned_to_name"] = step_user.get("name") or step_user.get("username")
            resolved_steps.append(step_dict)
        update_data["workflow_steps"] = resolved_steps
    
    # Update assigned_to_name if assigned_to changed
    if "assigned_to" in update_data:
        if update_data["assigned_to"]:
            assigned_user = await db.users.find_one({"id": update_data["assigned_to"]}, {"_id": 0})
            update_data["assigned_to_name"] = assigned_user.get("name") or assigned_user.get("username") if assigned_user else None
        else:
            update_data["assigned_to_name"] = None
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.request_types.find_one_and_update(
        {"id": type_id},
        {"$set": update_data},
        return_document=True
    )
    if not result:
        raise HTTPException(status_code=404, detail="Request type not found")
    
    result.pop("_id", None)
    return result

@api_router.delete("/request-types/{type_id}")
async def delete_request_type(type_id: str, user = Depends(get_manager_user)):
    """Delete a request type"""
    result = await db.request_types.delete_one({"id": type_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Request type not found")
    return {"success": True, "message": "Request type deleted"}

# --- Workflow Requests ---

@api_router.post("/workflow-requests")
async def create_workflow_request(data: WorkflowRequestCreate, user = Depends(get_current_user)):
    """Submit a new workflow request"""
    # Get request type
    request_type = await db.request_types.find_one({"id": data.request_type_id}, {"_id": 0})
    if not request_type:
        raise HTTPException(status_code=404, detail="Request type not found")
    
    if not request_type.get("is_active"):
        raise HTTPException(status_code=400, detail="This request type is not active")
    
    # Validate required custom fields
    for field in request_type.get("custom_fields", []):
        if field.get("required") and field["id"] not in data.custom_field_values:
            raise HTTPException(status_code=400, detail=f"Field '{field['name']}' is required")
    
    workflow_steps = request_type.get("workflow_steps", [])
    
    workflow_request = {
        "id": str(uuid.uuid4()),
        "request_type_id": data.request_type_id,
        "request_type_name": request_type["name"],
        "title": data.title,
        "description": data.description or "",
        "custom_field_values": data.custom_field_values,
        "current_step": 1 if workflow_steps else 0,
        "total_steps": len(workflow_steps),
        "status": WORKFLOW_STATUS_PENDING if workflow_steps else WORKFLOW_STATUS_COMPLETED,
        "submitted_by": user["id"],
        "submitted_by_name": user.get("name") or user["username"],
        "step_files": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.workflow_requests.insert_one(workflow_request)
    workflow_request.pop("_id", None)
    
    # Send notification to first step assignee
    if workflow_steps:
        first_step = workflow_steps[0]
        if first_step.get("assigned_to"):
            await create_notification(
                user_id=first_step["assigned_to"],
                message=f"New request assigned to you: {data.title}",
                request_id=workflow_request["id"]
            )
    
    return workflow_request

@api_router.get("/workflow-requests")
async def get_workflow_requests(
    status: Optional[str] = None,
    assigned_to_me: bool = False,
    my_submissions: bool = False,
    user = Depends(get_current_user)
):
    """Get workflow requests based on filters"""
    query = {}
    
    if status:
        query["status"] = status
    
    if my_submissions:
        query["submitted_by"] = user["id"]
    elif assigned_to_me:
        # Find requests where current step is assigned to this user
        request_types = await db.request_types.find({}, {"_id": 0}).to_list(100)
        
        # Build a mapping of request_type_id -> steps assigned to user
        assigned_request_ids = []
        
        # Get all workflow requests and check if current step is assigned to user
        all_requests = await db.workflow_requests.find(
            {"status": {"$in": [WORKFLOW_STATUS_PENDING, WORKFLOW_STATUS_IN_PROGRESS]}},
            {"_id": 0}
        ).to_list(1000)
        
        for req in all_requests:
            rt = next((rt for rt in request_types if rt["id"] == req["request_type_id"]), None)
            if rt:
                current_step_num = req.get("current_step", 1)
                steps = rt.get("workflow_steps", [])
                current_step = next((s for s in steps if s.get("step_number") == current_step_num), None)
                if current_step and current_step.get("assigned_to") == user["id"]:
                    assigned_request_ids.append(req["id"])
        
        query["id"] = {"$in": assigned_request_ids}
    
    # Managers can see all
    if user.get("role") not in [ROLE_MANAGER, ROLE_ADMIN]:
        if not my_submissions and not assigned_to_me:
            # Regular users can only see their submissions or assigned requests
            query["$or"] = [
                {"submitted_by": user["id"]},
                {"id": {"$in": []}}  # Will be populated with assigned requests
            ]
    
    requests = await db.workflow_requests.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return requests

@api_router.get("/workflow-requests/{request_id}")
async def get_workflow_request(request_id: str, user = Depends(get_current_user)):
    """Get a specific workflow request with full details"""
    request = await db.workflow_requests.find_one({"id": request_id}, {"_id": 0})
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    # Get request type for workflow steps
    request_type = await db.request_types.find_one({"id": request["request_type_id"]}, {"_id": 0})
    if request_type:
        request["workflow_steps"] = request_type.get("workflow_steps", [])
        request["custom_fields"] = request_type.get("custom_fields", [])
    
    return request

@api_router.post("/workflow-requests/{request_id}/upload-step-file")
async def upload_step_file(
    request_id: str,
    step_id: str = Form(...),
    notes: str = Form(""),
    file: UploadFile = File(None),
    user = Depends(get_current_user)
):
    """Upload a file to complete a workflow step (file optional if step doesn't require it)"""
    # Get the request
    request = await db.workflow_requests.find_one({"id": request_id}, {"_id": 0})
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    if request["status"] == WORKFLOW_STATUS_COMPLETED:
        raise HTTPException(status_code=400, detail="Request is already completed")
    
    # Get request type
    request_type = await db.request_types.find_one({"id": request["request_type_id"]}, {"_id": 0})
    if not request_type:
        raise HTTPException(status_code=404, detail="Request type not found")
    
    workflow_steps = request_type.get("workflow_steps", [])
    current_step_num = request.get("current_step", 1)
    
    # Find current step
    current_step = next((s for s in workflow_steps if s.get("step_number") == current_step_num), None)
    if not current_step:
        raise HTTPException(status_code=400, detail="Invalid workflow step")
    
    if current_step["id"] != step_id:
        raise HTTPException(status_code=400, detail="Cannot upload to this step yet")
    
    # Verify user is assigned to this step
    if current_step.get("assigned_to") and current_step["assigned_to"] != user["id"]:
        if user.get("role") not in [ROLE_MANAGER, ROLE_ADMIN]:
            raise HTTPException(status_code=403, detail="You are not assigned to this step")
    
    step_file = None
    requires_file = current_step.get("requires_file", True)
    
    if requires_file:
        if not file:
            raise HTTPException(status_code=400, detail="This step requires a file upload")
        
        # Validate file type
        file_ext = file.filename.split(".")[-1].lower() if "." in file.filename else ""
        allowed_types = current_step.get("allowed_file_types", ["pdf", "xlsx", "xls"])
        if file_ext not in allowed_types:
            raise HTTPException(status_code=400, detail=f"File type not allowed. Allowed: {', '.join(allowed_types)}")
        
        # Read and encode file
        file_content = await file.read()
        file_base64 = base64.b64encode(file_content).decode('utf-8')
        
        step_file = {
            "id": str(uuid.uuid4()),
            "step_id": step_id,
            "step_number": current_step_num,
            "step_name": current_step.get("name", ""),
            "filename": file.filename,
            "file_type": file_ext,
            "file_data": file_base64,
            "notes": notes,
            "uploaded_by": user["id"],
            "uploaded_by_name": user.get("name") or user["username"],
            "uploaded_at": datetime.now(timezone.utc).isoformat()
        }
    elif file:
        # File provided but not required - still accept it
        file_ext = file.filename.split(".")[-1].lower() if "." in file.filename else ""
        file_content = await file.read()
        file_base64 = base64.b64encode(file_content).decode('utf-8')
        
        step_file = {
            "id": str(uuid.uuid4()),
            "step_id": step_id,
            "step_number": current_step_num,
            "step_name": current_step.get("name", ""),
            "filename": file.filename,
            "file_type": file_ext,
            "file_data": file_base64,
            "notes": notes,
            "uploaded_by": user["id"],
            "uploaded_by_name": user.get("name") or user["username"],
            "uploaded_at": datetime.now(timezone.utc).isoformat()
        }
    else:
        # No file, step completed without file
        step_file = {
            "id": str(uuid.uuid4()),
            "step_id": step_id,
            "step_number": current_step_num,
            "step_name": current_step.get("name", ""),
            "filename": "",
            "file_type": "",
            "file_data": "",
            "notes": notes,
            "uploaded_by": user["id"],
            "uploaded_by_name": user.get("name") or user["username"],
            "uploaded_at": datetime.now(timezone.utc).isoformat()
        }
    
    # Update request
    step_files = request.get("step_files", [])
    step_files.append(step_file)
    
    # Move to next step or complete
    next_step_num = current_step_num + 1
    is_completed = next_step_num > len(workflow_steps)
    
    update_data = {
        "step_files": step_files,
        "current_step": next_step_num if not is_completed else current_step_num,
        "status": WORKFLOW_STATUS_COMPLETED if is_completed else WORKFLOW_STATUS_IN_PROGRESS,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    if is_completed:
        update_data["completed_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.workflow_requests.update_one({"id": request_id}, {"$set": update_data})
    
    # Send notifications
    if is_completed:
        # Notify submitter that request is complete
        if request["submitted_by"] != "public":
            await create_notification(
                user_id=request["submitted_by"],
                message=f"Your request '{request['title']}' has been completed!",
                request_id=request_id
            )
    else:
        # Notify next step assignee
        next_step = next((s for s in workflow_steps if s.get("step_number") == next_step_num), None)
        if next_step and next_step.get("assigned_to"):
            await create_notification(
                user_id=next_step["assigned_to"],
                message=f"Request '{request['title']}' is ready for your review (Step {next_step_num})",
                request_id=request_id
            )
    
    return {"success": True, "message": "Step completed successfully", "is_completed": is_completed}

@api_router.get("/workflow-requests/{request_id}/download-file/{file_id}")
async def download_step_file(request_id: str, file_id: str, user = Depends(get_current_user)):
    """Download a step file"""
    request = await db.workflow_requests.find_one({"id": request_id}, {"_id": 0})
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    step_file = next((f for f in request.get("step_files", []) if f["id"] == file_id), None)
    if not step_file:
        raise HTTPException(status_code=404, detail="File not found")
    
    file_data = base64.b64decode(step_file["file_data"])
    
    content_types = {
        "pdf": "application/pdf",
        "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "xls": "application/vnd.ms-excel"
    }
    
    return Response(
        content=file_data,
        media_type=content_types.get(step_file["file_type"], "application/octet-stream"),
        headers={"Content-Disposition": f"attachment; filename={step_file['filename']}"}
    )

@api_router.delete("/workflow-requests/{request_id}")
async def delete_workflow_request(request_id: str, user = Depends(get_manager_user)):
    """Delete a workflow request (Admin only)"""
    result = await db.workflow_requests.delete_one({"id": request_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Request not found")
    return {"success": True, "message": "Request deleted"}

@api_router.patch("/workflow-requests/{request_id}/cancel")
async def cancel_workflow_request(request_id: str, user = Depends(get_current_user)):
    """Cancel a workflow request"""
    request = await db.workflow_requests.find_one({"id": request_id}, {"_id": 0})
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    # Only submitter or admin can cancel
    if request["submitted_by"] != user["id"] and user.get("role") not in [ROLE_MANAGER, ROLE_ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized to cancel this request")
    
    if request["status"] == WORKFLOW_STATUS_COMPLETED:
        raise HTTPException(status_code=400, detail="Cannot cancel a completed request")
    
    await db.workflow_requests.update_one(
        {"id": request_id},
        {"$set": {
            "status": WORKFLOW_STATUS_CANCELLED,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"success": True, "message": "Request cancelled"}

# --- Dashboard Stats for Workflow Requests ---

@api_router.get("/workflow-stats")
async def get_workflow_stats(user = Depends(get_current_user)):
    """Get statistics for workflow requests"""
    base_query = {}
    
    # Non-admin users only see their own stats
    if user.get("role") not in [ROLE_MANAGER, ROLE_ADMIN]:
        base_query["submitted_by"] = user["id"]
    
    total = await db.workflow_requests.count_documents(base_query)
    pending = await db.workflow_requests.count_documents({**base_query, "status": WORKFLOW_STATUS_PENDING})
    in_progress = await db.workflow_requests.count_documents({**base_query, "status": WORKFLOW_STATUS_IN_PROGRESS})
    completed = await db.workflow_requests.count_documents({**base_query, "status": WORKFLOW_STATUS_COMPLETED})
    cancelled = await db.workflow_requests.count_documents({**base_query, "status": WORKFLOW_STATUS_CANCELLED})
    
    # Count requests assigned to user (for marketing team)
    assigned_count = 0
    if user.get("role") in [ROLE_MARKETING, ROLE_SUPERVISOR]:
        request_types = await db.request_types.find({}, {"_id": 0}).to_list(100)
        all_requests = await db.workflow_requests.find(
            {"status": {"$in": [WORKFLOW_STATUS_PENDING, WORKFLOW_STATUS_IN_PROGRESS]}},
            {"_id": 0}
        ).to_list(1000)
        
        for req in all_requests:
            rt = next((rt for rt in request_types if rt["id"] == req["request_type_id"]), None)
            if rt:
                current_step_num = req.get("current_step", 1)
                steps = rt.get("workflow_steps", [])
                current_step = next((s for s in steps if s.get("step_number") == current_step_num), None)
                if current_step and current_step.get("assigned_to") == user["id"]:
                    assigned_count += 1
    
    return {
        "total": total,
        "pending": pending,
        "in_progress": in_progress,
        "completed": completed,
        "cancelled": cancelled,
        "assigned_to_me": assigned_count
    }

# Helper function to create notifications
async def create_notification(user_id: str, message: str, request_id: str = None):
    """Create a notification for a user"""
    notification = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "message": message,
        "request_id": request_id,
        "is_read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.notifications.insert_one(notification)
    return notification

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=[origin.strip() for origin in os.environ.get('CORS_ORIGINS', FRONTEND_URL).split(',') if origin.strip()],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database indexes for better performance
@app.on_event("startup")
async def create_indexes():
    """Connect to Supabase Postgres and prepare database indexes."""
    try:
        await client.connect()
        await client.init_schema()

        # Indexes for branch_requests collection
        await db.branch_requests.create_index("id", unique=True)
        await db.branch_requests.create_index("status")
        await db.branch_requests.create_index("city")
        await db.branch_requests.create_index("assigned_to")
        await db.branch_requests.create_index("created_at")
        await db.branch_requests.create_index([("branch_name", "text")])  # Text search
        
        # Indexes for users collection
        await db.users.create_index("id", unique=True)
        await db.users.create_index("username", unique=True)
        await db.users.create_index("email", unique=True)
        await db.users.create_index("role")
        
        # Indexes for notifications collection
        await db.notifications.create_index("id", unique=True)
        await db.notifications.create_index("user_id")
        await db.notifications.create_index("is_read")
        await db.notifications.create_index("created_at")
        
        # Indexes for request_types collection (Request Management System)
        await db.request_types.create_index("id", unique=True)
        await db.request_types.create_index("is_active")
        await db.request_types.create_index("name")
        
        # Indexes for workflow_requests collection (Request Management System)
        await db.workflow_requests.create_index("id", unique=True)
        await db.workflow_requests.create_index("request_type_id")
        await db.workflow_requests.create_index("status")
        await db.workflow_requests.create_index("submitted_by")
        await db.workflow_requests.create_index("current_step")
        await db.workflow_requests.create_index("created_at")
        
        logger.info("Supabase database schema and indexes are ready")
    except Exception as e:
        logger.error(f"Error preparing Supabase database: {e}")
        raise

@app.on_event("shutdown")
async def shutdown_db_client():
    await client.close()

# PRD - Google Maps Branch Management System
## Aljabr Laundry

### Original Problem Statement
Build a branch management request system for Aljabr Laundry (600+ branches in Saudi Arabia) to submit requests related to Google Maps branch listings. Replace WhatsApp requests with a structured workflow. Extended to include a Dynamic Request Management System with multi-step workflows.

### User Personas
1. **Branch Supervisors (Field)** - Non-technical users who submit requests from the field via mobile devices
2. **Google Maps Supervisor** - Handles all Google Maps related requests
3. **Marketing Team Members** - Handle workflow steps assigned to them
4. **Manager** - Full access to all requests, team management, and request type configuration

### Core Requirements (Static)
- Landing page with two options: Edit Branch / New Branch
- Edit Branch form with validation
- New Branch form with photo upload (minimum 5 photos)
- Role-based authentication (Manager/Supervisor)
- Admin dashboard with task management
- Status tracking (New → In Progress → Completed)
- Search and filter functionality
- Auto-assignment based on category
- Dynamic Request Types with custom fields
- Multi-step workflow support with employee assignments
- Email notifications via Resend

### User Choices
- Interface language: **English only**
- Brand colors: Blue (#0066CC) and Red (#E31837)
- No file size limit for photos
- Email notifications: Resend integration ready (requires API key)

---

## What's Been Implemented

### Date: March 9, 2026

#### Role-Based Access System
- [x] **Manager Role** - Full access to all requests and team management
- [x] **Supervisor Role** - Access only to assigned requests
- [x] Role selection during registration
- [x] Department/Category selection (Google Maps, Marketing, General)
- [x] Auto-assignment: Google Maps requests → Google Maps Supervisor

#### Backend (FastAPI + MongoDB)
- [x] User authentication with roles (JWT-based, sessionStorage)
- [x] Role-based request filtering
- [x] Auto-assignment by category
- [x] Request reassignment (Manager only)
- [x] Team management endpoints (Manager only)
- [x] Branch request CRUD operations
- [x] Notifications with user targeting
- [x] Resend email integration
- [x] DB indexes, connection pooling, GZip compression

#### Frontend (React)
- [x] Landing page with static + dynamic request cards
- [x] Edit Branch form with validation
- [x] New Branch form with photo upload
- [x] Login with role selection for registration
- [x] Manager Dashboard - all requests + Team Management tab
- [x] Supervisor Dashboard - assigned requests only
- [x] Request detail with assignment dropdown (Manager)
- [x] Role badges in header
- [x] Mobile-responsive design
- [x] Lottie loading animation
- [x] Profile management page

### Date: April 7, 2026

#### Dynamic Request Types System
- [x] Request Types management (create, edit, delete, activate/deactivate)
- [x] Custom fields (Text, Number, Date, Dropdown, File, Checkbox, Multi-select)
- [x] Request type cards on landing page (dynamic)
- [x] Dynamic form generation based on custom fields
- [x] Assign request type to specific employee
- [x] Individual and bulk delete for requests (Manager only)

#### Multi-step Workflow System (NEW)
- [x] Workflow Steps builder UI in Request Types admin
- [x] Each step: name, description, assigned employee, file requirement toggle
- [x] Visual step flow display (Step 1 → Step 2 → ...)
- [x] Dynamic requests auto-create workflow_requests when steps exist
- [x] Workflow Requests tab in Admin Dashboard with progress bars
- [x] Workflow stats (Total, Pending, In Progress, Completed, Cancelled)
- [x] WorkflowRequestDetail page with step timeline
- [x] Step completion by assigned employee (with optional file upload)
- [x] Auto-progression through steps
- [x] Notifications for step completion and next assignee

---

## API Endpoints

### Auth & Profile
| Endpoint | Method | Access | Description |
|----------|--------|--------|-------------|
| /api/auth/register | POST | Public | Create account with role |
| /api/auth/login | POST | Public | Login |
| /api/auth/me | GET | Auth | Get current user |
| /api/auth/verify-email | POST | Public | Verify email token |
| /api/auth/resend-verification | POST | Auth | Resend verification email |
| /api/profile | GET/PATCH | Auth | Get/Update profile |

### Users
| Endpoint | Method | Access | Description |
|----------|--------|--------|-------------|
| /api/users | GET | Manager | Get all users |
| /api/users/supervisors | GET | Auth | Get supervisors list |
| /api/users/{id} | PATCH | Manager | Update user |
| /api/users/{id} | DELETE | Manager | Delete user |

### Branch Requests
| Endpoint | Method | Access | Description |
|----------|--------|--------|-------------|
| /api/requests | GET | Auth | Get requests (filtered by role) |
| /api/requests/edit | POST | Public | Submit edit request |
| /api/requests/new | POST | Public | Submit new branch request |
| /api/requests/{id} | GET | Auth | Get request details |
| /api/requests/{id}/status | PATCH | Auth | Update status |
| /api/requests/{id}/assign | PATCH | Manager | Reassign request |
| /api/requests/{id} | DELETE | Manager | Delete request |
| /api/requests/bulk-delete | POST | Manager | Bulk delete |

### Request Types
| Endpoint | Method | Access | Description |
|----------|--------|--------|-------------|
| /api/request-types | GET | Auth | List request types |
| /api/request-types | POST | Manager | Create with workflow steps |
| /api/request-types/{id} | PATCH | Manager | Update request type |
| /api/request-types/{id} | DELETE | Manager | Delete request type |
| /api/public/request-types | GET | Public | Active types for landing page |
| /api/public/request-type/{id} | GET | Public | Type details for form |
| /api/dynamic-requests | POST | Public | Submit dynamic request |

### Workflow Requests
| Endpoint | Method | Access | Description |
|----------|--------|--------|-------------|
| /api/workflow-requests | GET | Auth | List workflow requests |
| /api/workflow-requests | POST | Auth | Submit workflow request |
| /api/workflow-requests/{id} | GET | Auth | Get request with steps |
| /api/workflow-requests/{id}/upload-step-file | POST | Auth | Complete step |
| /api/workflow-requests/{id}/download-file/{fid} | GET | Auth | Download step file |
| /api/workflow-requests/{id}/cancel | PATCH | Auth | Cancel request |
| /api/workflow-requests/{id} | DELETE | Manager | Delete request |
| /api/workflow-stats | GET | Auth | Workflow statistics |

---

## Prioritized Backlog

### P0 (Completed)
- [x] Role-based access (Manager/Supervisor)
- [x] Auto-assignment by category
- [x] Team management
- [x] Request reassignment
- [x] Dynamic Request Types
- [x] Multi-step workflows

### P3 (Future Enhancements)
- [ ] Email notifications for workflow steps
- [ ] Due dates and deadlines for tasks
- [ ] Task priority levels
- [ ] Export to CSV/Excel
- [ ] Task comments/notes
- [ ] Branch opening/closing requests

---

## User Credentials

### Manager
- **Username:** manager1
- **Password:** manager123
- **Access:** Full access

### Google Maps Supervisor
- **Username:** aalkhalf
- **Email:** aalkhalf@Aljabrlaundry.com
- **Password:** super123

---

## Third-Party Integrations
- **Resend**: Email verification and notifications
  - Sender: noreply@tasks.aljabrlaundry.menu
  - Admin: aalkhalf@Aljabrlaundry.com

## Technical Notes
- Images stored as base64 in MongoDB
- JWT tokens expire after 24 hours (sessionStorage)
- MongoDB with connection pooling and indexes
- GZip compression enabled
- React lazy loading for performance
- Lottie animation for loading screen

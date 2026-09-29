# Innov8IT Task Management System

## Overview

A modern SaaS task management platform inspired by ClickUp, Asana, and Linear.

### Tech Stack

- Next.js 15 (App Router)
- TypeScript
- Prisma ORM
- Supabase PostgreSQL
- Supabase Auth
- Tailwind CSS
- ShadCN UI
- React Query
- Zustand
- React Hook Form
- Zod
- DND Kit
- Recharts

---

# Development Roadmap

## Phase 1: Project Setup

### Goal
Initialize the application foundation.

### Tasks

- Create Next.js project
- Configure TypeScript
- Configure TailwindCSS
- Install ShadCN UI
- Configure ESLint & Prettier
- Setup React Query
- Setup Zustand
- Setup Supabase Client
- Setup Prisma

### Deliverables

- Running Next.js application
- Configured development environment
- Organized folder structure

---

## Phase 2: Database Architecture

### Goal
Design the complete database schema.

### Models

#### User

| Field | Type |
|---------|---------|
| id | String |
| name | String |
| email | String |
| avatar | String |
| role | String |

#### Workspace

| Field | Type |
|---------|---------|
| id | String |
| name | String |
| ownerId | String |

#### Project

| Field | Type |
|---------|---------|
| id | String |
| name | String |
| description | String |
| workspaceId | String |
| status | String |

#### Task

| Field | Type |
|---------|---------|
| id | String |
| title | String |
| description | String |
| status | String |
| priority | String |
| dueDate | DateTime |

#### Comment

| Field | Type |
|---------|---------|
| id | String |
| taskId | String |
| userId | String |
| message | String |

#### ActivityLog

| Field | Type |
|---------|---------|
| id | String |
| taskId | String |
| userId | String |
| action | String |

### Deliverables

- Prisma Schema
- Migrations
- Seed Data

---

## Phase 3: Authentication

### Goal

Implement user authentication.

### Features

- Email Login
- Google OAuth
- User Registration
- Protected Routes
- Session Management

### Deliverables

- Auth System
- Middleware Protection

---

## Phase 4: Application Layout

### Goal

Build the main dashboard shell.

### Layout

```text
┌─────────────┬───────────────────────┬──────────────┐
│ Sidebar     │ Main Content          │ Right Panel  │
└─────────────┴───────────────────────┴──────────────┘
```

### Features

- Collapsible Sidebar
- Dark Mode
- User Profile Menu

### Navigation

- Dashboard
- Inbox
- Calendar
- Projects
- Tasks
- Documents
- Team
- Settings

---

## Phase 5: Project Management

### Features

- Create Project
- Edit Project
- Delete Project
- Project Progress Tracking
- Team Assignment

### Deliverables

- Project Module
- Project Detail Page

---

## Phase 6: Kanban Board

### Goal

Build the core task board.

### Columns

- Todo
- In Progress
- Review
- Done

### Features

- Drag & Drop
- Optimistic Updates
- Column Counts
- Smooth Animation
- Real-Time Sync

### Task Card

- Title
- Description
- Priority
- Due Date
- Assignees
- Comment Count
- Attachments

---

## Phase 7: Task Drawer

### Goal

Open detailed task information from the board and allow users to review task context, update metadata, and communicate without leaving the Kanban workflow.

### UX Behavior

- Clicking any task card opens a right-side sliding drawer.
- The drawer overlays the board without changing the route.
- The board remains visible in the background with reduced opacity or blur.
- Clicking outside the drawer or pressing Escape closes it.
- Drawer content updates instantly when the selected task changes.
- Full-screen mode is available on smaller screens as a modal sheet.

### Layout Structure

#### Header

- Task title / editable inline text
- Status dropdown
- Priority dropdown
- Due date
- Project badge or workspace label
- Close button
- Quick action buttons: Edit, Duplicate, Delete, Archive

#### Details Panel

- Description editor with markdown/plain text support
- Assignee avatars and assignment picker
- Labels / tags with color coding
- Due date and reminder settings
- Estimated effort or story points
- Related project information
- Subtasks checklist
- Attachment list (future scope)

#### Activity Feed

- Status changes
- Task creation date
- Assignee updates
- Comment activity
- Deadline adjustments
- Project movement events

#### Comments Section

- Threaded comment list
- User avatars and timestamps
- Input field for new comment
- Mentions support for team members
- Inline reaction or quick actions

### Required Interactions

- Update task title inline
- Change task status from drawer without leaving board
- Reassign team members
- Add / remove labels
- Add comments in real time
- View task activity timeline
- Trigger delete or archive actions with confirmation
- Keep changes optimistic and sync with backend

### Data Model Requirements

The drawer should read and update the following task fields:

- id
- title
- description
- status
- priority
- dueDate
- projectId
- assignees
- tags
- createdAt
- updatedAt
- comments
- activityLogs

### Component Breakdown

#### TaskDrawer.tsx

- Main container with slide-in animation
- Header actions and metadata
- Tabbed sections or stacked panels
- Scrollable content area

#### TaskDetailsSection.tsx

- Description textarea
- Due date input
- Status / priority selectors
- Tags and assignees chips

#### TaskActivityTimeline.tsx

- List of audit events
- Timestamp formatting
- User avatar and action label

#### TaskComments.tsx

- Comment list
- New comment composer
- Submit button and validation

#### TaskQuickActions.tsx

- Duplicate
- Delete
- Archive
- Share
- Move to project

### State Management

Use a local drawer state with a selected task id and open / close controls.

Recommended pattern:

- Zustand store for selectedTaskId and drawer open state
- React Query for fetching full task details and comments
- Local optimistic updates for status and assignee mutations
- Server sync via mutation hooks

### API Interaction Design

- GET /api/tasks/:id → fetch complete task data with comments and activity
- PATCH /api/tasks/:id → update task details
- POST /api/tasks/:id/comments → add a new comment
- POST /api/tasks/:id/activity → log task actions

### Validation Rules

- Title must be between 1 and 120 characters
- Description may be empty but should support formatting
- Status must be one of: Todo, In Progress, Review, Done
- Priority must be one of: Low, Medium, High, Critical
- Due date must be valid ISO date or null
- Comment input must not be empty

### Accessibility Requirements

- Drawer must trap focus while open
- Escape key closes the drawer
- Focus returns to the task card after closing
- Labels and form controls must be keyboard accessible
- Color contrast must meet WCAG AA for status and priority states

### Responsive Behavior

- Desktop: right-side slide-over drawer
- Tablet: full-width sheet with sticky actions
- Mobile: bottom sheet or full-screen modal
- Comments and activity stacks vertically
- Actions remain reachable within thumb-friendly spacing

### Acceptance Criteria

- User can open a task drawer from the board
- Task details load without page refresh
- Status and priority can be updated from the drawer
- Comments can be added and displayed immediately
- Activity updates reflect changes made in the drawer
- Drawer closes correctly and restores focus to the board
- Task updates persist to the database and remain in sync across refreshes

### Deliverables

- Task drawer UI implemented
- Task detail data fetching integrated
- Edit and comment workflows complete
- Activity feed visible in task context
- Mobile-friendly drawer behavior

---

## Phase 7.1: Task Activity History & Comments

### Goal

Track every meaningful change made to a task and let users discuss work directly inside the task context.

### Activity History Requirements

Each task should maintain a readable timeline of changes such as:

- task created
- title updated
- description edited
- status changed
- priority changed
- due date changed
- assignee added or removed
- comment added
- project moved
- task archived or deleted

### Activity Log Model

```text
ActivityLog
- id
- taskId
- userId
- action
- message
- createdAt
- metadata
```

### Activity Log Fields

- action: enum or string value like TASK_CREATED, STATUS_UPDATED
- message: human-readable summary
- metadata: JSON object for values before/after changes
- createdAt: timestamp
- userId: person who triggered the action

### Comment Model

```text
Comment
- id
- taskId
- userId
- content
- createdAt
- updatedAt
```

### Comment Features

- Add comment directly from task drawer
- Display author name and avatar
- Show relative timestamps like "2 hours ago"
- Allow editing or deleting own comments
- Support mention syntax like @name in future iterations
- Keep comment ordering newest first

### Activity Feed UX

- Show a vertical timeline beside or below the task details
- Include icon, action text, author, and timestamp
- Show concise messages like:
  - "Alicia changed status from Todo to In Progress"
  - "Marcus assigned David to this task"
  - "Taylor commented on this task"

### Implementation Notes

- Create an activity record after every task mutation.
- Prevent duplicate entries for identical actions triggered in quick succession.
- Use optimistic UI updates for new comments and status changes.
- Store comment and activity relation under the same task record.
- Query both with a single task detail API response.

### API Design

- GET /api/tasks/:id → returns task, comments, and activity log
- POST /api/tasks/:id/comments → creates a comment
- PATCH /api/tasks/:id → updates task details and writes activity log entries
- GET /api/tasks/:id/activity → fetch activity history only

### Acceptance Criteria

- Every task has a visible activity timeline
- Comments can be created from the task drawer
- Each action is logged with user, timestamp, and summary
- Activity updates appear immediately without page reload
- Users can see comment and activity history for the selected task

---

## Phase 8: Task CRUD

### Features

- Create Task
- Edit Task
- Delete Task
- Archive Task
- Duplicate Task

---

## Phase 9: Realtime Collaboration

### Supabase Realtime

- Live Board Updates
- Live Comments
- Live Assignments
- Presence Indicators

---

## Phase 10: Activity Feed

### Track Events

- Task Created
- Task Updated
- Task Deleted
- Status Changed
- Comments Added
- Assignee Added

### Deliverables

- Activity Center
- Timeline UI

---

## Phase 11: Notifications

### Notification Types

- Task Assigned
- Due Soon
- Mentioned in Comment
- Project Updated

### Features

- Notification Dropdown
- Read / Unread
- Mark All Read

---

## Phase 12: Search & Filters

### Global Search

Search:

- Tasks
- Projects
- Comments

### Filters

- Status
- Priority
- Assignee
- Due Date

---

## Phase 13: Calendar View

### Views

- Month
- Week

### Features

- Task Scheduling
- Deadline Tracking

---

## Phase 14: Analytics

### Dashboard Widgets

- Tasks by Status
- Completion Rate
- Team Productivity
- Overdue Tasks

### Library

- Recharts

---

## Phase 15: Production Optimization

### Performance

- Server Actions
- Lazy Loading
- Pagination
- Suspense
- Image Optimization

### Quality

- Accessibility
- SEO
- Mobile Responsive
- Lighthouse Score 95+

---

# UI Design Reference

The application should visually resemble:

- ClickUp
- Linear
- Asana
- Jira Modern UI

### Key Components

- Left Navigation Sidebar
- Kanban Board Center
- Right Task Detail Drawer
- Activity Timeline
- Modern Card Design
- Rounded Corners
- Soft Shadows
- Professional SaaS Appearance

---

# Folder Structure

```text
src/
│
├── app/
├── components/
├── features/
│   ├── auth/
│   ├── projects/
│   ├── tasks/
│   ├── comments/
│   ├── notifications/
│
├── hooks/
├── lib/
├── prisma/
├── store/
├── types/
└── utils/
```

---

# Success Criteria

- Production Ready
- Fully Responsive
- Realtime Collaboration
- Team Workspace Support
- Modern SaaS UI
- Clean Architecture
- Scalable Codebase


---

# Architecture Principles

## Development Standards

- Feature-Based Architecture
- Type-Safe APIs
- Reusable Components
- Server Components First
- Client Components Only When Needed
- Strict TypeScript
- Clean Code Principles
- SOLID Design Patterns

---

# User Roles & Permissions

## Super Admin

Can:

- Manage Workspaces
- Manage Users
- Manage Projects
- View Analytics
- Configure Settings

## Project Manager

Can:

- Create Projects
- Create Tasks
- Assign Team Members
- Manage Task Status
- View Reports

## Team Member

Can:

- View Assigned Projects
- Update Assigned Tasks
- Comment on Tasks
- Upload Attachments

## Client (Future)

Can:

- View Project Progress
- Comment on Shared Tasks
- Approve Deliverables

---

# Future Features (Phase 16+)

## Document Management

Features:

- Upload Files
- Organize Project Documents
- Version History
- Download Center

---

## Team Chat

Features:

- Project Channels
- Direct Messages
- Mention Users
- File Sharing

---

## Time Tracking

Features:

- Start Timer
- Stop Timer
- Manual Logs
- Time Reports

---

## AI Assistant

Powered by OpenAI

Features:

- Generate Task Descriptions
- Summarize Activities
- Create Project Plans
- Generate Meeting Notes
- Productivity Insights

---

## Client Portal

Features:

- Shared Dashboard
- Progress Tracking
- Feedback Collection
- Deliverable Approval

---

# API Structure

## Authentication

/api/auth/login

/api/auth/register

/api/auth/logout

---

## Projects

GET /api/projects

POST /api/projects

PUT /api/projects/:id

DELETE /api/projects/:id

---

## Tasks

GET /api/tasks

POST /api/tasks

PUT /api/tasks/:id

DELETE /api/tasks/:id

---

## Comments

GET /api/comments

POST /api/comments

DELETE /api/comments/:id

---

# State Management Strategy

## React Query

Use For:

- API Requests
- Server State
- Caching
- Mutations

## Zustand

Use For:

- Sidebar State
- Theme State
- Modal State
- User Preferences
- Active Project State

---

# Coding Standards

## Naming Conventions

Components:

ProjectCard.tsx

TaskDrawer.tsx

KanbanBoard.tsx

---

Hooks:

useProjects.ts

useTasks.ts

useComments.ts

---

Stores:

project-store.ts

task-store.ts

ui-store.ts

---

# Database Optimization

## Indexes

Create indexes for:

- projectId
- taskId
- userId
- workspaceId
- status
- priority
- dueDate

---

# Security Requirements

## Authentication

- Supabase Auth
- JWT Validation
- Protected Routes
- Session Expiration

## Authorization

Role-Based Access Control (RBAC)

---

# Testing Strategy

## Unit Testing

- Vitest
- React Testing Library

## Integration Testing

- API Routes
- Database Operations

## E2E Testing

- Playwright

Coverage Goal:

- 80%+

---

# Deployment

## Environment

Development

Staging

Production

---

## Hosting

Frontend:
- Vercel

Database:
- Supabase

Storage:
- Supabase Storage

---

# CI/CD Pipeline

GitHub Actions

Workflow:

1. Lint
2. Type Check
3. Unit Tests
4. Build
5. Deploy to Vercel

---

# Definition of Done

A feature is considered complete when:

- TypeScript has zero errors
- ESLint passes
- Responsive Design implemented
- Dark Mode supported
- Database migrations updated
- Activity Logs tracked
- Tests written
- Documentation updated
- Accessibility verified
- Successfully deployed

---

# Innov8IT Branding

## Primary Colors

Blue:
#399ca2

Dark Blue:
#034697

Accent:
#e2a025

Success:
#22C55E

Warning:
#F59E0B

Danger:
#EF4444

---

## Design Style

- Modern SaaS
- Clean Interface
- Minimalist Layout
- Smooth Animations
- Professional Dashboard
- Enterprise Ready

---

# Final Goal

Build a production-ready Innov8IT Task Management Platform that combines:

- ClickUp's flexibility
- Linear's speed
- Asana's usability
- Jira's project organization

while maintaining a clean, scalable architecture using Next.js, TypeScript, Prisma, and Supabase.
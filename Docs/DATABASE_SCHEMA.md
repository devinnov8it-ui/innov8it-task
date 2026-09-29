# Database Schema

## User

- id
- name
- email
- avatar
- role
- createdAt
- updatedAt

---

## Workspace

- id
- name
- ownerId
- createdAt

---

## WorkspaceMember

- id
- workspaceId
- userId
- role

---

## Project

- id
- workspaceId
- name
- description
- status
- createdAt

Status:

- Planning
- Active
- Completed
- Archived

---

## Task

- id
- projectId
- title
- description
- status
- priority
- dueDate
- createdBy
- createdAt
- updatedAt

Status:

- Todo
- In Progress
- Review
- Done

Priority:

- Low
- Medium
- High
- Critical

---

## TaskAssignee

- id
- taskId
- userId

---

## Comment

- id
- taskId
- userId
- content
- createdAt

---

## ActivityLog

- id
- taskId
- userId
- action
- createdAt

---

## Notification

- id
- userId
- title
- message
- isRead
- createdAt
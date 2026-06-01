#Todo Platform
## Description
A full-stack Todo Platform with backend and frontend.

## Technologies Used
- Backend: Node.js, Express, PostgreSQL
- Frontend: HTML, CSS, JavaScript

## How to Run

### Step 1 - Backend
1. Open CMD
2. cd Desktop\todo-platform\todo-platform\backend
3. npm start
4. Server runs on http://localhost:5000

### Step 2 - Frontend
1. Go to frontend\pages folder
2. Open login.html in browser

## Pages
- login.html - Login page
- register.html - Register page
- dashboard.html - Dashboard
- tasks.html - Tasks page
- kanban.html - Kanban board
- users.html - Users page

## Database Setup
1. Install PostgreSQL
2. Create database:
   psql -U postgres -c "CREATE DATABASE todo_platform;"
3. Restore database:
   psql -U postgres -d todo_platform -f database_backup.sql

## Default Login
Email: sanjanasanju0646@gmail.com
Password: Sanjana@123
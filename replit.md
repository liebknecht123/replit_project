# Replit.md

## Overview

This is a comprehensive monorepo project containing multiple interconnected applications: a React-based frontend web application, an admin dashboard, a Node.js Express API backend, and a Godot game client. The project serves as a management platform for monitoring and controlling various services within the monorepo ecosystem, featuring service status monitoring, build management, and project analytics.

## User Preferences

Preferred communication style: Simple, everyday language.
Language preference: Chinese (中文) - Use Chinese when building and explaining projects.

## System Architecture

### Frontend Architecture
- **Main Client**: React 18 with TypeScript, built using Vite for development and bundling
- **UI Framework**: Tailwind CSS with shadcn/ui component library for consistent design
- **State Management**: TanStack React Query for server state management and API caching
- **Routing**: Wouter for lightweight client-side routing
- **Forms**: React Hook Form with Zod validation for type-safe form handling

### Backend Architecture
- **API Server**: Node.js Express server running on port 3000 with basic JSON API
- **Development Setup**: Basic Express server with minimal configuration for rapid development
- **Main Endpoint**: GET / returns {"message": "Backend server is live!"}
- **Configuration**: Simple server.js file with Express dependency, optimized for Replit deployment
- **Build Process**: npm install for dependencies, node server.js for execution

### Database Architecture
- **Database**: PostgreSQL with connection pooling (Replit managed)
- **Connection**: MySQL2 and pg libraries for dual database support
- **Schema Management**: SQL-based table creation with automatic initialization
- **Tables**: Users table with id, username, password_hash, nickname, created_at fields
- **Backup Option**: MariaDB support via Docker Compose for alternative deployment

### Build System
- **Monorepo Structure**: Single package.json with shared dependencies across all services
- **Development**: Concurrent development server running Express API with Vite frontend
- **Production Build**: Separate build processes for client (Vite) and server (esbuild)
- **Asset Management**: Shared assets directory with proper aliasing

### Service Management
- **Multi-Service Architecture**: Backend API (port 3000), Frontend client (port 5000), Admin dashboard, and Godot game client
- **Backend Service**: Successfully running with Express server providing JSON API response
- **Build Process**: npm install for dependency management, node server.js for service execution
- **Current Status**: Backend service operational and responding to API requests
- **Startup Issue Fixed**: Created dedicated start-backend.sh script to ensure backend-only startup

## External Dependencies

### Core Framework Dependencies
- **React Ecosystem**: React 18, React DOM, React Query for frontend state management
- **Express**: Core backend framework with middleware support (CORS, Helmet, Morgan)
- **Database**: Neon PostgreSQL serverless database with connection pooling

### UI and Styling
- **Tailwind CSS**: Utility-first CSS framework with custom configuration
- **Radix UI**: Accessible component primitives for complex UI components
- **Lucide React**: Icon library for consistent iconography
- **shadcn/ui**: Pre-built component library built on Radix and Tailwind

### Development Tools
- **Vite**: Frontend build tool and development server
- **TypeScript**: Type safety across the entire stack
- **Drizzle Kit**: Database schema management and migrations
- **esbuild**: Fast bundling for production server builds

### Additional Services
- **Session Storage**: PostgreSQL-based session management with connect-pg-simple
- **Form Handling**: React Hook Form with Hookform Resolvers for validation
- **Date Handling**: date-fns for consistent date formatting and manipulation
- **Replit Integration**: Custom Vite plugins for Replit-specific development features
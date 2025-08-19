# Replit.md

## Overview

This is a comprehensive monorepo project containing multiple interconnected applications: a React-based frontend web application, an admin dashboard, a Node.js Express API backend, and a Godot game client. The project serves as a management platform for monitoring and controlling various services within the monorepo ecosystem, featuring service status monitoring, build management, and project analytics.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Main Client**: React 18 with TypeScript, built using Vite for development and bundling
- **UI Framework**: Tailwind CSS with shadcn/ui component library for consistent design
- **State Management**: TanStack React Query for server state management and API caching
- **Routing**: Wouter for lightweight client-side routing
- **Forms**: React Hook Form with Zod validation for type-safe form handling

### Backend Architecture
- **API Server**: Node.js Express server with TypeScript support
- **Development Setup**: Hot-reloading with Vite middleware integration for seamless development
- **Data Layer**: Drizzle ORM with PostgreSQL database support
- **Storage Interface**: Abstracted storage layer with in-memory implementation for development and database implementation for production
- **Session Management**: Express session handling with PostgreSQL session store

### Database Architecture
- **ORM**: Drizzle with PostgreSQL dialect
- **Schema Management**: Centralized schema definitions in shared directory with Zod validation
- **Migrations**: Drizzle Kit for database schema migrations
- **Tables**: Users, services, project statistics with proper relationships and constraints

### Build System
- **Monorepo Structure**: Single package.json with shared dependencies across all services
- **Development**: Concurrent development server running Express API with Vite frontend
- **Production Build**: Separate build processes for client (Vite) and server (esbuild)
- **Asset Management**: Shared assets directory with proper aliasing

### Service Management
- **Multi-Service Architecture**: Backend API, Frontend client, Admin dashboard, and Godot game client
- **Health Monitoring**: Built-in health check endpoints and service status tracking
- **Build Management**: Automated build status tracking and deployment information
- **Analytics**: Project statistics including test results, coverage metrics, and build statuses

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
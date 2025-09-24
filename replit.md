# Replit.md

## Overview

This is a comprehensive monorepo project for the "掼蛋" (Guan Dan) card game featuring a unified Web-based frontend architecture. The project includes a React-based web application, an admin dashboard, and a Node.js Express API backend with real-time WebSocket functionality. The project has completely migrated to Vue.js technology stack for the unified frontend, abandoning the previous Godot client approach.

## User Preferences

Preferred communication style: Simple, everyday language.
Language preference: Chinese (中文) - Use Chinese when building and explaining projects.

## System Architecture

### Frontend Architecture  
- **Unified Web Frontend**: Vue.js-based architecture for comprehensive game client
- **Current Implementation**: React 18 with TypeScript, built using Vite for development and bundling  
- **UI Framework**: Tailwind CSS with shadcn/ui component library for consistent design
- **State Management**: TanStack React Query for server state management and API caching
- **Routing**: Wouter for lightweight client-side routing
- **Forms**: React Hook Form with Zod validation for type-safe form handling
- **Game Interface**: Real-time game lobby with timer system and card game functionality

### Backend Architecture
- **API Server**: Node.js Express server with TypeScript running on port 5000
- **WebSocket**: Socket.IO integration for real-time communication with JWT authentication
- **Authentication**: JWT-based user authentication system with login/logout APIs
- **Game Rooms**: Complete game room management system with create/join/leave functionality
- **Development Setup**: Modern TypeScript architecture with hot reloading
- **Main Endpoints**: 
  - POST /api/auth/login - User authentication
  - WebSocket /ws - Real-time game room communications
- **Configuration**: TypeScript with Drizzle ORM and PostgreSQL integration

### Database Architecture
- **Database**: PostgreSQL with Neon serverless (Replit managed)
- **ORM**: Drizzle ORM with TypeScript type safety
- **Schema Management**: Drizzle-based schema with automatic migrations
- **Tables**: 
  - users: id, username, password_hash, nickname, created_at
  - game_rooms: room management with host, players, status
  - game_room_players: player-room relationships with join tracking
- **Connection**: Neon PostgreSQL with connection pooling

### Build System
- **Monorepo Structure**: Single package.json with shared dependencies across all services
- **Development**: Concurrent development server running Express API with Vite frontend
- **Production Build**: Separate build processes for client (Vite) and server (esbuild)
- **Asset Management**: Shared assets directory with proper aliasing
- **Architecture Decision**: Completely migrated to unified Web-based frontend (Vue.js), abandoning Godot client

### Service Management  
- **Unified Architecture**: Single TypeScript server (port 5000) serving both API and WebSocket
- **Real-time Features**: Socket.IO WebSocket server with JWT authentication middleware
- **Game Room System**: Complete room management with create, join, leave, and real-time updates
- **Build Process**: npm run dev for development with TypeScript hot reloading
- **Current Status**: Full-stack application operational with WebSocket game rooms
- **Authentication System**: JWT-based login with secure WebSocket authentication
- **Database Integration**: Drizzle ORM with PostgreSQL for persistent room and user data

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
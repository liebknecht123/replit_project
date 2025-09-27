# Replit.md

## Overview

This is a comprehensive monorepo project for the "掼蛋" (Guan Dan) card game featuring a unified Web-based frontend architecture. The project includes a Vue.js 3-based web application with TypeScript, Node.js Express API backend, and real-time WebSocket functionality. The project features a completely redesigned game interface with professional-grade visual effects including horizontal timer bars, transparent central play areas, advanced card fan layouts with 80% visibility guarantee, and a comprehensive game lobby system for room management.

## User Preferences

Preferred communication style: Simple, everyday language.
Language preference: Chinese (中文) - Use Chinese when building and explaining projects.

## System Architecture

### Frontend Architecture  
- **Unified Web Frontend**: Vue.js 3 with TypeScript architecture for comprehensive game client
- **Recent Major Overhaul**: Professional-grade visual redesign completed with horizontal timer system, transparent central areas, and advanced card layouts
- **UI Framework**: Element Plus component library with custom styling for consistent design
- **State Management**: Pinia for Vue.js state management and local storage for session data
- **Routing**: Vue Router for client-side routing with authentication guards
- **Game Lobby System**: Complete lobby interface with room listing, creation, and join functionality
- **Game Interface**: Real-time game table with professional timer system and advanced card game functionality
- **Card Layout System**: Fan-style hand layout with guaranteed 80% card visibility and smooth hover/selection interactions
- **Smart Card Sorting**: 9-priority intelligent sorting algorithm for authentic Guan Dan gameplay

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
- **Architecture Decision**: Unified React-based web frontend with professional game interface design

### Service Management  
- **Unified Architecture**: Single TypeScript server (port 5000) serving both API and WebSocket
- **Real-time Features**: Socket.IO WebSocket server with JWT authentication middleware
- **Game Room System**: Complete room management with create, join, leave, and real-time updates
- **Build Process**: npm run dev for development with TypeScript hot reloading
- **Current Status**: Full-stack application operational with WebSocket game rooms - Successfully configured for Replit environment
- **Authentication System**: JWT-based login with secure WebSocket authentication
- **Database Integration**: Drizzle ORM with PostgreSQL for persistent room and user data
- **Deployment**: Configured for autoscale deployment with npm run build and npm run start
- **Environment**: Successfully running on port 5000 with proper host verification bypass for Replit proxy

## External Dependencies

### Core Framework Dependencies
- **Vue.js Ecosystem**: Vue.js 3, Vue Router, Pinia for frontend architecture and state management
- **Element Plus**: Comprehensive Vue.js 3 UI component library for professional interface
- **Express**: Core backend framework with middleware support (CORS, Helmet, Morgan)
- **Database**: Neon PostgreSQL serverless database with connection pooling

### UI and Styling
- **Element Plus**: Professional Vue.js 3 component library with built-in theming
- **Custom CSS**: Professional game-themed styling with green gradient backgrounds
- **Element Plus Icons**: Complete icon set for Vue.js applications
- **Professional Game Interface**: Card game optimized UI with transparent overlays and gradients

### Development Tools
- **Vite**: Frontend build tool and development server
- **TypeScript**: Type safety across the entire stack
- **Drizzle Kit**: Database schema management and migrations
- **esbuild**: Fast bundling for production server builds

### Additional Services
- **Session Storage**: PostgreSQL-based session management with connect-pg-simple
- **Form Handling**: Element Plus form components with built-in validation
- **Game Logic**: Advanced Guan Dan card sorting with cross-suit combination support
- **Smart Features**: Intelligent card sorting and restore functionality for enhanced gameplay
- **Replit Integration**: Custom Vite plugins for Replit-specific development features
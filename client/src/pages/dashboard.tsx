import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Sidebar from '@/components/Sidebar';
import ServiceCard from '@/components/ServiceCard';
import { 
  Play, 
  Square, 
  RotateCcw, 
  Hammer,
  TestTube,
  Rocket,
  FileCode,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface Service {
  id: string;
  name: string;
  status: 'running' | 'stopped' | 'error' | 'development';
  port?: number;
  health?: 'healthy' | 'unhealthy' | 'unknown';
  lastBuild?: string;
  version?: string;
  bundleSize?: string;
  platform?: string;
}

interface ProjectStats {
  buildStatus: 'passing' | 'failing' | 'unknown';
  tests: {
    passed: number;
    total: number;
  };
  coverage: number;
}

export default function Dashboard() {
  const { data: services, isLoading: servicesLoading } = useQuery<Service[]>({
    queryKey: ['/api/services'],
  });

  const { data: stats } = useQuery<ProjectStats>({
    queryKey: ['/api/stats'],
  });

  const [isBuilding, setIsBuilding] = useState(false);

  const handleBuildAll = async () => {
    setIsBuilding(true);
    // Simulate build process
    setTimeout(() => {
      setIsBuilding(false);
    }, 3000);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'stopped':
        return <Square className="w-4 h-4 text-red-600" />;
      case 'development':
        return <Hammer className="w-4 h-4 text-gray-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-yellow-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      running: 'bg-green-100 text-green-800 border-green-200',
      stopped: 'bg-red-100 text-red-800 border-red-200',
      development: 'bg-gray-100 text-gray-800 border-gray-200',
      error: 'bg-yellow-100 text-yellow-800 border-yellow-200'
    };

    return (
      <Badge className={`text-xs font-medium border ${variants[status as keyof typeof variants] || variants.error}`}>
        {getStatusIcon(status)}
        <span className="ml-1 capitalize">{status}</span>
      </Badge>
    );
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50" data-testid="dashboard-container">
      <Sidebar stats={stats} />
      
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900" data-testid="text-dashboard-title">
                Monorepo Overview
              </h2>
              <p className="text-gray-600 mt-1">Manage your multi-service architecture</p>
            </div>
            <div className="flex items-center space-x-4">
              <Button 
                variant="outline" 
                data-testid="button-sync"
                className="text-gray-600 hover:text-gray-900"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Sync
              </Button>
              <Button 
                onClick={handleBuildAll}
                disabled={isBuilding}
                data-testid="button-build-all"
                className="bg-primary text-white hover:bg-blue-700"
              >
                {isBuilding ? (
                  <>
                    <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Building...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Build All
                  </>
                )}
              </Button>
            </div>
          </div>
        </header>

        <div className="p-8">
          {/* Services Grid */}
          <section className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-6" data-testid="text-services-title">
              Services
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {servicesLoading ? (
                Array.from({ length: 4 }).map((_, index) => (
                  <Card key={index} className="p-6">
                    <div className="animate-pulse">
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-gray-200 rounded-lg" />
                        <div className="w-16 h-6 bg-gray-200 rounded-full" />
                      </div>
                      <div className="h-6 bg-gray-200 rounded mb-2" />
                      <div className="h-4 bg-gray-200 rounded mb-4" />
                      <div className="space-y-2">
                        <div className="h-3 bg-gray-200 rounded" />
                        <div className="h-3 bg-gray-200 rounded" />
                        <div className="h-3 bg-gray-200 rounded" />
                      </div>
                    </div>
                  </Card>
                ))
              ) : (
                services?.map((service) => (
                  <ServiceCard key={service.id} service={service} />
                ))
              )}
            </div>
          </section>

          {/* Project Structure Section */}
          <section className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-6" data-testid="text-structure-title">
              Directory Structure
            </h3>
            <Card>
              <CardContent className="p-6">
                <div className="font-mono text-sm space-y-1">
                  <div className="flex items-center text-gray-800">
                    <span className="text-yellow-500 mr-2">📁</span>
                    <span className="font-semibold">monorepo-project/</span>
                  </div>
                  <div className="ml-4 space-y-1">
                    <div className="flex items-center justify-between text-gray-700">
                      <div className="flex items-center">
                        <span className="text-yellow-500 mr-2">📁</span>
                        <span>backend/</span>
                      </div>
                      <Badge className="text-xs bg-green-100 text-green-800">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Ready
                      </Badge>
                    </div>
                    <div className="ml-8 space-y-1 text-gray-600">
                      <div className="flex items-center">
                        <FileCode className="w-4 h-4 mr-2 text-blue-500" />
                        <span>server.js</span>
                      </div>
                      <div className="flex items-center">
                        <FileCode className="w-4 h-4 mr-2 text-green-500" />
                        <span>package.json</span>
                      </div>
                      <div className="flex items-center">
                        <span className="text-yellow-500 mr-2">📁</span>
                        <span>src/</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-gray-700">
                      <div className="flex items-center">
                        <span className="text-yellow-500 mr-2">📁</span>
                        <span>frontend/</span>
                      </div>
                      <Badge className="text-xs bg-green-100 text-green-800">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Ready
                      </Badge>
                    </div>
                    <div className="ml-8 space-y-1 text-gray-600">
                      <div className="flex items-center">
                        <FileCode className="w-4 h-4 mr-2 text-green-500" />
                        <span>package.json</span>
                      </div>
                      <div className="flex items-center">
                        <span className="text-yellow-500 mr-2">📁</span>
                        <span>src/</span>
                      </div>
                      <div className="flex items-center">
                        <span className="text-yellow-500 mr-2">📁</span>
                        <span>public/</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-gray-700">
                      <div className="flex items-center">
                        <span className="text-yellow-500 mr-2">📁</span>
                        <span>admin-frontend/</span>
                      </div>
                      <Badge className="text-xs bg-yellow-100 text-yellow-800">
                        <Clock className="w-3 h-3 mr-1" />
                        Setup
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between text-gray-700">
                      <div className="flex items-center">
                        <span className="text-yellow-500 mr-2">📁</span>
                        <span>godot-client/</span>
                      </div>
                      <Badge className="text-xs bg-gray-100 text-gray-800">
                        <Hammer className="w-3 h-3 mr-1" />
                        Development
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between text-gray-700">
                      <div className="flex items-center">
                        <FileCode className="w-4 h-4 mr-2 text-blue-500" />
                        <span>docker-compose.yml</span>
                      </div>
                      <Badge className="text-xs bg-green-100 text-green-800">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Configured
                      </Badge>
                    </div>
                    
                    <div className="flex items-center text-gray-700">
                      <FileCode className="w-4 h-4 mr-2 text-gray-500" />
                      <span>README.md</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Quick Actions */}
          <section className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-6" data-testid="text-actions-title">
              Quick Actions
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Button
                variant="outline"
                className="p-4 h-auto text-left group border-gray-200 hover:shadow-md transition-all"
                data-testid="button-start-dev"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors">
                    <Play className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Start Dev</h4>
                    <p className="text-sm text-gray-600">Boot all services</p>
                  </div>
                </div>
              </Button>
              
              <Button
                variant="outline"
                className="p-4 h-auto text-left group border-gray-200 hover:shadow-md transition-all"
                data-testid="button-run-tests"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                    <TestTube className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Run Tests</h4>
                    <p className="text-sm text-gray-600">Execute test suite</p>
                  </div>
                </div>
              </Button>
              
              <Button
                variant="outline"
                className="p-4 h-auto text-left group border-gray-200 hover:shadow-md transition-all"
                data-testid="button-build-prod"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center group-hover:bg-orange-200 transition-colors">
                    <Hammer className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Build Prod</h4>
                    <p className="text-sm text-gray-600">Create production build</p>
                  </div>
                </div>
              </Button>
              
              <Button
                variant="outline"
                className="p-4 h-auto text-left group border-gray-200 hover:shadow-md transition-all"
                data-testid="button-deploy"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                    <Rocket className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Deploy</h4>
                    <p className="text-sm text-gray-600">Push to production</p>
                  </div>
                </div>
              </Button>
            </div>
          </section>

          {/* Docker Compose Status */}
          <section>
            <h3 className="text-lg font-semibold text-gray-900 mb-6" data-testid="text-docker-title">
              Docker Compose Configuration
            </h3>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="text-2xl text-blue-500">🐳</div>
                    <div>
                      <h4 className="font-semibold text-gray-900">docker-compose.yml</h4>
                      <p className="text-sm text-gray-600">Container orchestration configuration</p>
                    </div>
                  </div>
                  <Button variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100" data-testid="button-edit-docker">
                    <FileCode className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                </div>
                
                <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm text-gray-300 overflow-x-auto">
                  <pre className="whitespace-pre-wrap">
{`version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
  
  frontend:
    build: ./frontend
    ports:
      - "3001:3000"
    depends_on:
      - backend`}
                  </pre>
                </div>
                
                <div className="mt-4 flex items-center space-x-4">
                  <Button className="bg-green-600 hover:bg-green-700 text-white" data-testid="button-docker-up">
                    <Play className="w-4 h-4 mr-2" />
                    docker-compose up
                  </Button>
                  <Button variant="outline" className="bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200" data-testid="button-docker-down">
                    <Square className="w-4 h-4 mr-2" />
                    docker-compose down
                  </Button>
                  <span className="text-sm text-gray-600">
                    <Clock className="w-4 h-4 inline mr-1" />
                    Last run: 30 minutes ago
                  </span>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </main>
    </div>
  );
}

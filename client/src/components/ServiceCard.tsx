import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Server, 
  Globe, 
  Shield, 
  Gamepad2,
  CheckCircle,
  Pause,
  Hammer,
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

interface ServiceCardProps {
  service: Service;
}

export default function ServiceCard({ service }: ServiceCardProps) {
  const getServiceIcon = (serviceId: string) => {
    switch (serviceId) {
      case 'backend':
        return <Server className="text-green-600 text-xl" />;
      case 'frontend':
        return <Globe className="text-blue-600 text-xl" />;
      case 'admin-frontend':
        return <Shield className="text-purple-600 text-xl" />;
      case 'godot-client':
        return <Gamepad2 className="text-indigo-600 text-xl" />;
      default:
        return <Server className="text-gray-600 text-xl" />;
    }
  };

  const getServiceDescription = (serviceId: string) => {
    switch (serviceId) {
      case 'backend':
        return 'Node.js API service with Express framework';
      case 'frontend':
        return 'React web application with modern UI';
      case 'admin-frontend':
        return 'Administrative dashboard interface';
      case 'godot-client':
        return 'Game client built with Godot Engine';
      default:
        return 'Service component';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'running':
        return (
          <Badge className="text-xs bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Running
          </Badge>
        );
      case 'stopped':
        return (
          <Badge className="text-xs bg-yellow-100 text-yellow-800 border-yellow-200">
            <Pause className="w-3 h-3 mr-1" />
            Stopped
          </Badge>
        );
      case 'development':
        return (
          <Badge className="text-xs bg-gray-100 text-gray-800 border-gray-200">
            <Hammer className="w-3 h-3 mr-1" />
            Development
          </Badge>
        );
      case 'error':
        return (
          <Badge className="text-xs bg-red-100 text-red-800 border-red-200">
            <AlertCircle className="w-3 h-3 mr-1" />
            Error
          </Badge>
        );
      default:
        return (
          <Badge className="text-xs bg-gray-100 text-gray-800 border-gray-200">
            Unknown
          </Badge>
        );
    }
  };

  const formatLastBuild = (timestamp?: string) => {
    if (!timestamp) return 'Never';
    const now = new Date();
    const buildTime = new Date(timestamp);
    const diffMs = now.getTime() - buildTime.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    
    if (diffMins < 60) {
      return `${diffMins} min ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else {
      return buildTime.toLocaleDateString();
    }
  };

  return (
    <Card 
      className="bg-white rounded-xl border border-gray-200 hover:shadow-lg transition-shadow cursor-pointer"
      data-testid={`card-service-${service.id}`}
    >
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
            service.id === 'backend' ? 'bg-green-100' :
            service.id === 'frontend' ? 'bg-blue-100' :
            service.id === 'admin-frontend' ? 'bg-purple-100' :
            service.id === 'godot-client' ? 'bg-indigo-100' : 'bg-gray-100'
          }`}>
            {getServiceIcon(service.id)}
          </div>
          {getStatusBadge(service.status)}
        </div>
        
        <h4 className="text-lg font-semibold text-gray-900 mb-2" data-testid={`text-service-name-${service.id}`}>
          {service.name}
        </h4>
        
        <p className="text-sm text-gray-600 mb-4">
          {getServiceDescription(service.id)}
        </p>
        
        <div className="space-y-2 text-xs text-gray-500">
          {service.port && (
            <div className="flex justify-between">
              <span>Port:</span>
              <span className="font-mono" data-testid={`text-port-${service.id}`}>
                {service.port}
              </span>
            </div>
          )}
          
          {service.lastBuild && (
            <div className="flex justify-between">
              <span>Last Build:</span>
              <span data-testid={`text-lastbuild-${service.id}`}>
                {formatLastBuild(service.lastBuild)}
              </span>
            </div>
          )}
          
          {service.health && (
            <div className="flex justify-between">
              <span>Health:</span>
              <span 
                className={`font-medium ${service.health === 'healthy' ? 'text-green-600' : 'text-red-600'}`}
                data-testid={`text-health-${service.id}`}
              >
                {service.health === 'healthy' ? 'Healthy' : 'Unhealthy'}
              </span>
            </div>
          )}
          
          {service.bundleSize && (
            <div className="flex justify-between">
              <span>Bundle Size:</span>
              <span className="text-green-600 font-medium" data-testid={`text-bundle-${service.id}`}>
                {service.bundleSize}
              </span>
            </div>
          )}
          
          {service.version && (
            <div className="flex justify-between">
              <span>Version:</span>
              <span className="font-mono" data-testid={`text-version-${service.id}`}>
                {service.version}
              </span>
            </div>
          )}
          
          {service.platform && (
            <div className="flex justify-between">
              <span>Platform:</span>
              <span data-testid={`text-platform-${service.id}`}>
                {service.platform}
              </span>
            </div>
          )}
          
          {service.status && (
            <div className="flex justify-between">
              <span>Status:</span>
              <span 
                className={`font-medium ${
                  service.status === 'running' ? 'text-green-600' :
                  service.status === 'stopped' ? 'text-orange-600' :
                  service.status === 'development' ? 'text-gray-600' :
                  'text-red-600'
                }`}
                data-testid={`text-status-${service.id}`}
              >
                {service.status === 'running' ? 'Healthy' :
                 service.status === 'stopped' ? 'Inactive' :
                 service.status === 'development' ? 'In Development' :
                 'Error'}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { 
  GitBranch,
  Home,
  FolderTree,
  Settings,
  BookOpen,
  TrendingUp,
  CheckCircle,
  Clock,
  Percent
} from 'lucide-react';

interface ProjectStats {
  buildStatus: 'passing' | 'failing' | 'unknown';
  tests: {
    passed: number;
    total: number;
  };
  coverage: number;
}

interface SidebarProps {
  stats?: ProjectStats;
}

export default function Sidebar({ stats }: SidebarProps) {
  const navItems = [
    { icon: Home, label: 'Overview', active: true },
    { icon: FolderTree, label: 'Project Structure', active: false },
    { icon: Settings, label: 'Build Scripts', active: false },
    { icon: BookOpen, label: 'Documentation', active: false },
    { icon: TrendingUp, label: 'Analytics', active: false },
  ];

  return (
    <aside className="w-64 bg-white shadow-lg border-r border-gray-200" data-testid="sidebar-container">
      <div className="p-6">
        <div className="flex items-center space-x-3 mb-8">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <GitBranch className="text-white text-lg" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900" data-testid="text-app-title">
            MonoRepo
          </h1>
        </div>
        
        {/* Navigation */}
        <nav className="space-y-2">
          {navItems.map((item, index) => (
            <a
              key={index}
              href="#"
              className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                item.active
                  ? 'bg-blue-50 text-primary border border-blue-100'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
            >
              <item.icon className="w-5 h-5" />
              <span className={item.active ? 'font-medium' : ''}>{item.label}</span>
            </a>
          ))}
        </nav>
      </div>
      
      {/* Project Status */}
      <div className="p-6 border-t border-gray-200">
        <h3 className="text-sm font-medium text-gray-900 mb-3" data-testid="text-status-title">
          Project Status
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Build Status</span>
            <Badge 
              className={`text-xs font-medium ${
                stats?.buildStatus === 'passing' 
                  ? 'bg-green-100 text-green-800 border-green-200' 
                  : 'bg-red-100 text-red-800 border-red-200'
              }`}
              data-testid="badge-build-status"
            >
              <CheckCircle className="w-3 h-3 mr-1" />
              {stats?.buildStatus === 'passing' ? 'Passing' : 'Failing'}
            </Badge>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Tests</span>
            <Badge 
              className="text-xs font-medium bg-green-100 text-green-800 border-green-200"
              data-testid="badge-tests"
            >
              {stats?.tests ? `${stats.tests.passed}/${stats.tests.total}` : '42/42'}
            </Badge>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Coverage</span>
            <Badge 
              className={`text-xs font-medium ${
                (stats?.coverage || 85) >= 80 
                  ? 'bg-green-100 text-green-800 border-green-200'
                  : 'bg-yellow-100 text-yellow-800 border-yellow-200'
              }`}
              data-testid="badge-coverage"
            >
              <Percent className="w-3 h-3 mr-1" />
              {stats?.coverage || 85}%
            </Badge>
          </div>
        </div>
      </div>
    </aside>
  );
}

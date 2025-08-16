import { History } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Project {
  id: string;
  title: string;
  createdAt: Date;
  status: string;
  thumbnailUrl?: string;
}

interface RecentProjectsProps {
  projects: Project[];
  onViewProject: (projectId: string) => void;
}

export default function RecentProjects({ projects, onViewProject }: RecentProjectsProps) {
  console.log("📋 RecentProjects render:", projects.length, projects);
  
  const formatDate = (date: Date) => {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return "1 day ago";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 14) return "1 week ago";
    return `${Math.ceil(diffDays / 7)} weeks ago`;
  };

  if (projects.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm">
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            <History className="inline w-5 h-5 text-primary mr-2" />
            Recent Projects
          </h3>
          <div className="text-center py-8">
            <History className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No projects yet. Upload your first artwork to get started!</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-medium text-gray-900">
            <History className="inline w-5 h-5 text-primary mr-2" />
            Recent Projects
          </h3>
          <Button variant="link" className="text-primary hover:text-indigo-700">
            View all
          </Button>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {projects.slice(0, 4).map((project) => (
            <div
              key={project.id}
              className="group cursor-pointer"
              onClick={() => onViewProject(project.id)}
            >
              <div className="aspect-w-16 aspect-h-10 bg-gray-100 rounded-lg overflow-hidden mb-3">
                {project.thumbnailUrl ? (
                  <img
                    src={project.thumbnailUrl}
                    alt={project.title}
                    className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                ) : (
                  <div className="w-full h-32 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                    <span className="text-gray-400 text-sm">No preview</span>
                  </div>
                )}
              </div>
              <h4 className="font-medium text-gray-900 text-sm truncate">{project.title}</h4>
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500">
                  {formatDate(project.createdAt)}
                </p>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  project.status === 'completed' ? 'bg-green-100 text-green-800' :
                  project.status === 'ai-generated' ? 'bg-purple-100 text-purple-800' :
                  project.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {project.status === 'ai-generated' ? 'AI Generated' :
                   project.status === 'completed' ? 'Ready' :
                   project.status === 'processing' ? 'Processing' :
                   project.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

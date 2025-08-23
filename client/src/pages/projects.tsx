import { useQuery } from "@tanstack/react-query";
import { History, Plus, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link, useLocation } from "wouter";
import { useState } from "react";
import Navigation from "@/components/navigation";
import { Footer } from "@/components/footer";
import { useAuth } from "@/hooks/useAuth";
import type { User, Project } from "@shared/schema";

export default function ProjectsPage() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  
  // Debug initial state
  console.log("🔍 Projects page initial state:", { searchTerm, statusFilter });
  const { user: authUser } = useAuth();

  const { data: user } = useQuery<User>({
    queryKey: ["/api/user"],
  });

  const { data: projects = [], isLoading, error } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
    staleTime: 30000, // Cache for 30 seconds
  });

  // Debug query state
  console.log("🔍 Query state:", { isLoading, hasError: !!error, dataLength: projects?.length });

  // Debug logging to understand data structure
  console.log("📋 Projects data:", projects?.length || 0, projects);
  
  // Check if projects array has valid data
  if (projects && projects.length > 0) {
    console.log("🔍 First project structure:", projects[0]);
    console.log("🔍 Required fields check:", {
      hasId: !!projects[0]?.id,
      hasTitle: !!projects[0]?.title,
      hasCreatedAt: !!projects[0]?.createdAt,
      hasStatus: !!projects[0]?.status,
      hasOriginalImageUrl: !!projects[0]?.originalImageUrl
    });
  }

  // Use auth user data as fallback if API user data is not available
  const currentUser = user || authUser || undefined;

  const formatDate = (date: Date | string) => {
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - dateObj.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) return "1 day ago";
      if (diffDays < 7) return `${diffDays} days ago`;
      if (diffDays < 14) return "1 week ago";
      return `${Math.ceil(diffDays / 7)} weeks ago`;
    } catch (error) {
      console.warn("Date formatting error:", error, date);
      return "Unknown date";
    }
  };

  const handleViewProject = (projectId: string) => {
    setLocation(`/projects/${projectId}`);
  };

  // Filter projects based on search term and status
  const filteredProjects = projects.filter(project => {
    // Add safety checks for undefined/null values
    const title = project.title || '';
    const status = project.status || '';
    
    // Search logic: empty search should match everything
    const matchesSearch = searchTerm.trim() === '' || title.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Status logic: 'all' should match everything, otherwise exact match (case-insensitive)
    const matchesStatus = statusFilter === "all" || status.toLowerCase() === statusFilter.toLowerCase();
    
    return matchesSearch && matchesStatus;
  });
  
  // Debug filtered results
  console.log("🔍 Filtered projects:", filteredProjects.length, "from", projects.length, "total");
  console.log("🔍 Search/Filter state:", { searchTerm, statusFilter });
  console.log("🔍 Auth state:", { hasToken: !!authUser, hasAuthUser: !!authUser, hasUser: !!user, projectsLoading: isLoading, projectsError: error, isAuthenticated: !!authUser || !!user });
  
  // Debug each project's filtering
  if (projects.length > 0) {
    projects.forEach((project, index) => {
      const title = project.title || '';
      const status = project.status || '';
      const matchesSearch = searchTerm.trim() === '' || title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "all" || status.toLowerCase() === statusFilter.toLowerCase();
      
      console.log(`🔍 Project ${index + 1}:`, {
        id: project.id?.substring(0, 8),
        title: title,
        status: status,
        matchesSearch,
        matchesStatus,
        passes: matchesSearch && matchesStatus
      });
    });
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation user={currentUser} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading your projects...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation user={currentUser} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                <History className="inline w-8 h-8 text-indigo-600 mr-3" />
                All Projects
              </h1>
              <p className="mt-2 text-gray-600">
                Manage and view all your artwork projects
              </p>
            </div>
            <Link href="/mockups">
              <Button className="bg-indigo-600 hover:bg-indigo-700">
                <Plus className="w-4 h-4 mr-2" />
                New Project
              </Button>
            </Link>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search projects..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="sm:w-48">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="ai-generated">AI Generated</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="ready">Ready</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Projects Grid */}
        {console.log("🎯 Rendering decision:", { 
          filteredProjectsLength: filteredProjects.length, 
          totalProjects: projects.length,
          isLoading,
          showingEmptyState: filteredProjects.length === 0 
        })}
        {filteredProjects.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-12 text-center">
              <History className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm || statusFilter !== "all" ? "No projects found" : "No projects yet"}
              </h3>
              <p className="text-gray-500 mb-6">
                {searchTerm || statusFilter !== "all" 
                  ? "Try adjusting your search or filter criteria"
                  : "Upload your first artwork to get started!"
                }
              </p>
              {!searchTerm && statusFilter === "all" && (
                <Link href="/mockups">
                  <Button className="bg-indigo-600 hover:bg-indigo-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Project
                  </Button>
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6">
              <div className="mb-4">
                <p className="text-sm text-gray-600">
                  Showing {filteredProjects.length} of {projects.length} projects
                </p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredProjects.map((project) => (
                  <div
                    key={project.id}
                    className="group cursor-pointer border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-all duration-200"
                    onClick={() => handleViewProject(project.id)}
                  >
                    <div className="aspect-w-16 aspect-h-10 bg-gray-100">
                      {project.thumbnailUrl ? (
                        <img
                          src={project.thumbnailUrl}
                          alt={project.title}
                          className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                      ) : (
                        <div className="w-full h-40 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                          <span className="text-gray-400 text-sm">No preview</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="p-4">
                      <h4 className="font-medium text-gray-900 text-sm truncate mb-2">
                        {project.title}
                      </h4>
                      
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-gray-500">
                          {formatDate(new Date(project.createdAt))}
                        </p>
                        
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          project.status === 'completed' ? 'bg-green-100 text-green-800' :
                          project.status === 'ai-generated' ? 'bg-purple-100 text-purple-800' :
                          project.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                          project.status === 'failed' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {project.status === 'ai-generated' ? 'AI Generated' :
                           project.status === 'completed' ? 'Ready' :
                           project.status === 'processing' ? 'Processing' :
                           project.status === 'failed' ? 'Failed' :
                           project.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Play, AlertCircle, CheckCircle, Clock } from "lucide-react";

interface MigrationStatus {
  total: number;
  needsMigration: number;
  alreadyMigrated: number;
  sampleProjects: Array<{
    id: string;
    title: string;
    base64Images: string[];
    objectStorageImages: string[];
  }>;
}

interface MigrationProgress {
  totalProjects: number;
  processedProjects: number;
  migratedImages: number;
  errors: string[];
  startTime: string;
  estimatedCompletion?: string;
}

export default function Migration() {
  const [isRunning, setIsRunning] = useState(false);
  const queryClient = useQueryClient();

  // Fetch migration status
  const { data: status, isLoading: statusLoading, refetch: refetchStatus } = useQuery<MigrationStatus>({
    queryKey: ['/api/migration/status'],
    refetchInterval: isRunning ? 5000 : false, // Poll every 5s when running
  });

  // Fetch migration progress
  const { data: progress, refetch: refetchProgress } = useQuery<MigrationProgress>({
    queryKey: ['/api/migration/progress'],
    enabled: isRunning,
    refetchInterval: isRunning ? 2000 : false, // Poll every 2s when running
  });

  // Start migration mutation
  const startMigration = useMutation({
    mutationFn: (batchSize: number = 5) => 
      apiRequest(`/api/migration/start`, { 
        method: 'POST', 
        body: JSON.stringify({ batchSize }) 
      }),
    onSuccess: () => {
      setIsRunning(true);
      refetchProgress();
    },
  });

  // Stop monitoring when migration is complete
  useEffect(() => {
    if (progress && progress.processedProjects === progress.totalProjects && progress.totalProjects > 0) {
      setIsRunning(false);
      refetchStatus(); // Refresh status after completion
    }
  }, [progress, refetchStatus]);

  const migrationPercentage = progress ? 
    (progress.processedProjects / progress.totalProjects) * 100 : 0;

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString();
  };

  const estimatedTimeRemaining = progress?.estimatedCompletion ? 
    Math.max(0, Math.ceil((new Date(progress.estimatedCompletion).getTime() - Date.now()) / 1000 / 60)) : 0;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Image Storage Migration</h1>
        <Button
          variant="outline"
          onClick={() => refetchStatus()}
          disabled={statusLoading}
          data-testid="button-refresh-status"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh Status
        </Button>
      </div>

      {/* Migration Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-projects">
              {status?.total || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Need Migration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600" data-testid="text-needs-migration">
              {status?.needsMigration || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Projects with base64 images
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Already Migrated</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600" data-testid="text-already-migrated">
              {status?.alreadyMigrated || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Using object storage
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Migration Control */}
      <Card>
        <CardHeader>
          <CardTitle>Migration Control</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isRunning && (status?.needsMigration || 0) > 0 && (
            <div className="space-y-2">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Found {status?.needsMigration} projects that need migration from base64 database storage to object storage.
                  This will improve performance and reduce database load.
                </AlertDescription>
              </Alert>
              <Button
                onClick={() => startMigration.mutate(5)}
                disabled={startMigration.isPending}
                data-testid="button-start-migration"
              >
                <Play className="w-4 h-4 mr-2" />
                Start Migration
              </Button>
            </div>
          )}

          {isRunning && progress && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Badge variant="secondary" className="animate-pulse">
                  <Clock className="w-3 h-3 mr-1" />
                  Running
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Started at {formatTime(progress.startTime)}
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress: {progress.processedProjects}/{progress.totalProjects} projects</span>
                  <span>{Math.round(migrationPercentage)}%</span>
                </div>
                <Progress value={migrationPercentage} className="w-full" />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="font-medium">Processed</div>
                  <div className="text-muted-foreground" data-testid="text-processed-projects">
                    {progress.processedProjects} projects
                  </div>
                </div>
                <div>
                  <div className="font-medium">Images Migrated</div>
                  <div className="text-muted-foreground" data-testid="text-migrated-images">
                    {progress.migratedImages} images
                  </div>
                </div>
                <div>
                  <div className="font-medium">Errors</div>
                  <div className="text-muted-foreground" data-testid="text-migration-errors">
                    {progress.errors.length} errors
                  </div>
                </div>
                <div>
                  <div className="font-medium">ETA</div>
                  <div className="text-muted-foreground" data-testid="text-estimated-time">
                    {estimatedTimeRemaining > 0 ? `${estimatedTimeRemaining}m` : 'Almost done'}
                  </div>
                </div>
              </div>

              {progress.errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Migration encountered {progress.errors.length} errors. Check console logs for details.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {!isRunning && (status?.needsMigration || 0) === 0 && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                All projects are already using object storage. No migration needed.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Sample Projects */}
      {status?.sampleProjects && status.sampleProjects.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Sample Projects (First 10)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {status.sampleProjects.map((project) => (
                <div
                  key={project.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                  data-testid={`project-${project.id}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{project.title}</div>
                    <div className="text-sm text-muted-foreground truncate">
                      ID: {project.id}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    {project.base64Images.length > 0 && (
                      <Badge variant="destructive">
                        {project.base64Images.length} Base64
                      </Badge>
                    )}
                    {project.objectStorageImages.length > 0 && (
                      <Badge variant="default">
                        {project.objectStorageImages.length} Object Storage
                      </Badge>
                    )}
                    {project.base64Images.length === 0 && project.objectStorageImages.length === 0 && (
                      <Badge variant="secondary">No Images</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance Benefits */}
      <Card>
        <CardHeader>
          <CardTitle>Migration Benefits</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium mb-2">Performance Improvements</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Faster project loading (8-19s → 2-3s)</li>
                <li>• Reduced database storage costs</li>
                <li>• Better caching for images</li>
                <li>• Improved server response times</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Technical Benefits</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Dedicated CDN for image delivery</li>
                <li>• Automatic compression and optimization</li>
                <li>• Better backup and redundancy</li>
                <li>• Scalable storage solution</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
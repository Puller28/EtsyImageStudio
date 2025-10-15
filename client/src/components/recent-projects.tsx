import { History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import type { Project as ProjectRecord } from "@shared/schema";

type ProjectSummary = Pick<
  ProjectRecord,
  | "id"
  | "title"
  | "status"
  | "thumbnailUrl"
  | "originalImageUrl"
  | "upscaledImageUrl"
  | "mockupImageUrl"
  | "mockupImages"
  | "resizedImages"
  | "etsyListing"
  | "hasOriginalImage"
  | "hasUpscaledImage"
  | "hasMockupImages"
  | "hasResizedImages"
  | "hasEtsyListing"
  | "mockupCount"
  | "resizedCount"
  | "createdAt"
>;

interface RecentProjectsProps {
  projects?: ProjectSummary[];
  onViewProject: (projectId: string) => void;
}

function parseCreatedAt(value: ProjectSummary["createdAt"]): Date {
  if (value instanceof Date) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  return new Date();
}

function formatRelativeDate(date: Date): string {
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays <= 1) return "1 day ago";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 14) return "1 week ago";
  return `${Math.ceil(diffDays / 7)} weeks ago`;
}

function hasResizedImages(project: ProjectSummary): boolean {
  if (typeof project.hasResizedImages === "boolean") {
    return project.hasResizedImages;
  }
  if (typeof project.resizedCount === "number") {
    return project.resizedCount > 0;
  }
  const { resizedImages } = project;
  return Array.isArray(resizedImages) && resizedImages.length > 0;
}

function hasMockupImages(project: ProjectSummary): boolean {
  if (typeof project.hasMockupImages === "boolean") {
    return project.hasMockupImages;
  }
  if (typeof project.mockupCount === "number") {
    return project.mockupCount > 0;
  }
  if (project.mockupImageUrl) {
    return true;
  }
  if (project.mockupImages && typeof project.mockupImages === "object") {
    return Object.keys(project.mockupImages as Record<string, unknown>).length > 0;
  }
  return false;
}

export default function RecentProjects({
  projects,
  onViewProject,
}: RecentProjectsProps) {
  const safeProjects = projects ?? [];
  console.log('dY"< RecentProjects render:', safeProjects.length, safeProjects);

  if (safeProjects.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm">
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            <History className="inline w-5 h-5 text-primary mr-2" />
            Recent Projects
          </h3>
          <div className="text-center py-8">
            <History className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">
              No projects yet. Upload your first artwork to get started!
            </p>
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
          <Link href="/projects">
            <Button variant="link" className="text-primary hover:text-indigo-700">
              View all
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {safeProjects.slice(0, 4).map((project) => {
            const primaryPreview =
              project.thumbnailUrl || project.originalImageUrl || undefined;
            const createdAt = formatRelativeDate(parseCreatedAt(project.createdAt));
            const hasMockups = hasMockupImages(project);
            const hasEtsyListing =
              typeof project.hasEtsyListing === "boolean"
                ? project.hasEtsyListing
                : (() => {
                    const listing = project.etsyListing;
                    if (!listing) {
                      return false;
                    }
                    if (typeof listing === "object") {
                      return Object.keys(listing as Record<string, unknown>).length > 0;
                    }
                    return false;
                  })();
            const hasUpscaled =
              typeof project.hasUpscaledImage === "boolean"
                ? project.hasUpscaledImage
                : Boolean(project.upscaledImageUrl);

            return (
              <div
                key={project.id}
                className="group cursor-pointer"
                onClick={() => onViewProject(project.id)}
              >
                <div className="aspect-w-16 aspect-h-10 bg-gray-100 rounded-lg overflow-hidden mb-3">
                  {primaryPreview ? (
                    <img
                      src={primaryPreview}
                      alt={project.title}
                      className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                  ) : (
                    <div className="w-full h-32 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                      <span className="text-gray-400 text-sm">No preview</span>
                    </div>
                  )}
                </div>
                <h4 className="font-medium text-gray-900 text-sm truncate mb-1">
                  {project.title}
                </h4>

                <div className="mb-2 flex flex-wrap gap-1">
                  {project.status === "completed" && (
                    <>
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-blue-100 text-blue-700">
                        dY",
                      </span>
                      {hasUpscaled && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-green-100 text-green-700">
                          dY"?
                        </span>
                      )}
                      {hasMockups && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-purple-100 text-purple-700">
                          dY-��,?
                        </span>
                      )}
                      {hasResizedImages(project) && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-orange-100 text-orange-700">
                          dY"?
                        </span>
                      )}
                      {hasEtsyListing && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-pink-100 text-pink-700">
                          dY"?
                        </span>
                      )}
                    </>
                  )}
                  {project.status === "ai-generated" && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-purple-100 text-purple-700">
                      dY-
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500">{createdAt}</p>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      project.status === "completed"
                        ? "bg-green-100 text-green-800"
                        : project.status === "ai-generated"
                          ? "bg-purple-100 text-purple-800"
                          : project.status === "processing"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {project.status === "ai-generated"
                      ? "AI Generated"
                      : project.status === "completed"
                        ? "Ready"
                        : project.status === "processing"
                          ? "Processing"
                          : project.status}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

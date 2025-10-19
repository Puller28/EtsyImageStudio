import { ReactNode, useEffect, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { LayoutDashboard, Grid, ImageUp, Package, Layers, FileText, Workflow, Bell, Menu, Coins, LogOut, Settings, Sparkles, Scissors, FolderOpen, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/contexts/workspace-context";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import type { Project, User } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ModeToggle } from "./mode-toggle";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { WorkspaceMode } from "@/types/workspace";

function formatProjectDisplayName(rawTitle: string | null | undefined): string {
  if (!rawTitle) {
    return "Untitled project";
  }

  const normalized = rawTitle.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "Untitled project";
  }

  const shouldTitleCase = normalized === normalized.toLowerCase() || /[_-]/.test(rawTitle);
  if (!shouldTitleCase) {
    return normalized;
  }

  return normalized
    .split(" ")
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : ""))
    .join(" ");
}

interface AppShellProps {
  children: ReactNode;
}

interface NavItem {
  label: string;
  href: string;
  icon: ReactNode;
}

const navItems: NavItem[] = [
  { label: "Workspace", href: "/workspace", icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: "Projects", href: "/workspace/projects", icon: <Grid className="h-4 w-4" /> },
  { label: "Generate AI Art", href: "/tools/generate", icon: <Sparkles className="h-4 w-4" /> },
  { label: "Upscale", href: "/tools/upscale", icon: <ImageUp className="h-4 w-4" /> },
  { label: "Background Removal", href: "/tools/background-removal", icon: <Scissors className="h-4 w-4" /> },
  { label: "Mockups", href: "/tools/mockups", icon: <Package className="h-4 w-4" /> },
  { label: "Print Formats", href: "/tools/print-formats", icon: <Layers className="h-4 w-4" /> },
  { label: "Listings", href: "/tools/listing", icon: <FileText className="h-4 w-4" /> },
  { label: "Workflow", href: "/workflow", icon: <Workflow className="h-4 w-4" /> },
  { label: "Buy Credits", href: "/buy-credits", icon: <Coins className="h-4 w-4" /> },
];

export function AppShell({ children }: AppShellProps) {
  const { user: authUser, logout } = useAuth();
  const { mode, setMode, selectedProjectId, setSelectedProjectId } = useWorkspace();
  const [location, navigate] = useLocation();

  const NO_PROJECT_VALUE = "__no_project__";

  // Fetch live user data from API to get current credits
  const { data: apiUser } = useQuery<User>({
    queryKey: ["/api/user"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/user");
      return res.json();
    },
    staleTime: 10_000, // Refresh every 10 seconds
  });

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/projects");
      return res.json() as Promise<Project[]>;
    },
    staleTime: 30_000,
  });

  // Use API user data for credits (live), fallback to auth user
  const user = apiUser || authUser;
  const credits = user?.credits ?? 0;
  const initials = useMemo(
    () => (user?.name ? user.name.split(" ").map((part) => part[0]).slice(0, 2).join("") : "U"),
    [user?.name]
  );

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? null,
    [projects, selectedProjectId]
  );

  const handleProjectChange = (projectId: string) => {
    if (projectId === NO_PROJECT_VALUE) {
      setSelectedProjectId(null);
    } else {
      setSelectedProjectId(projectId);
    }
  };

  useEffect(() => {
    if (location.startsWith("/workflow")) {
      if (mode !== "workflow") {
        setMode("workflow");
      }
    } else if (mode !== "tools") {
      setMode("tools");
    }
  }, [location, mode, setMode]);

  const handleModeChange = (nextMode: WorkspaceMode) => {
    if (nextMode === mode) {
      return;
    }

    setMode(nextMode);

    if (nextMode === "workflow") {
      if (!location.startsWith("/workflow")) {
        navigate("/workflow");
      }
    } else {
      if (location.startsWith("/workflow")) {
        navigate("/workspace");
      }
    }
  };

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="flex min-h-screen bg-slate-900">
      {/* Navigation rail */}
      <aside className="hidden lg:flex lg:w-60 xl:w-64 flex-col border-r border-slate-800 bg-slate-950/90">
        <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-800">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500 text-white text-lg font-semibold">
            EI
          </div>
          <div>
            <p className="text-sm font-semibold text-white tracking-wide">Etsy Art Studio</p>
            <p className="text-xs text-slate-400">Creative Workspace</p>
          </div>
        </div>

        <ScrollArea className="flex-1 px-3 py-6">
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = location === item.href;
              return (
                <Link href={item.href} key={item.href}>
                  <div
                    className={cn(
                      "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition cursor-pointer",
                      isActive
                        ? "bg-indigo-500/20 text-indigo-100"
                        : "text-slate-300 hover:bg-slate-800 hover:text-white"
                    )}
                  >
                    <span className={cn("flex h-8 w-8 items-center justify-center rounded-md", isActive ? "bg-indigo-500/40 text-indigo-100" : "bg-slate-800/60 text-slate-300")}>
                      {item.icon}
                    </span>
                    {item.label}
                  </div>
                </Link>
              );
            })}
          </nav>
        </ScrollArea>

        <div className="border-t border-slate-800 px-6 py-4 text-slate-300">
          <p className="text-xs uppercase tracking-wide text-slate-500">Credits</p>
          <p className="mt-1 text-lg font-semibold text-white">{credits}</p>
          <Link href="/buy-credits">
            <div className="mt-3 inline-flex h-9 items-center justify-center rounded-md border border-indigo-400/50 bg-indigo-500/20 px-3 text-xs font-medium text-indigo-100 hover:bg-indigo-500/30 cursor-pointer">
              Buy credits
            </div>
          </Link>
        </div>
      </aside>

      {/* Mobile rail button */}
      <button className="lg:hidden fixed top-4 left-4 z-50 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900/80 text-white backdrop-blur">
        <Menu className="h-5 w-5" />
      </button>

      {/* Main content */}
      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/80 backdrop-blur">
          <div className="flex h-16 items-center justify-between px-4 sm:px-6">
            <div className="flex items-center gap-4">
              <ModeToggle mode={mode} onModeChange={handleModeChange} />
              
              {/* Prominent Project Selector */}
              <div className="hidden sm:flex items-center gap-3 px-4 py-2 rounded-lg border-2 border-indigo-500/40 bg-indigo-500/10">
                <div className="flex items-center gap-2">
                  <FolderOpen className="h-5 w-5 text-indigo-400" />
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase tracking-wider text-indigo-300 font-semibold">Active Project</span>
                    <span className="text-xs text-slate-400 -mt-0.5">Drives all tools & features</span>
                  </div>
                </div>
                <div className="h-8 w-px bg-indigo-500/30" />
                <Select
                  value={selectedProjectId ?? NO_PROJECT_VALUE}
                  onValueChange={(value) => handleProjectChange(value)}
                >
                  <SelectTrigger
                    className="w-56 border-0 bg-transparent text-left text-slate-100 hover:bg-indigo-500/10 focus:ring-2 focus:ring-indigo-400/50 h-auto py-1"
                    title={selectedProject?.title ?? "No project selected"}
                  >
                    <SelectValue placeholder="Select a project..." />
                  </SelectTrigger>
                  <SelectContent className="min-w-[20rem] border-slate-700 bg-slate-900/95 text-slate-100">
                    <div className="px-3 py-2 border-b border-slate-700 bg-indigo-500/10">
                      <p className="text-xs font-semibold text-indigo-200">Choose Active Project</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">This project will be used across all tools</p>
                    </div>
                    <SelectItem value={NO_PROJECT_VALUE}>
                      <span className="text-sm text-slate-400 italic">No project selected</span>
                    </SelectItem>
                    {projects.map((project) => (
                      <SelectItem
                        key={project.id}
                        value={project.id}
                        className="text-slate-200 focus:bg-indigo-600/20 focus:text-indigo-200 data-[state=checked]:bg-indigo-600/25 data-[state=checked]:text-indigo-50 py-3"
                        title={project.title}
                      >
                        <div className="flex w-full items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-indigo-500/20 text-indigo-300">
                            <FolderOpen className="h-5 w-5" />
                          </div>
                          <div className="flex flex-col flex-1">
                            <span className="text-sm font-medium text-slate-100 truncate">
                              {formatProjectDisplayName(project.title)}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              Status: {project.status?.toUpperCase() || "PENDING"}
                            </span>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="icon"
                variant="ghost"
                className="h-9 w-9 text-slate-300 hover:text-white hover:bg-slate-800"
              >
                <Bell className="h-4 w-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="flex items-center gap-2 rounded-full px-1.5 text-slate-200 hover:bg-slate-800"
                  >
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={user?.avatar || undefined} alt={user?.name || "User avatar"} />
                      <AvatarFallback className="bg-indigo-500/80 text-sm font-semibold text-white">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden sm:block text-sm font-medium">{user?.name || "Account"}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-slate-900 border-slate-700 text-slate-200">
                  <div className="px-3 py-2">
                    <p className="text-sm font-semibold">{user?.name || "Workspace Member"}</p>
                    {user?.email && <p className="text-xs text-slate-400">{user.email}</p>}
                  </div>
                  <DropdownMenuSeparator className="bg-slate-700" />
                  <DropdownMenuItem asChild className="cursor-pointer focus:bg-slate-800">
                    <Link href="/settings">
                      <div className="flex w-full items-center gap-2">
                        <Settings className="h-4 w-4" />
                        Account settings
                      </div>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="cursor-pointer focus:bg-slate-800">
                    <Link href="/contact">
                      <div className="flex w-full items-center gap-2">
                        <HelpCircle className="h-4 w-4" />
                        Help & Support
                      </div>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-slate-700" />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="text-red-400 focus:text-red-400 focus:bg-slate-800 cursor-pointer"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <main className="flex-1 bg-slate-900/80 text-slate-100">
          {children}
        </main>
      </div>
    </div>
  );
}

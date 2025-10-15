import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, CheckCircle2, AlertCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";

type TemplateSummary = {
  room: string;
  templateId: string;
  manifest: {
    width: number;
    height: number;
    corners: number[][];
    background: string;
  };
};

type TemplateInfo = {
  id: string;
  room: string;
  name: string;
  width: number;
  height: number;
  preview_url?: string;
  description?: string;
  tags?: string | string[];
};

type TemplatesByRoom = Record<string, TemplateInfo[]>;

type FieldState<T> = [T, (value: T) => void];

function useField<T>(initial: T): FieldState<T> {
  const [value, setValue] = useState<T>(initial);
  return [value, setValue];
}

export default function TemplateCreatePage() {
  const { toast } = useToast();
  const { isAuthenticated, token, user } = useAuth();
  const templateAdminEmail = "leon.lodewyks@gmail.com";
  const isTemplateAdmin =
    isAuthenticated &&
    !!user?.email &&
    user.email.toLowerCase() === templateAdminEmail.toLowerCase();
  const canDeleteTemplates = isTemplateAdmin && Boolean(token);

  useEffect(() => {
    const metaName = "robots";
    const existingMeta = document.querySelector<HTMLMetaElement>(
      `meta[name="${metaName}"]`,
    );
    if (existingMeta) {
      existingMeta.setAttribute("content", "noindex,nofollow");
    } else {
      const newMeta = document.createElement("meta");
      newMeta.setAttribute("name", metaName);
      newMeta.setAttribute("content", "noindex,nofollow");
      document.head.appendChild(newMeta);
    }

    return () => {
      const meta = document.querySelector<HTMLMetaElement>(
        `meta[name="${metaName}"]`,
      );
      if (meta) {
        meta.remove();
      }
    };
  }, []);
  const [room, setRoom] = useField("living_room");
  const [templateId, setTemplateId] = useField("");
  const [name, setName] = useField("");
  const [description, setDescription] = useField("");
  const [tags, setTags] = useField("");
  const [blendMode, setBlendMode] = useField("normal");
  const [blendOpacity, setBlendOpacity] = useField("1.0");
  const [featherPx, setFeatherPx] = useField("1");
  const [padInsetPx, setPadInsetPx] = useField("0");
  const [overwrite, setOverwrite] = useState(false);

  const [backgroundFile, setBackgroundFile] = useState<File | null>(null);
  const [maskFile, setMaskFile] = useState<File | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<TemplateSummary | null>(null);

  const [backgroundPreview, setBackgroundPreview] = useState<string | null>(null);
  const [maskPreview, setMaskPreview] = useState<string | null>(null);

  const [templatesByRoom, setTemplatesByRoom] = useState<TemplatesByRoom>({});
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [templatesError, setTemplatesError] = useState<string | null>(null);
  const [deletingTemplates, setDeletingTemplates] = useState<Set<string>>(new Set());

  const markTemplateDeleting = useCallback((key: string, isDeleting: boolean) => {
    setDeletingTemplates((prev) => {
      const next = new Set(prev);
      if (isDeleting) {
        next.add(key);
      } else {
        next.delete(key);
      }
      return next;
    });
  }, []);

  const loadTemplates = useCallback(
    async (showErrorToast = false) => {
      try {
        setTemplatesError(null);
        setIsLoadingTemplates(true);
        const response = await fetch("/api/templates", {
          method: "GET",
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache",
          },
        });
        if (!response.ok) {
          throw new Error(`Failed to load templates (${response.status})`);
        }
        const data = (await response.json()) as { rooms?: TemplatesByRoom };
        setTemplatesByRoom(data.rooms ?? {});
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to load templates";
        setTemplatesError(message);
        if (showErrorToast) {
          toast({
            title: "Could not load templates",
            description: message,
            variant: "destructive",
          });
        }
      } finally {
        setIsLoadingTemplates(false);
      }
    },
    [toast],
  );

  const templateRooms = useMemo(
    () =>
      Object.entries(templatesByRoom).sort(([roomA], [roomB]) =>
        roomA.localeCompare(roomB),
      ),
    [templatesByRoom],
  );

  useEffect(() => {
    if (backgroundFile) {
      const url = URL.createObjectURL(backgroundFile);
      setBackgroundPreview(url);
      return () => URL.revokeObjectURL(url);
    }
    setBackgroundPreview(null);
  }, [backgroundFile]);

  useEffect(() => {
    if (maskFile) {
      const url = URL.createObjectURL(maskFile);
      setMaskPreview(url);
      return () => URL.revokeObjectURL(url);
    }
    setMaskPreview(null);
  }, [maskFile]);

  useEffect(() => {
    if (isTemplateAdmin) {
      void loadTemplates();
    } else {
      setTemplatesByRoom({});
    }
  }, [isTemplateAdmin, loadTemplates]);

  const cornersPreview = useMemo(() => {
    if (!result) return [];
    return result.manifest.corners.map(([x, y], index) => ({
      label: ["TL", "TR", "BR", "BL"][index] ?? `P${index + 1}`,
      x,
      y,
    }));
  }, [result]);

  const handleFileSelect = (
    setter: (file: File | null) => void,
    fileList: FileList | null,
  ) => {
    const file = fileList && fileList.length > 0 ? fileList[0] : null;
    setter(file);
  };

  const handleDeleteTemplate = async (roomName: string, templateIdValue: string) => {
    if (!isAuthenticated || !token) {
      toast({
        title: "Login required",
        description: "You need to be signed in to delete templates.",
        variant: "destructive",
      });
      return;
    }

    if (!isTemplateAdmin) {
      toast({
        title: "Access denied",
        description: "You are not authorized to delete templates.",
        variant: "destructive",
      });
      return;
    }

    const key = `${roomName}/${templateIdValue}`;
    const confirmed = window.confirm(
      `Are you sure you want to delete the template ${key}? This will remove the manifest and images from disk.`,
    );

    if (!confirmed) {
      return;
    }

    markTemplateDeleting(key, true);

    try {
      const response = await fetch(
        `/api/templates/${encodeURIComponent(roomName)}/${encodeURIComponent(templateIdValue)}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        let message = `Failed to delete template (${response.status})`;
        try {
          const json = (await response.json()) as { error?: string };
          if (json?.error) {
            message = json.error;
          }
        } catch {
          // ignore body parse errors
        }
        throw new Error(message);
      }

      setTemplatesByRoom((prev) => {
        const next: TemplatesByRoom = { ...prev };
        const roomTemplates = next[roomName]?.filter((template) => template.id !== templateIdValue);
        if (roomTemplates && roomTemplates.length > 0) {
          next[roomName] = roomTemplates;
        } else {
          delete next[roomName];
        }
        return next;
      });

      toast({
        title: "Template deleted",
        description: `${key} removed successfully.`,
      });

      await loadTemplates(true);
    } catch (error) {
      console.error("Template delete failed:", error);
      toast({
        title: "Deletion failed",
        description:
          error instanceof Error ? error.message : "Unable to delete template. Try again later.",
        variant: "destructive",
      });
    } finally {
      markTemplateDeleting(key, false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isAuthenticated || !token) {
      toast({
        title: "Login required",
        description: "You need to be signed in to create templates.",
        variant: "destructive",
      });
      return;
    }
    if (!isTemplateAdmin) {
      toast({
        title: "Access denied",
        description: "You are not authorized to create templates.",
        variant: "destructive",
      });
      return;
    }
    if (!backgroundFile || !maskFile) {
      toast({
        title: "Files required",
        description: "Please provide both a background image and a mask.",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append("room", room);
    if (templateId.trim()) formData.append("templateId", templateId.trim());
    if (name.trim()) formData.append("name", name.trim());
    if (description.trim()) formData.append("description", description.trim());
    if (tags.trim()) formData.append("tags", tags.trim());
    formData.append("background", backgroundFile);
    formData.append("mask", maskFile);
    formData.append("overwrite", overwrite ? "true" : "false");
    formData.append("blendMode", blendMode);
    formData.append("blendOpacity", blendOpacity);
    formData.append("featherPx", featherPx);
    formData.append("padInsetPx", padInsetPx);

    setIsSubmitting(true);
    setResult(null);

    try {
      const response = await fetch("/api/templates/create", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
        credentials: "include",
      });

      const json = (await response.json()) as any;

      if (!response.ok || !json.success) {
        throw new Error(json.error || "Template creation failed");
      }

      setResult({
        room: json.room,
        templateId: json.templateId,
        manifest: {
          width: json.manifest.width,
          height: json.manifest.height,
          corners: json.manifest.corners,
          background: json.manifest.background,
        },
      });

      toast({
        title: "Template saved",
        description: `Template ${json.room}/${json.templateId} is ready to use.`,
      });

      await loadTemplates(true);
    } catch (error) {
      console.error("Template create failed:", error);
      toast({
        title: "Creation failed",
        description:
          error instanceof Error ? error.message : "Unable to create template. Try again later.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-16">
        <Card>
          <CardHeader>
            <CardTitle>Restricted Access</CardTitle>
            <CardDescription>
              You must be signed in with the authorized account to manage mockup templates.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Please log in using the administrator account to continue.
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isTemplateAdmin) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-16">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              This page is restricted to the template administration account.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              If you believe you should have access, please contact the administrator at
              leon.lodewyks@gmail.com.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 space-y-2">
        <h1 className="text-3xl font-bold">Template Builder</h1>
        <p className="text-muted-foreground">
          Upload a background scene and a matching mask (showing the frame area) to build a reusable
          mockup template. Corners are detected automatically, and the manifest is created for you.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[420px,1fr]">
        <Card className="self-start">
          <form onSubmit={handleSubmit}>
            <CardHeader>
              <CardTitle>Template Details</CardTitle>
              <CardDescription>
                Provide identifiers and styling info. Room and template ID determine where the files
                are stored.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label htmlFor="room">Room category</Label>
                  <Input
                    id="room"
                    value={room}
                    onChange={(event) => setRoom(event.target.value)}
                    placeholder="living_room"
                  />
                </div>
                <div>
                  <Label htmlFor="templateId">Template ID</Label>
                  <Input
                    id="templateId"
                    value={templateId}
                    onChange={(event) => setTemplateId(event.target.value)}
                    placeholder="optional (auto-generated if blank)"
                  />
                </div>
                <div>
                  <Label htmlFor="name">Display name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Cozy Living Room Above Sofa"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="Shown over a plush sofa with neutral wall tones."
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="tags">Tags</Label>
                  <Input
                    id="tags"
                    value={tags}
                    onChange={(event) => setTags(event.target.value)}
                    placeholder="living-room, cozy, neutral"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Comma-separated keywords for search and filtering.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label>Background image</Label>
                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById("background-file")?.click()}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      Choose file
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      {backgroundFile ? backgroundFile.name : "No file selected"}
                    </span>
                  </div>
                  <Input
                    id="background-file"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => handleFileSelect(setBackgroundFile, event.target.files)}
                  />
                </div>

                <div>
                  <Label>Mask image</Label>
                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById("mask-file")?.click()}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      Choose file
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      {maskFile ? maskFile.name : "No file selected"}
                    </span>
                  </div>
                  <Input
                    id="mask-file"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => handleFileSelect(setMaskFile, event.target.files)}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Use a white polygon over the frame area and black elsewhere. The system resizes
                    to match the background.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="blendMode">Blend mode</Label>
                  <Input
                    id="blendMode"
                    value={blendMode}
                    onChange={(event) => setBlendMode(event.target.value)}
                    placeholder="normal"
                  />
                </div>
                <div>
                  <Label htmlFor="blendOpacity">Blend opacity</Label>
                  <Input
                    id="blendOpacity"
                    value={blendOpacity}
                    onChange={(event) => setBlendOpacity(event.target.value)}
                    placeholder="1.0"
                  />
                </div>
                <div>
                  <Label htmlFor="featherPx">Feather px</Label>
                  <Input
                    id="featherPx"
                    value={featherPx}
                    onChange={(event) => setFeatherPx(event.target.value)}
                    placeholder="1"
                  />
                </div>
                <div>
                  <Label htmlFor="padInsetPx">Pad inset px</Label>
                  <Input
                    id="padInsetPx"
                    value={padInsetPx}
                    onChange={(event) => setPadInsetPx(event.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between rounded border px-3 py-2">
                <div>
                  <p className="text-sm font-medium">Overwrite existing template</p>
                  <p className="text-xs text-muted-foreground">
                    Enable to replace an existing template with the same room/ID.
                  </p>
                </div>
                <Switch checked={overwrite} onCheckedChange={setOverwrite} />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating template…
                  </>
                ) : (
                  "Create template"
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Preview</CardTitle>
              <CardDescription>
                Ensure the background and mask align. Corners are detected automatically.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="mb-2 text-sm font-semibold">Background</p>
                  {backgroundPreview ? (
                    <img
                      src={backgroundPreview}
                      alt="Background preview"
                      className="w-full rounded border object-cover"
                    />
                  ) : (
                    <div className="flex h-40 items-center justify-center rounded border border-dashed text-sm text-muted-foreground">
                      Select a background image
                    </div>
                  )}
                </div>
                <div>
                  <p className="mb-2 text-sm font-semibold">Mask</p>
                  {maskPreview ? (
                    <img
                      src={maskPreview}
                      alt="Mask preview"
                      className="w-full rounded border object-cover"
                    />
                  ) : (
                    <div className="flex h-40 items-center justify-center rounded border border-dashed text-sm text-muted-foreground">
                      Select a mask image
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Existing Templates</CardTitle>
              <CardDescription>
                Review previously created templates and delete ones you no longer need.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoadingTemplates ? (
                <div className="flex h-32 flex-col items-center justify-center text-muted-foreground">
                  <Loader2 className="mb-2 h-5 w-5 animate-spin" />
                  Loading templates…
                </div>
              ) : templatesError ? (
                <div className="space-y-3 rounded border border-destructive/40 bg-destructive/10 p-4">
                  <div className="flex items-center gap-2 text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm font-semibold">Unable to load templates</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{templatesError}</p>
                  <Button size="sm" variant="outline" onClick={() => void loadTemplates(true)}>
                    Retry
                  </Button>
                </div>
              ) : templateRooms.length > 0 ? (
                <div className="space-y-6">
                  {templateRooms.map(([roomName, roomTemplates]) => (
                    <div key={roomName} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                          {roomName.replace(/_/g, " ")}
                        </h3>
                        <Badge variant="outline">{roomTemplates.length}</Badge>
                      </div>
                      <div className="space-y-2">
                        {roomTemplates.map((template) => {
                          const key = `${roomName}/${template.id}`;
                          const isDeleting = deletingTemplates.has(key);
                          const tagList =
                            Array.isArray(template.tags)
                              ? template.tags
                              : typeof template.tags === "string"
                                ? template.tags
                                    .split(",")
                                    .map((tag) => tag.trim())
                                    .filter(Boolean)
                                : [];
                          return (
                            <div
                              key={key}
                              className="flex flex-col gap-3 rounded border bg-background p-3 md:flex-row md:items-center md:justify-between"
                            >
                              <div className="space-y-1">
                                <p className="text-sm font-medium text-foreground">{template.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {template.id} · {template.width} × {template.height}
                                </p>
                                {template.description && (
                                  <p className="text-xs text-muted-foreground">{template.description}</p>
                                )}
                                {tagList.length > 0 && (
                                  <div className="flex flex-wrap gap-1 pt-1">
                                    {tagList.map((tag) => (
                                      <Badge key={tag} variant="secondary" className="text-[10px]">
                                        {tag}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center justify-end gap-2">
                                {template.preview_url && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      window.open(template.preview_url, "_blank", "noopener,noreferrer")
                                    }
                                  >
                                    Preview
                                  </Button>
                                )}
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  disabled={!canDeleteTemplates || isDeleting}
                                  onClick={() => void handleDeleteTemplate(roomName, template.id)}
                                >
                                  {isDeleting ? (
                                    <>
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                      Deleting…
                                    </>
                                  ) : (
                                    "Delete"
                                  )}
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No templates found yet. Create your first template using the form.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Result</CardTitle>
              <CardDescription>
                Template details appear here once the manifest has been saved.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isSubmitting && (
                <div className="flex h-32 flex-col items-center justify-center text-muted-foreground">
                  <Loader2 className="mb-2 h-5 w-5 animate-spin" />
                  Saving template…
                </div>
              )}

              {!isSubmitting && result && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span>
                      Template{" "}
                      <span className="font-medium text-foreground">
                        {result.room}/{result.templateId}
                      </span>{" "}
                      saved successfully.
                    </span>
                  </div>
                  <div className="grid gap-2 text-sm">
                    <div>
                      <span className="font-semibold">Canvas:</span>{" "}
                      {result.manifest.width} × {result.manifest.height}
                    </div>
                    <div>
                      <span className="font-semibold">Background:</span>{" "}
                      {result.manifest.background}
                    </div>
                  </div>
                  <div>
                    <p className="mb-1 text-sm font-semibold">Detected corners</p>
                    <ScrollArea className="h-24 rounded border">
                      <ul className="space-y-1 p-3 text-sm">
                        {cornersPreview.map((corner) => (
                          <li key={corner.label} className="flex items-center justify-between">
                            <Badge variant="outline">{corner.label}</Badge>
                            <span>
                              {Math.round(corner.x)}, {Math.round(corner.y)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </ScrollArea>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Corners are ordered TL, TR, BR, BL. Adjust the mask if the ordering looks
                      incorrect.
                    </p>
                  </div>
                </div>
              )}

              {!isSubmitting && !result && (
                <div className="flex h-32 flex-col items-center justify-center text-muted-foreground">
                  <AlertCircle className="mb-2 h-5 w-5" />
                  Submit a background and mask to generate a template manifest.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

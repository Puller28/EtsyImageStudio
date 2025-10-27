import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from 'wouter';
import { Trash2, Eye, EyeOff, Search } from 'lucide-react';

interface AdminTemplate {
  id: string;
  name: string;
  category: string;
  thumbnail_url: string;
  is_active: boolean;
  width?: number;
  height?: number;
  created_at?: string;
  room?: string;
  type: 'psd' | 'perspective';
  supportsToggle: boolean;
  supportsDelete: boolean;
  source?: string;
}

interface TemplateSummary {
  total: number;
  psd: number;
  perspective: number;
}

export default function AdminTemplates() {
  const [templates, setTemplates] = useState<AdminTemplate[]>([]);
  const [summary, setSummary] = useState<TemplateSummary>({ total: 0, psd: 0, perspective: 0 });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  const { user, token, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (user && !user.isAdmin) {
      toast({
        title: 'Access denied',
        description: 'Admin privileges are required to manage templates.',
        variant: 'destructive',
      });
      setLocation('/');
    }
  }, [user, toast, setLocation]);

  const fetchTemplates = useCallback(async () => {
    if (!token) {
      return;
    }

    try {
      setLoading(true);

      const response = await fetch('/api/admin/psd-templates', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch templates');
      
      const data = await response.json();
      setTemplates(data.templates || []);
      if (data.summary) {
        setSummary({
          total: data.summary.total ?? (data.templates?.length ?? 0),
          psd: data.summary.psd ?? 0,
          perspective: data.summary.perspective ?? 0,
        });
      } else {
        const total = data.templates?.length ?? 0;
        const psdCount = (data.templates || []).filter((t: AdminTemplate) => t.type === 'psd').length;
        setSummary({
          total,
          psd: psdCount,
          perspective: total - psdCount,
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load templates',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [token, toast]);

  useEffect(() => {
    if (token) {
      fetchTemplates();
    } else if (!isAuthenticated) {
      setLoading(false);
    }
  }, [token, isAuthenticated, fetchTemplates]);

  const toggleActive = async (id: string, currentStatus: boolean) => {
    const template = templates.find(t => t.id === id);
    if (!template?.supportsToggle) {
      toast({
        title: 'Not supported',
        description: 'Only PSD templates can be enabled or disabled here.',
        variant: 'destructive'
      });
      return;
    }

    if (!token) {
      toast({
        title: 'Authentication required',
        description: 'Please log in again to manage templates.',
        variant: 'destructive'
      });
      return;
    }

    try {
      const response = await fetch(`/api/admin/psd-templates/${id}/toggle`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_active: !currentStatus })
      });

      if (!response.ok) throw new Error('Failed to update template');

      setTemplates(prev => prev.map(t => (t.id === id ? { ...t, is_active: !currentStatus } : t)));

      toast({
        title: 'Success',
        description: `${template.name} ${!currentStatus ? 'enabled' : 'disabled'}`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update template',
        variant: 'destructive'
      });
    }
  };

  const deleteTemplate = async (id: string) => {
    const template = templates.find(t => t.id === id);
    if (!template?.supportsDelete) {
      toast({
        title: 'Not supported',
        description: 'Only PSD templates can be deleted from this page.',
        variant: 'destructive'
      });
      return;
    }

    if (!token) {
      toast({
        title: 'Authentication required',
        description: 'Please log in again to manage templates.',
        variant: 'destructive'
      });
      return;
    }

    if (!confirm('Are you sure you want to delete this template? This cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/psd-templates/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to delete template');

      setTemplates(prev => prev.filter(t => t.id !== id));

      toast({
        title: 'Template deleted',
        description: 'The template has been removed.'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete template',
        variant: 'destructive'
      });
    }
  };

  const loweredSearch = searchTerm.toLowerCase();
  const filteredTemplates = templates.filter(t => 
    t.name.toLowerCase().includes(loweredSearch) ||
    t.id.toLowerCase().includes(loweredSearch) ||
    (t.category?.toLowerCase().includes(loweredSearch)) ||
    (t.room?.toLowerCase().includes(loweredSearch))
  );

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Loading templates...</div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-semibold">Sign in required</h2>
          <p className="text-muted-foreground">
            You need to be logged in with an admin account to manage templates.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Manage Mockup Templates</h1>
        <p className="text-muted-foreground">
          Review all template sources. PSD templates can be enabled, disabled, or deleted from here.
        </p>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
        <span>Total: {summary.total}</span>
        <span>PSD: {summary.psd}</span>
        <span>Perspective: {summary.perspective}</span>
        <span>Active: {templates.filter(t => t.is_active).length}</span>
        <span>Inactive: {templates.filter(t => !t.is_active).length}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredTemplates.map((template) => (
          <Card key={template.id} className="p-4">
            <div className="aspect-square mb-3 bg-gray-100 rounded-lg overflow-hidden">
              <img
                src={template.thumbnail_url}
                alt={template.name}
                className="w-full h-full object-cover"
              />
            </div>
            
            <div className="space-y-2">
              <div>
                <h3 className="font-semibold text-sm truncate" title={template.name}>
                  {template.name}
                </h3>
                <p className="text-xs text-muted-foreground truncate" title={template.id}>
                  {template.id}
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <Badge variant={template.type === 'psd' ? 'default' : 'secondary'} className="capitalize">
                  {template.type}
                </Badge>
                <span className="text-muted-foreground truncate">{template.category}</span>
                {template.room && (
                  <span className="text-muted-foreground truncate">{template.room.replace(/_/g, ' ')}</span>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className={`px-2 py-1 rounded-full ${
                  template.is_active 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-gray-100 text-gray-700'
                }`}>
                  {template.is_active ? 'Active' : 'Inactive'}
                </span>
                <span>{template.source === 'supabase' ? 'Supabase' : 'Local'}</span>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  disabled={!template.supportsToggle}
                  onClick={() => toggleActive(template.id, template.is_active)}
                >
                  {template.is_active ? (
                    <>
                      <EyeOff className="h-4 w-4 mr-1" />
                      Disable
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4 mr-1" />
                      Enable
                    </>
                  )}
                </Button>
                
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={!template.supportsDelete}
                  onClick={() => deleteTemplate(template.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No templates found
        </div>
      )}
    </div>
  );
}



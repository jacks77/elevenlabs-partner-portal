import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { Shield, RefreshCw, AlertTriangle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface SecurityAuditEntry {
  id: string;
  user_id: string | null;
  action: string;
  details: any;
  ip_address: unknown;
  user_agent: string | null;
  created_at: string;
}

export function SecurityAuditLog() {
  const { profile } = useAuth();
  const [auditLog, setAuditLog] = useState<SecurityAuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const isSuperAdmin = profile?.is_super_admin;

  useEffect(() => {
    if (isSuperAdmin) {
      fetchAuditLog();
    }
  }, [isSuperAdmin]);

  const fetchAuditLog = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('security_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setAuditLog(data || []);
    } catch (error: any) {
      console.error('Error fetching audit log:', error);
      toast({
        variant: "destructive",
        title: "Error loading audit log",
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const getActionBadgeVariant = (action: string) => {
    if (action.includes('unauthorized') || action.includes('failed')) {
      return 'destructive';
    }
    if (action.includes('created') || action.includes('updated')) {
      return 'default';
    }
    if (action.includes('deleted')) {
      return 'secondary';
    }
    return 'outline';
  };

  const getActionIcon = (action: string) => {
    if (action.includes('unauthorized') || action.includes('failed')) {
      return <AlertTriangle className="h-3 w-3" />;
    }
    return <Shield className="h-3 w-3" />;
  };

  if (!isSuperAdmin) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground text-center">
            Access denied. Super admin privileges required.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <Shield className="h-5 w-5 mr-2" />
            Security Audit Log
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchAuditLog}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : auditLog.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">
            No security events recorded.
          </p>
        ) : (
          <div className="space-y-4">
            {auditLog.map((entry) => (
              <div key={entry.id} className="border rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <Badge 
                    variant={getActionBadgeVariant(entry.action)}
                    className="flex items-center gap-1"
                  >
                    {getActionIcon(entry.action)}
                    {entry.action.replace(/_/g, ' ').toUpperCase()}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                  </span>
                </div>
                
                <div className="text-sm space-y-1">
                  {entry.user_id && (
                    <p><strong>User ID:</strong> {entry.user_id}</p>
                  )}
                  {entry.ip_address && (
                    <p><strong>IP Address:</strong> {String(entry.ip_address)}</p>
                  )}
                  {entry.details && (
                    <div>
                      <strong>Details:</strong>
                      <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-auto">
                        {JSON.stringify(entry.details, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
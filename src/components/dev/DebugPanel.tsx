import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bug, X, User, Route as RouteIcon, Database, Zap, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'react-router-dom';

export const DebugPanel = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();
  const location = useLocation();

  if (!import.meta.env.DEV) return null;

  return (
    <>
      {/* Toggle Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 z-50 rounded-full w-12 h-12 p-0 shadow-lg"
        variant="secondary"
      >
        <Bug className="h-5 w-5" />
      </Button>

      {/* Debug Panel */}
      {isOpen && (
        <Card className="fixed bottom-20 right-4 z-50 w-96 max-h-[600px] overflow-auto shadow-2xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-bold">Debug Panel</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="auth">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="auth">
                  <User className="h-4 w-4" />
                </TabsTrigger>
                <TabsTrigger value="route">
                  <RouteIcon className="h-4 w-4" />
                </TabsTrigger>
                <TabsTrigger value="storage">
                  <Database className="h-4 w-4" />
                </TabsTrigger>
                <TabsTrigger value="perf">
                  <Zap className="h-4 w-4" />
                </TabsTrigger>
              </TabsList>

              <TabsContent value="auth" className="space-y-2">
                <div className="text-sm">
                  <p className="font-semibold">Auth State:</p>
                  <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-auto">
                    {JSON.stringify(
                      {
                        authenticated: !!user,
                        userId: user?.id,
                        email: user?.email,
                      },
                      null,
                      2
                    )}
                  </pre>
                </div>
              </TabsContent>

              <TabsContent value="route" className="space-y-2">
                <div className="text-sm">
                  <p className="font-semibold">Current Route:</p>
                  <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-auto">
                    {JSON.stringify(
                      {
                        pathname: location.pathname,
                        search: location.search,
                        hash: location.hash,
                      },
                      null,
                      2
                    )}
                  </pre>
                </div>
              </TabsContent>

              <TabsContent value="storage" className="space-y-2">
                <div className="text-sm">
                  <p className="font-semibold">LocalStorage:</p>
                  <div className="mt-1 space-y-1">
                    {Object.keys(localStorage).slice(0, 5).map((key) => (
                      <div key={key} className="p-2 bg-muted rounded text-xs">
                        <span className="font-mono">{key}</span>
                      </div>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      localStorage.clear();
                      window.location.reload();
                    }}
                    className="w-full mt-2"
                  >
                    Clear & Reload
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="perf" className="space-y-2">
                <div className="text-sm">
                  <p className="font-semibold">Performance:</p>
                  <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-auto">
                    {JSON.stringify(
                      {
                        memory: (performance as any).memory
                          ? {
                              usedJSHeapSize: Math.round(
                                (performance as any).memory.usedJSHeapSize / 1048576
                              ) + ' MB',
                              totalJSHeapSize: Math.round(
                                (performance as any).memory.totalJSHeapSize / 1048576
                              ) + ' MB',
                            }
                          : 'Not available',
                        viewport: {
                          width: window.innerWidth,
                          height: window.innerHeight,
                        },
                      },
                      null,
                      2
                    )}
                  </pre>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      const { clientLogger } = await import('@/lib/logging/client-logger');
                      const { toast } = await import('sonner');
                      const testError = new Error('Test error from debug panel');
                      await clientLogger.error(testError, {
                        routeName: 'Debug Panel',
                        userAction: 'test_error_button',
                        severity: 'low',
                        metadata: {
                          test: true,
                          timestamp: new Date().toISOString(),
                        },
                      });
                      toast.success('Test error logged! Check /admin/user-logs');
                    }}
                    className="w-full mt-2"
                  >
                    <AlertCircle className="h-4 w-4 mr-2" />
                    Test Error Logging
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </>
  );
};

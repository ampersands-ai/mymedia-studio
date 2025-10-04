import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Settings = () => {
  useEffect(() => {
    document.title = "Settings - Artifio.ai";
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
      
      <div className="relative z-10 container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-4xl font-black gradient-text mb-8">Settings</h1>
        
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="pricing">Pricing</TabsTrigger>
            <TabsTrigger value="account">Account</TabsTrigger>
          </TabsList>
          
          <TabsContent value="general" className="space-y-4 mt-6">
            <Card className="p-6">
              <h3 className="text-xl font-bold mb-4">General Settings</h3>
              <p className="text-muted-foreground">General settings will be available here</p>
            </Card>
          </TabsContent>
          
          <TabsContent value="pricing" className="space-y-4 mt-6">
            <Card className="p-6">
              <h3 className="text-xl font-bold mb-4">Pricing & Subscription</h3>
              <p className="text-muted-foreground mb-4">
                Manage your subscription and view pricing options
              </p>
              <Link 
                to="/pricing"
                className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
              >
                View Pricing Plans
              </Link>
            </Card>
          </TabsContent>
          
          <TabsContent value="account" className="space-y-4 mt-6">
            <Card className="p-6">
              <h3 className="text-xl font-bold mb-4">Account Settings</h3>
              <p className="text-muted-foreground">Account settings will be available here</p>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Settings;

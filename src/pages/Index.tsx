import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const Index = () => {
  const { user, memberships, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  // Redirect authenticated users with approved membership to dashboard
  if (user && memberships.some(m => m.is_approved)) {
    return <Navigate to="/dashboard" replace />;
  }

  // Show landing page for non-authenticated users
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-subtle">
      <div className="text-center space-y-8 p-8">
        <div className="flex justify-center mb-8">
          <img 
            src="/lovable-uploads/1b3b5fc2-0efe-4db7-8f9b-e724e26f7c81.png" 
            alt="ElevenLabs Logo" 
            className="h-16 w-auto"
          />
        </div>
        <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          Partner Portal
        </h1>
        <p className="text-xl text-muted-foreground max-w-md">
          Access resources, content, and tools for your partnership journey.
        </p>
        <div className="flex gap-4 justify-center">
          <Button asChild variant="hero">
            <Link to="/sign-in">Sign In</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/request-access">Request Access</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;

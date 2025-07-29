import { Navigation } from './Navigation';
import { SocialFooter } from './SocialFooter';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />
      <main className="flex-1">
        {children}
      </main>
      <SocialFooter />
    </div>
  );
}
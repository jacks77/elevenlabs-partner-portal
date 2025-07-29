import React from 'react';
import { Button } from '@/components/ui/button';
import { ExternalLink, Github, Linkedin, MessageCircle, Youtube } from 'lucide-react';

const socialLinks = [
  {
    name: 'X (Twitter)',
    url: 'https://x.com/intent/user?screen_name=elevenlabsio',
    icon: ExternalLink,
    color: 'hover:text-blue-500'
  },
  {
    name: 'LinkedIn',
    url: 'https://www.linkedin.com/company/elevenlabsio',
    icon: Linkedin,
    color: 'hover:text-blue-600'
  },
  {
    name: 'GitHub',
    url: 'https://github.com/elevenlabs',
    icon: Github,
    color: 'hover:text-gray-800 dark:hover:text-gray-200'
  },
  {
    name: 'YouTube',
    url: 'https://www.youtube.com/@elevenlabsio?sub_confirmation=1',
    icon: Youtube,
    color: 'hover:text-red-600'
  },
  {
    name: 'Discord',
    url: 'https://discord.gg/elevenlabs',
    icon: MessageCircle,
    color: 'hover:text-indigo-600'
  }
];

export function SocialFooter() {
  return (
    <footer className="border-t border-border bg-background/50 backdrop-blur-sm mt-auto">
      <div className="container mx-auto px-6 py-8">
        <div className="flex flex-col items-center space-y-4">
          <h3 className="text-lg font-semibold">Connect with ElevenLabs</h3>
          <div className="flex flex-wrap justify-center gap-4">
            {socialLinks.map((social) => {
              const IconComponent = social.icon;
              return (
                <Button
                  key={social.name}
                  variant="ghost"
                  size="sm"
                  asChild
                  className={`flex items-center gap-2 transition-colors ${social.color}`}
                >
                  <a
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2"
                  >
                    <IconComponent className="h-4 w-4" />
                    {social.name}
                  </a>
                </Button>
              );
            })}
          </div>
          <p className="text-sm text-muted-foreground text-center">
            Stay connected for the latest updates and community discussions
          </p>
        </div>
      </div>
    </footer>
  );
}
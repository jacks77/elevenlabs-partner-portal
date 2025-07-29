import { useEffect, useRef } from 'react';

// Declare the custom element for TypeScript
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'elevenlabs-convai': {
        'agent-id': string;
        children?: React.ReactNode;
      };
    }
  }
}

interface ElevenLabsConvAIProps {
  agentId: string;
  className?: string;
}

export default function ElevenLabsConvAI({ agentId = "cjUmqmsP3wOtM6saX1Gg", className }: ElevenLabsConvAIProps) {
  const widgetRef = useRef<HTMLDivElement>(null);
  const scriptLoadedRef = useRef(false);

  useEffect(() => {
    // Check if script is already loaded
    if (document.querySelector('script[src*="convai-widget-embed"]')) {
      scriptLoadedRef.current = true;
      return;
    }

    // Create and load the script
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/@elevenlabs/convai-widget-embed';
    script.async = true;
    script.type = 'text/javascript';
    
    script.onload = () => {
      scriptLoadedRef.current = true;
      console.log('ElevenLabs ConvAI script loaded successfully');
    };

    script.onerror = () => {
      console.error('Failed to load ElevenLabs ConvAI script');
    };

    document.head.appendChild(script);

    // Cleanup function
    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  return (
    <div ref={widgetRef} className={className}>
      <elevenlabs-convai agent-id={agentId}></elevenlabs-convai>
    </div>
  );
}
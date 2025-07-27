import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export function useAnalytics() {
  const location = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    // Track page view when location changes
    if (user) {
      const trackPageView = async () => {
        try {
          await supabase
            .from('analytics_page_views')
            .insert({
              user_id: user.id,
              page: location.pathname
            });
        } catch (error) {
          console.error('Error tracking page view:', error);
        }
      };

      trackPageView();
    }
  }, [location, user]);

  const trackLinkClick = async (linkId: string) => {
    if (!user) return;
    
    try {
      await supabase
        .from('analytics_link_clicks')
        .insert({
          user_id: user.id,
          link_id: linkId
        });
    } catch (error) {
      console.error('Error tracking link click:', error);
    }
  };

  return {
    trackLinkClick
  };
}

import React, { useEffect, useRef } from 'react';
import { useSearchPreservation } from '@/context/SearchPreservationContext';

interface DashboardScrollPreserverProps {
  children: React.ReactNode;
  containerId: string;
  isVisible: boolean;
}

const DashboardScrollPreserver: React.FC<DashboardScrollPreserverProps> = ({ 
  children, 
  containerId,
  isVisible 
}) => {
  const { scrollPosition, setScrollPosition, lastViewedProfile } = useSearchPreservation();
  const initialScrollApplied = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastScrollPositionRef = useRef<number>(scrollPosition);
  const restorationAttempts = useRef(0);
  const maxRestorationAttempts = 5;

  // Save scroll position when scrolling or component unmounts
  useEffect(() => {
    if (!isVisible) return;
    
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const handleScroll = () => {
      // Debounce scroll position updates
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      
      scrollTimeoutRef.current = setTimeout(() => {
        const currentScrollTop = container.scrollTop;
        setScrollPosition(currentScrollTop);
        lastScrollPositionRef.current = currentScrollTop;
        console.log("Saved scroll position:", currentScrollTop);
      }, 100); // Increased debounce time for less frequent updates
    };
    
    // Set up scroll event listener
    container.addEventListener('scroll', handleScroll);
    
    // Save position before navigating away
    const handleBeforeUnload = () => {
      setScrollPosition(container.scrollTop);
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (container) {
        container.removeEventListener('scroll', handleScroll);
        
        // Save final position before unmounting
        setScrollPosition(container.scrollTop || lastScrollPositionRef.current);
      }
      
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [containerId, setScrollPosition, isVisible]);

  // Restore scroll position with multiple attempts if needed
  useEffect(() => {
    if (!isVisible || initialScrollApplied.current) return;

    const restoreScroll = () => {
      const container = document.getElementById(containerId);
      if (container && scrollPosition > 0) {
        console.log(`Restoring scroll position to: ${scrollPosition} (attempt ${restorationAttempts.current + 1})`);
        
        // Force layout calculation before setting scrollTop
        container.getBoundingClientRect();
        
        container.scrollTop = scrollPosition;
        
        restorationAttempts.current++;
        
        // Check if restoration was successful
        setTimeout(() => {
          if (Math.abs(container.scrollTop - scrollPosition) > 10 && 
              restorationAttempts.current < maxRestorationAttempts) {
            requestAnimationFrame(restoreScroll);
          } else {
            initialScrollApplied.current = true;
          }
        }, 50);
      } else {
        initialScrollApplied.current = true;
      }
    };

    // Try immediately
    restoreScroll();
    
    // Also try after a short delay and again after a longer delay
    const shortTimer = setTimeout(() => restoreScroll(), 100);
    const mediumTimer = setTimeout(() => restoreScroll(), 300);
    const longTimer = setTimeout(() => restoreScroll(), 800);

    return () => {
      clearTimeout(shortTimer);
      clearTimeout(mediumTimer);
      clearTimeout(longTimer);
    };
  }, [scrollPosition, containerId, isVisible]);

  // Reset the scroll restoration when tab changes or becomes visible
  useEffect(() => {
    if (!isVisible) {
      initialScrollApplied.current = false;
      restorationAttempts.current = 0;
    } else if (scrollPosition > 0) {
      // When tab becomes visible again, try to restore scroll
      const timer = setTimeout(() => {
        const container = document.getElementById(containerId);
        if (container) {
          console.log("Tab visible again, restoring scroll to:", scrollPosition);
          container.scrollTop = scrollPosition;
        }
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [isVisible, scrollPosition, containerId]);

  // Special handling for lastViewedProfile - scroll to that profile if available
  useEffect(() => {
    if (!isVisible || !lastViewedProfile) return;
    
    const timer = setTimeout(() => {
      const profileElement = document.getElementById(`profile-${lastViewedProfile}`);
      if (profileElement) {
        console.log("Scrolling to last viewed profile:", lastViewedProfile);
        profileElement.scrollIntoView({ behavior: 'auto', block: 'center' });
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, [lastViewedProfile, isVisible]);

  return <>{children}</>;
};

export default DashboardScrollPreserver;

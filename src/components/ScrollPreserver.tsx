
import { useEffect, useState, useRef } from "react";
import { useSearchPreservation } from "@/context/SearchPreservationContext";
import { useLocation } from "react-router-dom";

interface ScrollPreserverProps {
  children: React.ReactNode;
  containerId: string;
}

const ScrollPreserver = ({ children, containerId }: ScrollPreserverProps) => {
  const { scrollPosition, setScrollPosition } = useSearchPreservation();
  const location = useLocation();
  const [isInitialized, setIsInitialized] = useState(false);
  const scrollRestoredRef = useRef(false);
  const scrollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const restorationAttempts = useRef(0);
  const maxRestorationAttempts = 5;

  // Save scroll position when user navigates away
  useEffect(() => {
    const container = document.getElementById(containerId);
    if (!container) return;

    const handleScroll = () => {
      if (scrollTimerRef.current) {
        clearTimeout(scrollTimerRef.current);
      }
      
      scrollTimerRef.current = setTimeout(() => {
        const currentPos = container.scrollTop;
        setScrollPosition(currentPos);
        console.log("ScrollPreserver: Updated scroll position to:", currentPos);
      }, 100); // Increased from 50ms to 100ms for less frequent updates
    };

    container.addEventListener("scroll", handleScroll);
    
    return () => {
      container.removeEventListener("scroll", handleScroll);
      
      // Save final position before unmounting
      if (scrollTimerRef.current) {
        clearTimeout(scrollTimerRef.current);
      }
      setScrollPosition(container.scrollTop);
      console.log("ScrollPreserver: Saving final position before unmount:", container.scrollTop);
    };
  }, [containerId, setScrollPosition]);

  // Restore scroll position on return with multiple attempts if needed
  useEffect(() => {
    if (isInitialized || scrollRestoredRef.current) return;

    const restoreScroll = () => {
      const container = document.getElementById(containerId);
      if (container && scrollPosition > 0) {
        console.log(`ScrollPreserver: Restoring scroll position to: ${scrollPosition} (attempt ${restorationAttempts.current + 1})`);
        
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
            scrollRestoredRef.current = true;
            setIsInitialized(true);
          }
        }, 50);
      } else {
        scrollRestoredRef.current = true;
        setIsInitialized(true);
      }
    };
    
    // Try immediately
    restoreScroll();
    
    // Also try after delays for better chances of success when content is still loading
    const shortTimer = setTimeout(() => restoreScroll(), 100);
    const mediumTimer = setTimeout(() => restoreScroll(), 300);
    const longTimer = setTimeout(() => restoreScroll(), 800);

    return () => {
      clearTimeout(shortTimer);
      clearTimeout(mediumTimer);
      clearTimeout(longTimer);
    };
  }, [scrollPosition, containerId, isInitialized]);

  // Reset for new routes
  useEffect(() => {
    scrollRestoredRef.current = false;
    restorationAttempts.current = 0;
    setIsInitialized(false);
  }, [location.pathname]);

  return <>{children}</>;
};

export default ScrollPreserver;

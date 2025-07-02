
import { createContext, useContext, useEffect, useState } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

type Theme = 'dark' | 'light';

const ThemeContext = createContext<{
  theme: Theme;
  setTheme: (theme: Theme) => void;
}>({
  theme: 'light',
  setTheme: () => null,
});

// Helper function to check if we're on pages that should always use light theme
const shouldForceLightTheme = (pathname: string | null) => {
  if (!pathname) return false;
  return pathname === '/' || 
         pathname === '/login' || 
         pathname.startsWith('/signup') || 
         pathname === '/forgot-password' ||
         pathname === '/onboarding' ||
         pathname.startsWith('/onboarding/');
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Instead of directly using useLocation, we'll check if we're in a router context
  // by using a try-catch block
  let shouldUseLightTheme = false;
  let pathname = null;
  
  try {
    // This will throw an error if we're not in a router context
    const location = useLocation();
    pathname = location.pathname;
    shouldUseLightTheme = shouldForceLightTheme(pathname);
  } catch (error) {
    // If we're not in a router context, we assume we should use light theme
    shouldUseLightTheme = false;
  }
  
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('theme') as Theme;
      return stored || 'light';
    }
    return 'light';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    
    // Don't remove existing theme class while waiting for transitions
    if (shouldUseLightTheme) {
      root.classList.remove('dark');
      root.classList.add('light');
    } else {
      root.classList.remove('light', 'dark');
      // Add with a slight delay to ensure smooth transition
      setTimeout(() => {
        root.classList.add(theme);
      }, 10);
    }
    
    localStorage.setItem('theme', theme);
  }, [theme, shouldUseLightTheme]);

  return (
    <ThemeContext.Provider value={{ 
      theme: shouldUseLightTheme ? 'light' : theme, 
      setTheme 
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};


import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";
import { useLocation } from "react-router-dom";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  
  // Try to get location, but handle errors gracefully
  let shouldHideToggle = false;
  try {
    const location = useLocation();
    // Hide the toggle on index, login, signup, onboarding pages
    shouldHideToggle = location.pathname === '/' || 
                       location.pathname === '/login' || 
                       location.pathname.startsWith('/signup') ||
                       location.pathname === '/onboarding' ||
                       location.pathname.startsWith('/onboarding/') ||
                       location.pathname === '/forgot-password';
  } catch (error) {
    // If we can't access location, we assume we should show the toggle
    shouldHideToggle = false;
  }
  
  // Don't render the toggle on pages that should always use light theme
  if (shouldHideToggle) {
    return null;
  }

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="transition-colors duration-300"
    >
      {theme === "dark" ? (
        <Moon className="h-5 w-5" />
      ) : (
        <Sun className="h-5 w-5" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}


import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, RefreshCw, LogOut, HelpCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { cleanupAuthState } from "@/lib/sessionRecovery";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { useMobileNotification } from "@/hooks/use-mobile-notification";

interface UserRecoveryProps {
  onClose?: () => void;
  showCard?: boolean;
}

const UserRecovery = ({ onClose, showCard = true }: UserRecoveryProps) => {
  const { forceRecovery } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { showNotification } = useMobileNotification();
  const [isRecovering, setIsRecovering] = useState(false);

  const handleClearCache = () => {
    cleanupAuthState();
    if (isMobile) {
      showNotification("Browser cache cleared. Please try refreshing the page.", "success");
    } else {
      toast({
        title: "Cache Cleared",
        description: "Browser cache cleared. Please try refreshing the page.",
        variant: "default",
      });
    }
  };

  const handleForceRecovery = async () => {
    setIsRecovering(true);
    try {
      await forceRecovery();
    } catch (error) {
      console.error('Recovery failed:', error);
      if (isMobile) {
        showNotification("Recovery failed. Please contact support.", "error");
      } else {
        toast({
          title: "Recovery Failed",
          description: "Please contact support for assistance.",
          variant: "destructive",
        });
      }
    } finally {
      setIsRecovering(false);
    }
  };

  const handleRefreshPage = () => {
    window.location.reload();
  };

  const recoveryContent = (
    <div className="space-y-4">
      <div className="flex items-center justify-center mb-4">
        <AlertTriangle className="h-12 w-12 text-yellow-500" />
      </div>
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold">Having trouble?</h3>
        <p className="text-sm text-gray-600">
          If you're stuck in a login loop or experiencing issues, try these recovery options:
        </p>
      </div>
      <div className="space-y-3">
        <Button
          onClick={handleRefreshPage}
          variant="outline"
          className="w-full flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh Page
        </Button>
        <Button
          onClick={handleClearCache}
          variant="outline"
          className="w-full flex items-center gap-2"
        >
          <HelpCircle className="h-4 w-4" />
          Clear Browser Cache
        </Button>
        <Button
          onClick={handleForceRecovery}
          disabled={isRecovering}
          className="w-full flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white"
        >
          <LogOut className="h-4 w-4" />
          {isRecovering ? 'Recovering...' : 'Reset & Sign Out'}
        </Button>
      </div>
      {onClose && (
        <Button
          onClick={onClose}
          variant="ghost"
          className="w-full mt-4"
        >
          Cancel
        </Button>
      )}
    </div>
  );

  if (!showCard) {
    return recoveryContent;
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-center">Account Recovery</CardTitle>
      </CardHeader>
      <CardContent>
        {recoveryContent}
      </CardContent>
    </Card>
  );
};

export default UserRecovery;

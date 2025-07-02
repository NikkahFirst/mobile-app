
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Eye, Crown } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface FreemiumViewLimitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const FreemiumViewLimitDialog = ({ open, onOpenChange }: FreemiumViewLimitDialogProps) => {
  const navigate = useNavigate();

  const handleUpgrade = () => {
    navigate('/shop');
    onOpenChange(false);
  };

  const handleMaybeLater = () => {
    navigate('/dashboard');
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center justify-center w-12 h-12 mx-auto bg-nikkah-pink/10 rounded-full mb-4">
            <Eye className="h-6 w-6 text-nikkah-pink" />
          </div>
          <AlertDialogTitle className="text-center">
            Daily View Limit Reached
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center">
            You've reached your daily limit of 5 profile views. Upgrade to Premium for unlimited profile views and access to all NikkahFirst features.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-col gap-2">
          <AlertDialogAction
            onClick={handleUpgrade}
            className="bg-nikkah-pink hover:bg-nikkah-pink/90 text-white w-full"
          >
            <Crown className="h-4 w-4 mr-2" />
            View Plans
          </AlertDialogAction>
          <AlertDialogCancel onClick={handleMaybeLater} className="w-full">
            Maybe Later
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default FreemiumViewLimitDialog;


import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Crown, Heart, Users, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface UpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature?: string;
}

const UpgradeDialog = ({ open, onOpenChange, feature = "send match requests" }: UpgradeDialogProps) => {
  const navigate = useNavigate();

  const handleViewPlans = () => {
    onOpenChange(false);
    navigate('/shop');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center text-nikkah-pink">
            <Crown className="h-5 w-5 mr-2" />
            Upgrade Required
          </DialogTitle>
          <DialogDescription className="text-center space-y-4">
            <p>Please subscribe to a plan to {feature}.</p>
            
            <div className="bg-gray-50 p-4 rounded-lg space-y-3">
              <h4 className="font-medium text-gray-900">With a subscription you get:</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center">
                  <Heart className="h-4 w-4 mr-2 text-nikkah-pink" />
                  Send unlimited match requests
                </div>
                <div className="flex items-center">
                  <Users className="h-4 w-4 mr-2 text-nikkah-pink" />
                  Access to all premium features
                </div>
                <div className="flex items-center">
                  <Zap className="h-4 w-4 mr-2 text-nikkah-pink" />
                  Priority support
                </div>
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex gap-3 mt-6">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            Maybe Later
          </Button>
          <Button 
            onClick={handleViewPlans}
            className="flex-1 bg-nikkah-pink hover:bg-nikkah-pink/90"
          >
            View Plans
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UpgradeDialog;


import { ReactNode, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface FemaleGuardProps {
  children: ReactNode;
}

export const FemaleGuard = ({ children }: FemaleGuardProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isMale, setIsMale] = useState(false);

  useEffect(() => {
    const checkGender = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('gender')
          .eq('id', user.id)
          .single();
          
        if (error) throw error;
        
        if (data?.gender === 'male') {
          setIsMale(true);
        } else {
          // Redirect females and show message
          toast({
            title: "Access Restricted",
            description: "This area is only available to male users.",
            variant: "destructive"
          });
          navigate('/dashboard');
        }
      } catch (error) {
        console.error("Error checking gender:", error);
      } finally {
        setLoading(false);
      }
    };
    
    checkGender();
  }, [user, navigate]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-nikkah-pink"></div>
      </div>
    );
  }

  return isMale ? <>{children}</> : null;
};

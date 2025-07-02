
import { useAuth } from "@/context/AuthContext";

export const useIsFreemium = () => {
  const { user } = useAuth();
  
  // Check if user is male and doesn't have active subscription
  const isFreemium = user?.user_metadata?.gender === 'male' && 
                    user?.user_metadata?.subscription_status !== 'active';
  
  return isFreemium;
};

export const checkIsFreemium = (userGender: string, subscriptionStatus: string) => {
  return userGender === 'male' && subscriptionStatus !== 'active';
};

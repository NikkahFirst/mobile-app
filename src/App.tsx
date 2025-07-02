
import React from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/hooks/use-theme";
import { SearchPreservationProvider } from "@/context/SearchPreservationContext";
import { MobileNotificationProvider } from "@/hooks/use-mobile-notification";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";
import Onboarding from "./pages/Onboarding";
import Shop from "./pages/Shop";
import ProfileView from "./pages/ProfileView";
import { FemaleGuard } from "./components/FemaleGuard";
import SuccessStory from "./pages/SuccessStory";
import MobileCheckout from "./pages/MobileCheckout";
import RequestedProfiles from "./pages/RequestedProfiles";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import AdminAffiliates from "./pages/AdminAffiliates";
import AdminUsers from "./pages/AdminUsers";
import AdminPayments from "./pages/AdminPayments";
import GoogleErrorPage from "./pages/GoogleErrorPage";
import GoogleAccountFix from "@/pages/GoogleAccountFix";
import GoogleFixWali from "@/pages/GoogleFixWali";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import Affiliate from "./pages/Affiliate";
import AffiliateDashboard from "./pages/AffiliateDashboard";

// Create a client
const queryClient = new QueryClient();

const App = () => {
  const [hideScreen, setHideScreen] = React.useState(false);

  // Disable right-click globally
  React.useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };
    document.addEventListener('contextmenu', handleContextMenu);
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, []);

  // Blur/blackout screen when app goes into background or screenshot is attempted
  React.useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        setHideScreen(true);
      } else {
        setTimeout(() => {
          setHideScreen(false);
        }, 300); // small delay to avoid flicker
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return (
    <>
      {/* Overlay screen */}
      {hideScreen && (
        <div className="fixed inset-0 bg-black opacity-90 z-[99999] flex items-center justify-center text-white text-center text-lg px-4">
          App secured. Please return to continue.
        </div>
      )}

      <React.StrictMode>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <ThemeProvider>
              <TooltipProvider>
                <Toaster />
                <Sonner />
                <AuthProvider>
                  <SearchPreservationProvider>
                    <MobileNotificationProvider>
                      <Routes>
                        <Route path="/" element={<Navigate to="/login" replace />} />
                        <Route path="/login" element={<Login />} />
                        <Route path="/signup" element={<Signup />} />
                        <Route path="/forgot-password" element={<ForgotPassword />} />
                        <Route path="/reset-password" element={<ResetPassword />} />
                        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                        <Route path="/matches" element={<ProtectedRoute><Navigate to="/dashboard?tab=matches" replace /></ProtectedRoute>} />
                        <Route path="/messages" element={<ProtectedRoute><Navigate to="/dashboard?tab=messages" replace /></ProtectedRoute>} />
                        <Route path="/photo-requests" element={<ProtectedRoute><Navigate to="/dashboard" replace /></ProtectedRoute>} />
                        <Route path="/shop" element={<ProtectedRoute><FemaleGuard><Shop /></FemaleGuard></ProtectedRoute>} />
                        <Route path="/mobile-checkout" element={<ProtectedRoute><MobileCheckout /></ProtectedRoute>} />
                        <Route path="/requested-profiles" element={<ProtectedRoute><RequestedProfiles /></ProtectedRoute>} />
                        <Route path="/success-story" element={<SuccessStory />} />
                        <Route path="/affiliate" element={<Affiliate />} />
                        {/* Add dedicated affiliate dashboard route */}
                        <Route path="/affiliate/dashboard" element={<ProtectedRoute><AffiliateDashboard /></ProtectedRoute>} />
                        <Route path="/onboarding/:step" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
                        <Route path="/dashboard/saved" element={<ProtectedRoute><Navigate to="/dashboard?tab=saved" replace /></ProtectedRoute>} />
                        <Route path="/profile/:id" element={<ProtectedRoute><ProfileView /></ProtectedRoute>} />
                        <Route path="/admin" element={<AdminLogin />} />
                        <Route path="/admin/dashboard" element={<AdminDashboard />} />
                        <Route path="/admin/users" element={<AdminUsers />} />
                        <Route path="/admin/payments" element={<AdminPayments />} />
                        <Route path="/admin/affiliates" element={<AdminAffiliates />} />
                        <Route path="/google-error" element={<GoogleErrorPage />} />
                        <Route path="/google-account-fix" element={<GoogleAccountFix />} />
                        <Route path="/google-fix-wali" element={<GoogleFixWali />} />
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </MobileNotificationProvider>
                  </SearchPreservationProvider>
                </AuthProvider>
              </TooltipProvider>
            </ThemeProvider>
          </BrowserRouter>
        </QueryClientProvider>
      </React.StrictMode>
    </>
  );
};

export default App;

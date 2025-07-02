
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import NotificationItem from "./NotificationItem";
import { Button } from "@/components/ui/button";

interface Notification {
  id: string;
  type: string;
  created_at: string;
  read: boolean;
  actor_first_name?: string;
  actor_display_name?: string;
  actor_id?: string;
}

interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

const NotificationDropdown = ({ isOpen, onClose }: NotificationDropdownProps) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen && user) {
      fetchNotifications();
    }
  }, [isOpen, user]);

  const fetchNotifications = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase.rpc('get_user_notifications', {
        p_user_id: user.id,
        p_limit: 10
      });

      if (error) {
        console.error('Error fetching notifications:', error);
        return;
      }

      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAllAsRead = async () => {
    if (!user || notifications.length === 0) return;

    const unreadIds = notifications
      .filter(n => !n.read)
      .map(n => n.id);

    if (unreadIds.length === 0) return;

    try {
      await supabase.rpc('mark_notifications_read', {
        p_user_id: user.id,
        p_notification_ids: unreadIds
      });

      setNotifications(prev => 
        prev.map(n => ({ ...n, read: true }))
      );
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  const handleNotificationClick = async (actorId: string, notificationId: string) => {
    // Mark this specific notification as read
    if (!user) return;

    try {
      await supabase.rpc('mark_notifications_read', {
        p_user_id: user.id,
        p_notification_ids: [notificationId]
      });

      // Update local state
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );

      // Close dropdown and navigate
      onClose();
      navigate(`/profile/${actorId}`);
    } catch (error) {
      console.error('Error marking notification as read:', error);
      // Still navigate even if marking as read fails
      onClose();
      navigate(`/profile/${actorId}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Notifications</h3>
          {notifications.some(n => !n.read) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="text-xs text-nikkah-pink hover:text-nikkah-pink/80"
            >
              Mark all read
            </Button>
          )}
        </div>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-gray-500">
            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-nikkah-pink mx-auto"></div>
            <p className="mt-2 text-sm">Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <div className="text-4xl mb-2">🔔</div>
            <p className="text-sm">No notifications yet</p>
            <p className="text-xs text-gray-400 mt-1">
              You'll see requests and match updates here
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                id={notification.id}
                type={notification.type}
                createdAt={notification.created_at}
                actorFirstName={notification.actor_first_name}
                actorDisplayName={notification.actor_display_name}
                isRead={notification.read}
                actorId={notification.actor_id}
                onClick={(actorId) => handleNotificationClick(actorId, notification.id)}
              />
            ))}
          </div>
        )}
      </div>

      {notifications.length > 0 && (
        <div className="p-3 border-t border-gray-100 text-center">
          <Button variant="ghost" size="sm" className="text-xs text-gray-500">
            View All Activity
          </Button>
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;


-- Add profile view notifications to the database
CREATE OR REPLACE FUNCTION public.create_profile_view_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Only create notification if someone else viewed the profile
  IF NEW.user_id != OLD.user_id OR OLD IS NULL THEN
    -- Insert notification for profile view
    INSERT INTO notifications (user_id, actor_id, type)
    SELECT profile_id, NEW.user_id, 'profile_view'
    FROM unnest(NEW.viewed_profiles) AS profile_id
    WHERE profile_id != NEW.user_id
    AND profile_id NOT IN (
      SELECT unnest(COALESCE(OLD.viewed_profiles, '{}'))
      WHERE OLD IS NOT NULL
    );
  END IF;
  RETURN NEW;
END;
$function$;

-- Create trigger for profile view notifications
DROP TRIGGER IF EXISTS trigger_profile_view_notification ON daily_profile_views;
CREATE TRIGGER trigger_profile_view_notification
  AFTER UPDATE ON daily_profile_views
  FOR EACH ROW
  EXECUTE FUNCTION create_profile_view_notification();

-- Function to get user notifications with profile info (updated to include actor_id)
CREATE OR REPLACE FUNCTION public.get_user_notifications(p_user_id uuid, p_limit integer DEFAULT 15)
RETURNS TABLE(
  id uuid,
  type text,
  created_at timestamp with time zone,
  read boolean,
  actor_first_name text,
  actor_display_name text,
  actor_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    n.id,
    n.type,
    n.created_at,
    n.read,
    p.first_name as actor_first_name,
    p.display_name as actor_display_name,
    n.actor_id
  FROM notifications n
  LEFT JOIN profiles p ON n.actor_id = p.id
  WHERE n.user_id = p_user_id
  ORDER BY n.created_at DESC
  LIMIT p_limit;
END;
$function$;

-- Function to mark notifications as read
CREATE OR REPLACE FUNCTION public.mark_notifications_read(p_user_id uuid, p_notification_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  UPDATE notifications 
  SET read = true 
  WHERE user_id = p_user_id 
  AND id = ANY(p_notification_ids);
END;
$function$;

-- Function to get unread notification count
CREATE OR REPLACE FUNCTION public.get_unread_notification_count(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  unread_count integer;
BEGIN
  SELECT COUNT(*) INTO unread_count
  FROM notifications
  WHERE user_id = p_user_id AND read = false;
  
  RETURN COALESCE(unread_count, 0);
END;
$function$;

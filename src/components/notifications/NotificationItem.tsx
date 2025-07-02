
import { formatDistanceToNow } from "date-fns";

interface NotificationItemProps {
  id: string;
  type: string;
  createdAt: string;
  actorFirstName?: string;
  actorDisplayName?: string;
  isRead: boolean;
  actorId?: string;
  onClick?: (actorId: string) => void;
}

const NotificationItem = ({ 
  type, 
  createdAt, 
  actorFirstName, 
  actorDisplayName, 
  isRead,
  actorId,
  onClick
}: NotificationItemProps) => {
  const getNotificationContent = () => {
    const displayName = actorDisplayName || actorFirstName || "Someone";
    
    switch (type) {
      case 'match_request':
        return {
          emoji: '💕',
          message: `${displayName} sent you a match request`
        };
      case 'match_accepted':
        return {
          emoji: '🎉',
          message: `${displayName} accepted your match request`
        };
      case 'profile_view':
        return {
          emoji: '👀',
          message: `${displayName} viewed your profile`
        };
      case 'photo_request':
        return {
          emoji: '📸',
          message: `${displayName} requested to see your photos`
        };
      case 'photo_accepted':
        return {
          emoji: '✨',
          message: `${displayName} accepted your photo request`
        };
      default:
        return {
          emoji: '📢',
          message: 'You have a new notification'
        };
    }
  };

  const { emoji, message } = getNotificationContent();
  const timeAgo = formatDistanceToNow(new Date(createdAt), { addSuffix: true });

  const handleClick = () => {
    if (actorId && onClick) {
      onClick(actorId);
    }
  };

  const isClickable = actorId && onClick;

  return (
    <div 
      className={`p-3 transition-colors ${!isRead ? 'bg-blue-50/50' : ''} ${
        isClickable ? 'hover:bg-gray-50 cursor-pointer' : ''
      }`}
      onClick={handleClick}
    >
      <div className="flex items-start gap-3">
        <span className="text-lg flex-shrink-0">{emoji}</span>
        <div className="flex-1 min-w-0">
          <p className={`text-sm ${!isRead ? 'font-medium text-gray-900' : 'text-gray-700'}`}>
            {message}
            {isClickable && (
              <span className="text-xs text-gray-400 ml-1">(Click to view profile)</span>
            )}
          </p>
          <p className="text-xs text-gray-500 mt-1">{timeAgo}</p>
        </div>
        {!isRead && (
          <div className="w-2 h-2 bg-nikkah-pink rounded-full flex-shrink-0 mt-1"></div>
        )}
      </div>
    </div>
  );
};

export default NotificationItem;

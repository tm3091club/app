import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { X, Calendar, Users, AlertCircle, Bell, UserX, History } from 'lucide-react';
import { Notification, NotificationType } from '../types';
import { useNotifications } from '../Context/NotificationContext';

interface NotificationPanelProps {
  onClose: () => void;
  onNavigateToAvailability?: () => void;
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({ onClose, onNavigateToAvailability }) => {
  const { notifications, markAsRead, markAllAsRead, dismissNotification, fetchPreviousNotifications } = useNotifications();
  const [showingPrevious, setShowingPrevious] = useState(false);
  const [previousNotifications, setPreviousNotifications] = useState<Notification[]>([]);
  const [loadingPrevious, setLoadingPrevious] = useState(false);

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case NotificationType.SchedulePublished:
        return <Calendar className="h-5 w-5 text-blue-500" />;
      case NotificationType.RoleReminder:
        return <Bell className="h-5 w-5 text-yellow-500" />;
      case NotificationType.AvailabilityRequest:
        return <Users className="h-5 w-5 text-green-500" />;
      case NotificationType.RoleChanged:
      case NotificationType.RoleUnassigned:
        return <AlertCircle className="h-5 w-5 text-orange-500" />;
      case NotificationType.MeetingBlackout:
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case NotificationType.SpeakerUnassigned:
        return <UserX className="h-5 w-5 text-red-500" />;
      default:
        return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read
    await markAsRead(notification.id);
    
    // Handle navigation based on notification type
    if (notification.type === NotificationType.AvailabilityRequest && onNavigateToAvailability) {
      onNavigateToAvailability();
    }
    
    onClose();
  };

  const handleShowPrevious = async () => {
    setLoadingPrevious(true);
    try {
      const previous = await fetchPreviousNotifications();
      setPreviousNotifications(previous);
      setShowingPrevious(true);
    } catch (error) {
      console.error('Error fetching previous notifications:', error);
    } finally {
      setLoadingPrevious(false);
    }
  };

  const handleClosePrevious = () => {
    setShowingPrevious(false);
    setPreviousNotifications([]);
  };

  // When panel closes, clear previous view
  const handleClose = () => {
    handleClosePrevious();
    onClose();
  };

  const unreadNotifications = notifications.filter(n => !n.isRead);
  const readNotifications = notifications.filter(n => n.isRead);

  return (
    <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            {showingPrevious ? 'Previous Notifications' : 'Notifications'}
          </h3>
          <div className="flex items-center gap-2">
            {showingPrevious ? (
              <button
                onClick={handleClosePrevious}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                Back to current
              </button>
            ) : (
              <>
                {notifications.length === 0 && (
                  <button
                    onClick={handleShowPrevious}
                    disabled={loadingPrevious}
                    className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
                  >
                    <History className="h-4 w-4" />
                    {loadingPrevious ? 'Loading...' : 'Show Previous'}
                  </button>
                )}
                {unreadNotifications.length > 0 && (
                  <button
                    onClick={() => markAllAsRead()}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Mark all as read
                  </button>
                )}
              </>
            )}
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {showingPrevious ? (
          // Previous notifications view
          <div>
            {previousNotifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No previous notifications found
              </div>
            ) : (
              <div>
                <div className="px-4 py-2 bg-gray-50 text-sm font-medium text-gray-700">
                  Last 10 Notifications
                </div>
                {previousNotifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onClick={() => handleNotificationClick(notification)}
                    onDelete={() => dismissNotification(notification.id)}
                    getIcon={getNotificationIcon}
                    isRead={notification.isRead}
                    isPreviousView
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          // Current notifications view
          <>
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No notifications yet
              </div>
            ) : (
              <>
                {unreadNotifications.length > 0 && (
                  <div>
                    <div className="px-4 py-2 bg-gray-50 text-sm font-medium text-gray-700">
                      New
                    </div>
                    {unreadNotifications.map((notification) => (
                      <NotificationItem
                        key={notification.id}
                        notification={notification}
                        onClick={() => handleNotificationClick(notification)}
                        onDelete={() => dismissNotification(notification.id)}
                        getIcon={getNotificationIcon}
                      />
                    ))}
                  </div>
                )}

                {readNotifications.length > 0 && (
                  <div>
                    {unreadNotifications.length > 0 && (
                      <div className="px-4 py-2 bg-gray-50 text-sm font-medium text-gray-700">
                        Earlier
                      </div>
                    )}
                    {readNotifications.map((notification) => (
                      <NotificationItem
                        key={notification.id}
                        notification={notification}
                        onClick={() => handleNotificationClick(notification)}
                        onDelete={() => dismissNotification(notification.id)}
                        getIcon={getNotificationIcon}
                        isRead
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

interface NotificationItemProps {
  notification: Notification;
  onClick: () => void;
  onDelete: () => void;
  getIcon: (type: NotificationType) => JSX.Element;
  isRead?: boolean;
  isPreviousView?: boolean;
}

const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onClick,
  onDelete,
  getIcon,
  isRead = false,
  isPreviousView = false,
}) => {
  return (
    <div
      className={`px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 ${
        !isRead && !isPreviousView ? 'bg-blue-50' : ''
      } ${isPreviousView ? 'opacity-75' : ''}`}
    >
      <div className="flex items-start">
        <div className="flex-shrink-0 pt-0.5">{getIcon(notification.type)}</div>
        <div className="ml-3 flex-1" onClick={onClick}>
          <p className={`text-sm ${!isRead && !isPreviousView ? 'font-semibold' : 'font-medium'} text-gray-900`}>
            {notification.title}
          </p>
          <p className="mt-1 text-sm text-gray-600">{notification.message}</p>
          <p className="mt-1 text-xs text-gray-500">
            {formatDistanceToNow(notification.createdAt, { addSuffix: true })}
            {isPreviousView && <span className="ml-1 text-gray-400">(Previous)</span>}
          </p>
        </div>
        {!isPreviousView && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="ml-2 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
};

export default NotificationPanel;

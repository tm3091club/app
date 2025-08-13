import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  doc, 
  updateDoc, 
  deleteDoc,
  writeBatch,
  Timestamp,
  getDocs,
  limit
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from './AuthContext';
import { Notification } from '../types';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  dismissNotification: (notificationId: string) => Promise<void>;
  fetchPreviousNotifications: () => Promise<Notification[]>;
  loading: boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !user.uid) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      notificationsQuery,
      (snapshot) => {
        const notificationsData: Notification[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          // Only include non-dismissed notifications in the main view
          if (!data.isDismissed) {
            notificationsData.push({
              id: doc.id,
              userId: data.userId,
              type: data.type,
              title: data.title,
              message: data.message,
              createdAt: data.createdAt?.toDate() || new Date(),
              readAt: data.readAt?.toDate(),
              isRead: data.isRead || false,
              isDismissed: data.isDismissed || false,
              dismissedAt: data.dismissedAt?.toDate(),
              metadata: data.metadata,
            });
          }
        });
        setNotifications(notificationsData);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching notifications:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const notificationRef = doc(db, 'notifications', notificationId);
      await updateDoc(notificationRef, {
        isRead: true,
        readAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      const batch = writeBatch(db);
      const unreadNotifications = notifications.filter(n => !n.isRead);
      
      unreadNotifications.forEach((notification) => {
        const notificationRef = doc(db, 'notifications', notification.id);
        batch.update(notificationRef, {
          isRead: true,
          readAt: Timestamp.now(),
        });
      });

      await batch.commit();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }, [notifications]);

  const dismissNotification = useCallback(async (notificationId: string) => {
    try {
      const notificationRef = doc(db, 'notifications', notificationId);
      await updateDoc(notificationRef, {
        isDismissed: true,
        dismissedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error dismissing notification:', error);
    }
  }, []);

  const fetchPreviousNotifications = useCallback(async (): Promise<Notification[]> => {
    if (!user || !user.uid) return [];

    try {
      const notificationsQuery = query(
        collection(db, 'notifications'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc'),
        limit(50) // Get more to filter from
      );

      const snapshot = await getDocs(notificationsQuery);
      const previousNotifications: Notification[] = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        // Only include dismissed notifications for the previous view
        if (data.isDismissed && previousNotifications.length < 10) {
          previousNotifications.push({
            id: doc.id,
            userId: data.userId,
            type: data.type,
            title: data.title,
            message: data.message,
            createdAt: data.createdAt?.toDate() || new Date(),
            readAt: data.readAt?.toDate(),
            isRead: data.isRead || false,
            isDismissed: data.isDismissed || false,
            dismissedAt: data.dismissedAt?.toDate(),
            metadata: data.metadata,
          });
        }
      });

      return previousNotifications;
    } catch (error) {
      console.error('Error fetching previous notifications:', error);
      return [];
    }
  }, [user]);

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    dismissNotification,
    fetchPreviousNotifications,
    loading,
  };

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};

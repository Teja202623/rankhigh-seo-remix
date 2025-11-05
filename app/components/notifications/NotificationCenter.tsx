import {
  Card,
  Text,
  BlockStack,
  InlineStack,
  Badge,
  Button,
  Icon,
  Popover,
  ActionList,
  Scrollable,
} from '@shopify/polaris';
import {
  NotificationIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  InfoIcon,
  SettingsIcon,
} from '@shopify/polaris-icons';
import { useState } from 'react';

export interface Notification {
  id: string;
  type: 'success' | 'warning' | 'critical' | 'info';
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  actionUrl?: string;
  actionLabel?: string;
}

interface NotificationCenterProps {
  notifications: Notification[];
  onMarkAsRead?: (id: string) => void;
  onMarkAllAsRead?: () => void;
  onClearAll?: () => void;
  onNotificationClick?: (notification: Notification) => void;
  onSettingsClick?: () => void;
}

export default function NotificationCenter({
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onClearAll,
  onNotificationClick,
  onSettingsClick,
}: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return CheckCircleIcon;
      case 'warning':
        return AlertTriangleIcon;
      case 'critical':
        return AlertTriangleIcon;
      case 'info':
      default:
        return InfoIcon;
    }
  };

  const getNotificationTone = (type: string): 'success' | 'warning' | 'critical' | 'info' => {
    return type as any;
  };

  const getTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now.getTime() - time.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return time.toLocaleDateString();
  };

  const handleNotificationClick = (notification: Notification) => {
    if (onMarkAsRead && !notification.isRead) {
      onMarkAsRead(notification.id);
    }
    if (onNotificationClick) {
      onNotificationClick(notification);
    }
  };

  const activator = (
    <Button
      onClick={() => setIsOpen(!isOpen)}
      icon={NotificationIcon}
      accessibilityLabel={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
    />
  );

  return (
    <Popover
      active={isOpen}
      activator={activator}
      onClose={() => setIsOpen(false)}
      preferredAlignment="right"
      preferredPosition="below"
      fullWidth
    >
      <div style={{ width: '400px', maxHeight: '600px' }}>
        {/* Header */}
        <div
          style={{
            padding: '16px',
            borderBottom: '1px solid #e5e7eb',
          }}
        >
          <InlineStack align="space-between" blockAlign="center">
            <Text as="h3" variant="headingMd">
              Notifications
            </Text>
            <InlineStack gap="100">
              {onSettingsClick && (
                <Button
                  size="slim"
                  icon={SettingsIcon}
                  onClick={() => {
                    onSettingsClick();
                    setIsOpen(false);
                  }}
                  accessibilityLabel="Notification settings"
                />
              )}
            </InlineStack>
          </InlineStack>
          {unreadCount > 0 && (
            <Text as="p" variant="bodySm" tone="subdued">
              {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
            </Text>
          )}
        </div>

        {/* Actions */}
        {notifications.length > 0 && (
          <div
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid #e5e7eb',
              backgroundColor: '#f9fafb',
            }}
          >
            <InlineStack gap="200">
              {onMarkAllAsRead && unreadCount > 0 && (
                <Button size="slim" onClick={onMarkAllAsRead}>
                  Mark all as read
                </Button>
              )}
              {onClearAll && (
                <Button size="slim" onClick={onClearAll}>
                  Clear all
                </Button>
              )}
            </InlineStack>
          </div>
        )}

        {/* Notifications List */}
        <Scrollable style={{ maxHeight: '400px' }}>
          {notifications.length > 0 ? (
            <div>
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  style={{
                    padding: '16px',
                    borderBottom: '1px solid #f3f4f6',
                    backgroundColor: notification.isRead ? 'transparent' : '#f0f9ff',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f9fafb';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = notification.isRead
                      ? 'transparent'
                      : '#f0f9ff';
                  }}
                >
                  <InlineStack gap="300" blockAlign="start" wrap={false}>
                    <div style={{ paddingTop: '2px' }}>
                      <Icon
                        source={getNotificationIcon(notification.type)}
                        tone={getNotificationTone(notification.type)}
                      />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <BlockStack gap="100">
                        <InlineStack align="space-between" blockAlign="start">
                          <Text as="p" variant="bodyMd" fontWeight="semibold">
                            {notification.title}
                          </Text>
                          {!notification.isRead && (
                            <div
                              style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                backgroundColor: '#3b82f6',
                                flexShrink: 0,
                                marginTop: '6px',
                              }}
                            />
                          )}
                        </InlineStack>
                        <Text as="p" variant="bodySm">
                          {notification.message}
                        </Text>
                        <Text as="p" variant="bodySm" tone="subdued">
                          {getTimeAgo(notification.timestamp)}
                        </Text>
                        {notification.actionUrl && notification.actionLabel && (
                          <div style={{ marginTop: '8px' }}>
                            <Button size="slim" url={notification.actionUrl}>
                              {notification.actionLabel}
                            </Button>
                          </div>
                        )}
                      </BlockStack>
                    </div>
                  </InlineStack>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '60px 20px', textAlign: 'center' }}>
              <Icon source={NotificationIcon} />
              <Text as="p" variant="bodyMd" tone="subdued">
                No notifications
              </Text>
              <Text as="p" variant="bodySm" tone="subdued">
                We'll notify you when something important happens
              </Text>
            </div>
          )}
        </Scrollable>
      </div>
    </Popover>
  );
}

/**
 * Sample notification data generator
 */
export function generateSampleNotifications(): Notification[] {
  return [
    {
      id: '1',
      type: 'critical',
      title: 'Critical SEO Issues Found',
      message: 'Your site has 5 critical SEO issues that need immediate attention.',
      timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
      isRead: false,
      actionUrl: '/audits',
      actionLabel: 'View Issues',
    },
    {
      id: '2',
      type: 'warning',
      title: 'Ranking Dropped',
      message: 'Your keyword "shopify seo" dropped from #5 to #8 in rankings.',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
      isRead: false,
      actionUrl: '/keywords',
      actionLabel: 'View Keywords',
    },
    {
      id: '3',
      type: 'success',
      title: 'Audit Completed',
      message: 'Your SEO audit has finished. 15 new issues found.',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
      isRead: true,
      actionUrl: '/audits',
      actionLabel: 'View Report',
    },
    {
      id: '4',
      type: 'info',
      title: 'New Feature Available',
      message: 'Try our new AI content suggestions to improve your meta descriptions.',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
      isRead: true,
      actionUrl: '/pages',
      actionLabel: 'Try Now',
    },
    {
      id: '5',
      type: 'success',
      title: 'Performance Improved',
      message: 'Your SEO score increased from 72 to 85. Great job!',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
      isRead: true,
    },
  ];
}

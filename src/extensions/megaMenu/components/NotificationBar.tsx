import * as React from 'react';
import DOMPurify from 'dompurify';
import styles from './NotificationBar.module.scss';
import { INotificationBarProps, INotification, NotificationPriority } from '../models';
import { sanitizeColor } from '../utils';

const DISMISSED_KEY_PREFIX = 'spfx_notification_dismissed_';

const ALLOWED_TAGS = ['a', 'b', 'i', 'em', 'strong', 'br', 'p', 'span', 'ul', 'ol', 'li'];
const ALLOWED_ATTR = ['href', 'target', 'rel', 'class'];

const BADGE_STYLES: Record<NotificationPriority, string> = {
  Low: styles.badgeLow,
  Medium: styles.badgeMedium,
  High: styles.badgeHigh,
  Critical: styles.badgeCritical,
};

function isDismissed(notificationId: number): boolean {
  try {
    return sessionStorage.getItem(`${DISMISSED_KEY_PREFIX}${notificationId}`) === '1';
  } catch (error: unknown) {
    // CQ-04: Log instead of silently swallowing
    console.debug('[NotificationBar] sessionStorage read failed:', error);
    return false;
  }
}

function markDismissed(notificationId: number): void {
  try {
    sessionStorage.setItem(`${DISMISSED_KEY_PREFIX}${notificationId}`, '1');
  } catch (error: unknown) {
    // CQ-04: Log instead of silently swallowing
    console.debug('[NotificationBar] sessionStorage write failed:', error);
  }
}

function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ADD_ATTR: ['target'],
  });
}

export const NotificationBar: React.FC<INotificationBarProps> = ({ notifications }) => {
  const [dismissedIds, setDismissedIds] = React.useState<Set<number>>(() => {
    const dismissed = new Set<number>();
    for (const notification of notifications) {
      if (isDismissed(notification.id)) {
        dismissed.add(notification.id);
      }
    }
    return dismissed;
  });

  const handleDismiss = React.useCallback((id: number): void => {
    markDismissed(id);
    setDismissedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const visibleNotifications = notifications.filter(
    (n) => !dismissedIds.has(n.id)
  );

  if (visibleNotifications.length === 0) {
    return null;
  }

  return (
    <div className={styles.notificationBar} role="region" aria-label="Notifications">
      {visibleNotifications.map((notification: INotification) => (
        <div
          key={notification.id}
          className={styles.notificationItem}
          style={{
            backgroundColor: sanitizeColor(notification.backgroundColor, '#FFF3CD'),
            color: sanitizeColor(notification.textColor, '#856404'),
          }}
          role="alert"
        >
          <span
            className={`${styles.priorityBadge} ${BADGE_STYLES[notification.priority]}`}
            aria-label={`Priority: ${notification.priority}`}
          >
            {notification.priority}
          </span>

          <div className={styles.notificationContent}>
            <span className={styles.notificationTitle}>{notification.title}</span>
            <span
              className={styles.notificationMessage}
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(notification.message) }}
            />
          </div>

          <button
            className={styles.dismissButton}
            onClick={(): void => handleDismiss(notification.id)}
            aria-label={`Dismiss notification: ${notification.title}`}
            type="button"
          >
            &times;
          </button>
        </div>
      ))}
    </div>
  );
};

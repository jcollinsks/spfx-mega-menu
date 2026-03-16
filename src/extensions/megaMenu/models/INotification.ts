export type NotificationPriority = 'Low' | 'Medium' | 'High' | 'Critical';

export interface INotification {
  id: number;
  title: string;
  message: string;
  startDate: string;
  endDate: string;
  backgroundColor: string;
  textColor: string;
  priority: NotificationPriority;
  sortOrder: number;
}

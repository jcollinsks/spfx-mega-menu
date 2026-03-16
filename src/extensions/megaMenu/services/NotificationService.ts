import { SPFI } from '@pnp/sp';
import '@pnp/sp/webs';
import '@pnp/sp/lists';
import '@pnp/sp/items';
import { INotification, NotificationPriority } from '../models';

interface SPNotificationResponse {
  Id: number;
  Title: string;
  Message: string;
  StartDate: string;
  EndDate: string;
  BackgroundColor: string;
  TextColor: string;
  Priority: string;
  SortOrder: number;
}

const PRIORITY_WEIGHT: Record<NotificationPriority, number> = {
  Critical: 4,
  High: 3,
  Medium: 2,
  Low: 1,
};

export class NotificationService {
  private readonly sp: SPFI;
  private readonly listName: string;

  public constructor(sp: SPFI, listName: string) {
    this.sp = sp;
    this.listName = listName;
  }

  public async getActiveNotifications(): Promise<INotification[]> {
    const now = new Date().toISOString();

    const response: SPNotificationResponse[] = await this.sp.web.lists
      .getByTitle(this.listName)
      .items
      .select(
        'Id', 'Title', 'Message', 'StartDate', 'EndDate',
        'BackgroundColor', 'TextColor', 'Priority', 'SortOrder'
      )
      .filter(
        `IsActive eq 1 and StartDate le datetime'${now}' and EndDate ge datetime'${now}'`
      )
      .orderBy('SortOrder', true)
      .top(50)();

    const notifications: INotification[] = response.map((item) => ({
      id: item.Id,
      title: item.Title,
      message: item.Message || '',
      startDate: item.StartDate,
      endDate: item.EndDate,
      backgroundColor: item.BackgroundColor || '#FFF3CD',
      textColor: item.TextColor || '#856404',
      priority: this.parsePriority(item.Priority),
      sortOrder: item.SortOrder ?? 0,
    }));

    return this.sortByPriority(notifications);
  }

  private parsePriority(value: string): NotificationPriority {
    const validPriorities: NotificationPriority[] = ['Low', 'Medium', 'High', 'Critical'];
    if (validPriorities.includes(value as NotificationPriority)) {
      return value as NotificationPriority;
    }
    return 'Low';
  }

  private sortByPriority(notifications: INotification[]): INotification[] {
    return [...notifications].sort((a, b) => {
      const weightDiff = PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority];
      if (weightDiff !== 0) {
        return weightDiff;
      }
      return a.sortOrder - b.sortOrder;
    });
  }
}

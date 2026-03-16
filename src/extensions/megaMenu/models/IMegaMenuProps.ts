import { IMenuCategory } from './IMenuCategory';
import { INotification } from './INotification';

export interface IMegaMenuContainerProps {
  categories: IMenuCategory[];
  notifications: INotification[];
  logoUrl: string;
  onRefresh: () => Promise<void>;
}

export interface IMegaMenuNavProps {
  categories: IMenuCategory[];
}

export interface INotificationBarProps {
  notifications: INotification[];
}

export interface IMobileNavProps {
  categories: IMenuCategory[];
  isOpen: boolean;
  onDismiss: () => void;
}

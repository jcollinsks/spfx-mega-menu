import {
  BaseApplicationCustomizer,
  PlaceholderContent,
  PlaceholderName,
} from '@microsoft/sp-application-base';
import { Log } from '@microsoft/sp-core-library';
import * as React from 'react';
import * as ReactDom from 'react-dom';

import { MegaMenuContainer } from './components/MegaMenuContainer';
import { IMenuCategory, INotification, IMegaMenuContainerProps } from './models';
import { getSP, getRootSP, MegaMenuService, NotificationService } from './services';

const LOG_SOURCE = 'MegaMenuApplicationCustomizer';

export interface IMegaMenuApplicationCustomizerProperties {
  menuListName: string;
  notificationListName: string;
  logoUrl: string;
  rootWebOnly: boolean;
}

export default class MegaMenuApplicationCustomizer
  extends BaseApplicationCustomizer<IMegaMenuApplicationCustomizerProperties> {

  private _topPlaceholder: PlaceholderContent | undefined;
  private _menuService!: MegaMenuService;
  private _notificationService!: NotificationService;
  private _categories: IMenuCategory[] = [];
  private _notifications: INotification[] = [];

  public async onInit(): Promise<void> {
    Log.info(LOG_SOURCE, 'Initializing MegaMenu Application Customizer');

    const menuListName = this.properties.menuListName || 'MegaMenu';
    const notificationListName = this.properties.notificationListName || 'Notifications';
    const rootWebOnly = this.properties.rootWebOnly ?? true;

    getSP(this.context);

    if (rootWebOnly) {
      const rootWebUrl = this.context.pageContext.site.absoluteUrl;
      getRootSP(this.context, rootWebUrl);
      const rootSp = getRootSP();
      this._menuService = new MegaMenuService(rootSp, menuListName);
      this._notificationService = new NotificationService(rootSp, notificationListName);
    } else {
      const sp = getSP();
      this._menuService = new MegaMenuService(sp, menuListName);
      this._notificationService = new NotificationService(sp, notificationListName);
    }

    await this._loadData();

    this.context.placeholderProvider.changedEvent.add(this, this._renderPlaceHolders);

    return Promise.resolve();
  }

  private async _loadData(): Promise<void> {
    try {
      const [categories, notifications] = await Promise.all([
        this._menuService.getMenuCategories(),
        this._notificationService.getActiveNotifications(),
      ]);

      this._categories = categories;
      this._notifications = notifications;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      Log.error(LOG_SOURCE, new Error(`Failed to load menu data: ${message}`));
      this._categories = [];
      this._notifications = [];
    }
  }

  private _renderPlaceHolders(): void {
    if (!this._topPlaceholder) {
      this._topPlaceholder = this.context.placeholderProvider.tryCreateContent(
        PlaceholderName.Top,
        { onDispose: this._onDispose.bind(this) }
      );

      if (!this._topPlaceholder) {
        Log.error(LOG_SOURCE, new Error('The expected placeholder (Top) was not found.'));
        return;
      }
    }

    if (!this._topPlaceholder.domElement) {
      return;
    }

    const logoUrl = this.properties.logoUrl || '';

    const element: React.ReactElement<IMegaMenuContainerProps> = React.createElement(
      MegaMenuContainer,
      {
        categories: this._categories,
        notifications: this._notifications,
        logoUrl,
        onRefresh: this._handleRefresh.bind(this),
      }
    );

    ReactDom.render(element, this._topPlaceholder.domElement);
  }

  private async _handleRefresh(): Promise<void> {
    this._menuService.clearCache();
    await this._loadData();
    this._renderPlaceHolders();
  }

  private _onDispose(): void {
    Log.info(LOG_SOURCE, 'Disposing MegaMenu placeholder');
    if (this._topPlaceholder?.domElement) {
      ReactDom.unmountComponentAtNode(this._topPlaceholder.domElement);
    }
  }
}

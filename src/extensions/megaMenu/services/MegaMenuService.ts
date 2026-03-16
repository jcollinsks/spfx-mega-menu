import { SPFI } from '@pnp/sp';
import '@pnp/sp/webs';
import '@pnp/sp/lists';
import '@pnp/sp/items';
import { IMenuItem, IMenuCategory } from '../models';

const CACHE_KEY = 'spfx_megamenu_cache';
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

interface CacheEntry {
  data: IMenuCategory[];
  timestamp: number;
}

interface SPMenuItemResponse {
  Id: number;
  Title: string;
  Category: string;
  NavigationUrl: string;
  OpenInNewTab: boolean;
  SortOrder: number;
}

export class MegaMenuService {
  private readonly sp: SPFI;
  private readonly listName: string;

  public constructor(sp: SPFI, listName: string) {
    this.sp = sp;
    this.listName = listName;
  }

  public async getMenuCategories(): Promise<IMenuCategory[]> {
    const cached = this.getFromCache();
    if (cached) {
      return cached;
    }

    const items = await this.fetchMenuItems();
    const categories = this.groupByCategory(items);

    this.saveToCache(categories);
    return categories;
  }

  public clearCache(): void {
    try {
      sessionStorage.removeItem(CACHE_KEY);
    } catch {
      // sessionStorage unavailable in some contexts
    }
  }

  private async fetchMenuItems(): Promise<IMenuItem[]> {
    const response: SPMenuItemResponse[] = await this.sp.web.lists
      .getByTitle(this.listName)
      .items
      .select('Id', 'Title', 'Category', 'NavigationUrl', 'OpenInNewTab', 'SortOrder')
      .filter('IsVisible eq 1')
      .orderBy('SortOrder', true)
      .top(500)();

    return response.map((item) => ({
      id: item.Id,
      title: item.Title,
      category: item.Category || 'General',
      navigationUrl: item.NavigationUrl || '#',
      openInNewTab: item.OpenInNewTab ?? false,
      sortOrder: item.SortOrder ?? 0,
    }));
  }

  private groupByCategory(items: IMenuItem[]): IMenuCategory[] {
    const categoryMap = new Map<string, IMenuItem[]>();

    for (const item of items) {
      const existing = categoryMap.get(item.category);
      if (existing) {
        existing.push(item);
      } else {
        categoryMap.set(item.category, [item]);
      }
    }

    return Array.from(categoryMap.entries()).map(([category, categoryItems]) => ({
      category,
      items: categoryItems.sort((a, b) => a.sortOrder - b.sortOrder),
    }));
  }

  private getFromCache(): IMenuCategory[] | undefined {
    try {
      const raw = sessionStorage.getItem(CACHE_KEY);
      if (!raw) {
        return undefined;
      }

      const entry: CacheEntry = JSON.parse(raw);
      const age = Date.now() - entry.timestamp;

      if (age > CACHE_TTL_MS) {
        sessionStorage.removeItem(CACHE_KEY);
        return undefined;
      }

      return entry.data;
    } catch {
      return undefined;
    }
  }

  private saveToCache(data: IMenuCategory[]): void {
    try {
      const entry: CacheEntry = {
        data,
        timestamp: Date.now(),
      };
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(entry));
    } catch {
      // sessionStorage unavailable or quota exceeded
    }
  }
}

import { SPFI } from '@pnp/sp';
import { Log } from '@microsoft/sp-core-library';
import '@pnp/sp/webs';
import '@pnp/sp/lists';
import '@pnp/sp/items';
import { IMenuItem, IMenuCategory } from '../models';

const LOG_SOURCE = 'MegaMenuService';
const CACHE_KEY_PREFIX = 'spfx_megamenu_cache_';
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ITEMS = 500;

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
  private readonly cacheKey: string;

  public constructor(sp: SPFI, listName: string, siteUrl: string) {
    this.sp = sp;
    this.listName = listName;
    // CQ-07: Scope cache key to site URL to prevent cross-site collision
    this.cacheKey = `${CACHE_KEY_PREFIX}${siteUrl}`;
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
      sessionStorage.removeItem(this.cacheKey);
    } catch (error: unknown) {
      // CQ-04: Log instead of silently swallowing
      Log.verbose(LOG_SOURCE, `Failed to clear cache: ${error}`);
    }
  }

  private async fetchMenuItems(): Promise<IMenuItem[]> {
    const response: SPMenuItemResponse[] = await this.sp.web.lists
      .getByTitle(this.listName)
      .items
      .select('Id', 'Title', 'Category', 'NavigationUrl', 'OpenInNewTab', 'SortOrder')
      .filter('IsVisible eq 1')
      .orderBy('SortOrder', true)
      .top(MAX_ITEMS)();

    // CQ-08: Warn when result count hits the limit (possible truncation)
    if (response.length === MAX_ITEMS) {
      Log.warn(LOG_SOURCE, `Fetched ${MAX_ITEMS} items (limit reached). Menu data may be truncated.`);
    }

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
      const raw = sessionStorage.getItem(this.cacheKey);
      if (!raw) {
        return undefined;
      }

      const entry: CacheEntry = JSON.parse(raw);

      // S-05: Validate cache structure before using it
      if (!this.isValidCacheEntry(entry)) {
        Log.warn(LOG_SOURCE, 'Cache entry failed structural validation. Discarding.');
        sessionStorage.removeItem(this.cacheKey);
        return undefined;
      }

      const age = Date.now() - entry.timestamp;

      if (age > CACHE_TTL_MS) {
        sessionStorage.removeItem(this.cacheKey);
        return undefined;
      }

      return entry.data;
    } catch (error: unknown) {
      // CQ-04: Log instead of silently swallowing
      Log.verbose(LOG_SOURCE, `Failed to read cache: ${error}`);
      return undefined;
    }
  }

  private saveToCache(data: IMenuCategory[]): void {
    try {
      const entry: CacheEntry = {
        data,
        timestamp: Date.now(),
      };
      sessionStorage.setItem(this.cacheKey, JSON.stringify(entry));
    } catch (error: unknown) {
      // CQ-04: Log instead of silently swallowing
      Log.verbose(LOG_SOURCE, `Failed to write cache: ${error}`);
    }
  }

  /**
   * S-05: Validates that a parsed cache entry has the expected structure.
   * Detects cache poisoning from other scripts on the same origin.
   */
  private isValidCacheEntry(entry: unknown): entry is CacheEntry {
    if (typeof entry !== 'object' || entry === null) {
      return false;
    }

    const candidate = entry as Record<string, unknown>;

    if (typeof candidate.timestamp !== 'number' || !Array.isArray(candidate.data)) {
      return false;
    }

    // Validate the first few items have the expected shape
    const data = candidate.data as unknown[];
    for (const category of data.slice(0, 5)) {
      if (typeof category !== 'object' || category === null) {
        return false;
      }
      const cat = category as Record<string, unknown>;
      if (typeof cat.category !== 'string' || !Array.isArray(cat.items)) {
        return false;
      }
    }

    return true;
  }
}

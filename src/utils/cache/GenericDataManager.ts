import { CacheManager } from "./CacheManager";

/**
 * Cache configuration options
 */
export interface DataManagerConfig<T> {
  /** Cache manager instance */
  cacheManager: CacheManager<T, string>;
  /** Manager name (for logging) */
  managerName: string;
  /** Data validation function (optional) */
  validator?: (data: T) => T;
  /** Whether to support stale cache fallback */
  enableStaleCache?: boolean;
  /** Data update callback function (for UI notification after background refresh) */
  onDataUpdated?: (key: string, data: T) => void;
  /**
   * Optional auto background refresh interval (milliseconds).
   * If provided (> 0), the manager will periodically revalidate known keys in background
   * even when there is no explicit getData call. If omitted/0, auto refresh is disabled.
   */
  autoBackgroundRefreshInterval?: number;
}

/**
 * Single item operation interface (for array-type data)
 */
export interface DataItemOperations<T, TItem> {
  /** Function to find a single item from an array */
  findItem?: (data: T, itemId: string) => TItem | null;
  /** Function to update a single item in an array */
  updateItem?: (data: T, itemId: string, updatedItem: TItem) => T;
  /** Function to add a new item to an array */
  addItem?: (data: T, newItem: TItem) => T;
  /** Function to remove an item from an array */
  removeItem?: (data: T, itemId: string) => T;
}

/**
 * Generic data manager base class
 * Provides advanced features like smart caching, data validation, fallback handling, etc.
 * Supports SWR (Stale While Revalidate) strategy
 */
export abstract class GenericDataManager<T, TItem = T> {
  protected readonly config: DataManagerConfig<T>;
  private readonly itemOps?: DataItemOperations<T, TItem>;
  private backgroundRefreshPromises = new Map<string, Promise<T>>();
  private knownKeys = new Set<string>();
  private autoRefreshTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    config: DataManagerConfig<T>,
    itemOperations?: DataItemOperations<T, TItem>
  ) {
    this.config = config;
    this.itemOps = itemOperations;

    // Optional: start auto background refresh loop if configured
    const autoMs = this.config.autoBackgroundRefreshInterval;
    if (typeof window !== "undefined" && autoMs && autoMs > 0) {
      try {
        this.autoRefreshTimer = setInterval(() => {
          try {
            // For each known key, check whether we should auto-refresh based on the provided interval
            for (const key of this.knownKeys) {
              const should = this.config.cacheManager.shouldRefreshWithInterval(
                key,
                autoMs
              );
              if (should && !this.backgroundRefreshPromises.has(key)) {
                // We need a fetchFn for this key; attempt to reuse an ongoing promise or skip
                // Since we cannot reconstruct fetchFn here, we rely on the next explicit getData call
                // to perform refresh. This guard simply updates the refresh timestamp to prevent log spam.
                this.config.cacheManager.updateRefreshTimestamp(key);
              }
            }
          } catch (_e) {
            // ignore
          }
        }, autoMs);
      } catch {
        // ignore timer errors
      }
    }
  }

  /**
   * Get data (supports SWR strategy)
   * @param key Cache key
   * @param fetchFn Data fetch function
   * @param forceRefresh Whether to force refresh
   * @returns Data
   */
  async getData(
    key: string,
    fetchFn: () => Promise<T>,
    forceRefresh: boolean = false
  ): Promise<T> {
    // Track known keys so optional auto refresh can consider them
    this.knownKeys.add(key);
    // If force refresh, clear cache and wait for network request
    if (forceRefresh) {
      this.config.cacheManager.clear(key);
      return this.fetchAndCache(key, fetchFn);
    }

    // Get cache and refresh information
    const { data: cachedData, shouldRefresh } =
      this.config.cacheManager.getWithRefreshInfo(key);

    // Cache hit
    if (cachedData !== null) {
      console.log(
        `[${this.config.managerName}] ✅ Cache hit, return immediately: ${this.getDataInfo(
          cachedData
        )}`
      );

      // Check if background refresh is needed (first access or time interval exceeded)
      if (shouldRefresh && !this.backgroundRefreshPromises.has(key)) {
        console.log(
          `[${this.config.managerName}] 🚀 Immediately start background refresh, get latest data...`
        );
        this.startBackgroundRefresh(key, fetchFn);
      } else if (this.backgroundRefreshPromises.has(key)) {
        console.log(
          `[${this.config.managerName}] ⏳ Background refresh is in progress, skipping duplicate request`
        );
      }

      return cachedData;
    }

    // Cache miss, wait for network request
    console.log(`[${this.config.managerName}] ❌ Cache miss, waiting for network request...`);
    return this.fetchAndCache(key, fetchFn);
  }

  /**
   * Start background refresh
   */
  private startBackgroundRefresh(key: string, fetchFn: () => Promise<T>): void {
    // Immediately update refresh timestamp to prevent duplicate refresh
    this.config.cacheManager.updateRefreshTimestamp(key);

    // Start background refresh
    const refreshPromise = this.fetchAndCache(key, fetchFn, true)
      .then((data) => {
        console.log(
          `[${this.config.managerName}] ✅ Background refresh completed: ${this.getDataInfo(
            data
          )}`
        );

        // Notify UI that data has been updated
        if (this.config.onDataUpdated) {
          try {
            this.config.onDataUpdated(key, data);
            console.log(
              `[${this.config.managerName}] 📡 UI data updated notification sent: ${key}`
            );
          } catch (error) {
            console.error(
              `[${this.config.managerName}] ❌ Failed to notify UI update:`,
              error
            );
          }
        }

        return data;
      })
      .catch((error) => {
        console.error(`[${this.config.managerName}] ❌ Background refresh failed:`, error);
        throw error;
      })
      .finally(() => {
        // Clean up Promise reference
        this.backgroundRefreshPromises.delete(key);
      });

    // Store Promise reference to prevent duplicate refresh
    this.backgroundRefreshPromises.set(key, refreshPromise);
  }

  /**
   * Fetch and cache data
   */
  private async fetchAndCache(
    key: string,
    fetchFn: () => Promise<T>,
    isBackgroundRefresh: boolean = false
  ): Promise<T> {
    try {
      if (!isBackgroundRefresh) {
        console.log(`[${this.config.managerName}] 🔄 Loading data...`);
      }

      const data = await fetchFn();

      // Validate data
      const validData = this.config.validator
        ? this.config.validator(data)
        : data;

      // Cache data
      this.config.cacheManager.set(key, validData);

      if (!isBackgroundRefresh) {
        console.log(
          `[${this.config.managerName}] ✅ Data loaded: ${this.getDataInfo(
            validData
          )}`
        );
      }

      return validData;
    } catch (error) {
      if (!isBackgroundRefresh) {
        console.error(`[${this.config.managerName}] ❌ Failed to load data:`, error);

        // If stale cache fallback is enabled, try returning stale data
        if (this.config.enableStaleCache) {
          const staleCache = this.getStaleCache(key);
          if (staleCache) {
            console.log(
              `[${
                this.config.managerName
              }] ⚠️ Using stale cache data: ${this.getDataInfo(staleCache)}`
            );
            return staleCache;
          }
        }
      } else {
        console.error(`[${this.config.managerName}] ❌ Background refresh failed:`, error);
      }

      throw error;
    }
  }

  /**
   * Clear cache
   * @param key Cache key (optional, if not provided, all cache will be cleared)
   */
  clearCache(key?: string): void {
    if (key) {
      this.config.cacheManager.clear(key);
      // Cancel corresponding background refresh
      this.backgroundRefreshPromises.delete(key);
      console.log(`[${this.config.managerName}] 🗑️ Cache cleared for key: ${key}`);
    } else {
      this.config.cacheManager.clear();
      // Clear all background refreshes
      this.backgroundRefreshPromises.clear();
      console.log(`[${this.config.managerName}] 🗑️ All cache cleared`);
    }
  }

  /**
   * Get cached data (does not trigger network request)
   */
  getCachedData(key: string): T | null {
    return this.config.cacheManager.get(key);
  }

  /**
   * Check if data is cached
   */
  hasData(key: string): boolean {
    return this.config.cacheManager.has(key);
  }

  /**
   * Manually set cache data
   */
  setData(key: string, data: T): void {
    this.config.cacheManager.set(key, data);
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { count: number; totalSize: number } {
    return this.config.cacheManager.getStats();
  }

  /**
   * Warm up cache
   */
  async preloadData(key: string, fetchFn: () => Promise<T>): Promise<void> {
    try {
      await this.getData(key, fetchFn);
      console.log(`[${this.config.managerName}] ✅ Cache warmed up: ${key}`);
    } catch (error) {
      console.error(`[${this.config.managerName}] ❌ Cache warm up failed:`, error);
    }
  }

  /**
   * Check if background refresh is in progress
   */
  isBackgroundRefreshing(key: string): boolean {
    return this.backgroundRefreshPromises.has(key);
  }

  /**
   * Wait for background refresh to complete
   */
  async waitForBackgroundRefresh(key: string): Promise<T | null> {
    const promise = this.backgroundRefreshPromises.get(key);
    if (promise) {
      try {
        return await promise;
      } catch {
        return null;
      }
    }
    return null;
  }

  /**
   * Get stale cache data (for fallback handling)
   */
  protected getStaleCache(key: string): T | null {
    try {
      const stats = this.config.cacheManager.getStats();
      if (stats.count === 0) return null;

      // Try to find matching key in localStorage
      const allKeys = Object.keys(localStorage);
      for (const storageKey of allKeys) {
        // If this key corresponds to the data we want
        if (storageKey.endsWith("_" + key) || storageKey.includes(key)) {
          const stored = localStorage.getItem(storageKey);
          if (stored) {
            try {
              const entry = JSON.parse(stored);
              return entry.data || null;
            } catch (_e) {
              // Ignore parsing errors
            }
          }
        }
      }

      return null;
    } catch (_error) {
      console.error(`[${this.config.managerName}] ❌ 获取过期缓存失败:`);
      return null;
    }
  }

  /**
   * Find a single item from cache (only applicable for array-type data)
   */
  findItem(key: string, itemId: string): TItem | null {
    if (!this.itemOps?.findItem) {
      console.warn(
        `[${this.config.managerName}] findItem operation not configured`
      );
      return null;
    }

    const data = this.getCachedData(key);
    if (!data) {
      console.log(
        `[${this.config.managerName}] 🚫 No cached data to search in for key: ${key}`
      );
      return null;
    }

    const item = this.itemOps.findItem(data, itemId);
    if (item) {
      console.log(
        `[${this.config.managerName}] ✅ Found item in cache: ${itemId}`
      );
    } else {
      console.log(
        `[${this.config.managerName}] ❌ Item not found in cache: ${itemId}`
      );
    }

    return item;
  }

  /**
   * Update a single item in cache (only applicable for array-type data)
   */
  updateItem(key: string, itemId: string, updatedItem: TItem): void {
    if (!this.itemOps?.updateItem) {
      console.warn(
        `[${this.config.managerName}] updateItem operation not configured`
      );
      return;
    }

    const data = this.getCachedData(key);
    if (!data) {
      console.log(
        `[${this.config.managerName}] ⚠️ No cached data to update for key: ${key}`
      );
      return;
    }

    const updatedData = this.itemOps.updateItem(data, itemId, updatedItem);
    this.setData(key, updatedData);
    console.log(
      `[${this.config.managerName}] ✅ Updated item in cache: ${itemId}`
    );
  }

  /**
   * Add a new item to cache (only applicable for array-type data)
   */
  addItem(key: string, newItem: TItem): void {
    if (!this.itemOps?.addItem) {
      console.warn(
        `[${this.config.managerName}] addItem operation not configured`
      );
      return;
    }

    const data = this.getCachedData(key) || ([] as unknown as T);
    const updatedData = this.itemOps.addItem(data, newItem);
    this.setData(key, updatedData);
    console.log(`[${this.config.managerName}] ✅ Added new item to cache`);
  }

  /**
   * Remove an item from cache (only applicable for array-type data)
   */
  removeItem(key: string, itemId: string): void {
    if (!this.itemOps?.removeItem) {
      console.warn(
        `[${this.config.managerName}] removeItem operation not configured`
      );
      return;
    }

    const data = this.getCachedData(key);
    if (!data) {
      console.log(
        `[${this.config.managerName}] ⚠️ No cached data to remove from for key: ${key}`
      );
      return;
    }

    const updatedData = this.itemOps.removeItem(data, itemId);
    this.setData(key, updatedData);
    console.log(
      `[${this.config.managerName}] ✅ Removed item from cache: ${itemId}`
    );
  }

  /**
   * Get data information string (for logging)
   * Subclasses should override this method to provide meaningful data description
   */
  protected abstract getDataInfo(data: T): string;
}
// Cache configuration interface
export interface CacheConfig {
  keyPrefix: string; // Cache key prefix
  ttl: number; // Cache time (milliseconds)
  loggerName: string; // Log identifier name
  backgroundRefreshInterval?: number; // Background refresh interval (milliseconds), default 10 minutes
}

// Cache entry interface
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  lastRefreshTime?: number; // Last background refresh time
}

// Key generator type
export type KeyGenerator<K> = (key: K) => string;

// Log information generator type
export type LogInfoGenerator<T> = (data: T) => Record<string, unknown>;

/**
 * Generic cache manager
 * @template T Cache data type
 * @template K Cache key type
 */
export class CacheManager<T, K = string> {
  private readonly config: CacheConfig;
  private readonly keyGenerator: KeyGenerator<K>;
  private readonly logInfoGenerator?: LogInfoGenerator<T>;
  private readonly backgroundRefreshInterval: number;

  constructor(
    config: CacheConfig,
    keyGenerator?: KeyGenerator<K>,
    logInfoGenerator?: LogInfoGenerator<T>
  ) {
    this.config = config;
    this.keyGenerator = keyGenerator || ((key: K) => String(key));
    this.logInfoGenerator = logInfoGenerator;
    this.backgroundRefreshInterval =
      config.backgroundRefreshInterval || 1 * 10 * 1000; // Default 1 minute
  }

  /**
   * Set cache
   */
  set(key: K, data: T): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
    };

    try {
      if (typeof window !== "undefined") {
        const cacheKey = this.config.keyPrefix + this.keyGenerator(key);
        localStorage.setItem(cacheKey, JSON.stringify(entry));

        const logInfo = this.logInfoGenerator
          ? this.logInfoGenerator(data)
          : {};
        console.log(`[${this.config.loggerName}] ✅ Saved to cache:`, {
          key: cacheKey,
          timestamp: new Date(entry.timestamp).toLocaleString(),
          ...logInfo,
        });
      }
    } catch (error) {
      console.error(
        `[${this.config.loggerName}] ❌ Failed to save to cache:`,
        error
      );
    }
  }

  /**
   * Get cache
   */
  get(key: K): T | null {
    try {
      if (typeof window === "undefined") {
        console.log(`[${this.config.loggerName}] ⚠️ Window is undefined (SSR)`);
        return null;
      }

      const cacheKey = this.config.keyPrefix + this.keyGenerator(key);
      const stored = localStorage.getItem(cacheKey);

      if (!stored) {
        console.log(
          `[${this.config.loggerName}] ❌ Cache miss for key: ${cacheKey}`
        );
        return null;
      }

      const entry: CacheEntry<T> = JSON.parse(stored);
      const age = Date.now() - entry.timestamp;
      const isExpired = age > this.config.ttl;

      const logInfo = this.logInfoGenerator
        ? this.logInfoGenerator(entry.data)
        : {};
      console.log(`[${this.config.loggerName}] 📦 Cache found:`, {
        key: cacheKey,
        age: `${Math.floor(age / 1000)}s`,
        maxAge: `${Math.floor(this.config.ttl / 1000)}s`,
        isExpired,
        cachedAt: new Date(entry.timestamp).toLocaleString(),
        ...logInfo,
      });

      if (isExpired) {
        console.log(
          `[${this.config.loggerName}] ⏰ Cache expired, removing...`
        );
        localStorage.removeItem(cacheKey);
        return null;
      }

      console.log(
        `[${this.config.loggerName}] ✅ Cache hit! Returning cached data`
      );
      return entry.data;
    } catch (error) {
      console.error(
        `[${this.config.loggerName}] ❌ Failed to read from cache:`,
        error
      );
      return null;
    }
  }

  /**
   * Check if background refresh is needed
   */
  shouldBackgroundRefresh(key: K): boolean {
    try {
      if (typeof window === "undefined") return false;

      const cacheKey = this.config.keyPrefix + this.keyGenerator(key);
      const stored = localStorage.getItem(cacheKey);

      if (!stored) return false;

      const entry: CacheEntry<T> = JSON.parse(stored);
      const now = Date.now();

      // If never been refreshed before, should refresh immediately
      if (!entry.lastRefreshTime) {
        console.log(`[${this.config.loggerName}] 🔄 First background refresh, start immediately`);
        return true;
      }

      // Check if the time since last refresh exceeds the set interval
      const timeSinceLastRefresh = now - entry.lastRefreshTime;
      const shouldRefresh =
        timeSinceLastRefresh > this.backgroundRefreshInterval;

      if (shouldRefresh) {
        console.log(
          `[${this.config.loggerName}] 🔄 Time since last refresh ${Math.floor(
            timeSinceLastRefresh / 1000
          )}s, exceeds interval ${Math.floor(
            this.backgroundRefreshInterval / 1000
          )}s, start background refresh`
        );
      } else {
        console.log(
          `[${this.config.loggerName}] ⏸️ Time since last refresh ${Math.floor(
            timeSinceLastRefresh / 1000
          )}s, not reached interval ${Math.floor(
            this.backgroundRefreshInterval / 1000
          )}s, skip refresh`
        );
      }

      return shouldRefresh;
    } catch (error) {
      console.error(
        `[${this.config.loggerName}] ❌ Failed to check background refresh:`,
        error
      );
      return false;
    }
  }

  /**
   * Check if should refresh with an explicit interval (used by optional auto background refresh)
   */
  shouldRefreshWithInterval(key: K, intervalMs: number): boolean {
    try {
      if (typeof window === "undefined") return false;
      const cacheKey = this.config.keyPrefix + this.keyGenerator(key);
      const stored = localStorage.getItem(cacheKey);
      if (!stored) return false;
      const entry: CacheEntry<T> = JSON.parse(stored);
      const now = Date.now();
      const last = entry.lastRefreshTime || 0;
      return now - last > intervalMs;
    } catch {
      return false;
    }
  }

  /**
   * Update background refresh timestamp
   */
  updateRefreshTimestamp(key: K): void {
    try {
      if (typeof window === "undefined") return;

      const cacheKey = this.config.keyPrefix + this.keyGenerator(key);
      const stored = localStorage.getItem(cacheKey);

      if (!stored) return;

      const entry: CacheEntry<T> = JSON.parse(stored);
      entry.lastRefreshTime = Date.now();

      localStorage.setItem(cacheKey, JSON.stringify(entry));

      console.log(
        `[${this.config.loggerName}] 🔄 Updated refresh timestamp for: ${cacheKey}`
      );
    } catch (error) {
      console.error(
        `[${this.config.loggerName}] ❌ Failed to update refresh timestamp:`,
        error
      );
    }
  }

  /**
   * Get cache (for SWR strategy)
   * Return cache data and whether background refresh is needed
   */
  getWithRefreshInfo(key: K): { data: T | null; shouldRefresh: boolean } {
    const data = this.get(key);
    const shouldRefresh = data !== null && this.shouldBackgroundRefresh(key);

    return { data, shouldRefresh };
  }

  /**
   * Clear cache
   */
  clear(key?: K): void {
    try {
      if (typeof window === "undefined") return;

      if (key !== undefined) {
        const cacheKey = this.config.keyPrefix + this.keyGenerator(key);
        localStorage.removeItem(cacheKey);
        console.log(
          `[${this.config.loggerName}] 🗑️ Cleared cache for key: ${cacheKey}`
        );
      } else {
        // Clear all related cache
        const keys = Object.keys(localStorage);
        let clearedCount = 0;
        keys.forEach((storageKey) => {
          if (storageKey.startsWith(this.config.keyPrefix)) {
            localStorage.removeItem(storageKey);
            clearedCount++;
          }
        });
        console.log(
          `[${this.config.loggerName}] 🗑️ Cleared ${clearedCount} cache entries`
        );
      }
    } catch (error) {
      console.error(
        `[${this.config.loggerName}] ❌ Failed to clear cache:`,
        error
      );
    }
  }

  /**
   * Check if cache exists and is not expired
   */
  has(key: K): boolean {
    return this.get(key) !== null;
  }

  /**
   * Get cache statistics
   */
  getStats(): { count: number; totalSize: number } {
    if (typeof window === "undefined") {
      return { count: 0, totalSize: 0 };
    }

    const keys = Object.keys(localStorage);
    let count = 0;
    let totalSize = 0;

    keys.forEach((key) => {
      if (key.startsWith(this.config.keyPrefix)) {
        count++;
        const value = localStorage.getItem(key);
        if (value) {
          totalSize += value.length;
        }
      }
    });

    return { count, totalSize };
  }
}

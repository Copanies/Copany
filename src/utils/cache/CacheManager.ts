// 缓存配置接口
export interface CacheConfig {
  keyPrefix: string; // 缓存键前缀
  ttl: number; // 缓存时间（毫秒）
  loggerName: string; // 日志标识名称
  backgroundRefreshInterval?: number; // 后台刷新间隔（毫秒），默认10分钟
}

// 缓存条目接口
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  lastRefreshTime?: number; // 最后一次后台刷新时间
}

// 键生成器类型
export type KeyGenerator<K> = (key: K) => string;

// 日志信息生成器类型
export type LogInfoGenerator<T> = (data: T) => Record<string, unknown>;

/**
 * 通用缓存管理器
 * @template T 缓存数据类型
 * @template K 缓存键类型
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
      config.backgroundRefreshInterval || 10 * 60 * 1000; // 默认10分钟
  }

  /**
   * 设置缓存
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
   * 获取缓存
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
   * 检查是否需要后台刷新
   */
  shouldBackgroundRefresh(key: K): boolean {
    try {
      if (typeof window === "undefined") return false;

      const cacheKey = this.config.keyPrefix + this.keyGenerator(key);
      const stored = localStorage.getItem(cacheKey);

      if (!stored) return false;

      const entry: CacheEntry<T> = JSON.parse(stored);
      const now = Date.now();

      // 如果从未后台刷新过，应该立即刷新
      if (!entry.lastRefreshTime) {
        console.log(`[${this.config.loggerName}] 🔄 首次后台刷新，立即启动`);
        return true;
      }

      // 检查距离上次刷新是否超过设定的间隔时间
      const timeSinceLastRefresh = now - entry.lastRefreshTime;
      const shouldRefresh =
        timeSinceLastRefresh > this.backgroundRefreshInterval;

      if (shouldRefresh) {
        console.log(
          `[${this.config.loggerName}] 🔄 距离上次刷新 ${Math.floor(
            timeSinceLastRefresh / 1000
          )}s，超过间隔 ${Math.floor(
            this.backgroundRefreshInterval / 1000
          )}s，启动后台刷新`
        );
      } else {
        console.log(
          `[${this.config.loggerName}] ⏸️ 距离上次刷新 ${Math.floor(
            timeSinceLastRefresh / 1000
          )}s，未达到间隔 ${Math.floor(
            this.backgroundRefreshInterval / 1000
          )}s，跳过刷新`
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
   * 更新后台刷新时间戳
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
   * 获取缓存（用于 SWR 策略）
   * 返回缓存数据和是否需要后台刷新的标志
   */
  getWithRefreshInfo(key: K): { data: T | null; shouldRefresh: boolean } {
    const data = this.get(key);
    const shouldRefresh = data !== null && this.shouldBackgroundRefresh(key);

    return { data, shouldRefresh };
  }

  /**
   * 清除缓存
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
        // 清除所有相关缓存
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
   * 检查缓存是否存在且未过期
   */
  has(key: K): boolean {
    return this.get(key) !== null;
  }

  /**
   * 获取缓存统计信息
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

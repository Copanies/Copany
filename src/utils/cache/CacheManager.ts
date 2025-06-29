// 缓存配置接口
export interface CacheConfig {
  keyPrefix: string; // 缓存键前缀
  ttl: number; // 缓存时间（毫秒）
  loggerName: string; // 日志标识名称
}

// 缓存条目接口
interface CacheEntry<T> {
  data: T;
  timestamp: number;
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

  constructor(
    config: CacheConfig,
    keyGenerator?: KeyGenerator<K>,
    logInfoGenerator?: LogInfoGenerator<T>
  ) {
    this.config = config;
    this.keyGenerator = keyGenerator || ((key: K) => String(key));
    this.logInfoGenerator = logInfoGenerator;
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

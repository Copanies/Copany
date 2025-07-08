import { CacheManager } from "./CacheManager";

/**
 * 缓存配置选项
 */
export interface DataManagerConfig<T> {
  /** 缓存管理器实例 */
  cacheManager: CacheManager<T, string>;
  /** 管理器名称（用于日志） */
  managerName: string;
  /** 数据验证函数（可选） */
  validator?: (data: T) => T;
  /** 是否支持过期缓存降级 */
  enableStaleCache?: boolean;
}

/**
 * 单个数据项操作接口（用于数组类型的数据）
 */
export interface DataItemOperations<T, TItem> {
  /** 从数组中查找单个项的函数 */
  findItem?: (data: T, itemId: string) => TItem | null;
  /** 更新数组中单个项的函数 */
  updateItem?: (data: T, itemId: string, updatedItem: TItem) => T;
  /** 向数组添加新项的函数 */
  addItem?: (data: T, newItem: TItem) => T;
  /** 从数组删除项的函数 */
  removeItem?: (data: T, itemId: string) => T;
}

/**
 * 通用数据管理器基类
 * 提供智能缓存、数据验证、降级处理等高级功能
 * 支持 SWR (Stale While Revalidate) 策略
 */
export abstract class GenericDataManager<T, TItem = T> {
  protected readonly config: DataManagerConfig<T>;
  private readonly itemOps?: DataItemOperations<T, TItem>;
  private backgroundRefreshPromises = new Map<string, Promise<T>>();

  constructor(
    config: DataManagerConfig<T>,
    itemOperations?: DataItemOperations<T, TItem>
  ) {
    this.config = config;
    this.itemOps = itemOperations;
  }

  /**
   * 获取数据（支持 SWR 策略）
   * @param key 缓存键
   * @param fetchFn 数据获取函数
   * @param forceRefresh 是否强制刷新
   * @returns 数据
   */
  async getData(
    key: string,
    fetchFn: () => Promise<T>,
    forceRefresh: boolean = false
  ): Promise<T> {
    // 如果强制刷新，清除缓存并等待网络请求
    if (forceRefresh) {
      this.config.cacheManager.clear(key);
      return this.fetchAndCache(key, fetchFn);
    }

    // 获取缓存和刷新信息
    const { data: cachedData, shouldRefresh } =
      this.config.cacheManager.getWithRefreshInfo(key);

    // 缓存命中
    if (cachedData !== null) {
      console.log(
        `[${this.config.managerName}] ✅ 缓存命中，立即返回: ${this.getDataInfo(
          cachedData
        )}`
      );

      // 检查是否需要后台刷新（首次访问或超过时间间隔）
      if (shouldRefresh && !this.backgroundRefreshPromises.has(key)) {
        console.log(
          `[${this.config.managerName}] 🚀 立即启动后台刷新，获取最新数据...`
        );
        this.startBackgroundRefresh(key, fetchFn);
      } else if (this.backgroundRefreshPromises.has(key)) {
        console.log(
          `[${this.config.managerName}] ⏳ 后台刷新已在进行中，跳过重复请求`
        );
      }

      return cachedData;
    }

    // 缓存未命中，等待网络请求
    console.log(`[${this.config.managerName}] ❌ 缓存未命中，等待网络请求...`);
    return this.fetchAndCache(key, fetchFn);
  }

  /**
   * 启动后台刷新
   */
  private startBackgroundRefresh(key: string, fetchFn: () => Promise<T>): void {
    // 立即更新刷新时间戳，防止重复刷新
    this.config.cacheManager.updateRefreshTimestamp(key);

    // 启动后台刷新
    const refreshPromise = this.fetchAndCache(key, fetchFn, true)
      .then((data) => {
        console.log(
          `[${this.config.managerName}] ✅ 后台刷新完成: ${this.getDataInfo(
            data
          )}`
        );
        return data;
      })
      .catch((error) => {
        console.error(`[${this.config.managerName}] ❌ 后台刷新失败:`, error);
        throw error;
      })
      .finally(() => {
        // 清理 Promise 引用
        this.backgroundRefreshPromises.delete(key);
      });

    // 存储 Promise 引用，防止重复刷新
    this.backgroundRefreshPromises.set(key, refreshPromise);
  }

  /**
   * 获取并缓存数据
   */
  private async fetchAndCache(
    key: string,
    fetchFn: () => Promise<T>,
    isBackgroundRefresh: boolean = false
  ): Promise<T> {
    try {
      if (!isBackgroundRefresh) {
        console.log(`[${this.config.managerName}] 🔄 正在加载数据...`);
      }

      const data = await fetchFn();

      // 验证数据
      const validData = this.config.validator
        ? this.config.validator(data)
        : data;

      // 缓存数据
      this.config.cacheManager.set(key, validData);

      if (!isBackgroundRefresh) {
        console.log(
          `[${this.config.managerName}] ✅ 数据加载完成: ${this.getDataInfo(
            validData
          )}`
        );
      }

      return validData;
    } catch (error) {
      if (!isBackgroundRefresh) {
        console.error(`[${this.config.managerName}] ❌ 加载数据失败:`, error);

        // 如果启用了过期缓存降级，尝试返回过期数据
        if (this.config.enableStaleCache) {
          const staleCache = this.getStaleCache(key);
          if (staleCache) {
            console.log(
              `[${
                this.config.managerName
              }] ⚠️ 使用过期缓存数据: ${this.getDataInfo(staleCache)}`
            );
            return staleCache;
          }
        }
      } else {
        console.error(`[${this.config.managerName}] ❌ 后台刷新失败:`, error);
      }

      throw error;
    }
  }

  /**
   * 清除缓存
   * @param key 缓存键（可选，不传则清除所有）
   */
  clearCache(key?: string): void {
    if (key) {
      this.config.cacheManager.clear(key);
      // 取消对应的后台刷新
      this.backgroundRefreshPromises.delete(key);
      console.log(`[${this.config.managerName}] 🗑️ 已清除键 ${key} 的缓存`);
    } else {
      this.config.cacheManager.clear();
      // 清除所有后台刷新
      this.backgroundRefreshPromises.clear();
      console.log(`[${this.config.managerName}] 🗑️ 已清除所有缓存`);
    }
  }

  /**
   * 获取缓存的数据（不会触发网络请求）
   */
  getCachedData(key: string): T | null {
    return this.config.cacheManager.get(key);
  }

  /**
   * 检查数据是否已缓存
   */
  hasData(key: string): boolean {
    return this.config.cacheManager.has(key);
  }

  /**
   * 手动设置缓存数据
   */
  setData(key: string, data: T): void {
    this.config.cacheManager.set(key, data);
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats(): { count: number; totalSize: number } {
    return this.config.cacheManager.getStats();
  }

  /**
   * 预热缓存
   */
  async preloadData(key: string, fetchFn: () => Promise<T>): Promise<void> {
    try {
      await this.getData(key, fetchFn);
      console.log(`[${this.config.managerName}] ✅ 缓存预热完成: ${key}`);
    } catch (error) {
      console.error(`[${this.config.managerName}] ❌ 缓存预热失败:`, error);
    }
  }

  /**
   * 检查是否正在后台刷新
   */
  isBackgroundRefreshing(key: string): boolean {
    return this.backgroundRefreshPromises.has(key);
  }

  /**
   * 等待后台刷新完成
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
   * 获取过期缓存数据（用于降级处理）
   */
  protected getStaleCache(key: string): T | null {
    try {
      const stats = this.config.cacheManager.getStats();
      if (stats.count === 0) return null;

      // 尝试从 localStorage 查找匹配的键
      const allKeys = Object.keys(localStorage);
      for (const storageKey of allKeys) {
        // 如果这个键对应的是我们想要的数据
        if (storageKey.endsWith("_" + key) || storageKey.includes(key)) {
          const stored = localStorage.getItem(storageKey);
          if (stored) {
            try {
              const entry = JSON.parse(stored);
              return entry.data || null;
            } catch {
              // 忽略解析错误
            }
          }
        }
      }

      return null;
    } catch (error) {
      console.error(`[${this.config.managerName}] ❌ 获取过期缓存失败:`, error);
      return null;
    }
  }

  /**
   * 从缓存中查找单个数据项（仅适用于数组类型数据）
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
   * 更新缓存中的单个数据项（仅适用于数组类型数据）
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
   * 向缓存添加新的数据项（仅适用于数组类型数据）
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
   * 从缓存删除数据项（仅适用于数组类型数据）
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
   * 获取数据信息字符串（用于日志）
   * 子类应该重写此方法来提供有意义的数据描述
   */
  protected abstract getDataInfo(data: T): string;
}

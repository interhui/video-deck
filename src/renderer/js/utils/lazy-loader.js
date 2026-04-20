/**
 * LazyLoader - 统一的懒加载管理器
 * 用于管理电影列表的渐进式加载
 */
class LazyLoader {
    /**
     * 创建懒加载管理器
     * @param {object} options - 配置选项
     * @param {Function} options.loadPage - 加载某一页数据的函数，接收 (page, pageSize) 参数，返回 Promise<{ movies: [], total, page, pageSize, totalPages }>
     * @param {Function} options.onRender - 渲染数据的回调函数，接收 (movies, isAppend) 参数
     * @param {Function} options.onComplete - 加载完成时的回调函数
     * @param {Function} options.onError - 加载失败时的回调函数，接收 (error) 参数
     * @param {number} options.pageSize - 每页加载数量，默认 100
     * @param {number} options.scrollContainer - 滚动容器，默认为 window
     * @param {number} options.threshold - 触发加载的阈值（像素），默认 200
     */
    constructor(options) {
        this.loadPage = options.loadPage;
        this.onRender = options.onRender;
        this.onComplete = options.onComplete || (() => {});
        this.onError = options.onError || ((error) => console.error('LazyLoader error:', error));
        this.pageSize = options.pageSize || 100;
        this.scrollContainer = options.scrollContainer || window;
        this.threshold = options.threshold || 200;

        this.currentPage = 0;
        this.totalPages = 0;
        this.isLoading = false;
        this.hasMore = true;
        this.allMovies = [];

        console.debug('LazyLoader: Initialized with scrollContainer:', this.scrollContainer);
        this.bindScrollEvent();
    }

    /**
     * 加载第一页数据
     */
    async loadFirstPage() {
        console.debug('LazyLoader: loadFirstPage called');
        if (this.isLoading) return;

        this.isLoading = true;
        this.currentPage = 1;

        try {
            console.debug('LazyLoader: Calling loadPage with page:', this.currentPage, 'pageSize:', this.pageSize);
            const result = await this.loadPage(this.currentPage, this.pageSize);
            console.debug('LazyLoader: loadPage returned', result);
            this.handleLoadResult(result, false);
        } catch (error) {
            console.error('LazyLoader: loadPage error', error);
            this.onError(error);
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * 加载下一页数据
     */
    async loadNextPage() {
        console.debug('LazyLoader: loadNextPage called', { isLoading: this.isLoading, hasMore: this.hasMore });
        if (this.isLoading || !this.hasMore) {
            console.debug('LazyLoader: Skipping loadNextPage');
            return;
        }

        this.isLoading = true;
        this.currentPage++;
        console.debug('LazyLoader: Calling loadPage with page:', this.currentPage, 'pageSize:', this.pageSize);

        try {
            const result = await this.loadPage(this.currentPage, this.pageSize);
            console.debug('LazyLoader: loadPage returned', result);
            this.handleLoadResult(result, true);
        } catch (error) {
            console.error('LazyLoader: loadPage error', error);
            this.currentPage--;
            this.onError(error);
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * 处理加载结果
     * @param {object} result - 加载结果
     * @param {boolean} isAppend - 是否追加模式
     */
    handleLoadResult(result, isAppend) {
        console.debug('LazyLoader: handleLoadResult called', { isAppend, result });
        if (!result || result.error) {
            this.onError(new Error(result?.error || 'Unknown error'));
            return;
        }

        const { movies, total, totalPages } = result;
        this.totalPages = totalPages || Math.ceil(total / this.pageSize);

        console.debug('LazyLoader: totalPages:', this.totalPages, 'currentPage:', this.currentPage);

        if (isAppend) {
            this.allMovies = [...this.allMovies, ...movies];
        } else {
            this.allMovies = movies;
        }

        this.hasMore = this.currentPage < this.totalPages;
        console.debug('LazyLoader: hasMore set to:', this.hasMore);

        // 调用渲染回调
        this.onRender(movies, isAppend);

        // 如果加载完成，调用完成回调
        if (!this.hasMore) {
            this.onComplete();
        }
    }

    /**
     * 检测滚动是否到达底部
     */
    handleScroll() {
        console.debug('LazyLoader: handleScroll called', { isLoading: this.isLoading, hasMore: this.hasMore });

        if (this.isLoading || !this.hasMore) {
            console.debug('LazyLoader: Skipping - isLoading:', this.isLoading, 'hasMore:', this.hasMore);
            return;
        }

        let scrollTop, scrollHeight, clientHeight;

        // 判断是否为window或window-like对象
        const isWindow = !this.scrollContainer ||
                         this.scrollContainer === window ||
                         (typeof window !== 'undefined' && this.scrollContainer === window.document.defaultView);

        if (isWindow) {
            // window滚动
            scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            scrollHeight = document.documentElement.scrollHeight;
            clientHeight = window.innerHeight;
            console.debug('LazyLoader: Using window scroll', { scrollTop, scrollHeight, clientHeight });
        } else {
            // 元素滚动
            scrollTop = this.scrollContainer.scrollTop;
            scrollHeight = this.scrollContainer.scrollHeight;
            clientHeight = this.scrollContainer.clientHeight;
            console.debug('LazyLoader: Using element scroll', {
                scrollTop, scrollHeight, clientHeight,
                tagName: this.scrollContainer.tagName,
                threshold: this.threshold
            });
        }

        // 检测是否接近底部
        const distanceToBottom = scrollHeight - (scrollTop + clientHeight);
        console.debug('LazyLoader: Distance to bottom:', distanceToBottom, 'threshold:', this.threshold);

        if (scrollTop + clientHeight >= scrollHeight - this.threshold) {
            console.debug('LazyLoader: Loading next page...');
            this.loadNextPage();
        }
    }

    /**
     * 绑定滚动事件
     */
    bindScrollEvent() {
        this.scrollHandler = () => this.handleScroll();
        if (this.scrollContainer) {
            this.scrollContainer.addEventListener('scroll', this.scrollHandler);
            console.debug('LazyLoader: Scroll event listener added to', this.scrollContainer.tagName || 'window');
        } else {
            console.warn('LazyLoader: No scroll container found, using window');
            window.addEventListener('scroll', this.scrollHandler);
        }
    }

    /**
     * 移除滚动事件监听
     */
    unbindScrollEvent() {
        if (this.scrollHandler) {
            if (this.scrollContainer) {
                this.scrollContainer.removeEventListener('scroll', this.scrollHandler);
            } else {
                window.removeEventListener('scroll', this.scrollHandler);
            }
            this.scrollHandler = null;
        }
    }

    /**
     * 重置懒加载器状态
     */
    reset() {
        this.currentPage = 0;
        this.totalPages = 0;
        this.isLoading = false;
        this.hasMore = true;
        this.allMovies = [];
    }

    /**
     * 销毁实例
     */
    destroy() {
        this.unbindScrollEvent();
        this.reset();
        this.loadPage = null;
        this.onRender = null;
        this.onComplete = null;
        this.onError = null;
    }

    /**
     * 获取已加载的电影总数
     * @returns {number}
     */
    getLoadedCount() {
        return this.allMovies.length;
    }

    /**
     * 获取是否正在加载
     * @returns {boolean}
     */
    getIsLoading() {
        return this.isLoading;
    }

    /**
     * 获取是否还有更多数据
     * @returns {boolean}
     */
    getHasMore() {
        return this.hasMore;
    }
}

// 如果是模块环境，导出类
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LazyLoader;
}

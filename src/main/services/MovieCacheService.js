/**
 * 电影库缓存服务
 * 负责管理电影库的内存缓存，提升数据加载效率
 */
const { sortMovies } = require('../utils/MovieUtils');

class MovieCacheService {
    constructor() {
        // 缓存数据结构：
        // {
        //   movies: [...],           // 所有电影列表
        //   moviesByCategory: {      // 按分类分组
        //     action: [...],
        //     drama: [...]
        //   },
        //   moviesById: {            // 按电影ID索引
        //     'action-movie1': {...}
        //   },
        //   lastUpdated: timestamp   // 最后更新时间
        // }
        this.cache = null;
        this.isInitialized = false;
    }

    /**
     * 初始化缓存
     * @param {Array} movies - 电影列表
     * @param {string} moviesDir - 电影目录
     */
    initializeCache(movies, moviesDir) {
        const moviesByCategory = {};
        const moviesById = {};

        for (const movie of movies) {
            // 按分类分组
            const category = movie.category;
            if (!moviesByCategory[category]) {
                moviesByCategory[category] = [];
            }
            moviesByCategory[category].push(movie);

            // 按ID索引
            moviesById[movie.id] = movie;
        }

        this.cache = {
            movies: movies,
            moviesByCategory: moviesByCategory,
            moviesById: moviesById,
            moviesDir: moviesDir,
            lastUpdated: Date.now()
        };
        this.isInitialized = true;
    }

    /**
     * 检查缓存是否已初始化
     * @returns {boolean}
     */
    isCacheInitialized() {
        return this.isInitialized;
    }

    /**
     * 获取缓存是否为空
     * @returns {boolean}
     */
    isCacheEmpty() {
        return !this.cache || !this.cache.movies || this.cache.movies.length === 0;
    }

    /**
     * 获取所有电影
     * @returns {Array|null}
     */
    getAllMovies() {
        if (!this.cache) return null;
        return this.cache.movies;
    }

    /**
     * 获取指定分类的电影列表
     * @param {string} category - 分类标识
     * @returns {Array|null}
     */
    getMoviesByCategory(category) {
        if (!this.cache) return null;
        return this.cache.moviesByCategory[category] || [];
    }

    /**
     * 获取电影详情
     * @param {string} movieId - 电影ID
     * @returns {object|null}
     */
    getMovieById(movieId) {
        if (!this.cache) return null;
        return this.cache.moviesById[movieId] || null;
    }

    /**
     * 获取缓存信息
     * @returns {object|null}
     */
    getCacheInfo() {
        if (!this.cache) return null;
        return {
            totalMovies: this.cache.movies.length,
            categoryCount: Object.keys(this.cache.moviesByCategory).length,
            lastUpdated: this.cache.lastUpdated,
            moviesDir: this.cache.moviesDir
        };
    }

    /**
     * 清空缓存
     */
    clearCache() {
        this.cache = null;
        this.isInitialized = false;
    }

    /**
     * 添加电影到缓存
     * @param {object} movie - 电影数据
     */
    addMovieToCache(movie) {
        if (!this.cache) {
            throw new Error('Cache not initialized. Call initializeCache first.');
        }

        const category = movie.category;

        // 添加到电影列表
        this.cache.movies.push(movie);

        // 添加到分类分组
        if (!this.cache.moviesByCategory[category]) {
            this.cache.moviesByCategory[category] = [];
        }
        this.cache.moviesByCategory[category].push(movie);

        // 添加到ID索引
        this.cache.moviesById[movie.id] = movie;

        // 更新最后更新时间
        this.cache.lastUpdated = Date.now();
    }

    /**
     * 更新缓存中的电影
     * @param {object} movie - 更新后的电影数据
     */
    updateMovieInCache(movie) {
        if (!this.cache) {
            throw new Error('Cache not initialized. Call initializeCache first.');
        }

        const existingMovie = this.cache.moviesById[movie.id];
        if (!existingMovie) {
            throw new Error(`Movie with id ${movie.id} not found in cache`);
        }

        const category = movie.category;
        const oldCategory = existingMovie.category;

        // 从旧分类分组中移除（如果分类变更）
        if (category !== oldCategory) {
            if (this.cache.moviesByCategory[oldCategory]) {
                this.cache.moviesByCategory[oldCategory] = this.cache.moviesByCategory[oldCategory].filter(
                    m => m.id !== movie.id
                );
            }

            // 添加到新分类分组
            if (!this.cache.moviesByCategory[category]) {
                this.cache.moviesByCategory[category] = [];
            }
            this.cache.moviesByCategory[category].push(movie);
        } else {
            // 同一分类内更新
            const categoryMovies = this.cache.moviesByCategory[category];
            if (categoryMovies) {
                const index = categoryMovies.findIndex(m => m.id === movie.id);
                if (index >= 0) {
                    categoryMovies[index] = movie;
                }
            }
        }

        // 更新ID索引
        this.cache.moviesById[movie.id] = movie;

        // 更新电影列表中的引用
        const moviesIndex = this.cache.movies.findIndex(m => m.id === movie.id);
        if (moviesIndex >= 0) {
            this.cache.movies[moviesIndex] = movie;
        }

        // 更新最后更新时间
        this.cache.lastUpdated = Date.now();
    }

    /**
     * 从缓存中移除电影
     * @param {string} movieId - 电影ID
     */
    removeMovieFromCache(movieId) {
        if (!this.cache) {
            throw new Error('Cache not initialized. Call initializeCache first.');
        }

        const movie = this.cache.moviesById[movieId];
        if (!movie) {
            return; // 电影不存在，无需移除
        }

        const category = movie.category;

        // 从电影列表中移除
        this.cache.movies = this.cache.movies.filter(m => m.id !== movieId);

        // 从分类分组中移除
        if (this.cache.moviesByCategory[category]) {
            this.cache.moviesByCategory[category] = this.cache.moviesByCategory[category].filter(
                m => m.id !== movieId
            );
        }

        // 从ID索引中移除
        delete this.cache.moviesById[movieId];

        // 更新最后更新时间
        this.cache.lastUpdated = Date.now();
    }

    /**
     * 批量添加电影到缓存
     * @param {Array} movies - 电影列表
     */
    addMoviesToCache(movies) {
        for (const movie of movies) {
            this.addMovieToCache(movie);
        }
    }

    /**
     * 批量从缓存中移除电影
     * @param {Array} movieIds - 电影ID列表
     */
    removeMoviesFromCache(movieIds) {
        for (const movieId of movieIds) {
            this.removeMovieFromCache(movieId);
        }
    }

    /**
     * 搜索电影（基于缓存）
     * @param {string} keyword - 搜索关键词
     * @param {object} filters - 筛选条件
     * @returns {Array} 搜索结果
     */
    searchMovies(keyword, filters = {}) {
        if (!this.cache) return [];

        let results = [...this.cache.movies];

        if (keyword) {
            const lowerKeyword = keyword.toLowerCase();
            results = results.filter(movie =>
                movie.name.toLowerCase().includes(lowerKeyword) ||
                (movie.description && movie.description.toLowerCase().includes(lowerKeyword)) ||
                (movie.director && movie.director.toLowerCase().includes(lowerKeyword)) ||
                (movie.actors && movie.actors.some(actor => actor.toLowerCase().includes(lowerKeyword))) ||
                (movie.tags && movie.tags.some(tag => tag.toLowerCase().includes(lowerKeyword)))
            );
        }

        if (filters.category) {
            results = results.filter(movie => movie.category === filters.category);
        }

        if (filters.tagId) {
            results = results.filter(movie =>
                movie.tags && movie.tags.includes(filters.tagId)
            );
        }

        if (filters.rating !== undefined && filters.rating !== null && filters.rating !== '') {
            const rating = parseInt(filters.rating, 10);
            if (!isNaN(rating)) {
                results = results.filter(movie =>
                    movie.userRating !== undefined && movie.userRating === rating
                );
            }
        }

        if (filters.actors && Array.isArray(filters.actors) && filters.actors.length > 0) {
            results = results.filter(movie =>
                movie.actors && movie.actors.some(actorName =>
                    filters.actors.includes(actorName)
                )
            );
        }

        results = this.sortMovies(results, filters.sortBy, filters.sortOrder);

        return results;
    }

    /**
     * 获取分页电影列表
     * @param {number} page - 页码（从1开始）
     * @param {number} pageSize - 每页数量，默认100
     * @param {object} filters - 筛选条件 { category, tagId, rating, actors, sortBy, sortOrder }
     * @returns {object} { movies: [], total, page, pageSize, totalPages }
     */
    getMoviesPaginated(page = 1, pageSize = 100, filters = {}) {
        if (!this.cache) {
            return { movies: [], total: 0, page, pageSize, totalPages: 0 };
        }

        // 先获取筛选后的所有电影
        let results = [...this.cache.movies];

        // 分类筛选
        if (filters.category) {
            results = results.filter(movie => movie.category === filters.category);
        }

        // 标签筛选
        if (filters.tagId) {
            results = results.filter(movie =>
                movie.tags && movie.tags.includes(filters.tagId)
            );
        }

        // 评分筛选
        if (filters.rating !== undefined && filters.rating !== null && filters.rating !== '') {
            const rating = parseInt(filters.rating, 10);
            if (!isNaN(rating)) {
                results = results.filter(movie =>
                    movie.userRating !== undefined && movie.userRating === rating
                );
            }
        }

        // 演员筛选（多选）- OR逻辑：电影包含任一指定的演员即返回
        if (filters.actors && Array.isArray(filters.actors) && filters.actors.length > 0) {
            results = results.filter(movie =>
                movie.actors && movie.actors.some(actorName =>
                    filters.actors.includes(actorName)
                )
            );
        }

        // 排序
        results = this.sortMovies(results, filters.sortBy, filters.sortOrder);

        // 计算分页
        const total = results.length;
        const totalPages = Math.ceil(total / pageSize);
        const startIndex = (page - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        const paginatedMovies = results.slice(startIndex, endIndex);

        return {
            movies: paginatedMovies,
            total,
            page,
            pageSize,
            totalPages
        };
    }

    /**
     * 对电影列表进行排序
     * @param {Array} movies - 电影列表
     * @param {string} sortBy - 排序字段
     * @param {string} sortOrder - 排序方向
     * @returns {Array} 排序后的列表
     */
    sortMovies(movies, sortBy = 'name', sortOrder = 'asc') {
        return sortMovies(movies, sortBy, sortOrder);
    }
}

module.exports = MovieCacheService;

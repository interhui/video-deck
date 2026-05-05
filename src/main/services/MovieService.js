/**
 * 电影服务
 * 负责电影数据的业务逻辑处理
 */
const FileService = require('./FileService');
const HardCodeService = require('./HardCodeService');
const MovieCacheService = require('./MovieCacheService');
const IndexService = require('./IndexService');
const path = require('path');

class MovieService {
    constructor(categoryService = null) {
        this.fileService = new FileService();
        this.categoryService = categoryService;
        this.hardCodeService = new HardCodeService();
        this.cacheService = new MovieCacheService();
        this.indexService = new IndexService();
        this.actorService = null;
    }

    setActorService(actorService) {
        this.actorService = actorService;
    }

    /**
     * 设置分类服务实例
     * @param {object} categoryService - CategoryService实例
     */
    setCategoryService(categoryService) {
        this.categoryService = categoryService;
    }

    /**
     * 设置缓存服务实例
     * @param {object} cacheService - MovieCacheService实例
     */
    setCacheService(cacheService) {
        this.cacheService = cacheService;
    }

    /**
     * 获取缓存服务实例
     * @returns {object} MovieCacheService实例
     */
    getCacheService() {
        return this.cacheService;
    }

    /**
     * 刷新电影库缓存
     * @param {string} moviesDir - 电影目录
     * @param {Function} onProgress - 进度回调 (current, total, movieName) => void
     * @returns {Promise<object>} 缓存信息
     */
    async refreshCache(moviesDir, onProgress) {
        // 清空缓存
        this.cacheService.clearCache();

        // 重新加载所有电影
        const allMovies = await this.loadAllMoviesFromFiles(moviesDir, onProgress);

        // 初始化缓存
        this.cacheService.initializeCache(allMovies, moviesDir);

        // 重建所有分类的 index.json
        await this.indexService.rebuildAllIndexes(moviesDir);

        return this.cacheService.getCacheInfo();
    }

    /**
     * 从文件加载所有电影
     * @param {string} moviesDir - 电影目录
     * @param {Function} onProgress - 进度回调 (current, total, movieName) => void
     * @returns {Promise<Array>} 电影列表
     */
    async loadAllMoviesFromFiles(moviesDir, onProgress) {
        const categories = await this.fileService.getCategoryFolders(moviesDir);
        const allMovies = [];

        let totalMovies = 0;
        for (const category of categories) {
            const categoryPath = path.join(moviesDir, category);
            const movieFolders = await this.fileService.getMovieFolders(categoryPath);
            totalMovies += Object.keys(movieFolders).length;
        }

        let currentMovie = 0;
        for (const category of categories) {
            const categoryPath = path.join(moviesDir, category);
            const movieFolders = await this.fileService.getMovieFolders(categoryPath);

            for (const [folderName, folderPath] of Object.entries(movieFolders)) {
                currentMovie++;
                const movieData = await this.fileService.readMovieNfo(folderPath);
                if (movieData) {
                    const movie = this.generateMovieData(movieData, folderName, category, folderPath);
                    movie.poster = await this.getMoviePoster(folderPath);
                    
                    const nfoPath = path.join(folderPath, 'movie.nfo');
                    try {
                        const fs = require('fs');
                        const stats = fs.statSync(nfoPath);
                        movie.update_time = stats.mtime.getTime();
                    } catch (e) {
                        movie.update_time = null;
                    }
                    
                    allMovies.push(movie);
                    if (onProgress) {
                        onProgress(currentMovie, totalMovies, movie.title || folderName);
                    }
                } else {
                    if (onProgress) {
                        onProgress(currentMovie, totalMovies, folderName);
                    }
                }
            }
        }

        return allMovies;
    }

    /**
     * 获取所有分类及其电影列表
     * @param {string} moviesDir - 电影存储目录
     * @returns {Promise<object>} 返回分类电影数据
     */
    async getAllCategories(moviesDir) {
        try {
            // 如果缓存未初始化，先初始化缓存
            if (!this.cacheService.isCacheInitialized()) {
                await this.refreshCache(moviesDir);
            }

            const categories = await this.fileService.getCategoryFolders(moviesDir);
            const categoryData = {};

            for (const category of categories) {
                const movies = this.cacheService.getMoviesByCategory(category) || [];
                categoryData[category] = {
                    id: category,
                    name: this.getCategoryName(category),
                    movieCount: movies.length,
                    movies: this.sortMovies(movies, 'name', 'asc')
                };
            }

            return categoryData;
        } catch (error) {
            console.error('Error getting all categories:', error);
            throw error;
        }
    }

    /**
     * 获取分类统计数据
     * @param {string[]} categories - 分类列表
     * @param {string} moviesDir - 电影目录
     * @returns {Promise<object>} 分类统计
     */
    async getCategoryStats(categories, moviesDir) {
        try {
            // 如果缓存未初始化，先初始化缓存
            if (!this.cacheService.isCacheInitialized()) {
                await this.refreshCache(moviesDir);
            }

            const categoryData = [];

            for (const category of categories) {
                const movies = this.cacheService.getMoviesByCategory(category) || [];
                categoryData.push({
                    id: category,
                    name: this.getCategoryName(category),
                    shortName: this.getCategoryShortName(category),
                    movieCount: movies.length,
                    movies: this.sortMovies(movies, 'name', 'asc')
                });
            }

            return categoryData;
        } catch (error) {
            console.error('Error getting category stats:', error);
            throw error;
        }
    }

    /**
     * 根据分类获取电影列表
     * @param {string} category - 分类名称
     * @param {string} moviesDir - 电影存储目录
     * @param {object} options - 筛选和排序选项
     * @returns {Promise<Array>} 返回电影列表
     */
    async getMoviesByCategory(category, moviesDir, options = {}) {
        try {
            const { sortBy, sortOrder, tagId, rating, actors } = options;

            // 如果缓存未初始化，先初始化缓存
            if (!this.cacheService.isCacheInitialized()) {
                await this.refreshCache(moviesDir);
            }

            // 如果有筛选条件，使用 searchMovies
            if (tagId || rating !== undefined && rating !== null && rating !== '' || (actors && actors.length > 0)) {
                const filters = { category, sortBy, sortOrder, tagId, rating, actors };
                return this.cacheService.searchMovies(null, filters);
            }

            const movies = this.cacheService.getMoviesByCategory(category) || [];

            // 排序
            return this.sortMovies(movies, sortBy, sortOrder);
        } catch (error) {
            console.error('Error getting movies by category:', error);
            throw error;
        }
    }

    /**
     * 获取所有电影
     * @param {string} moviesDir - 电影存储目录
     * @param {object} options - 筛选和排序选项
     * @returns {Promise<Array>} 电影列表
     */
    async getAllMovies(moviesDir, options = {}) {
        try {
            // 如果缓存未初始化，先初始化缓存
            if (!this.cacheService.isCacheInitialized()) {
                await this.refreshCache(moviesDir);
            }

            const { sortBy, sortOrder, tagId, rating, actors } = options;

            // 如果有筛选条件，使用 searchMovies
            if (tagId || rating !== undefined && rating !== null && rating !== '' || (actors && actors.length > 0)) {
                const filters = { sortBy, sortOrder, tagId, rating, actors };
                return this.cacheService.searchMovies(null, filters);
            }

            const movies = this.cacheService.getAllMovies() || [];

            // 排序
            return this.sortMovies(movies, sortBy, sortOrder);
        } catch (error) {
            console.error('Error getting all movies:', error);
            throw error;
        }
    }

    /**
     * 从 index.json 快速加载所有电影元数据（用于首页卡片展示）
     * @param {string} moviesDir - 电影存储目录
     * @param {object} options - 筛选和排序选项
     * @returns {Promise<Array>} 电影列表（仅包含 index.json 中的字段）
     */
    async getAllMoviesFromIndex(moviesDir, options = {}) {
        try {
            const { sortBy, sortOrder } = options;

            // 从所有分类的 index.json 加载电影
            const allIndexMovies = await this.indexService.getAllCategoriesIndexMovies(moviesDir);
            const allMovies = [];

            for (const [category, movies] of Object.entries(allIndexMovies)) {
                for (const movie of movies) {
                    allMovies.push({
                        ...movie,
                        category: category
                    });
                }
            }

            // 排序
            return this.sortMovies(allMovies, sortBy, sortOrder);
        } catch (error) {
            console.error('Error getting all movies from index:', error);
            throw error;
        }
    }

    /**
     * 从 index.json 快速加载指定分类的电影元数据
     * @param {string} category - 分类名称
     * @param {string} moviesDir - 电影存储目录
     * @param {object} options - 筛选和排序选项
     * @returns {Promise<Array>} 电影列表
     */
    async getMoviesByCategoryFromIndex(category, moviesDir, options = {}) {
        try {
            const { sortBy, sortOrder } = options;

            const movies = await this.indexService.getMoviesFromIndex(category, moviesDir);
            const moviesWithCategory = movies.map(m => ({ ...m, category }));

            // 排序
            return this.sortMovies(moviesWithCategory, sortBy, sortOrder);
        } catch (error) {
            console.error('Error getting movies by category from index:', error);
            throw error;
        }
    }

    /**
     * 获取分页电影列表（从缓存）
     * @param {string} moviesDir - 电影目录
     * @param {object} options - { page, pageSize, sortBy, sortOrder, category, tagId, rating, actors }
     * @returns {Promise<object>} 分页结果
     */
    async getMoviesPaginated(moviesDir, options = {}) {
        try {
            const { page = 1, pageSize = 100, sortBy, sortOrder, category, tagId, rating, actors } = options;

            // 如果缓存未初始化，先初始化缓存
            if (!this.cacheService.isCacheInitialized()) {
                await this.refreshCache(moviesDir);
            }

            // 使用缓存的分页方法
            return this.cacheService.getMoviesPaginated(page, pageSize, {
                sortBy,
                sortOrder,
                category,
                tagId,
                rating,
                actors
            });
        } catch (error) {
            console.error('Error getting movies paginated:', error);
            throw error;
        }
    }

    /**
     * 获取分页电影列表（从index.json快速加载）
     * @param {string} moviesDir - 电影目录
     * @param {object} options - { page, pageSize, sortBy, sortOrder }
     * @returns {Promise<object>} 分页结果
     */
    async getMoviesPaginatedFromIndex(moviesDir, options = {}) {
        try {
            const { page = 1, pageSize = 100, sortBy, sortOrder } = options;

            // 从所有分类的 index.json 加载电影
            const allIndexMovies = await this.indexService.getAllCategoriesIndexMovies(moviesDir);
            const allMovies = [];

            for (const [cat, movies] of Object.entries(allIndexMovies)) {
                for (const movie of movies) {
                    allMovies.push({
                        ...movie,
                        category: cat
                    });
                }
            }

            // 排序
            const sortedMovies = this.sortMovies(allMovies, sortBy, sortOrder);

            // 计算分页
            const total = sortedMovies.length;
            const totalPages = Math.ceil(total / pageSize);
            const startIndex = (page - 1) * pageSize;
            const endIndex = startIndex + pageSize;
            const paginatedMovies = sortedMovies.slice(startIndex, endIndex);

            return {
                movies: paginatedMovies,
                total,
                page,
                pageSize,
                totalPages
            };
        } catch (error) {
            console.error('Error getting movies paginated from index:', error);
            throw error;
        }
    }

    /**
     * 搜索电影
     * @param {string} keyword - 搜索关键词
     * @param {string} moviesDir - 电影存储目录
     * @param {object} filters - 筛选条件
     * @returns {Promise<Array>} 返回匹配的电影列表
     */
    async searchMovies(keyword, moviesDir, filters = {}) {
        try {
            // 如果缓存未初始化，先初始化缓存
            if (!this.cacheService.isCacheInitialized()) {
                await this.refreshCache(moviesDir);
            }

            // 使用缓存搜索
            return this.cacheService.searchMovies(keyword, filters);
        } catch (error) {
            console.error('Error searching movies:', error);
            throw error;
        }
    }

    /**
     * 获取单个电影详情
     * @param {string} movieId - 电影 ID
     * @param {string} moviesDir - 电影存储目录
     * @returns {Promise<object>} 返回电影详情
     */
    async getMovieDetail(movieId, moviesDir) {
        try {
            // 如果缓存未初始化，先初始化缓存
            if (!this.cacheService.isCacheInitialized()) {
                await this.refreshCache(moviesDir);
            }

            // 从缓存获取
            const movie = this.cacheService.getMovieById(movieId);
            return movie || null;
        } catch (error) {
            console.error('Error getting movie detail:', error);
            throw error;
        }
    }

    /**
     * 验证电影有效性
     * @param {string} moviePath - 电影路径
     * @returns {Promise<boolean>} 是否有效
     */
    async isMovieValid(moviePath) {
        try {
            const movieData = await this.fileService.readMovieNfo(moviePath);
            return movieData !== null && movieData.title !== undefined;
        } catch (error) {
            console.error('Error validating movie:', error);
            return false;
        }
    }

    /**
     * 保存用户评分
     * @param {string} movieId - 电影 ID
     * @param {number} rating - 评分 (1-5)
     * @param {string} comment - 评论
     * @param {string} moviesDir - 电影目录
     */
    async saveRating(movieId, rating, comment, moviesDir) {
        try {
            const movieDetail = await this.getMovieDetail(movieId, moviesDir);
            if (!movieDetail) {
                throw new Error('Movie not found');
            }

            const movieData = await this.fileService.readMovieNfo(movieDetail.path);
            if (!movieData) {
                throw new Error('Movie data not found');
            }

            movieData.userRating = rating;
            if (comment !== undefined) {
                movieData.userComment = comment;
            }

            await this.fileService.writeMovieNfo(movieDetail.path, movieData);

            // 更新缓存
            const updatedMovie = this.generateMovieData(movieData, movieDetail.folderName, movieDetail.category, movieDetail.path);
            updatedMovie.poster = movieDetail.poster;
            this.cacheService.updateMovieInCache(updatedMovie);

            // 更新 index.json
            await this.indexService.updateMovieIndex(updatedMovie, movieDetail.category, moviesDir);

            return { success: true };
        } catch (error) {
            console.error('Error saving rating:', error);
            throw error;
        }
    }

    /**
     * 批量删除电影
     * @param {string[]} movieIds - 电影 ID 数组
     * @param {string} moviesDir - 电影目录
     * @returns {Promise<object>} 删除结果
     */
    async batchDeleteMovies(movieIds, moviesDir) {
        try {
            const results = [];
            for (const movieId of movieIds) {
                const movieDetail = await this.getMovieDetail(movieId, moviesDir);
                if (movieDetail) {
                    await this.fileService.deleteDir(movieDetail.path);
                    // 从缓存中移除
                    this.cacheService.removeMovieFromCache(movieId);
                    // 从 index.json 中移除
                    await this.indexService.deleteMovieFromIndex(movieId, movieDetail.category, moviesDir);
                    results.push({ movieId, deleted: true });
                }
            }
            return { success: true, count: results.length };
        } catch (error) {
            console.error('Error batch deleting movies:', error);
            throw error;
        }
    }

    /**
     * 获取电影统计数据
     * @param {string} category - 分类筛选（可选）
     * @param {string} moviesDir - 电影目录
     * @returns {Promise<object>} 统计数据
     */
    async getStats(category, moviesDir) {
        try {
            // 获取所有电影用于统计
            const allMovies = await this.getAllMovies(moviesDir);

            // 根据分类筛选电影（如果指定了分类）
            const movies = category
                ? allMovies.filter(m => m.category === category)
                : allMovies;

            const stats = {
                totalMovies: movies.length
            };

            return stats;
        } catch (error) {
            console.error('Error getting stats:', error);
            throw error;
        }
    }

    /**
     * 生成完整的电影数据对象
     * @param {object} movieData - 电影 XML nfo 解析后的数据
     * @param {string} folderName - 文件夹名称
     * @param {string} category - 分类
     * @param {string} folderPath - 文件夹路径
     * @returns {object} 完整电影数据
     */
    generateMovieData(movieData, folderName, category, folderPath) {
        // 确保 folderName 有值
        const safeFolderName = folderName || 'unknown';

        // 生成 movieId：格式为 "分类-电影名称"，小写字母
        const movieId = movieData.movieId || this.generateMovieId(category, movieData.title || safeFolderName);

        const fileCount = (movieData.fileset && Array.isArray(movieData.fileset)) ? movieData.fileset.length + (movieData.original_filename ? 1 : 0) : (movieData.original_filename ? 1 : 0);

        return {
            id: movieData.id || `${category}-${safeFolderName}`,
            movieId: movieId,
            title: movieData.title || movieData.name || safeFolderName,
            name: movieData.name || movieData.title || '',
            year: movieData.year || '',
            outline: movieData.outline || '',
            description: movieData.description || movieData.outline || '',
            publishDate: movieData.publishDate || movieData.year || '',
            sorttitle: movieData.sorttitle || '',
            runtime: movieData.runtime || '',
            studio: movieData.studio || '',
            director: movieData.director || '',
            actors: movieData.actors || [],
            tag: movieData.tag || [],
            fileinfo: movieData.fileinfo || '',
            original_filename: movieData.original_filename || '',
            videoCodec: movieData.videoCodec || '',
            videoWidth: movieData.videoWidth || '',
            videoHeight: movieData.videoHeight || '',
            videoDuration: movieData.videoDuration || '',
            category: category,
            userRating: movieData.userRating || 0,
            userComment: movieData.userComment || '',
            tags: movieData.tags || [],
            customTags: movieData.customTags || [],
            notes: movieData.notes || '',
            path: folderPath,
            folderName: safeFolderName,
            fileset: movieData.fileset || [],
            fileCount: fileCount,
            poster: movieData.poster || null
        };
    }

    /**
     * 获取电影海报
     * @param {string} moviePath - 电影路径
     * @returns {Promise<string>} 海报路径或 base64
     */
    async getMoviePoster(moviePath) {
        const posterExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
        const posterNames = ['poster', 'cover', 'folder', 'movie'];

        for (const name of posterNames) {
            for (const ext of posterExtensions) {
                const posterPath = path.join(moviePath, `${name}${ext}`);
                if (await this.fileService.fileExists(posterPath)) {
                    return posterPath;
                }
            }
        }

        return null;
    }

    /**
     * 获取分类显示名称
     * @param {string} category - 分类标识
     * @returns {string} 显示名称
     */
    getCategoryName(category) {
        // 优先使用 CategoryService
        if (this.categoryService) {
            const name = this.categoryService.getCategoryName(category);
            if (name) return name;
        }
        // 回退到 HardCodeService 默认分类
        const defaultCategories = this.hardCodeService.getDefaultCategories();
        const found = defaultCategories.find(c => c.id === category);
        if (found) return found.name;
        return category;
    }

    /**
     * 获取分类短名称
     * @param {string} category - 分类标识
     * @returns {string} 短名称
     */
    getCategoryShortName(category) {
        // 优先使用 CategoryService
        if (this.categoryService) {
            const shortName = this.categoryService.getCategoryShortName(category);
            if (shortName) return shortName;
        }
        // 回退到 HardCodeService 默认分类
        const defaultCategories = this.hardCodeService.getDefaultCategories();
        const found = defaultCategories.find(c => c.id === category);
        if (found) return found.shortName;
        return category;
    }

    /**
     * 对电影列表进行排序
     * @param {Array} movies - 电影列表
     * @param {string} sortBy - 排序字段
     * @param {string} sortOrder - 排序方向
     * @returns {Array} 排序后的列表
     */
    sortMovies(movies, sortBy = 'name', sortOrder = 'asc') {
        if (!sortBy) {
            return movies;
        }

        const sorted = [...movies];

        sorted.sort((a, b) => {
            let valA, valB;

            switch (sortBy) {
                case 'name':
                    valA = a.title.toLowerCase();
                    valB = b.title.toLowerCase();
                    break;
                case 'rating':
                    valA = a.userRating || 0;
                    valB = b.userRating || 0;
                    break;
                case 'year':
                    valA = a.year || 0;
                    valB = b.year || 0;
                    break;
                case 'actor':
                    valA = (a.actors && a.actors.length > 0) ? a.actors[0].toLowerCase() : '';
                    valB = (b.actors && b.actors.length > 0) ? b.actors[0].toLowerCase() : '';
                    break;
                case 'releasedate':
                    valA = a.year || 0;
                    valB = b.year || 0;
                    break;
                default:
                    valA = a.title.toLowerCase();
                    valB = b.title.toLowerCase();
            }

            if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
            if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });

        return sorted;
    }



    /**
     * 生成电影ID
     * 格式：分类-电影名称（小写字母）
     * @param {string} category - 分类标识
     * @param {string} movieName - 电影名称
     * @returns {string} 电影ID
     */
    generateMovieId(category, movieName) {
        // 去除特殊字符，只保留字母、数字、中文和连字符
        const normalizedName = movieName
            .replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '-') // 非字母数字中文转为连字符
            .replace(/-+/g, '-') // 多个连字符合并为一个
            .replace(/^-|-$/g, ''); // 去除首尾连字符

        return `${category}-${normalizedName}`;
    }

    /**
     * 添加单个电影
     * @param {object} movieData - 电影数据
     * @param {string} movieData.title - 电影名称
     * @param {string} movieData.description - 电影描述
     * @param {string} movieData.category - 分类
     * @param {string} movieData.year - 发行年份
     * @param {string} movieData.director - 导演
     * @param {string[]} movieData.actors - 演员
     * @param {string} movieData.studio - 制作商
     * @param {string[]} movieData.tags - 标签
     * @param {Array} movieData.fileset - 电影关联文件列表
     * @param {string} coverImagePath - 封面图片路径
     * @param {string} moviesDir - 电影目录
     * @returns {Promise<object>} 创建的电影信息
     */
    async addMovie(movieData, coverImagePath, moviesDir) {
        try {
            const { title, description, category, year, director, actors, studio, tags, fileset, customId } = movieData;

            // 生成电影ID和文件夹名称
            const movieId = customId || this.generateMovieId(category, title);
            const folderName = this.generateFolderName(movieId, title, year, 'movieId');

            // 确保分类目录存在
            const categoryPath = path.join(moviesDir, category);
            await this.fileService.ensureDir(categoryPath);

            // 创建电影文件夹
            const moviePath = path.join(categoryPath, folderName);
            await this.fileService.ensureDir(moviePath);

            // 准备电影数据
            const newMovieData = {
                id: movieId,
                title: title,
                description: description || '',
                category: category,
                year: year || '',
                director: director || '',
                actors: actors || [],
                studio: studio || '',
                tags: tags || [],
                userRating: 0,
                userComment: '',
                fileset: fileset || []
            };

            // 写入 movie.nfo
            await this.fileService.writeMovieNfo(moviePath, newMovieData);

            // 如果有封面图片，复制到电影文件夹
            let poster = null;
            if (coverImagePath) {
                const ext = this.fileService.getFileExtension(coverImagePath);
                const coverDestPath = path.join(moviePath, `poster${ext}`);
                await this.fileService.copyFile(coverImagePath, coverDestPath);
                poster = coverDestPath;
            }

            // 生成电影对象
            const movie = this.generateMovieData(newMovieData, folderName, category, moviePath);
            movie.poster = poster;

            // 添加到缓存
            if (this.cacheService.isCacheInitialized()) {
                this.cacheService.addMovieToCache(movie);
            }

            // 更新 index.json
            await this.indexService.updateMovieIndex(movie, category, moviesDir);

            return {
                success: true,
                movie: movie
            };
        } catch (error) {
            console.error('Error adding movie:', error);
            throw error;
        }
    }

    /**
     * 扫描电影目录
     * @param {string} scanPath - 扫描路径（目录或CSV文件）
     * @param {string} scanType - 扫描类型：'directory' 或 'file' (CSV)
     * @param {string} category - 分类
     * @param {string} moviesDir - 电影目录
     * @param {string} dirNaming - 目录命名方式：'movieId'（电影ID）或 'movieName'（电影名称/年份）
     * @returns {Promise<object>} 扫描结果
     */
    async scanMovieDirectory(scanPath, scanType, category, moviesDir, dirNaming = 'movieId') {
        try {
            // 生成临时目录路径
            const timestamp = Date.now();
            const tempDir = path.join(moviesDir, `tmp-${timestamp}`);

            // 创建临时目录
            await this.fileService.ensureDir(tempDir);

            let scannedMovies = [];

            if (scanType === 'directory') {
                // 目录扫描模式：递归扫描所有子文件夹，提取movie.nfo和海报
                scannedMovies = await this.scanDirectoryMode(scanPath, tempDir, category, dirNaming);
            } else if (scanType === 'file') {
                // 文件扫描模式（CSV）：解析CSV文件
                scannedMovies = await this.scanCsvMode(scanPath, tempDir, category, dirNaming);
            }

            // 写入总览文件
            const overviewData = {
                scanTime: new Date().toISOString(),
                scanType: scanType,
                scanPath: scanPath,
                category: category,
                totalMovies: scannedMovies.length,
                movies: scannedMovies.map(m => ({
                    id: m.movieData.id,
                    name: m.movieData.title,
                    folderName: m.folderName,
                    sourcePath: m.sourcePath,
                    posterPath: m.movieData.poster || null
                }))
            };
            await this.fileService.writeJson(path.join(tempDir, 'movies.json'), overviewData);

            return {
                success: true,
                tempDir: tempDir,
                movies: scannedMovies
            };
        } catch (error) {
            console.error('Error scanning movie directory:', error);
            throw error;
        }
    }

    /**
     * 目录扫描模式：递归扫描目录，提取movie.nfo和海报
     * @param {string} scanPath - 扫描路径
     * @param {string} tempDir - 临时目录
     * @param {string} category - 分类
     * @param {string} dirNaming - 目录命名方式：'movieId'（电影ID）或 'movieName'（电影名称/年份）
     * @returns {Promise<object[]>} 扫描结果
     */
    async scanDirectoryMode(scanPath, tempDir, category, dirNaming) {
        const scannedMovies = [];

        // 递归扫描目录，查找包含movie.nfo的文件夹
        const movieFolders = await this.fileService.scanDirectoryRecursively(scanPath);

        for (const folderInfo of movieFolders) {
            try {
                const movieData = await this.fileService.readMovieNfo(folderInfo.nfoPath, false);

                if (!movieData) {
                    console.warn(`Skipping folder without valid NFO: ${folderInfo.folderPath}`);
                    continue;
                }

                // 使用现有ID或生成新ID
                const movieId = movieData.id || this.generateMovieId(category, movieData.title || folderInfo.folderName);

                // 根据目录命名方式生成文件夹名称
                const folderName = this.generateFolderName(movieId, movieData.title || movieData.name || folderInfo.folderName, movieData.year, dirNaming);
                const movieTempDir = path.join(tempDir, folderName);
                await this.fileService.ensureDir(movieTempDir);

                // 构建完整的电影数据
                // 修复 original_filename：如果只有文件名（相对路径），拼入文件夹完整路径
                let originalFilename = movieData.original_filename || '';
                if (originalFilename && !path.isAbsolute(originalFilename)) {
                    // 相对路径：拼入源文件夹路径
                    originalFilename = path.join(folderInfo.folderPath, originalFilename);
                }

                const completeMovieData = {
                    id: movieId,
                    movieId: movieId,
                    title: movieData.title || movieData.name || folderInfo.folderName,
                    description: movieData.description || movieData.outline || '',
                    sortTitle: movieData.sorttitle || '',
                    year: movieData.year || '',
                    director: movieData.director || '',
                    actors: movieData.actors || [],
                    studio: movieData.studio || '',
                    runtime: movieData.runtime || '',
                    tags: movieData.tag || movieData.tags || [],
                    category: category,
                    original_filename: originalFilename,
                    fileset: movieData.fileset || [],
                    videoCodec: movieData.videoCodec || '',
                    videoWidth: movieData.videoWidth || '',
                    videoHeight: movieData.videoHeight || '',
                    videoDuration: movieData.videoDuration || ''
                };

                // 写入movie.nfo到临时目录
                await this.fileService.writeMovieNfo(movieTempDir, completeMovieData);

                // 复制海报文件（如果有）
                let posterDestPath = null;
                if (folderInfo.posterPath) {
                    posterDestPath = path.join(movieTempDir, `poster${folderInfo.posterExt}`);
                    await this.fileService.copyFile(folderInfo.posterPath, posterDestPath);
                    completeMovieData.poster = posterDestPath;
                }

                scannedMovies.push({
                    folderName: folderName,
                    tempPath: movieTempDir,
                    sourcePath: folderInfo.folderPath,
                    posterPath: posterDestPath,
                    movieData: completeMovieData
                });
            } catch (error) {
                console.error(`Error processing movie folder ${folderInfo.folderPath}:`, error);
            }
        }

        return scannedMovies;
    }

    /**
     * CSV扫描模式：解析CSV文件导入电影
     * @param {string} csvPath - CSV文件路径
     * @param {string} tempDir - 临时目录
     * @param {string} category - 分类
     * @param {string} dirNaming - 目录命名方式：'movieId'（电影ID）或 'movieName'（电影名称/年份）
     * @returns {Promise<object[]>} 扫描结果
     */
    async scanCsvMode(csvPath, tempDir, category, dirNaming) {
        const scannedMovies = [];

        // 解析CSV文件
        const csvMovies = await this.fileService.parseCsvFile(csvPath);

        for (const movieInfo of csvMovies) {
            try {
                // 使用CSV中的movieId或生成新ID
                const movieId = movieInfo.movieId || this.generateMovieId(category, movieInfo.title);

                // 根据目录命名方式生成文件夹名称
                const folderName = this.generateFolderName(movieId, movieInfo.title, movieInfo.year, dirNaming);
                const movieTempDir = path.join(tempDir, folderName);
                await this.fileService.ensureDir(movieTempDir);

                // 构建完整的电影数据
                const completeMovieData = {
                    id: movieId,
                    movieId: movieId,
                    title: movieInfo.title || '',
                    description: movieInfo.description || '',
                    sortTitle: movieInfo.sortTitle || '',
                    year: movieInfo.year || '',
                    director: movieInfo.director || '',
                    actors: movieInfo.actors || [],
                    studio: movieInfo.studio || '',
                    runtime: movieInfo.runtime || '',
                    tags: movieInfo.tags || [],
                    category: category,
                    userRating: 0,
                    userComment: '',
                    original_filename: movieInfo.fileAddress || '',
                    fileset: movieInfo.fileset || [],
                    videoCodec: movieInfo.videoCodec || '',
                    videoWidth: movieInfo.videoWidth || '',
                    videoHeight: movieInfo.videoHeight || '',
                    videoDuration: movieInfo.videoDuration || ''
                };

                // 写入movie.nfo到临时目录
                await this.fileService.writeMovieNfo(movieTempDir, completeMovieData);

                scannedMovies.push({
                    folderName: folderName,
                    tempPath: movieTempDir,
                    sourcePath: movieInfo.fileAddress || '',
                    posterPath: null,
                    movieData: completeMovieData
                });
            } catch (error) {
                console.error(`Error processing CSV movie ${movieInfo.title}:`, error);
            }
        }

        return scannedMovies;
    }

    /**
     * 根据目录命名方式生成文件夹名称
     * @param {string} movieId - 电影ID
     * @param {string} title - 电影标题
     * @param {string} year - 电影年份
     * @param {string} dirNaming - 目录命名方式：'movieId'（电影ID）或 'movieName'（电影名称/年份）
     * @returns {string} 生成的文件夹名称
     */
    generateFolderName(movieId, title, year, dirNaming) {
        // 使用电影名称/年份作为目录名，格式：电影名(发行年份)
        if (dirNaming === 'movieName' && title) {
            const nameWithYear = year ? `${title}(${year})` : title;
            return this.sanitizeFolderName(nameWithYear);
            
        }
        // 默认使用电影ID作为目录名
        return this.sanitizeFolderName(movieId);
    }

    /**
     * 清理文件夹名称，只允许字母、数字、中文、括号、空格和连字符
     * @param {string} name - 原始名称
     * @returns {string} 清理后的名称
     */
    sanitizeFolderName(name) {
        return name
            .replace(/[^a-zA-Z0-9\u4e00-\u9fa5() -]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
    }

    /**
     * 更新临时电影信息
     * @param {string} tempPath - 临时电影目录路径
     * @param {object} movieData - 电影数据
     * @param {string} coverImagePath - 封面图片路径
     * @returns {Promise<object>} 更新结果
     */
    async updateTempMovie(tempPath, movieData, coverImagePath) {
        try {
            // 读取现有数据
            const existingData = await this.fileService.readMovieNfo(tempPath);

            // 合并数据
            const updatedData = {
                ...existingData,
                ...movieData,
                // 电影ID：优先使用传入的ID，否则使用现有ID，否则生成新ID
                id: movieData.id || existingData?.id || this.generateMovieId(movieData.category || existingData?.category || 'movie', movieData.title || existingData?.title || ''),
                movieId: movieData.id || movieData.movieId || existingData?.movieId || '',
                // 标题
                title: movieData.title || existingData?.title || '',
                // 排序标题
                sorttitle: movieData.sortTitle || existingData?.sorttitle || '',
                // 描述
                description: movieData.description || existingData?.description || '',
                // 年份/上映时间
                year: movieData.year || existingData?.year || '',
                // 导演
                director: movieData.director || existingData?.director || '',
                // 演员
                actors: movieData.actors || existingData?.actors || [],
                // 制片商
                studio: movieData.studio || existingData?.studio || '',
                // 电影时长
                runtime: movieData.runtime || existingData?.runtime || '',
                // 标签
                tags: movieData.tags || movieData.tag || existingData?.tags || existingData?.tag || [],
                // 分类
                category: movieData.category || existingData?.category
            };

            // 写入更新后的数据
            await this.fileService.writeMovieNfo(tempPath, updatedData);

            // 处理封面图片
            let poster = null;
            if (coverImagePath) {
                const ext = this.fileService.getFileExtension(coverImagePath);
                const coverDestPath = path.join(tempPath, `poster${ext}`);
                await this.fileService.copyFile(coverImagePath, coverDestPath);
                poster = coverDestPath;
            }

            return {
                success: true,
                movieData: updatedData,
                poster: poster
            };
        } catch (error) {
            console.error('Error updating temp movie:', error);
            throw error;
        }
    }

    /**
     * 导入扫描的电影到正式目录
     * 使用电影ID作为文件夹名称，拷贝NFO和海报文件到目标目录
     * @param {string} tempDir - 临时目录路径
     * @param {string} moviesDir - 电影目录
     * @param {Array} excludeIds - 排除的电影ID列表
     * @param {boolean} importActors - 是否导入演员
     * @returns {Promise<object>} 导入结果
     */
    async importScannedMovies(tempDir, moviesDir, excludeIds = [], importActors = false) {
        try {
            // 验证 moviesDir 参数
            if (!moviesDir) {
                throw new Error('moviesDir is required for importing scanned movies');
            }

            // 读取总览文件
            const overviewPath = path.join(tempDir, 'movies.json');
            const overview = await this.fileService.readJson(overviewPath);

            if (!overview || !overview.movies) {
                throw new Error('Invalid scan result: movies.json not found or invalid');
            }

            const results = {
                success: 0,
                failed: 0,
                skipped: 0,
                errors: [],
                actorsImported: 0,
                actorsSkipped: 0
            };

            const allActorNames = [];

            for (const movieInfo of overview.movies) {
                // 跳过被排除的电影
                if (excludeIds.includes(movieInfo.id)) {
                    results.skipped++;
                    continue;
                }

                try {
                    const srcPath = path.join(tempDir, movieInfo.folderName);
                    const destPath = path.join(moviesDir, overview.category, movieInfo.folderName);

                    // 检查源目录是否存在
                    const exists = await this.fileService.fileExists(srcPath);
                    if (!exists) {
                        results.failed++;
                        results.errors.push(`电影 "${movieInfo.name}" 临时目录不存在，跳过`);
                        continue;
                    }

                    // 拷贝目录到目标位置（保留源文件）
                    await this.fileService.copyDir(srcPath, destPath);

                    // 读取电影数据
                    const movieData = await this.fileService.readMovieNfo(destPath);

                    // 收集演员信息（从actors字段，而不是actor字段）
                    if (importActors && movieData && movieData.actors) {
                        const actors = Array.isArray(movieData.actors) ? movieData.actors : [movieData.actors];
                        actors.forEach(actorName => {
                            if (actorName && typeof actorName === 'string') {
                                const trimmed = actorName.trim();
                                if (trimmed && !allActorNames.includes(trimmed)) {
                                    allActorNames.push(trimmed);
                                }
                            }
                        });
                    }

                    // 生成完整的电影对象
                    const movie = this.generateMovieData(movieData, movieInfo.folderName, overview.category, destPath);
                    movie.poster = await this.getMoviePoster(destPath);

                    // 添加到缓存
                    if (this.cacheService.isCacheInitialized()) {
                        this.cacheService.addMovieToCache(movie);
                    }

                    // 更新 index.json
                    await this.indexService.updateMovieIndex(movie, overview.category, moviesDir);

                    results.success++;
                } catch (err) {
                    results.failed++;
                    results.errors.push(`电影 "${movieInfo.name}" 导入失败: ${err.message}`);
                }
            }

            // 导入演员
            if (importActors && allActorNames.length > 0 && this.actorService) {
                try {
                    console.log('Importing actors:', allActorNames.length, 'actors');
                    const actorResult = await this.actorService.importActors(allActorNames);
                    console.log('Actor import result:', actorResult);
                    results.actorsImported = actorResult.added;
                    results.actorsSkipped = actorResult.skipped;
                } catch (err) {
                    console.error('Error importing actors:', err);
                    results.errors.push(`导入演员失败: ${err.message}`);
                }
            } else if (importActors && allActorNames.length > 0) {
                console.warn('ActorService not initialized, cannot import actors');
            }

            // 删除临时目录
            await this.fileService.deleteDir(tempDir);

            // 重建分类的index.json（确保索引完整）
            await this.indexService.buildCategoryIndex(overview.category, moviesDir);

            return results;
        } catch (error) {
            console.error('Error importing scanned movies:', error);
            throw error;
        }
    }

    /**
     * 获取临时扫描目录下的电影列表
     * @param {string} tempDir - 临时目录路径
     * @returns {Promise<object[]>} 电影列表
     */
    async getTempScannedMovies(tempDir) {
        try {
            const overviewPath = path.join(tempDir, 'movies.json');
            const overview = await this.fileService.readJson(overviewPath);

            if (!overview || !overview.movies) {
                return [];
            }

            const movies = [];
            for (const movieInfo of overview.movies) {
                const moviePath = path.join(tempDir, movieInfo.folderName);
                const movieData = await this.fileService.readMovieNfo(moviePath);
                if (movieData) {
                    movies.push({
                        ...movieData,
                        tempPath: moviePath
                    });
                }
            }

            return movies;
        } catch (error) {
            console.error('Error getting temp scanned movies:', error);
            return [];
        }
    }

    /**
     * 删除临时扫描目录
     * @param {string} tempDir - 临时目录路径
     */
    async deleteTempScanDir(tempDir) {
        try {
            await this.fileService.deleteDir(tempDir);
            return { success: true };
        } catch (error) {
            console.error('Error deleting temp scan dir:', error);
            throw error;
        }
    }
}

module.exports = MovieService;

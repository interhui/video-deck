/**
 * IndexService - 电影索引服务
 * 负责管理每个分类目录下的 index.json 文件，提供快速的电影加载
 */
const FileService = require('./FileService');
const path = require('path');
const fs = require('fs');

class IndexService {
    constructor() {
        this.fileService = new FileService();
    }

    /**
     * 获取分类的 index.json 文件路径
     * @param {string} category - 分类名称
     * @param {string} moviesDir - 电影目录
     * @returns {string} index.json 完整路径
     */
    getIndexPath(category, moviesDir) {
        return path.join(moviesDir, category, 'index.json');
    }

    /**
     * 从 index.json 提取的电影元数据结构
     * @param {object} movie - 完整电影数据
     * @returns {object} 用于 index.json 的电影数据
     */
    extractIndexMovieData(movie, posterPath = null, basePath = null, updateTime = null) {
        const fileCount = (movie.fileset && Array.isArray(movie.fileset)) ? movie.fileset.length + (movie.original_filename ? 1 : 0) : movie.original_filename ? 1 : 0;
        return {
            id: movie.id,
            name: movie.title || movie.name || '',
            title: movie.title || movie.name || '',
            description: movie.description || movie.outline || '',
            year: movie.year || '',
            publishDate: movie.publishDate || movie.year || '',
            outline: movie.outline || '',
            director: movie.director || '',
            actors: movie.actors || [],
            studio: movie.studio || '',
            tags: movie.tags || movie.tag || [],
            fileCount: fileCount,
            poster: posterPath || movie.poster || null,
            basePath: basePath || movie.path || null,
            update_time: updateTime
        };
    }

    /**
     * 为指定分类构建 index.json
     * @param {string} category - 分类名称
     * @param {string} moviesDir - 电影目录
     * @returns {Promise<object>} 构建结果
     */
    async buildCategoryIndex(category, moviesDir) {
        try {
            if (!moviesDir) {
                throw new Error(`moviesDir is undefined for category "${category}"`);
            }
            const categoryPath = path.join(moviesDir, category);
            const indexPath = this.getIndexPath(category, moviesDir);

            const movieFolders = await this.fileService.getMovieFolders(categoryPath);
            const movies = [];

            for (const [folderName, folderPath] of Object.entries(movieFolders)) {
                const movieData = await this.fileService.readMovieNfo(folderPath); 
                if (movieData) {
                    const posterInfo = await this.fileService.findMoviePoster(folderPath);
                    const posterPath = posterInfo.posterPath || null;
                    
                    const nfoPath = path.join(folderPath, 'movie.nfo');
                    let updateTime = null;
                    try {
                        const stats = await fs.promises.stat(nfoPath);
                        updateTime = stats.mtime.getTime();
                    } catch (e) {
                        console.warn(`Could not get mtime for ${nfoPath}:`, e.message);
                    }
                    
                    movies.push(this.extractIndexMovieData(movieData, posterPath, folderPath, updateTime));
                }
            }

            const indexData = { movies };
            await this.fileService.writeJson(indexPath, indexData);

            return { success: true, category, movieCount: movies.length };
        } catch (error) {
            console.error(`Error building index for ${category}:`, error);
            throw error;
        }
    }

    /**
     * 重建所有分类的 index.json
     * @param {string} moviesDir - 电影目录
     * @returns {Promise<object>} 重建结果
     */
    async rebuildAllIndexes(moviesDir) {
        try {
            const categories = await this.fileService.getCategoryFolders(moviesDir);
            const results = [];

            for (const category of categories) {
                const result = await this.buildCategoryIndex(category, moviesDir);
                results.push(result);
            }

            return { success: true, results };
        } catch (error) {
            console.error('Error rebuilding all indexes:', error);
            throw error;
        }
    }

    /**
     * 从 index.json 读取电影列表
     * @param {string} category - 分类名称
     * @param {string} moviesDir - 电影目录
     * @returns {Promise<Array>} 电影列表
     */
    async getMoviesFromIndex(category, moviesDir) {
        try {
            const indexPath = this.getIndexPath(category, moviesDir);
            const indexData = await this.fileService.readJson(indexPath);

            if (!indexData || !Array.isArray(indexData.movies)) {
                return [];
            }

            return indexData.movies;
        } catch (error) {
            console.error(`Error reading index for ${category}:`, error);
            return [];
        }
    }

    /**
     * 获取分页的电影列表（从index.json）
     * @param {string} category - 分类名称
     * @param {string} moviesDir - 电影目录
     * @param {object} options - { page, pageSize, sortBy, sortOrder }
     * @returns {Promise<object>} 分页结果
     */
    async getMoviesFromIndexPaginated(category, moviesDir, options = {}) {
        try {
            const { page = 1, pageSize = 100, sortBy, sortOrder } = options;

            const movies = await this.getMoviesFromIndex(category, moviesDir);
            const moviesWithCategory = movies.map(m => ({ ...m, category }));

            // 排序
            const sortedMovies = this.sortMovies(moviesWithCategory, sortBy, sortOrder);

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
            console.error(`Error getting paginated movies from index for ${category}:`, error);
            throw error;
        }
    }

    /**
     * 对电影列表进行排序（内部使用）
     * @param {Array} movies - 电影列表
     * @param {string} sortBy - 排序字段
     * @param {string} sortOrder - 排序方向
     * @returns {Array} 排序后的列表
     */
    sortMovies(movies, sortBy = 'name', sortOrder = 'asc') {
        if (!movies || movies.length === 0) {
            return movies;
        }

        const sorted = [...movies];
        sorted.sort((a, b) => {
            let valA, valB;

            switch (sortBy) {
                case 'name':
                    valA = (a.name || '').toLowerCase();
                    valB = (b.name || '').toLowerCase();
                    break;
                case 'actor':
                    valA = (a.actors && a.actors.length > 0) ? a.actors[0].toLowerCase() : '';
                    valB = (b.actors && b.actors.length > 0) ? b.actors[0].toLowerCase() : '';
                    break;
                case 'rating':
                    valA = a.userRating || 0;
                    valB = b.userRating || 0;
                    break;
                case 'year':
                    valA = a.year || 0;
                    valB = b.year || 0;
                    break;
                case 'releasedate':
                    valA = a.year || 0;
                    valB = b.year || 0;
                    break;
                case 'addtime':
                    valA = a.update_time || 0;
                    valB = b.update_time || 0;
                    break;
                default:
                    valA = (a.name || '').toLowerCase();
                    valB = (b.name || '').toLowerCase();
            }

            if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
            if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });

        return sorted;
    }

    /**
     * 更新单个电影在 index.json 中的数据
     * @param {object} movie - 电影数据（完整电影对象）
     * @param {string} category - 分类名称
     * @param {string} moviesDir - 电影目录
     * @returns {Promise<object>} 更新结果
     */
    async updateMovieIndex(movie, category, moviesDir) {
        try {
            const indexPath = this.getIndexPath(category, moviesDir);
            let indexData = await this.fileService.readJson(indexPath);

            if (!indexData || !Array.isArray(indexData.movies)) {
                await this.buildCategoryIndex(category, moviesDir);
                indexData = await this.fileService.readJson(indexPath);
            }

            let updateTime = null;
            if (movie.path) {
                const nfoPath = path.join(movie.path, 'movie.nfo');
                try {
                    const stats = await fs.promises.stat(nfoPath);
                    updateTime = stats.mtime.getTime();
                } catch (e) {
                    console.warn(`Could not get mtime for ${nfoPath}:`, e.message);
                }
            }

            const indexMovieData = this.extractIndexMovieData(movie, movie.poster || null, movie.path || null, updateTime);
            const existingIndex = indexData.movies.findIndex(m => m.id === movie.id);

            if (existingIndex >= 0) {
                indexData.movies[existingIndex] = indexMovieData;
            } else {
                indexData.movies.push(indexMovieData);
            }

            await this.fileService.writeJson(indexPath, indexData);

            return { success: true };
        } catch (error) {
            console.error(`Error updating movie index for ${movie.id}:`, error);
            throw error;
        }
    }

    /**
     * 从 index.json 中删除电影
     * @param {string} movieId - 电影 ID
     * @param {string} category - 分类名称
     * @param {string} moviesDir - 电影目录
     * @returns {Promise<object>} 删除结果
     */
    async deleteMovieFromIndex(movieId, category, moviesDir) {
        try {
            const indexPath = this.getIndexPath(category, moviesDir);
            const indexData = await this.fileService.readJson(indexPath);

            if (!indexData || !Array.isArray(indexData.movies)) {
                return { success: true, message: 'Index does not exist or is empty' };
            }

            const originalLength = indexData.movies.length;
            indexData.movies = indexData.movies.filter(m => m.id !== movieId);

            if (indexData.movies.length < originalLength) {
                await this.fileService.writeJson(indexPath, indexData);
            }

            return { success: true };
        } catch (error) {
            console.error(`Error deleting movie ${movieId} from index:`, error);
            throw error;
        }
    }

    /**
     * 检查指定分类的 index.json 是否存在
     * @param {string} category - 分类名称
     * @param {string} moviesDir - 电影目录
     * @returns {Promise<boolean>} 是否存在
     */
    async indexExists(category, moviesDir) {
        const indexPath = this.getIndexPath(category, moviesDir);
        return await this.fileService.fileExists(indexPath);
    }

    /**
     * 检查所有分类的 index.json 是否存在，如果有任何分类缺少则返回 false
     * @param {string} moviesDir - 电影目录
     * @returns {Promise<object>} { allExist: boolean, missingCategories: string[] }
     */
    async checkIndexesExist(moviesDir) {
        try {
            const categories = await this.fileService.getCategoryFolders(moviesDir);
            const missingCategories = [];

            for (const category of categories) {
                const exists = await this.indexExists(category, moviesDir);
                if (!exists) {
                    missingCategories.push(category);
                }
            }

            return {
                allExist: missingCategories.length === 0,
                missingCategories
            };
        } catch (error) {
            console.error('Error checking indexes:', error);
            return { allExist: false, missingCategories: [], error: error.message };
        }
    }

    /**
     * 获取所有分类的 index 电影列表（从 index.json 读取）
     * 用于快速加载电影卡片
     * @param {string} moviesDir - 电影目录
     * @returns {Promise<object>} { category: movies[] }
     */
    async getAllCategoriesIndexMovies(moviesDir) {
        try {
            const categories = await this.fileService.getCategoryFolders(moviesDir);
            const result = {};

            for (const category of categories) {
                const movies = await this.getMoviesFromIndex(category, moviesDir);
                // 为每个电影添加 category 字段
                result[category] = movies.map(m => ({ ...m, category }));
            }

            return result;
        } catch (error) {
            console.error('Error getting all categories index movies:', error);
            throw error;
        }
    }
}

module.exports = IndexService;

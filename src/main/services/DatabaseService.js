/**
 * 数据库服务
 * 负责使用 JSON 文件进行数据存储
 */
const FileService = require('./FileService');
const path = require('path');
const fs = require('fs');

class DatabaseService {
    constructor(dbPath) {
        this.dbPath = dbPath;
        this.fileService = new FileService();
        this.data = {
            movies: [],
            tags: [],
            movie_tags: []
        };
        this.init(dbPath);
    }

    /**
     * 初始化数据库
     * @param {string} dbPath - 数据库文件路径
     */
    init(dbPath) {
        try {
            // 确保目录存在
            const dir = path.dirname(dbPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            // 加载或创建数据文件
            this.loadData();
            console.log('Movie Database(NFO Files) initialized successfully');
        } catch (error) {
            console.error('Error initializing database:', error);
            throw error;
        }
    }

    /**
     * 加载数据
     */
    loadData() {
        try {
            if (fs.existsSync(this.dbPath)) {
                const content = fs.readFileSync(this.dbPath, 'utf-8');
                this.data = JSON.parse(content);
            } else {
                this.saveData();
            }
        } catch (error) {
            console.error('Error loading data:', error);
            this.data = { movies: [], tags: [], movie_tags: [] };
        }
    }

    /**
     * 保存数据
     */
    saveData() {
        try {
            fs.writeFileSync(this.dbPath, JSON.stringify(this.data, null, 2), 'utf-8');
        } catch (error) {
            console.error('Error saving data:', error);
            throw error;
        }
    }

    /**
     * 获取数据库实例（兼容接口）
     * @returns {object} 数据库对象（此处返回自身）
     */
    getDatabase() {
        return this;
    }

    /**
     * 保存电影状态
     * @param {string} movieId - 电影 ID
     * @param {object} state - 电影状态数据
     */
    saveMovieState(movieId, state) {
        try {
            const movie = this.data.movies.find(m => m.id === movieId);
            if (movie) {
                movie.status = state.status;
                movie.totalPlayTime = (movie.totalPlayTime || 0) + (state.playTime || 0);
                movie.playCount = (movie.playCount || 0) + 1;
                movie.lastPlayed = new Date().toISOString().split('T')[0];
                movie.updated_at = Date.now();
                this.saveData();
            }
        } catch (error) {
            console.error('Error saving movie state:', error);
            throw error;
        }
    }

    /**
     * 获取电影状态
     * @param {string} movieId - 电影 ID
     * @returns {object} 电影状态数据
     */
    getMovieState(movieId) {
        try {
            const movie = this.data.movies.find(m => m.id === movieId);
            if (movie) {
                return {
                    status: movie.status,
                    playCount: movie.playCount,
                    totalPlayTime: movie.totalPlayTime,
                    lastPlayed: movie.lastPlayed,
                    firstPlayed: movie.firstPlayed
                };
            }
            return null;
        } catch (error) {
            console.error('Error getting movie state:', error);
            throw error;
        }
    }

    /**
     * 获取电影统计数据
     * @param {string} category - 分类筛选（可选）
     * @returns {object} 统计数据
     */
    getMovieStats(category = null) {
        try {
            let movies = this.data.movies;
            if (category) {
                movies = movies.filter(m => m.category === category);
            }
    
            const stats = {
                totalMovies: movies.length,
                playedMovies: movies.filter(m => m.status === 'completed').length,
                playingMovies: movies.filter(m => m.status === 'watching').length,
                unwatchedMovies: movies.filter(m => m.status === 'unwatched').length
            };
    
            return stats;
        } catch (error) {
            console.error('Error getting movie stats:', error);
            throw error;
        }
    }



    /**
     * 更新电影时长
     * @param {string} movieId - 电影 ID
     * @param {number} duration - 时长（分钟）
     */
    updatePlayTime(movieId, duration) {
        try {
            const movie = this.data.movies.find(m => m.id === movieId);
            if (movie) {
                movie.totalPlayTime = (movie.totalPlayTime || 0) + duration;
                movie.playCount = (movie.playCount || 0) + 1;
                movie.lastPlayed = new Date().toISOString().split('T')[0];
                movie.updated_at = Date.now();
                this.saveData();
            }
        } catch (error) {
            console.error('Error updating play time:', error);
            throw error;
        }
    }

    /**
     * 保存用户评分
     * @param {string} movieId - 电影 ID
     * @param {number} rating - 评分 (1-5)
     * @param {string} comment - 评论
     */
    saveUserRating(movieId, rating, comment) {
        try {
            const movie = this.data.movies.find(m => m.id === movieId);
            if (movie) {
                movie.userRating = rating;
                movie.userComment = comment || '';
                movie.updated_at = Date.now();
                this.saveData();
            }
        } catch (error) {
            console.error('Error saving user rating:', error);
            throw error;
        }
    }

    /**
     * 获取标签列表
     * @returns {Array} 标签列表
     */
    getTags() {
        try {
            return [...this.data.tags].sort((a, b) => a.name.localeCompare(b.name));
        } catch (error) {
            console.error('Error getting tags:', error);
            throw error;
        }
    }

    /**
     * 为电影添加标签
     * @param {string} movieId - 电影 ID
     * @param {Array} tagIds - 标签 ID 数组
     */
    addTagsToMovie(movieId, tagIds) {
        try {
            for (const tagId of tagIds) {
                const exists = this.data.movie_tags.find(
                    mt => mt.movie_id === movieId && mt.tag_id === tagId
                );
                if (!exists) {
                    this.data.movie_tags.push({ movie_id: movieId, tag_id: tagId });
                }
            }
            this.saveData();
        } catch (error) {
            console.error('Error adding tags to movie:', error);
            throw error;
        }
    }

    /**
     * 从电影移除标签
     * @param {string} movieId - 电影 ID
     * @param {Array} tagIds - 标签 ID 数组
     */
    removeTagsFromMovie(movieId, tagIds) {
        try {
            this.data.movie_tags = this.data.movie_tags.filter(
                mt => !(mt.movie_id === movieId && tagIds.includes(mt.tag_id))
            );
            this.saveData();
        } catch (error) {
            console.error('Error removing tags from movie:', error);
            throw error;
        }
    }

    /**
     * 获取电影的标签
     * @param {string} movieId - 电影 ID
     * @returns {Array} 标签列表
     */
    getMovieTags(movieId) {
        try {
            const tagIds = this.data.movie_tags
                .filter(mt => mt.movie_id === movieId)
                .map(mt => mt.tag_id);
            return this.data.tags.filter(t => tagIds.includes(t.id));
        } catch (error) {
            console.error('Error getting movie tags:', error);
            throw error;
        }
    }

    /**
     * 插入或更新电影
     * @param {object} movie - 电影数据
     */
    upsertMovie(movie) {
        try {
            const index = this.data.movies.findIndex(m => m.id === movie.id);
            const now = Date.now();

            const movieData = {
                ...movie,
                updated_at: now,
                created_at: movie.created_at || now
            };

            if (index >= 0) {
                this.data.movies[index] = { ...this.data.movies[index], ...movieData };
            } else {
                this.data.movies.push(movieData);
            }

            this.saveData();
        } catch (error) {
            console.error('Error upserting movie:', error);
            throw error;
        }
    }

    /**
     * 搜索电影
     * @param {string} keyword - 搜索关键字
     * @param {object} filters - 筛选条件
     * @returns {Array} 电影列表
     */
    searchMovies(keyword, filters = {}) {
        try {
            let results = [...this.data.movies];

            // 关键字搜索
            if (keyword) {
                const lowerKeyword = keyword.toLowerCase();
                results = results.filter(movie =>
                    movie.name.toLowerCase().includes(lowerKeyword) ||
                    (movie.description && movie.description.toLowerCase().includes(lowerKeyword))
                );
            }

            // 分类筛选
            if (filters.category) {
                results = results.filter(movie => movie.category === filters.category);
            }

            // 状态筛选
            if (filters.status) {
                results = results.filter(movie => movie.status === filters.status);
            }

            // 标签筛选
            if (filters.tagId) {
                const movieIdsWithTag = this.data.movie_tags
                    .filter(mt => mt.tag_id === filters.tagId)
                    .map(mt => mt.movie_id);
                results = results.filter(movie => movieIdsWithTag.includes(movie.id));
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

            // 排序
            const sortMapping = {
                'name-asc': (a, b) => a.name.localeCompare(b.name),
                'name-desc': (a, b) => b.name.localeCompare(a.name),
                'playtime-desc': (a, b) => (b.totalPlayTime || 0) - (a.totalPlayTime || 0),
                'playtime-asc': (a, b) => (a.totalPlayTime || 0) - (b.totalPlayTime || 0),
                'rating-desc': (a, b) => (b.userRating || 0) - (a.userRating || 0),
                'rating-asc': (a, b) => (a.userRating || 0) - (b.userRating || 0),
                'last-played-desc': (a, b) => (b.lastPlayed || '').localeCompare(a.lastPlayed || ''),
                'created-desc': (a, b) => (b.created_at || 0) - (a.created_at || 0)
            };

            if (filters.sort && sortMapping[filters.sort]) {
                results.sort(sortMapping[filters.sort]);
            } else {
                results.sort((a, b) => a.name.localeCompare(b.name));
            }

            return results;
        } catch (error) {
            console.error('Error searching movies:', error);
            throw error;
        }
    }

    /**
     * 批量删除电影
     * @param {Array} movieIds - 电影 ID 数组
     */
    deleteMovies(movieIds) {
        try {
            this.data.movies = this.data.movies.filter(m => !movieIds.includes(m.id));
            this.data.movie_tags = this.data.movie_tags.filter(
                mt => !movieIds.includes(mt.movie_id)
            );
            this.saveData();
        } catch (error) {
            console.error('Error deleting movies:', error);
            throw error;
        }
    }

    /**
     * 关闭数据库连接
     */
    close() {
        this.saveData();
        console.log('Movie Database(NFO Files) connection closed');
    }
}

module.exports = DatabaseService;

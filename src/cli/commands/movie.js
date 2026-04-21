/**
 * Movie Management Commands
 */
const {
    outputMovieList,
    outputMovieDetail,
    outputSuccess,
    outputError
} = require('../utils/output');
const {
    validateMovieId,
    validateRating,
    validateStatus,
    parseTags
} = require('../utils/validation');

/**
 * Get all movies or movies by category
 * @param {object} services - Loaded services
 * @param {object} options - Command options
 */
async function listMovies(services, options = {}) {
    try {
        const { movieService, getMoviesDir } = services;
        const moviesDir = getMoviesDir();
        const { category, rating, tag, status, sort, desc, format } = options;

        let movies;
        if (category) {
            movies = await movieService.getMoviesByCategory(category, moviesDir, {
                sortBy: sort,
                sortOrder: desc ? 'desc' : 'asc',
                tagId: tag,
                rating: rating ? parseInt(rating) : undefined
            });
        } else {
            movies = await movieService.getAllMovies(moviesDir, {
                sortBy: sort,
                sortOrder: desc ? 'desc' : 'asc',
                tagId: tag,
                rating: rating ? parseInt(rating) : undefined
            });
        }

        outputMovieList(movies, { format });
    } catch (error) {
        outputError(`获取电影列表失败: ${error.message}`);
        throw error;
    }
}

/**
 * Search movies by keyword
 * @param {object} services - Loaded services
 * @param {string} keyword - Search keyword
 * @param {object} options - Command options
 */
async function searchMovies(services, keyword, options = {}) {
    try {
        const { movieService, getMoviesDir } = services;
        const moviesDir = getMoviesDir();
        const { category, rating, tag, format } = options;

        const filters = {};
        if (category) filters.category = category;
        if (rating) filters.rating = parseInt(rating);
        if (tag) filters.tagId = tag;

        const movies = await movieService.searchMovies(keyword, moviesDir, filters);
        outputMovieList(movies, { format });
    } catch (error) {
        outputError(`搜索电影失败: ${error.message}`);
        throw error;
    }
}

/**
 * Show movie detail
 * @param {object} services - Loaded services
 * @param {string} movieId - Movie ID
 */
async function showMovie(services, movieId) {
    try {
        const { movieService, getMoviesDir } = services;
        const moviesDir = getMoviesDir();

        if (!validateMovieId(movieId)) {
            outputError('无效的电影ID格式', '电影ID格式应为: category-movieName');
            return;
        }

        const movie = await movieService.getMovieDetail(movieId, moviesDir);
        if (!movie) {
            outputError('电影不存在', `ID: ${movieId}`);
            return;
        }

        outputMovieDetail(movie);
    } catch (error) {
        outputError(`获取电影详情失败: ${error.message}`);
        throw error;
    }
}

/**
 * Add a new movie
 * @param {object} services - Loaded services
 * @param {string} name - Movie name
 * @param {object} options - Command options
 */
async function addMovie(services, name, options = {}) {
    try {
        const { movieService, getMoviesDir } = services;
        const moviesDir = getMoviesDir();
        const { category, description, director, actors, studio, publishDate, tags, cover } = options;

        if (!category) {
            outputError('缺少必填参数', '需要指定 --category 或 -c');
            return;
        }

        const movieData = {
            name,
            category,
            description: description || '',
            director: director || '',
            actors: actors || '',
            studio: studio || '',
            publishDate: publishDate || '',
            tags: parseTags(tags) || []
        };

        const result = await movieService.addMovie(movieData, cover, null, moviesDir);

        if (result.success) {
            outputSuccess('电影添加成功', {
                'ID': result.movie.id,
                '名称': result.movie.name,
                '分类': result.movie.category,
                '路径': result.movie.path
            });
        } else {
            outputError('电影添加失败');
        }
    } catch (error) {
        outputError(`添加电影失败: ${error.message}`);
        throw error;
    }
}

/**
 * Edit movie information
 * @param {object} services - Loaded services
 * @param {string} movieId - Movie ID
 * @param {object} options - Command options
 */
async function editMovie(services, movieId, options = {}) {
    try {
        const { movieService, getMoviesDir } = services;
        const moviesDir = getMoviesDir();

        if (!validateMovieId(movieId)) {
            outputError('无效的电影ID格式', '电影ID格式应为: category-movieName');
            return;
        }

        const movie = await movieService.getMovieDetail(movieId, moviesDir);
        if (!movie) {
            outputError('电影不存在', `ID: ${movieId}`);
            return;
        }

        // Get current movie data
        const { fileService } = services;
        const moviePath = movie.path;
        const currentData = await fileService.readMovieNfo(moviePath);

        // Update fields
        const updatedFields = [];
        if (options.name) {
            currentData.name = options.name;
            updatedFields.push('name');
        }
        if (options.description) {
            currentData.description = options.description;
            updatedFields.push('description');
        }
        if (options.director) {
            currentData.director = options.director;
            updatedFields.push('director');
        }
        if (options.actors) {
            currentData.actors = options.actors;
            updatedFields.push('actors');
        }
        if (options.studio) {
            currentData.studio = options.studio;
            updatedFields.push('studio');
        }
        if (options.publishDate) {
            currentData.publishDate = options.publishDate;
            updatedFields.push('publishDate');
        }
        if (options.tags) {
            currentData.tags = parseTags(options.tags);
            updatedFields.push('tags');
        }
        if (options.rating && validateRating(options.rating)) {
            currentData.userRating = parseInt(options.rating);
            updatedFields.push('rating');
        }
        if (options.addTags) {
            const existingTags = currentData.tags || [];
            const newTags = parseTags(options.addTags);
            currentData.tags = [...new Set([...existingTags, ...newTags])];
            updatedFields.push('tags (added)');
        }
        if (options.removeTags) {
            const tagsToRemove = parseTags(options.removeTags);
            currentData.tags = (currentData.tags || []).filter(t => !tagsToRemove.includes(t));
            updatedFields.push('tags (removed)');
        }

        // Save updated data
        await fileService.writeMovieNfo(moviePath, currentData);

        outputSuccess('电影信息已更新', {
            'ID': movieId,
            '更新字段': updatedFields.join(', ')
        });

        // Refresh cache
        await movieService.refreshCache(moviesDir);
    } catch (error) {
        outputError(`修改电影失败: ${error.message}`);
        throw error;
    }
}

/**
 * Delete a movie
 * @param {object} services - Loaded services
 * @param {string} movieId - Movie ID
 * @param {object} options - Command options
 */
async function deleteMovie(services, movieId, options = {}) {
    try {
        const { movieService, getMoviesDir } = services;
        const moviesDir = getMoviesDir();

        if (!validateMovieId(movieId)) {
            outputError('无效的电影ID格式', '电影ID格式应为: category-movieName');
            return;
        }

        const movie = await movieService.getMovieDetail(movieId, moviesDir);
        if (!movie) {
            outputError('电影不存在', `ID: ${movieId}`);
            return;
        }

        // Delete movie folder
        const { fileService } = services;
        await fileService.deleteDir(movie.path);

        // Remove from cache and index
        const { movieCacheService, indexService } = services;
        if (movieCacheService && movieCacheService.isCacheInitialized()) {
            movieCacheService.removeMovieFromCache(movieId);
            await indexService.deleteMovieFromIndex(movieId, movie.category, moviesDir);
        }

        outputSuccess('电影已删除', { 'ID': movieId });
    } catch (error) {
        outputError(`删除电影失败: ${error.message}`);
        throw error;
    }
}

/**
 * Update movie status
 * @param {object} services - Loaded services
 * @param {string} movieId - Movie ID
 * @param {string} status - New status
 */
async function updateStatus(services, movieId, status) {
    try {
        const { movieService, getMoviesDir } = services;
        const moviesDir = getMoviesDir();

        if (!validateMovieId(movieId)) {
            outputError('无效的电影ID格式', '电影ID格式应为: category-movieName');
            return;
        }

        if (!validateStatus(status)) {
            outputError('无效的状态值', '有效值: unwatched, watching, completed');
            return;
        }

        const movie = await movieService.getMovieDetail(movieId, moviesDir);
        if (!movie) {
            outputError('电影不存在', `ID: ${movieId}`);
            return;
        }

        // Update movie status in file
        const { fileService } = services;
        const movieData = await fileService.readMovieNfo(movie.path);
        movieData.status = status;
        await fileService.writeMovieNfo(movie.path, movieData);

        // Refresh cache
        await movieService.refreshCache(moviesDir);

        outputSuccess('电影状态已更新', {
            'ID': movieId,
            '状态': status
        });
    } catch (error) {
        outputError(`更新状态失败: ${error.message}`);
        throw error;
    }
}

module.exports = {
    listMovies,
    searchMovies,
    showMovie,
    addMovie,
    editMovie,
    deleteMovie,
    updateStatus
};

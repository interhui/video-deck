/**
 * Box (Movie Collection) Commands
 */
const {
    outputBoxList,
    outputSuccess,
    outputError,
    outputMovieList
} = require('../utils/output');

/**
 * List all boxes
 * @param {object} services - Loaded services
 * @param {object} options - Command options
 */
async function listBoxes(services, options = {}) {
    try {
        const { boxService, getMovieboxDir } = services;
        const movieboxDir = getMovieboxDir();

        const boxes = await boxService.getAllBoxes(movieboxDir);

        if (options.format === 'json') {
            console.log(JSON.stringify(boxes, null, 2));
        } else {
            outputBoxList(boxes);
        }
    } catch (error) {
        outputError(`获取收藏夹列表失败: ${error.message}`);
        throw error;
    }
}

/**
 * Show box detail
 * @param {object} services - Loaded services
 * @param {string} boxName - Box name
 * @param {object} options - Command options
 */
async function showBox(services, boxName, options = {}) {
    try {
        const { boxService, getMovieboxDir, movieService, getMoviesDir } = services;
        const movieboxDir = getMovieboxDir();
        const moviesDir = getMoviesDir();

        const boxDetail = await boxService.getBoxDetail(boxName, movieboxDir);

        if (!boxDetail) {
            outputError('收藏夹不存在', `名称: ${boxName}`);
            return;
        }

        console.log('\n收藏夹详情:');
        console.log(`  名称: ${boxDetail.name}`);
        console.log(`  描述: ${boxDetail.description || '-'}`);
        console.log(`  电影数: ${boxDetail.movieCount}`);
        console.log(`  分类: ${boxDetail.categories.join(', ') || '-'}`);

        // Get movies in the box
        if (boxDetail.movieCount > 0) {
            const movies = [];
            for (const [category, categoryMovies] of Object.entries(boxDetail.data || {})) {
                if (category === 'metadata') continue;
                for (const movieInfo of categoryMovies) {
                    const movieDetail = await movieService.getMovieDetail(movieInfo.id, moviesDir);
                    if (movieDetail) {
                        movies.push(movieDetail);
                    }
                }
            }
            console.log('\n盒内电影:');
            outputMovieList(movies, { format: options.format });
        }
    } catch (error) {
        outputError(`获取收藏夹详情失败: ${error.message}`);
        throw error;
    }
}

/**
 * Create a new box
 * @param {object} services - Loaded services
 * @param {string} boxName - Box name
 * @param {object} options - Command options
 */
async function createBox(services, boxName, options = {}) {
    try {
        const { boxService, getMovieboxDir } = services;
        const movieboxDir = getMovieboxDir();

        const result = await boxService.createBox(boxName, options.description || '', movieboxDir);

        if (result.success) {
            outputSuccess('收藏夹创建成功', {
                '名称': boxName,
                '描述': options.description || '-'
            });
        }
    } catch (error) {
        if (error.message.includes('已存在')) {
            outputError('收藏夹已存在', `名称: ${boxName}`);
        } else {
            outputError(`创建收藏夹失败: ${error.message}`);
        }
        throw error;
    }
}

/**
 * Update box information
 * @param {object} services - Loaded services
 * @param {string} boxName - Original box name
 * @param {object} options - Command options
 */
async function updateBox(services, boxName, options = {}) {
    try {
        const { boxService, getMovieboxDir } = services;
        const movieboxDir = getMovieboxDir();

        const newName = options.name || boxName;
        const description = options.description;

        await boxService.updateBox(boxName, newName, description, movieboxDir);

        outputSuccess('收藏夹已更新', {
            '原名称': boxName,
            '新名称': newName,
            '描述': description || '-'
        });
    } catch (error) {
        if (error.message.includes('不存在')) {
            outputError('收藏夹不存在', `名称: ${boxName}`);
        } else if (error.message.includes('已存在')) {
            outputError('新名称已存在', `名称: ${options.name}`);
        } else {
            outputError(`更新收藏夹失败: ${error.message}`);
        }
        throw error;
    }
}

/**
 * Delete a box
 * @param {object} services - Loaded services
 * @param {string} boxName - Box name
 * @param {object} options - Command options
 */
async function deleteBox(services, boxName, options = {}) {
    try {
        const { boxService, getMovieboxDir } = services;
        const movieboxDir = getMovieboxDir();

        await boxService.deleteBox(boxName, movieboxDir);

        outputSuccess('收藏夹已删除', { '名称': boxName });
    } catch (error) {
        if (error.message.includes('不存在')) {
            outputError('收藏夹不存在', `名称: ${boxName}`);
        } else {
            outputError(`删除收藏夹失败: ${error.message}`);
        }
        throw error;
    }
}

/**
 * Add movie to box
 * @param {object} services - Loaded services
 * @param {string} boxName - Box name
 * @param {string} movieId - Movie ID
 */
async function addMovieToBox(services, boxName, movieId) {
    try {
        const { boxService, getMovieboxDir, movieService, getMoviesDir } = services;
        const movieboxDir = getMovieboxDir();
        const moviesDir = getMoviesDir();

        // Get movie info
        const movieDetail = await movieService.getMovieDetail(movieId, moviesDir);
        if (!movieDetail) {
            outputError('电影不存在', `ID: ${movieId}`);
            return;
        }

        const movieInfo = {
            id: movieDetail.id,
            status: 'unwatched',
            rating: 0
        };

        await boxService.addMovieToBox(boxName, movieDetail.category, movieInfo, movieboxDir);

        outputSuccess('电影已添加到收藏夹', {
            '收藏夹': boxName,
            '电影': movieDetail.name
        });
    } catch (error) {
        outputError(`添加到收藏夹失败: ${error.message}`);
        throw error;
    }
}

/**
 * Remove movie from box
 * @param {object} services - Loaded services
 * @param {string} boxName - Box name
 * @param {string} movieId - Movie ID
 */
async function removeMovieFromBox(services, boxName, movieId) {
    try {
        const { boxService, getMovieboxDir } = services;
        const movieboxDir = getMovieboxDir();

        // Try to find the category for this movie in the box
        const boxDetail = await boxService.getBoxDetail(boxName, movieboxDir);
        if (!boxDetail) {
            outputError('收藏夹不存在', `名称: ${boxName}`);
            return;
        }

        // Find which category has this movie
        let category = null;
        for (const [cat, movies] of Object.entries(boxDetail.data || {})) {
            if (cat === 'metadata') continue;
            if (Array.isArray(movies) && movies.find(m => m.id === movieId)) {
                category = cat;
                break;
            }
        }

        if (!category) {
            outputError('电影不在收藏夹中', `电影: ${movieId}`);
            return;
        }

        await boxService.removeMovieFromBox(boxName, category, movieId, movieboxDir);

        outputSuccess('电影已从收藏夹移除', {
            '收藏夹': boxName,
            '电影': movieId
        });
    } catch (error) {
        outputError(`从收藏夹移除失败: ${error.message}`);
        throw error;
    }
}

module.exports = {
    listBoxes,
    showBox,
    createBox,
    updateBox,
    deleteBox,
    addMovieToBox,
    removeMovieFromBox
};
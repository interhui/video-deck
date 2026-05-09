/**
 * IPC 处理器
 * 处理渲染进程和主进程之间的通信
 */
const { ipcMain, dialog, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');
const ExportService = require('./services/ExportService');

// 程序根目录
const APP_ROOT = path.join(__dirname, '..', '..');

/**
 * 从 URL 下载文件到临时目录
 * @param {string} url - 文件 URL
 * @returns {Promise<string>} 临时文件路径
 */
function downloadFileToTemp(url) {
    return new Promise((resolve, reject) => {
        const ext = path.extname(url) || '.jpg';
        const tempPath = path.join(APP_ROOT, `temp_cover_${Date.now()}${ext}`);
        const file = fs.createWriteStream(tempPath);

        const protocol = url.startsWith('https:') ? https : http;

        protocol.get(url, (response) => {
            // 处理重定向
            if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                file.close();
                fs.unlinkSync(tempPath);
                downloadFileToTemp(response.headers.location).then(resolve).catch(reject);
                return;
            }

            if (response.statusCode !== 200) {
                file.close();
                fs.unlinkSync(tempPath);
                reject(new Error(`Failed to download: ${response.statusCode}`));
                return;
            }

            response.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve(tempPath);
            });
        }).on('error', (err) => {
            file.close();
            if (fs.existsSync(tempPath)) {
                fs.unlinkSync(tempPath);
            }
            reject(err);
        });
    });
}

/**
 * 从 URL 下载图片并返回 base64 编码
 * @param {string} url - 图片 URL
 * @returns {Promise<{base64: string, mimeType: string}>} base64 编码和 MIME 类型
 */
function downloadImageAsBase64(url) {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https:') ? https : http;

        protocol.get(url, (response) => {
            // 处理重定向
            if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                downloadImageAsBase64(response.headers.location).then(resolve).catch(reject);
                return;
            }

            if (response.statusCode !== 200) {
                reject(new Error(`Failed to download: ${response.statusCode}`));
                return;
            }

            const chunks = [];
            response.on('data', (chunk) => {
                chunks.push(chunk);
            });

            response.on('end', () => {
                const buffer = Buffer.concat(chunks);
                const base64 = buffer.toString('base64');
                const mimeType = response.headers['content-type'] || 'image/jpeg';
                resolve({ base64, mimeType });
            });

            response.on('error', (err) => {
                reject(err);
            });
        }).on('error', (err) => {
            reject(err);
        });
    });
}

/**
 * 从 URL 下载文件到电影目录
 * @param {string} url - 文件 URL
 * @param {string} destPath - 目标目录路径
 * @param {string} fileName - 文件名（不含扩展名）
 * @returns {Promise<string>} 下载后的文件路径
 */
function downloadCoverToMovieFolder(url, destPath, fileName = 'poster') {
    return new Promise((resolve, reject) => {
        const ext = path.extname(url) || '.jpg';
        const destFilePath = path.join(destPath, `${fileName}${ext}`);
        const file = fs.createWriteStream(destFilePath);

        const protocol = url.startsWith('https:') ? https : http;

        // 确保 URL 以 http: 或 https: 开头
        let downloadUrl = url;
        if (url.startsWith('//')) {
            downloadUrl = 'https:' + url;
        }

        protocol.get(downloadUrl, (response) => {
            // 处理重定向
            if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                file.close();
                fs.unlinkSync(destFilePath);
                downloadCoverToMovieFolder(response.headers.location, destPath, fileName).then(resolve).catch(reject);
                return;
            }

            if (response.statusCode !== 200) {
                file.close();
                if (fs.existsSync(destFilePath)) {
                    fs.unlinkSync(destFilePath);
                }
                reject(new Error(`Failed to download: ${response.statusCode}`));
                return;
            }

            response.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve(destFilePath);
            });
        }).on('error', (err) => {
            file.close();
            if (fs.existsSync(destFilePath)) {
                fs.unlinkSync(destFilePath);
            }
            reject(err);
        });
    });
}

/**
 * 获取电影目录的绝对路径
 * @param {string} moviesDir - 电影目录配置（可能是相对路径或绝对路径）
 * @returns {string} 绝对路径
 */
function getMoviesDirPath(moviesDir) {
    if (!moviesDir) {
        return path.join(APP_ROOT, 'movies');
    }
    // 如果是绝对路径，直接返回
    if (path.isAbsolute(moviesDir)) {
        return moviesDir;
    }
    // 如果是相对路径，基于程序根目录解析
    return path.join(APP_ROOT, moviesDir);
}

/**
 * 获取电影盒子目录的绝对路径
 * @param {string} movieboxDir - 电影盒子目录配置（可能是相对路径或绝对路径）
 * @returns {string} 绝对路径
 */
function getMovieboxDirPath(movieboxDir) {
    if (!movieboxDir) {
        return path.join(APP_ROOT, 'boxes');
    }
    // 如果是绝对路径，直接返回
    if (path.isAbsolute(movieboxDir)) {
        return movieboxDir;
    }
    // 如果是相对路径，基于程序根目录解析
    return path.join(APP_ROOT, movieboxDir);
}

/**
 * 设置所有 IPC 处理器
 * @param {Object} services - 服务实例对象
 */
function setupIpcHandlers(services) {
    const {
        fileService,
        movieService,
        movieCacheService,
        indexService,
        dbService,
        settingsService,
        boxService,
        tagService,
        categoryService,
        actorService,
        tmdbMovieAdapterService,
        r18AdapterService,
        playerService,
        getMainWindow,
        createMovieDetailWindow,
        createBoxWindow,
        createActorManagementWindow,
        createCategoryManagementWindow,
        createPlayerWindow,
        getPendingDetailMovieData,
        clearPendingDetailMovieData
    } = services;

    // ==================== 电影查询接口 ====================

    // 获取所有分类
    ipcMain.handle('get-categories', async () => {
        try {
            const settings = settingsService.getSettings();
            const moviesDir = getMoviesDirPath(settings.library.moviesDir);
            const categories = await fileService.getCategoryFolders(moviesDir);
            const stats = await movieService.getCategoryStats(categories, moviesDir);
            return stats;
        } catch (error) {
            console.error('Error getting categories:', error);
            return { error: error.message };
        }
    });

    // 获取指定分类的电影列表
    ipcMain.handle('get-movies-by-category', async (event, filters) => {
        try {
            const settings = settingsService.getSettings();
            const moviesDir = getMoviesDirPath(settings.library.moviesDir);
            const { category, status, sortBy, sortOrder, tagId, rating, actors } = filters || {};
            const categoryFilter = category;
            const movies = await movieService.getMoviesByCategory(categoryFilter, moviesDir, { status, sortBy, sortOrder, tagId, rating, actors });
            return movies;
        } catch (error) {
            console.error('Error getting movies by category:', error);
            return { error: error.message };
        }
    });

    // 搜索电影
    ipcMain.handle('search-movies', async (event, params) => {
        try {
            const settings = settingsService.getSettings();
            const moviesDir = getMoviesDirPath(settings.library.moviesDir);
            const { keyword, filters = {} } = params;
            const movies = await movieService.searchMovies(keyword, moviesDir, filters);
            return movies;
        } catch (error) {
            console.error('Error searching movies:', error);
            return { error: error.message };
        }
    });

    // 获取所有电影
    ipcMain.handle('get-all-movies', async (event, filters) => {
        try {
            const settings = settingsService.getSettings();
            const moviesDir = getMoviesDirPath(settings.library.moviesDir);
            const { sortBy, sortOrder, tagId, rating, actors } = filters || {};
            const movies = await movieService.getAllMovies(moviesDir, { sortBy, sortOrder, tagId, rating, actors });
            return movies;
        } catch (error) {
            console.error('Error getting all movies:', error);
            return { error: error.message };
        }
    });

    // 从 index.json 获取所有电影（快速加载，用于首页卡片展示）
    ipcMain.handle('get-all-movies-from-index', async (event, filters) => {
        try {
            const settings = settingsService.getSettings();
            const moviesDir = getMoviesDirPath(settings.library.moviesDir);
            const { sortBy, sortOrder } = filters || {};
            const movies = await movieService.getAllMoviesFromIndex(moviesDir, { sortBy, sortOrder });
            return movies;
        } catch (error) {
            console.error('Error getting all movies from index:', error);
            return { error: error.message };
        }
    });

    // 获取分页电影列表（从缓存）
    ipcMain.handle('get-movies-paginated', async (event, params) => {
        try {
            const settings = settingsService.getSettings();
            const moviesDir = getMoviesDirPath(settings.library.moviesDir);
            const { page, pageSize, sortBy, sortOrder, category, tagId, rating, actors } = params || {};
            const result = await movieService.getMoviesPaginated(moviesDir, {
                page: page || 1,
                pageSize: pageSize || 100,
                sortBy,
                sortOrder,
                category,
                tagId,
                rating,
                actors
            });
            return result;
        } catch (error) {
            console.error('Error getting movies paginated:', error);
            return { error: error.message };
        }
    });

    // 获取分页电影列表（从index.json快速加载）
    ipcMain.handle('get-movies-paginated-from-index', async (event, params) => {
        try {
            const settings = settingsService.getSettings();
            const moviesDir = getMoviesDirPath(settings.library.moviesDir);
            const { page, pageSize, sortBy, sortOrder } = params || {};
            const result = await movieService.getMoviesPaginatedFromIndex(moviesDir, {
                page: page || 1,
                pageSize: pageSize || 100,
                sortBy,
                sortOrder
            });
            return result;
        } catch (error) {
            console.error('Error getting movies paginated from index:', error);
            return { error: error.message };
        }
    });

    // 获取分页电影列表（按分类）
    ipcMain.handle('get-movies-by-category-paginated', async (event, params) => {
        try {
            const settings = settingsService.getSettings();
            const moviesDir = getMoviesDirPath(settings.library.moviesDir);
            const { category, page, pageSize, sortBy, sortOrder } = params || {};
            const result = await movieService.getMoviesPaginated(moviesDir, {
                category,
                page: page || 1,
                pageSize: pageSize || 100,
                sortBy,
                sortOrder
            });
            return result;
        } catch (error) {
            console.error('Error getting movies by category paginated:', error);
            return { error: error.message };
        }
    });

    // 从 index.json 获取指定分类的电影
    ipcMain.handle('get-movies-by-category-from-index', async (event, filters) => {
        try {
            const settings = settingsService.getSettings();
            const moviesDir = getMoviesDirPath(settings.library.moviesDir);
            const { category, sortBy, sortOrder } = filters || {};
            const categoryFilter = category;
            const movies = await movieService.getMoviesByCategoryFromIndex(categoryFilter, moviesDir, { sortBy, sortOrder });
            return movies;
        } catch (error) {
            console.error('Error getting movies by category from index:', error);
            return { error: error.message };
        }
    });

    // 获取电影详情
    ipcMain.handle('get-movie-detail', async (event, movieId) => {
        try {
            const settings = settingsService.getSettings();
            const moviesDir = getMoviesDirPath(settings.library.moviesDir);
            const detail = await movieService.getMovieDetail(movieId, moviesDir);
            return detail;
        } catch (error) {
            console.error('Error getting movie detail:', error);
            return { error: error.message };
        }
    });

    // 刷新电影库缓存
    ipcMain.handle('refresh-movie-library', async (event) => {
        try {
            const settings = settingsService.getSettings();
            const moviesDir = getMoviesDirPath(settings.library.moviesDir);
            const webContents = event.sender;

            const cacheInfo = await movieService.refreshCache(moviesDir, (current, total, movieName) => {
                webContents.send('refresh-library-progress', { current, total, movieName });
            });
            return { success: true, cacheInfo };
        } catch (error) {
            console.error('Error refreshing movie library:', error);
            return { error: error.message };
        }
    });

    // 获取缓存状态
    ipcMain.handle('get-cache-status', async () => {
        try {
            const isInitialized = movieCacheService.isCacheInitialized();
            const cacheInfo = movieCacheService.getCacheInfo();
            return { isInitialized, cacheInfo };
        } catch (error) {
            console.error('Error getting cache status:', error);
            return { error: error.message };
        }
    });

    // ==================== 电影状态管理 ====================

    // 更新电影状态
    ipcMain.handle('update-movie-status', async (event, data) => {
        try {
            const { movieId, status, playTime } = data;
            await dbService.saveMovieState(movieId, { status, playTime });
            return { success: true };
        } catch (error) {
            console.error('Error updating movie status:', error);
            return { error: error.message };
        }
    });

    // 保存用户评分
    ipcMain.handle('save-movie-rating', async (event, data) => {
        try {
            const settings = settingsService.getSettings();
            const moviesDir = getMoviesDirPath(settings.library.moviesDir);
            const { movieId, rating, comment } = data;
            await movieService.saveRating(movieId, rating, comment, moviesDir);
            await dbService.saveUserRating(movieId, rating, comment);
            return { success: true };
        } catch (error) {
            console.error('Error saving rating:', error);
            return { error: error.message };
        }
    });

    // ==================== 统计数据 ====================

    // 获取电影统计数据
    ipcMain.handle('get-movie-stats', async (event, category) => {
        try {
            const settings = settingsService.getSettings();
            const moviesDir = getMoviesDirPath(settings.library.moviesDir);
            const stats = await movieService.getStats(category, moviesDir);
            // 获取演员数量
            const totalActorCount = await actorService.getActorCount();
            stats.totalActorCount = totalActorCount;
            // 获取分类数量
            const totalCategoryCount = await categoryService.getCategoryCount();
            stats.totalCategoryCount = totalCategoryCount;
            return stats;
        } catch (error) {
            console.error('Error getting movie stats:', error);
            return { error: error.message };
        }
    });

    // ==================== 配置管理 ====================

    // 获取应用配置
    ipcMain.handle('get-settings', async () => {
        try {
            const settings = settingsService.getSettings();
            return settings;
        } catch (error) {
            console.error('Error getting settings:', error);
            return { error: error.message };
        }
    });

    // 保存应用配置
    ipcMain.handle('save-settings', async (event, newSettings) => {
        try {
            const oldSettings = settingsService.getSettings();
            settingsService.saveSettings(newSettings);

            // 如果电影目录改变，强制刷新缓存
            if (newSettings.library && oldSettings.library.moviesDir !== newSettings.library.moviesDir) {
                const moviesDir = getMoviesDirPath(newSettings.library.moviesDir);
                await movieService.refreshCache(moviesDir);
            }

            return { success: true };
        } catch (error) {
            console.error('Error saving settings:', error);
            return { error: error.message };
        }
    });

    // 获取演员列表
    ipcMain.handle('get-actors', async () => {
        try {
            const actors = await actorService.loadActors();
            return { actors };
        } catch (error) {
            console.error('Error getting actors:', error);
            return { error: error.message, actors: [] };
        }
    });

    // 广播演员更新
    function broadcastActorsUpdated() {
        BrowserWindow.getAllWindows().forEach(win => {
            win.webContents.send('actors-updated');
        });
    }

    // 创建演员
    ipcMain.handle('create-actor', async (event, actorData) => {
        try {
            const { name } = actorData;
            if (!name) {
                return { error: '演员姓名不能为空' };
            }
            await actorService.addActor(actorData);
            broadcastActorsUpdated();
            return { success: true };
        } catch (error) {
            console.error('Error creating actor:', error);
            return { error: error.message };
        }
    });

    // 更新演员
    ipcMain.handle('update-actor', async (event, { oldName, newActor }) => {
        try {
            await actorService.updateActor(oldName, newActor);
            broadcastActorsUpdated();
            return { success: true };
        } catch (error) {
            console.error('Error updating actor:', error);
            return { error: error.message };
        }
    });

    // 删除演员
    ipcMain.handle('delete-actor', async (event, name) => {
        try {
            await actorService.deleteActor(name);
            broadcastActorsUpdated();
            return { success: true };
        } catch (error) {
            console.error('Error deleting actor:', error);
            return { error: error.message };
        }
    });

    // 获取演员照片目录
    ipcMain.handle('get-actor-photo-dir', async () => {
        try {
            const dirPath = settingsService.getActorPhotoDir();
            return { dirPath };
        } catch (error) {
            console.error('Error getting actor photo dir:', error);
            return { error: error.message, dirPath: '' };
        }
    });

    // 保存演员照片
    ipcMain.handle('save-actor-photo', async (event, { base64Data, fileName }) => {
        try {
            const photoDir = settingsService.getActorPhotoDir();
            if (!photoDir) {
                return { error: '请先在设置中配置演员照片目录' };
            }
            const filePath = path.join(photoDir, fileName);
            await fileService.ensureDir(photoDir);
            const buffer = Buffer.from(base64Data, 'base64');
            await fileService.writeFile(filePath, buffer);
            return { success: true, filePath };
        } catch (error) {
            console.error('Error saving actor photo:', error);
            return { error: error.message };
        }
    });

    // 下载演员照片到演员目录
    ipcMain.handle('download-actor-photo', async (event, { photoUrl }) => {
        try {
            if (!photoUrl) {
                return { error: '照片 URL 为空' };
            }

            // 下载图片为 base64
            const { base64 } = await downloadImageAsBase64(photoUrl);

            // 生成文件名
            const fileName = `actor_${Date.now()}.jpg`;

            // 保存到演员照片目录
            const photoDir = settingsService.getActorPhotoDir();
            if (!photoDir) {
                return { error: '请先在设置中配置演员照片目录' };
            }

            const filePath = path.join(photoDir, fileName);
            await fileService.ensureDir(photoDir);
            const buffer = Buffer.from(base64, 'base64');
            await fileService.writeFile(filePath, buffer);

            return { success: true, filePath, fileName, base64 };
        } catch (error) {
            console.error('Error downloading actor photo:', error);
            return { error: error.message };
        }
    });

    // 更新电影目录配置
    ipcMain.handle('update-movies-dir', async (event, dirPath) => {
        try {
            settingsService.setMoviesDir(dirPath);
            return { success: true, dirPath };
        } catch (error) {
            console.error('Error updating movies dir:', error);
            return { error: error.message };
        }
    });

    // 获取电影目录配置
    ipcMain.handle('get-movies-dir', async () => {
        try {
            const dir = settingsService.getMoviesDir();
            return { dirPath: dir };
        } catch (error) {
            console.error('Error getting movies dir:', error);
            return { error: error.message };
        }
    });

    // 切换主题
    ipcMain.handle('set-theme', async (event, theme) => {
        try {
            settingsService.setTheme(theme);
            // 通知所有窗口主题已更改
            BrowserWindow.getAllWindows().forEach(win => {
                win.webContents.send('theme-changed', theme);
            });
            return { success: true, theme };
        } catch (error) {
            console.error('Error setting theme:', error);
            return { error: error.message };
        }
    });

    // 获取分类配置
    ipcMain.handle('get-category-config', async () => {
        try {
            const config = await fileService.getCategoryConfig();
            return config;
        } catch (error) {
            console.error('Error getting category config:', error);
            return { error: error.message };
        }
    });

    // 从缓存获取分类列表（用于渲染进程获取分类信息）
    ipcMain.handle('get-categories-from-cache', async () => {
        try {
            const categories = await categoryService.loadCategories();
            return categories;
        } catch (error) {
            console.error('Error getting categories from cache:', error);
            return { error: error.message };
        }
    });

    // 根据分类ID获取分类名称（从缓存）
    ipcMain.handle('get-category-name', async (event, categoryId) => {
        try {
            const name = categoryService.getCategoryName(categoryId);
            return name || categoryId;
        } catch (error) {
            console.error('Error getting category name:', error);
            return categoryId;
        }
    });

    // 根据分类ID获取分类短名称（从缓存）
    ipcMain.handle('get-category-short-name', async (event, categoryId) => {
        try {
            const shortName = categoryService.getCategoryShortName(categoryId);
            return shortName || categoryId;
        } catch (error) {
            console.error('Error getting category short name:', error);
            return categoryId;
        }
    });

    // ==================== 批量操作 ====================

    // 批量删除电影
    ipcMain.handle('batch-delete-movies', async (event, { movieIds }) => {
        try {
            const settings = settingsService.getSettings();
            const moviesDir = getMoviesDirPath(settings.library.moviesDir);
            const result = await movieService.batchDeleteMovies(movieIds, moviesDir);
            return result;
        } catch (error) {
            console.error('Error batch deleting movies:', error);
            return { error: error.message };
        }
    });

    // 保存电影编辑
    ipcMain.handle('save-movie-edit', async (event, movieData) => {
        try {
            const settings = settingsService.getSettings();
            const moviesDir = getMoviesDirPath(settings.library.moviesDir);

            // 获取 category 和 folderName
            let category = movieData.category;
            let folderName = movieData.folderName;

            // 如果 id 存在但 category 或 folderName 缺失，从 id 中提取
            // id 格式为 "category-folderName" 或 "category-folder-part1-folder-part2"
            if (movieData.id && (!category || !folderName)) {
                const firstDashIndex = movieData.id.indexOf('-');
                if (firstDashIndex > 0) {
                    if (!category) {
                        category = movieData.id.substring(0, firstDashIndex);
                    }
                    if (!folderName) {
                        folderName = movieData.id.substring(firstDashIndex + 1);
                    }
                }
            }

            // 如果仍然缺失，返回错误
            if (!category || !folderName) {
                console.error('save-movie-edit: category or folderName is missing', { category, folderName, movieData });
                return { error: '电影路径信息不完整，无法保存' };
            }

            // 读取现有的 movie.nfo
            const moviePath = path.join(moviesDir, category, folderName);
            const movieNfoPath = path.join(moviePath, 'movie.nfo');
            let existingData;
            if (fs.existsSync(movieNfoPath)) {
                existingData = await fileService.readMovieNfo(moviePath);
            } else {
                return { error: '电影文件不存在' };
            }

            // 更新数据
            existingData.name = movieData.name;
            existingData.title = movieData.name;
            existingData.publishDate = movieData.publishDate;
            existingData.status = movieData.status;
            existingData.userRating = movieData.userRating;
            existingData.tags = movieData.tags;
            existingData.description = movieData.description;
            existingData.userComment = movieData.userComment;
            existingData.fileset = movieData.fileset || [];
            existingData.original_filename = movieData.original_filename || existingData.original_filename || '';
            existingData.videoCodec = movieData.videoCodec || existingData.videoCodec || '';
            existingData.videoWidth = movieData.videoWidth || existingData.videoWidth || '';
            existingData.videoHeight = movieData.videoHeight || existingData.videoHeight || '';
            existingData.videoDuration = movieData.videoDuration || existingData.videoDuration || '';
            existingData.director = movieData.director || existingData.director || '';
            existingData.studio = movieData.studio || existingData.studio || '';
            existingData.actors = movieData.actors || existingData.actors || [];

            // 如果有封面路径，更新
            if (movieData.coverPath) {
                existingData.poster = movieData.coverPath;
            }

            // 如果有封面图片数据（base64），保存为 poster.jpg
            if (movieData.coverImage && movieData.coverImage.startsWith('data:')) {
                const base64Data = movieData.coverImage.replace(/^data:image\/\w+;base64,/, '');
                const coverPath = path.join(moviePath, 'poster.jpg');
                fs.writeFileSync(coverPath, Buffer.from(base64Data, 'base64'));
                existingData.poster = 'poster.jpg';
            }

            // 保存更新后的数据到 NFO
            await fileService.writeMovieNfo(moviePath, existingData);

            // 重新生成电影数据用于索引和缓存
            const updatedMovie = movieService.generateMovieData(existingData, folderName, category, moviePath);

            // 获取完整的海报路径
            updatedMovie.poster = await movieService.getMoviePoster(moviePath);

            // 更新索引
            await indexService.updateMovieIndex(updatedMovie, category, moviesDir);

            // 更新缓存
            if (movieCacheService.isCacheInitialized()) {
                movieCacheService.updateMovieInCache(updatedMovie);
            }

            // 广播电影更新事件给所有窗口
            BrowserWindow.getAllWindows().forEach(win => {
                win.webContents.send('movie-updated', updatedMovie);
            });

            return { success: true };
        } catch (error) {
            console.error('Error saving movie edit:', error);
            return { error: error.message };
        }
    });

    // 下载电影封面到电影目录
    ipcMain.handle('download-movie-cover', async (event, { category, folderName, coverUrl }) => {
        try {
            const settings = settingsService.getSettings();
            const moviesDir = getMoviesDirPath(settings.library.moviesDir);
            const movieFolderPath = path.join(moviesDir, category, folderName);

            // 确保电影目录存在
            if (!fs.existsSync(movieFolderPath)) {
                return { error: '电影目录不存在' };
            }

            if (!coverUrl) {
                return { error: '封面 URL 为空' };
            }

            // 下载封面到电影目录
            const coverPath = await downloadCoverToMovieFolder(coverUrl, movieFolderPath, 'poster');

            return { success: true, path: coverPath };
        } catch (error) {
            console.error('Error downloading movie cover:', error);
            return { error: error.message };
        }
    });

    // 删除单个电影
    ipcMain.handle('delete-movie', async (event, movieData) => {
        try {
            const settings = settingsService.getSettings();
            const moviesDir = getMoviesDirPath(settings.library.moviesDir);

            let category = movieData.category;
            let folderName = movieData.folderName;

            // 如果 id 存在但 category 或 folderName 缺失，从 id 中提取
            // id 格式为 "category-folderName" 或 "category-folder-part1-folder-part2"
            if (movieData.id && (!category || !folderName)) {
                const firstDashIndex = movieData.id.indexOf('-');
                if (firstDashIndex > 0) {
                    category = movieData.id.substring(0, firstDashIndex);
                    folderName = movieData.id.substring(firstDashIndex + 1);
                }
            }

            // 如果仍然缺失，返回错误
            if (!category || !folderName) {
                console.error('delete-movie: category or folderName is missing', { category, folderName, movieData });
                return { error: '电影路径信息不完整，无法删除' };
            }

            // 构建电影ID
            const movieId = movieData.id || `${category}-${folderName}`;

            // 删除电影文件夹
            const movieFolderPath = path.join(moviesDir, category, folderName);
            await fileService.deleteDir(movieFolderPath);

            // 从缓存中移除
            if (movieCacheService.isCacheInitialized()) {
                movieCacheService.removeMovieFromCache(movieId);
            }

            // 从 index.json 中移除
            await indexService.deleteMovieFromIndex(movieId, category, moviesDir);

            // 通知主窗口刷新
            const mainWindow = getMainWindow();
            if (mainWindow) {
                mainWindow.webContents.send('refresh-library');
            }

            return { success: true };
        } catch (error) {
            console.error('Error deleting movie:', error);
            return { error: error.message };
        }
    });

    // ==================== TMDB电影搜索 ====================

    // 搜索TMDB电影
    ipcMain.handle('tmdb-search-movie', async (event, keyword) => {
        try {
            const results = await tmdbMovieAdapterService.searchMovie(keyword);
            return results;
        } catch (error) {
            console.error('Error searching TMDB movie:', error);
            return { error: error.message };
        }
    });

    // 获取TMDB电影详情
    ipcMain.handle('tmdb-get-movie', async (event, searchId) => {
        try {
            const movie = await tmdbMovieAdapterService.getMovie(searchId);
            return movie;
        } catch (error) {
            console.error('Error getting TMDB movie:', error);
            return { error: error.message };
        }
    });

    // 搜索TMDB演员
    ipcMain.handle('tmdb-search-person', async (event, actorName) => {
        try {
            const results = await tmdbMovieAdapterService.searchPerson(actorName);
            return results;
        } catch (error) {
            console.error('Error searching TMDB person:', error);
            return { error: error.message };
        }
    });

    // 获取TMDB演员详情
    ipcMain.handle('tmdb-get-person', async (event, personId) => {
        try {
            const person = await tmdbMovieAdapterService.getPerson(personId);
            return person;
        } catch (error) {
            console.error('Error getting TMDB person:', error);
            return { error: error.message };
        }
    });

    // ==================== R18电影搜索 ====================

    ipcMain.handle('r18-search-movie', async (event, keyword) => {
        try {
            const results = await r18AdapterService.searchMovie(keyword);
            return results;
        } catch (error) {
            console.error('Error searching R18 movie:', error);
            return { error: error.message };
        }
    });

    ipcMain.handle('r18-get-movie', async (event, searchId) => {
        try {
            const movie = await r18AdapterService.getMovie(searchId);
            return movie;
        } catch (error) {
            console.error('Error getting R18 movie:', error);
            return { error: error.message };
        }
    });

    ipcMain.handle('r18-search-person', async (event, actorName) => {
        try {
            const results = await r18AdapterService.searchPerson(actorName);
            return results;
        } catch (error) {
            console.error('Error searching R18 person:', error);
            return { error: error.message };
        }
    });

    ipcMain.handle('r18-get-person', async (event, actorId) => {
        try {
            const person = await r18AdapterService.getPerson(actorId);
            return person;
        } catch (error) {
            console.error('Error getting R18 person:', error);
            return { error: error.message };
        }
    });

    // ==================== 电影盒子管理 ====================

    // 获取所有电影盒子
    ipcMain.handle('get-all-boxes', async () => {
        try {
            const settings = settingsService.getSettings();
            const movieboxDir = getMovieboxDirPath(settings.moviebox?.movieboxDir);
            const boxes = await boxService.getAllBoxes(movieboxDir);
            return boxes;
        } catch (error) {
            console.error('Error getting all boxes:', error);
            return { error: error.message };
        }
    });

    // 通知所有窗口刷新盒子列表
    function notifyBoxUpdated() {
        BrowserWindow.getAllWindows().forEach(win => {
            win.webContents.send('box-updated');
        });
    }

    // 创建电影盒子
    ipcMain.handle('create-box', async (event, { boxName, description }) => {
        try {
            const settings = settingsService.getSettings();
            const movieboxDir = getMovieboxDirPath(settings.moviebox?.movieboxDir);
            const result = await boxService.createBox(boxName, description, movieboxDir);
            notifyBoxUpdated();
            return result;
        } catch (error) {
            console.error('Error creating box:', error);
            return { error: error.message };
        }
    });

    // 更新电影盒子
    ipcMain.handle('update-box', async (event, { boxName, newName, description }) => {
        try {
            const settings = settingsService.getSettings();
            const movieboxDir = getMovieboxDirPath(settings.moviebox?.movieboxDir);
            const result = await boxService.updateBox(boxName, newName, description, movieboxDir);
            notifyBoxUpdated();
            return result;
        } catch (error) {
            console.error('Error updating box:', error);
            return { error: error.message };
        }
    });

    // 删除电影盒子
    ipcMain.handle('delete-box', async (event, boxName) => {
        try {
            const settings = settingsService.getSettings();
            const movieboxDir = getMovieboxDirPath(settings.moviebox?.movieboxDir);
            const result = await boxService.deleteBox(boxName, movieboxDir);
            notifyBoxUpdated();
            return result;
        } catch (error) {
            console.error('Error deleting box:', error);
            return { error: error.message };
        }
    });

    // 获取盒子详情
    ipcMain.handle('get-box-detail', async (event, boxName) => {
        try {
            const settings = settingsService.getSettings();
            const movieboxDir = getMovieboxDirPath(settings.moviebox?.movieboxDir);
            const result = await boxService.getBoxDetail(boxName, movieboxDir);
            return result;
        } catch (error) {
            console.error('Error getting box detail:', error);
            return { error: error.message };
        }
    });

    // 添加电影到盒子
    ipcMain.handle('add-movie-to-box', async (event, data) => {
        try {
            const settings = settingsService.getSettings();
            const movieboxDir = getMovieboxDirPath(settings.moviebox?.movieboxDir);
            const { boxName, movieInfo } = data;
            const result = await boxService.addMovieToBox(boxName, movieInfo, movieboxDir);
            notifyBoxUpdated();
            return result;
        } catch (error) {
            console.error('Error adding movie to box:', error);
            return { error: error.message };
        }
    });

    // 从盒子中移除电影
    ipcMain.handle('remove-movie-from-box', async (event, data) => {
        try {
            const settings = settingsService.getSettings();
            const movieboxDir = getMovieboxDirPath(settings.moviebox?.movieboxDir);
            const { boxName, movieId } = data;
            const result = await boxService.removeMovieFromBox(boxName, movieId, movieboxDir);
            notifyBoxUpdated();
            return result;
        } catch (error) {
            console.error('Error removing movie from box:', error);
            return { error: error.message };
        }
    });

    // 清理盒子中已删除的电影
    ipcMain.handle('clean-box', async (event, data) => {
        try {
            const settings = settingsService.getSettings();
            const movieboxDir = getMovieboxDirPath(settings.moviebox?.movieboxDir);
            const { boxName, validMovieIds } = data;
            const result = await boxService.cleanBox(boxName, validMovieIds, movieboxDir);
            notifyBoxUpdated();
            return result;
        } catch (error) {
            console.error('Error cleaning box:', error);
            return { error: error.message };
        }
    });

    // 更新盒子中电影的状态
    ipcMain.handle('update-movie-in-box', async (event, data) => {
        try {
            const settings = settingsService.getSettings();
            const movieboxDir = getMovieboxDirPath(settings.moviebox?.movieboxDir);
            const { boxName, movieId, movieInfo } = data;
            const result = await boxService.updateMovieInBox(boxName, movieId, movieInfo, movieboxDir);
            notifyBoxUpdated();
            return result;
        } catch (error) {
            console.error('Error updating movie in box:', error);
            return { error: error.message };
        }
    });

    // ==================== 窗口管理 ====================

    // 打开电影详情窗口
    ipcMain.handle('open-movie-detail', async (event, movieData) => {
        try {
            createMovieDetailWindow(movieData);
            return { success: true };
        } catch (error) {
            console.error('Error opening movie detail:', error);
            return { error: error.message };
        }
    });

    // 获取待发的电影详情数据
    ipcMain.handle('get-pending-movie-detail', async () => {
        try {
            const movieData = getPendingDetailMovieData();
            clearPendingDetailMovieData();
            return movieData;
        } catch (error) {
            console.error('Error getting pending movie detail:', error);
            return null;
        }
    });

    // 关闭详情窗口
    ipcMain.handle('close-detail-window', async () => {
        try {
            const windows = BrowserWindow.getAllWindows();
            // 找到非主窗口（详情窗口）
            const detailWin = windows.find(w => w !== BrowserWindow.getFocusedWindow()?.mainWindow);
            if (detailWin) {
                detailWin.close();
            } else if (windows.length > 0) {
                // 如果找不到，关闭最后一个窗口
                windows[windows.length - 1].close();
            }
            return { success: true };
        } catch (error) {
            console.error('Error closing detail window:', error);
            return { error: error.message };
        }
    });

    // 设置详情窗口编辑模式状态（锁定/解锁主窗口电影卡片点击）
    ipcMain.handle('set-detail-edit-mode', async (event, isEditing) => {
        try {
            // 发送事件给主窗口，通知电影卡片是否应该被锁定
            const mainWindow = services.getMainWindow();
            if (mainWindow) {
                mainWindow.webContents.send('detail-edit-mode-changed', isEditing);
            }
            return { success: true };
        } catch (error) {
            console.error('Error setting detail edit mode:', error);
            return { error: error.message };
        }
    });

    // 打开电影盒子窗口
    ipcMain.handle('open-box-window', async (event, boxName) => {
        try {
            createBoxWindow(boxName);
            return { success: true };
        } catch (error) {
            console.error('Error opening box window:', error);
            return { error: error.message };
        }
    });

    // 打开演员管理窗口
    ipcMain.handle('open-actor-management', async () => {
        try {
            createActorManagementWindow();
            return { success: true };
        } catch (error) {
            console.error('Error opening actor management:', error);
            return { error: error.message };
        }
    });

    // 打开分类管理窗口
    ipcMain.handle('open-category-management', async () => {
        try {
            createCategoryManagementWindow();
            return { success: true };
        } catch (error) {
            console.error('Error opening category management:', error);
            return { error: error.message };
        }
    });

    // 打开播放器窗口
    ipcMain.handle('open-player-window', async (event, movieData) => {
        try {
            const mainWindow = getMainWindow();
            playerService.openPlayerWindow(movieData, mainWindow, createPlayerWindow);
            return { success: true };
        } catch (error) {
            console.error('Error opening player window:', error);
            return { error: error.message };
        }
    });

    // ==================== 文件选择对话框 ====================

    // 选择目录
    ipcMain.handle('select-directory', async () => {
        try {
            const result = await dialog.showOpenDialog({
                properties: ['openDirectory']
            });
            if (result.canceled) {
                return { canceled: true };
            }
            return { canceled: false, path: result.filePaths[0] };
        } catch (error) {
            console.error('Error selecting directory:', error);
            return { error: error.message };
        }
    });

    // 选择文件
    ipcMain.handle('select-file', async (event, filters) => {
        try {
            const result = await dialog.showOpenDialog({
                properties: ['openFile'],
                filters: filters || []
            });
            if (result.canceled) {
                return { canceled: true };
            }
            const filePath = result.filePaths[0];
            const fileName = path.basename(filePath);
            let fileSize = 0;
            try {
                const stats = fs.statSync(filePath);
                fileSize = stats.size;
            } catch (e) {
                console.error('Error getting file stats:', e);
            }
            return { canceled: false, path: filePath, name: fileName, size: fileSize };
        } catch (error) {
            console.error('Error selecting file:', error);
            return { error: error.message };
        }
    });

    // 调整窗口大小
    ipcMain.handle('resize-window', async (event, width, height) => {
        try {
            const win = BrowserWindow.fromWebContents(event.sender);
            if (win) {
                win.setSize(width, height);
            }
            return { success: true };
        } catch (error) {
            console.error('Error resizing window:', error);
            return { error: error.message };
        }
    });

    // 最小化窗口
    ipcMain.handle('minimize-window', async (event) => {
        try {
            const win = BrowserWindow.fromWebContents(event.sender);
            if (win) {
                win.minimize();
            }
            return { success: true };
        } catch (error) {
            console.error('Error minimizing window:', error);
            return { error: error.message };
        }
    });

    // ==================== 添加电影 ====================

    // 添加单部电影
    ipcMain.handle('add-movie', async (event, movieData) => {
        try {
            const settings = settingsService.getSettings();
            const moviesDir = getMoviesDirPath(settings.library.moviesDir);

            // 处理封面图片（如果是 URL 或 base64 数据，则下载/保存为文件）
            let coverImagePath = null;
            if (movieData.coverImage) {
                // coverImage 可以是文件路径、base64 数据或 URL
                if (movieData.coverImage.startsWith('data:')) {
                    // base64 数据，需要保存到文件
                    const base64Data = movieData.coverImage.replace(/^data:image\/\w+;base64,/, '');
                    const ext = movieData.coverImage.match(/^data:image\/(\w+);base64,/)?.[1] || 'jpg';
                    const tempPath = path.join(APP_ROOT, 'temp_cover_' + Date.now() + '.' + ext);
                    fs.writeFileSync(tempPath, Buffer.from(base64Data, 'base64'));
                    coverImagePath = tempPath;
                } else if (movieData.coverImage.startsWith('http:') || movieData.coverImage.startsWith('https:')) {
                    // URL，需要下载到临时文件
                    try {
                        coverImagePath = await downloadFileToTemp(movieData.coverImage);
                    } catch (downloadError) {
                        // 下载失败不影响电影添加，只是不保存封面
                    }
                } else {
                    // 假设是本地文件路径
                    coverImagePath = movieData.coverImage;
                }
            }

            const result = await movieService.addMovie(movieData, coverImagePath, moviesDir);

            // 删除临时文件
            if (coverImagePath && coverImagePath.includes('temp_cover_')) {
                require('fs').unlinkSync(coverImagePath);
            }

            // 通知主窗口刷新
            const mainWindow = getMainWindow();
            if (mainWindow) {
                mainWindow.webContents.send('refresh-library');
            }

            return result;
        } catch (error) {
            console.error('Error adding movie:', error);
            return { error: error.message };
        }
    });

    // ==================== 电影目录扫描 ====================

    // 扫描电影目录
    ipcMain.handle('scan-movie-directory', async (event, { scanPath, scanType, category, dirNaming }) => {
        try {
            const settings = settingsService.getSettings();
            const moviesDir = getMoviesDirPath(settings.library.moviesDir);

            const result = await movieService.scanMovieDirectory(scanPath, scanType, category, moviesDir, dirNaming);
            return result;
        } catch (error) {
            console.error('Error scanning movie directory:', error);
            return { error: error.message };
        }
    });

    // 更新临时电影信息
    ipcMain.handle('update-temp-movie', async (event, { tempPath, movieData, coverImage, iconImage }) => {
        try {
            // 处理封面图片
            let coverImagePath = null;
            if (coverImage) {
                if (coverImage.startsWith('data:')) {
                    const base64Data = coverImage.replace(/^data:image\/\w+;base64,/, '');
                    const ext = coverImage.match(/^data:image\/(\w+);base64,/)?.[1] || 'jpg';
                    const tempImgPath = path.join(APP_ROOT, 'temp_cover_' + Date.now() + '.' + ext);
                    fs.writeFileSync(tempImgPath, Buffer.from(base64Data, 'base64'));
                    coverImagePath = tempImgPath;
                } else if (coverImage.startsWith('http:') || coverImage.startsWith('https:')) {
                    coverImagePath = await downloadFileToTemp(coverImage);
                } else {
                    coverImagePath = coverImage;
                }
            }

            // 处理图标图片
            let iconImagePath = null;
            if (iconImage) {
                if (iconImage.startsWith('http:') || iconImage.startsWith('https:')) {
                    iconImagePath = await downloadFileToTemp(iconImage);
                } else {
                    iconImagePath = iconImage;
                }
            }

            const result = await movieService.updateTempMovie(tempPath, movieData, coverImagePath);

            // 删除临时图片文件
            if (coverImagePath && coverImagePath.includes('temp_cover_')) {
                try { fs.unlinkSync(coverImagePath); } catch (e) { /* ignore */ }
            }
            if (iconImagePath && iconImagePath.includes('temp_cover_')) {
                try { fs.unlinkSync(iconImagePath); } catch (e) { /* ignore */ }
            }

            return result;
        } catch (error) {
            console.error('Error updating temp movie:', error);
            return { error: error.message };
        }
    });

    // 导入扫描的电影
    ipcMain.handle('import-scanned-movies', async (event, tempDir, excludeIds = [], importActors = false) => {
        try {
            const settings = settingsService.getSettings();
            if (!settings.library || settings.library.moviesDir === undefined) {
                throw new Error('Library settings are not configured properly');
            }
            const moviesDir = getMoviesDirPath(settings.library.moviesDir);

            const result = await movieService.importScannedMovies(tempDir, moviesDir, excludeIds, importActors);

            // 通知主窗口刷新
            const mainWindow = getMainWindow();
            if (mainWindow) {
                mainWindow.webContents.send('refresh-library');
            }

            return result;
        } catch (error) {
            console.error('Error importing scanned movies:', error);
            return { error: error.message };
        }
    });

    // 获取临时扫描的电影列表
    ipcMain.handle('get-temp-scanned-movies', async (event, tempDir) => {
        try {
            const movies = await movieService.getTempScannedMovies(tempDir);
            return movies;
        } catch (error) {
            console.error('Error getting temp scanned movies:', error);
            return { error: error.message };
        }
    });

    // 删除临时扫描目录
    ipcMain.handle('delete-temp-scan-dir', async (event, tempDir) => {
        try {
            const result = await movieService.deleteTempScanDir(tempDir);
            return result;
        } catch (error) {
            console.error('Error deleting temp scan dir:', error);
            return { error: error.message };
        }
    });

    // 检查文件是否存在
    ipcMain.handle('check-file-exists', async (event, filePath) => {
        try {
            const exists = await fileService.fileExists(filePath);
            return exists;
        } catch (error) {
            console.error('Error checking file exists:', error);
            return false;
        }
    });

    // 选择图片文件
    ipcMain.handle('select-image', async () => {
        try {
            const result = await dialog.showOpenDialog({
                properties: ['openFile'],
                filters: [
                    { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] }
                ]
            });
            if (result.canceled) {
                return { canceled: true };
            }
            return { canceled: false, path: result.filePaths[0] };
        } catch (error) {
            console.error('Error selecting image:', error);
            return { error: error.message };
        }
    });

    // 设置窗口最小尺寸
    ipcMain.handle('set-min-size', async (event, minWidth, minHeight) => {
        try {
            const win = BrowserWindow.fromWebContents(event.sender);
            if (win) {
                win.setMinimumSize(minWidth, minHeight);
            }
            return { success: true };
        } catch (error) {
            console.error('Error setting min size:', error);
            return { error: error.message };
        }
    });

    // ==================== 标签管理 ====================

    // 获取所有标签
    ipcMain.handle('get-tags', async () => {
        try {
            const tags = await tagService.loadTags();
            return tags;
        } catch (error) {
            console.error('Error getting tags:', error);
            return { error: error.message };
        }
    });

    // 广播标签更新
    function broadcastTagsUpdated() {
        BrowserWindow.getAllWindows().forEach(win => {
            win.webContents.send('tags-updated');
        });
    }

    // 创建标签
    ipcMain.handle('create-tag', async (event, { id, name }) => {
        try {
            const tags = await tagService.loadTags();
            if (tags.find(t => t.id === id)) {
                return { error: '标签已存在' };
            }
            tags.push({ id, name });
            await tagService.saveTags(tags);
            broadcastTagsUpdated();
            return { success: true };
        } catch (error) {
            console.error('Error creating tag:', error);
            return { error: error.message };
        }
    });

    // 更新标签
    ipcMain.handle('update-tag', async (event, { id, name }) => {
        try {
            const tags = await tagService.loadTags();
            const tag = tags.find(t => t.id === id);
            if (!tag) {
                return { error: '标签不存在' };
            }
            tag.name = name;
            await tagService.saveTags(tags);
            broadcastTagsUpdated();
            return { success: true };
        } catch (error) {
            console.error('Error updating tag:', error);
            return { error: error.message };
        }
    });

    // 删除标签
    ipcMain.handle('delete-tag', async (event, tagId) => {
        try {
            const tags = await tagService.loadTags();
            const index = tags.findIndex(t => t.id === tagId);
            if (index === -1) {
                return { error: '标签不存在' };
            }
            tags.splice(index, 1);
            await tagService.saveTags(tags);
            broadcastTagsUpdated();
            return { success: true };
        } catch (error) {
            console.error('Error deleting tag:', error);
            return { error: error.message };
        }
    });

    // ==================== 分类管理 ====================

    // 广播分类更新
    function broadcastCategoriesUpdated() {
        BrowserWindow.getAllWindows().forEach(win => {
            win.webContents.send('categories-updated');
        });
    }

    // 创建分类
    ipcMain.handle('create-category', async (event, { id, name, shortName, icon, color, emulatorId, order }) => {
        try {
            const categories = await categoryService.loadCategories();
            if (categories.find(c => c.id === id)) {
                return { error: '分类已存在' };
            }
            categories.push({ id, name, shortName, icon, color, emulatorId, order });
            await categoryService.saveCategories(categories);
            broadcastCategoriesUpdated();
            return { success: true };
        } catch (error) {
            console.error('Error creating category:', error);
            return { error: error.message };
        }
    });

    // 更新分类
    ipcMain.handle('update-category', async (event, { id, name, shortName, icon, color, emulatorId, order }) => {
        try {
            const categories = await categoryService.loadCategories();
            const category = categories.find(c => c.id === id);
            if (!category) {
                return { error: '分类不存在' };
            }
            // 更新字段
            category.name = name;
            category.shortName = shortName;
            category.icon = icon;
            category.color = color;
            category.emulatorId = emulatorId;
            category.order = order;
            await categoryService.saveCategories(categories);
            broadcastCategoriesUpdated();
            return { success: true };
        } catch (error) {
            console.error('Error updating category:', error);
            return { error: error.message };
        }
    });

    // 删除分类
    ipcMain.handle('delete-category', async (event, categoryId) => {
        try {
            const categories = await categoryService.loadCategories();
            const index = categories.findIndex(c => c.id === categoryId);
            if (index === -1) {
                return { error: '分类不存在' };
            }
            categories.splice(index, 1);
            await categoryService.saveCategories(categories);
            broadcastCategoriesUpdated();
            return { success: true };
        } catch (error) {
            console.error('Error deleting category:', error);
            return { error: error.message };
        }
    });

    // ==================== 盒子导出 ====================

    ipcMain.handle('show-export-save-dialog', async (event, { defaultPath, filters }) => {
        try {
            const result = await dialog.showSaveDialog({
                defaultPath: defaultPath,
                filters: filters
            });
            return result;
        } catch (error) {
            console.error('Error showing save dialog:', error);
            return { canceled: true, error: error.message };
        }
    });

    ipcMain.handle('export-box', async (event, { boxName, exportType, exportPath, movies }) => {
        try {
            const settings = settingsService.getSettings();
            const moviesDir = getMoviesDirPath(settings.library?.moviesDir);
            
            const exportService = new ExportService();
            const result = await exportService.exportBox(exportType, movies, moviesDir, exportPath, boxName);
            return result;
        } catch (error) {
            console.error('Error exporting box:', error);
            return { error: error.message };
        }
    });

    ipcMain.handle('open-batch-player-window', async (event, playlistData) => {
        try {
            const mainWindow = getMainWindow();
            playerService.openBatchPlayerWindow(playlistData, mainWindow, createPlayerWindow);
            return { success: true };
        } catch (error) {
            console.error('Error opening batch player window:', error);
            return { error: error.message };
        }
    });

    console.log('IPC handlers setup complete');
}

module.exports = { setupIpcHandlers };

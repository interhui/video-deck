/**
 * 预加载脚本
 * 用于安全地暴露 API 给渲染进程
 */
const { contextBridge, ipcRenderer } = require('electron');

// 暴露给渲染进程的 API
contextBridge.exposeInMainWorld('electronAPI', {
    // 电影查询
    getCategories: () => ipcRenderer.invoke('get-categories'),
    getMoviesByCategory: (filters) => ipcRenderer.invoke('get-movies-by-category', filters),
    searchMovies: (params) => ipcRenderer.invoke('search-movies', params),
    getAllMovies: (filters) => ipcRenderer.invoke('get-all-movies', filters),
    getAllMoviesFromIndex: (filters) => ipcRenderer.invoke('get-all-movies-from-index', filters),
    getMoviesByCategoryFromIndex: (filters) => ipcRenderer.invoke('get-movies-by-category-from-index', filters),
    getMovieDetail: (movieId) => ipcRenderer.invoke('get-movie-detail', movieId),

    // 分页电影查询
    getMoviesPaginated: (params) => ipcRenderer.invoke('get-movies-paginated', params),
    getMoviesPaginatedFromIndex: (params) => ipcRenderer.invoke('get-movies-paginated-from-index', params),
    getMoviesByCategoryPaginated: (params) => ipcRenderer.invoke('get-movies-by-category-paginated', params),

    // 电影状态管理
    saveMovieRating: (data) => ipcRenderer.invoke('save-movie-rating', data),

    // 统计数据
    getMovieStats: (category) => ipcRenderer.invoke('get-movie-stats', category),

    // 配置管理
    getSettings: () => ipcRenderer.invoke('get-settings'),
    saveSettings: (newSettings) => ipcRenderer.invoke('save-settings', newSettings),
    updateMoviesDir: (dirPath) => ipcRenderer.invoke('update-movies-dir', dirPath),
    getMoviesDir: () => ipcRenderer.invoke('get-movies-dir'),
    setTheme: (theme) => ipcRenderer.invoke('set-theme', theme),
    getCategoryConfig: () => ipcRenderer.invoke('get-category-config'),
    getCategoriesFromCache: () => ipcRenderer.invoke('get-categories-from-cache'),
    getCategoryName: (categoryId) => ipcRenderer.invoke('get-category-name', categoryId),
    getCategoryShortName: (categoryId) => ipcRenderer.invoke('get-category-short-name', categoryId),

    // 批量操作
    batchDeleteMovies: (data) => ipcRenderer.invoke('batch-delete-movies', data),

    // 电影编辑与删除
    saveMovieEdit: (movieData) => ipcRenderer.invoke('save-movie-edit', movieData),
    deleteMovie: (movieData) => ipcRenderer.invoke('delete-movie', movieData),
    refreshMovieLibrary: () => ipcRenderer.invoke('refresh-movie-library'),

    // 电影盒子管理
    getAllBoxes: () => ipcRenderer.invoke('get-all-boxes'),
    createBox: (data) => ipcRenderer.invoke('create-box', data),
    updateBox: (data) => ipcRenderer.invoke('update-box', data),
    deleteBox: (boxName) => ipcRenderer.invoke('delete-box', boxName),
    getBoxDetail: (boxName) => ipcRenderer.invoke('get-box-detail', boxName),
    addMovieToBox: (data) => ipcRenderer.invoke('add-movie-to-box', data),
    removeMovieFromBox: (data) => ipcRenderer.invoke('remove-movie-from-box', data),
    cleanBox: (data) => ipcRenderer.invoke('clean-box', data),
    updateMovieInBox: (data) => ipcRenderer.invoke('update-movie-in-box', data),

    // 窗口管理
    openMovieDetail: (movieData) => ipcRenderer.invoke('open-movie-detail', movieData),
    getPendingMovieDetail: () => ipcRenderer.invoke('get-pending-movie-detail'),
    closeDetailWindow: () => ipcRenderer.invoke('close-detail-window'),
    openBoxWindow: (boxName) => ipcRenderer.invoke('open-box-window', boxName),
    setDetailEditMode: (isEditing) => ipcRenderer.invoke('set-detail-edit-mode', isEditing),
    openActorManagement: () => ipcRenderer.invoke('open-actor-management'),
    openCategoryManagement: () => ipcRenderer.invoke('open-category-management'),
    openPlayerWindow: (movieData) => ipcRenderer.invoke('open-player-window', movieData),
    openBatchPlayerWindow: (playlistData) => ipcRenderer.invoke('open-batch-player-window', playlistData),

    // 文件选择对话框
    selectDirectory: () => ipcRenderer.invoke('select-directory'),
    selectFile: (filters) => ipcRenderer.invoke('select-file', filters),
    selectImage: () => ipcRenderer.invoke('select-image'),

    // 添加电影
    addMovie: (movieData) => ipcRenderer.invoke('add-movie', movieData),

    // 演员列表
    getActors: () => ipcRenderer.invoke('get-actors'),
    createActor: (data) => ipcRenderer.invoke('create-actor', data),
    updateActor: (data) => ipcRenderer.invoke('update-actor', data),
    deleteActor: (name) => ipcRenderer.invoke('delete-actor', name),
    getActorPhotoDir: () => ipcRenderer.invoke('get-actor-photo-dir'),
    saveActorPhoto: (data) => ipcRenderer.invoke('save-actor-photo', data),
    downloadActorPhoto: (data) => ipcRenderer.invoke('download-actor-photo', data),

    // 电影目录扫描
    scanMovieDirectory: (params) => ipcRenderer.invoke('scan-movie-directory', params),
    updateTempMovie: (params) => ipcRenderer.invoke('update-temp-movie', params),
    importScannedMovies: (tempDir, excludeIds, importActors) => ipcRenderer.invoke('import-scanned-movies', tempDir, excludeIds, importActors),
    getTempScannedMovies: (tempDir) => ipcRenderer.invoke('get-temp-scanned-movies', tempDir),
    deleteTempScanDir: (tempDir) => ipcRenderer.invoke('delete-temp-scan-dir', tempDir),
    checkFileExists: (filePath) => ipcRenderer.invoke('check-file-exists', filePath),

    // 事件监听
    onRefreshLibrary: (callback) => {
        ipcRenderer.on('refresh-library', callback);
    },
    onRefreshLibraryProgress: (callback) => {
        ipcRenderer.on('refresh-library-progress', (event, data) => callback(data));
    },
    onBoxUpdated: (callback) => {
        ipcRenderer.on('box-updated', callback);
    },
    onActorsUpdated: (callback) => {
        ipcRenderer.on('actors-updated', callback);
    },
    onTagsUpdated: (callback) => {
        ipcRenderer.on('tags-updated', callback);
    },
    onCategoriesUpdated: (callback) => {
        ipcRenderer.on('categories-updated', callback);
    },
    onOpenSettings: (callback) => {
        ipcRenderer.on('open-settings', callback);
    },
    onLoadMovieDetail: (callback) => {
        // 监听主进程请求获取电影详情的通知
        ipcRenderer.on('request-movie-detail', async () => {
            const movieData = await ipcRenderer.invoke('get-pending-movie-detail');
            if (movieData) {
                callback(movieData);
            }
        });
    },
    onThemeChanged: (callback) => {
        ipcRenderer.on('theme-changed', (event, theme) => callback(theme));
    },
    onDetailEditModeChanged: (callback) => {
        ipcRenderer.on('detail-edit-mode-changed', (event, isEditing) => callback(isEditing));
    },

    // 移除事件监听
    removeAllListeners: (channel) => {
        ipcRenderer.removeAllListeners(channel);
    },

    // 窗口操作
    resizeWindow: (width, height) => ipcRenderer.invoke('resize-window', width, height),
    setMinSize: (minWidth, minHeight) => ipcRenderer.invoke('set-min-size', minWidth, minHeight),
    minimizeWindow: () => ipcRenderer.invoke('minimize-window'),

    // 下载电影封面
    downloadMovieCover: (data) => ipcRenderer.invoke('download-movie-cover', data),

    // 标签
    getTags: () => ipcRenderer.invoke('get-tags'),
    createTag: (data) => ipcRenderer.invoke('create-tag', data),
    updateTag: (data) => ipcRenderer.invoke('update-tag', data),
    deleteTag: (tagId) => ipcRenderer.invoke('delete-tag', tagId),

    // 分类管理
    createCategory: (data) => ipcRenderer.invoke('create-category', data),
    updateCategory: (data) => ipcRenderer.invoke('update-category', data),
    deleteCategory: (categoryId) => ipcRenderer.invoke('delete-category', categoryId),

    // 盒子导出
    showExportSaveDialog: (data) => ipcRenderer.invoke('show-export-save-dialog', data),
    exportBox: (data) => ipcRenderer.invoke('export-box', data),

    // TMDB电影搜索
    tmdbSearchMovie: (keyword) => ipcRenderer.invoke('tmdb-search-movie', keyword),
    tmdbGetMovie: (searchId) => ipcRenderer.invoke('tmdb-get-movie', searchId),

    // TMDB演员搜索
    tmdbSearchPerson: (actorName) => ipcRenderer.invoke('tmdb-search-person', actorName),
    tmdbGetPerson: (personId) => ipcRenderer.invoke('tmdb-get-person', personId),

    // R18电影搜索
    r18SearchMovie: (keyword) => ipcRenderer.invoke('r18-search-movie', keyword),
    r18GetMovie: (searchId) => ipcRenderer.invoke('r18-get-movie', searchId),

    // R18演员搜索
    r18SearchPerson: (actorName) => ipcRenderer.invoke('r18-search-person', actorName),
    r18GetPerson: (actorId) => ipcRenderer.invoke('r18-get-person', actorId),

    // 视频信息获取
    getVideoInfo: (videoPath) => ipcRenderer.invoke('get-video-info', videoPath),

// 事件监听
    onOpenAddMovie: (callback) => {
        ipcRenderer.on('open-add-movie', callback);
    },
    onMovieUpdated: (callback) => {
        ipcRenderer.on('movie-updated', (event, movieData) => callback(movieData));
    },
    onLoadPlayerData: (callback) => {
        ipcRenderer.on('load-player-data', (event, data) => callback(data));
    }
});

console.log('Preload script loaded');

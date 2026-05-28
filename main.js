/**
 * Electron 主进程入口文件
 * 电影管理程序主入口
 */
const { app, BrowserWindow, ipcMain, Menu, dialog } = require('electron');
const path = require('path');
const log = require('electron-log');

// 配置日志
log.transports.file.level = 'info';
log.transports.file.resolvePathFn = () => path.join(app.getPath('userData'), 'logs', 'main.log');

// 引入服务
const FileService = require('./src/main/services/FileService');
const MovieService = require('./src/main/services/MovieService');
const MovieCacheService = require('./src/main/services/MovieCacheService');
const BoxService = require('./src/main/services/BoxService');
const DatabaseService = require('./src/main/services/DatabaseService');
const SettingsService = require('./src/main/services/SettingsService');
const TagService = require('./src/main/services/TagService');
const CategoryService = require('./src/main/services/CategoryService');
const IndexService = require('./src/main/services/IndexService');
const ActorService = require('./src/main/services/ActorService');
const TMDBMovieAdapterService = require('./src/main/services/TMDBAdapterService');
const R18AdapterService = require('./src/main/services/R18AdapterService');
const PlayerService = require('./src/main/services/PlayerService');
const BatchSearchService = require('./src/main/services/BatchSearchService');
const BatchActorSearchService = require('./src/main/services/BatchActorSearchService');
const ScreenshotService = require('./src/main/services/ScreenshotService');
const MovieHistoryService = require('./src/main/services/MovieHistoryService');
const { setupIpcHandlers } = require('./src/main/ipc-handlers');
const { setGlobalProxy } = require('./src/main/utils/http-utils');

// 全局变量
let mainWindow = null;
let detailWindow = null;
let pendingDetailMovieData = null;  // 待发送的电影详情数据

// 服务实例
let fileService = null;
let movieService = null;
let movieCacheService = null;
let dbService = null;
let settingsService = null;
let boxService = null;
let tagService = null;
let categoryService = null;
let indexService = null;
let actorService = null;
let tmdbMovieAdapterService = null;
let r18AdapterService = null;
let playerService = null;
let batchSearchService = null;
let batchActorSearchService = null;
let screenshotService = null;
let movieHistoryService = null;

/**
 * 初始化服务
 */
async function initializeServices() {
    const userDataPath = app.getPath('userData');

    fileService = new FileService();
    movieCacheService = new MovieCacheService();
    movieService = new MovieService();
    indexService = new IndexService();
    dbService = new DatabaseService(path.join(userDataPath, 'database', 'movies.db'));
    settingsService = new SettingsService(path.join(__dirname, 'config', 'settings.json'));
    boxService = new BoxService();
    tagService = new TagService(path.join(__dirname, 'config', 'tags.json'));
    categoryService = new CategoryService(path.join(__dirname, 'config', 'categories.json'));
    actorService = new ActorService(path.join(__dirname, 'config', 'actor.json'));
    tmdbMovieAdapterService = new TMDBMovieAdapterService(settingsService);

    // 等待设置加载完成后再初始化 R18AdapterService
    await settingsService.getSettingsPromise();
    
    // 初始化全局代理
    const proxyUrl = settingsService.getProxyAgentUrl();
    if (proxyUrl) {
        setGlobalProxy(proxyUrl);
        const proxyConfig = settingsService.getProxyConfig();
        console.debug('Proxy initialized', proxyConfig.address);
    }
    
    r18AdapterService = new R18AdapterService(settingsService, tmdbMovieAdapterService);
    playerService = new PlayerService();
    batchSearchService = new BatchSearchService(settingsService, tmdbMovieAdapterService, r18AdapterService, movieService, fileService);
    batchActorSearchService = new BatchActorSearchService(settingsService, tmdbMovieAdapterService, r18AdapterService, actorService);

    // 将 categoryService 传递给 movieService（如果支持）
    if (typeof movieService.setCategoryService === 'function') {
        movieService.setCategoryService(categoryService);
    }

    // 将缓存服务传递给 movieService
    if (typeof movieService.setCacheService === 'function') {
        movieService.setCacheService(movieCacheService);
    }

    // 将 actorService 传递给 movieService
    if (typeof movieService.setActorService === 'function') {
        movieService.setActorService(actorService);
    }

    screenshotService = new ScreenshotService();
    movieHistoryService = new MovieHistoryService(path.join(__dirname, 'config'));

    log.info('Services initialized successfully');
}

/**
 * 检查并重建缺失的 index.json 文件
 */
async function checkAndRebuildIndexes() {
    try {
        const settings = settingsService.getSettings();
        const moviesDir = path.join(__dirname, settings.library.moviesDir || 'movies');

        const { allExist, missingCategories } = await indexService.checkIndexesExist(moviesDir);

        if (!allExist) {
            log.info(`Missing index.json for categories: ${missingCategories.join(', ')}. Rebuilding...`);
            await movieService.refreshCache(moviesDir);
            log.info('Index rebuild completed');
        } else {
            log.info('All category indexes exist');
        }
    } catch (error) {
        log.error('Error checking/rebuilding indexes:', error);
    }
}

/**
 * 创建主窗口
 */
function createMainWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        title: '电影管理程序',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false
        },
        show: false
    });

    // 加载主界面
    mainWindow.loadFile(path.join(__dirname, 'src', 'renderer', 'index.html'));

    // 显示窗口后ready-to-show
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        mainWindow.maximize();
        log.info('Main window displayed and maximized');
    });

    // 窗口关闭事件
    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    // 创建菜单
    createApplicationMenu();
}

/**
 * 创建应用菜单
 */
function createApplicationMenu() {
    const template = [
        {
            label: '电影',
            submenu: [
                {
                    label: '添加电影',
                    accelerator: 'CmdOrCtrl+N',
                    click: () => {
                        if (mainWindow) {
                            mainWindow.webContents.send('open-add-movie');
                        }
                    }
                },
                { type: 'separator' },
                {
                    label: '演员管理',
                    click: () => createActorManagementWindow()
                },
                {
                    label: '标签管理',
                    click: () => createTagManagementWindow()
                },
                {
                    label: '分类管理',
                    click: () => createCategoryManagementWindow()
                },
                { type: 'separator' },
                {
                    label: '刷新电影库',
                    accelerator: 'CmdOrCtrl+R',
                    click: () => {
                        if (mainWindow) {
                            mainWindow.webContents.send('refresh-library');
                        }
                    }
                },
                { type: 'separator' },
                {
                    label: '设置',
                    accelerator: 'CmdOrCtrl+S',
                    click: () => {
                        if (mainWindow) {
                            mainWindow.webContents.send('open-settings');
                        }
                    }
                },
                { type: 'separator' },
                { 
                    label: '退出', 
                    accelerator: 'CmdOrCtrl+Q',
                    role: 'quit' 
                }
            ]
        },
        {
            label: '视图',
            submenu: [
                {
                    label: '重新加载',
                    accelerator: 'CmdOrCtrl+R',
                    click: () => {
                        if (mainWindow) {
                            mainWindow.webContents.send('refresh-library');
                        }
                    }
                },
                { role: 'forceReload' },
                { role: 'toggleDevTools' },
                { type: 'separator' },
                { role: 'resetZoom' },
                { role: 'zoomIn' },
                { role: 'zoomOut' },
                { type: 'separator' },
                { role: 'togglefullscreen' }
            ]
        },
        {
            label: '帮助',
            submenu: [
                {
                    label: '关于',
                    click: () => {
                        dialog.showMessageBox(mainWindow, {
                            type: 'info',
                            title: '关于',
                            message: '电影管理程序 v1.0.0',
                            detail: '基于 Electron 的电影管理工具'
                        });
                    }
                }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

/**
 * 创建电影详情窗口
 * @param {Object} movieData - 电影数据
 */
function createMovieDetailWindow(movieData) {
    // 存储待发送的电影数据
    pendingDetailMovieData = movieData;

    if (detailWindow) {
        detailWindow.focus();
        // 窗口已存在，通知其获取新数据
        if (detailWindow.webContents) {
            detailWindow.webContents.send('request-movie-detail');
        }
        return;
    }

    detailWindow = new BrowserWindow({
        width: 1200,
        height: 750,
        minWidth: 840,
        minHeight: 750,
        frame: false,
        title: '电影详情',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false
        },
        show: false
    });

    detailWindow.loadFile(path.join(__dirname, 'src', 'renderer', 'detail.html'));

    // 等待窗口加载完成后再显示
    detailWindow.webContents.once('did-finish-load', () => {
        detailWindow.show();
        // 窗口准备好后通知渲染进程请求数据
        detailWindow.webContents.send('request-movie-detail');
    });

    detailWindow.on('closed', () => {
        detailWindow = null;
        pendingDetailMovieData = null;
    });
}

/**
 * 创建电影盒子窗口
 */
let boxWindow = null;

function createBoxWindow(boxName) {
    if (boxWindow) {
        boxWindow.focus();
        return;
    }

    boxWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        title: `电影盒子 - ${boxName}`,
        frame: false,
        autoHideMenuBar: true,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false
        },
        show: false
    });

    boxWindow.loadFile(path.join(__dirname, 'src', 'renderer', 'box.html'), {
        query: { name: boxName }
    });

    boxWindow.once('ready-to-show', () => {
        boxWindow.show();
        boxWindow.maximize();
    });

    boxWindow.on('closed', () => {
        boxWindow = null;
    });
}

// 标签管理窗口
let tagManagementWindow = null;

function createTagManagementWindow() {
    if (tagManagementWindow) {
        tagManagementWindow.focus();
        return;
    }
    tagManagementWindow = new BrowserWindow({
        width: 900,
        height: 600,
        minWidth: 700,
        minHeight: 500,
        title: '标签管理',
        frame: false,
        autoHideMenuBar: true,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false
        },
        show: false
    });
    tagManagementWindow.loadFile(path.join(__dirname, 'src', 'renderer', 'tag-mgt.html'));
    tagManagementWindow.once('ready-to-show', () => {
        tagManagementWindow.show();
        tagManagementWindow.maximize();
    });
    tagManagementWindow.on('closed', () => { tagManagementWindow = null; });
}

// 分类管理窗口
let categoryManagementWindow = null;

function createCategoryManagementWindow() {
    if (categoryManagementWindow) {
        categoryManagementWindow.focus();
        return;
    }
    categoryManagementWindow = new BrowserWindow({
        width: 900,
        height: 600,
        minWidth: 700,
        minHeight: 500,
        title: '分类管理',
        frame: false,
        autoHideMenuBar: true,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false
        },
        show: false
    });
    categoryManagementWindow.loadFile(path.join(__dirname, 'src', 'renderer', 'category-mgt.html'));
    categoryManagementWindow.once('ready-to-show', () => {
        categoryManagementWindow.show();
        categoryManagementWindow.maximize();
    });
    categoryManagementWindow.on('closed', () => { categoryManagementWindow = null; });
}

// 演员管理窗口
let actorManagementWindow = null;

function createActorManagementWindow() {
    if (actorManagementWindow) {
        actorManagementWindow.focus();
        return;
    }
    actorManagementWindow = new BrowserWindow({
        width: 1100,
        height: 700,
        minWidth: 800,
        minHeight: 600,
        title: '演员管理',
        frame: false,
        autoHideMenuBar: true,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false
        },
        show: false
    });
    actorManagementWindow.loadFile(path.join(__dirname, 'src', 'renderer', 'actor-mgt.html'));
    actorManagementWindow.once('ready-to-show', () => {
        actorManagementWindow.show();
        actorManagementWindow.maximize();
    });
    actorManagementWindow.on('closed', () => { actorManagementWindow = null; });
}

// 播放器窗口
let playerWindow = null;

function createPlayerWindow(playerData) {
    if (playerWindow) {
        playerWindow.focus();
        // 通知播放器添加到播放列表
        playerWindow.webContents.send('add-to-playlist', playerData);
        return;
    }

    playerWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        title: playerData.movieTitle || '电影播放',
        frame: false,
        autoHideMenuBar: true,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false
        },
        show: false
    });

    playerWindow.loadFile(path.join(__dirname, 'src', 'renderer', 'player.html'));

    playerWindow.once('ready-to-show', () => {
        playerWindow.show();
        // 窗口准备好后发送播放数据
        playerWindow.webContents.send('load-player-data', playerData);
    });

    playerWindow.on('closed', () => {
        playerWindow = null;
    });
}

// 全局异常处理
process.on('uncaughtException', (error) => {
    log.error('Uncaught Exception:', error);
    dialog.showErrorBox('错误', `发生未处理的错误: ${error.message}`);
});

process.on('unhandledRejection', (reason, promise) => {
    log.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// App 事件
app.whenReady().then(async () => {
    log.info('App starting...');

    // 初始化服务
    await initializeServices();

    // 检查并重建缺失的 index.json 文件
    await checkAndRebuildIndexes();

    // 设置 IPC 处理器
    setupIpcHandlers({
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
        batchSearchService,
        batchActorSearchService,
        screenshotService,
        movieHistoryService,
        getMainWindow: () => mainWindow,
        createMovieDetailWindow,
        createBoxWindow,
        createActorManagementWindow,
        createCategoryManagementWindow,
        createPlayerWindow,
        getPendingDetailMovieData: () => {
            return pendingDetailMovieData;
        },
        clearPendingDetailMovieData: () => { pendingDetailMovieData = null; }
    });

    // 创建主窗口
    createMainWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createMainWindow();
        }
    });

    log.info('App started successfully');
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('before-quit', () => {
    log.info('App quitting...');
    if (dbService) {
        dbService.close();
    }
});

module.exports = { mainWindow, detailWindow };

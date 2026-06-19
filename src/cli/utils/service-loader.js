/**
 * CLI Service Loader
 * Reuses existing services from the main application
 */
const path = require('path');
const fs = require('fs');
const { computeLibraryPaths, applyLibraryPathsToServices } = require('../../main/utils/library-paths');

// Determine base paths based on whether running as CLI or within Electron
// CLI is now at src/cli, so baseDir is 3 levels up from this file
const isElectron = typeof process.env.ELECTRON_RUN === 'undefined';
const baseDir = path.join(__dirname, '..', '..', '..');

/**
 * Load all services for CLI use
 * @param {string} settingsPath - settings file path
 * @returns {object} Loaded services
 */
function loadServices(settingsPath) {
    const MovieService = require(path.join(baseDir, 'src', 'main', 'services', 'MovieService'));
    const BoxService = require(path.join(baseDir, 'src', 'main', 'services', 'BoxService'));
    const TagService = require(path.join(baseDir, 'src', 'main', 'services', 'TagService'));
    const SettingsService = require(path.join(baseDir, 'src', 'main', 'services', 'SettingsService'));
    const CategoryService = require(path.join(baseDir, 'src', 'main', 'services', 'CategoryService'));
    const FileService = require(path.join(baseDir, 'src', 'main', 'services', 'FileService'));
    const MovieCacheService = require(path.join(baseDir, 'src', 'main', 'services', 'MovieCacheService'));
    const IndexService = require(path.join(baseDir, 'src', 'main', 'services', 'IndexService'));

    const fileService = new FileService();
    const settingsService = new SettingsService(settingsPath);

    // 占位路径；settings 加载完成后由 initializeServices 调 applyLibraryPathsToServices 重定向到当前库的 dir
    const categoryService = new CategoryService(path.join(baseDir, 'config', 'categories.json'));
    const movieCacheService = new MovieCacheService();
    const indexService = new IndexService();

    const movieService = new MovieService(categoryService);
    movieService.setCacheService(movieCacheService);

    const boxService = new BoxService(path.join(baseDir, 'config', 'boxes.json'));
    const tagService = new TagService(path.join(baseDir, 'config', 'tags.json'));

    return {
        movieService,
        boxService,
        tagService,
        settingsService,
        categoryService,
        fileService,
        movieCacheService,
        indexService,
        // 兼容旧代码：通过 settingsService 间接获取
        getMoviesDir: () => settingsService.getMoviesDir(),
        getMovieboxDir: () => settingsService.getMovieboxDir(),
        getLibraryDir: () => settingsService.getLibraryDir()
    };
}

/**
 * Initialize services with default paths from settings
 * @param {object} options - Options object
 * @returns {Promise<object>} Initialized services
 */
async function initializeServices(options = {}) {
    const configDir = path.join(baseDir, 'config');

    // Ensure directories exist
    if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
    }

    const settingsPath = options.settingsPath || path.join(configDir, 'settings.json');

    // Create default settings if not exists
    if (!fs.existsSync(settingsPath)) {
        const defaultSettings = {
            version: '1.0.0',
            lastUpdate: Date.now(),
            appearance: { theme: 'dark', language: 'zh-CN' },
            layout: { sidebarWidth: 200, posterSize: 'large', columns: 6, viewMode: 'grid' },
            // 新结构：仅声明 dir，子目录由 SettingsService 派生
            library: {
                libraries: { default: { dir: '' } },
                currentLibrary: 'default',
                newMovieHours: 72
            }
        };
        fs.writeFileSync(settingsPath, JSON.stringify(defaultSettings, null, 2));
    }

    const services = loadServices(settingsPath);

    // 等设置加载完成后，把 5 个配置服务的路径切到当前库的 dir
    await services.settingsService.getSettingsPromise();

    // CLI 默认会把 actor 服务一并构造（main.js 里的 ActorService 在 CLI 路径下也常用）
    const ActorService = require(path.join(baseDir, 'src', 'main', 'services', 'ActorService'));
    const MovieHistoryService = require(path.join(baseDir, 'src', 'main', 'services', 'MovieHistoryService'));
    const actorService = new ActorService(path.join(configDir, 'actor.json'));
    const movieHistoryService = new MovieHistoryService(configDir);
    services.actorService = actorService;
    services.movieHistoryService = movieHistoryService;

    applyLibraryPathsToServices(computeLibraryPaths(services.settingsService), services);

    return services;
}

module.exports = {
    loadServices,
    initializeServices
};
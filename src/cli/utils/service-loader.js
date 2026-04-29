/**
 * CLI Service Loader
 * Reuses existing services from the main application
 */
const path = require('path');
const fs = require('fs');

// Determine base paths based on whether running as CLI or within Electron
// CLI is now at src/cli, so baseDir is 3 levels up from this file
const isElectron = typeof process.env.ELECTRON_RUN === 'undefined';
const baseDir = path.join(__dirname, '..', '..', '..');

/**
 * Load all services for CLI use
 * @param {string} moviesDir - Movies directory path
 * @param {string} movieboxDir - Moviebox directory path
 * @param {string} settingsPath - Settings file path
 * @param {string} tagsPath - Tags file path
 * @param {string} categoryConfigPath - Category config file path
 * @returns {object} Loaded services
 */
function loadServices(moviesDir, movieboxDir, settingsPath, tagsPath, categoryConfigPath) {
    const MovieService = require(path.join(baseDir, 'src', 'main', 'services', 'MovieService'));
    const BoxService = require(path.join(baseDir, 'src', 'main', 'services', 'BoxService'));
    const TagService = require(path.join(baseDir, 'src', 'main', 'services', 'TagService'));
    const SettingsService = require(path.join(baseDir, 'src', 'main', 'services', 'SettingsService'));
    const CategoryService = require(path.join(baseDir, 'src', 'main', 'services', 'CategoryService'));
    const FileService = require(path.join(baseDir, 'src', 'main', 'services', 'FileService'));
    const MovieCacheService = require(path.join(baseDir, 'src', 'main', 'services', 'MovieCacheService'));
    const IndexService = require(path.join(baseDir, 'src', 'main', 'services', 'IndexService'));

    const fileService = new FileService();
    const categoryService = new CategoryService(categoryConfigPath);
    const movieCacheService = new MovieCacheService();
    const indexService = new IndexService();

    const movieService = new MovieService(categoryService);
    movieService.setCacheService(movieCacheService);

    const settingsService = new SettingsService(settingsPath);
    const boxService = new BoxService();
    const tagService = new TagService(tagsPath);

    return {
        movieService,
        boxService,
        tagService,
        settingsService,
        categoryService,
        fileService,
        movieCacheService,
        indexService,
        getMoviesDir: () => moviesDir,
        getMovieboxDir: () => movieboxDir
    };
}

/**
 * Initialize services with default paths from settings
 * @param {object} options - Options object
 * @returns {Promise<object>} Initialized services
 */
async function initializeServices(options = {}) {
    const baseDir = path.join(__dirname, '..', '..', '..');
    const configDir = path.join(baseDir, 'config');

    // Ensure directories exist
    if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
    }

    const settingsPath = options.settingsPath || path.join(configDir, 'settings.json');
    const tagsPath = options.tagsPath || path.join(configDir, 'tags.json');
    const categoryConfigPath = options.categoryConfigPath || path.join(configDir, 'categories.json');

    // Create default settings if not exists
    if (!fs.existsSync(settingsPath)) {
        const defaultSettings = {
            version: '1.0.0',
            lastUpdate: Date.now(),
            appearance: { theme: 'dark', language: 'zh-CN' },
            layout: { sidebarWidth: 200, posterSize: 'large', columns: 6, viewMode: 'grid' },
            library: { moviesDir: path.join(baseDir, 'movies') },
            moviebox: { movieboxDir: path.join(baseDir, 'boxes') }
        };
        fs.writeFileSync(settingsPath, JSON.stringify(defaultSettings, null, 2));
    }

    // Create default tags if not exists
    if (!fs.existsSync(tagsPath)) {
        const defaultTags = [
            { id: 'action', name: '动作' },
            { id: 'scifi', name: '科幻' },
            { id: 'drama', name: '剧情' },
            { id: 'comedy', name: '喜剧' },
            { id: 'horror', name: '恐怖' },
            { id: 'thriller', name: '惊悚' },
            { id: 'animation', name: '动画' },
            { id: 'documentary', name: '纪录片' },
            { id: 'romance', name: '爱情' },
            { id: 'fantasy', name: '奇幻' }
        ];
        fs.writeFileSync(tagsPath, JSON.stringify(defaultTags, null, 2));
    }

    // Create default categories if not exists
    if (!fs.existsSync(categoryConfigPath)) {
        const HardCodeService = require(path.join(baseDir, 'src', 'main', 'services', 'HardCodeService'));
        const hardCodeService = new HardCodeService();
        const defaultCategories = hardCodeService.getDefaultCategories();
        const categoryConfig = { categories: defaultCategories, predefinedTags: [], customTags: [] };
        fs.writeFileSync(categoryConfigPath, JSON.stringify(categoryConfig, null, 2));
    }

    // Load settings to get directories
    const SettingsService = require(path.join(baseDir, 'src', 'main', 'services', 'SettingsService'));
    const settingsService = new SettingsService(settingsPath);
    const settings = settingsService.getSettings();

    const moviesDir = options.moviesDir || settings.library.moviesDir || path.join(baseDir, 'movies');
    const movieboxDir = options.movieboxDir || settings.moviebox.movieboxDir || path.join(baseDir, 'boxes');

    return loadServices(moviesDir, movieboxDir, settingsPath, tagsPath, categoryConfigPath);
}

module.exports = {
    loadServices,
    initializeServices
};

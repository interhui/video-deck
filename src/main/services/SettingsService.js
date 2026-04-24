/**
 * 配置服务
 * 负责应用配置的读取、保存和管理
 */
const FileService = require('./FileService');
const HardCodeService = require('./HardCodeService');
const path = require('path');

class SettingsService {
    constructor(settingsPath) {
        this.settingsPath = settingsPath;
        this.fileService = new FileService();
        this.hardCodeService = new HardCodeService();
        // 同步设置默认配置，保证 getSettings() 能立即返回有效值
        this.settings = this.hardCodeService.getDefaultSettings();
        // 异步加载用户配置并合并
        this.loadSettings();
    }

    /**
     * 加载配置
     */
    async loadSettings() {
        try {
            const defaultSettings = this.hardCodeService.getDefaultSettings();
            const settings = await this.fileService.readJson(this.settingsPath);

            if (settings) {
                // 合并默认配置和用户配置
                this.settings = this.mergeDeep(defaultSettings, settings);
            } else {
                // 使用默认配置
                this.settings = defaultSettings;
                // 保存默认配置
                this.saveSettings(this.settings);
            }

            return this.settings;
        } catch (error) {
            console.error('Error loading settings:', error);
            this.settings = this.hardCodeService.getDefaultSettings();
            return this.settings;
        }
    }

    /**
     * 保存配置
     * @param {object} newSettings - 新配置
     */
    saveSettings(newSettings) {
        try {
            this.settings = { ...this.settings, ...newSettings };
            this.fileService.writeJson(this.settingsPath, this.settings);
        } catch (error) {
            console.error('Error saving settings:', error);
            throw error;
        }
    }

    /**
     * 获取完整配置
     * @returns {object} 配置对象
     */
    getSettings() {
        return this.settings;
    }

    /**
     * 获取主题设置
     * @returns {string} 主题名称（dark/light）
     */
    getTheme() {
        return this.settings.appearance.theme || 'dark';
    }

    /**
     * 设置主题
     * @param {string} theme - 主题名称
     */
    setTheme(theme) {
        this.settings.appearance.theme = theme;
        this.saveSettings(this.settings);
    }

    /**
     * 获取布局设置
     * @returns {object} 布局配置
     */
    getLayoutSettings() {
        return this.settings.layout || {};
    }

    /**
     * 设置布局配置
     * @param {object} layout - 布局配置
     */
    setLayoutSettings(layout) {
        this.settings.layout = { ...this.settings.layout, ...layout };
        this.saveSettings(this.settings);
    }

    /**
     * 获取快捷键配置
     * @returns {object} 快捷键配置
     */
    getShortcuts() {
        return this.settings.shortcuts || {};
    }

    /**
     * 设置快捷键配置
     * @param {object} shortcuts - 快捷键配置
     */
    setShortcuts(shortcuts) {
        this.settings.shortcuts = { ...this.settings.shortcuts, ...shortcuts };
        this.saveSettings(this.settings);
    }

    /**
     * 获取电影目录配置
     * @returns {string} 电影目录路径
     */
    getMoviesDir() {
        return this.settings.library.moviesDir || path.join(__dirname, '..', 'movies');
    }

    /**
     * 设置电影目录
     * @param {string} dir - 电影目录路径
     */
    setMoviesDir(dir) {
        this.settings.library.moviesDir = dir;
        this.saveSettings(this.settings);
    }

    /**
     * 获取演员照片目录配置
     * @returns {string} 演员照片目录路径
     */
getActorPhotoDir() {
        return this.settings.library.actorPhotoDir || '';
    }

    setActorPhotoDir(dirPath) {
        if (!this.settings.library) {
            this.settings.library = {};
        }
        this.settings.library.actorPhotoDir = dirPath;
        this.saveSettings(this.settings);
    }

    getNewMovieHours() {
        return this.settings.library.newMovieHours || 72;
    }

    setNewMovieHours(hours) {
        if (!this.settings.library) {
            this.settings.library = {};
        }
        this.settings.library.newMovieHours = hours;
        this.saveSettings(this.settings);
    }

    /**
     * 设置演员照片目录
     * @param {string} dirPath - 演员照片目录路径
     */
    setActorPhotoDir(dirPath) {
        if (!this.settings.library) {
            this.settings.library = {};
        }
        this.settings.library.actorPhotoDir = dirPath;
        this.saveSettings(this.settings);
    }

    /**
     * 获取电影盒子目录配置
     * @returns {string} 电影盒子目录路径
     */
    getMovieboxDir() {
        return this.settings.moviebox.movieboxDir || path.join(__dirname, '..', '..', 'movieboxes');
    }

    /**
     * 设置电影盒子目录
     * @param {string} dir - 电影盒子目录路径
     */
    setMovieboxDir(dir) {
        this.settings.moviebox.movieboxDir = dir;
        this.saveSettings(this.settings);
    }

    /**
     * 获取模拟器路径
     * @param {string} category - 分类标识
     * @returns {string} 模拟器路径
     */
    getEmulatorPath(category) {
        const emulator = this.settings.emulators[category];
        return emulator ? emulator.path : null;
    }

    /**
     * 获取模拟器配置
     * @param {string} category - 分类标识
     * @returns {object} 模拟器配置
     */
    getEmulatorConfig(category) {
        return this.settings.emulators[category] || null;
    }

    /**
     * 设置模拟器配置
     * @param {string} category - 分类标识
     * @param {object} config - 模拟器配置
     */
    setEmulatorConfig(category, config) {
        this.settings.emulators[category] = config;
        this.saveSettings(this.settings);
    }

    /**
     * 获取语言设置
     * @returns {string} 语言代码
     */
    getLanguage() {
        return this.settings.appearance.language || 'zh-CN';
    }

    /**
     * 设置语言
     * @param {string} language - 语言代码
     */
    setLanguage(language) {
        this.settings.appearance.language = language;
        this.saveSettings(this.settings);
    }

    /**
     * 获取 IGDB 配置
     * @returns {object} IGDB 配置
     */
    getIgdbConfig() {
        return this.settings.igdb || { clientId: '', clientSecret: '' };
    }

    /**
     * 设置 IGDB 配置
     * @param {object} config - IGDB 配置
     */
    setIgdbConfig(config) {
        this.settings.igdb = { ...this.settings.igdb, ...config };
        this.saveSettings(this.settings);
    }

    /**
     * 深度合并对象
     * @param {object} target - 目标对象
     * @param {object} source - 源对象
     * @returns {object} 合并后的对象
     */
    mergeDeep(target, source) {
        const output = { ...target };

        if (this.isObject(target) && this.isObject(source)) {
            Object.keys(source).forEach(key => {
                if (this.isObject(source[key])) {
                    if (!(key in target)) {
                        output[key] = source[key];
                    } else {
                        output[key] = this.mergeDeep(target[key], source[key]);
                    }
                } else {
                    output[key] = source[key];
                }
            });
        }

        return output;
    }

    /**
     * 检查是否为对象
     * @param {any} item - 要检查的值
     * @returns {boolean} 是否为对象
     */
    isObject(item) {
        return item && typeof item === 'object' && !Array.isArray(item);
    }

    /**
     * 重置为默认配置
     */
    resetToDefaults() {
        this.settings = this.hardCodeService.getDefaultSettings();
        this.saveSettings(this.settings);
    }

    /**
     * 导出配置
     * @returns {string} JSON 字符串
     */
    exportSettings() {
        return JSON.stringify(this.settings, null, 2);
    }

    /**
     * 导入配置
     * @param {string} jsonString - JSON 字符串
     */
    importSettings(jsonString) {
        try {
            const imported = JSON.parse(jsonString);
            this.saveSettings(imported);
        } catch (error) {
            console.error('Error importing settings:', error);
            throw error;
        }
    }
}

module.exports = SettingsService;

/**
 * 配置服务
 * 负责应用配置的读取、保存和管理
 * 包含多影视库（libraries / currentLibrary）能力的管理与兼容旧结构的迁移
 *
 * 影视库结构（自 v1.2 起）：
 *   library.libraries.<name> = { dir }
 *   其中 moviesDir   = ${dir}/movies
 *        actorPhotoDir = ${dir}/actors
 *        movieboxDir = ${dir}/boxes
 * 旧的 { moviesDir, actorPhotoDir, movieboxDir } 结构在加载时被强制重置为 { dir: '' }，
 * 强制用户重新配置 dir。
 */
const FileService = require('./FileService');
const HardCodeService = require('./HardCodeService');
const path = require('path');

// 默认影视库名称
const DEFAULT_LIBRARY_NAME = 'default';

// 旧结构字段名（用于迁移检测）
const LEGACY_LIB_FIELDS = ['moviesDir', 'actorPhotoDir', 'movieboxDir'];

// 子目录常量
const MOVIES_SUBDIR = 'movies';
const ACTOR_PHOTO_SUBDIR = 'actors';
const MOVIEBOX_SUBDIR = 'boxes';

/**
 * 判断是否为对象
 * @param {any} item
 * @returns {boolean}
 */
function isPlainObject(item) {
    return item && typeof item === 'object' && !Array.isArray(item);
}

/**
 * 检查库配置对象是否包含旧结构的字段
 * @param {object} entry
 * @returns {boolean}
 */
function hasLegacyLibFields(entry) {
    if (!isPlainObject(entry)) return false;
    return LEGACY_LIB_FIELDS.some(k => Object.prototype.hasOwnProperty.call(entry, k));
}

/**
 * 从库的 dir 派生子目录路径
 * @param {object} lib
 * @returns {{dir: string, moviesDir: string, actorPhotoDir: string, movieboxDir: string}}
 */
function deriveLibraryPaths(lib) {
    const dir = (isPlainObject(lib) && lib.dir) ? lib.dir : '';
    if (!dir) {
        return { dir: '', moviesDir: '', actorPhotoDir: '', movieboxDir: '' };
    }
    return {
        dir,
        moviesDir: path.join(dir, MOVIES_SUBDIR),
        actorPhotoDir: path.join(dir, ACTOR_PHOTO_SUBDIR),
        movieboxDir: path.join(dir, MOVIEBOX_SUBDIR)
    };
}

class SettingsService {
    constructor(settingsPath) {
        this.settingsPath = settingsPath;
        this.fileService = new FileService();
        this.hardCodeService = new HardCodeService();
        // 同步设置默认配置，保证 getSettings() 能立即返回有效值
        this.settings = this.hardCodeService.getDefaultSettings();
        // 异步加载用户配置并合并
        this.settingsLoadPromise = this.loadSettings();
    }

    /**
     * 获取设置加载完成的 Promise
     * @returns {Promise} 当设置加载完成时 resolve 的 Promise
     */
    getSettingsPromise() {
        return this.settingsLoadPromise;
    }

    /**
     * 加载配置；如检测到旧结构（library.moviesDir / moviebox.movieboxDir / library.libraries.*.moviesDir）则强制重置为新结构
     */
    async loadSettings() {
        try {
            const defaultSettings = this.hardCodeService.getDefaultSettings();
            const settings = await this.fileService.readJson(this.settingsPath);

            let merged;
            if (settings) {
                // 先将旧结构迁移到新结构（修改的副本，不污染原对象）
                const migratedSettings = this.migrateLegacySettings(settings);
                // 合并默认配置和用户配置
                merged = this.mergeDeep(defaultSettings, migratedSettings);
            } else {
                // 使用默认配置
                merged = defaultSettings;
                // 保存默认配置
                this.saveSettings(merged);
                // 等待文件写入完成，避免后续测试读到旧文件
                await this.fileService.writeJson(this.settingsPath, this.settings).catch(() => {});
            }

            // 保证 library 节点结构有效（兜底）
            this.ensureLibraryShape(merged);

            // 新结构中不再有 moviebox 节点；若仍存在，直接删除
            if (merged && Object.prototype.hasOwnProperty.call(merged, 'moviebox')) {
                delete merged.moviebox;
            }

            this.settings = merged;
            return this.settings;
        } catch (error) {
            console.error('Error loading settings:', error.message || error);
            this.settings = this.hardCodeService.getDefaultSettings();
            this.ensureLibraryShape(this.settings);
            return this.settings;
        }
    }

    /**
     * 迁移旧 settings 结构至新结构
     * 新结构：library.libraries.* = { dir }
     * 旧结构（library.moviesDir / moviebox.movieboxDir 或 library.libraries.*.moviesDir）
     * 一律被强制清空为 { dir: '' }，由用户重新配置。
     * @param {object} settings - 加载得到的原始 settings
     * @returns {object} 迁移后的 settings（浅拷贝，避免污染入参）
     */
    migrateLegacySettings(settings) {
        if (!settings || typeof settings !== 'object') {
            return settings;
        }
        const cloned = { ...settings };
        const legacyLibrary = cloned.library || {};
        const hasRootLegacyMoviesDir = Object.prototype.hasOwnProperty.call(legacyLibrary, 'moviesDir');
        const hasRootLegacyMovieboxDir = cloned.moviebox && Object.prototype.hasOwnProperty.call(cloned.moviebox, 'movieboxDir');

        // 强制重置 libraries 中所有遗留旧结构的条目
        if (legacyLibrary.libraries && typeof legacyLibrary.libraries === 'object'
            && !Array.isArray(legacyLibrary.libraries)) {
            const newLibraries = {};
            Object.entries(legacyLibrary.libraries).forEach(([name, entry]) => {
                if (hasLegacyLibFields(entry)) {
                    console.warn(`[SettingsService] Detected legacy library "${name}" with moviesDir/actorPhotoDir/movieboxDir. Forcing reconfiguration to { dir: '' }. Please set the library dir in settings.`);
                    newLibraries[name] = { dir: '' };
                } else if (isPlainObject(entry)) {
                    // 已是新结构 { dir } 或 { dir: ... }，保留
                    newLibraries[name] = { dir: entry.dir || '' };
                } else {
                    newLibraries[name] = { dir: '' };
                }
            });
            legacyLibrary.libraries = newLibraries;
        }

        // 旧结构：library.{moviesDir, actorPhotoDir, newMovieHours}, moviebox.{movieboxDir}
        // 这些顶层旧字段在新结构中没有意义，直接丢弃
        if (hasRootLegacyMoviesDir || hasRootLegacyMovieboxDir) {
            console.warn('[SettingsService] Detected legacy settings with library.moviesDir / moviebox.movieboxDir. These fields are no longer used; the new model requires library.libraries.<name>.dir.');
        }

        // 清理 library 根上的旧字段
        ['moviesDir', 'actorPhotoDir'].forEach((k) => {
            if (Object.prototype.hasOwnProperty.call(legacyLibrary, k)) {
                delete legacyLibrary[k];
            }
        });

        // 保留 newMovieHours（如有）
        if (legacyLibrary.newMovieHours === undefined
            && Object.prototype.hasOwnProperty.call(cloned, 'moviebox') === false) {
            // 无新结构相关字段时不需要特殊处理
        }

        // 删除 moviebox 节点
        if (Object.prototype.hasOwnProperty.call(cloned, 'moviebox')) {
            delete cloned.moviebox;
        }
        cloned.library = legacyLibrary;
        return cloned;
    }

    /**
     * 保证 settings.library 结构完整，缺失字段补默认值
     * @param {object} settings - 配置对象
     */
    ensureLibraryShape(settings) {
        if (!settings) return;
        if (!settings.library || typeof settings.library !== 'object') {
            settings.library = {};
        }
        const lib = settings.library;
        if (!lib.libraries || typeof lib.libraries !== 'object' || Array.isArray(lib.libraries)
            || Object.keys(lib.libraries).length === 0) {
            // 兜底：构造一个 default 库（dir 为空，提示用户配置）
            lib.libraries = {
                [DEFAULT_LIBRARY_NAME]: { dir: '' }
            };
        }
        if (!lib.currentLibrary || !lib.libraries[lib.currentLibrary]) {
            lib.currentLibrary = Object.keys(lib.libraries)[0] || DEFAULT_LIBRARY_NAME;
        }
        if (lib.newMovieHours === undefined || lib.newMovieHours === null) {
            lib.newMovieHours = 72;
        }
        // 兜底每个库都具备 dir 字段，并剥离遗留的旧字段
        Object.keys(lib.libraries).forEach((name) => {
            let entry = lib.libraries[name];
            if (!isPlainObject(entry)) {
                entry = {};
            }
            if (hasLegacyLibFields(entry)) {
                console.warn(`[SettingsService] ensureLibraryShape: stripping legacy fields from library "${name}".`);
                entry = { dir: '' };
            }
            if (!Object.prototype.hasOwnProperty.call(entry, 'dir')) {
                entry.dir = '';
            }
            lib.libraries[name] = entry;
        });
    }

    /**
     * 获取指定名称的库配置，找不到时回退到当前库，再回退到首个库
     * @param {string} [name] - 库名称，可选
     * @returns {object|null}
     */
    getLibrary(name) {
        this.ensureLibraryShape(this.settings);
        const libs = this.settings.library.libraries;
        if (name && libs[name]) {
            return libs[name];
        }
        const current = this.settings.library.currentLibrary;
        if (current && libs[current]) {
            return libs[current];
        }
        const first = Object.keys(libs)[0];
        return first ? libs[first] : null;
    }

    /**
     * 获取所有库配置（深拷贝，避免外部修改污染内存）
     * @returns {object} libraries 映射
     */
    getLibraries() {
        this.ensureLibraryShape(this.settings);
        return JSON.parse(JSON.stringify(this.settings.library.libraries));
    }

    /**
     * 获取当前库名称
     * @returns {string}
     */
    getCurrentLibraryName() {
        this.ensureLibraryShape(this.settings);
        return this.settings.library.currentLibrary || DEFAULT_LIBRARY_NAME;
    }

    /**
     * 设置当前库
     * @param {string} name - 库名称
     * @returns {boolean} 是否设置成功
     */
    setCurrentLibrary(name) {
        this.ensureLibraryShape(this.settings);
        if (!name || typeof name !== 'string') {
            return false;
        }
        const trimmed = name.trim();
        if (!trimmed) {
            return false;
        }
        if (!this.settings.library.libraries[trimmed]) {
            return false;
        }
        this.settings.library.currentLibrary = trimmed;
        this.saveSettings(this.settings);
        return true;
    }

    /**
     * 新增库
     * @param {string} name - 库名称（必须唯一）
     * @param {object} config - 库配置 {dir}
     * @returns {{success: boolean, error?: string}}
     */
    addLibrary(name, config) {
        this.ensureLibraryShape(this.settings);
        if (!name || typeof name !== 'string') {
            return { success: false, error: '影视库名称不能为空' };
        }
        const trimmed = name.trim();
        if (!trimmed) {
            return { success: false, error: '影视库名称不能为空' };
        }
        if (this.settings.library.libraries[trimmed]) {
            return { success: false, error: `影视库 "${trimmed}" 已存在` };
        }
        const cfg = (config && typeof config === 'object') ? config : {};
        if (hasLegacyLibFields(cfg)) {
            console.warn('[SettingsService] addLibrary: legacy keys (moviesDir/actorPhotoDir/movieboxDir) ignored, please use { dir }.');
        }
        this.settings.library.libraries[trimmed] = { dir: cfg.dir || '' };
        this.saveSettings(this.settings);
        return { success: true };
    }

    /**
     * 删除库（不允许删除当前库）
     * @param {string} name - 库名称
     * @returns {{success: boolean, error?: string}}
     */
    removeLibrary(name) {
        this.ensureLibraryShape(this.settings);
        if (!name || !this.settings.library.libraries[name]) {
            return { success: false, error: '影视库不存在' };
        }
        if (this.settings.library.currentLibrary === name) {
            return { success: false, error: '不能删除当前正在使用的影视库' };
        }
        delete this.settings.library.libraries[name];
        this.saveSettings(this.settings);
        return { success: true };
    }

    /**
     * 更新指定库的目录配置
     * @param {string} name - 库名称
     * @param {object} patch - 待更新的字段 {dir}
     * @returns {{success: boolean, error?: string}}
     */
    updateLibrary(name, patch) {
        this.ensureLibraryShape(this.settings);
        if (!name || !this.settings.library.libraries[name]) {
            return { success: false, error: '影视库不存在' };
        }
        const target = this.settings.library.libraries[name];
        if (patch && typeof patch === 'object') {
            if (hasLegacyLibFields(patch)) {
                console.warn('[SettingsService] updateLibrary: legacy keys (moviesDir/actorPhotoDir/movieboxDir) ignored, please use { dir }.');
            }
            if (Object.prototype.hasOwnProperty.call(patch, 'dir')) {
                target.dir = patch.dir || '';
            }
        }
        this.saveSettings(this.settings);
        return { success: true };
    }

    /**
     * 保存配置
     * @param {object} newSettings - 新配置
     */
    saveSettings(newSettings) {
        try {
            // 合并到内存中的 settings（保留未提供的字段）
            this.settings = { ...this.settings, ...newSettings };
            // 重新规整 library 结构
            this.ensureLibraryShape(this.settings);
            // 新结构不再需要 moviebox 根节点，若有则删除
            if (this.settings && Object.prototype.hasOwnProperty.call(this.settings, 'moviebox')) {
                console.warn('[SettingsService] saveSettings: top-level "moviebox" field is no longer supported and has been removed.');
                delete this.settings.moviebox;
            }
            // 写文件：吞掉异常，避免上层未 await 时形成 Unhandled Rejection
            const writePromise = this.fileService.writeJson(this.settingsPath, this.settings);
            if (writePromise && typeof writePromise.catch === 'function') {
                writePromise.catch((err) => {
                    console.error('Error writing settings file:', err.message || err);
                });
            }
        } catch (error) {
            console.error('Error saving settings:', error.message || error);
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
     * 获取当前库的影视库根目录
     * @returns {string}
     */
    getLibraryDir() {
        const lib = this.getLibrary();
        return lib ? (lib.dir || '') : '';
    }

    /**
     * 获取当前库的电影目录（派生自 lib.dir）
     * @returns {string}
     */
    getMoviesDir() {
        return deriveLibraryPaths(this.getLibrary()).moviesDir;
    }

    /**
     * 获取当前库的演员照片目录（派生自 lib.dir）
     * @returns {string}
     */
    getActorPhotoDir() {
        return deriveLibraryPaths(this.getLibrary()).actorPhotoDir;
    }

    /**
     * 获取当前库的电影收藏夹目录（派生自 lib.dir）
     * @returns {string}
     */
    getMovieboxDir() {
        return deriveLibraryPaths(this.getLibrary()).movieboxDir;
    }

    /**
     * 设置当前库的影视库根目录
     * @param {string} dir
     */
    setLibraryDir(dir) {
        const name = this.getCurrentLibraryName();
        this.updateLibrary(name, { dir });
    }

    /**
     * 获取新电影时间阈值（小时）
     * @returns {number}
     */
    getNewMovieHours() {
        return this.settings.library.newMovieHours || 72;
    }

    /**
     * 设置新电影时间阈值（小时）
     * @param {number} hours - 小时数
     */
    setNewMovieHours(hours) {
        if (!this.settings.library) {
            this.settings.library = {};
        }
        this.settings.library.newMovieHours = hours;
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


    getTmdbConfig() {
        return this.settings.tmdb || { url: 'api.themoviedb.org', token: '', language: 'zh-CN' };
    }

    setTmdbConfig(config) {
        this.settings.tmdb = { ...this.settings.tmdb, ...config };
        this.saveSettings(this.settings);
    }

    getR18Config() {
        return this.settings.r18 || { dbUrl: '', dbUsername: '', dbPassword: '' };
    }

    setR18Config(config) {
        this.settings.r18 = { ...this.settings.r18, ...config };
        this.saveSettings(this.settings);
    }

    getProxyConfig() {
        return this.settings.proxy || { enabled: false, address: '', username: '', password: '' };
    }

    setProxyConfig(config) {
        this.settings.proxy = { ...this.settings.proxy, ...config };
        this.saveSettings(this.settings);
    }

    /**
     * 获取HTTP服务配置
     * @returns {object} HTTP服务配置（enabled/listenAddress/listenPort）
     */
    getHttpConfig() {
        return this.settings.http || { enabled: false, listenAddress: '0.0.0.0', listenPort: 8080 };
    }

    /**
     * 设置HTTP服务配置
     * @param {object} config - HTTP服务配置（enabled/listenAddress/listenPort）
     */
    setHttpConfig(config) {
        this.settings.http = { ...this.settings.http, ...config };
        this.saveSettings(this.settings);
    }

    /**
     * 获取播放器配置
     * @returns {object} 播放器配置
     */
    getPlayerConfig() {
        return this.settings.player || { subtitle: { backgroundColor: 'rgba(0, 0, 0, 0.7)', fontSize: '22px' }, volume: 45 };
    }

    /**
     * 设置播放器配置
     * @param {object} config - 播放器配置
     */
    setPlayerConfig(config) {
        if (!this.settings.player) {
            this.settings.player = {};
        }
        if (config.subtitle) {
            this.settings.player.subtitle = { ...this.settings.player.subtitle, ...config.subtitle };
        } else {
            this.settings.player = { ...this.settings.player, ...config };
        }
        this.saveSettings(this.settings);
    }

    getProxyAgentUrl() {
        const proxy = this.settings.proxy || {};
        if (!proxy.enabled || !proxy.address) {
            return null;
        }
        if (proxy.username && proxy.password) {
            return `${proxy.address.replace('://', `://${encodeURIComponent(proxy.username)}:${encodeURIComponent(proxy.password)}@`)}`;
        }
        return proxy.address;
    }

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
        this.ensureLibraryShape(this.settings);
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
     * @param {string} jsonString
     */
    importSettings(jsonString) {
        try {
            const imported = JSON.parse(jsonString);
            // 同样做一次迁移，避免导入旧格式
            const migrated = this.migrateLegacySettings(imported);
            this.saveSettings(migrated);
        } catch (error) {
            console.error('Error importing settings:', error.message || error);
            throw error;
        }
    }
}

module.exports = SettingsService;
module.exports.DEFAULT_LIBRARY_NAME = DEFAULT_LIBRARY_NAME;
module.exports.deriveLibraryPaths = deriveLibraryPaths;
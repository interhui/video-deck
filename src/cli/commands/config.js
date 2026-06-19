/**
 * Config Commands
 */
const {
    outputSuccess,
    outputError
} = require('../utils/output');

/**
 * Show all configuration
 * @param {object} services - Loaded services
 * @param {object} options - Command options
 */
async function showConfig(services, options = {}) {
    try {
        const { settingsService } = services;
        const settings = settingsService.getSettings();

        if (options.format === 'json') {
            console.log(JSON.stringify(settings, null, 2));
        } else {
            console.log('\n当前配置:');
            const currentLibraryName = settings.library?.currentLibrary || 'default';
            const currentLib = settings.library?.libraries?.[currentLibraryName] || {};
            console.log(`  当前影视库: ${currentLibraryName}`);
            console.log(`  影视库列表: ${Object.keys(settings.library?.libraries || {}).join(', ') || '-'}`);
            console.log(`  电影目录: ${currentLib.moviesDir || '-'}`);
            console.log(`  电影收藏夹目录: ${currentLib.movieboxDir || '-'}`);
            console.log(`  演员照片目录: ${currentLib.actorPhotoDir || '-'}`);
            console.log(`  新电影小时数: ${settings.library?.newMovieHours || 72}`);
            console.log(`  主题: ${settings.appearance?.theme || 'dark'}`);
            console.log(`  语言: ${settings.appearance?.language || 'zh-CN'}`);
        }
    } catch (error) {
        outputError(`获取配置失败: ${error.message}`);
        throw error;
    }
}

/**
 * Set configuration value
 * @param {object} services - Loaded services
 * @param {string} key - Config key
 * @param {string} value - Config value
 */
async function setConfig(services, key, value) {
    try {
        const { settingsService } = services;

        const keyMap = {
            'moviesDir': 'library.moviesDir',
            'movieboxDir': 'moviebox.movieboxDir',
            'theme': 'appearance.theme',
            'language': 'appearance.language'
        };

        const path = keyMap[key] || key;

        // Parse the path and set value
        const parts = path.split('.');
        const settings = settingsService.getSettings();

        let current = settings;
        for (let i = 0; i < parts.length - 1; i++) {
            if (!current[parts[i]]) {
                current[parts[i]] = {};
            }
            current = current[parts[i]];
        }
        current[parts[parts.length - 1]] = value;

        settingsService.saveSettings(settings);

        outputSuccess('配置已更新', {
            '键': key,
            '值': value
        });
    } catch (error) {
        outputError(`设置配置失败: ${error.message}`);
        throw error;
    }
}

/**
 * Get configuration value
 * @param {object} services - Loaded services
 * @param {string} key - Config key
 */
async function getConfig(services, key) {
    try {
        const { settingsService } = services;
        const settings = settingsService.getSettings();

        const keyMap = {
            'moviesDir': 'library.moviesDir',
            'movieboxDir': 'moviebox.movieboxDir',
            'theme': 'appearance.theme',
            'language': 'appearance.language'
        };

        const path = keyMap[key] || key;
        const parts = path.split('.');

        let value = settings;
        for (const part of parts) {
            value = value?.[part];
        }

        console.log(value !== undefined ? value : '');
    } catch (error) {
        outputError(`获取配置失败: ${error.message}`);
        throw error;
    }
}

/**
 * Reset configuration to defaults
 * @param {object} services - Loaded services
 */
async function resetConfig(services) {
    try {
        const { settingsService } = services;
        settingsService.resetToDefaults();
        outputSuccess('配置已重置为默认值');
    } catch (error) {
        outputError(`重置配置失败: ${error.message}`);
        throw error;
    }
}

module.exports = {
    showConfig,
    setConfig,
    getConfig,
    resetConfig
};

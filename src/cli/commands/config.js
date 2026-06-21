/**
 * Config Commands
 */
const path = require('path');
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
            const dir = currentLib.dir || '';
            console.log(`  当前影视库: ${currentLibraryName}`);
            console.log(`  影视库列表: ${Object.keys(settings.library?.libraries || {}).join(', ') || '-'}`);
            console.log(`  影视库目录: ${dir || '-'}`);
            console.log(`  电影目录: ${dir ? path.join(dir, 'movies') : '-'}`);
            console.log(`  电影收藏夹目录: ${dir ? path.join(dir, 'boxes') : '-'}`);
            console.log(`  演员照片目录: ${dir ? path.join(dir, 'actors') : '-'}`);
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
 * Resolve a config key to a target value within settings, given the current library name.
 * @param {object} settings
 * @param {string} currentLibraryName
 * @param {string} key
 * @returns {{path: string[], exists: boolean}}
 */
function resolveConfigTarget(settings, currentLibraryName, key) {
    if (!key) return { path: [], exists: false };
    if (key === 'dir') {
        return { path: ['library', 'libraries', currentLibraryName, 'dir'], exists: true };
    }
    // 其余特殊键 (theme, language) 直接返回原路径
    const keyMap = {
        'theme': ['appearance', 'theme'],
        'language': ['appearance', 'language']
    };
    if (keyMap[key]) {
        return { path: keyMap[key], exists: true };
    }
    // 其他键当作点号路径处理
    return { path: key.split('.'), exists: true };
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
        const settings = settingsService.getSettings();
        const currentLibraryName = settingsService.getCurrentLibraryName();

        const target = resolveConfigTarget(settings, currentLibraryName, key);
        if (!target.exists) {
            outputError(`未知的配置键: ${key}`);
            return;
        }

        // 沿着路径写入
        let cursor = settings;
        for (let i = 0; i < target.path.length - 1; i++) {
            const seg = target.path[i];
            if (!cursor[seg] || typeof cursor[seg] !== 'object') {
                cursor[seg] = {};
            }
            cursor = cursor[seg];
        }
        cursor[target.path[target.path.length - 1]] = value;

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
        const currentLibraryName = settingsService.getCurrentLibraryName();

        const target = resolveConfigTarget(settings, currentLibraryName, key);
        if (!target.exists) {
            console.log('');
            return;
        }

        let cursor = settings;
        for (const seg of target.path) {
            cursor = cursor?.[seg];
        }

        console.log(cursor !== undefined && cursor !== null ? String(cursor) : '');
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
/**
 * Emby Commands
 * 连接 Emby 媒体服务器：配置、状态、库视图、电影列表/搜索/详情、播放地址
 */
const Table = require('cli-table3');
const {
    outputSuccess,
    outputError
} = require('../utils/output');

const divider = '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';

/**
 * 输出表格（兼容 JSON / table 两种格式）
 * @param {Array} rows - 行数据数组
 * @param {Array} head - 表头
 * @param {Array} colWidths - 列宽
 * @param {object} options - 输出选项 {format}
 * @param {string} [summary] - 汇总文字
 */
function outputTable(rows, head, colWidths, options = {}, summary = '') {
    const format = options.format || 'table';
    if (format === 'json') {
        console.log(JSON.stringify(rows, null, 2));
        return;
    }
    const table = new Table({ head, colWidths });
    rows.forEach(row => table.push(row));
    console.log(table.toString());
    if (summary) {
        console.log(summary);
    }
}

/**
 * 检查 Emby 服务是否可用
 * @param {object} services - 服务集合
 * @returns {boolean} 是否已配置服务器
 */
function isConfigured(services) {
    const { settingsService } = services;
    const config = settingsService.getEmbyConfig();
    return Boolean(config && config.serverUrl);
}

/**
 * 显示 Emby 连接状态与服务器信息
 * @param {object} services - 服务集合
 * @param {object} options - 命令选项
 */
async function embyStatus(services, options = {}) {
    try {
        const { embyAdapterService, settingsService } = services;
        const config = settingsService.getEmbyConfig();

        if (options.format === 'json') {
            const result = await embyAdapterService.testConnection();
            console.log(JSON.stringify({
                configured: isConfigured(services),
                serverUrl: config.serverUrl || '',
                authMode: config.apiKey ? 'api-key' : (config.username ? 'user' : 'none'),
                ...result
            }, null, 2));
            return;
        }

        console.log(divider);
        console.log('  Emby 连接状态');
        console.log(divider);
        console.log(`  服务器地址: ${config.serverUrl || '-'}`);
        console.log(`  认证方式:   ${config.apiKey ? 'API Key' : (config.username ? '用户名/密码' : '未配置')}`);
        console.log(`  启用:       ${config.enabled ? '是' : '否'}`);
        console.log(`  默认库视图: ${config.libraryId || '-'}`);

        if (!isConfigured(services)) {
            console.log(`  连接:       ✗ 未配置服务器地址`);
            console.log(`  提示:       使用 "emby config set serverUrl <地址>" 配置`);
            return;
        }

        const result = await embyAdapterService.testConnection();
        if (result.reachable) {
            console.log(`  连接:       ✓ 已连接`);
            console.log(`  服务器名称: ${result.serverName || '-'}`);
            console.log(`  服务器版本: ${result.version || '-'}`);
        } else {
            console.log(`  连接:       ✗ ${result.error || '无法连接'}`);
        }
        console.log(divider);
    } catch (error) {
        outputError(`获取 Emby 状态失败: ${error.message}`);
        throw error;
    }
}

/**
 * 显示 Emby 配置
 * @param {object} services - 服务集合
 * @param {object} options - 命令选项
 */
async function embyShowConfig(services, options = {}) {
    try {
        const { settingsService } = services;
        const config = settingsService.getEmbyConfig();

        if (options.format === 'json') {
            console.log(JSON.stringify(config, null, 2));
            return;
        }

        console.log(divider);
        console.log('  Emby 配置');
        console.log(divider);
        console.log(`  启用:           ${config.enabled ? '是' : '否'}`);
        console.log(`  服务器地址:     ${config.serverUrl || '-'}`);
        console.log(`  API Key:       ${config.apiKey ? '已配置' : '-'}`);
        console.log(`  用户名:         ${config.username || '-'}`);
        console.log(`  语言:           ${config.language || 'zh-CN'}`);
        console.log(`  用户ID:         ${config.userId || '-'}`);
        console.log(`  默认库视图:     ${config.libraryId || '-'}`);
        console.log(divider);
    } catch (error) {
        outputError(`获取 Emby 配置失败: ${error.message}`);
        throw error;
    }
}

/**
 * 设置 Emby 配置项
 * 支持键：enabled / serverUrl / apiKey / username / password / language / libraryId
 * @param {object} services - 服务集合
 * @param {string} key - 配置键
 * @param {string} value - 配置值
 */
async function embySetConfig(services, key, value) {
    try {
        const { settingsService } = services;
        const config = settingsService.getEmbyConfig();

        const normalized = String(value).trim();
        let parsed = normalized;
        if (key === 'enabled') {
            parsed = normalized === 'true' || normalized === '1' || normalized === 'yes';
        }

        config[key] = parsed;
        settingsService.setEmbyConfig(config);

        outputSuccess('Emby 配置已更新', {
            [key]: parsed
        });
    } catch (error) {
        outputError(`设置 Emby 配置失败: ${error.message}`);
        throw error;
    }
}

/**
 * 列出 Emby 库视图
 * @param {object} services - 服务集合
 * @param {object} options - 命令选项
 */
async function embyViews(services, options = {}) {
    try {
        const { embyAdapterService } = services;
        if (!isConfigured(services)) {
            outputError('Emby 服务器未配置', '请先执行 "emby config set serverUrl <地址>"');
            return;
        }
        const views = await embyAdapterService.getViews();

        if (options.format === 'json') {
            console.log(JSON.stringify(views, null, 2));
            return;
        }

        const table = new Table({
            head: ['ID', '名称', '类型'],
            colWidths: [36, 30, 15]
        });
        views.forEach(view => {
            table.push([view.id, view.name, view.collectionType || '-']);
        });
        console.log(table.toString());
        console.log(`\n共 ${views.length} 个库视图`);
    } catch (error) {
        outputError(`获取 Emby 库视图失败: ${error.message}`);
        throw error;
    }
}

/**
 * 列出 Emby 电影
 * @param {object} services - 服务集合
 * @param {object} options - 命令选项
 */
async function embyList(services, options = {}) {
    try {
        const { embyAdapterService } = services;
        if (!isConfigured(services)) {
            outputError('Emby 服务器未配置', '请先执行 "emby config set serverUrl <地址>"');
            return;
        }

        const sortParts = String(options.sort || 'name').split('-');
        const sortBy = sortParts[0] || 'name';
        const sortOrder = sortParts[1] || 'asc';

        const result = await embyAdapterService.getMovies({
            libraryId: options.library || '',
            keyword: options.search || '',
            startIndex: 0,
            limit: parseInt(options.limit || '60', 10),
            sortBy,
            sortOrder
        });

        const { items, total } = result;

        if (options.format === 'json') {
            console.log(JSON.stringify(items, null, 2));
            return;
        }

        const table = new Table({
            head: ['ID', '名称', '年份', '评分', '片长(分)', '类型'],
            colWidths: [36, 30, 6, 6, 8, 20]
        });
        items.forEach(item => {
            table.push([
                item.id,
                item.title || '-',
                item.year || '-',
                item.rating ? Number(item.rating).toFixed(1) : '-',
                item.runtime || '-',
                (item.genres || []).slice(0, 3).join(', ') || '-'
            ]);
        });
        console.log(table.toString());
        console.log(`\n共 ${items.length} / ${total} 部电影`);
    } catch (error) {
        outputError(`获取 Emby 电影列表失败: ${error.message}`);
        throw error;
    }
}

/**
 * 显示 Emby 电影详情
 * @param {object} services - 服务集合
 * @param {string} itemId - Emby Item ID
 * @param {object} options - 命令选项
 */
async function embyShow(services, itemId, options = {}) {
    try {
        const { embyAdapterService } = services;
        if (!isConfigured(services)) {
            outputError('Emby 服务器未配置', '请先执行 "emby config set serverUrl <地址>"');
            return;
        }
        const movie = await embyAdapterService.getMovieDetail(itemId);

        if (options.format === 'json') {
            console.log(JSON.stringify(movie, null, 2));
            return;
        }

        console.log(divider);
        console.log('  Emby 电影详情');
        console.log(divider);
        console.log(`  ID:           ${movie.id || '-'}`);
        console.log(`  名称:         ${movie.title || '-'}`);
        console.log(`  年份:         ${movie.year || '-'}`);
        console.log(`  评分:         ${movie.rating ? Number(movie.rating).toFixed(1) : '-'}`);
        console.log(`  分级:         ${movie.officialRating || '-'}`);
        console.log(`  片长:         ${movie.runtime ? `${movie.runtime} 分钟` : '-'}`);
        console.log(`  类型:         ${(movie.genres || []).join(', ') || '-'}`);
        console.log(`  制片公司:     ${(movie.studios || []).join(', ') || '-'}`);
        console.log(`  导演:         ${(movie.directors || []).join(', ') || '-'}`);
        console.log(`  演员:         ${(movie.actors || []).map(a => a.name).join(', ') || '-'}`);
        console.log(`  媒体源:       ${movie.mediaSourceId || '-'}`);
        console.log(`  海报:         ${movie.posterUrl || '-'}`);
        console.log(`  简介:         ${movie.overview || '-'}`);
        console.log(divider);
    } catch (error) {
        outputError(`获取 Emby 电影详情失败: ${error.message}`);
        throw error;
    }
}

/**
 * 输出 Emby 直连播放地址
 * @param {object} services - 服务集合
 * @param {string} itemId - Emby Item ID
 * @param {object} options - 命令选项
 */
async function embyPlay(services, itemId, options = {}) {
    try {
        const { embyAdapterService } = services;
        if (!isConfigured(services)) {
            outputError('Emby 服务器未配置', '请先执行 "emby config set serverUrl <地址>"');
            return;
        }
        const url = embyAdapterService.getPlaybackUrl(itemId, options.mediaSourceId || null);
        if (!url) {
            outputError('无法生成播放地址');
            return;
        }

        if (options.format === 'json') {
            console.log(JSON.stringify({ itemId, url }, null, 2));
            return;
        }

        console.log(divider);
        console.log('  Emby 直连播放地址');
        console.log(divider);
        console.log(`  ${url}`);
        console.log(divider);
        console.log('  提示: 可用系统播放器 / PotPlayer / 浏览器打开该地址');
        console.log('        （GUI 内置播放器请在 Emby 影视库窗口中点击播放）');
    } catch (error) {
        outputError(`获取 Emby 播放地址失败: ${error.message}`);
        throw error;
    }
}

module.exports = {
    embyStatus,
    embyShowConfig,
    embySetConfig,
    embyViews,
    embyList,
    embyShow,
    embyPlay,
    isConfigured
};

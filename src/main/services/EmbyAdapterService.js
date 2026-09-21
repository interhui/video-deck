/**
 * Emby 电影适配服务
 * 用于连接 Emby 媒体服务器，通过 Emby REST API 获取电影信息、海报信息，并支持播放。
 *
 * 参考：https://dev.emby.media/doc/restapi/index.html
 * 认证支持两种方式：
 *   1. API Key（优先）：Dashboard → 高级 → API 密钥，所有请求带 ?api_key=<Key>
 *   2. 用户名/密码：调用 POST /emby/Users/AuthenticateByName 获取 AccessToken，以 ?api_key=<Token> 使用
 *
 * 说明：Emby 服务器通常在局域网内，因此本服务直连服务器，不经过全局代理。
 */
const http = require('http');
const https = require('https');

/** 登录缓存有效期（毫秒）：24 小时 */
const AUTH_CACHE_TTL = 24 * 60 * 60 * 1000;

/** API 前缀 */
const API_PREFIX = '/emby';

class EmbyAdapterService {
    /**
     * @param {object} settingsService - 配置服务（SettingsService）
     */
    constructor(settingsService) {
        this.settingsService = settingsService;
        // 内存缓存认证结果 { userId, accessToken, expiresAt }
        this.authCache = null;
    }

    // -------------------------------------------------------------------------
    // 配置
    // -------------------------------------------------------------------------

    /**
     * 获取 Emby 配置
     * @returns {object} settings.emby
     */
    getConfig() {
        return this.settingsService.getEmbyConfig();
    }

    /**
     * 保存 Emby 配置
     * @param {object} config - 待合并的配置字段
     */
    setConfig(config) {
        this.settingsService.setEmbyConfig(config);
        // 配置变更后清空登录缓存
        this.authCache = null;
    }

    /**
     * 归一化服务器地址
     * 去除末尾斜杠，缺省协议时自动补 http://
     * @param {string} serverUrl - 原始地址
     * @returns {string} 归一化地址
     */
    normalizeServerUrl(serverUrl) {
        if (!serverUrl || typeof serverUrl !== 'string') {
            return '';
        }
        let url = serverUrl.trim();
        if (!url) {
            return '';
        }
        if (!/^https?:\/\//i.test(url)) {
            url = `http://${url}`;
        }
        return url.replace(/\/+$/, '');
    }

    // -------------------------------------------------------------------------
    // 认证
    // -------------------------------------------------------------------------

    /**
     * 构建认证方案
     * 优先级：API Key > 用户名/密码登录（登录结果缓存 24 小时）
     * @returns {Promise<{apiKey: string, userId: string}>}
     */
    async ensureAuthenticated() {
        const config = this.getConfig();
        const serverUrl = this.normalizeServerUrl(config.serverUrl);

        if (!serverUrl) {
            throw new Error('Emby 服务器地址未配置');
        }

        // 方式一：API Key
        if (config.apiKey) {
            let userId = config.userId || '';
            if (!userId) {
                // 通过 API Key 拉取用户列表，取第一个（或与配置用户名匹配的）用户
                const users = await this._getUsers();
                const matched = config.username
                    ? users.find(u => u.Name === config.username)
                    : null;
                userId = (matched || users[0] || {}).Id || '';
                if (userId && !config.userId) {
                    this.setConfig({ userId });
                }
            }
            return { apiKey: config.apiKey, userId };
        }

        // 方式二：用户名/密码登录
        if (config.username && config.password) {
            if (this.authCache && this.authCache.expiresAt > Date.now()) {
                return { apiKey: this.authCache.accessToken, userId: this.authCache.userId };
            }
            const auth = await this._authenticateByName(config.username, config.password);
            this.authCache = {
                accessToken: auth.accessToken,
                userId: auth.userId,
                expiresAt: Date.now() + AUTH_CACHE_TTL
            };
            if (!config.userId && auth.userId) {
                this.setConfig({ userId: auth.userId });
            }
            return { apiKey: auth.accessToken, userId: auth.userId };
        }

        throw new Error('Emby 未配置 API Key 或用户名/密码');
    }

    /**
     * 调用 AuthenticateByName 登录
     * @param {string} username - 用户名
     * @param {string} password - 明文密码
     * @returns {Promise<{userId: string, accessToken: string}>}
     */
    async _authenticateByName(username, password) {
        const config = this.getConfig();
        const serverUrl = this.normalizeServerUrl(config.serverUrl);
        const headers = {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'X-Emby-Authorization': this.buildEmbyAuthorizationHeader()
        };
        const body = {
            Username: username,
            Pw: password
        };
        const data = await this._request(serverUrl, 'POST', '/Users/AuthenticateByName', {}, body, headers);
        if (!data || !data.AccessToken || !data.User) {
            throw new Error('Emby 登录失败：响应缺少 AccessToken');
        }
        return { userId: data.User.Id, accessToken: data.AccessToken };
    }

    /**
     * 获取用户列表（需要 API Key）
     * @returns {Promise<Array>} 用户列表 [{Id, Name}]
     */
    async _getUsers() {
        const config = this.getConfig();
        const serverUrl = this.normalizeServerUrl(config.serverUrl);
        const data = await this._request(serverUrl, 'GET', '/Users', {}, null, {
            'Accept': 'application/json'
        }, config.apiKey);
        return Array.isArray(data) ? data : [];
    }

    /**
     * 构造 X-Emby-Authorization 头
     * @returns {string}
     */
    buildEmbyAuthorizationHeader() {
        const config = this.getConfig();
        const deviceName = config.deviceName || 'video-deck';
        const clientName = config.clientName || 'video-deck';
        const deviceId = config.deviceId || 'video-deck-device';
        return `MediaBrowser Client="${clientName}", Device="${deviceName}", DeviceId="${deviceId}", Version="1.0.0"`;
    }

    // -------------------------------------------------------------------------
    // HTTP 请求
    // -------------------------------------------------------------------------

    /**
     * 发起 Emby REST 请求
     * 直连服务器，不经过全局代理（Emby 服务器通常在局域网内）。
     * @param {string} serverUrl - 服务器地址（归一化后）
     * @param {string} method - HTTP 方法（GET/POST）
     * @param {string} apiPath - API 路径（以 / 开头，自动补 /emby 前缀）
     * @param {object} [query] - 查询参数
     * @param {object} [body] - 请求体（JSON）
     * @param {object} [headers] - 自定义请求头
     * @param {string} [apiKey] - 显式 API Key（覆盖从配置解析）
     * @param {number} [timeout] - 超时（毫秒）
     * @returns {Promise<object>} 解析后的 JSON
     */
    async _request(serverUrl, method, apiPath, query = {}, body = null, headers = {}, apiKey = null, timeout = 15000) {
        return new Promise((resolve, reject) => {
            let urlObj;
            try {
                urlObj = new URL(serverUrl);
            } catch (error) {
                reject(new Error(`Emby 服务器地址无效: ${serverUrl}`));
                return;
            }

            const protocol = urlObj.protocol === 'https:' ? https : http;

            // 拼接路径与查询参数
            const params = new URLSearchParams();
            Object.entries(query).forEach(([key, value]) => {
                if (value !== undefined && value !== null && value !== '') {
                    params.append(key, String(value));
                }
            });
            // 认证参数：显式 apiKey > 从配置解析
            let authApiKey = apiKey;
            let userId = '';
            if (!authApiKey) {
                const config = this.getConfig();
                authApiKey = config.apiKey || config.accessToken || '';
            }
            if (authApiKey) {
                params.append('api_key', authApiKey);
            }
            const queryString = params.toString();
            const pathname = `${API_PREFIX}${apiPath}`;
            const path = queryString ? `${pathname}?${queryString}` : pathname;

            const requestHeaders = {
                'Accept': 'application/json',
                ...headers
            };

            let payload = null;
            if (body !== null && body !== undefined) {
                payload = JSON.stringify(body);
                requestHeaders['Content-Type'] = requestHeaders['Content-Type'] || 'application/json';
                requestHeaders['Content-Length'] = Buffer.byteLength(payload);
            }

            const requestOptions = {
                hostname: urlObj.hostname,
                port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
                path,
                method: method.toUpperCase(),
                headers: requestHeaders
            };

            const req = protocol.request(requestOptions, (res) => {
                const chunks = [];
                res.on('data', (chunk) => chunks.push(chunk));
                res.on('end', () => {
                    const raw = Buffer.concat(chunks).toString('utf-8');
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        if (!raw) {
                            resolve(null);
                            return;
                        }
                        try {
                            resolve(JSON.parse(raw));
                        } catch (error) {
                            reject(new Error(`Emby 响应解析失败: ${error.message}`));
                        }
                    } else {
                        reject(new Error(`Emby HTTP ${res.statusCode}: ${raw.slice(0, 300)}`));
                    }
                });
            });

            req.on('error', (error) => reject(error));
            req.setTimeout(timeout, () => {
                req.destroy();
                reject(new Error('Emby 请求超时'));
            });

            if (payload !== null) {
                req.write(payload);
            }
            req.end();
        });
    }

    // -------------------------------------------------------------------------
    // 连通测试 / 服务器信息
    // -------------------------------------------------------------------------

    /**
     * 测试服务器连接（无需认证）
     * @returns {Promise<{reachable: boolean, serverName: string, version: string, error?: string}>}
     */
    async testConnection() {
        const config = this.getConfig();
        const serverUrl = this.normalizeServerUrl(config.serverUrl);
        if (!serverUrl) {
            return { reachable: false, serverName: '', version: '', error: 'Emby 服务器地址未配置' };
        }
        try {
            const info = await this._request(serverUrl, 'GET', '/System/Info/Public', {}, null, {
                'Accept': 'application/json'
            });
            return {
                reachable: true,
                serverName: (info && info.ServerName) || '',
                version: (info && info.Version) || '',
                systemId: (info && info.Id) || ''
            };
        } catch (error) {
            return {
                reachable: false,
                serverName: '',
                version: '',
                error: error.message || String(error)
            };
        }
    }

    /**
     * 验证认证是否有效（可选，供"测试连接"增强）
     * @returns {Promise<boolean>}
     */
    async testAuth() {
        try {
            const { userId } = await this.ensureAuthenticated();
            return Boolean(userId);
        } catch (error) {
            return false;
        }
    }

    // -------------------------------------------------------------------------
    // 库视图
    // -------------------------------------------------------------------------

    /**
     * 获取库视图列表
     * @returns {Promise<Array>} [{id, name, collectionType}]
     */
    async getViews() {
        const { userId } = await this.ensureAuthenticated();
        const data = await this._request(this._getServerUrl(), 'GET', `/Users/${userId}/Views`, {}, null, {
            'Accept': 'application/json'
        });
        const items = (data && data.Items) || [];
        return items.map(view => ({
            id: view.Id,
            name: view.Name,
            collectionType: view.CollectionType || ''
        }));
    }

    // -------------------------------------------------------------------------
    // 电影列表 / 搜索 / 详情
    // -------------------------------------------------------------------------

    /**
     * 浏览 / 搜索电影
     * @param {object} [options]
     * @param {string} [options.libraryId] - 库视图 ID（不传则全部）
     * @param {string} [options.keyword] - 搜索关键字
     * @param {number} [options.startIndex] - 分页起始
     * @param {number} [options.limit] - 每页数量
     * @param {string} [options.sortBy] - 排序字段（name/year/rating/dateAdded）
     * @param {string} [options.sortOrder] - 排序方向 asc/desc
     * @returns {Promise<{items: Array, total: number}>}
     */
    async getMovies(options = {}) {
        const {
            libraryId = '',
            keyword = '',
            startIndex = 0,
            limit = 60,
            sortBy = '',
            sortOrder = 'asc'
        } = options;

        const query = {
            Recursive: true,
            IncludeItemTypes: 'Movie',
            ImageTypeLimit: 1,
            StartIndex: startIndex,
            Limit: limit,
            Fields: this.getMovieFields()
        };

        if (libraryId) {
            query.ParentId = libraryId;
        }
        if (keyword) {
            query.SearchTerm = keyword;
        }

        const sortConfig = this.resolveSort(sortBy, sortOrder);
        if (sortConfig) {
            query.SortBy = sortConfig.by;
            query.SortOrder = sortConfig.order;
        }

        const { userId } = await this.ensureAuthenticated();
        const data = await this._request(this._getServerUrl(), 'GET', `/Users/${userId}/Items`, query, null, {
            'Accept': 'application/json'
        });

        const items = ((data && data.Items) || []).map(item => this.mapItem(item));
        return {
            items,
            total: (data && data.TotalRecordCount) || items.length
        };
    }

    /**
     * 获取单部电影详情
     * @param {string} itemId - Emby Item ID
     * @returns {Promise<object>} 映射后的电影详情
     */
    async getMovieDetail(itemId) {
        if (!itemId) {
            throw new Error('Item ID 不能为空');
        }
        const { userId } = await this.ensureAuthenticated();
        const query = { Fields: this.getMovieFields() };
        const data = await this._request(this._getServerUrl(), 'GET', `/Users/${userId}/Items/${encodeURIComponent(itemId)}`, query, null, {
            'Accept': 'application/json'
        });
        return this.mapItem(data || {});
    }

    /**
     * Emby Items 接口需要返回的字段
     * @returns {string}
     */
    getMovieFields() {
        return [
            'Overview',
            'Genres',
            'People',
            'ProductionYear',
            'PremiereDate',
            'CommunityRating',
            'CriticRating',
            'OfficialRating',
            'Studios',
            'ProductionLocations',
            'RunTimeTicks',
            'MediaSources',
            'DateCreated',
            'Taglines'
        ].join(',');
    }

    /**
     * 将 Emby Item 映射为 video-deck 统一结构
     * @param {object} item - Emby Item
     * @returns {object}
     */
    mapItem(item) {
        if (!item || !item.Id) {
            return null;
        }
        const posterTag = item.ImageTags && item.ImageTags.Primary;
        const people = item.People || [];
        return {
            id: item.Id,
            title: item.Name || '',
            overview: item.Overview || '',
            tagline: item.Taglines && item.Taglines[0] ? item.Taglines[0] : '',
            year: item.ProductionYear
                || (item.PremiereDate ? new Date(item.PremiereDate).getFullYear() : ''),
            premierDate: item.PremiereDate || '',
            rating: (typeof item.CommunityRating === 'number') ? item.CommunityRating : 0,
            officialRating: item.OfficialRating || '',
            genres: item.Genres || [],
            studios: (item.Studios || []).map(s => s.Name).filter(Boolean),
            productionLocations: item.ProductionLocations || [],
            runtime: item.RunTimeTicks ? Math.round(item.RunTimeTicks / 10000000) : 0,
            posterUrl: posterTag ? this.getImageUrl(item.Id, posterTag, 400) : null,
            backdropUrl: null,
            actors: people
                .filter(p => p.Type === 'Actor')
                .map(p => ({
                    id: p.Id,
                    name: p.Name || '',
                    role: p.Role || '',
                    profileUrl: p.PrimaryImageTag
                        ? this.getImageUrl(p.Id, p.PrimaryImageTag, 200)
                        : null
                })),
            directors: people
                .filter(p => p.Type === 'Director')
                .map(p => p.Name)
                .filter(Boolean),
            mediaSourceId: (item.MediaSources && item.MediaSources[0])
                ? item.MediaSources[0].Id
                : null,
            container: (item.MediaSources && item.MediaSources[0])
                ? (item.MediaSources[0].Container || '')
                : '',
            dateCreated: item.DateCreated || ''
        };
    }

    // -------------------------------------------------------------------------
    // 排序映射
    // -------------------------------------------------------------------------

    /**
     * 将 video-deck 排序字段映射为 Emby SortBy/SortOrder
     * @param {string} sortBy - name/year/rating/dateAdded
     * @param {string} sortOrder - asc/desc
     * @returns {{by: string, order: string}|null}
     */
    resolveSort(sortBy, sortOrder) {
        const order = String(sortOrder || 'asc').toLowerCase() === 'desc' ? 'Descending' : 'Ascending';
        const map = {
            'name': 'SortName',
            'year': 'ProductionYear',
            'rating': 'CommunityRating',
            'dateAdded': 'DateCreated',
            'premiere': 'PremiereDate'
        };
        const by = map[String(sortBy || '').toLowerCase()];
        if (!by) {
            return null;
        }
        return { by, order };
    }

    // -------------------------------------------------------------------------
    // 海报 / 播放地址
    // -------------------------------------------------------------------------

    /**
     * 构造海报图片 URL
     * @param {string} itemId - Item ID（电影或人物）
     * @param {string} tag - 图片标签（ImageTags.Primary）
     * @param {number} [maxWidth] - 最大宽度
     * @returns {string} 图片 URL（依赖认证 api_key）
     */
    getImageUrl(itemId, tag, maxWidth = 400) {
        const serverUrl = this._getServerUrl();
        const config = this.getConfig();
        const apiKey = config.apiKey || config.accessToken || '';
        if (!serverUrl || !itemId) {
            return null;
        }
        const params = new URLSearchParams();
        if (maxWidth) {
            params.append('maxWidth', String(maxWidth));
        }
        if (tag) {
            params.append('tag', tag);
        }
        if (apiKey) {
            params.append('api_key', apiKey);
        }
        return `${serverUrl}${API_PREFIX}/Items/${encodeURIComponent(itemId)}/Images/Primary?${params.toString()}`;
    }

    /**
     * 构造直连播放 URL（Static=true 返回原始文件，HTML5 可直接播放）
     * @param {string} itemId - Emby Item ID
     * @param {string} [mediaSourceId] - 媒体源 ID（缺省用 itemId）
     * @returns {string} 直连播放 URL
     */
    getPlaybackUrl(itemId, mediaSourceId) {
        const serverUrl = this._getServerUrl();
        const config = this.getConfig();
        const apiKey = config.apiKey || config.accessToken || '';
        if (!serverUrl || !itemId) {
            return null;
        }
        const params = new URLSearchParams({
            Static: true,
            MediaSourceId: mediaSourceId || itemId
        });
        if (apiKey) {
            params.append('api_key', apiKey);
        }
        return `${serverUrl}${API_PREFIX}/Videos/${encodeURIComponent(itemId)}/stream?${params.toString()}`;
    }

    /**
     * 获取归一化后的服务器地址
     * @returns {string}
     */
    _getServerUrl() {
        return this.normalizeServerUrl(this.getConfig().serverUrl);
    }
}

module.exports = EmbyAdapterService;

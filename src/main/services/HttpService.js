/**
 * HTTP服务
 * 基于Node.js原生http模块，对外提供REST API接口
 * 路由设计遵循 design/api-design.md
 *
 * 主要职责：
 *   1. 启动/停止HTTP监听
 *   2. 根据URL与方法路由到对应的处理函数
 *   3. 提供统一的响应封装（code/message/data/timestamp）
 *   4. 在控制器中调用现有Service完成业务逻辑
 *
 * 设计原则：
 *   - 不引入任何第三方依赖，仅使用Node.js原生http/url模块
 *   - 不入侵其他Service，HttpService只做"协议适配层"
 *   - 路由表集中维护，便于扩展
 */
const http = require('http');
const url = require('url');

// API统一前缀
const API_PREFIX = '/api/v1';

// 响应码常量
const RESPONSE_CODE = {
    SUCCESS: 0,
    BAD_REQUEST: 40001,
    UNAUTHORIZED: 40101,
    FORBIDDEN: 40301,
    NOT_FOUND: 40401,
    CONFLICT: 40901,
    UNPROCESSABLE: 42201,
    INTERNAL_ERROR: 50000,
    SERVICE_UNAVAILABLE: 50301
};

// HTTP状态码映射
const HTTP_STATUS = {
    [RESPONSE_CODE.SUCCESS]: 200,
    [RESPONSE_CODE.BAD_REQUEST]: 400,
    [RESPONSE_CODE.UNAUTHORIZED]: 401,
    [RESPONSE_CODE.FORBIDDEN]: 403,
    [RESPONSE_CODE.NOT_FOUND]: 404,
    [RESPONSE_CODE.CONFLICT]: 409,
    [RESPONSE_CODE.UNPROCESSABLE]: 422,
    [RESPONSE_CODE.INTERNAL_ERROR]: 500,
    [RESPONSE_CODE.SERVICE_UNAVAILABLE]: 503
};

class HttpService {
    /**
     * 构造函数
     * @param {object} options - 依赖注入的服务集合
     * @param {object} options.settingsService - 配置服务
     * @param {object} [options.movieService] - 电影服务
     * @param {object} [options.boxService] - 收藏夹服务
     * @param {object} [options.categoryService] - 分类服务
     * @param {object} [options.tagService] - 标签服务
     * @param {object} [options.actorService] - 演员服务
     * @param {object} [options.movieHistoryService] - 播放历史服务
     */
    constructor(options = {}) {
        this.settingsService = options.settingsService || null;
        this.movieService = options.movieService || null;
        this.boxService = options.boxService || null;
        this.categoryService = options.categoryService || null;
        this.tagService = options.tagService || null;
        this.actorService = options.actorService || null;
        this.movieHistoryService = options.movieHistoryService || null;

        // HTTP服务器实例
        this.server = null;
        // 当前监听信息（启动成功后填充）
        this.listenInfo = null;
        // 路由表
        this.routes = [];

        // 注册路由
        this.registerRoutes();
    }

    // -------------------------------------------------------------------------
    // 生命周期管理
    // -------------------------------------------------------------------------

    /**
     * 根据settings配置启动HTTP服务
     * 若enabled=false或未配置settingsService，则不启动
     * @returns {Promise<object|null>} 启动信息（host/port），若未启动返回null
     */
    async start() {
        if (!this.settingsService) {
            return null;
        }

        const httpConfig = this.settingsService.getHttpConfig();
        if (!httpConfig.enabled) {
            console.info('[HttpService] HTTP disabled');
            return null;
        }

        return this.startWith(httpConfig.listenAddress, httpConfig.listenPort);
    }

    /**
     * 在指定地址/端口启动HTTP服务
     * @param {string} host - 监听地址
     * @param {number} port - 监听端口
     * @returns {Promise<object>} 启动信息
     */
    startWith(host, port) {
        return new Promise((resolve, reject) => {
            if (this.server) {
                reject(new Error('HTTP enabled'));
                return;
            }

            this.server = http.createServer((req, res) => this.handleRequest(req, res));

            this.server.once('error', (error) => {
                this.server = null;
                this.listenInfo = null;
                reject(error);
            });

            this.server.listen(port, host, () => {
                // 监听端口0时，操作系统会随机分配端口，必须通过server.address()读取真实端口
                const actual = this.server.address();
                const actualPort = (actual && typeof actual === 'object') ? actual.port : port;
                this.listenInfo = { host, port: actualPort };
                console.info(`[HttpService] HTTP Starts At http://${host}:${actualPort}`);
                resolve(this.listenInfo);
            });
        });
    }

    /**
     * 停止HTTP服务
     * @returns {Promise<void>}
     */
    stop() {
        return new Promise((resolve) => {
            if (!this.server) {
                resolve();
                return;
            }

            this.server.close(() => {
                this.server = null;
                this.listenInfo = null;
                console.info('[HttpService] HTTP Stops');
                resolve();
            });
        });
    }

    /**
     * 重启HTTP服务
     * 通常在settings.http变更后调用
     * @returns {Promise<object|null>}
     */
    async restart() {
        await this.stop();
        return this.start();
    }

    /**
     * 当前是否正在监听
     * @returns {boolean}
     */
    isRunning() {
        return this.server !== null;
    }

    /**
     * 获取当前监听信息
     * @returns {object|null} {host, port} 或 null
     */
    getListenInfo() {
        return this.listenInfo;
    }

    // -------------------------------------------------------------------------
    // 路由注册
    // -------------------------------------------------------------------------

    /**
     * 注册所有路由
     * 路由格式：{ method, pattern, handler }
     * pattern中的 :name 段会被作为参数捕获到 params
     */
    registerRoutes() {
        // 系统/设置
        this.addRoute('GET', '/system/info', (ctx) => this.handleSystemInfo(ctx));
        this.addRoute('GET', '/system/cache-status', (ctx) => this.handleSystemCacheStatus(ctx));

        // 电影
        this.addRoute('GET', '/movies', (ctx) => this.handleMoviesList(ctx));
        this.addRoute('GET', '/movies/search', (ctx) => this.handleMoviesSearch(ctx));
        this.addRoute('GET', '/movies/:id', (ctx) => this.handleMovieDetail(ctx));

        // 分类
        this.addRoute('GET', '/categories', (ctx) => this.handleCategoriesList(ctx));
        this.addRoute('GET', '/categories/:id', (ctx) => this.handleCategoryDetail(ctx));
        this.addRoute('GET', '/categories/:id/movies', (ctx) => this.handleCategoryMovies(ctx));

        // 标签
        this.addRoute('GET', '/tags', (ctx) => this.handleTagsList(ctx));
        this.addRoute('GET', '/tags/:id', (ctx) => this.handleTagDetail(ctx));
        this.addRoute('GET', '/tags/:id/movies', (ctx) => this.handleTagMovies(ctx));

        // 演员
        this.addRoute('GET', '/actors', (ctx) => this.handleActorsList(ctx));
        this.addRoute('GET', '/actors/:id', (ctx) => this.handleActorDetail(ctx));

        // 收藏夹
        this.addRoute('GET', '/boxes', (ctx) => this.handleBoxesList(ctx));
        this.addRoute('GET', '/boxes/:name', (ctx) => this.handleBoxDetail(ctx));

        // 播放历史
        this.addRoute('GET', '/history', (ctx) => this.handleHistoryList(ctx));
        this.addRoute('GET', '/history/dates', (ctx) => this.handleHistoryDates(ctx));

        // 库统计
        this.addRoute('GET', '/stats', (ctx) => this.handleStats(ctx));
        this.addRoute('GET', '/stats/categories', (ctx) => this.handleStatsCategories(ctx));
    }

    /**
     * 添加单个路由
     * @param {string} method - HTTP方法
     * @param {string} pattern - 路径模式（如 /movies/:id），不含API_PREFIX
     * @param {Function} handler - 处理函数
     */
    addRoute(method, pattern, handler) {
        const segments = pattern.split('/').filter(Boolean);
        const paramNames = [];
        const regexParts = segments.map(seg => {
            if (seg.startsWith(':')) {
                paramNames.push(seg.substring(1));
                return '([^/]+)';
            }
            return seg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        });
        const regex = new RegExp(`^${API_PREFIX}/${regexParts.join('/')}/?$`);

        this.routes.push({
            method: method.toUpperCase(),
            pattern,
            regex,
            paramNames,
            handler
        });
    }

    // -------------------------------------------------------------------------
    // 请求处理与分发
    // -------------------------------------------------------------------------

    /**
     * 处理一个HTTP请求
     * @param {http.IncomingMessage} req
     * @param {http.ServerResponse} res
     */
    async handleRequest(req, res) {
        // 设置CORS头（默认允许跨域访问，便于客户端调试）
        this.applyCorsHeaders(res);

        // OPTIONS预检请求直接返回204
        if (req.method === 'OPTIONS') {
            res.writeHead(204);
            res.end();
            return;
        }

        try {
            const parsedUrl = url.parse(req.url, true);
            const pathname = parsedUrl.pathname || '';
            const query = parsedUrl.query || {};

            const matched = this.matchRoute(req.method, pathname);
            if (!matched) {
                this.sendError(res, RESPONSE_CODE.NOT_FOUND, `路由不存在: ${req.method} ${pathname}`);
                return;
            }

            // 解析请求体
            const body = await this.parseRequestBody(req);

            // 构造上下文
            const ctx = {
                req,
                res,
                method: req.method,
                pathname,
                query,
                params: matched.params,
                body
            };

            // 执行handler
            await matched.handler(ctx);
        } catch (error) {
            console.error('[HttpService] Request Error:', error.message || error);
            this.sendError(res, RESPONSE_CODE.INTERNAL_ERROR, error.message || '服务器内部错误');
        }
    }

    /**
     * 应用CORS响应头
     * @param {http.ServerResponse} res
     */
    applyCorsHeaders(res) {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    }

    /**
     * 在路由表中查找匹配项
     * @param {string} method - HTTP方法
     * @param {string} pathname - 请求路径
     * @returns {{handler:Function, params:object}|null}
     */
    matchRoute(method, pathname) {
        for (const route of this.routes) {
            if (route.method !== method.toUpperCase()) continue;

            const match = route.regex.exec(pathname);
            if (!match) continue;

            const params = {};
            route.paramNames.forEach((name, index) => {
                params[name] = decodeURIComponent(match[index + 1]);
            });

            return { handler: route.handler, params };
        }
        return null;
    }

    /**
     * 读取请求体并按JSON解析
     * 对于GET请求或空Body，返回null
     * @param {http.IncomingMessage} req
     * @returns {Promise<object|null>}
     */
    parseRequestBody(req) {
        return new Promise((resolve, reject) => {
            if (req.method === 'GET' || req.method === 'DELETE' || req.method === 'OPTIONS') {
                resolve(null);
                return;
            }

            let raw = '';
            req.on('data', (chunk) => {
                raw += chunk.toString();
                // 限制Body最大1MB，避免大请求耗尽内存
                if (raw.length > 1024 * 1024) {
                    reject(new Error('请求体过大'));
                    req.destroy();
                }
            });
            req.on('end', () => {
                if (!raw) {
                    resolve(null);
                    return;
                }
                try {
                    resolve(JSON.parse(raw));
                } catch (error) {
                    reject(new Error('请求体不是合法的JSON'));
                }
            });
            req.on('error', reject);
        });
    }

    // -------------------------------------------------------------------------
    // 响应封装
    // -------------------------------------------------------------------------

    /**
     * 发送成功响应
     * @param {http.ServerResponse} res
     * @param {*} data - 业务数据
     */
    sendSuccess(res, data) {
        this.sendJson(res, 200, {
            code: RESPONSE_CODE.SUCCESS,
            message: 'OK',
            data: data,
            timestamp: Date.now()
        });
    }

    /**
     * 发送错误响应
     * @param {http.ServerResponse} res
     * @param {number} code - 业务错误码
     * @param {string} message - 错误信息
     */
    sendError(res, code, message) {
        const httpStatus = HTTP_STATUS[code] || 500;
        this.sendJson(res, httpStatus, {
            code: code,
            message: message,
            data: null,
            timestamp: Date.now()
        });
    }

    /**
     * 发送JSON响应
     * @param {http.ServerResponse} res
     * @param {number} status - HTTP状态码
     * @param {object} payload - 响应体
     */
    sendJson(res, status, payload) {
        const body = JSON.stringify(payload);
        res.writeHead(status, {
            'Content-Type': 'application/json; charset=utf-8',
            'Content-Length': Buffer.byteLength(body)
        });
        res.end(body);
    }

    // -------------------------------------------------------------------------
    // 通用工具
    // -------------------------------------------------------------------------

    /**
     * 从settings中读取movies目录
     * @returns {string}
     */
    getMoviesDir() {
        if (!this.settingsService) return '';
        return this.settingsService.getMoviesDir();
    }

    /**
     * 从settings中读取movieboxes目录
     * @returns {string}
     */
    getMovieboxDir() {
        if (!this.settingsService) return '';
        return this.settingsService.getMovieboxDir();
    }

    /**
     * 解析分页参数
     * 默认页码1，默认pageSize=20，pageSize最大200
     * @param {object} query
     * @returns {{page:number, pageSize:number}}
     */
    parsePagination(query) {
        let page = parseInt(query.page, 10);
        let pageSize = parseInt(query.pageSize, 10);
        if (isNaN(page) || page < 1) page = 1;
        if (isNaN(pageSize) || pageSize < 1) pageSize = 20;
        if (pageSize > 200) pageSize = 200;
        return { page, pageSize };
    }

    /**
     * 构造分页响应数据
     * @param {Array} list
     * @param {object} pagination - {page, pageSize, total, totalPages}
     * @returns {object}
     */
    buildPaginationData(list, pagination) {
        return {
            list: list,
            pagination: {
                page: pagination.page,
                pageSize: pagination.pageSize,
                total: pagination.total,
                totalPages: pagination.totalPages
            }
        };
    }

    /**
     * 将布尔类查询参数解析为bool
     * 接受字符串 'true'/'false'/'1'/'0'/'yes'/'no'
     * @param {*} value
     * @returns {boolean}
     */
    parseBool(value) {
        if (typeof value === 'boolean') return value;
        if (value === undefined || value === null) return false;
        const str = String(value).toLowerCase();
        return str === 'true' || str === '1' || str === 'yes';
    }

    /**
     * 将逗号分隔的字符串解析为数组（自动trim、去空）
     * @param {string} value
     * @returns {Array<string>}
     */
    parseCsv(value) {
        if (!value) return [];
        return String(value).split(',').map(s => s.trim()).filter(Boolean);
    }

    // -------------------------------------------------------------------------
    // 控制器：系统
    // -------------------------------------------------------------------------

    handleSystemInfo(ctx) {
        const info = {
            version: '1.1.0',
            apiVersion: 'v1',
            serverTime: Date.now(),
            features: ['tmdb', 'r18', 'boxes', 'tags', 'history']
        };
        this.sendSuccess(ctx.res, info);
    }

    handleSystemCacheStatus(ctx) {
        if (!this.movieService) {
            this.sendError(ctx.res, RESPONSE_CODE.SERVICE_UNAVAILABLE, 'movieService未配置');
            return;
        }
        const cacheService = typeof this.movieService.getCacheService === 'function'
            ? this.movieService.getCacheService()
            : null;
        const info = cacheService && typeof cacheService.getCacheInfo === 'function'
            ? cacheService.getCacheInfo()
            : null;
        this.sendSuccess(ctx.res, info || { initialized: false });
    }

    // -------------------------------------------------------------------------
    // 控制器：电影
    // -------------------------------------------------------------------------

    async handleMoviesList(ctx) {
        if (!this.movieService) {
            this.sendError(ctx.res, RESPONSE_CODE.SERVICE_UNAVAILABLE, 'movieService未配置');
            return;
        }

        const { page, pageSize } = this.parsePagination(ctx.query);
        const { sortBy, sortOrder, category, tagId, rating, actors } = ctx.query;
        const source = ctx.query.source || 'cache';
        const moviesDir = this.getMoviesDir();

        const options = {
            page,
            pageSize,
            sortBy,
            sortOrder,
            category,
            tagId,
            rating,
            actors: this.parseCsv(actors)
        };

        let result;
        if (source === 'index') {
            result = await this.movieService.getMoviesPaginatedFromIndex(moviesDir, options);
        } else {
            result = await this.movieService.getMoviesPaginated(moviesDir, options);
        }

        const data = this.buildPaginationData(result.movies || [], {
            page: result.page,
            pageSize: result.pageSize,
            total: result.total,
            totalPages: result.totalPages
        });
        this.sendSuccess(ctx.res, data);
    }

    async handleMoviesSearch(ctx) {
        if (!this.movieService) {
            this.sendError(ctx.res, RESPONSE_CODE.SERVICE_UNAVAILABLE, 'movieService未配置');
            return;
        }
        const keyword = ctx.query.keyword || '';
        if (!keyword) {
            this.sendError(ctx.res, RESPONSE_CODE.BAD_REQUEST, '缺少keyword参数');
            return;
        }
        const filters = {
            category: ctx.query.category,
            tagId: ctx.query.tagId,
            rating: ctx.query.rating,
            actors: this.parseCsv(ctx.query.actors),
            sortBy: ctx.query.sortBy,
            sortOrder: ctx.query.sortOrder
        };

        const movies = await this.movieService.searchMovies(keyword, this.getMoviesDir(), filters);

        // 模拟分页输出
        const { page, pageSize } = this.parsePagination(ctx.query);
        const total = movies.length;
        const totalPages = Math.ceil(total / pageSize);
        const startIndex = (page - 1) * pageSize;
        const slice = movies.slice(startIndex, startIndex + pageSize);

        this.sendSuccess(ctx.res, this.buildPaginationData(slice, {
            page, pageSize, total, totalPages
        }));
    }

    async handleMovieDetail(ctx) {
        if (!this.movieService) {
            this.sendError(ctx.res, RESPONSE_CODE.SERVICE_UNAVAILABLE, 'movieService未配置');
            return;
        }
        const detail = await this.movieService.getMovieDetail(ctx.params.id, this.getMoviesDir());
        if (!detail) {
            this.sendError(ctx.res, RESPONSE_CODE.NOT_FOUND, `电影未找到: ${ctx.params.id}`);
            return;
        }
        this.sendSuccess(ctx.res, detail);
    }

    // -------------------------------------------------------------------------
    // 控制器：分类
    // -------------------------------------------------------------------------

    async handleCategoriesList(ctx) {
        if (!this.categoryService) {
            this.sendError(ctx.res, RESPONSE_CODE.SERVICE_UNAVAILABLE, 'categoryService未配置');
            return;
        }
        const categories = await this.categoryService.loadCategories();
        const withStats = this.parseBool(ctx.query.withStats);

        let list = categories;
        if (withStats && this.movieService) {
            const stats = await this.movieService.getCategoryStats(categories, this.getMoviesDir());
            list = categories.map(c => ({
                ...c,
                movieCount: (stats && stats[c.id]) ? stats[c.id] : 0
            }));
        }
        this.sendSuccess(ctx.res, { list });
    }

    async handleCategoryDetail(ctx) {
        if (!this.categoryService) {
            this.sendError(ctx.res, RESPONSE_CODE.SERVICE_UNAVAILABLE, 'categoryService未配置');
            return;
        }
        const category = this.categoryService.getCategoryById(ctx.params.id);
        if (!category) {
            this.sendError(ctx.res, RESPONSE_CODE.NOT_FOUND, `分类未找到: ${ctx.params.id}`);
            return;
        }
        this.sendSuccess(ctx.res, category);
    }

    async handleCategoryMovies(ctx) {
        if (!this.movieService) {
            this.sendError(ctx.res, RESPONSE_CODE.SERVICE_UNAVAILABLE, 'movieService未配置');
            return;
        }
        const { page, pageSize } = this.parsePagination(ctx.query);
        const options = {
            page,
            pageSize,
            sortBy: ctx.query.sortBy,
            sortOrder: ctx.query.sortOrder,
            category: ctx.params.id,
            tagId: ctx.query.tagId,
            rating: ctx.query.rating,
            actors: this.parseCsv(ctx.query.actors)
        };
        const result = await this.movieService.getMoviesPaginated(this.getMoviesDir(), options);
        this.sendSuccess(ctx.res, this.buildPaginationData(result.movies || [], {
            page: result.page,
            pageSize: result.pageSize,
            total: result.total,
            totalPages: result.totalPages
        }));
    }

    // -------------------------------------------------------------------------
    // 控制器：标签
    // -------------------------------------------------------------------------

    async handleTagsList(ctx) {
        if (!this.tagService) {
            this.sendError(ctx.res, RESPONSE_CODE.SERVICE_UNAVAILABLE, 'tagService未配置');
            return;
        }
        const keyword = ctx.query.keyword || '';
        const tags = keyword
            ? this.tagService.searchTags(keyword)
            : await this.tagService.loadTags();
        this.sendSuccess(ctx.res, { list: tags });
    }

    async handleTagDetail(ctx) {
        if (!this.tagService) {
            this.sendError(ctx.res, RESPONSE_CODE.SERVICE_UNAVAILABLE, 'tagService未配置');
            return;
        }
        const tags = await this.tagService.loadTags();
        const tag = tags.find(t => t.id === ctx.params.id);
        if (!tag) {
            this.sendError(ctx.res, RESPONSE_CODE.NOT_FOUND, `标签未找到: ${ctx.params.id}`);
            return;
        }
        this.sendSuccess(ctx.res, tag);
    }

    async handleTagMovies(ctx) {
        if (!this.movieService) {
            this.sendError(ctx.res, RESPONSE_CODE.SERVICE_UNAVAILABLE, 'movieService未配置');
            return;
        }
        const { page, pageSize } = this.parsePagination(ctx.query);
        const options = {
            page,
            pageSize,
            sortBy: ctx.query.sortBy,
            sortOrder: ctx.query.sortOrder,
            tagId: ctx.params.id,
            category: ctx.query.category,
            rating: ctx.query.rating,
            actors: this.parseCsv(ctx.query.actors)
        };
        const result = await this.movieService.getMoviesPaginated(this.getMoviesDir(), options);
        this.sendSuccess(ctx.res, this.buildPaginationData(result.movies || [], {
            page: result.page,
            pageSize: result.pageSize,
            total: result.total,
            totalPages: result.totalPages
        }));
    }

    // -------------------------------------------------------------------------
    // 控制器：演员
    // -------------------------------------------------------------------------

    async handleActorsList(ctx) {
        if (!this.actorService) {
            this.sendError(ctx.res, RESPONSE_CODE.SERVICE_UNAVAILABLE, 'actorService未配置');
            return;
        }
        const actors = await this.actorService.loadActors();
        const keyword = (ctx.query.keyword || '').toLowerCase();
        const favoritesOnly = this.parseBool(ctx.query.favorites);

        let filtered = actors;
        if (favoritesOnly) {
            filtered = filtered.filter(a => a.favorites);
        }
        if (keyword) {
            filtered = filtered.filter(a =>
                (a.name && a.name.toLowerCase().includes(keyword)) ||
                (a.nickname && a.nickname.toLowerCase().includes(keyword))
            );
        }

        const { page, pageSize } = this.parsePagination(ctx.query);
        const total = filtered.length;
        const totalPages = Math.ceil(total / pageSize);
        const startIndex = (page - 1) * pageSize;
        const slice = filtered.slice(startIndex, startIndex + pageSize);

        this.sendSuccess(ctx.res, this.buildPaginationData(slice, {
            page, pageSize, total, totalPages
        }));
    }

    async handleActorDetail(ctx) {
        if (!this.actorService) {
            this.sendError(ctx.res, RESPONSE_CODE.SERVICE_UNAVAILABLE, 'actorService未配置');
            return;
        }
        const actors = await this.actorService.loadActors();
        const actor = actors.find(a => a.name === ctx.params.id);
        if (!actor) {
            this.sendError(ctx.res, RESPONSE_CODE.NOT_FOUND, `演员未找到: ${ctx.params.id}`);
            return;
        }
        this.sendSuccess(ctx.res, actor);
    }

    // -------------------------------------------------------------------------
    // 控制器：收藏夹
    // -------------------------------------------------------------------------

    async handleBoxesList(ctx) {
        if (!this.boxService) {
            this.sendError(ctx.res, RESPONSE_CODE.SERVICE_UNAVAILABLE, 'boxService未配置');
            return;
        }
        const boxes = await this.boxService.getAllBoxes(this.getMovieboxDir());
        this.sendSuccess(ctx.res, { list: boxes });
    }

    async handleBoxDetail(ctx) {
        if (!this.boxService) {
            this.sendError(ctx.res, RESPONSE_CODE.SERVICE_UNAVAILABLE, 'boxService未配置');
            return;
        }
        const detail = await this.boxService.getBoxDetail(ctx.params.name, this.getMovieboxDir());
        if (!detail) {
            this.sendError(ctx.res, RESPONSE_CODE.NOT_FOUND, `收藏夹未找到: ${ctx.params.name}`);
            return;
        }
        this.sendSuccess(ctx.res, detail);
    }

    // -------------------------------------------------------------------------
    // 控制器：播放历史
    // -------------------------------------------------------------------------

    async handleHistoryList(ctx) {
        if (!this.movieHistoryService) {
            this.sendError(ctx.res, RESPONSE_CODE.SERVICE_UNAVAILABLE, 'movieHistoryService未配置');
            return;
        }
        const result = this.movieHistoryService.filterHistory(
            ctx.query.keyword,
            ctx.query.date
        );

        // 将分组结构展开成线性列表，便于客户端消费
        const flatList = [];
        for (const entry of result.history) {
            for (const record of entry.records) {
                flatList.push({
                    date: entry.date,
                    time: record.time,
                    movieName: record.movieName,
                    movieId: record.movieId
                });
            }
        }

        const { page, pageSize } = this.parsePagination(ctx.query);
        const total = flatList.length;
        const totalPages = Math.ceil(total / pageSize);
        const startIndex = (page - 1) * pageSize;
        const slice = flatList.slice(startIndex, startIndex + pageSize);

        this.sendSuccess(ctx.res, this.buildPaginationData(slice, {
            page, pageSize, total, totalPages
        }));
    }

    handleHistoryDates(ctx) {
        if (!this.movieHistoryService) {
            this.sendError(ctx.res, RESPONSE_CODE.SERVICE_UNAVAILABLE, 'movieHistoryService未配置');
            return;
        }
        const dates = this.movieHistoryService.getHistoryDates();
        this.sendSuccess(ctx.res, { list: dates });
    }

    // -------------------------------------------------------------------------
    // 控制器：库统计
    // -------------------------------------------------------------------------

    async handleStats(ctx) {
        const stats = {
            totalMovies: 0,
            totalActors: 0,
            totalTags: 0,
            totalBoxes: 0,
            totalCategories: 0,
            cache: { initialized: false, lastUpdated: 0 }
        };

        if (this.movieService) {
            const cacheService = typeof this.movieService.getCacheService === 'function'
                ? this.movieService.getCacheService()
                : null;
            if (cacheService) {
                const info = cacheService.getCacheInfo();
                if (info) {
                    stats.totalMovies = info.totalMovies;
                    stats.cache.initialized = true;
                    stats.cache.lastUpdated = info.lastUpdated;
                }
            }
        }

        if (this.actorService) {
            stats.totalActors = await this.actorService.getActorCount();
        }
        if (this.tagService) {
            const tags = await this.tagService.loadTags();
            stats.totalTags = tags.length;
        }
        if (this.boxService) {
            const boxes = await this.boxService.getAllBoxes(this.getMovieboxDir());
            stats.totalBoxes = boxes.length;
        }
        if (this.categoryService) {
            stats.totalCategories = await this.categoryService.getCategoryCount();
        }

        this.sendSuccess(ctx.res, stats);
    }

    async handleStatsCategories(ctx) {
        if (!this.categoryService) {
            this.sendError(ctx.res, RESPONSE_CODE.SERVICE_UNAVAILABLE, 'categoryService未配置');
            return;
        }
        const categories = await this.categoryService.loadCategories();
        let countMap = {};
        if (this.movieService && typeof this.movieService.getCategoryStats === 'function') {
            countMap = await this.movieService.getCategoryStats(categories, this.getMoviesDir()) || {};
        }
        const list = categories.map(c => ({
            id: c.id,
            name: c.name,
            shortName: c.shortName,
            movieCount: countMap[c.id] || 0
        }));
        this.sendSuccess(ctx.res, { list });
    }
}

module.exports = HttpService;
module.exports.RESPONSE_CODE = RESPONSE_CODE;
module.exports.API_PREFIX = API_PREFIX;

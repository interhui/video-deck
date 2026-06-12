/**
 * HttpService 单元测试
 *
 * 测试覆盖：
 *   1. 生命周期：构造、start、stop、restart、isRunning、getListenInfo
 *   2. 路由：注册、匹配、路径参数捕获
 *   3. 通用工具：分页解析、布尔解析、CSV解析、分页响应构造
 *   4. 响应封装：成功、错误、CORS、404、503
 *   5. 各资源端点：movies/categories/tags/actors/boxes/history/stats/system
 */
const http = require('http');
const HttpService = require('../../src/main/services/HttpService');
const { RESPONSE_CODE, API_PREFIX } = HttpService;

// ============================================================================
// Mock工厂：构造满足HttpService依赖的最小服务桩
// ============================================================================

/**
 * 创建Mock SettingsService
 * @param {object} overrides - 覆盖默认配置
 */
function createMockSettingsService(overrides = {}) {
    const httpConfig = Object.assign(
        { enabled: false, listenAddress: '127.0.0.1', listenPort: 0 },
        overrides.http || {}
    );
    return {
        getHttpConfig: () => httpConfig,
        setHttpConfig: (cfg) => Object.assign(httpConfig, cfg),
        getMoviesDir: () => overrides.moviesDir || '/test/movies',
        getMovieboxDir: () => overrides.movieboxDir || '/test/boxes'
    };
}

/**
 * 创建Mock MovieService
 */
function createMockMovieService(data = {}) {
    const cacheInfo = data.cacheInfo || { totalMovies: 10, categoryCount: 2, lastUpdated: 111 };
    return {
        getCacheService: () => ({
            getCacheInfo: () => cacheInfo
        }),
        getMoviesPaginated: jest.fn().mockResolvedValue(data.paginated || {
            movies: [{ id: 'm1', title: 'A' }],
            total: 1, page: 1, pageSize: 20, totalPages: 1
        }),
        getMoviesPaginatedFromIndex: jest.fn().mockResolvedValue(data.indexPaginated || {
            movies: [{ id: 'i1', title: 'IndexMovie' }],
            total: 1, page: 1, pageSize: 20, totalPages: 1
        }),
        searchMovies: jest.fn().mockResolvedValue(data.searchResults || [
            { id: 'm1', title: 'matrix' }
        ]),
        getMovieDetail: jest.fn().mockImplementation(async (id) => {
            if (id === 'not-found') return null;
            return { id, title: 'Detail of ' + id };
        }),
        getCategoryStats: jest.fn().mockResolvedValue(data.categoryStats || { movie: 5, tv: 3 })
    };
}

/**
 * 创建Mock CategoryService
 */
function createMockCategoryService(categories = null) {
    const defaultCategories = categories || [
        { id: 'movie', name: '电影', shortName: '电影' },
        { id: 'tv', name: '电视剧', shortName: '剧集' }
    ];
    return {
        loadCategories: jest.fn().mockResolvedValue(defaultCategories),
        getCategoryById: (id) => defaultCategories.find(c => c.id === id) || null,
        getCategoryCount: jest.fn().mockResolvedValue(defaultCategories.length)
    };
}

/**
 * 创建Mock TagService
 */
function createMockTagService(tags = null) {
    const defaultTags = tags || [
        { id: 'sci-fi', name: '科幻' },
        { id: 'action', name: '动作' }
    ];
    return {
        loadTags: jest.fn().mockResolvedValue(defaultTags),
        searchTags: (kw) => defaultTags.filter(t =>
            (t.id || '').toLowerCase().includes((kw || '').toLowerCase())
        )
    };
}

/**
 * 创建Mock ActorService
 */
function createMockActorService(actors = null) {
    const defaultActors = actors || [
        { name: 'ActorA', nickname: '', favorites: true, rating: 5 },
        { name: 'ActorB', nickname: 'BB', favorites: false, rating: 0 }
    ];
    return {
        loadActors: jest.fn().mockResolvedValue(defaultActors),
        getActorCount: jest.fn().mockResolvedValue(defaultActors.length)
    };
}

/**
 * 创建Mock BoxService
 */
function createMockBoxService(boxes = null) {
    const defaultBoxes = boxes || [
        { name: 'Box1', description: '', originalName: 'Box1', movieCount: 2 }
    ];
    return {
        getAllBoxes: jest.fn().mockResolvedValue(defaultBoxes),
        getBoxDetail: jest.fn().mockImplementation(async (name) => {
            if (name === 'not-found') return null;
            return {
                name, originalName: name, description: '', movieCount: 1,
                movies: [{ id: 'm1', status: 'watched' }]
            };
        })
    };
}

/**
 * 创建Mock MovieHistoryService
 */
function createMockHistoryService() {
    return {
        filterHistory: jest.fn().mockReturnValue({
            history: [
                {
                    date: '2026-06-08',
                    records: [
                        { time: '21:35:10', movieName: 'The Matrix', movieId: 'm1' }
                    ]
                }
            ]
        }),
        getHistoryDates: jest.fn().mockReturnValue(['2026-06-08', '2026-06-07'])
    };
}

// ============================================================================
// HTTP辅助工具：用真实端口启动测试服务器并发起请求
// ============================================================================

/**
 * 启动一个HttpService实例，监听到随机端口
 * @param {object} services - 依赖服务
 * @returns {Promise<HttpService>}
 */
async function startTestServer(services) {
    const service = new HttpService(services);
    await service.startWith('127.0.0.1', 0);
    return service;
}

/**
 * 发起HTTP请求并解析JSON响应
 * @param {HttpService} service - 已启动的HTTP服务实例
 * @param {string} method
 * @param {string} pathWithQuery - 例如 '/api/v1/movies?page=1'
 * @param {object} [body]
 * @returns {Promise<{status:number, json:object, headers:object}>}
 */
function request(service, method, pathWithQuery, body = null) {
    const { host, port } = service.getListenInfo();
    return new Promise((resolve, reject) => {
        const req = http.request({
            host, port, method, path: pathWithQuery,
            headers: { 'Content-Type': 'application/json' }
        }, (res) => {
            let raw = '';
            res.on('data', (chunk) => raw += chunk.toString());
            res.on('end', () => {
                let json = null;
                try { json = raw ? JSON.parse(raw) : null; } catch (e) { /* ignore */ }
                resolve({ status: res.statusCode, json, headers: res.headers });
            });
        });
        req.on('error', reject);
        if (body !== null) req.write(JSON.stringify(body));
        req.end();
    });
}

// ============================================================================
// 测试用例
// ============================================================================

describe('HttpService', () => {

    // ------------------------------------------------------------------------
    // 1. 生命周期
    // ------------------------------------------------------------------------
    describe('生命周期', () => {

        test('SVC-HTTP-001: 构造时默认未启动', () => {
            const service = new HttpService({});
            expect(service.isRunning()).toBe(false);
            expect(service.getListenInfo()).toBeNull();
        });

        test('SVC-HTTP-002: startWith可启动服务并填充listenInfo', async () => {
            const service = new HttpService({});
            await service.startWith('127.0.0.1', 0);
            expect(service.isRunning()).toBe(true);
            const info = service.getListenInfo();
            expect(info.host).toBe('127.0.0.1');
            expect(typeof info.port).toBe('number');
            expect(info.port).toBeGreaterThan(0);
            await service.stop();
        });

        test('SVC-HTTP-003: stop停止后isRunning为false', async () => {
            const service = new HttpService({});
            await service.startWith('127.0.0.1', 0);
            await service.stop();
            expect(service.isRunning()).toBe(false);
            expect(service.getListenInfo()).toBeNull();
        });

        test('SVC-HTTP-004: 重复start返回rejection', async () => {
            const service = new HttpService({});
            await service.startWith('127.0.0.1', 0);
            await expect(service.startWith('127.0.0.1', 0)).rejects.toThrow('已启动');
            await service.stop();
        });

        test('SVC-HTTP-005: stop未启动的服务不抛错', async () => {
            const service = new HttpService({});
            await expect(service.stop()).resolves.toBeUndefined();
        });

        test('SVC-HTTP-006: settings.http.enabled=false时start不启动', async () => {
            const settings = createMockSettingsService({ http: { enabled: false } });
            const service = new HttpService({ settingsService: settings });
            const result = await service.start();
            expect(result).toBeNull();
            expect(service.isRunning()).toBe(false);
        });

        test('SVC-HTTP-007: settings.http.enabled=true时start会监听', async () => {
            const settings = createMockSettingsService({
                http: { enabled: true, listenAddress: '127.0.0.1', listenPort: 0 }
            });
            const service = new HttpService({ settingsService: settings });
            const info = await service.start();
            expect(info).not.toBeNull();
            expect(info.host).toBe('127.0.0.1');
            await service.stop();
        });

        test('SVC-HTTP-008: 缺失settingsService时start返回null', async () => {
            const service = new HttpService({});
            const result = await service.start();
            expect(result).toBeNull();
        });

        test('SVC-HTTP-009: restart会先停止再启动', async () => {
            const settings = createMockSettingsService({
                http: { enabled: true, listenAddress: '127.0.0.1', listenPort: 0 }
            });
            const service = new HttpService({ settingsService: settings });
            await service.start();
            const oldPort = service.getListenInfo().port;
            const info = await service.restart();
            expect(info).not.toBeNull();
            // 端口未指定时（=0）每次都会随机分配
            expect(typeof info.port).toBe('number');
            await service.stop();
        });
    });

    // ------------------------------------------------------------------------
    // 2. 路由匹配
    // ------------------------------------------------------------------------
    describe('路由匹配', () => {
        const service = new HttpService({});

        test('SVC-HTTP-010: matchRoute匹配固定路径', () => {
            const matched = service.matchRoute('GET', `${API_PREFIX}/movies`);
            expect(matched).not.toBeNull();
        });

        test('SVC-HTTP-011: matchRoute捕获路径参数', () => {
            const matched = service.matchRoute('GET', `${API_PREFIX}/movies/movie-the-matrix`);
            expect(matched).not.toBeNull();
            expect(matched.params.id).toBe('movie-the-matrix');
        });

        test('SVC-HTTP-012: matchRoute对URL编码的参数自动解码', () => {
            const encoded = encodeURIComponent('涼森玲夢');
            const matched = service.matchRoute('GET', `${API_PREFIX}/actors/${encoded}`);
            expect(matched).not.toBeNull();
            expect(matched.params.id).toBe('涼森玲夢');
        });

        test('SVC-HTTP-013: matchRoute对未注册路径返回null', () => {
            const matched = service.matchRoute('GET', `${API_PREFIX}/no-such-route`);
            expect(matched).toBeNull();
        });

        test('SVC-HTTP-014: matchRoute区分HTTP方法', () => {
            // POST /movies 未注册
            const matched = service.matchRoute('POST', `${API_PREFIX}/movies`);
            expect(matched).toBeNull();
        });

        test('SVC-HTTP-015: matchRoute匹配 /movies/search 路径', () => {
            const matched = service.matchRoute('GET', `${API_PREFIX}/movies/search`);
            expect(matched).not.toBeNull();
            // 由于路由按注册顺序匹配，且 /movies/search 在 /movies/:id 之前注册，
            // 故 /movies/search 命中专用路由而非 /movies/:id
            expect(matched.params.id).toBeUndefined();
        });

        test('SVC-HTTP-016: addRoute可注册新的路由', () => {
            const tempService = new HttpService({});
            const beforeCount = tempService.routes.length;
            tempService.addRoute('GET', '/custom', () => {});
            expect(tempService.routes.length).toBe(beforeCount + 1);
        });
    });

    // ------------------------------------------------------------------------
    // 3. 通用工具
    // ------------------------------------------------------------------------
    describe('通用工具', () => {
        const service = new HttpService({});

        test('SVC-HTTP-020: parsePagination返回默认值', () => {
            expect(service.parsePagination({})).toEqual({ page: 1, pageSize: 20 });
        });

        test('SVC-HTTP-021: parsePagination解析合法值', () => {
            expect(service.parsePagination({ page: '3', pageSize: '50' })).toEqual({ page: 3, pageSize: 50 });
        });

        test('SVC-HTTP-022: parsePagination拒绝非法值', () => {
            expect(service.parsePagination({ page: 'abc', pageSize: '-1' })).toEqual({ page: 1, pageSize: 20 });
        });

        test('SVC-HTTP-023: parsePagination限制pageSize最大200', () => {
            expect(service.parsePagination({ pageSize: '500' })).toEqual({ page: 1, pageSize: 200 });
        });

        test('SVC-HTTP-024: parseBool识别真值', () => {
            expect(service.parseBool('true')).toBe(true);
            expect(service.parseBool('1')).toBe(true);
            expect(service.parseBool('yes')).toBe(true);
            expect(service.parseBool(true)).toBe(true);
        });

        test('SVC-HTTP-025: parseBool识别假值', () => {
            expect(service.parseBool('false')).toBe(false);
            expect(service.parseBool('0')).toBe(false);
            expect(service.parseBool(undefined)).toBe(false);
            expect(service.parseBool(null)).toBe(false);
        });

        test('SVC-HTTP-026: parseCsv拆分逗号', () => {
            expect(service.parseCsv('a,b,c')).toEqual(['a', 'b', 'c']);
        });

        test('SVC-HTTP-027: parseCsv处理空白和空值', () => {
            expect(service.parseCsv(' a , , b ')).toEqual(['a', 'b']);
            expect(service.parseCsv('')).toEqual([]);
            expect(service.parseCsv(null)).toEqual([]);
        });

        test('SVC-HTTP-028: buildPaginationData构造分页结构', () => {
            const data = service.buildPaginationData([{ id: 1 }], {
                page: 2, pageSize: 10, total: 30, totalPages: 3
            });
            expect(data).toEqual({
                list: [{ id: 1 }],
                pagination: { page: 2, pageSize: 10, total: 30, totalPages: 3 }
            });
        });
    });

    // ------------------------------------------------------------------------
    // 4. 响应封装（通过实际HTTP端到端验证）
    // ------------------------------------------------------------------------
    describe('响应封装', () => {
        let service;
        beforeEach(async () => {
            service = await startTestServer({});
        });
        afterEach(async () => {
            if (service) await service.stop();
        });

        test('SVC-HTTP-030: 未注册路由返回404 + 业务错误码', async () => {
            const { status, json } = await request(service, 'GET', `${API_PREFIX}/no-such`);
            expect(status).toBe(404);
            expect(json.code).toBe(RESPONSE_CODE.NOT_FOUND);
            expect(json.data).toBeNull();
            expect(typeof json.timestamp).toBe('number');
        });

        test('SVC-HTTP-031: 响应头包含CORS', async () => {
            const { headers } = await request(service, 'GET', `${API_PREFIX}/no-such`);
            expect(headers['access-control-allow-origin']).toBe('*');
            expect(headers['access-control-allow-methods']).toContain('GET');
        });

        test('SVC-HTTP-032: OPTIONS请求返回204', async () => {
            const { status } = await request(service, 'OPTIONS', `${API_PREFIX}/movies`);
            expect(status).toBe(204);
        });

        test('SVC-HTTP-033: 缺失关键依赖时返回503', async () => {
            const { status, json } = await request(service, 'GET', `${API_PREFIX}/movies`);
            expect(status).toBe(503);
            expect(json.code).toBe(RESPONSE_CODE.SERVICE_UNAVAILABLE);
        });
    });

    // ------------------------------------------------------------------------
    // 5. /system 端点
    // ------------------------------------------------------------------------
    describe('系统端点', () => {
        let service;
        afterEach(async () => {
            if (service) await service.stop();
        });

        test('SVC-HTTP-040: GET /system/info 返回版本/serverTime/features', async () => {
            service = await startTestServer({});
            const { status, json } = await request(service, 'GET', `${API_PREFIX}/system/info`);
            expect(status).toBe(200);
            expect(json.code).toBe(0);
            expect(json.data.version).toBeDefined();
            expect(json.data.apiVersion).toBe('v1');
            expect(Array.isArray(json.data.features)).toBe(true);
        });

        test('SVC-HTTP-041: GET /system/cache-status 返回缓存信息', async () => {
            const movieService = createMockMovieService({
                cacheInfo: { totalMovies: 7, categoryCount: 2, lastUpdated: 999 }
            });
            service = await startTestServer({ movieService });
            const { status, json } = await request(service, 'GET', `${API_PREFIX}/system/cache-status`);
            expect(status).toBe(200);
            expect(json.data.totalMovies).toBe(7);
            expect(json.data.lastUpdated).toBe(999);
        });
    });

    // ------------------------------------------------------------------------
    // 6. /movies 端点
    // ------------------------------------------------------------------------
    describe('电影端点', () => {
        let service;
        let movieService;
        beforeEach(async () => {
            movieService = createMockMovieService();
            const settingsService = createMockSettingsService();
            service = await startTestServer({ settingsService, movieService });
        });
        afterEach(async () => {
            if (service) await service.stop();
        });

        test('SVC-HTTP-050: GET /movies 返回分页结构', async () => {
            const { status, json } = await request(service, 'GET', `${API_PREFIX}/movies?page=1&pageSize=10`);
            expect(status).toBe(200);
            expect(json.code).toBe(0);
            expect(Array.isArray(json.data.list)).toBe(true);
            expect(json.data.pagination.page).toBe(1);
            expect(json.data.pagination.pageSize).toBe(20); // mock返回20
        });

        test('SVC-HTTP-051: GET /movies?source=index 走index分支', async () => {
            await request(service, 'GET', `${API_PREFIX}/movies?source=index`);
            expect(movieService.getMoviesPaginatedFromIndex).toHaveBeenCalled();
            expect(movieService.getMoviesPaginated).not.toHaveBeenCalled();
        });

        test('SVC-HTTP-052: GET /movies默认走cache分支', async () => {
            await request(service, 'GET', `${API_PREFIX}/movies`);
            expect(movieService.getMoviesPaginated).toHaveBeenCalled();
        });

        test('SVC-HTTP-053: GET /movies/search 缺keyword返回400', async () => {
            const { status, json } = await request(service, 'GET', `${API_PREFIX}/movies/search`);
            expect(status).toBe(400);
            expect(json.code).toBe(RESPONSE_CODE.BAD_REQUEST);
        });

        test('SVC-HTTP-054: GET /movies/search 返回分页结构', async () => {
            const { status, json } = await request(service, 'GET', `${API_PREFIX}/movies/search?keyword=matrix`);
            expect(status).toBe(200);
            expect(Array.isArray(json.data.list)).toBe(true);
            expect(json.data.pagination.total).toBe(1);
            expect(movieService.searchMovies).toHaveBeenCalledWith(
                'matrix', '/test/movies', expect.any(Object)
            );
        });

        test('SVC-HTTP-055: GET /movies/:id 返回详情', async () => {
            const { status, json } = await request(service, 'GET', `${API_PREFIX}/movies/movie-the-matrix`);
            expect(status).toBe(200);
            expect(json.data.id).toBe('movie-the-matrix');
            expect(json.data.title).toBe('Detail of movie-the-matrix');
        });

        test('SVC-HTTP-056: GET /movies/:id 不存在返回404', async () => {
            const { status, json } = await request(service, 'GET', `${API_PREFIX}/movies/not-found`);
            expect(status).toBe(404);
            expect(json.code).toBe(RESPONSE_CODE.NOT_FOUND);
        });
    });

    // ------------------------------------------------------------------------
    // 7. /categories 端点
    // ------------------------------------------------------------------------
    describe('分类端点', () => {
        let service;
        afterEach(async () => {
            if (service) await service.stop();
        });

        test('SVC-HTTP-060: GET /categories 返回列表', async () => {
            const categoryService = createMockCategoryService();
            service = await startTestServer({ categoryService });
            const { status, json } = await request(service, 'GET', `${API_PREFIX}/categories`);
            expect(status).toBe(200);
            expect(json.data.list).toHaveLength(2);
        });

        test('SVC-HTTP-061: GET /categories?withStats=true 合并电影数', async () => {
            const categoryService = createMockCategoryService();
            const movieService = createMockMovieService({
                categoryStats: { movie: 12, tv: 8 }
            });
            const settingsService = createMockSettingsService();
            service = await startTestServer({ categoryService, movieService, settingsService });
            const { json } = await request(service, 'GET', `${API_PREFIX}/categories?withStats=true`);
            const movieCat = json.data.list.find(c => c.id === 'movie');
            expect(movieCat.movieCount).toBe(12);
        });

        test('SVC-HTTP-062: GET /categories/:id 返回分类详情', async () => {
            const categoryService = createMockCategoryService();
            service = await startTestServer({ categoryService });
            const { status, json } = await request(service, 'GET', `${API_PREFIX}/categories/movie`);
            expect(status).toBe(200);
            expect(json.data.id).toBe('movie');
        });

        test('SVC-HTTP-063: GET /categories/:id 不存在返回404', async () => {
            const categoryService = createMockCategoryService();
            service = await startTestServer({ categoryService });
            const { status, json } = await request(service, 'GET', `${API_PREFIX}/categories/not-found`);
            expect(status).toBe(404);
            expect(json.code).toBe(RESPONSE_CODE.NOT_FOUND);
        });

        test('SVC-HTTP-064: GET /categories/:id/movies 强制将分类绑定到path', async () => {
            const movieService = createMockMovieService();
            const settingsService = createMockSettingsService();
            service = await startTestServer({ movieService, settingsService });
            await request(service, 'GET', `${API_PREFIX}/categories/movie/movies?category=ignored`);
            const callArgs = movieService.getMoviesPaginated.mock.calls[0][1];
            expect(callArgs.category).toBe('movie');
        });
    });

    // ------------------------------------------------------------------------
    // 8. /tags 端点
    // ------------------------------------------------------------------------
    describe('标签端点', () => {
        let service;
        afterEach(async () => {
            if (service) await service.stop();
        });

        test('SVC-HTTP-070: GET /tags 返回所有标签', async () => {
            const tagService = createMockTagService();
            service = await startTestServer({ tagService });
            const { status, json } = await request(service, 'GET', `${API_PREFIX}/tags`);
            expect(status).toBe(200);
            expect(json.data.list.length).toBeGreaterThan(0);
        });

        test('SVC-HTTP-071: GET /tags?keyword=sci 过滤匹配', async () => {
            const tagService = createMockTagService();
            service = await startTestServer({ tagService });
            const { json } = await request(service, 'GET', `${API_PREFIX}/tags?keyword=sci`);
            expect(json.data.list.length).toBe(1);
            expect(json.data.list[0].id).toBe('sci-fi');
        });

        test('SVC-HTTP-072: GET /tags/:id 返回标签详情', async () => {
            const tagService = createMockTagService();
            service = await startTestServer({ tagService });
            const { status, json } = await request(service, 'GET', `${API_PREFIX}/tags/action`);
            expect(status).toBe(200);
            expect(json.data.name).toBe('动作');
        });

        test('SVC-HTTP-073: GET /tags/:id 不存在返回404', async () => {
            const tagService = createMockTagService();
            service = await startTestServer({ tagService });
            const { status, json } = await request(service, 'GET', `${API_PREFIX}/tags/missing`);
            expect(status).toBe(404);
            expect(json.code).toBe(RESPONSE_CODE.NOT_FOUND);
        });

        test('SVC-HTTP-074: GET /tags/:id/movies 路径tagId传递正确', async () => {
            const movieService = createMockMovieService();
            const settingsService = createMockSettingsService();
            service = await startTestServer({ movieService, settingsService });
            await request(service, 'GET', `${API_PREFIX}/tags/action/movies`);
            const callArgs = movieService.getMoviesPaginated.mock.calls[0][1];
            expect(callArgs.tagId).toBe('action');
        });
    });

    // ------------------------------------------------------------------------
    // 9. /actors 端点
    // ------------------------------------------------------------------------
    describe('演员端点', () => {
        let service;
        afterEach(async () => {
            if (service) await service.stop();
        });

        test('SVC-HTTP-080: GET /actors 返回分页列表', async () => {
            const actorService = createMockActorService();
            service = await startTestServer({ actorService });
            const { status, json } = await request(service, 'GET', `${API_PREFIX}/actors`);
            expect(status).toBe(200);
            expect(json.data.pagination.total).toBe(2);
        });

        test('SVC-HTTP-081: GET /actors?favorites=true 仅返回收藏', async () => {
            const actorService = createMockActorService();
            service = await startTestServer({ actorService });
            const { json } = await request(service, 'GET', `${API_PREFIX}/actors?favorites=true`);
            expect(json.data.pagination.total).toBe(1);
            expect(json.data.list[0].name).toBe('ActorA');
        });

        test('SVC-HTTP-082: GET /actors?keyword=BB 匹配昵称', async () => {
            const actorService = createMockActorService();
            service = await startTestServer({ actorService });
            const { json } = await request(service, 'GET', `${API_PREFIX}/actors?keyword=BB`);
            expect(json.data.pagination.total).toBe(1);
            expect(json.data.list[0].name).toBe('ActorB');
        });

        test('SVC-HTTP-083: GET /actors/:id 返回演员详情', async () => {
            const actorService = createMockActorService();
            service = await startTestServer({ actorService });
            const { status, json } = await request(service, 'GET', `${API_PREFIX}/actors/ActorA`);
            expect(status).toBe(200);
            expect(json.data.name).toBe('ActorA');
        });

        test('SVC-HTTP-084: GET /actors/:id 不存在返回404', async () => {
            const actorService = createMockActorService();
            service = await startTestServer({ actorService });
            const { status } = await request(service, 'GET', `${API_PREFIX}/actors/Nobody`);
            expect(status).toBe(404);
        });
    });

    // ------------------------------------------------------------------------
    // 10. /boxes 端点
    // ------------------------------------------------------------------------
    describe('收藏夹端点', () => {
        let service;
        afterEach(async () => {
            if (service) await service.stop();
        });

        test('SVC-HTTP-090: GET /boxes 返回列表', async () => {
            const boxService = createMockBoxService();
            const settingsService = createMockSettingsService();
            service = await startTestServer({ boxService, settingsService });
            const { status, json } = await request(service, 'GET', `${API_PREFIX}/boxes`);
            expect(status).toBe(200);
            expect(json.data.list).toHaveLength(1);
        });

        test('SVC-HTTP-091: GET /boxes/:name 返回详情', async () => {
            const boxService = createMockBoxService();
            const settingsService = createMockSettingsService();
            service = await startTestServer({ boxService, settingsService });
            const { status, json } = await request(service, 'GET', `${API_PREFIX}/boxes/Box1`);
            expect(status).toBe(200);
            expect(json.data.name).toBe('Box1');
        });

        test('SVC-HTTP-092: GET /boxes/:name 不存在返回404', async () => {
            const boxService = createMockBoxService();
            const settingsService = createMockSettingsService();
            service = await startTestServer({ boxService, settingsService });
            const { status } = await request(service, 'GET', `${API_PREFIX}/boxes/not-found`);
            expect(status).toBe(404);
        });
    });

    // ------------------------------------------------------------------------
    // 11. /history 端点
    // ------------------------------------------------------------------------
    describe('播放历史端点', () => {
        let service;
        afterEach(async () => {
            if (service) await service.stop();
        });

        test('SVC-HTTP-100: GET /history 返回扁平化分页结构', async () => {
            const movieHistoryService = createMockHistoryService();
            service = await startTestServer({ movieHistoryService });
            const { status, json } = await request(service, 'GET', `${API_PREFIX}/history`);
            expect(status).toBe(200);
            expect(json.data.list[0].movieName).toBe('The Matrix');
            expect(json.data.list[0].date).toBe('2026-06-08');
        });

        test('SVC-HTTP-101: GET /history/dates 返回日期列表', async () => {
            const movieHistoryService = createMockHistoryService();
            service = await startTestServer({ movieHistoryService });
            const { status, json } = await request(service, 'GET', `${API_PREFIX}/history/dates`);
            expect(status).toBe(200);
            expect(json.data.list).toEqual(['2026-06-08', '2026-06-07']);
        });
    });

    // ------------------------------------------------------------------------
    // 12. /stats 端点
    // ------------------------------------------------------------------------
    describe('统计端点', () => {
        let service;
        afterEach(async () => {
            if (service) await service.stop();
        });

        test('SVC-HTTP-110: GET /stats 返回汇总信息', async () => {
            const services = {
                movieService: createMockMovieService(),
                actorService: createMockActorService(),
                tagService: createMockTagService(),
                boxService: createMockBoxService(),
                categoryService: createMockCategoryService(),
                settingsService: createMockSettingsService()
            };
            service = await startTestServer(services);
            const { status, json } = await request(service, 'GET', `${API_PREFIX}/stats`);
            expect(status).toBe(200);
            expect(json.data.totalMovies).toBe(10);
            expect(json.data.totalActors).toBe(2);
            expect(json.data.totalTags).toBe(2);
            expect(json.data.totalBoxes).toBe(1);
            expect(json.data.totalCategories).toBe(2);
            expect(json.data.cache.initialized).toBe(true);
        });

        test('SVC-HTTP-111: GET /stats/categories 返回每个分类电影数', async () => {
            const categoryService = createMockCategoryService();
            const movieService = createMockMovieService();
            const settingsService = createMockSettingsService();
            service = await startTestServer({ categoryService, movieService, settingsService });
            const { status, json } = await request(service, 'GET', `${API_PREFIX}/stats/categories`);
            expect(status).toBe(200);
            const movie = json.data.list.find(c => c.id === 'movie');
            expect(movie.movieCount).toBe(5);
        });

        test('SVC-HTTP-112: GET /stats 各服务缺失时仍返回0', async () => {
            service = await startTestServer({});
            const { status, json } = await request(service, 'GET', `${API_PREFIX}/stats`);
            expect(status).toBe(200);
            expect(json.data.totalMovies).toBe(0);
            expect(json.data.totalActors).toBe(0);
            expect(json.data.totalTags).toBe(0);
            expect(json.data.totalBoxes).toBe(0);
            expect(json.data.totalCategories).toBe(0);
        });
    });

    // ------------------------------------------------------------------------
    // 13. 请求体解析
    // ------------------------------------------------------------------------
    describe('请求体解析', () => {
        let service;
        let svcInstance;

        beforeEach(() => {
            svcInstance = new HttpService({});
            // 在测试中临时注册一个POST路由
            svcInstance.addRoute('POST', '/echo', (ctx) => {
                svcInstance.sendSuccess(ctx.res, { received: ctx.body });
            });
        });

        afterEach(async () => {
            if (service) await service.stop();
        });

        test('SVC-HTTP-120: POST请求合法JSON可解析', async () => {
            service = svcInstance;
            await service.startWith('127.0.0.1', 0);
            const { status, json } = await request(service, 'POST', `${API_PREFIX}/echo`, { hello: 'world' });
            expect(status).toBe(200);
            expect(json.data.received).toEqual({ hello: 'world' });
        });

        test('SVC-HTTP-121: POST请求非法JSON返回500', async () => {
            service = svcInstance;
            await service.startWith('127.0.0.1', 0);
            const { host, port } = service.getListenInfo();
            const result = await new Promise((resolve, reject) => {
                const req = http.request({
                    host, port, method: 'POST', path: `${API_PREFIX}/echo`,
                    headers: { 'Content-Type': 'application/json' }
                }, (res) => {
                    let raw = '';
                    res.on('data', (c) => raw += c.toString());
                    res.on('end', () => resolve({ status: res.statusCode, json: JSON.parse(raw) }));
                });
                req.on('error', reject);
                req.write('{invalid json}');
                req.end();
            });
            expect(result.status).toBe(500);
            expect(result.json.code).toBe(RESPONSE_CODE.INTERNAL_ERROR);
        });
    });
});

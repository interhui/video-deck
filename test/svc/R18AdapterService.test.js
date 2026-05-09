/**
 * R18AdapterService 单元测试
 */
const R18AdapterService = require('../../src/main/services/R18AdapterService');
const TMDBMovieAdapterService = require('../../src/main/services/TMDBAdapterService');
const SettingsService = require('../../src/main/services/SettingsService');
const path = require('path');
const fs = require('fs');

describe('R18AdapterService', () => {
    let service;
    let settingsService;
    let tmdbAdapterService;
    let testDataDir;

    beforeEach(() => {
        testDataDir = path.join(__dirname, 'test-data', 'r18');
        if (!fs.existsSync(testDataDir)) {
            fs.mkdirSync(testDataDir, { recursive: true });
        }
        const settingsPath = path.join(testDataDir, 'settings.json');
        settingsService = new SettingsService(settingsPath);
        tmdbAdapterService = new TMDBMovieAdapterService(settingsService);
        service = new R18AdapterService(settingsService, tmdbAdapterService);
    });

    afterEach(() => {
        if (fs.existsSync(testDataDir)) {
            fs.rmSync(testDataDir, { recursive: true, force: true });
        }
    });

    describe('getR18Config', () => {
        test('SVC-R18-001: 返回默认R18配置', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            const config = service.getR18Config();
            expect(config.dbUrl).toBe('');
            expect(config.dbUsername).toBe('');
            expect(config.dbPassword).toBe('');
        });

        test('SVC-R18-002: 返回自定义R18配置', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            settingsService.setR18Config({
                dbUrl: 'postgresql://localhost:5432/test',
                dbUsername: 'testuser',
                dbPassword: 'testpass'
            });
            const config = service.getR18Config();
            expect(config.dbUrl).toBe('postgresql://localhost:5432/test');
            expect(config.dbUsername).toBe('testuser');
            expect(config.dbPassword).toBe('testpass');
        });
    });

    describe('searchMovie', () => {
        test('SVC-R18-003: 未配置dbUrl抛出错误', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            await expect(service.searchMovie('test')).rejects.toThrow('R18 database URL not configured');
        });

        test('SVC-R18-004: 空关键字抛出错误', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            settingsService.setR18Config({ dbUrl: 'postgresql://localhost:5432/test' });
            await expect(service.searchMovie('')).rejects.toThrow('Keyword is required');
        });

        test('SVC-R18-005: null关键字抛出错误', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            settingsService.setR18Config({ dbUrl: 'postgresql://localhost:5432/test' });
            await expect(service.searchMovie(null)).rejects.toThrow('Keyword is required');
        });

        test('SVC-R18-006: searchMovie响应数据格式正确', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            settingsService.setR18Config({ dbUrl: 'postgresql://localhost:5432/test' });
            
            const mockRows = [
                {
                    search_id: 'TEST001',
                    title: '测试电影',
                    overview: '电影介绍',
                    year: '2023',
                    poster_url: 'http://example.com/poster.jpg'
                }
            ];

            service.query = jest.fn().mockResolvedValue(mockRows);

            const result = await service.searchMovie('测试');
            
            expect(result).toBeInstanceOf(Array);
            expect(result.length).toBe(1);
            expect(result[0]).toHaveProperty('title', '测试电影');
            expect(result[0]).toHaveProperty('overview', '电影介绍');
            expect(result[0]).toHaveProperty('year', '2023');
            expect(result[0]).toHaveProperty('search_id', 'TEST001');
            expect(result[0]).toHaveProperty('poster_url', 'http://example.com/poster.jpg');
        });

        test('SVC-R18-007: searchMovie空结果返回空数组', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            settingsService.setR18Config({ dbUrl: 'postgresql://localhost:5432/test' });
            
            service.query = jest.fn().mockResolvedValue([]);

            const result = await service.searchMovie('notexist');
            expect(result).toEqual([]);
        });
    });

    describe('getMovie', () => {
        test('SVC-R18-008: 未配置dbUrl抛出错误', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            await expect(service.getMovie('TEST001')).rejects.toThrow('R18 database URL not configured');
        });

        test('SVC-R18-009: 空searchId抛出错误', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            settingsService.setR18Config({ dbUrl: 'postgresql://localhost:5432/test' });
            await expect(service.getMovie(null)).rejects.toThrow('Search ID is required');
        });

        test('SVC-R18-010: getMovie响应数据格式正确', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            settingsService.setR18Config({ dbUrl: 'postgresql://localhost:5432/test' });
            
            const mockRows = [
                {
                    movie_id: 'TEST001',
                    title: '测试电影',
                    overview: '电影介绍',
                    tags: '动作,剧情',
                    production_companies: '公司A',
                    runtime: 120,
                    actors: '演员A,演员B',
                    directors: '导演A',
                    year: '2023',
                    poster_url: 'http://example.com/poster.jpg'
                }
            ];

            service.query = jest.fn().mockResolvedValue(mockRows);

            const result = await service.getMovie('TEST001');
            
            expect(result).toHaveProperty('movie_id', 'TEST001');
            expect(result).toHaveProperty('title', '测试电影');
            expect(result).toHaveProperty('overview', '电影介绍');
            expect(result).toHaveProperty('runtime', 120);
            expect(result).toHaveProperty('year', '2023');
            expect(result.tags).toEqual(['动作', '剧情']);
            expect(result.production_companies).toEqual('');
            expect(result.poster_url).toBe('http://example.com/poster.jpg');
            expect(result.actors).toHaveLength(2);
            expect(result.actors[0]).toEqual({
                person_id: '',
                name: '演员A',
                profile_url: null
            });
            expect(result.actors[1]).toEqual({
                person_id: '',
                name: '演员B',
                profile_url: null
            });
            expect(result.directors).toHaveLength(1);
            expect(result.directors[0]).toEqual({
                person_id: '',
                name: '导演A',
                profile_url: null
            });
        });

        test('SVC-R18-011: getMovie未找到电影返回null', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            settingsService.setR18Config({ dbUrl: 'postgresql://localhost:5432/test' });
            
            service.query = jest.fn().mockResolvedValue([]);

            const result = await service.getMovie('NOTEXIST');
            expect(result).toBeNull();
        });

        test('SVC-R18-012: getMovie处理缺失数据', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            settingsService.setR18Config({ dbUrl: 'postgresql://localhost:5432/test' });
            
            const mockRows = [
                {
                    movie_id: 'TEST001',
                    title: '测试电影'
                }
            ];

            service.query = jest.fn().mockResolvedValue(mockRows);

            const result = await service.getMovie('TEST001');
            
            expect(result).toHaveProperty('movie_id', 'TEST001');
            expect(result).toHaveProperty('title', '测试电影');
            expect(result).toHaveProperty('overview', '');
            expect(result).toHaveProperty('runtime', 0);
            expect(result).toHaveProperty('year', '');
            expect(result.tags).toEqual([]);
            expect(result.production_companies).toEqual('');
            expect(result.actors).toEqual([]);
            expect(result.directors).toEqual([]);
            expect(result.poster_url).toBeNull();
        });

        test('SVC-R18-013: getMovie处理tags字符串格式', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            settingsService.setR18Config({ dbUrl: 'postgresql://localhost:5432/test' });
            
            const mockRows = [
                {
                    movie_id: 'TEST001',
                    title: '测试电影',
                    tags: '动作,剧情,爱情'
                }
            ];

            service.query = jest.fn().mockResolvedValue(mockRows);

            const result = await service.getMovie('TEST001');
            
            expect(result.tags).toEqual(['动作', '剧情', '爱情']);
        });

        test('SVC-R18-014: getMovie处理actors和directors字符串格式', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            settingsService.setR18Config({ dbUrl: 'postgresql://localhost:5432/test' });
            
            const mockRows = [
                {
                    movie_id: 'TEST001',
                    title: '测试电影',
                    actors: '演员A,演员B,演员C',
                    directors: '导演A,导演B'
                }
            ];

            service.query = jest.fn().mockResolvedValue(mockRows);

            const result = await service.getMovie('TEST001');
            
            expect(result.actors).toHaveLength(3);
            expect(result.actors[0].name).toBe('演员A');
            expect(result.actors[1].name).toBe('演员B');
            expect(result.actors[2].name).toBe('演员C');
            expect(result.directors).toHaveLength(2);
            expect(result.directors[0].name).toBe('导演A');
            expect(result.directors[1].name).toBe('导演B');
        });
    });

    describe('searchPerson', () => {
        test('SVC-R18-015: 未配置dbUrl抛出错误', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            await expect(service.searchPerson('演员')).rejects.toThrow('R18 database URL not configured');
        });

        test('SVC-R18-016: 空演员名抛出错误', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            settingsService.setR18Config({ dbUrl: 'postgresql://localhost:5432/test' });
            await expect(service.searchPerson('')).rejects.toThrow('Actor name is required');
        });

        test('SVC-R18-017: null演员名抛出错误', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            settingsService.setR18Config({ dbUrl: 'postgresql://localhost:5432/test' });
            await expect(service.searchPerson(null)).rejects.toThrow('Actor name is required');
        });

        test('SVC-R18-018: searchPerson响应数据格式正确', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            settingsService.setR18Config({ dbUrl: 'postgresql://localhost:5432/test' });
            
            const mockRows = [
                {
                    actor_id: 'ACT001',
                    actor_name: '演员A',
                    actor_profile_url: 'http://example.com/profile.jpg'
                }
            ];

            service.query = jest.fn().mockResolvedValue(mockRows);

            const result = await service.searchPerson('演员A');
            
            expect(result).toBeInstanceOf(Array);
            expect(result.length).toBe(1);
            expect(result[0]).toHaveProperty('actor_id', 'ACT001');
            expect(result[0]).toHaveProperty('actor_name', '演员A');
            expect(result[0]).toHaveProperty('actor_profile_url', 'http://example.com/profile.jpg');
        });

        test('SVC-R18-019: searchPerson空结果返回空数组', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            settingsService.setR18Config({ dbUrl: 'postgresql://localhost:5432/test' });
            
            service.query = jest.fn().mockResolvedValue([]);

            const result = await service.searchPerson('notexist');
            expect(result).toEqual([]);
        });
    });

    describe('getPerson', () => {
        test('SVC-R18-020: 未配置dbUrl抛出错误', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            await expect(service.getPerson('ACT001')).rejects.toThrow('R18 database URL not configured');
        });

        test('SVC-R18-021: 空actorId抛出错误', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            settingsService.setR18Config({ dbUrl: 'postgresql://localhost:5432/test' });
            await expect(service.getPerson(null)).rejects.toThrow('Actor ID is required');
        });

        test('SVC-R18-022: getPerson无IMDB ID时返回基本信息', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            settingsService.setR18Config({ dbUrl: 'postgresql://localhost:5432/test' });
            
            const mockWikidataResponse = {
                results: {
                    bindings: [
                        {
                            itemLabel: { value: '演员A' },
                            birthday: { value: '1990-01-01T00:00:00Z' },
                            height: { value: '160' },
                            image: { value: 'http://example.com/profile.jpg' }
                        }
                    ]
                }
            };

            service.makeHttpRequest = jest.fn().mockResolvedValue(mockWikidataResponse);

            const result = await service.getPerson('ACT001');
            
            expect(result).toHaveProperty('name', '演员A');
            expect(result).toHaveProperty('birthday', '1990-01-01');
            expect(result).toHaveProperty('memo', '160');
            expect(result).toHaveProperty('profile_url', 'http://example.com/profile.jpg');
        });

        test('SVC-R18-023: getPerson无查询结果返回空信息', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            settingsService.setR18Config({ dbUrl: 'postgresql://localhost:5432/test' });
            
            const mockWikidataResponse = {
                results: {
                    bindings: []
                }
            };

            service.makeHttpRequest = jest.fn().mockResolvedValue(mockWikidataResponse);

            const result = await service.getPerson('NOTEXIST');
            
            expect(result).toHaveProperty('name', '');
            expect(result).toHaveProperty('birthday', '');
            expect(result).toHaveProperty('memo', '');
            expect(result).toHaveProperty('profile_url', null);
        });

        test('SVC-R18-024: getPerson有IMDB ID时调用TMDB服务', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            settingsService.setR18Config({ dbUrl: 'postgresql://localhost:5432/test' });
            settingsService.setTmdbConfig({ token: 'test-token' });
            
            const mockWikidataResponse = {
                results: {
                    bindings: [
                        {
                            itemLabel: { value: '演员A' },
                            birthday: { value: '1990-01-01T00:00:00Z' },
                            height: { value: '160' },
                            image: { value: 'http://example.com/profile.jpg' },
                            imdbId: { value: 'nm123456' }
                        }
                    ]
                }
            };

            const mockTmdbResponse = {
                name: '演员A-TMDB',
                birthday: '1990-01-01',
                biography: '演员简介',
                profile_path: '/profile.jpg'
            };

            service.makeHttpRequest = jest.fn().mockResolvedValue(mockWikidataResponse);
            tmdbAdapterService.makeRequest = jest.fn().mockResolvedValue(mockTmdbResponse);

            const result = await service.getPerson('ACT001');
            
            expect(result).toHaveProperty('name', '演员A-TMDB');
            expect(result).toHaveProperty('birthday', '1990-01-01');
            expect(result).toHaveProperty('memo', '演员简介');
            expect(result).toHaveProperty('profile_url', 'https://image.tmdb.org/t/p/original/profile.jpg');
        });

        test('SVC-R18-025: getPerson处理缺失字段', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            settingsService.setR18Config({ dbUrl: 'postgresql://localhost:5432/test' });
            
            const mockWikidataResponse = {
                results: {
                    bindings: [
                        {}
                    ]
                }
            };

            service.makeHttpRequest = jest.fn().mockResolvedValue(mockWikidataResponse);

            const result = await service.getPerson('ACT001');
            
            expect(result).toHaveProperty('name', '');
            expect(result).toHaveProperty('birthday', '');
            expect(result).toHaveProperty('memo', '');
            expect(result).toHaveProperty('profile_url', null);
        });
    });

    describe('makeHttpRequest', () => {
        test('SVC-R18-026: 无效URL抛出错误', async () => {
            await expect(service.makeHttpRequest('invalid-url')).rejects.toThrow();
        });
    });

    describe('SQL注入防护', () => {
        test('SVC-R18-027: searchMovie处理单引号', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            settingsService.setR18Config({ dbUrl: 'postgresql://localhost:5432/test' });
            
            service.query = jest.fn().mockResolvedValue([]);
            
            await service.searchMovie("test'keyword");
            
            expect(service.query).toHaveBeenCalled();
            const sql = service.query.mock.calls[0][0];
            expect(sql).toContain("test''keyword");
        });

        test('SVC-R18-028: getMovie处理单引号', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            settingsService.setR18Config({ dbUrl: 'postgresql://localhost:5432/test' });
            
            service.query = jest.fn().mockResolvedValue([]);
            
            await service.getMovie("test'id");
            
            expect(service.query).toHaveBeenCalled();
            const sql = service.query.mock.calls[0][0];
            expect(sql).toContain("test''id");
        });

        test('SVC-R18-029: searchPerson处理单引号', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            settingsService.setR18Config({ dbUrl: 'postgresql://localhost:5432/test' });
            
            service.query = jest.fn().mockResolvedValue([]);
            
            await service.searchPerson("test'actor");
            
            expect(service.query).toHaveBeenCalled();
            const sql = service.query.mock.calls[0][0];
            expect(sql).toContain("test''actor");
        });
    });
});
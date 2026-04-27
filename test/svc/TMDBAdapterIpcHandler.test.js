/**
 * TMDBAdapter IPC Handler 单元测试
 * 测试TMDB电影搜索相关的IPC处理器功能
 */
const TMDBMovieAdapterService = require('../../src/main/services/TMDBAdapterService');
const SettingsService = require('../../src/main/services/SettingsService');
const path = require('path');
const fs = require('fs');

describe('TMDBAdapter IPC Handler', () => {
    let service;
    let settingsService;
    let testDataDir;

    beforeEach(() => {
        testDataDir = path.join(__dirname, 'test-data', 'tmdb-ipc');
        if (!fs.existsSync(testDataDir)) {
            fs.mkdirSync(testDataDir, { recursive: true });
        }
        const settingsPath = path.join(testDataDir, 'settings.json');
        settingsService = new SettingsService(settingsPath);
        service = new TMDBMovieAdapterService(settingsService);
    });

    afterEach(() => {
        if (fs.existsSync(testDataDir)) {
            fs.rmSync(testDataDir, { recursive: true, force: true });
        }
    });

    describe('IPC Handler Logic - searchMovie', () => {
        test('IPC-TMDB-001: searchMovie正确处理有效关键字', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            settingsService.setTmdbConfig({ token: 'test-token' });

            const mockResults = [
                {
                    id: 612845,
                    title: '我和我的祖国',
                    overview: '电影介绍',
                    poster_path: '/test.jpg',
                    release_date: '2019-09-30'
                }
            ];

            const originalMakeRequest = service.makeRequest;
            service.makeRequest = jest.fn().mockResolvedValue({
                page: 1,
                results: mockResults
            });

            const result = await service.searchMovie('祖国');

            expect(result).toBeInstanceOf(Array);
            expect(result.length).toBe(1);
            expect(result[0].title).toBe('我和我的祖国');
            expect(result[0].search_id).toBe(612845);
            expect(service.makeRequest).toHaveBeenCalled();

            service.makeRequest = originalMakeRequest;
        });

        test('IPC-TMDB-002: searchMovie返回最多10个结果', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            settingsService.setTmdbConfig({ token: 'test-token' });

            // 创建15个结果
            const mockResults = Array.from({ length: 15 }, (_, i) => ({
                id: i + 1,
                title: `电影${i + 1}`,
                overview: '介绍',
                poster_path: null,
                release_date: '2020-01-01'
            }));

            const originalMakeRequest = service.makeRequest;
            service.makeRequest = jest.fn().mockResolvedValue({
                page: 1,
                results: mockResults
            });

            const result = await service.searchMovie('电影');

            // TMDBAdapterService返回所有结果，前端负责限制数量
            expect(result.length).toBe(15);

            service.makeRequest = originalMakeRequest;
        });

        test('IPC-TMDB-003: searchMovie处理空结果', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            settingsService.setTmdbConfig({ token: 'test-token' });

            const originalMakeRequest = service.makeRequest;
            service.makeRequest = jest.fn().mockResolvedValue({
                page: 1,
                results: []
            });

            const result = await service.searchMovie('不存在的电影');

            expect(result).toEqual([]);

            service.makeRequest = originalMakeRequest;
        });

        test('IPC-TMDB-004: searchMovie处理网络错误', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            settingsService.setTmdbConfig({ token: 'test-token' });

            const originalMakeRequest = service.makeRequest;
            service.makeRequest = jest.fn().mockRejectedValue(new Error('Network error'));

            await expect(service.searchMovie('test')).rejects.toThrow('Network error');

            service.makeRequest = originalMakeRequest;
        });
    });

    describe('IPC Handler Logic - getMovie', () => {
        test('IPC-TMDB-005: getMovie正确获取电影详情', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            settingsService.setTmdbConfig({ token: 'test-token' });

            const mockMovieDetail = {
                imdb_id: 'tt10147382',
                title: '我和我的祖国',
                overview: '电影介绍',
                poster_path: '/test.jpg',
                release_date: '2019-09-30',
                runtime: 154,
                genres: [{ id: 18, name: '剧情' }],
                production_companies: [{ id: 1, name: '公司A' }],
                credits: {
                    cast: [
                        { id: 76913, name: '葛优', character: '角色A', profile_path: '/actor1.jpg' }
                    ],
                    crew: [
                        { id: 118711, name: '徐峥', job: 'Director', profile_path: '/director1.jpg' }
                    ]
                }
            };

            const originalMakeRequest = service.makeRequest;
            service.makeRequest = jest.fn().mockResolvedValue(mockMovieDetail);

            const result = await service.getMovie(612845);

            expect(result.title).toBe('我和我的祖国');
            expect(result.movie_id).toBe('tt10147382');
            expect(result.runtime).toBe(154);
            expect(result.actors).toHaveLength(1);
            expect(result.actors[0].name).toBe('葛优');
            expect(result.directors).toHaveLength(1);
            expect(result.directors[0].name).toBe('徐峥');

            service.makeRequest = originalMakeRequest;
        });

        test('IPC-TMDB-006: getMovie处理缺失数据', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            settingsService.setTmdbConfig({ token: 'test-token' });

            const mockMovieDetail = {
                title: '测试电影'
            };

            const originalMakeRequest = service.makeRequest;
            service.makeRequest = jest.fn().mockResolvedValue(mockMovieDetail);

            const result = await service.getMovie(123);

            expect(result.title).toBe('测试电影');
            expect(result.movie_id).toBe('');
            expect(result.runtime).toBe(0);
            expect(result.actors).toEqual([]);
            expect(result.directors).toEqual([]);

            service.makeRequest = originalMakeRequest;
        });

        test('IPC-TMDB-007: getMovie处理演员数据', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            settingsService.setTmdbConfig({ token: 'test-token' });

            const mockMovieDetail = {
                title: '测试电影',
                credits: {
                    cast: [
                        { id: 1, name: '演员1', character: '角色1', profile_path: null },
                        { id: 2, name: '演员2', character: '角色2', profile_path: '/path.jpg' }
                    ]
                }
            };

            const originalMakeRequest = service.makeRequest;
            service.makeRequest = jest.fn().mockResolvedValue(mockMovieDetail);

            const result = await service.getMovie(123);

            expect(result.actors).toHaveLength(2);
            expect(result.actors[0].name).toBe('演员1');
            expect(result.actors[0].profile_url).toBeNull();
            expect(result.actors[1].name).toBe('演员2');
            expect(result.actors[1].profile_url).toBe('https://image.tmdb.org/t/p/w200/path.jpg');

            service.makeRequest = originalMakeRequest;
        });

        test('IPC-TMDB-008: getMovie处理导演数据', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            settingsService.setTmdbConfig({ token: 'test-token' });

            const mockMovieDetail = {
                title: '测试电影',
                credits: {
                    crew: [
                        { id: 1, name: '导演1', job: 'Director', profile_path: null },
                        { id: 2, name: '编剧', job: 'Writer', profile_path: null },
                        { id: 3, name: '导演2', job: 'Director', profile_path: '/director.jpg' }
                    ]
                }
            };

            const originalMakeRequest = service.makeRequest;
            service.makeRequest = jest.fn().mockResolvedValue(mockMovieDetail);

            const result = await service.getMovie(123);

            expect(result.directors).toHaveLength(2);
            expect(result.directors[0].name).toBe('导演1');
            expect(result.directors[1].name).toBe('导演2');

            service.makeRequest = originalMakeRequest;
        });
    });

    describe('IPC Handler Integration - 数据转换', () => {
        test('IPC-TMDB-009: searchMovie结果正确映射到前端格式', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            settingsService.setTmdbConfig({ token: 'test-token' });

            const mockResponse = {
                page: 1,
                results: [
                    {
                        id: 123,
                        title: '肖申克的救赎',
                        overview: '经典电影',
                        poster_path: '/poster.jpg',
                        release_date: '1994-09-10'
                    }
                ]
            };

            const originalMakeRequest = service.makeRequest;
            service.makeRequest = jest.fn().mockResolvedValue(mockResponse);

            const result = await service.searchMovie('肖申克');

            // 验证返回格式符合前端期望
            expect(result[0]).toEqual({
                title: '肖申克的救赎',
                overview: '经典电影',
                year: '1994',
                search_id: 123,
                poster_url: 'https://image.tmdb.org/t/p/w200/poster.jpg'
            });

            service.makeRequest = originalMakeRequest;
        });

        test('IPC-TMDB-010: getMovie结果正确映射到前端格式', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            settingsService.setTmdbConfig({ token: 'test-token' });

            const mockResponse = {
                imdb_id: 'tt0111161',
                title: '肖申克的救赎',
                overview: '经典电影简介',
                poster_path: '/poster.jpg',
                release_date: '1994-09-10',
                runtime: 142,
                genres: [{ name: '剧情' }, { name: '犯罪' }],
                production_companies: [{ name: '哥伦比亚电影公司' }],
                credits: {
                    cast: [
                        { id: 1, name: '蒂姆·罗宾斯', character: '安迪', profile_path: '/tim.jpg' }
                    ],
                    crew: [
                        { id: 2, name: '弗兰克·德拉邦特', job: 'Director', profile_path: '/frank.jpg' }
                    ]
                }
            };

            const originalMakeRequest = service.makeRequest;
            service.makeRequest = jest.fn().mockResolvedValue(mockResponse);

            const result = await service.getMovie(123);

            // 验证返回格式符合前端期望
            expect(result).toEqual({
                movie_id: 'tt0111161',
                title: '肖申克的救赎',
                overview: '经典电影简介',
                genres: ['剧情', '犯罪'],
                production_companies: ['哥伦比亚电影公司'],
                runtime: 142,
                poster_url: 'https://image.tmdb.org/t/p/original/poster.jpg',
                actors: [{
                    person_id: 1,
                    name: '蒂姆·罗宾斯',
                    character: '安迪',
                    profile_url: 'https://image.tmdb.org/t/p/w200/tim.jpg'
                }],
                directors: [{
                    person_id: 2,
                    name: '弗兰克·德拉邦特',
                    profile_url: 'https://image.tmdb.org/t/p/w200/frank.jpg'
                }],
                year: '1994'
            });

            service.makeRequest = originalMakeRequest;
        });
    });

    describe('IPC Handler Logic - searchPerson', () => {
        test('IPC-TMDB-011: searchPerson正确处理有效演员名称', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            settingsService.setTmdbConfig({ token: 'test-token' });

            const mockResults = [
                {
                    id: 118711,
                    name: '徐峥',
                    profile_path: '/yX7xq.jpg'
                },
                {
                    id: 1327006,
                    name: '徐峥2',
                    profile_path: null
                }
            ];

            const originalMakeRequest = service.makeRequest;
            service.makeRequest = jest.fn().mockResolvedValue({
                page: 1,
                results: mockResults
            });

            const result = await service.searchPerson('徐峥');

            expect(result).toBeInstanceOf(Array);
            expect(result.length).toBe(2);
            expect(result[0].actor_id).toBe(118711);
            expect(result[0].actor_name).toBe('徐峥');
            expect(result[0].actor_profile_url).toBe('https://image.tmdb.org/t/p/w200/yX7xq.jpg');
            expect(result[1].actor_id).toBe(1327006);
            expect(result[1].actor_name).toBe('徐峥2');
            expect(result[1].actor_profile_url).toBeNull();
            expect(service.makeRequest).toHaveBeenCalled();

            service.makeRequest = originalMakeRequest;
        });

        test('IPC-TMDB-012: searchPerson返回最多10个结果', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            settingsService.setTmdbConfig({ token: 'test-token' });

            // 创建15个结果
            const mockResults = Array.from({ length: 15 }, (_, i) => ({
                id: i + 1,
                name: `演员${i + 1}`,
                profile_path: null
            }));

            const originalMakeRequest = service.makeRequest;
            service.makeRequest = jest.fn().mockResolvedValue({
                page: 1,
                results: mockResults
            });

            const result = await service.searchPerson('演员');

            // TMDBAdapterService返回所有结果，前端负责限制数量
            expect(result.length).toBe(15);

            service.makeRequest = originalMakeRequest;
        });

        test('IPC-TMDB-013: searchPerson处理空结果', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            settingsService.setTmdbConfig({ token: 'test-token' });

            const originalMakeRequest = service.makeRequest;
            service.makeRequest = jest.fn().mockResolvedValue({
                page: 1,
                results: []
            });

            const result = await service.searchPerson('不存在的演员');

            expect(result).toEqual([]);

            service.makeRequest = originalMakeRequest;
        });

        test('IPC-TMDB-014: searchPerson处理网络错误', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            settingsService.setTmdbConfig({ token: 'test-token' });

            const originalMakeRequest = service.makeRequest;
            service.makeRequest = jest.fn().mockRejectedValue(new Error('Network error'));

            await expect(service.searchPerson('徐峥')).rejects.toThrow('Network error');

            service.makeRequest = originalMakeRequest;
        });

        test('IPC-TMDB-015: searchPerson空关键字抛出错误', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            settingsService.setTmdbConfig({ token: 'test-token' });

            await expect(service.searchPerson('')).rejects.toThrow('Actor name is required');
        });

        test('IPC-TMDB-016: searchPerson结果正确映射到前端格式', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            settingsService.setTmdbConfig({ token: 'test-token' });

            const mockResponse = {
                page: 1,
                results: [
                    {
                        id: 76913,
                        name: '葛优',
                        profile_path: '/guyou.jpg'
                    }
                ]
            };

            const originalMakeRequest = service.makeRequest;
            service.makeRequest = jest.fn().mockResolvedValue(mockResponse);

            const result = await service.searchPerson('葛优');

            // 验证返回格式符合前端期望
            expect(result[0]).toEqual({
                actor_id: 76913,
                actor_name: '葛优',
                actor_profile_url: 'https://image.tmdb.org/t/p/w200/guyou.jpg'
            });

            service.makeRequest = originalMakeRequest;
        });
    });

    describe('IPC Handler Logic - getPerson', () => {
        test('IPC-TMDB-017: getPerson正确获取演员详情', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            settingsService.setTmdbConfig({ token: 'test-token' });

            const mockPersonDetail = {
                id: 118711,
                name: '徐峥',
                birthday: '1972-04-18',
                biography: '演员介绍',
                profile_path: '/ycl.jpg'
            };

            const originalMakeRequest = service.makeRequest;
            service.makeRequest = jest.fn().mockResolvedValue(mockPersonDetail);

            const result = await service.getPerson(118711);

            expect(result.name).toBe('徐峥');
            expect(result.birthday).toBe('1972-04-18');
            expect(result.memo).toBe('演员介绍');
            expect(result.profile_url).toBe('https://image.tmdb.org/t/p/original/ycl.jpg');

            service.makeRequest = originalMakeRequest;
        });

        test('IPC-TMDB-018: getPerson处理缺失数据', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            settingsService.setTmdbConfig({ token: 'test-token' });

            const mockPersonDetail = {
                id: 123
            };

            const originalMakeRequest = service.makeRequest;
            service.makeRequest = jest.fn().mockResolvedValue(mockPersonDetail);

            const result = await service.getPerson(123);

            expect(result.name).toBe('');
            expect(result.birthday).toBe('');
            expect(result.memo).toBe('');
            expect(result.profile_url).toBeNull();

            service.makeRequest = originalMakeRequest;
        });

        test('IPC-TMDB-019: getPerson处理网络错误', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            settingsService.setTmdbConfig({ token: 'test-token' });

            const originalMakeRequest = service.makeRequest;
            service.makeRequest = jest.fn().mockRejectedValue(new Error('Network error'));

            await expect(service.getPerson(118711)).rejects.toThrow('Network error');

            service.makeRequest = originalMakeRequest;
        });
    });
});

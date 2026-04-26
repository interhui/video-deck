/**
 * TMDBMovieAdapterService 单元测试
 */
const TMDBMovieAdapterService = require('../../src/main/services/TMDBAdapterService');
const SettingsService = require('../../src/main/services/SettingsService');
const path = require('path');
const fs = require('fs');

describe('TMDBMovieAdapterService', () => {
    let service;
    let settingsService;
    let testDataDir;

    beforeEach(() => {
        testDataDir = path.join(__dirname, 'test-data', 'tmdb');
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

    describe('getTmdbConfig', () => {
        test('SVC-TMDB-001: 返回默认TMDB配置', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            const config = service.getTmdbConfig();
            expect(config.url).toBe('api.themoviedb.org');
            expect(config.token).toBe('');
            expect(config.language).toBe('zh-CN');
        });

        test('SVC-TMDB-002: 返回自定义TMDB配置', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            settingsService.setTmdbConfig({
                url: 'custom.api.themoviedb.org',
                token: 'test-token',
                language: 'en-US'
            });
            const config = service.getTmdbConfig();
            expect(config.url).toBe('custom.api.themoviedb.org');
            expect(config.token).toBe('test-token');
            expect(config.language).toBe('en-US');
        });
    });

    describe('buildImageUrl', () => {
        test('SVC-TMDB-003: 构建原始尺寸图片URL', () => {
            const url = service.buildImageUrl('/test.jpg', 'original');
            expect(url).toBe('https://image.tmdb.org/t/p/original/test.jpg');
        });

        test('SVC-TMDB-004: 构建W200缩略图URL', () => {
            const url = service.buildImageUrl('/test.jpg', 'w200');
            expect(url).toBe('https://image.tmdb.org/t/p/w200/test.jpg');
        });

        test('SVC-TMDB-005: 空路径返回null', () => {
            const url = service.buildImageUrl(null);
            expect(url).toBeNull();
        });

        test('SVC-TMDB-006: 默认使用原始尺寸', () => {
            const url = service.buildImageUrl('/test.jpg');
            expect(url).toBe('https://image.tmdb.org/t/p/original/test.jpg');
        });
    });

    describe('searchMovie', () => {
        test('SVC-TMDB-007: 未配置token抛出错误', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            await expect(service.searchMovie('test')).rejects.toThrow('TMDB token not configured');
        });

        test('SVC-TMDB-008: 空关键字抛出错误', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            settingsService.setTmdbConfig({ token: 'test-token' });
            await expect(service.searchMovie('')).rejects.toThrow('Keyword is required');
        });

        test('SVC-TMDB-009: null关键字抛出错误', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            settingsService.setTmdbConfig({ token: 'test-token' });
            await expect(service.searchMovie(null)).rejects.toThrow('Keyword is required');
        });
    });

    describe('getMovie', () => {
        test('SVC-TMDB-010: 未配置token抛出错误', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            await expect(service.getMovie(123)).rejects.toThrow('TMDB token not configured');
        });

        test('SVC-TMDB-011: 空searchId抛出错误', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            settingsService.setTmdbConfig({ token: 'test-token' });
            await expect(service.getMovie(null)).rejects.toThrow('Search ID is required');
        });
    });

    describe('getPerson', () => {
        test('SVC-TMDB-012: 未配置token抛出错误', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            await expect(service.getPerson(123)).rejects.toThrow('TMDB token not configured');
        });

        test('SVC-TMDB-013: 空personId抛出错误', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            settingsService.setTmdbConfig({ token: 'test-token' });
            await expect(service.getPerson(null)).rejects.toThrow('Person ID is required');
        });
    });

    describe('makeRequest', () => {
        test('SVC-TMDB-014: 无效URL抛出错误', async () => {
            await expect(service.makeRequest('invalid-url', 'test-token')).rejects.toThrow();
        });
    });

    describe('数据格式转换', () => {
        test('SVC-TMDB-015: searchMovie响应数据格式正确', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            settingsService.setTmdbConfig({ token: 'test-token' });
            
            const mockResponse = {
                page: 1,
                results: [
                    {
                        id: 612845,
                        title: '我和我的祖国',
                        overview: '电影介绍',
                        poster_path: '/test.jpg',
                        release_date: '2019-09-30'
                    }
                ]
            };

            const originalMakeRequest = service.makeRequest;
            service.makeRequest = jest.fn().mockResolvedValue(mockResponse);

            const result = await service.searchMovie('祖国');
            
            expect(result).toBeInstanceOf(Array);
            expect(result.length).toBe(1);
            expect(result[0]).toHaveProperty('title', '我和我的祖国');
            expect(result[0]).toHaveProperty('overview', '电影介绍');
            expect(result[0]).toHaveProperty('year', '2019');
            expect(result[0]).toHaveProperty('search_id', 612845);
            expect(result[0]).toHaveProperty('poster_url', 'https://image.tmdb.org/t/p/w200/test.jpg');

            service.makeRequest = originalMakeRequest;
        });

        test('SVC-TMDB-016: getMovie响应数据格式正确', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            settingsService.setTmdbConfig({ token: 'test-token' });
            
            const mockResponse = {
                imdb_id: 'tt10147382',
                title: '我和我的祖国',
                overview: '电影介绍',
                poster_path: '/test.jpg',
                release_date: '2019-09-30',
                runtime: 154,
                genres: [
                    { id: 18, name: '剧情' },
                    { id: 36, name: '历史' }
                ],
                production_companies: [
                    { id: 1, name: '公司A' },
                    { id: 2, name: '公司B' }
                ],
                credits: {
                    cast: [
                        {
                            id: 76913,
                            name: '葛优',
                            character: '角色A',
                            profile_path: '/actor1.jpg'
                        }
                    ],
                    crew: [
                        {
                            id: 118711,
                            name: '徐峥',
                            job: 'Director',
                            profile_path: '/director1.jpg'
                        }
                    ]
                }
            };

            const originalMakeRequest = service.makeRequest;
            service.makeRequest = jest.fn().mockResolvedValue(mockResponse);

            const result = await service.getMovie(612845);
            
            expect(result).toHaveProperty('movie_id', 'tt10147382');
            expect(result).toHaveProperty('title', '我和我的祖国');
            expect(result).toHaveProperty('overview', '电影介绍');
            expect(result).toHaveProperty('runtime', 154);
            expect(result).toHaveProperty('year', '2019');
            expect(result.genres).toEqual(['剧情', '历史']);
            expect(result.production_companies).toEqual(['公司A', '公司B']);
            expect(result.poster_url).toBe('https://image.tmdb.org/t/p/original/test.jpg');
            expect(result.cast).toHaveLength(1);
            expect(result.cast[0]).toEqual({
                person_id: 76913,
                name: '葛优',
                character: '角色A',
                profile_url: 'https://image.tmdb.org/t/p/w200/actor1.jpg'
            });
            expect(result.directors).toHaveLength(1);
            expect(result.directors[0]).toEqual({
                person_id: 118711,
                name: '徐峥',
                profile_url: 'https://image.tmdb.org/t/p/w200/director1.jpg'
            });

            service.makeRequest = originalMakeRequest;
        });

        test('SVC-TMDB-017: getPerson响应数据格式正确', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            settingsService.setTmdbConfig({ token: 'test-token' });
            
            const mockResponse = {
                id: 118711,
                name: '徐峥',
                birthday: '1972-04-18',
                biography: '演员介绍',
                profile_path: '/yclQtqxPnlp7H4seiKltNfJjlrc.jpg'
            };

            const originalMakeRequest = service.makeRequest;
            service.makeRequest = jest.fn().mockResolvedValue(mockResponse);

            const result = await service.getPerson(118711);
            
            expect(result).toHaveProperty('name', '徐峥');
            expect(result).toHaveProperty('birthday', '1972-04-18');
            expect(result).toHaveProperty('biography', '演员介绍');
            expect(result).toHaveProperty('profile_url', 'https://image.tmdb.org/t/p/original/yclQtqxPnlp7H4seiKltNfJjlrc.jpg');

            service.makeRequest = originalMakeRequest;
        });

        test('SVC-TMDB-018: searchMovie空结果返回空数组', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            settingsService.setTmdbConfig({ token: 'test-token' });
            
            const mockResponse = {
                page: 1,
                results: []
            };

            const originalMakeRequest = service.makeRequest;
            service.makeRequest = jest.fn().mockResolvedValue(mockResponse);

            const result = await service.searchMovie('notexist');
            expect(result).toEqual([]);

            service.makeRequest = originalMakeRequest;
        });

        test('SVC-TMDB-019: getMovie处理缺失数据', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            settingsService.setTmdbConfig({ token: 'test-token' });
            
            const mockResponse = {
                title: '测试电影'
            };

            const originalMakeRequest = service.makeRequest;
            service.makeRequest = jest.fn().mockResolvedValue(mockResponse);

            const result = await service.getMovie(123);
            
            expect(result).toHaveProperty('movie_id', '');
            expect(result).toHaveProperty('title', '测试电影');
            expect(result).toHaveProperty('overview', '');
            expect(result).toHaveProperty('runtime', 0);
            expect(result).toHaveProperty('year', '');
            expect(result.genres).toEqual([]);
            expect(result.production_companies).toEqual([]);
            expect(result.cast).toEqual([]);
            expect(result.directors).toEqual([]);

            service.makeRequest = originalMakeRequest;
        });

        test('SVC-TMDB-020: getPerson处理缺失数据', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            settingsService.setTmdbConfig({ token: 'test-token' });
            
            const mockResponse = {
                id: 123
            };

            const originalMakeRequest = service.makeRequest;
            service.makeRequest = jest.fn().mockResolvedValue(mockResponse);

            const result = await service.getPerson(123);
            
            expect(result).toHaveProperty('name', '');
            expect(result).toHaveProperty('birthday', '');
            expect(result).toHaveProperty('biography', '');
            expect(result).toHaveProperty('profile_url', null);

            service.makeRequest = originalMakeRequest;
        });
    });
});
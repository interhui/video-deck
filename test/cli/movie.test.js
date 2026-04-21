/**
 * CLI Movie Commands Tests
 */

const path = require('path');

// Mock console methods
let consoleLogSpy;
let consoleErrorSpy;

beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
});

afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
});

// Test data paths
const TEST_DATA_DIR = path.join(__dirname, 'test-data');
const MOVIES_DIR = path.join(TEST_DATA_DIR, 'movies');

// Mock services - using object with jest.fn() created before jest.mock
const mockMovieService = {
    getAllMovies: jest.fn(),
    getMoviesByCategory: jest.fn(),
    searchMovies: jest.fn(),
    getMovieDetail: jest.fn(),
    addMovie: jest.fn(),
    refreshCache: jest.fn(),
    getStats: jest.fn(),
    isCacheInitialized: jest.fn()
};

const mockFileService = {
    readMovieNfo: jest.fn(),
    writeMovieNfo: jest.fn(),
    deleteDir: jest.fn(),
    fileExists: jest.fn()
};

const mockMovieCacheService = {
    removeMovieFromCache: jest.fn()
};

const mockIndexService = {
    deleteMovieFromIndex: jest.fn()
};

const mockSettingsService = {
    getSettings: jest.fn()
};

const mockCategoryService = {
    loadCategories: jest.fn()
};

// Create mocks and export via global
const mockServiceExports = {
    movieService: mockMovieService,
    fileService: mockFileService,
    movieCacheService: mockMovieCacheService,
    indexService: mockIndexService,
    settingsService: mockSettingsService,
    categoryService: mockCategoryService,
    getMoviesDir: () => MOVIES_DIR,
    getMovieboxDir: () => path.join(TEST_DATA_DIR, 'boxes')
};

// Set up global mock before importing commands
global.__CLI_MOCK_SERVICES__ = mockServiceExports;

// Mock service-loader
jest.mock('../../src/cli/utils/service-loader', () => ({
    initializeServices: jest.fn().mockResolvedValue(global.__CLI_MOCK_SERVICES__)
}));

// Import the commands
const movieCommands = require('../../src/cli/commands/movie');

describe('CLI Movie Commands', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockSettingsService.getSettings.mockReturnValue({
            library: { moviesDir: MOVIES_DIR }
        });
    });

    describe('movie list', () => {
        test('CLI-MOVIE-LIST-001: 列出所有电影', async () => {
            const mockMovies = [
                { id: 'movie-test1', name: 'Test Movie 1', category: 'movie', userRating: 5, status: 'unwatched' },
                { id: 'movie-test2', name: 'Test Movie 2', category: 'movie', userRating: 3, status: 'watching' }
            ];
            mockMovieService.getAllMovies.mockResolvedValue(mockMovies);

            const services = {
                movieService: mockMovieService,
                getMoviesDir: () => MOVIES_DIR
            };

            await movieCommands.listMovies(services, {});

            expect(mockMovieService.getAllMovies).toHaveBeenCalledWith(MOVIES_DIR, expect.any(Object));
            expect(consoleLogSpy).toHaveBeenCalled();
        });

        test('CLI-MOVIE-LIST-002: 按分类筛选', async () => {
            mockMovieService.getMoviesByCategory.mockResolvedValue([
                { id: 'movie-test1', name: 'Test Movie', category: 'movie', userRating: 5, status: 'unwatched' }
            ]);

            const services = {
                movieService: mockMovieService,
                getMoviesDir: () => MOVIES_DIR
            };

            await movieCommands.listMovies(services, { category: 'movie' });

            expect(mockMovieService.getMoviesByCategory).toHaveBeenCalledWith('movie', MOVIES_DIR, expect.any(Object));
        });

        test('CLI-MOVIE-LIST-003: 按标签筛选', async () => {
            mockMovieService.getAllMovies.mockResolvedValue([
                { id: 'movie-test1', name: 'Test Movie', category: 'movie', tags: ['action'], userRating: 5 }
            ]);

            const services = {
                movieService: mockMovieService,
                getMoviesDir: () => MOVIES_DIR
            };

            await movieCommands.listMovies(services, { tag: 'action' });

            expect(mockMovieService.getAllMovies).toHaveBeenCalledWith(MOVIES_DIR, expect.objectContaining({ tagId: 'action' }));
        });

        test('CLI-MOVIE-LIST-004: 按状态筛选', async () => {
            mockMovieService.getAllMovies.mockResolvedValue([
                { id: 'movie-test1', name: 'Test Movie', category: 'movie', status: 'watching' }
            ]);

            const services = {
                movieService: mockMovieService,
                getMoviesDir: () => MOVIES_DIR
            };

            await movieCommands.listMovies(services, { status: 'watching' });

            expect(mockMovieService.getAllMovies).toHaveBeenCalled();
        });

        test('CLI-MOVIE-LIST-005: 按排序字段排序', async () => {
            mockMovieService.getAllMovies.mockResolvedValue([
                { id: 'movie-test1', name: 'A Movie', category: 'movie', userRating: 5 },
                { id: 'movie-test2', name: 'B Movie', category: 'movie', userRating: 3 }
            ]);

            const services = {
                movieService: mockMovieService,
                getMoviesDir: () => MOVIES_DIR
            };

            await movieCommands.listMovies(services, { sort: 'name' });

            expect(mockMovieService.getAllMovies).toHaveBeenCalledWith(MOVIES_DIR, expect.objectContaining({ sortBy: 'name' }));
        });

        test('CLI-MOVIE-LIST-006: 降序排序', async () => {
            mockMovieService.getAllMovies.mockResolvedValue([
                { id: 'movie-test2', name: 'B Movie', category: 'movie', userRating: 3 },
                { id: 'movie-test1', name: 'A Movie', category: 'movie', userRating: 5 }
            ]);

            const services = {
                movieService: mockMovieService,
                getMoviesDir: () => MOVIES_DIR
            };

            await movieCommands.listMovies(services, { sort: 'rating', desc: true });

            expect(mockMovieService.getAllMovies).toHaveBeenCalledWith(MOVIES_DIR, expect.objectContaining({ sortOrder: 'desc' }));
        });

        test('CLI-MOVIE-LIST-007: JSON格式输出', async () => {
            const mockMovies = [
                { id: 'movie-test1', name: 'Test Movie', category: 'movie', userRating: 5, status: 'unwatched' }
            ];
            mockMovieService.getAllMovies.mockResolvedValue(mockMovies);

            const services = {
                movieService: mockMovieService,
                getMoviesDir: () => MOVIES_DIR
            };

            await movieCommands.listMovies(services, { format: 'json' });

            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('"id"'));
        });

        test('CLI-MOVIE-LIST-008: 空电影列表（边界条件）', async () => {
            mockMovieService.getAllMovies.mockResolvedValue([]);

            const services = {
                movieService: mockMovieService,
                getMoviesDir: () => MOVIES_DIR
            };

            await movieCommands.listMovies(services, {});

            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('0'));
        });

        test('CLI-MOVIE-LIST-009: 服务异常处理', async () => {
            mockMovieService.getAllMovies.mockRejectedValue(new Error('服务异常'));

            const services = {
                movieService: mockMovieService,
                getMoviesDir: () => MOVIES_DIR
            };

            try {
                await movieCommands.listMovies(services, {});
            } catch (e) {
                expect(e.message).toContain('服务异常');
            }

            expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('失败'));
        });
    });

    describe('movie search', () => {
        test('CLI-MOVIE-SEARCH-001: 关键字搜索', async () => {
            mockMovieService.searchMovies.mockResolvedValue([
                { id: 'movie-test1', name: 'Test Movie', category: 'movie', userRating: 5, status: 'unplayed' }
            ]);

            const services = {
                movieService: mockMovieService,
                getMoviesDir: () => MOVIES_DIR
            };

            await movieCommands.searchMovies(services, 'Test', {});

            expect(mockMovieService.searchMovies).toHaveBeenCalledWith('Test', MOVIES_DIR, expect.any(Object));
        });

        test('CLI-MOVIE-SEARCH-002: 空关键字搜索（边界条件）', async () => {
            mockMovieService.searchMovies.mockResolvedValue([]);

            const services = {
                movieService: mockMovieService,
                getMoviesDir: () => MOVIES_DIR
            };

            await movieCommands.searchMovies(services, '', {});

            expect(mockMovieService.searchMovies).toHaveBeenCalledWith('', MOVIES_DIR, expect.any(Object));
        });

        test('CLI-MOVIE-SEARCH-003: 按分类+标签组合筛选', async () => {
            mockMovieService.searchMovies.mockResolvedValue([
                { id: 'movie-test1', name: 'Test Movie', category: 'movie', tags: ['action'] }
            ]);

            const services = {
                movieService: mockMovieService,
                getMoviesDir: () => MOVIES_DIR
            };

            await movieCommands.searchMovies(services, 'Test', { category: 'movie', tag: 'action' });

            expect(mockMovieService.searchMovies).toHaveBeenCalledWith('Test', MOVIES_DIR, expect.objectContaining({ category: 'movie', tagId: 'action' }));
        });

        test('CLI-MOVIE-SEARCH-004: JSON格式输出', async () => {
            mockMovieService.searchMovies.mockResolvedValue([
                { id: 'movie-test1', name: 'Test Movie', category: 'movie', userRating: 5, status: 'unplayed' }
            ]);

            const services = {
                movieService: mockMovieService,
                getMoviesDir: () => MOVIES_DIR
            };

            await movieCommands.searchMovies(services, 'Test', { format: 'json' });

            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('"id"'));
        });

        test('CLI-MOVIE-SEARCH-005: 搜索无结果（边界条件）', async () => {
            mockMovieService.searchMovies.mockResolvedValue([]);

            const services = {
                movieService: mockMovieService,
                getMoviesDir: () => MOVIES_DIR
            };

            await movieCommands.searchMovies(services, 'NonExist', {});

            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('0'));
        });

        test('CLI-MOVIE-SEARCH-006: 搜索服务异常', async () => {
            mockMovieService.searchMovies.mockRejectedValue(new Error('搜索服务异常'));

            const services = {
                movieService: mockMovieService,
                getMoviesDir: () => MOVIES_DIR
            };

            try {
                await movieCommands.searchMovies(services, 'Test', {});
            } catch (e) {
                expect(e.message).toContain('搜索服务异常');
            }

            expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('失败'));
        });
    });

    describe('movie show', () => {
        test('CLI-MOVIE-SHOW-001: 显示存在的电影', async () => {
            mockMovieService.getMovieDetail.mockResolvedValue({
                id: 'movie-test1',
                name: 'Test Movie',
                category: 'movie',
                userRating: 5,
                status: 'unwatched'
            });

            const services = {
                movieService: mockMovieService,
                getMoviesDir: () => MOVIES_DIR
            };

            await movieCommands.showMovie(services, 'movie-test1');

            expect(mockMovieService.getMovieDetail).toHaveBeenCalledWith('movie-test1', MOVIES_DIR);
            expect(consoleLogSpy).toHaveBeenCalled();
        });

        test('CLI-MOVIE-SHOW-002: 显示不存在的电影', async () => {
            mockMovieService.getMovieDetail.mockResolvedValue(null);

            const services = {
                movieService: mockMovieService,
                getMoviesDir: () => MOVIES_DIR
            };

            await movieCommands.showMovie(services, 'movie-non-exist');

            expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('不存在'));
        });

        test('CLI-MOVIE-SHOW-003: 无效ID格式', async () => {
            const services = {
                movieService: mockMovieService,
                getMoviesDir: () => MOVIES_DIR
            };

            await movieCommands.showMovie(services, 'invalid');

            expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('无效'));
        });

        test('CLI-MOVIE-SHOW-004: 电影ID含特殊字符', async () => {
            mockMovieService.getMovieDetail.mockResolvedValue({
                id: 'movie-test-电影',
                name: 'Test 电影',
                category: 'movie',
                userRating: 5
            });

            const services = {
                movieService: mockMovieService,
                getMoviesDir: () => MOVIES_DIR
            };

            await movieCommands.showMovie(services, 'movie-test-电影');

            expect(mockMovieService.getMovieDetail).toHaveBeenCalledWith('movie-test-电影', MOVIES_DIR);
        });
    });

    describe('movie add', () => {
        test('CLI-MOVIE-ADD-001: 基本添加', async () => {
            mockMovieService.addMovie.mockResolvedValue({
                success: true,
                movie: {
                    id: 'movie-new-movie',
                    name: 'New Movie',
                    category: 'movie',
                    path: path.join(MOVIES_DIR, 'movie', 'new-movie')
                }
            });

            const services = {
                movieService: mockMovieService,
                getMoviesDir: () => MOVIES_DIR
            };

            await movieCommands.addMovie(services, 'New Movie', { category: 'movie' });

            expect(mockMovieService.addMovie).toHaveBeenCalled();
            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('成功'));
        });

        test('CLI-MOVIE-ADD-002: 添加所有可选字段', async () => {
            mockMovieService.addMovie.mockResolvedValue({
                success: true,
                movie: {
                    id: 'movie-new-movie',
                    name: 'New Movie',
                    category: 'movie',
                    director: 'Director Name',
                    actors: 'Actor1, Actor2',
                    studio: 'Studio Name',
                    publishDate: '2024-01-01',
                    tags: ['action', 'comedy'],
                    path: path.join(MOVIES_DIR, 'movie', 'new-movie')
                }
            });

            const services = {
                movieService: mockMovieService,
                getMoviesDir: () => MOVIES_DIR
            };

            await movieCommands.addMovie(services, 'New Movie', {
                category: 'movie',
                director: 'Director Name',
                actors: 'Actor1, Actor2',
                studio: 'Studio Name',
                publishDate: '2024-01-01',
                tags: 'action,comedy',
                description: 'Test description'
            });

            expect(mockMovieService.addMovie).toHaveBeenCalled();
            const callArgs = mockMovieService.addMovie.mock.calls[0][0];
            expect(callArgs.director).toBe('Director Name');
            expect(callArgs.actors).toBe('Actor1, Actor2');
        });

        test('CLI-MOVIE-ADD-003: 缺少分类参数', async () => {
            const services = {
                movieService: mockMovieService,
                getMoviesDir: () => MOVIES_DIR
            };

            await movieCommands.addMovie(services, 'New Movie', {});

            expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('缺少'));
        });

        test('CLI-MOVIE-ADD-004: 带标签参数', async () => {
            mockMovieService.addMovie.mockResolvedValue({
                success: true,
                movie: {
                    id: 'movie-new-movie',
                    name: 'New Movie',
                    category: 'movie',
                    tags: ['action', 'comedy'],
                    path: path.join(MOVIES_DIR, 'movie', 'new-movie')
                }
            });

            const services = {
                movieService: mockMovieService,
                getMoviesDir: () => MOVIES_DIR
            };

            await movieCommands.addMovie(services, 'New Movie', { category: 'movie', tags: 'action,comedy' });

            expect(mockMovieService.addMovie).toHaveBeenCalled();
        });

        test('CLI-MOVIE-ADD-005: 无效分类ID', async () => {
            mockMovieService.addMovie.mockResolvedValue({
                success: false,
                error: '分类不存在'
            });

            const services = {
                movieService: mockMovieService,
                getMoviesDir: () => MOVIES_DIR
            };

            await movieCommands.addMovie(services, 'New Movie', { category: 'invalid-category' });

            expect(mockMovieService.addMovie).toHaveBeenCalled();
        });

        test('CLI-MOVIE-ADD-006: 无效日期格式', async () => {
            mockMovieService.addMovie.mockResolvedValue({
                success: true,
                movie: { id: 'movie-new-movie', name: 'New Movie', category: 'movie' }
            });

            const services = {
                movieService: mockMovieService,
                getMoviesDir: () => MOVIES_DIR
            };

            await movieCommands.addMovie(services, 'New Movie', {
                category: 'movie',
                publishDate: '2024-13-01'
            });

            expect(mockMovieService.addMovie).toHaveBeenCalled();
        });

        test('CLI-MOVIE-ADD-007: 添加服务异常处理', async () => {
            mockMovieService.addMovie.mockRejectedValue(new Error('添加服务异常'));

            const services = {
                movieService: mockMovieService,
                getMoviesDir: () => MOVIES_DIR
            };

            try {
                await movieCommands.addMovie(services, 'New Movie', { category: 'movie' });
            } catch (e) {
                expect(e.message).toContain('添加服务异常');
            }

            expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('失败'));
        });
    });

    describe('movie edit', () => {
        test('CLI-MOVIE-EDIT-001: 修改名称', async () => {
            mockMovieService.getMovieDetail.mockResolvedValue({
                id: 'movie-test1',
                name: 'Test Movie',
                category: 'movie',
                path: path.join(MOVIES_DIR, 'movie', 'test1', 'movie.nfo')
            });
            mockFileService.readMovieNfo.mockResolvedValue({ name: 'Test Movie' });
            mockFileService.writeMovieNfo.mockResolvedValue();
            mockMovieService.refreshCache.mockResolvedValue();

            const services = {
                movieService: mockMovieService,
                fileService: mockFileService,
                getMoviesDir: () => MOVIES_DIR
            };

            await movieCommands.editMovie(services, 'movie-test1', { name: 'New Name' });

            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('已更新'));
        });

        test('CLI-MOVIE-EDIT-002: 修改description字段', async () => {
            mockMovieService.getMovieDetail.mockResolvedValue({
                id: 'movie-test1',
                name: 'Test Movie',
                category: 'movie',
                path: path.join(MOVIES_DIR, 'movie', 'test1', 'movie.nfo')
            });
            mockFileService.readMovieNfo.mockResolvedValue({ name: 'Test Movie', description: '' });
            mockFileService.writeMovieNfo.mockResolvedValue();
            mockMovieService.refreshCache.mockResolvedValue();

            const services = {
                movieService: mockMovieService,
                fileService: mockFileService,
                getMoviesDir: () => MOVIES_DIR
            };

            await movieCommands.editMovie(services, 'movie-test1', { description: 'New description' });

            const writtenData = mockFileService.writeMovieNfo.mock.calls[0][1];
            expect(writtenData.description).toBe('New description');
        });

        test('CLI-MOVIE-EDIT-003: 修改director字段', async () => {
            mockMovieService.getMovieDetail.mockResolvedValue({
                id: 'movie-test1',
                name: 'Test Movie',
                category: 'movie',
                path: path.join(MOVIES_DIR, 'movie', 'test1', 'movie.nfo')
            });
            mockFileService.readMovieNfo.mockResolvedValue({ name: 'Test Movie', director: '' });
            mockFileService.writeMovieNfo.mockResolvedValue();
            mockMovieService.refreshCache.mockResolvedValue();

            const services = {
                movieService: mockMovieService,
                fileService: mockFileService,
                getMoviesDir: () => MOVIES_DIR
            };

            await movieCommands.editMovie(services, 'movie-test1', { director: 'New Director' });

            const writtenData = mockFileService.writeMovieNfo.mock.calls[0][1];
            expect(writtenData.director).toBe('New Director');
        });

        test('CLI-MOVIE-EDIT-004: 修改actors字段', async () => {
            mockMovieService.getMovieDetail.mockResolvedValue({
                id: 'movie-test1',
                name: 'Test Movie',
                category: 'movie',
                path: path.join(MOVIES_DIR, 'movie', 'test1', 'movie.nfo')
            });
            mockFileService.readMovieNfo.mockResolvedValue({ name: 'Test Movie', actors: '' });
            mockFileService.writeMovieNfo.mockResolvedValue();
            mockMovieService.refreshCache.mockResolvedValue();

            const services = {
                movieService: mockMovieService,
                fileService: mockFileService,
                getMoviesDir: () => MOVIES_DIR
            };

            await movieCommands.editMovie(services, 'movie-test1', { actors: 'Actor1, Actor2' });

            const writtenData = mockFileService.writeMovieNfo.mock.calls[0][1];
            expect(writtenData.actors).toBe('Actor1, Actor2');
        });

        test('CLI-MOVIE-EDIT-005: 修改评分', async () => {
            mockMovieService.getMovieDetail.mockResolvedValue({
                id: 'movie-test1',
                name: 'Test Movie',
                category: 'movie',
                path: path.join(MOVIES_DIR, 'movie', 'test1', 'movie.nfo')
            });
            mockFileService.readMovieNfo.mockResolvedValue({ name: 'Test Movie', userRating: 0 });
            mockFileService.writeMovieNfo.mockResolvedValue();
            mockMovieService.refreshCache.mockResolvedValue();

            const services = {
                movieService: mockMovieService,
                fileService: mockFileService,
                getMoviesDir: () => MOVIES_DIR
            };

            await movieCommands.editMovie(services, 'movie-test1', { rating: '5' });

            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('已更新'));
        });

        test('CLI-MOVIE-EDIT-006: 修改tags（替换模式）', async () => {
            mockMovieService.getMovieDetail.mockResolvedValue({
                id: 'movie-test1',
                name: 'Test Movie',
                category: 'movie',
                path: path.join(MOVIES_DIR, 'movie', 'test1', 'movie.nfo')
            });
            mockFileService.readMovieNfo.mockResolvedValue({ name: 'Test Movie', tags: ['old'] });
            mockFileService.writeMovieNfo.mockResolvedValue();
            mockMovieService.refreshCache.mockResolvedValue();

            const services = {
                movieService: mockMovieService,
                fileService: mockFileService,
                getMoviesDir: () => MOVIES_DIR
            };

            await movieCommands.editMovie(services, 'movie-test1', { tags: 'action,comedy' });

            const writtenData = mockFileService.writeMovieNfo.mock.calls[0][1];
            expect(writtenData.tags).toEqual(['action', 'comedy']);
        });

        test('CLI-MOVIE-EDIT-007: 使用--add-tags添加标签', async () => {
            mockMovieService.getMovieDetail.mockResolvedValue({
                id: 'movie-test1',
                name: 'Test Movie',
                category: 'movie',
                path: path.join(MOVIES_DIR, 'movie', 'test1', 'movie.nfo')
            });
            mockFileService.readMovieNfo.mockResolvedValue({ name: 'Test Movie', tags: ['action'] });
            mockFileService.writeMovieNfo.mockResolvedValue();
            mockMovieService.refreshCache.mockResolvedValue();

            const services = {
                movieService: mockMovieService,
                fileService: mockFileService,
                getMoviesDir: () => MOVIES_DIR
            };

            await movieCommands.editMovie(services, 'movie-test1', { addTags: 'drama' });

            const writtenData = mockFileService.writeMovieNfo.mock.calls[0][1];
            expect(writtenData.tags).toContain('action');
            expect(writtenData.tags).toContain('drama');
        });

        test('CLI-MOVIE-EDIT-008: 使用--remove-tags移除标签', async () => {
            mockMovieService.getMovieDetail.mockResolvedValue({
                id: 'movie-test1',
                name: 'Test Movie',
                category: 'movie',
                path: path.join(MOVIES_DIR, 'movie', 'test1', 'movie.nfo')
            });
            mockFileService.readMovieNfo.mockResolvedValue({ name: 'Test Movie', tags: ['action', 'comedy', 'drama'] });
            mockFileService.writeMovieNfo.mockResolvedValue();
            mockMovieService.refreshCache.mockResolvedValue();

            const services = {
                movieService: mockMovieService,
                fileService: mockFileService,
                getMoviesDir: () => MOVIES_DIR
            };

            await movieCommands.editMovie(services, 'movie-test1', { removeTags: 'comedy' });

            const writtenData = mockFileService.writeMovieNfo.mock.calls[0][1];
            expect(writtenData.tags).toContain('action');
            expect(writtenData.tags).toContain('drama');
            expect(writtenData.tags).not.toContain('comedy');
        });

        test('CLI-MOVIE-EDIT-009: 无效ID格式', async () => {
            const services = {
                movieService: mockMovieService,
                fileService: mockFileService,
                getMoviesDir: () => MOVIES_DIR
            };

            await movieCommands.editMovie(services, 'invalid', { name: 'New Name' });

            expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('无效'));
        });

        test('CLI-MOVIE-EDIT-010: 修改不存在的电影', async () => {
            mockMovieService.getMovieDetail.mockResolvedValue(null);

            const services = {
                movieService: mockMovieService,
                fileService: mockFileService,
                getMoviesDir: () => MOVIES_DIR
            };

            await movieCommands.editMovie(services, 'movie-non-exist', { name: 'New Name' });

            expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('不存在'));
        });

        test('CLI-MOVIE-EDIT-011: 无效评分值（超出0-5范围）', async () => {
            mockMovieService.getMovieDetail.mockResolvedValue({
                id: 'movie-test1',
                name: 'Test Movie',
                category: 'movie',
                path: path.join(MOVIES_DIR, 'movie', 'test1', 'movie.nfo')
            });
            mockFileService.readMovieNfo.mockResolvedValue({ name: 'Test Movie', userRating: 0 });
            mockFileService.writeMovieNfo.mockResolvedValue();
            mockMovieService.refreshCache.mockResolvedValue();

            const services = {
                movieService: mockMovieService,
                fileService: mockFileService,
                getMoviesDir: () => MOVIES_DIR
            };

            await movieCommands.editMovie(services, 'movie-test1', { rating: '6' });

            expect(consoleLogSpy).toHaveBeenCalled();
        });

        test('CLI-MOVIE-EDIT-012: 编辑服务异常处理', async () => {
            mockMovieService.getMovieDetail.mockRejectedValue(new Error('编辑服务异常'));

            const services = {
                movieService: mockMovieService,
                fileService: mockFileService,
                getMoviesDir: () => MOVIES_DIR
            };

            try {
                await movieCommands.editMovie(services, 'movie-test1', { name: 'New Name' });
            } catch (e) {
                expect(e.message).toContain('编辑服务异常');
            }

            expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('失败'));
        });
    });

    describe('movie delete', () => {
        test('CLI-MOVIE-DELETE-001: 删除存在的电影', async () => {
            mockMovieService.getMovieDetail.mockResolvedValue({
                id: 'movie-test1',
                name: 'Test Movie',
                category: 'movie',
                path: path.join(MOVIES_DIR, 'movie', 'test1')
            });
            mockFileService.deleteDir.mockResolvedValue();
            mockMovieService.isCacheInitialized.mockReturnValue(true);
            mockMovieCacheService.removeMovieFromCache.mockReturnValue();
            mockIndexService.deleteMovieFromIndex.mockResolvedValue();

            const services = {
                movieService: mockMovieService,
                fileService: mockFileService,
                movieCacheService: mockMovieCacheService,
                indexService: mockIndexService,
                getMoviesDir: () => MOVIES_DIR
            };

            await movieCommands.deleteMovie(services, 'movie-test1', {});

            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('已删除'));
        });

        test('CLI-MOVIE-DELETE-002: 删除不存在的电影', async () => {
            mockMovieService.getMovieDetail.mockResolvedValue(null);

            const services = {
                movieService: mockMovieService,
                fileService: mockFileService,
                movieCacheService: mockMovieCacheService,
                indexService: mockIndexService,
                getMoviesDir: () => MOVIES_DIR
            };

            await movieCommands.deleteMovie(services, 'movie-non-exist', {});

            expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('不存在'));
        });

        test('CLI-MOVIE-DELETE-003: 无效ID格式', async () => {
            const services = {
                movieService: mockMovieService,
                fileService: mockFileService,
                movieCacheService: mockMovieCacheService,
                indexService: mockIndexService,
                getMoviesDir: () => MOVIES_DIR
            };

            await movieCommands.deleteMovie(services, 'invalid', {});

            expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('无效'));
        });

        test('CLI-MOVIE-DELETE-004: 使用--force强制删除', async () => {
            mockMovieService.getMovieDetail.mockResolvedValue({
                id: 'movie-test1',
                name: 'Test Movie',
                category: 'movie',
                path: path.join(MOVIES_DIR, 'movie', 'test1')
            });
            mockFileService.deleteDir.mockResolvedValue();
            mockMovieService.isCacheInitialized.mockReturnValue(true);
            mockMovieCacheService.removeMovieFromCache.mockReturnValue();
            mockIndexService.deleteMovieFromIndex.mockResolvedValue();

            const services = {
                movieService: mockMovieService,
                fileService: mockFileService,
                movieCacheService: mockMovieCacheService,
                indexService: mockIndexService,
                getMoviesDir: () => MOVIES_DIR
            };

            await movieCommands.deleteMovie(services, 'movie-test1', { force: true });

            expect(mockFileService.deleteDir).toHaveBeenCalled();
        });

        test('CLI-MOVIE-DELETE-005: 删除服务异常处理', async () => {
            mockMovieService.getMovieDetail.mockResolvedValue({
                id: 'movie-test1',
                name: 'Test Movie',
                category: 'movie',
                path: path.join(MOVIES_DIR, 'movie', 'test1')
            });
            mockFileService.deleteDir.mockRejectedValue(new Error('删除服务异常'));

            const services = {
                movieService: mockMovieService,
                fileService: mockFileService,
                movieCacheService: mockMovieCacheService,
                indexService: mockIndexService,
                getMoviesDir: () => MOVIES_DIR
            };

            try {
                await movieCommands.deleteMovie(services, 'movie-test1', {});
            } catch (e) {
                expect(e.message).toContain('删除服务异常');
            }

            expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('失败'));
        });
    });

    describe('movie status', () => {
        test('CLI-MOVIE-STATUS-001: 更新为unwatched', async () => {
            mockMovieService.getMovieDetail.mockResolvedValue({
                id: 'movie-test1',
                name: 'Test Movie',
                category: 'movie',
                path: path.join(MOVIES_DIR, 'movie', 'test1', 'movie.nfo')
            });
            mockFileService.readMovieNfo.mockResolvedValue({ name: 'Test Movie', status: 'watching' });
            mockFileService.writeMovieNfo.mockResolvedValue();
            mockMovieService.refreshCache.mockResolvedValue();

            const services = {
                movieService: mockMovieService,
                fileService: mockFileService,
                getMoviesDir: () => MOVIES_DIR
            };

            await movieCommands.updateStatus(services, 'movie-test1', 'unwatched');

            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('已更新'));
        });

        test('CLI-MOVIE-STATUS-002: 更新为watching状态', async () => {
            mockMovieService.getMovieDetail.mockResolvedValue({
                id: 'movie-test1',
                name: 'Test Movie',
                category: 'movie',
                path: path.join(MOVIES_DIR, 'movie', 'test1', 'movie.nfo')
            });
            mockFileService.readMovieNfo.mockResolvedValue({ name: 'Test Movie', status: 'unwatched' });
            mockFileService.writeMovieNfo.mockResolvedValue();
            mockMovieService.refreshCache.mockResolvedValue();

            const services = {
                movieService: mockMovieService,
                fileService: mockFileService,
                getMoviesDir: () => MOVIES_DIR
            };

            await movieCommands.updateStatus(services, 'movie-test1', 'watching');

            const writtenData = mockFileService.writeMovieNfo.mock.calls[0][1];
            expect(writtenData.status).toBe('watching');
            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('已更新'));
        });

        test('CLI-MOVIE-STATUS-003: 更新为completed状态', async () => {
            mockMovieService.getMovieDetail.mockResolvedValue({
                id: 'movie-test1',
                name: 'Test Movie',
                category: 'movie',
                path: path.join(MOVIES_DIR, 'movie', 'test1', 'movie.nfo')
            });
            mockFileService.readMovieNfo.mockResolvedValue({ name: 'Test Movie', status: 'watching' });
            mockFileService.writeMovieNfo.mockResolvedValue();
            mockMovieService.refreshCache.mockResolvedValue();

            const services = {
                movieService: mockMovieService,
                fileService: mockFileService,
                getMoviesDir: () => MOVIES_DIR
            };

            await movieCommands.updateStatus(services, 'movie-test1', 'completed');

            const writtenData = mockFileService.writeMovieNfo.mock.calls[0][1];
            expect(writtenData.status).toBe('completed');
            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('已更新'));
        });

        test('CLI-MOVIE-STATUS-004: 无效状态值', async () => {
            const services = {
                movieService: mockMovieService,
                fileService: mockFileService,
                getMoviesDir: () => MOVIES_DIR
            };

            await movieCommands.updateStatus(services, 'movie-test1', 'invalid');

            expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('无效'));
        });

        test('CLI-MOVIE-STATUS-005: 更新不存在的电影状态', async () => {
            mockMovieService.getMovieDetail.mockResolvedValue(null);

            const services = {
                movieService: mockMovieService,
                fileService: mockFileService,
                getMoviesDir: () => MOVIES_DIR
            };

            await movieCommands.updateStatus(services, 'movie-non-exist', 'watching');

            expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('不存在'));
        });

        test('CLI-MOVIE-STATUS-006: 无效ID格式', async () => {
            const services = {
                movieService: mockMovieService,
                fileService: mockFileService,
                getMoviesDir: () => MOVIES_DIR
            };

            await movieCommands.updateStatus(services, 'invalid', 'watching');

            expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('无效'));
        });

        test('CLI-MOVIE-STATUS-007: 状态更新服务异常处理', async () => {
            mockMovieService.getMovieDetail.mockResolvedValue({
                id: 'movie-test1',
                name: 'Test Movie',
                category: 'movie',
                path: path.join(MOVIES_DIR, 'movie', 'test1', 'movie.nfo')
            });
            mockFileService.readMovieNfo.mockRejectedValue(new Error('状态更新服务异常'));

            const services = {
                movieService: mockMovieService,
                fileService: mockFileService,
                getMoviesDir: () => MOVIES_DIR
            };

            try {
                await movieCommands.updateStatus(services, 'movie-test1', 'watching');
            } catch (e) {
                expect(e.message).toContain('状态更新服务异常');
            }

            expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('失败'));
        });
    });
});

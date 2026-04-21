/**
 * CLI Tag Commands Tests
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

// Mock services
const mockTagService = {
    loadTags: jest.fn(),
    saveTags: jest.fn()
};

const mockMovieService = {
    searchMovies: jest.fn()
};

const mockServiceExports = {
    tagService: mockTagService,
    movieService: mockMovieService,
    getMoviesDir: () => MOVIES_DIR
};

global.__CLI_MOCK_SERVICES__ = mockServiceExports;

jest.mock('../../src/cli/utils/service-loader', () => ({
    initializeServices: jest.fn().mockResolvedValue(global.__CLI_MOCK_SERVICES__)
}));

const tagCommands = require('../../src/cli/commands/tag');

describe('CLI Tag Commands', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('tag list', () => {
        test('CLI-TAG-LIST-001: 列出所有标签', async () => {
            mockTagService.loadTags.mockResolvedValue([
                { id: 'action', name: '动作' },
                { id: 'comedy', name: '喜剧' }
            ]);
            mockMovieService.searchMovies.mockResolvedValue([{ id: 'movie-test1' }]);

            const services = {
                tagService: mockTagService,
                movieService: mockMovieService,
                getMoviesDir: () => MOVIES_DIR
            };

            await tagCommands.listTags(services, {});

            expect(mockTagService.loadTags).toHaveBeenCalled();
            expect(consoleLogSpy).toHaveBeenCalled();
        });

        test('CLI-TAG-LIST-002: JSON格式输出', async () => {
            mockTagService.loadTags.mockResolvedValue([
                { id: 'action', name: '动作', movieCount: 1 }
            ]);
            mockMovieService.searchMovies.mockResolvedValue([{ id: 'movie-test1' }]);

            const services = {
                tagService: mockTagService,
                movieService: mockMovieService,
                getMoviesDir: () => MOVIES_DIR
            };

            await tagCommands.listTags(services, { format: 'json' });

            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('"id"'));
        });

        test('CLI-TAG-LIST-003: 空标签列表（边界条件）', async () => {
            mockTagService.loadTags.mockResolvedValue([]);
            mockMovieService.searchMovies.mockResolvedValue([]);

            const services = {
                tagService: mockTagService,
                movieService: mockMovieService,
                getMoviesDir: () => MOVIES_DIR
            };

            await tagCommands.listTags(services, {});

            expect(consoleLogSpy).toHaveBeenCalled();
        });

        test('CLI-TAG-LIST-004: 标签列表服务异常处理', async () => {
            mockTagService.loadTags.mockRejectedValue(new Error('标签列表服务异常'));

            const services = {
                tagService: mockTagService,
                movieService: mockMovieService,
                getMoviesDir: () => MOVIES_DIR
            };

            try {
                await tagCommands.listTags(services, {});
            } catch (e) {
                expect(e.message).toContain('标签列表服务异常');
            }

            expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('失败'));
        });
    });

    describe('tag create', () => {
        test('CLI-TAG-CREATE-001: 创建新标签', async () => {
            mockTagService.loadTags.mockResolvedValue([
                { id: 'action', name: '动作' }
            ]);
            mockTagService.saveTags.mockResolvedValue();

            const services = {
                tagService: mockTagService
            };

            await tagCommands.createTag(services, 'newtag', '新标签');

            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('成功'));
            expect(mockTagService.saveTags).toHaveBeenCalledWith(expect.arrayContaining([
                expect.objectContaining({ id: 'newtag', name: '新标签' })
            ]));
        });

        test('CLI-TAG-CREATE-002: 创建已存在的标签', async () => {
            mockTagService.loadTags.mockResolvedValue([
                { id: 'action', name: '动作' }
            ]);

            const services = {
                tagService: mockTagService
            };

            await tagCommands.createTag(services, 'action', '动作');

            expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('已存在'));
        });

        test('CLI-TAG-CREATE-003: 空标签ID（边界条件）', async () => {
            mockTagService.loadTags.mockResolvedValue([]);

            const services = {
                tagService: mockTagService
            };

            await tagCommands.createTag(services, '', '空ID标签');

            expect(mockTagService.loadTags).toHaveBeenCalled();
        });

        test('CLI-TAG-CREATE-004: 空标签名称（边界条件）', async () => {
            mockTagService.loadTags.mockResolvedValue([]);
            mockTagService.saveTags.mockResolvedValue();

            const services = {
                tagService: mockTagService
            };

            await tagCommands.createTag(services, 'emptyname', '');

            expect(mockTagService.saveTags).toHaveBeenCalled();
        });

        test('CLI-TAG-CREATE-005: 标签ID含特殊字符', async () => {
            mockTagService.loadTags.mockResolvedValue([]);
            mockTagService.saveTags.mockResolvedValue();

            const services = {
                tagService: mockTagService
            };

            await tagCommands.createTag(services, 'tag-测试@#', '特殊字符标签');

            expect(mockTagService.saveTags).toHaveBeenCalledWith(expect.arrayContaining([
                expect.objectContaining({ id: 'tag-测试@#', name: '特殊字符标签' })
            ]));
        });

        test('CLI-TAG-CREATE-006: 超长标签名称', async () => {
            const longName = '超长标签名称'.repeat(20);
            mockTagService.loadTags.mockResolvedValue([]);
            mockTagService.saveTags.mockResolvedValue();

            const services = {
                tagService: mockTagService
            };

            await tagCommands.createTag(services, 'longtag', longName);

            expect(mockTagService.saveTags).toHaveBeenCalled();
        });

        test('CLI-TAG-CREATE-007: 创建服务异常处理', async () => {
            mockTagService.loadTags.mockResolvedValue([]);
            mockTagService.saveTags.mockRejectedValue(new Error('创建标签服务异常'));

            const services = {
                tagService: mockTagService
            };

            try {
                await tagCommands.createTag(services, 'newtag', '新标签');
            } catch (e) {
                expect(e.message).toContain('创建标签服务异常');
            }

            expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('失败'));
        });
    });

    describe('tag delete', () => {
        test('CLI-TAG-DELETE-001: 删除存在的标签', async () => {
            mockTagService.loadTags.mockResolvedValue([
                { id: 'action', name: '动作' },
                { id: 'comedy', name: '喜剧' }
            ]);
            mockTagService.saveTags.mockResolvedValue();

            const services = {
                tagService: mockTagService
            };

            await tagCommands.deleteTag(services, 'action');

            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('已删除'));
            expect(mockTagService.saveTags).toHaveBeenCalledWith([
                { id: 'comedy', name: '喜剧' }
            ]);
        });

        test('CLI-TAG-DELETE-002: 删除不存在的标签', async () => {
            mockTagService.loadTags.mockResolvedValue([
                { id: 'action', name: '动作' }
            ]);

            const services = {
                tagService: mockTagService
            };

            await tagCommands.deleteTag(services, 'non-exist');

            expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('不存在'));
        });

        test('CLI-TAG-DELETE-003: 删除服务异常处理', async () => {
            mockTagService.loadTags.mockResolvedValue([
                { id: 'action', name: '动作' }
            ]);
            mockTagService.saveTags.mockRejectedValue(new Error('删除标签服务异常'));

            const services = {
                tagService: mockTagService
            };

            try {
                await tagCommands.deleteTag(services, 'action');
            } catch (e) {
                expect(e.message).toContain('删除标签服务异常');
            }

            expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('失败'));
        });
    });
});

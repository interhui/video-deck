/**
 * CLI Category Commands Tests
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
const mockCategoryService = {
    loadCategories: jest.fn(),
    getCategoryById: jest.fn()
};

const mockFileService = {
    fileExists: jest.fn(),
    getMovieFolders: jest.fn()
};

const mockServiceExports = {
    categoryService: mockCategoryService,
    fileService: mockFileService,
    getMoviesDir: () => MOVIES_DIR
};

global.__CLI_MOCK_SERVICES__ = mockServiceExports;

jest.mock('../../src/cli/utils/service-loader', () => ({
    initializeServices: jest.fn().mockResolvedValue(global.__CLI_MOCK_SERVICES__)
}));

const categoryCommands = require('../../src/cli/commands/category');

describe('CLI Category Commands', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('category list', () => {
        test('CLI-CATEGORY-LIST-001: 列出所有分类', async () => {
            mockCategoryService.loadCategories.mockResolvedValue([
                { id: 'movie', name: '电影', shortName: '电影' },
                { id: 'tv', name: '电视剧', shortName: '剧集' }
            ]);
            mockFileService.fileExists.mockReturnValue(true);
            mockFileService.getMovieFolders.mockResolvedValue({ 'test-movie': {} });

            const services = {
                categoryService: mockCategoryService,
                fileService: mockFileService,
                getMoviesDir: () => MOVIES_DIR
            };

            await categoryCommands.listCategories(services, {});

            expect(mockCategoryService.loadCategories).toHaveBeenCalled();
            expect(consoleLogSpy).toHaveBeenCalled();
        });

        test('CLI-CATEGORY-LIST-002: JSON格式输出', async () => {
            mockCategoryService.loadCategories.mockResolvedValue([
                { id: 'movie', name: '电影', shortName: '电影', movieCount: 1 }
            ]);
            mockFileService.fileExists.mockReturnValue(true);
            mockFileService.getMovieFolders.mockResolvedValue({ 'test-movie': {} });

            const services = {
                categoryService: mockCategoryService,
                fileService: mockFileService,
                getMoviesDir: () => MOVIES_DIR
            };

            await categoryCommands.listCategories(services, { format: 'json' });

            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('"id"'));
        });

        test('CLI-CATEGORY-LIST-003: 空分类列表（边界条件）', async () => {
            mockCategoryService.loadCategories.mockResolvedValue([]);
            mockFileService.fileExists.mockReturnValue(false);

            const services = {
                categoryService: mockCategoryService,
                fileService: mockFileService,
                getMoviesDir: () => MOVIES_DIR
            };

            await categoryCommands.listCategories(services, {});

            expect(consoleLogSpy).toHaveBeenCalled();
        });

        test('CLI-CATEGORY-LIST-004: 分类列表服务异常处理', async () => {
            mockCategoryService.loadCategories.mockRejectedValue(new Error('分类列表服务异常'));

            const services = {
                categoryService: mockCategoryService,
                fileService: mockFileService,
                getMoviesDir: () => MOVIES_DIR
            };

            try {
                await categoryCommands.listCategories(services, {});
            } catch (e) {
                expect(e.message).toContain('分类列表服务异常');
            }

            expect(consoleErrorSpy).toHaveBeenCalled();
        });
    });

    describe('category show', () => {
        test('CLI-CATEGORY-SHOW-001: 显示存在的分类', async () => {
            mockCategoryService.getCategoryById.mockReturnValue({
                id: 'movie',
                name: '电影',
                shortName: '电影',
                icon: 'film',
                color: '#003791'
            });

            const services = {
                categoryService: mockCategoryService
            };

            await categoryCommands.showCategory(services, 'movie');

            expect(consoleLogSpy).toHaveBeenCalled();
            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('电影'));
        });

        test('CLI-CATEGORY-SHOW-002: 显示不存在的分类', async () => {
            mockCategoryService.getCategoryById.mockReturnValue(null);

            const services = {
                categoryService: mockCategoryService
            };

            await categoryCommands.showCategory(services, 'non-exist');

            expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('不存在'));
        });

        test('CLI-CATEGORY-SHOW-003: 无效分类ID（含特殊字符）', async () => {
            mockCategoryService.getCategoryById.mockReturnValue(null);

            const services = {
                categoryService: mockCategoryService
            };

            await categoryCommands.showCategory(services, '分类-测试@#$');

            expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('不存在'));
        });

        test('CLI-CATEGORY-SHOW-004: 分类详情服务异常处理', async () => {
            mockCategoryService.getCategoryById.mockImplementation(() => {
                throw new Error('分类详情服务异常');
            });

            const services = {
                categoryService: mockCategoryService
            };

            try {
                await categoryCommands.showCategory(services, 'movie');
            } catch (e) {
                expect(e.message).toContain('分类详情服务异常');
            }
        });
    });
});

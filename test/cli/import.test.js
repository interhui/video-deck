/**
 * CLI Import Commands Tests
 */

const path = require('path');
const fs = require('fs');

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
const mockMovieService = {
    batchImportMovies: jest.fn()
};

const mockCategoryService = {
    loadCategories: jest.fn()
};

const mockServiceExports = {
    movieService: mockMovieService,
    categoryService: mockCategoryService,
    getMoviesDir: () => MOVIES_DIR
};

global.__CLI_MOCK_SERVICES__ = mockServiceExports;

jest.mock('../../src/cli/utils/service-loader', () => ({
    initializeServices: jest.fn().mockResolvedValue(global.__CLI_MOCK_SERVICES__)
}));

const importCommands = require('../../src/cli/commands/import');

describe('CLI Import Commands', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('import json', () => {
        test('CLI-IMPORT-JSON-001: 导入有效JSON', async () => {
            const importFile = path.join(TEST_DATA_DIR, 'import-movies.json');
            mockCategoryService.loadCategories.mockResolvedValue([
                { id: 'movie', name: '电影' }
            ]);
            mockMovieService.batchImportMovies.mockResolvedValue({ success: 2, failed: 0 });

            const services = {
                movieService: mockMovieService,
                categoryService: mockCategoryService,
                getMoviesDir: () => MOVIES_DIR
            };

            await importCommands.importJson(services, importFile, {});

            expect(consoleLogSpy).toHaveBeenCalled();
            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('导入结果'));
        });

        test('CLI-IMPORT-JSON-002: 导入不存在的文件', async () => {
            const services = {
                movieService: mockMovieService,
                categoryService: mockCategoryService,
                getMoviesDir: () => MOVIES_DIR
            };

            await importCommands.importJson(services, '/non/exist/file.json', {});

            expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('不存在'));
        });

        test('CLI-IMPORT-JSON-003: 导入无效JSON', async () => {
            const invalidFile = path.join(TEST_DATA_DIR, 'invalid-import.json');
            const services = {
                movieService: mockMovieService,
                categoryService: mockCategoryService,
                getMoviesDir: () => MOVIES_DIR
            };

            await importCommands.importJson(services, invalidFile, {});

            expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('解析失败'));
        });

        test('CLI-IMPORT-JSON-004: 导入缺少必填字段', async () => {
            const noNameFile = path.join(TEST_DATA_DIR, 'import-no-name.json');
            mockCategoryService.loadCategories.mockResolvedValue([
                { id: 'movie', name: '电影' }
            ]);

            const services = {
                movieService: mockMovieService,
                categoryService: mockCategoryService,
                getMoviesDir: () => MOVIES_DIR
            };

            await importCommands.importJson(services, noNameFile, {});

            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('失败'));
        });

        test('CLI-IMPORT-JSON-005: 导入缺少分类', async () => {
            const noCatFile = path.join(TEST_DATA_DIR, 'import-no-category.json');
            mockCategoryService.loadCategories.mockResolvedValue([
                { id: 'movie', name: '电影' }
            ]);

            const services = {
                movieService: mockMovieService,
                categoryService: mockCategoryService,
                getMoviesDir: () => MOVIES_DIR
            };

            await importCommands.importJson(services, noCatFile, {});

            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('失败'));
        });

        test('CLI-IMPORT-JSON-006: 导入空文件', async () => {
            const emptyFile = path.join(TEST_DATA_DIR, 'empty-import.json');
            fs.writeFileSync(emptyFile, '', 'utf8');

            mockCategoryService.loadCategories.mockResolvedValue([
                { id: 'movie', name: '电影' }
            ]);

            const services = {
                movieService: mockMovieService,
                categoryService: mockCategoryService,
                getMoviesDir: () => MOVIES_DIR
            };

            await importCommands.importJson(services, emptyFile, {});

            expect(consoleErrorSpy).toHaveBeenCalled();

            fs.unlinkSync(emptyFile);
        });

        test('CLI-IMPORT-JSON-008: 导入部分成功/部分失败的情况', async () => {
            const importFile = path.join(TEST_DATA_DIR, 'import-movies.json');
            mockCategoryService.loadCategories.mockResolvedValue([
                { id: 'movie', name: '电影' }
            ]);
            mockMovieService.batchImportMovies.mockResolvedValue({ success: 1, failed: 1, errors: ['电影2失败'] });

            const services = {
                movieService: mockMovieService,
                categoryService: mockCategoryService,
                getMoviesDir: () => MOVIES_DIR
            };

            await importCommands.importJson(services, importFile, {});

            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('成功'));
            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('失败'));
        });

        test('CLI-IMPORT-JSON-009: 导入无效分类ID', async () => {
            const importFile = path.join(TEST_DATA_DIR, 'import-movies.json');
            mockCategoryService.loadCategories.mockResolvedValue([
                { id: 'movie', name: '电影' }
            ]);
            mockMovieService.batchImportMovies.mockResolvedValue({ success: 0, failed: 1, errors: ['分类不存在'] });

            const services = {
                movieService: mockMovieService,
                categoryService: mockCategoryService,
                getMoviesDir: () => MOVIES_DIR
            };

            await importCommands.importJson(services, importFile, {});

            expect(mockMovieService.batchImportMovies).toHaveBeenCalled();
        });
    });

    describe('import template', () => {
        test('CLI-IMPORT-TEMPLATE-001: 生成模板', () => {
            // Create a mock template file
            const templateDir = path.join(__dirname, '..', '..', 'templates');
            if (!fs.existsSync(templateDir)) {
                fs.mkdirSync(templateDir, { recursive: true });
            }
            const templatePath = path.join(templateDir, 'movie.nfo');
            const templateContent = `<?xml version="1.0" encoding="UTF-8"?>
<movie>
    <title></title>
    <year></year>
    <outline></outline>
</movie>`;
            fs.writeFileSync(templatePath, templateContent);

            expect(() => {
                importCommands.generateTemplate();
            }).not.toThrow();

            // Cleanup
            if (fs.existsSync(templatePath)) {
                fs.unlinkSync(templatePath);
            }
        });
    });
});

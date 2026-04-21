/**
 * CLI Box Commands Tests
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
const BOXES_DIR = path.join(TEST_DATA_DIR, 'boxes');

// Mock services
const mockBoxService = {
    getAllBoxes: jest.fn(),
    getBoxDetail: jest.fn(),
    createBox: jest.fn(),
    updateBox: jest.fn(),
    deleteBox: jest.fn(),
    addMovieToBox: jest.fn(),
    removeMovieFromBox: jest.fn()
};

const mockMovieService = {
    getMovieDetail: jest.fn()
};

const mockFileService = {
    readMovieNfo: jest.fn()
};

const mockServiceExports = {
    boxService: mockBoxService,
    movieService: mockMovieService,
    fileService: mockFileService,
    getMoviesDir: () => MOVIES_DIR,
    getMovieboxDir: () => BOXES_DIR
};

global.__CLI_MOCK_SERVICES__ = mockServiceExports;

jest.mock('../../src/cli/utils/service-loader', () => ({
    initializeServices: jest.fn().mockResolvedValue(global.__CLI_MOCK_SERVICES__)
}));

const boxCommands = require('../../src/cli/commands/box');

describe('CLI Box Commands', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('box list', () => {
        test('CLI-BOX-LIST-001: 列出所有盒子', async () => {
            mockBoxService.getAllBoxes.mockResolvedValue([
                { name: 'Test Box', description: 'Test', movieCount: 2, categories: ['movie'] }
            ]);

            const services = {
                boxService: mockBoxService,
                getMovieboxDir: () => BOXES_DIR
            };

            await boxCommands.listBoxes(services, {});

            expect(mockBoxService.getAllBoxes).toHaveBeenCalledWith(BOXES_DIR);
            expect(consoleLogSpy).toHaveBeenCalled();
        });

        test('CLI-BOX-LIST-002: JSON格式输出', async () => {
            mockBoxService.getAllBoxes.mockResolvedValue([
                { name: 'Test Box', description: 'Test', movieCount: 2, categories: ['movie'] }
            ]);

            const services = {
                boxService: mockBoxService,
                getMovieboxDir: () => BOXES_DIR
            };

            await boxCommands.listBoxes(services, { format: 'json' });

            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('"name"'));
        });

        test('CLI-BOX-LIST-003: 空盒子列表（边界条件）', async () => {
            mockBoxService.getAllBoxes.mockResolvedValue([]);

            const services = {
                boxService: mockBoxService,
                getMovieboxDir: () => BOXES_DIR
            };

            await boxCommands.listBoxes(services, {});

            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('0'));
        });

        test('CLI-BOX-LIST-004: 列表服务异常处理', async () => {
            mockBoxService.getAllBoxes.mockRejectedValue(new Error('盒子列表服务异常'));

            const services = {
                boxService: mockBoxService,
                getMovieboxDir: () => BOXES_DIR
            };

            try {
                await boxCommands.listBoxes(services, {});
            } catch (e) {
                expect(e.message).toContain('盒子列表服务异常');
            }

            expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('失败'));
        });
    });

    describe('box show', () => {
        test('CLI-BOX-SHOW-001: 显示存在的盒子', async () => {
            mockBoxService.getBoxDetail.mockResolvedValue({
                name: 'Test Box',
                description: 'Test Description',
                movieCount: 1,
                categories: ['movie'],
                data: {
                    movie: [{ id: 'movie-test1' }]
                }
            });
            mockMovieService.getMovieDetail.mockResolvedValue({
                id: 'movie-test1',
                name: 'Test Movie',
                category: 'movie',
                userRating: 5,
                status: 'unwatched'
            });

            const services = {
                boxService: mockBoxService,
                movieService: mockMovieService,
                getMovieboxDir: () => BOXES_DIR,
                getMoviesDir: () => MOVIES_DIR
            };

            await boxCommands.showBox(services, 'Test Box', {});

            expect(consoleLogSpy).toHaveBeenCalled();
        });

        test('CLI-BOX-SHOW-002: 显示不存在的盒子', async () => {
            mockBoxService.getBoxDetail.mockResolvedValue(null);

            const services = {
                boxService: mockBoxService,
                movieService: mockMovieService,
                getMovieboxDir: () => BOXES_DIR,
                getMoviesDir: () => MOVIES_DIR
            };

            await boxCommands.showBox(services, 'NonExist', {});

            expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('不存在'));
        });

        test('CLI-BOX-SHOW-003: 盒子无电影时显示详情', async () => {
            mockBoxService.getBoxDetail.mockResolvedValue({
                name: 'Empty Box',
                description: 'Empty',
                movieCount: 0,
                categories: [],
                data: {
                    movie: []
                }
            });

            const services = {
                boxService: mockBoxService,
                movieService: mockMovieService,
                getMovieboxDir: () => BOXES_DIR,
                getMoviesDir: () => MOVIES_DIR
            };

            await boxCommands.showBox(services, 'Empty Box', {});

            expect(consoleLogSpy).toHaveBeenCalled();
        });

        test('CLI-BOX-SHOW-004: 盒子详情JSON格式输出', async () => {
            mockBoxService.getBoxDetail.mockResolvedValue({
                name: 'Test Box',
                description: 'Test',
                movieCount: 1,
                categories: ['movie'],
                data: { movie: [{ id: 'movie-test1' }] }
            });
            mockMovieService.getMovieDetail.mockResolvedValue({
                id: 'movie-test1',
                name: 'Test Movie',
                category: 'movie'
            });

            const services = {
                boxService: mockBoxService,
                movieService: mockMovieService,
                getMovieboxDir: () => BOXES_DIR,
                getMoviesDir: () => MOVIES_DIR
            };

            await boxCommands.showBox(services, 'Test Box', { format: 'json' });

            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('"name"'));
        });

        test('CLI-BOX-SHOW-005: 盒子详情服务异常处理', async () => {
            mockBoxService.getBoxDetail.mockRejectedValue(new Error('盒子详情服务异常'));

            const services = {
                boxService: mockBoxService,
                movieService: mockMovieService,
                getMovieboxDir: () => BOXES_DIR,
                getMoviesDir: () => MOVIES_DIR
            };

            try {
                await boxCommands.showBox(services, 'Test Box', {});
            } catch (e) {
                expect(e.message).toContain('盒子详情服务异常');
            }

            expect(consoleErrorSpy).toHaveBeenCalled();
        });
    });

    describe('box create', () => {
        test('CLI-BOX-CREATE-001: 基本创建', async () => {
            mockBoxService.createBox.mockResolvedValue({ success: true });

            const services = {
                boxService: mockBoxService,
                getMovieboxDir: () => BOXES_DIR
            };

            await boxCommands.createBox(services, 'New Box', {});

            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('成功'));
        });

        test('CLI-BOX-CREATE-002: 带描述创建', async () => {
            mockBoxService.createBox.mockResolvedValue({ success: true });

            const services = {
                boxService: mockBoxService,
                getMovieboxDir: () => BOXES_DIR
            };

            await boxCommands.createBox(services, 'New Box', { description: 'Test description' });

            expect(mockBoxService.createBox).toHaveBeenCalled();
        });

        test('CLI-BOX-CREATE-003: 创建已存在盒子', async () => {
            mockBoxService.createBox.mockRejectedValue(new Error('盒子已存在'));

            const services = {
                boxService: mockBoxService,
                getMovieboxDir: () => BOXES_DIR
            };

            try {
                await boxCommands.createBox(services, 'Existing Box', {});
            } catch (e) {
                // Expected error
            }

            expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('已存在'));
        });

        test('CLI-BOX-CREATE-004: 空盒子名称（边界条件）', async () => {
            mockBoxService.createBox.mockRejectedValue(new Error('盒子名称不能为空'));

            const services = {
                boxService: mockBoxService,
                getMovieboxDir: () => BOXES_DIR
            };

            try {
                await boxCommands.createBox(services, '', {});
            } catch (e) {
                // Expected error
            }

            expect(consoleErrorSpy).toHaveBeenCalled();
        });

        test('CLI-BOX-CREATE-005: 超长盒子名称', async () => {
            const longName = 'A'.repeat(300);
            mockBoxService.createBox.mockResolvedValue({ success: true });

            const services = {
                boxService: mockBoxService,
                getMovieboxDir: () => BOXES_DIR
            };

            await boxCommands.createBox(services, longName, {});

            expect(mockBoxService.createBox).toHaveBeenCalled();
        });

        test('CLI-BOX-CREATE-006: 特殊字符盒子名称', async () => {
            mockBoxService.createBox.mockResolvedValue({ success: true });

            const services = {
                boxService: mockBoxService,
                getMovieboxDir: () => BOXES_DIR
            };

            await boxCommands.createBox(services, '盒子-测试@#$%', {});

            expect(mockBoxService.createBox).toHaveBeenCalled();
        });

        test('CLI-BOX-CREATE-007: 创建服务异常处理', async () => {
            mockBoxService.createBox.mockRejectedValue(new Error('创建盒子服务异常'));

            const services = {
                boxService: mockBoxService,
                getMovieboxDir: () => BOXES_DIR
            };

            try {
                await boxCommands.createBox(services, 'New Box', {});
            } catch (e) {
                expect(e.message).toContain('创建盒子服务异常');
            }

            expect(consoleErrorSpy).toHaveBeenCalled();
        });
    });

    describe('box edit', () => {
        test('CLI-BOX-EDIT-001: 修改名称', async () => {
            mockBoxService.updateBox.mockResolvedValue();

            const services = {
                boxService: mockBoxService,
                getMovieboxDir: () => BOXES_DIR
            };

            await boxCommands.updateBox(services, 'Old Name', { name: 'New Name' });

            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('已更新'));
        });

        test('CLI-BOX-EDIT-002: 修改description字段', async () => {
            mockBoxService.updateBox.mockResolvedValue();

            const services = {
                boxService: mockBoxService,
                getMovieboxDir: () => BOXES_DIR
            };

            await boxCommands.updateBox(services, 'Test Box', { description: 'New description' });

            expect(mockBoxService.updateBox).toHaveBeenCalled();
        });

        test('CLI-BOX-EDIT-003: 修改不存在的盒子', async () => {
            mockBoxService.updateBox.mockRejectedValue(new Error('盒子不存在'));

            const services = {
                boxService: mockBoxService,
                getMovieboxDir: () => BOXES_DIR
            };

            try {
                await boxCommands.updateBox(services, 'NonExist', { name: 'New Name' });
            } catch (e) {
                // Expected error
            }

            expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('不存在'));
        });

        test('CLI-BOX-EDIT-004: 重命名为已存在的名称', async () => {
            mockBoxService.updateBox.mockRejectedValue(new Error('盒子名称已存在'));

            const services = {
                boxService: mockBoxService,
                getMovieboxDir: () => BOXES_DIR
            };

            try {
                await boxCommands.updateBox(services, 'Old Box', { name: 'Existing Box' });
            } catch (e) {
                // Expected error
            }

            expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('已存在'));
        });

        test('CLI-BOX-EDIT-005: 编辑服务异常处理', async () => {
            mockBoxService.updateBox.mockRejectedValue(new Error('编辑盒子服务异常'));

            const services = {
                boxService: mockBoxService,
                getMovieboxDir: () => BOXES_DIR
            };

            try {
                await boxCommands.updateBox(services, 'Test Box', { name: 'New Name' });
            } catch (e) {
                expect(e.message).toContain('编辑盒子服务异常');
            }

            expect(consoleErrorSpy).toHaveBeenCalled();
        });
    });

    describe('box delete', () => {
        test('CLI-BOX-DELETE-001: 删除存在的盒子', async () => {
            mockBoxService.deleteBox.mockResolvedValue();

            const services = {
                boxService: mockBoxService,
                getMovieboxDir: () => BOXES_DIR
            };

            await boxCommands.deleteBox(services, 'Test Box', {});

            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('已删除'));
        });

        test('CLI-BOX-DELETE-002: 删除不存在的盒子', async () => {
            mockBoxService.deleteBox.mockRejectedValue(new Error('盒子不存在'));

            const services = {
                boxService: mockBoxService,
                getMovieboxDir: () => BOXES_DIR
            };

            try {
                await boxCommands.deleteBox(services, 'NonExist', {});
            } catch (e) {
                // Expected error
            }

            expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('不存在'));
        });

        test('CLI-BOX-DELETE-003: 使用--force强制删除', async () => {
            mockBoxService.deleteBox.mockResolvedValue();

            const services = {
                boxService: mockBoxService,
                getMovieboxDir: () => BOXES_DIR
            };

            await boxCommands.deleteBox(services, 'Test Box', { force: true });

            expect(mockBoxService.deleteBox).toHaveBeenCalled();
        });

        test('CLI-BOX-DELETE-004: 删除服务异常处理', async () => {
            mockBoxService.deleteBox.mockRejectedValue(new Error('删除盒子服务异常'));

            const services = {
                boxService: mockBoxService,
                getMovieboxDir: () => BOXES_DIR
            };

            try {
                await boxCommands.deleteBox(services, 'Test Box', {});
            } catch (e) {
                expect(e.message).toContain('删除盒子服务异常');
            }

            expect(consoleErrorSpy).toHaveBeenCalled();
        });
    });

    describe('box add', () => {
        test('CLI-BOX-ADD-001: 添加电影到盒子', async () => {
            mockMovieService.getMovieDetail.mockResolvedValue({
                id: 'movie-test1',
                name: 'Test Movie',
                category: 'movie',
                status: 'unwatched',
                playCount: 0,
                totalPlayTime: 0
            });
            mockBoxService.addMovieToBox.mockResolvedValue();

            const services = {
                boxService: mockBoxService,
                movieService: mockMovieService,
                getMovieboxDir: () => BOXES_DIR,
                getMoviesDir: () => MOVIES_DIR
            };

            await boxCommands.addMovieToBox(services, 'Test Box', 'movie-test1');

            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('已添加'));
        });

        test('CLI-BOX-ADD-002: 添加不存在的电影', async () => {
            mockMovieService.getMovieDetail.mockResolvedValue(null);

            const services = {
                boxService: mockBoxService,
                movieService: mockMovieService,
                getMovieboxDir: () => BOXES_DIR,
                getMoviesDir: () => MOVIES_DIR
            };

            await boxCommands.addMovieToBox(services, 'Test Box', 'movie-non-exist');

            expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('不存在'));
        });

        test('CLI-BOX-ADD-003: 添加到不存在的盒子', async () => {
            mockMovieService.getMovieDetail.mockResolvedValue({
                id: 'movie-test1',
                name: 'Test Movie',
                category: 'movie'
            });
            mockBoxService.addMovieToBox.mockRejectedValue(new Error('盒子不存在'));

            const services = {
                boxService: mockBoxService,
                movieService: mockMovieService,
                getMovieboxDir: () => BOXES_DIR,
                getMoviesDir: () => MOVIES_DIR
            };

            try {
                await boxCommands.addMovieToBox(services, 'NonExist Box', 'movie-test1');
            } catch (e) {
                // Expected error
            }

            expect(consoleErrorSpy).toHaveBeenCalled();
        });

        test('CLI-BOX-ADD-004: 重复添加同一电影到盒子', async () => {
            mockMovieService.getMovieDetail.mockResolvedValue({
                id: 'movie-test1',
                name: 'Test Movie',
                category: 'movie'
            });
            mockBoxService.addMovieToBox.mockRejectedValue(new Error('电影已在盒子中'));

            const services = {
                boxService: mockBoxService,
                movieService: mockMovieService,
                getMovieboxDir: () => BOXES_DIR,
                getMoviesDir: () => MOVIES_DIR
            };

            try {
                await boxCommands.addMovieToBox(services, 'Test Box', 'movie-test1');
            } catch (e) {
                // Expected error
            }

            expect(consoleErrorSpy).toHaveBeenCalled();
        });

        test('CLI-BOX-ADD-005: 无效电影ID格式', async () => {
            mockMovieService.getMovieDetail.mockResolvedValue(null);

            const services = {
                boxService: mockBoxService,
                movieService: mockMovieService,
                getMovieboxDir: () => BOXES_DIR,
                getMoviesDir: () => MOVIES_DIR
            };

            await boxCommands.addMovieToBox(services, 'Test Box', 'invalid-id');

            expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('不存在'));
        });

        test('CLI-BOX-ADD-006: 添加服务异常处理', async () => {
            mockMovieService.getMovieDetail.mockResolvedValue({
                id: 'movie-test1',
                name: 'Test Movie',
                category: 'movie'
            });
            mockBoxService.addMovieToBox.mockRejectedValue(new Error('添加电影到盒子服务异常'));

            const services = {
                boxService: mockBoxService,
                movieService: mockMovieService,
                getMovieboxDir: () => BOXES_DIR,
                getMoviesDir: () => MOVIES_DIR
            };

            try {
                await boxCommands.addMovieToBox(services, 'Test Box', 'movie-test1');
            } catch (e) {
                expect(e.message).toContain('添加电影到盒子服务异常');
            }

            expect(consoleErrorSpy).toHaveBeenCalled();
        });
    });

    describe('box remove', () => {
        test('CLI-BOX-REMOVE-001: 从盒子移除电影', async () => {
            mockBoxService.getBoxDetail.mockResolvedValue({
                name: 'Test Box',
                data: {
                    movie: [{ id: 'movie-test1' }]
                }
            });
            mockBoxService.removeMovieFromBox.mockResolvedValue();

            const services = {
                boxService: mockBoxService,
                getMovieboxDir: () => BOXES_DIR
            };

            await boxCommands.removeMovieFromBox(services, 'Test Box', 'movie-test1');

            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('已从盒子移除'));
        });

        test('CLI-BOX-REMOVE-002: 移除不在盒子中的电影', async () => {
            mockBoxService.getBoxDetail.mockResolvedValue({
                name: 'Test Box',
                data: {
                    movie: [{ id: 'movie-other' }]
                }
            });

            const services = {
                boxService: mockBoxService,
                getMovieboxDir: () => BOXES_DIR
            };

            await boxCommands.removeMovieFromBox(services, 'Test Box', 'movie-test1');

            expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('不在盒子中'));
        });

        test('CLI-BOX-REMOVE-003: 从不存在的盒子移除电影', async () => {
            mockBoxService.getBoxDetail.mockResolvedValue(null);

            const services = {
                boxService: mockBoxService,
                getMovieboxDir: () => BOXES_DIR
            };

            await boxCommands.removeMovieFromBox(services, 'NonExist Box', 'movie-test1');

            expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('不存在'));
        });

        test('CLI-BOX-REMOVE-004: 无效电影ID格式', async () => {
            mockBoxService.getBoxDetail.mockResolvedValue({
                name: 'Test Box',
                data: { movie: [{ id: 'movie-test1' }] }
            });

            const services = {
                boxService: mockBoxService,
                getMovieboxDir: () => BOXES_DIR
            };

            await boxCommands.removeMovieFromBox(services, 'Test Box', 'invalid-id');

            expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('不在盒子中'));
        });

        test('CLI-BOX-REMOVE-005: 移除服务异常处理', async () => {
            mockBoxService.getBoxDetail.mockResolvedValue({
                name: 'Test Box',
                data: { movie: [{ id: 'movie-test1' }] }
            });
            mockBoxService.removeMovieFromBox.mockRejectedValue(new Error('移除电影服务异常'));

            const services = {
                boxService: mockBoxService,
                getMovieboxDir: () => BOXES_DIR
            };

            try {
                await boxCommands.removeMovieFromBox(services, 'Test Box', 'movie-test1');
            } catch (e) {
                expect(e.message).toContain('移除电影服务异常');
            }

            expect(consoleErrorSpy).toHaveBeenCalled();
        });
    });
});

/**
 * CLI Config Commands Tests
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

const testDataDir = path.join(__dirname, 'test-data');

// Mock services
const mockSettingsService = {
    getSettings: jest.fn(),
    saveSettings: jest.fn(),
    resetToDefaults: jest.fn()
};

jest.mock('../../src/cli/utils/service-loader', () => ({
    initializeServices: jest.fn().mockResolvedValue({
        settingsService: mockSettingsService
    })
}));

const configCommands = require('../../src/cli/commands/config');

describe('CLI Config Commands', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('config show', () => {
        test('CLI-CONFIG-SHOW-001: 显示当前配置', async () => {
            mockSettingsService.getSettings.mockReturnValue({
                library: { moviesDir: '/path/to/movies' },
                moviebox: { movieboxDir: '/path/to/boxes' },
                appearance: { theme: 'dark', language: 'zh-CN' }
            });

            const services = {
                settingsService: mockSettingsService
            };

            await configCommands.showConfig(services, {});

            expect(consoleLogSpy).toHaveBeenCalled();
        });

        test('CLI-CONFIG-SHOW-002: JSON格式输出', async () => {
            mockSettingsService.getSettings.mockReturnValue({
                library: { moviesDir: '/path/to/movies' },
                appearance: { theme: 'dark' }
            });

            const services = {
                settingsService: mockSettingsService
            };

            await configCommands.showConfig(services, { format: 'json' });

            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('"library"'));
        });

        test('CLI-CONFIG-SHOW-003: 配置为空对象（边界条件）', async () => {
            mockSettingsService.getSettings.mockReturnValue({});

            const services = {
                settingsService: mockSettingsService
            };

            await configCommands.showConfig(services, {});

            expect(consoleLogSpy).toHaveBeenCalled();
        });

        test('CLI-CONFIG-SHOW-004: 获取配置服务异常处理', async () => {
            mockSettingsService.getSettings.mockImplementation(() => {
                throw new Error('获取配置服务异常');
            });

            const services = {
                settingsService: mockSettingsService
            };

            try {
                await configCommands.showConfig(services, {});
            } catch (e) {
                expect(e.message).toContain('获取配置服务异常');
            }
        });
    });

    describe('config get', () => {
        test('CLI-CONFIG-GET-001: 获取moviesDir', async () => {
            mockSettingsService.getSettings.mockReturnValue({
                library: { moviesDir: '/path/to/movies' }
            });

            const services = {
                settingsService: mockSettingsService
            };

            await configCommands.getConfig(services, 'moviesDir');

            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('/path/to/movies'));
        });

        test('CLI-CONFIG-GET-002: 获取theme', async () => {
            mockSettingsService.getSettings.mockReturnValue({
                appearance: { theme: 'dark' }
            });

            const services = {
                settingsService: mockSettingsService
            };

            await configCommands.getConfig(services, 'theme');

            expect(consoleLogSpy).toHaveBeenCalledWith('dark');
        });

        test('CLI-CONFIG-GET-003: 获取不存在的键', async () => {
            mockSettingsService.getSettings.mockReturnValue({
                appearance: { theme: 'dark' }
            });

            const services = {
                settingsService: mockSettingsService
            };

            await configCommands.getConfig(services, 'nonExist');

            expect(consoleLogSpy).toHaveBeenCalledWith('');
        });

        test('CLI-CONFIG-GET-004: 获取嵌套键值', async () => {
            mockSettingsService.getSettings.mockReturnValue({
                library: { moviesDir: '/path/to/movies', scanOnStartup: true }
            });

            const services = {
                settingsService: mockSettingsService
            };

            await configCommands.getConfig(services, 'library.moviesDir');

            expect(consoleLogSpy).toHaveBeenCalled();
        });

        test('CLI-CONFIG-GET-005: 获取配置服务异常处理', async () => {
            mockSettingsService.getSettings.mockImplementation(() => {
                throw new Error('获取配置服务异常');
            });

            const services = {
                settingsService: mockSettingsService
            };

            try {
                await configCommands.getConfig(services, 'theme');
            } catch (e) {
                expect(e.message).toContain('获取配置服务异常');
            }
        });
    });

    describe('config set', () => {
        test('CLI-CONFIG-SET-001: 设置theme', async () => {
            mockSettingsService.getSettings.mockReturnValue({
                appearance: { theme: 'dark' }
            });
            mockSettingsService.saveSettings.mockReturnValue();

            const services = {
                settingsService: mockSettingsService
            };

            await configCommands.setConfig(services, 'theme', 'light');

            expect(mockSettingsService.saveSettings).toHaveBeenCalled();
            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('已更新'));
        });

        test('CLI-CONFIG-SET-002: 设置moviesDir', async () => {
            mockSettingsService.getSettings.mockReturnValue({
                library: { moviesDir: '/old/path' }
            });
            mockSettingsService.saveSettings.mockReturnValue();

            const services = {
                settingsService: mockSettingsService
            };

            await configCommands.setConfig(services, 'moviesDir', '/new/path');

            expect(mockSettingsService.saveSettings).toHaveBeenCalled();
        });

        test('CLI-CONFIG-SET-003: 设置language', async () => {
            mockSettingsService.getSettings.mockReturnValue({
                appearance: { language: 'zh-CN' }
            });
            mockSettingsService.saveSettings.mockReturnValue();

            const services = {
                settingsService: mockSettingsService
            };

            await configCommands.setConfig(services, 'language', 'en-US');

            expect(mockSettingsService.saveSettings).toHaveBeenCalled();
        });

        test('CLI-CONFIG-SET-004: 设置无效键名', async () => {
            mockSettingsService.getSettings.mockReturnValue({});
            mockSettingsService.saveSettings.mockReturnValue();

            const services = {
                settingsService: mockSettingsService
            };

            await configCommands.setConfig(services, 'invalidKey', 'value');

            expect(mockSettingsService.saveSettings).toHaveBeenCalled();
        });

        test('CLI-CONFIG-SET-005: 设置空值', async () => {
            mockSettingsService.getSettings.mockReturnValue({
                appearance: { theme: 'dark' }
            });
            mockSettingsService.saveSettings.mockReturnValue();

            const services = {
                settingsService: mockSettingsService
            };

            await configCommands.setConfig(services, 'theme', '');

            expect(mockSettingsService.saveSettings).toHaveBeenCalled();
        });

        test('CLI-CONFIG-SET-006: 设置配置服务异常处理', async () => {
            mockSettingsService.getSettings.mockReturnValue({
                appearance: { theme: 'dark' }
            });
            mockSettingsService.saveSettings.mockImplementation(() => {
                throw new Error('设置配置服务异常');
            });

            const services = {
                settingsService: mockSettingsService
            };

            try {
                await configCommands.setConfig(services, 'theme', 'light');
            } catch (e) {
                expect(e.message).toContain('设置配置服务异常');
            }
        });
    });

    describe('config reset', () => {
        test('CLI-CONFIG-RESET-001: 重置配置', async () => {
            mockSettingsService.resetToDefaults.mockReturnValue();

            const services = {
                settingsService: mockSettingsService
            };

            await configCommands.resetConfig(services);

            expect(mockSettingsService.resetToDefaults).toHaveBeenCalled();
            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('已重置'));
        });

        test('CLI-CONFIG-RESET-002: 重置配置服务异常处理', async () => {
            mockSettingsService.resetToDefaults.mockImplementation(() => {
                throw new Error('重置配置服务异常');
            });

            const services = {
                settingsService: mockSettingsService
            };

            try {
                await configCommands.resetConfig(services);
            } catch (e) {
                expect(e.message).toContain('重置配置服务异常');
            }
        });
    });
});

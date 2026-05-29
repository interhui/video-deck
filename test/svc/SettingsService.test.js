/**
 * SettingsService 单元测试
 */
const SettingsService = require('../../src/main/services/SettingsService');
const path = require('path');
const fs = require('fs');

describe('SettingsService', () => {
    let service;
    let testDataDir;

    beforeEach(() => {
        testDataDir = path.join(__dirname, 'test-data', 'settings');
        if (!fs.existsSync(testDataDir)) {
            fs.mkdirSync(testDataDir, { recursive: true });
        }
        const settingsPath = path.join(testDataDir, 'settings.json');
        service = new SettingsService(settingsPath);
    });

    afterEach(() => {
        if (fs.existsSync(testDataDir)) {
            fs.rmSync(testDataDir, { recursive: true, force: true });
        }
    });

    describe('constructor', () => {
        test('SVC-SETTINGS-001: 创建实例加载默认设置', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            const settings = service.getSettings();
            expect(settings).toBeDefined();
            expect(settings.appearance).toBeDefined();
            expect(settings.version).toBe('1.0.0');
        });
    });

    describe('getSettings', () => {
        test('SVC-SETTINGS-002: 返回完整设置对象', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            const settings = service.getSettings();
            expect(settings).toHaveProperty('appearance');
            expect(settings).toHaveProperty('layout');
            expect(settings).toHaveProperty('library');
            expect(settings).toHaveProperty('moviebox');
        });
    });

    describe('getTheme / setTheme', () => {
        test('SVC-SETTINGS-003: 返回默认主题', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            expect(service.getTheme()).toBe('dark');
        });

        test('SVC-SETTINGS-004: 设置主题成功', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            service.setTheme('light');
            expect(service.getTheme()).toBe('light');
        });
    });

    describe('getLayoutSettings / setLayoutSettings', () => {
        test('SVC-SETTINGS-005: 返回默认布局', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            const layout = service.getLayoutSettings();
            expect(layout.sidebarWidth).toBe(200);
        });

        test('SVC-SETTINGS-006: 设置布局成功', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            service.setLayoutSettings({ sidebarWidth: 300 });
            expect(service.getLayoutSettings().sidebarWidth).toBe(300);
        });

        test('SVC-SETTINGS-007: 返回默认海报样式为vertical', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            const layout = service.getLayoutSettings();
            expect(layout.posterStyle).toBe('vertical');
        });

        test('SVC-SETTINGS-008: 设置海报样式为horizontal', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            service.setLayoutSettings({ posterStyle: 'horizontal' });
            expect(service.getLayoutSettings().posterStyle).toBe('horizontal');
        });

        test('SVC-SETTINGS-008A: 海报样式值只能是vertical或horizontal', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            const layout = service.getLayoutSettings();
            expect(['vertical', 'horizontal']).toContain(layout.posterStyle);
        });
    });

    describe('getMoviesDir / setMoviesDir', () => {
        test('SVC-SETTINGS-009: 返回电影目录', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            const moviesDir = service.getMoviesDir();
            expect(moviesDir).toBeDefined();
        });

        test('SVC-SETTINGS-010: 设置电影目录', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            service.setMoviesDir('/new/path');
            expect(service.getMoviesDir()).toBe('/new/path');
        });
    });

    describe('getMovieboxDir / setMovieboxDir', () => {
        test('SVC-SETTINGS-011: 返回收藏夹目录', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            const boxDir = service.getMovieboxDir();
            expect(boxDir).toBeDefined();
        });

        test('SVC-SETTINGS-012: 设置收藏夹目录', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            service.setMovieboxDir('/new/box/path');
            expect(service.getMovieboxDir()).toBe('/new/box/path');
        });
    });

    describe('getEmulatorPath / getEmulatorConfig / setEmulatorConfig', () => {
        beforeEach(async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            // Initialize emulators object since default settings don't have it
            if (!service.settings.emulators) {
                service.settings.emulators = {};
            }
        });

        test('SVC-SETTINGS-013: 返回模拟器路径', async () => {
            service.setEmulatorConfig('test', { path: '/emulator/test' });
            expect(service.getEmulatorPath('test')).toBe('/emulator/test');
        });

        test('SVC-SETTINGS-014: 返回模拟器配置', async () => {
            service.setEmulatorConfig('test', { path: '/emulator/test', exe: 'test.exe' });
            expect(service.getEmulatorConfig('test').exe).toBe('test.exe');
        });

        test('SVC-SETTINGS-015: 设置模拟器配置', async () => {
            service.setEmulatorConfig('new', { path: '/new' });
            expect(service.getEmulatorConfig('new').path).toBe('/new');
        });

        test('SVC-SETTINGS-016: 不存在返回null', async () => {
            expect(service.getEmulatorConfig('unknown')).toBeNull();
        });
    });

    describe('getLanguage / setLanguage', () => {
        test('SVC-SETTINGS-017: 返回默认语言', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            expect(service.getLanguage()).toBe('zh-CN');
        });

        test('SVC-SETTINGS-018: 设置语言成功', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            service.setLanguage('en-US');
            expect(service.getLanguage()).toBe('en-US');
        });
    });

    describe('mergeDeep', () => {
        test('SVC-SETTINGS-022: 深度合并对象', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            const target = { a: 1, b: { c: 2 } };
            const source = { b: { d: 3 }, e: 4 };
            const result = service.mergeDeep(target, source);
            expect(result.a).toBe(1);
            expect(result.b.c).toBe(2);
            expect(result.b.d).toBe(3);
            expect(result.e).toBe(4);
        });

        test('SVC-SETTINGS-023: 源对象覆盖目标', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            const target = { a: 1, b: { c: 2 } };
            const source = { a: 10, b: { c: 20 } };
            const result = service.mergeDeep(target, source);
            expect(result.a).toBe(10);
            expect(result.b.c).toBe(20);
        });
    });

    describe('resetToDefaults', () => {
        test('SVC-SETTINGS-024: 重置为默认设置', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            service.setTheme('light');
            service.resetToDefaults();
            expect(service.getTheme()).toBe('dark');
        });
    });

    describe('exportSettings / importSettings', () => {
        test('SVC-SETTINGS-025: 导出设置JSON', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            const exported = service.exportSettings();
            expect(typeof exported).toBe('string');
            const parsed = JSON.parse(exported);
            expect(parsed.appearance).toBeDefined();
        });

        test('SVC-SETTINGS-026: 导入设置成功', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            const jsonStr = JSON.stringify({ appearance: { theme: 'light' } });
            service.importSettings(jsonStr);
            expect(service.getTheme()).toBe('light');
        });

        test('SVC-SETTINGS-027: 无效JSON抛错误', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            expect(() => service.importSettings('invalid json')).toThrow();
        });
    });

    describe('newMovieHours', () => {
        test('SVC-SETTINGS-028: 默认新电影时间段为72小时', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            expect(service.getNewMovieHours()).toBe(72);
        });

        test('SVC-SETTINGS-029: 设置新电影时间段', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            service.setNewMovieHours(48);
            expect(service.getNewMovieHours()).toBe(48);
        });

        test('SVC-SETTINGS-030: 新电影时间段在library配置中', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            const settings = service.getSettings();
            expect(settings.library.newMovieHours).toBeDefined();
        });
    });

    describe('TMDB配置 (getTmdbConfig / setTmdbConfig)', () => {
        test('SVC-SETTINGS-031: 返回默认TMDB配置', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            const config = service.getTmdbConfig();
            expect(config.url).toBe('api.themoviedb.org');
            expect(config.token).toBe('');
            expect(config.language).toBe('zh-CN');
        });

        test('SVC-SETTINGS-032: 设置TMDB域名', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            service.setTmdbConfig({ url: 'api.example.com' });
            expect(service.getTmdbConfig().url).toBe('api.example.com');
        });

        test('SVC-SETTINGS-033: 设置TMDB语言', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            service.setTmdbConfig({ language: 'en-US' });
            expect(service.getTmdbConfig().language).toBe('en-US');
        });

        test('SVC-SETTINGS-034: 设置TMDB凭据(Token)', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            service.setTmdbConfig({ token: 'my-secret-token' });
            expect(service.getTmdbConfig().token).toBe('my-secret-token');
        });

        test('SVC-SETTINGS-035: 完整设置TMDB配置', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            service.setTmdbConfig({
                url: 'api.newdomain.com',
                language: 'zh-TW',
                token: 'new-token-123'
            });
            const config = service.getTmdbConfig();
            expect(config.url).toBe('api.newdomain.com');
            expect(config.language).toBe('zh-TW');
            expect(config.token).toBe('new-token-123');
        });

        test('SVC-SETTINGS-036: 部分更新TMDB配置保留其他字段', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            service.setTmdbConfig({ url: 'api.changed.com' });
            const config = service.getTmdbConfig();
            expect(config.url).toBe('api.changed.com');
            expect(config.language).toBe('zh-CN'); // 保留默认值
            expect(config.token).toBe(''); // 保留默认值
        });

        test('SVC-SETTINGS-037: TMDB配置在settings中正确保存', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            service.setTmdbConfig({ token: 'saved-token' });
            const settings = service.getSettings();
            expect(settings.tmdb).toBeDefined();
            expect(settings.tmdb.token).toBe('saved-token');
        });
    });
});

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
            // moviebox 节点已迁移至 library.libraries.*.movieboxDir
            expect(settings).not.toHaveProperty('moviebox');
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

    /**
     * 多影视库管理相关测试
     */
    describe('多影视库 (Libraries)', () => {
        test('SVC-SETTINGS-046: 默认包含名为 default 的影视库', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            const libs = service.getLibraries();
            expect(libs).toHaveProperty('default');
            expect(libs.default).toHaveProperty('moviesDir');
            expect(libs.default).toHaveProperty('actorPhotoDir');
            expect(libs.default).toHaveProperty('movieboxDir');
        });

        test('SVC-SETTINGS-047: 默认 currentLibrary 值为 default', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            expect(service.getCurrentLibraryName()).toBe('default');
        });

        test('SVC-SETTINGS-048: 新增影视库', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            const result = service.addLibrary('family', {
                moviesDir: 'D:/movies/family',
                actorPhotoDir: 'D:/actors/family',
                movieboxDir: 'D:/boxes/family'
            });
            expect(result.success).toBe(true);
            const libs = service.getLibraries();
            expect(libs).toHaveProperty('family');
            expect(libs.family.moviesDir).toBe('D:/movies/family');
        });

        test('SVC-SETTINGS-049: 重复新增同名影视库应失败', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            const r1 = service.addLibrary('home', { moviesDir: 'D:/m' });
            expect(r1.success).toBe(true);
            const r2 = service.addLibrary('home', { moviesDir: 'D:/m2' });
            expect(r2.success).toBe(false);
            expect(r2.error).toBeDefined();
        });

        test('SVC-SETTINGS-050: 新增空名称影视库应失败', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            const r1 = service.addLibrary('', { moviesDir: 'D:/m' });
            expect(r1.success).toBe(false);
            const r2 = service.addLibrary('   ', { moviesDir: 'D:/m' });
            expect(r2.success).toBe(false);
        });

        test('SVC-SETTINGS-051: 新增影视库支持省略目录字段', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            const result = service.addLibrary('minimal', {});
            expect(result.success).toBe(true);
            const lib = service.getLibrary('minimal');
            expect(lib.moviesDir).toBe('');
            expect(lib.actorPhotoDir).toBe('');
            expect(lib.movieboxDir).toBe('');
        });

        test('SVC-SETTINGS-052: 切换当前影视库', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            service.addLibrary('work', { moviesDir: 'D:/work/movies', movieboxDir: 'D:/work/boxes' });
            const ok = service.setCurrentLibrary('work');
            expect(ok).toBe(true);
            expect(service.getCurrentLibraryName()).toBe('work');
            expect(service.getMoviesDir()).toBe('D:/work/movies');
            expect(service.getMovieboxDir()).toBe('D:/work/boxes');
        });

        test('SVC-SETTINGS-053: 切换到不存在的影视库应失败', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            const ok = service.setCurrentLibrary('not-exists');
            expect(ok).toBe(false);
            // currentLibrary 不变
            expect(service.getCurrentLibraryName()).toBe('default');
        });

        test('SVC-SETTINGS-054: 切换时去除前后空格', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            service.addLibrary('office', { moviesDir: 'D:/office' });
            const ok = service.setCurrentLibrary('  office  ');
            expect(ok).toBe(true);
            expect(service.getCurrentLibraryName()).toBe('office');
        });

        test('SVC-SETTINGS-055: 切换当前库后目录读取跟随', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            service.addLibrary('movieA', {
                moviesDir: 'D:/a/movies',
                actorPhotoDir: 'D:/a/actors',
                movieboxDir: 'D:/a/boxes'
            });
            service.setCurrentLibrary('movieA');
            expect(service.getMoviesDir()).toBe('D:/a/movies');
            expect(service.getActorPhotoDir()).toBe('D:/a/actors');
            expect(service.getMovieboxDir()).toBe('D:/a/boxes');
            service.setCurrentLibrary('default');
            expect(service.getMoviesDir()).not.toBe('D:/a/movies');
        });

        test('SVC-SETTINGS-056: 不能删除当前影视库', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            const r = service.removeLibrary('default');
            expect(r.success).toBe(false);
            expect(service.getLibraries()).toHaveProperty('default');
        });

        test('SVC-SETTINGS-057: 可以删除非当前影视库', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            service.addLibrary('temp', { moviesDir: 'D:/temp' });
            const r = service.removeLibrary('temp');
            expect(r.success).toBe(true);
            expect(service.getLibraries()).not.toHaveProperty('temp');
        });

        test('SVC-SETTINGS-058: 删除不存在的影视库失败', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            const r = service.removeLibrary('nonexistent');
            expect(r.success).toBe(false);
        });

        test('SVC-SETTINGS-059: 更新指定影视库的目录', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            service.addLibrary('upd', { moviesDir: 'D:/old' });
            const r = service.updateLibrary('upd', { moviesDir: 'D:/new', actorPhotoDir: 'D:/actors/new' });
            expect(r.success).toBe(true);
            const lib = service.getLibrary('upd');
            expect(lib.moviesDir).toBe('D:/new');
            expect(lib.actorPhotoDir).toBe('D:/actors/new');
            // 未修改字段保持不变
            expect(lib.movieboxDir).toBe('');
        });

        test('SVC-SETTINGS-060: 更新不存在的影视库应失败', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            const r = service.updateLibrary('not-here', { moviesDir: 'D:/x' });
            expect(r.success).toBe(false);
        });

        test('SVC-SETTINGS-061: setMoviesDir 作用于当前库', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            service.addLibrary('S', { moviesDir: 'D:/S1' });
            service.setCurrentLibrary('S');
            service.setMoviesDir('D:/S2');
            expect(service.getMoviesDir()).toBe('D:/S2');
            expect(service.getLibrary('S').moviesDir).toBe('D:/S2');
        });

        test('SVC-SETTINGS-062: setMovieboxDir 作用于当前库', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            service.addLibrary('B', { movieboxDir: 'D:/B1' });
            service.setCurrentLibrary('B');
            service.setMovieboxDir('D:/B2');
            expect(service.getMovieboxDir()).toBe('D:/B2');
            expect(service.getLibrary('B').movieboxDir).toBe('D:/B2');
        });

        test('SVC-SETTINGS-063: setActorPhotoDir 作用于当前库', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            service.addLibrary('A', { actorPhotoDir: 'D:/A1' });
            service.setCurrentLibrary('A');
            service.setActorPhotoDir('D:/A2');
            expect(service.getActorPhotoDir()).toBe('D:/A2');
            expect(service.getLibrary('A').actorPhotoDir).toBe('D:/A2');
        });

        test('SVC-SETTINGS-064: getLibraries 返回深拷贝，不污染内部状态', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            const libs = service.getLibraries();
            libs.default.moviesDir = 'POISONED';
            // 内部 state 应保持不变
            expect(service.getMoviesDir()).not.toBe('POISONED');
        });

        test('SVC-SETTINGS-065: getLibrary 在 name 为空时回退到当前库', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            const currentName = service.getCurrentLibraryName();
            const lib = service.getLibrary();
            expect(lib).toEqual(service.getLibrary(currentName));
        });

        test('SVC-SETTINGS-066: getLibrary 找不到时回退到第一个可用库', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            service.addLibrary('fallback', { moviesDir: 'D:/fallback' });
            // 强制把 currentLibrary 设到一个不存在的名字
            service.settings.library.currentLibrary = 'not-real';
            const lib = service.getLibrary();
            expect(lib).not.toBeNull();
        });
    });

    describe('旧结构迁移 (Migrate Legacy Settings)', () => {
        // 这些测试使用独立子目录，避免与外层 beforeEach 中的 service 产生竞态
        let subDir;
        beforeEach(() => {
            subDir = path.join(__dirname, 'test-data', 'settings-legacy-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8));
            fs.mkdirSync(subDir, { recursive: true });
        });
        afterEach(() => {
            if (fs.existsSync(subDir)) {
                fs.rmSync(subDir, { recursive: true, force: true });
            }
        });

        test('SVC-SETTINGS-067: 加载旧结构时自动迁移到多库结构', async () => {
            const legacy = {
                version: '1.0.0',
                library: {
                    moviesDir: 'D:/legacy/movies',
                    actorPhotoDir: 'D:/legacy/actors',
                    newMovieHours: 96
                },
                moviebox: {
                    movieboxDir: 'D:/legacy/boxes'
                }
            };
            const file = path.join(subDir, 'settings.json');
            fs.writeFileSync(file, JSON.stringify(legacy, null, 2));
            const svc = new SettingsService(file);
            await new Promise(resolve => setTimeout(resolve, 200));

            const settings = svc.getSettings();
            expect(settings.library.libraries).toBeDefined();
            expect(settings.library.libraries.default).toBeDefined();
            expect(settings.library.libraries.default.moviesDir).toBe('D:/legacy/movies');
            expect(settings.library.libraries.default.actorPhotoDir).toBe('D:/legacy/actors');
            expect(settings.library.libraries.default.movieboxDir).toBe('D:/legacy/boxes');
            expect(settings.library.currentLibrary).toBe('default');
            expect(settings.library.newMovieHours).toBe(96);
            expect(settings.moviebox).toBeUndefined();
        });

        test('SVC-SETTINGS-068: 已是新结构时不重复迁移', async () => {
            const modern = {
                version: '1.0.0',
                library: {
                    libraries: {
                        custom: {
                            moviesDir: 'D:/custom',
                            actorPhotoDir: 'D:/actors',
                            movieboxDir: 'D:/boxes'
                        }
                    },
                    currentLibrary: 'custom',
                    newMovieHours: 48
                }
            };
            const file = path.join(subDir, 'settings.json');
            fs.writeFileSync(file, JSON.stringify(modern, null, 2));
            const svc = new SettingsService(file);
            await new Promise(resolve => setTimeout(resolve, 200));

            const settings = svc.getSettings();
            expect(settings.library.libraries.custom.moviesDir).toBe('D:/custom');
            expect(settings.library.currentLibrary).toBe('custom');
            expect(settings.library.newMovieHours).toBe(48);
        });

        test('SVC-SETTINGS-069: 迁移后能保存到磁盘', async () => {
            const legacy = {
                library: { moviesDir: 'D:/x' },
                moviebox: { movieboxDir: 'D:/y' }
            };
            const file = path.join(subDir, 'settings.json');
            fs.writeFileSync(file, JSON.stringify(legacy, null, 2));
            const svc = new SettingsService(file);
            await new Promise(resolve => setTimeout(resolve, 200));
            // 触发一次保存
            svc.setTheme('light');
            await new Promise(resolve => setTimeout(resolve, 100));
            const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
            expect(raw.library.libraries).toBeDefined();
            expect(raw.library.currentLibrary).toBe('default');
        });

        test('SVC-SETTINGS-070: importSettings 也能迁移旧结构', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            const legacyJson = JSON.stringify({
                library: { moviesDir: 'D:/imp' },
                moviebox: { movieboxDir: 'D:/impb' }
            });
            service.importSettings(legacyJson);
            const settings = service.getSettings();
            expect(settings.library.libraries.default.moviesDir).toBe('D:/imp');
            expect(settings.library.libraries.default.movieboxDir).toBe('D:/impb');
            expect(settings.moviebox).toBeUndefined();
        });

        test('SVC-SETTINGS-071: saveSettings 兼容旧 moviebox 字段并迁移到当前库', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            service.saveSettings({
                moviebox: { movieboxDir: 'D:/legacy/box' },
                library: {
                    libraries: {
                        default: { moviesDir: 'D:/d/m', actorPhotoDir: '', movieboxDir: '' }
                    },
                    currentLibrary: 'default',
                    newMovieHours: 72
                }
            });
            const settings = service.getSettings();
            expect(settings.library.libraries.default.movieboxDir).toBe('D:/legacy/box');
            expect(settings.moviebox).toBeUndefined();
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

    describe('播放器配置 (getPlayerConfig / setPlayerConfig)', () => {
        test('SVC-SETTINGS-038: 返回默认播放器配置', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            const config = service.getPlayerConfig();
            expect(config.subtitle.backgroundColor).toBe('rgba(0, 0, 0, 0.7)');
            expect(config.subtitle.fontSize).toBe('36px');
            expect(config.subtitle.fontWeight).toBe('800');
            expect(config.subtitle.textStroke).toBe('2px #000');
        });

        test('SVC-SETTINGS-039: 设置字幕背景颜色', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            service.setPlayerConfig({ subtitle: { backgroundColor: 'transparent' } });
            expect(service.getPlayerConfig().subtitle.backgroundColor).toBe('transparent');
        });

        test('SVC-SETTINGS-040: 部分更新播放器配置保留其他字段', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            service.setPlayerConfig({ subtitle: { fontSize: '24px' } });
            const config = service.getPlayerConfig();
            expect(config.subtitle.fontSize).toBe('24px');
            expect(config.subtitle.backgroundColor).toBe('rgba(0, 0, 0, 0.7)');
            expect(config.subtitle.fontWeight).toBe('800');
            expect(config.subtitle.textStroke).toBe('2px #000');
        });

        test('SVC-SETTINGS-041: 播放器配置在settings中正确保存', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            service.setPlayerConfig({ subtitle: { fontSize: '28px' } });
            const settings = service.getSettings();
            expect(settings.player).toBeDefined();
            expect(settings.player.subtitle.fontSize).toBe('28px');
        });

        test('SVC-SETTINGS-042: 设置字体加粗', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            service.setPlayerConfig({ subtitle: { fontWeight: '700' } });
            expect(service.getPlayerConfig().subtitle.fontWeight).toBe('700');
        });

        test('SVC-SETTINGS-043: 设置字体边框', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            service.setPlayerConfig({ subtitle: { textStroke: '2px #fff' } });
            expect(service.getPlayerConfig().subtitle.textStroke).toBe('2px #fff');
        });

        test('SVC-SETTINGS-044: 部分更新fontWeight保留其他字段', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            service.setPlayerConfig({ subtitle: { fontWeight: '600' } });
            const config = service.getPlayerConfig();
            expect(config.subtitle.fontWeight).toBe('600');
            expect(config.subtitle.fontSize).toBe('36px');
            expect(config.subtitle.textStroke).toBe('2px #000');
        });

        test('SVC-SETTINGS-045: 部分更新textStroke保留其他字段', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            service.setPlayerConfig({ subtitle: { textStroke: '3px #333' } });
            const config = service.getPlayerConfig();
            expect(config.subtitle.textStroke).toBe('3px #333');
            expect(config.subtitle.fontSize).toBe('36px');
            expect(config.subtitle.fontWeight).toBe('800');
        });
    });
});

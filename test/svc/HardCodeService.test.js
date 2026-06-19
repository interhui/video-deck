/**
 * HardCodeService 单元测试
 */
const HardCodeService = require('../../src/main/services/HardCodeService');

describe('HardCodeService', () => {
    let service;

    beforeEach(() => {
        service = new HardCodeService();
    });

    describe('constructor', () => {
        test('SVC-HARDCODED-001: 创建实例', () => {
            expect(service).toBeDefined();
        });
    });

    describe('getDefaultSettings', () => {
        test('SVC-HARDCODED-002: 返回默认设置对象', () => {
            const settings = service.getDefaultSettings();
            expect(settings).toBeDefined();
            expect(typeof settings).toBe('object');
        });

        test('SVC-HARDCODED-003: 包含顶层属性', () => {
            const settings = service.getDefaultSettings();
            const topLevelProps = ['appearance', 'layout', 'library',
                'version', 'lastUpdate'];
            topLevelProps.forEach(prop => {
                expect(settings).toHaveProperty(prop);
            });
        });

        test('SVC-HARDCODED-004: appearance属性正确', () => {
            const settings = service.getDefaultSettings();
            expect(settings.appearance.theme).toBe('dark');
            expect(settings.appearance.language).toBe('zh-CN');
        });

        test('SVC-HARDCODED-005: layout属性正确', () => {
            const settings = service.getDefaultSettings();
            expect(settings.layout.sidebarWidth).toBe(200);
            expect(settings.layout.viewMode).toBe('grid');
            expect(settings.layout.posterStyle).toBe('vertical');
        });

        test('SVC-HARDCODED-005A: posterStyle默认为vertical', () => {
            const settings = service.getDefaultSettings();
            expect(settings.layout.posterStyle).toBe('vertical');
            expect(['vertical', 'horizontal']).toContain(settings.layout.posterStyle);
        });

        test('SVC-HARDCODED-006: library属性正确', () => {
            const settings = service.getDefaultSettings();
            expect(settings.library).toBeDefined();
            expect(settings.library.libraries).toBeDefined();
            expect(settings.library.libraries.default).toBeDefined();
            expect(settings.library.libraries.default.moviesDir).toBeDefined();
            expect(settings.library.libraries.default.actorPhotoDir).toBeDefined();
            expect(settings.library.libraries.default.movieboxDir).toBeDefined();
            expect(settings.library.currentLibrary).toBe('default');
            expect(settings.library.newMovieHours).toBe(72);
        });

        test('SVC-HARDCODED-008: moviebox 顶层节点已移除', () => {
            const settings = service.getDefaultSettings();
            expect(settings.moviebox).toBeUndefined();
        });

    });

    describe('getDefaultTags', () => {
        test('SVC-HARDCODED-010: 返回默认标签数组', () => {
            const tags = service.getDefaultTags();
            expect(Array.isArray(tags)).toBe(true);
            expect(tags.length).toBeGreaterThan(0);
        });

        test('SVC-HARDCODED-011: 标签有id和name', () => {
            const tags = service.getDefaultTags();
            tags.forEach(tag => {
                expect(tag).toHaveProperty('id');
                expect(tag).toHaveProperty('name');
                expect(typeof tag.id).toBe('string');
                expect(typeof tag.name).toBe('string');
            });
        });

        test('SVC-HARDCODED-012: 标签id唯一', () => {
            const tags = service.getDefaultTags();
            const ids = tags.map(t => t.id);
            const uniqueIds = [...new Set(ids)];
            expect(uniqueIds).toHaveLength(ids.length);
        });
    });

    describe('getDefaultCategories', () => {
        test('SVC-HARDCODED-013: 返回4个分类', () => {
            const categories = service.getDefaultCategories();
            expect(categories).toHaveLength(4);
        });

        test('SVC-HARDCODED-014: 分类有必含属性', () => {
            const categories = service.getDefaultCategories();
            const requiredProps = ['id', 'name', 'shortName', 'icon', 'color', 'order'];
            categories.forEach(cat => {
                requiredProps.forEach(prop => {
                    expect(cat).toHaveProperty(prop);
                });
            });
        });

        test('SVC-HARDCODED-015: 分类id唯一', () => {
            const categories = service.getDefaultCategories();
            const ids = categories.map(c => c.id);
            const uniqueIds = [...new Set(ids)];
            expect(uniqueIds).toHaveLength(ids.length);
        });

        test('SVC-HARDCODED-016: 按order排序', () => {
            const categories = service.getDefaultCategories();
            for (let i = 1; i < categories.length; i++) {
                expect(categories[i].order).toBeGreaterThanOrEqual(categories[i-1].order);
            }
        });
    });
});

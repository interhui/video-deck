/**
 * CategoryService 单元测试
 */
const CategoryService = require('../../src/main/services/CategoryService');
const path = require('path');
const fs = require('fs');

describe('CategoryService', () => {
    let service;
    let testDataDir;

    beforeEach(() => {
        testDataDir = path.join(__dirname, 'test-data', 'categories');
        if (!fs.existsSync(testDataDir)) {
            fs.mkdirSync(testDataDir, { recursive: true });
        }
        const configPath = path.join(testDataDir, 'categories.json');
        service = new CategoryService(configPath);
        service.clearCache();
    });

    afterEach(() => {
        service.clearCache();
        if (fs.existsSync(testDataDir)) {
            fs.rmSync(testDataDir, { recursive: true, force: true });
        }
    });

    describe('constructor', () => {
        test('SVC-CATEGORY-001: 创建实例', () => {
            expect(service).toBeDefined();
            expect(service.categoriesCache).toBeNull();
        });
    });

    describe('loadCategories (异步)', () => {
        test('SVC-CATEGORY-002: 有缓存直接返回', async () => {
            service.categoriesCache = [{ id: 'cached', name: 'Cached' }];
            const result = await service.loadCategories();
            expect(result).toEqual([{ id: 'cached', name: 'Cached' }]);
        });

        test('SVC-CATEGORY-003: 无缓存有文件读取并缓存', async () => {
            const config = {
                categories: [{ id: 'movie', name: '电影', shortName: '电影', icon: '', color: '#000', order: 1 }]
            };
            fs.writeFileSync(path.join(testDataDir, 'categories.json'), JSON.stringify(config));

            const result = await service.loadCategories();
            expect(result[0].id).toBe('movie');
            expect(service.categoriesCache).toEqual(result);
        });

        test('SVC-CATEGORY-004: 无缓存无文件用默认保存', async () => {
            const result = await service.loadCategories();
            expect(result).toHaveLength(4);
            expect(fs.existsSync(path.join(testDataDir, 'categories.json'))).toBe(true);
        });
    });

    describe('getCategories (同步)', () => {
        test('SVC-CATEGORY-005: 无缓存无文件返回默认', () => {
            const categories = service.getCategories();
            expect(categories).toHaveLength(4);
            expect(categories.map(c => c.id)).toContain('movie');
            expect(categories.map(c => c.id)).toContain('tv');
            expect(categories.map(c => c.id)).toContain('documentary');
            expect(categories.map(c => c.id)).toContain('anime');
        });

        test('SVC-CATEGORY-006: 有缓存直接返回', () => {
            service.categoriesCache = [{ id: 'test', name: 'Test' }];
            const categories = service.getCategories();
            expect(categories).toEqual([{ id: 'test', name: 'Test' }]);
        });
    });

    describe('getCategoryById', () => {
        test('SVC-CATEGORY-007: 返回分类信息', () => {
            service.categoriesCache = [
                { id: 'movie', name: '电影', shortName: '电影', icon: '', color: '#000', order: 1 }
            ];
            const result = service.getCategoryById('movie');
            expect(result.name).toBe('电影');
        });

        test('SVC-CATEGORY-008: 不存在返回null', () => {
            service.categoriesCache = [{ id: 'movie', name: '电影', shortName: '电影', icon: '', color: '#000', order: 1 }];
            expect(service.getCategoryById('unknown')).toBeNull();
        });
    });

    describe('getCategoryName', () => {
        test('SVC-CATEGORY-009: 返回正确名称', () => {
            service.categoriesCache = [{ id: 'movie', name: '电影', shortName: '电影', icon: '', color: '#000', order: 1 }];
            expect(service.getCategoryName('movie')).toBe('电影');
        });

        test('SVC-CATEGORY-010: 不存在返回null', () => {
            service.categoriesCache = [{ id: 'movie', name: '电影', shortName: '电影', icon: '', color: '#000', order: 1 }];
            expect(service.getCategoryName('unknown')).toBeNull();
        });
    });

    describe('getCategoryShortName', () => {
        test('SVC-CATEGORY-011: 返回正确短名称', () => {
            service.categoriesCache = [{ id: 'movie', name: '电影', shortName: '电影', icon: '', color: '#000', order: 1 }];
            expect(service.getCategoryShortName('movie')).toBe('电影');
        });

        test('SVC-CATEGORY-012: 不存在返回null', () => {
            service.categoriesCache = [{ id: 'movie', name: '电影', shortName: '电影', icon: '', color: '#000', order: 1 }];
            expect(service.getCategoryShortName('unknown')).toBeNull();
        });
    });

    describe('getCategoryIcon', () => {
        test('SVC-CATEGORY-013: 返回图标路径', () => {
            service.categoriesCache = [{ id: 'movie', name: '电影', shortName: '电影', icon: 'path/to/icon.png', color: '#000', order: 1 }];
            expect(service.getCategoryIcon('movie')).toBe('path/to/icon.png');
        });

        test('SVC-CATEGORY-014: 不存在返回null', () => {
            service.categoriesCache = [{ id: 'movie', name: '电影', shortName: '电影', icon: '', color: '#000', order: 1 }];
            expect(service.getCategoryIcon('unknown')).toBeNull();
        });
    });

    describe('getCategoryColor', () => {
        test('SVC-CATEGORY-015: 返回颜色值', () => {
            service.categoriesCache = [{ id: 'movie', name: '电影', shortName: '电影', icon: '', color: '#003791', order: 1 }];
            expect(service.getCategoryColor('movie')).toBe('#003791');
        });

        test('SVC-CATEGORY-016: 不存在返回null', () => {
            service.categoriesCache = [{ id: 'movie', name: '电影', shortName: '电影', icon: '', color: '#000', order: 1 }];
            expect(service.getCategoryColor('unknown')).toBeNull();
        });
    });

    describe('saveCategories', () => {
        test('SVC-CATEGORY-017: 保存并更新缓存', async () => {
            const newCategories = [{ id: 'new', name: 'New', shortName: 'N', icon: '', color: '#000', order: 1 }];
            await service.saveCategories(newCategories);
            expect(service.categoriesCache).toEqual(newCategories);
        });
    });

    describe('clearCache', () => {
        test('SVC-CATEGORY-020: 清除缓存', () => {
            service.categoriesCache = [{ id: 'test', name: 'Test' }];
            service.clearCache();
            expect(service.categoriesCache).toBeNull();
        });
    });
});

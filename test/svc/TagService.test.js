/**
 * TagService 单元测试
 */
const TagService = require('../../src/main/services/TagService');
const path = require('path');
const fs = require('fs');

describe('TagService', () => {
    let service;
    let testDataDir;

    beforeEach(() => {
        testDataDir = path.join(__dirname, 'test-data', 'tags');
        if (!fs.existsSync(testDataDir)) {
            fs.mkdirSync(testDataDir, { recursive: true });
        }
        service = new TagService(path.join(testDataDir, 'tags.json'));
        service.clearCache();
    });

    afterEach(() => {
        service.clearCache();
        if (fs.existsSync(testDataDir)) {
            fs.rmSync(testDataDir, { recursive: true, force: true });
        }
    });

    describe('constructor', () => {
        test('SVC-TAG-001: 创建TagService实例', () => {
            expect(service).toBeDefined();
            expect(service.tagsCache).toBeNull();
        });
    });

    describe('loadTags (异步)', () => {
        test('SVC-TAG-002: 有缓存直接返回', async () => {
            service.tagsCache = [{ id: 'cached', name: 'Cached' }];
            const result = await service.loadTags();
            expect(result).toEqual([{ id: 'cached', name: 'Cached' }]);
        });

        test('SVC-TAG-003: 无缓存有文件读取并缓存', async () => {
            const tags = [{ id: 'action', name: '动作' }];
            fs.writeFileSync(path.join(testDataDir, 'tags.json'), JSON.stringify(tags));

            const result = await service.loadTags();
            expect(result).toEqual(tags);
            expect(service.tagsCache).toEqual(tags);
        });

        test('SVC-TAG-004: 无缓存无文件用默认保存', async () => {
            const result = await service.loadTags();
            expect(result).toHaveLength(10);
            expect(fs.existsSync(path.join(testDataDir, 'tags.json'))).toBe(true);
        });
    });

    describe('getTags (同步)', () => {
        test('SVC-TAG-005: 无缓存无文件返回默认', () => {
            const tags = service.getTags();
            expect(tags).toHaveLength(10);
        });

        test('SVC-TAG-006: 有缓存直接返回', () => {
            service.tagsCache = [{ id: 'test', name: 'Test' }];
            const tags = service.getTags();
            expect(tags).toEqual([{ id: 'test', name: 'Test' }]);
        });
    });

    describe('getTagNameById', () => {
        test('SVC-TAG-007: 正确返回标签名', () => {
            service.tagsCache = [{ id: 'action', name: '动作' }, { id: 'rpg', name: '角色扮演' }];
            expect(service.getTagNameById('action')).toBe('动作');
        });

        test('SVC-TAG-008: ID不存在返回null', () => {
            service.tagsCache = [{ id: 'action', name: '动作' }];
            expect(service.getTagNameById('unknown')).toBeNull();
        });

        test('SVC-TAG-009: 空数组返回null', () => {
            service.tagsCache = [];
            expect(service.getTagNameById('anything')).toBeNull();
        });
    });

    describe('getTagNamesByIds', () => {
        test('SVC-TAG-010: 返回标签名数组', () => {
            service.tagsCache = [{ id: 'action', name: '动作' }, { id: 'rpg', name: '角色扮演' }];
            const result = service.getTagNamesByIds(['action', 'rpg']);
            expect(result).toEqual(['动作', '角色扮演']);
        });

        test('SVC-TAG-011: 空数组返回空数组', () => {
            service.tagsCache = [{ id: 'action', name: '动作' }];
            expect(service.getTagNamesByIds([])).toEqual([]);
        });

        test('SVC-TAG-012: null/undefined返回空数组', () => {
            service.tagsCache = [{ id: 'action', name: '动作' }];
            expect(service.getTagNamesByIds(null)).toEqual([]);
            expect(service.getTagNamesByIds(undefined)).toEqual([]);
        });

        test('SVC-TAG-013: 部分ID存在只返回存在的', () => {
            service.tagsCache = [{ id: 'action', name: '动作' }];
            const result = service.getTagNamesByIds(['action', 'unknown']);
            expect(result).toEqual(['动作']);
        });
    });

    describe('saveTags', () => {
        test('SVC-TAG-014: 保存并更新缓存', async () => {
            const newTags = [{ id: 'new', name: 'New Tag' }];
            await service.saveTags(newTags);
            expect(service.tagsCache).toEqual(newTags);
            const content = JSON.parse(fs.readFileSync(path.join(testDataDir, 'tags.json'), 'utf-8'));
            expect(content).toEqual(newTags);
        });
    });

    describe('clearCache', () => {
        test('SVC-TAG-017: 清除缓存', () => {
            service.tagsCache = [{ id: 'test', name: 'Test' }];
            service.clearCache();
            expect(service.tagsCache).toBeNull();
        });
    });
});

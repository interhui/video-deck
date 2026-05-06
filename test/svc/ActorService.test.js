/**
 * ActorService 单元测试
 */
const ActorService = require('../../src/main/services/ActorService');
const path = require('path');
const fs = require('fs');

describe('ActorService', () => {
    let service;
    let testDataDir;

    beforeEach(() => {
        testDataDir = path.join(__dirname, 'test-data', 'actors');
        if (!fs.existsSync(testDataDir)) {
            fs.mkdirSync(testDataDir, { recursive: true });
        }
        service = new ActorService(path.join(testDataDir, 'actor.json'));
        service.clearCache();
    });

    afterEach(() => {
        service.clearCache();
        if (fs.existsSync(testDataDir)) {
            fs.rmSync(testDataDir, { recursive: true, force: true });
        }
    });

    describe('constructor', () => {
        test('SVC-ACTOR-001: 创建ActorService实例', () => {
            expect(service).toBeDefined();
            expect(service.actorsCache).toBeNull();
        });
    });

    describe('loadActors (异步)', () => {
        test('SVC-ACTOR-002: 有缓存直接返回', async () => {
            service.actorsCache = [{ name: '张三', nickname: '小张' }];
            const result = await service.loadActors();
            expect(result).toEqual([{ name: '张三', nickname: '小张' }]);
        });

        test('SVC-ACTOR-003: 无缓存有文件读取并缓存', async () => {
            const actors = [{ name: '李四', nickname: '小李' }];
            fs.writeFileSync(path.join(testDataDir, 'actor.json'), JSON.stringify({ actor: actors }));

            const result = await service.loadActors();
            expect(result).toEqual(actors);
            expect(service.actorsCache).toEqual(actors);
        });

        test('SVC-ACTOR-004: 无缓存无文件返回空数组', async () => {
            const result = await service.loadActors();
            expect(result).toEqual([]);
            expect(service.actorsCache).toEqual([]);
        });
    });

    describe('getActors (同步)', () => {
        test('SVC-ACTOR-005: 无缓存无文件返回空数组', () => {
            const actors = service.getActors();
            expect(actors).toEqual([]);
        });

        test('SVC-ACTOR-006: 有缓存直接返回', () => {
            service.actorsCache = [{ name: '王五', nickname: '小王' }];
            const actors = service.getActors();
            expect(actors).toEqual([{ name: '王五', nickname: '小王' }]);
        });
    });

    describe('addActor', () => {
        test('SVC-ACTOR-007: 添加新演员', async () => {
            const actor = { name: '赵六', nickname: '小赵', birthday: '1990-01-01', memo: '备注' };
            await service.addActor(actor);

            const actors = service.getActors();
            expect(actors).toHaveLength(1);
            expect(actors[0].name).toBe('赵六');
            expect(actors[0].nickname).toBe('小赵');
            expect(actors[0].birthday).toBe('1990-01-01');
            expect(actors[0].memo).toBe('备注');
            expect(actors[0].photo).toBe('');
        });

        test('SVC-ACTOR-008: 添加已存在演员抛出错误', async () => {
            await service.addActor({ name: '孙七' });
            await expect(service.addActor({ name: '孙七' })).rejects.toThrow('演员已存在');
        });

        test('添加演员姓名不能为空', async () => {
            await expect(service.addActor({})).rejects.toThrow('演员姓名不能为空');
            await expect(service.addActor({ name: '' })).rejects.toThrow('演员姓名不能为空');
        });
    });

    describe('updateActor', () => {
        test('SVC-ACTOR-009: 更新演员', async () => {
            await service.addActor({ name: '周八', nickname: '小周' });
            await service.updateActor('周八', { name: '周八更新', nickname: '老周', birthday: '1985-05-05' });

            const actors = service.getActors();
            expect(actors).toHaveLength(1);
            expect(actors[0].name).toBe('周八更新');
            expect(actors[0].nickname).toBe('老周');
            expect(actors[0].birthday).toBe('1985-05-05');
        });

        test('SVC-ACTOR-010: 更新不存在的演员抛出错误', async () => {
            await expect(service.updateActor('不存在的演员', { name: '新名字' })).rejects.toThrow('演员不存在');
        });

        test('更新时新姓名已存在抛出错误', async () => {
            await service.addActor({ name: '吴九' });
            await service.addActor({ name: '郑十' });
            await expect(service.updateActor('吴九', { name: '郑十' })).rejects.toThrow('新演员姓名已存在');
        });
    });

    describe('deleteActor', () => {
        test('SVC-ACTOR-011: 删除演员', async () => {
            await service.addActor({ name: '删除测试' });
            await service.deleteActor('删除测试');

            const actors = service.getActors();
            expect(actors).toHaveLength(0);
        });

        test('SVC-ACTOR-012: 删除不存在的演员抛出错误', async () => {
            await expect(service.deleteActor('不存在的演员')).rejects.toThrow('演员不存在');
        });

        test('删除演员姓名不能为空', async () => {
            await expect(service.deleteActor('')).rejects.toThrow('演员姓名不能为空');
        });
    });

    describe('clearCache', () => {
        test('SVC-ACTOR-013: 清除缓存', () => {
            service.actorsCache = [{ name: '测试' }];
            service.clearCache();
            expect(service.actorsCache).toBeNull();
        });
    });

    describe('saveActors', () => {
        test('保存演员到文件', async () => {
            const actors = [{ name: '保存测试', nickname: '测试' }];
            await service.saveActors(actors);

            const content = JSON.parse(fs.readFileSync(path.join(testDataDir, 'actor.json'), 'utf-8'));
            expect(content.actor).toEqual(actors);
            expect(service.actorsCache).toEqual(actors);
        });
    });

    describe('importActors', () => {
        test('SVC-ACTOR-014: 批量导入新演员', async () => {
            const actorNames = ['演员A', '演员B', '演员C'];
            const result = await service.importActors(actorNames);

            expect(result.added).toBe(3);
            expect(result.skipped).toBe(0);
            expect(result.addedActors).toHaveLength(3);
            expect(result.addedActors.map(a => a.name)).toEqual(actorNames);

            const actors = service.getActors();
            expect(actors).toHaveLength(3);
            expect(actors.map(a => a.name)).toEqual(actorNames);
        });

        test('SVC-ACTOR-015: 批量导入包含已存在演员', async () => {
            await service.addActor({ name: '演员A' });
            
            const actorNames = ['演员A', '演员B', '演员C'];
            const result = await service.importActors(actorNames);

            expect(result.added).toBe(2);
            expect(result.skipped).toBe(1);
            expect(result.addedActors).toHaveLength(2);
            expect(result.addedActors.map(a => a.name)).toEqual(['演员B', '演员C']);

            const actors = service.getActors();
            expect(actors).toHaveLength(3);
        });

        test('SVC-ACTOR-016: 批量导入空数组', async () => {
            const result = await service.importActors([]);

            expect(result.added).toBe(0);
            expect(result.skipped).toBe(0);
            expect(result.addedActors).toHaveLength(0);
        });

        test('SVC-ACTOR-017: 批量导入null或undefined', async () => {
            const resultNull = await service.importActors(null);
            expect(resultNull.added).toBe(0);
            expect(resultNull.skipped).toBe(0);

            const resultUndefined = await service.importActors(undefined);
            expect(resultUndefined.added).toBe(0);
            expect(resultUndefined.skipped).toBe(0);
        });

        test('SVC-ACTOR-018: 批量导入包含空字符串和空白字符串', async () => {
            const actorNames = ['演员A', '', '   ', '演员B'];
            const result = await service.importActors(actorNames);

            expect(result.added).toBe(2);
            expect(result.skipped).toBe(2);
            expect(result.addedActors.map(a => a.name)).toEqual(['演员A', '演员B']);
        });

        test('SVC-ACTOR-019: 批量导入所有演员已存在', async () => {
            await service.addActor({ name: '演员A' });
            await service.addActor({ name: '演员B' });

            const actorNames = ['演员A', '演员B'];
            const result = await service.importActors(actorNames);

            expect(result.added).toBe(0);
            expect(result.skipped).toBe(2);
            expect(result.addedActors).toHaveLength(0);
        });

        test('SVC-ACTOR-020: 批量导入后演员数据格式正确', async () => {
            const actorNames = ['测试演员'];
            const result = await service.importActors(actorNames);

            expect(result.addedActors[0]).toEqual({
                name: '测试演员',
                nickname: '',
                birthday: '',
                memo: '',
                rating: 0,
                favorites: false
            });
        });
    });
});

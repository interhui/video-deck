/**
 * BoxView 收藏记录视图相关逻辑测试
 * 测试 BoxService 在收藏记录视图场景下的使用
 */
const BoxService = require('../../src/main/services/BoxService');
const path = require('path');
const fs = require('fs');

describe('BoxView Scenario', () => {
    let service;
    let testDataDir;

    beforeEach(() => {
        service = new BoxService();
        testDataDir = path.join(__dirname, 'test-data', 'boxview-boxes');
        if (!fs.existsSync(testDataDir)) {
            fs.mkdirSync(testDataDir, { recursive: true });
        }
    });

    afterEach(() => {
        if (fs.existsSync(testDataDir)) {
            fs.rmSync(testDataDir, { recursive: true, force: true });
        }
    });

    describe('getAllBoxes - 收藏记录视图场景', () => {
        test('SVC-BV-001: 多个收藏夹列表展示', async () => {
            const boxes = [
                { metadata: { name: '动作片', description: '动作电影合集' }, movie: [{ id: 'm1' }, { id: 'm2' }] },
                { metadata: { name: '科幻片', description: '科幻电影合集' }, movie: [{ id: 'm3' }] },
                { metadata: { name: '恐怖片', description: '' }, movie: [] }
            ];
            boxes.forEach((box, i) => {
                fs.writeFileSync(path.join(testDataDir, `${box.metadata.name}.json`), JSON.stringify(box));
            });

            const result = await service.getAllBoxes(testDataDir);
            expect(result).toHaveLength(3);
            expect(result.map(b => b.name)).toContain('动作片');
            expect(result.map(b => b.name)).toContain('科幻片');
            expect(result.map(b => b.name)).toContain('恐怖片');
        });

        test('SVC-BV-002: 收藏夹电影数量正确', async () => {
            const box = { metadata: { name: 'TestBox' }, movie: [{ id: 'm1' }, { id: 'm2' }, { id: 'm3' }, { id: 'm4' }] };
            fs.writeFileSync(path.join(testDataDir, 'TestBox.json'), JSON.stringify(box));

            const result = await service.getAllBoxes(testDataDir);
            expect(result[0].movieCount).toBe(4);
        });

        test('SVC-BV-003: 空收藏夹电影数量为0', async () => {
            const box = { metadata: { name: 'EmptyBox' }, movie: [] };
            fs.writeFileSync(path.join(testDataDir, 'EmptyBox.json'), JSON.stringify(box));

            const result = await service.getAllBoxes(testDataDir);
            expect(result[0].movieCount).toBe(0);
        });
    });

    describe('getBoxDetail - 收藏记录视图选中收藏夹', () => {
        test('SVC-BV-004: 获取选中收藏夹详情', async () => {
            const box = {
                metadata: { name: '动作片', description: '动作电影合集' },
                movie: [
                    { id: 'm1', status: 'watched', rating: 5 },
                    { id: 'm2', status: 'unwatched', rating: 0 }
                ]
            };
            fs.writeFileSync(path.join(testDataDir, '动作片.json'), JSON.stringify(box));

            const result = await service.getBoxDetail('动作片', testDataDir);
            expect(result.name).toBe('动作片');
            expect(result.movieCount).toBe(2);
            expect(result.movies).toHaveLength(2);
        });

        test('SVC-BV-005: 收藏夹包含电影状态和评分', async () => {
            const box = {
                metadata: { name: 'RatedBox' },
                movie: [
                    { id: 'm1', status: 'completed', rating: 4, comment: 'Good' },
                    { id: 'm2', status: 'watching', rating: 3 }
                ]
            };
            fs.writeFileSync(path.join(testDataDir, 'RatedBox.json'), JSON.stringify(box));

            const result = await service.getBoxDetail('RatedBox', testDataDir);
            const m1 = result.movies.find(m => m.id === 'm1');
            expect(m1.status).toBe('completed');
            expect(m1.rating).toBe(4);
            expect(m1.comment).toBe('Good');
        });
    });

    describe('cleanBox - 收藏记录视图清理已删除电影', () => {
        test('SVC-BV-006: 清理不存在的电影', async () => {
            const box = {
                metadata: { name: 'CleanBox' },
                movie: [{ id: 'm1' }, { id: 'm2' }, { id: 'deleted' }]
            };
            fs.writeFileSync(path.join(testDataDir, 'CleanBox.json'), JSON.stringify(box));

            const result = await service.cleanBox('CleanBox', ['m1', 'm2'], testDataDir);
            expect(result.success).toBe(true);
            expect(result.removedCount).toBe(1);

            const content = JSON.parse(fs.readFileSync(path.join(testDataDir, 'CleanBox.json'), 'utf-8'));
            expect(content.movie).toHaveLength(2);
        });

        test('SVC-BV-007: 无需清理时返回0', async () => {
            const box = {
                metadata: { name: 'NoCleanBox' },
                movie: [{ id: 'm1' }, { id: 'm2' }]
            };
            fs.writeFileSync(path.join(testDataDir, 'NoCleanBox.json'), JSON.stringify(box));

            const result = await service.cleanBox('NoCleanBox', ['m1', 'm2'], testDataDir);
            expect(result.success).toBe(true);
            expect(result.removedCount).toBe(0);
        });
    });

    describe('updateMovieInBox - 收藏记录视图修改电影状态', () => {
        test('SVC-BV-008: 更新电影状态为已完成', async () => {
            const box = {
                metadata: { name: 'StatusBox' },
                movie: [{ id: 'm1', status: 'unwatched', rating: 0 }]
            };
            fs.writeFileSync(path.join(testDataDir, 'StatusBox.json'), JSON.stringify(box));

            await service.updateMovieInBox('StatusBox', 'm1', { status: 'completed', rating: 5 }, testDataDir);

            const content = JSON.parse(fs.readFileSync(path.join(testDataDir, 'StatusBox.json'), 'utf-8'));
            expect(content.movie[0].status).toBe('completed');
            expect(content.movie[0].rating).toBe(5);
        });

        test('SVC-BV-009: 更新电影评分', async () => {
            const box = {
                metadata: { name: 'RatingBox' },
                movie: [{ id: 'm1', status: 'unwatched', rating: 3 }]
            };
            fs.writeFileSync(path.join(testDataDir, 'RatingBox.json'), JSON.stringify(box));

            await service.updateMovieInBox('RatingBox', 'm1', { rating: 4 }, testDataDir);

            const content = JSON.parse(fs.readFileSync(path.join(testDataDir, 'RatingBox.json'), 'utf-8'));
            expect(content.movie[0].rating).toBe(4);
            expect(content.movie[0].status).toBe('unwatched');
        });
    });

    describe('removeMovieFromBox - 收藏记录视图移除电影', () => {
        test('SVC-BV-010: 从收藏夹移除电影', async () => {
            const box = {
                metadata: { name: 'RemoveBox' },
                movie: [{ id: 'm1', status: 'watched' }, { id: 'm2', status: 'unwatched' }]
            };
            fs.writeFileSync(path.join(testDataDir, 'RemoveBox.json'), JSON.stringify(box));

            await service.removeMovieFromBox('RemoveBox', 'm1', testDataDir);

            const content = JSON.parse(fs.readFileSync(path.join(testDataDir, 'RemoveBox.json'), 'utf-8'));
            expect(content.movie).toHaveLength(1);
            expect(content.movie[0].id).toBe('m2');
        });
    });
});

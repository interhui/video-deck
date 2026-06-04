/**
 * BoxService 单元测试
 */
const BoxService = require('../../src/main/services/BoxService');
const path = require('path');
const fs = require('fs');

describe('BoxService', () => {
    let service;
    let testDataDir;

    beforeEach(() => {
        service = new BoxService();
        testDataDir = path.join(__dirname, 'test-data', 'boxes');
        if (!fs.existsSync(testDataDir)) {
            fs.mkdirSync(testDataDir, { recursive: true });
        }
    });

    afterEach(() => {
        if (fs.existsSync(testDataDir)) {
            fs.rmSync(testDataDir, { recursive: true, force: true });
        }
    });

    describe('getBoxesDir', () => {
        test('SVC-BOX-001: 返回正确收藏夹目录', () => {
            const result = service.getBoxesDir(testDataDir);
            expect(result).toBe(testDataDir);
        });
    });

    describe('getAllBoxes', () => {
        test('SVC-BOX-002: 返回所有收藏夹列表', async () => {
            const box1 = { metadata: { name: 'Box1', description: 'Desc1' }, movie: [] };
            const box2 = { metadata: { name: 'Box2', description: 'Desc2' }, movie: [] };
            fs.writeFileSync(path.join(testDataDir, 'Box1.json'), JSON.stringify(box1));
            fs.writeFileSync(path.join(testDataDir, 'Box2.json'), JSON.stringify(box2));

            const result = await service.getAllBoxes(testDataDir);
            expect(result).toHaveLength(2);
            expect(result.map(b => b.name)).toContain('Box1');
            expect(result.map(b => b.name)).toContain('Box2');
        });

        test('SVC-BOX-003: 跳过备份文件', async () => {
            const box = { metadata: { name: 'Box1' }, movie: [] };
            fs.writeFileSync(path.join(testDataDir, 'Box1.json'), JSON.stringify(box));
            fs.writeFileSync(path.join(testDataDir, 'Box1-20240101.json.del'), JSON.stringify(box));

            const result = await service.getAllBoxes(testDataDir);
            expect(result).toHaveLength(1);
            expect(result[0].name).toBe('Box1');
        });

        test('SVC-BOX-004: 正确计算电影数量', async () => {
            const box = { metadata: { name: 'Box1' }, movie: [{ id: 'm1' }, { id: 'm2' }, { id: 'm3' }] };
            fs.writeFileSync(path.join(testDataDir, 'Box1.json'), JSON.stringify(box));

            const result = await service.getAllBoxes(testDataDir);
            expect(result[0].movieCount).toBe(3);
        });

        test('SVC-BOX-005: 目录为空返回空数组', async () => {
            const result = await service.getAllBoxes(testDataDir);
            expect(result).toEqual([]);
        });

        test('SVC-BOX-006: 收藏夹不存在返回空数组', async () => {
            const result = await service.getAllBoxes(path.join(__dirname, 'test-data', 'notexists'));
            expect(result).toEqual([]);
        });
    });

    describe('readBoxFile', () => {
        test('SVC-BOX-007: 正确读取收藏夹JSON', async () => {
            const box = { metadata: { name: 'TestBox' }, movie: [] };
            fs.writeFileSync(path.join(testDataDir, 'TestBox.json'), JSON.stringify(box));

            const result = await service.readBoxFile(testDataDir, 'TestBox');
            expect(result.metadata.name).toBe('TestBox');
        });

        test('SVC-BOX-008: 文件不存在返回null', async () => {
            const result = await service.readBoxFile(testDataDir, 'NotExists');
            expect(result).toBeNull();
        });

        test('SVC-BOX-009: 空文件返回空对象', async () => {
            fs.writeFileSync(path.join(testDataDir, 'EmptyBox.json'), '');
            const result = await service.readBoxFile(testDataDir, 'EmptyBox');
            expect(result).toEqual({});
        });

        test('SVC-BOX-010: 损坏JSON返回空对象', async () => {
            fs.writeFileSync(path.join(testDataDir, 'BadBox.json'), '{ bad json');
            const result = await service.readBoxFile(testDataDir, 'BadBox');
            expect(result).toEqual({});
        });
    });

    describe('createBox', () => {
        test('SVC-BOX-011: 创建带描述的收藏夹', async () => {
            const result = await service.createBox('NewBox', 'My Description', testDataDir);
            expect(result.success).toBe(true);
            expect(fs.existsSync(path.join(testDataDir, 'NewBox.json'))).toBe(true);
        });

        test('SVC-BOX-012: 创建不带描述收藏夹', async () => {
            await service.createBox('NoDescBox', '', testDataDir);
            const content = JSON.parse(fs.readFileSync(path.join(testDataDir, 'NoDescBox.json'), 'utf-8'));
            expect(content.metadata.description).toBe('');
        });

        test('SVC-BOX-013: 收藏夹已存在抛错误', async () => {
            await service.createBox('ExistingBox', '', testDataDir);
            await expect(service.createBox('ExistingBox', '', testDataDir))
                .rejects.toThrow('收藏夹已存在');
        });

        test('SVC-BOX-014: 自动创建目录', async () => {
            const nestedDir = path.join(testDataDir, 'nested', 'dir');
            await service.createBox('NestedBox', '', testDataDir);
            expect(fs.existsSync(path.join(testDataDir, 'NestedBox.json'))).toBe(true);
        });
    });

    describe('deleteBox', () => {
        test('SVC-BOX-015: 删除并创建备份', async () => {
            const box = { metadata: { name: 'ToDelete' }, movie: [] };
            fs.writeFileSync(path.join(testDataDir, 'ToDelete.json'), JSON.stringify(box));

            const result = await service.deleteBox('ToDelete', testDataDir);
            expect(result.success).toBe(true);
            expect(fs.existsSync(path.join(testDataDir, 'ToDelete.json'))).toBe(false);
            expect(result.backupPath).toContain('.json.del');
        });

        test('SVC-BOX-016: 收藏夹不存在抛错误', async () => {
            await expect(service.deleteBox('NotExists', testDataDir))
                .rejects.toThrow('收藏夹不存在');
        });

        test('SVC-BOX-017: 备份内容完整', async () => {
            const box = { metadata: { name: 'BackupTest' }, movie: [{ id: 'm1' }] };
            fs.writeFileSync(path.join(testDataDir, 'BackupTest.json'), JSON.stringify(box));

            await service.deleteBox('BackupTest', testDataDir);
            const backupFiles = fs.readdirSync(testDataDir).filter(f => f.startsWith('BackupTest') && f.endsWith('.json.del'));
            expect(backupFiles.length).toBe(1);
        });
    });

    describe('getFormattedTimestamp', () => {
        test('SVC-BOX-018: 返回正确格式时间戳', () => {
            const timestamp = service.getFormattedTimestamp();
            expect(timestamp).toMatch(/^\d{14}$/);
            expect(timestamp.length).toBe(14);
        });
    });

    describe('updateBox', () => {
        test('SVC-BOX-019: 更新名称和描述', async () => {
            const box = { metadata: { name: 'OldName', description: 'OldDesc' }, movie: [] };
            fs.writeFileSync(path.join(testDataDir, 'OldName.json'), JSON.stringify(box));

            const result = await service.updateBox('OldName', 'NewName', 'NewDesc', testDataDir);
            expect(result.success).toBe(true);
            expect(fs.existsSync(path.join(testDataDir, 'NewName.json'))).toBe(true);
            expect(fs.existsSync(path.join(testDataDir, 'OldName.json'))).toBe(false);
        });

        test('SVC-BOX-020: 只更新描述不重命名', async () => {
            const box = { metadata: { name: 'SameName', description: 'OldDesc' }, movie: [] };
            fs.writeFileSync(path.join(testDataDir, 'SameName.json'), JSON.stringify(box));

            await service.updateBox('SameName', 'SameName', 'NewDesc', testDataDir);
            const content = JSON.parse(fs.readFileSync(path.join(testDataDir, 'SameName.json'), 'utf-8'));
            expect(content.metadata.description).toBe('NewDesc');
        });

        test('SVC-BOX-021: 收藏夹不存在抛错误', async () => {
            await expect(service.updateBox('NotExists', 'NewName', 'Desc', testDataDir))
                .rejects.toThrow('收藏夹不存在');
        });

        test('SVC-BOX-022: 新名称冲突抛错误', async () => {
            const box1 = { metadata: { name: 'Box1' }, movie: [] };
            const box2 = { metadata: { name: 'Box2' }, movie: [] };
            fs.writeFileSync(path.join(testDataDir, 'Box1.json'), JSON.stringify(box1));
            fs.writeFileSync(path.join(testDataDir, 'Box2.json'), JSON.stringify(box2));

            await expect(service.updateBox('Box1', 'Box2', '', testDataDir))
                .rejects.toThrow('电影收藏夹名称已存在');
        });
    });

    describe('getBoxDetail', () => {
        test('SVC-BOX-023: 返回完整收藏夹详情', async () => {
            const box = {
                metadata: { name: 'DetailBox', description: 'Test' },
                movie: [{ id: 'm1', comment: 'Good' }]
            };
            fs.writeFileSync(path.join(testDataDir, 'DetailBox.json'), JSON.stringify(box));

            const result = await service.getBoxDetail('DetailBox', testDataDir);
            expect(result.name).toBe('DetailBox');
            expect(result.description).toBe('Test');
            expect(result.movies).toHaveLength(1);
        });

        test('SVC-BOX-024: 不存在返回null', async () => {
            const result = await service.getBoxDetail('NotExists', testDataDir);
            expect(result).toBeNull();
        });

        test('SVC-BOX-025: 正确统计电影数', async () => {
            const box = {
                metadata: { name: 'CountBox' },
                movie: [{ id: 'm1' }, { id: 'm2' }, { id: 'm3' }]
            };
            fs.writeFileSync(path.join(testDataDir, 'CountBox.json'), JSON.stringify(box));

            const result = await service.getBoxDetail('CountBox', testDataDir);
            expect(result.movieCount).toBe(3);
        });
    });

    describe('addMovieToBox', () => {
        test('SVC-BOX-026: 添加新电影到收藏夹', async () => {
            const box = { metadata: { name: 'AddBox' }, movie: [] };
            fs.writeFileSync(path.join(testDataDir, 'AddBox.json'), JSON.stringify(box));

            const result = await service.addMovieToBox('AddBox', { id: 'newMovie', comment: 'Nice' }, testDataDir);
            expect(result.success).toBe(true);

            const content = JSON.parse(fs.readFileSync(path.join(testDataDir, 'AddBox.json'), 'utf-8'));
            expect(content.movie).toHaveLength(1);
            expect(content.movie[0].id).toBe('newMovie');
        });

        test('SVC-BOX-027: 重复电影更新而非重复', async () => {
            const box = { metadata: { name: 'DupBox' }, movie: [{ id: 'movie1', comment: 'Old' }] };
            fs.writeFileSync(path.join(testDataDir, 'DupBox.json'), JSON.stringify(box));

            await service.addMovieToBox('DupBox', { id: 'movie1', comment: 'New' }, testDataDir);

            const content = JSON.parse(fs.readFileSync(path.join(testDataDir, 'DupBox.json'), 'utf-8'));
            expect(content.movie).toHaveLength(1);
            expect(content.movie[0].comment).toBe('New');
        });
    });

    describe('removeMovieFromBox', () => {
        test('SVC-BOX-028: 移除电影成功', async () => {
            const box = {
                metadata: { name: 'RemoveBox' },
                movie: [{ id: 'm1' }, { id: 'm2' }]
            };
            fs.writeFileSync(path.join(testDataDir, 'RemoveBox.json'), JSON.stringify(box));

            await service.removeMovieFromBox('RemoveBox', 'm1', testDataDir);

            const content = JSON.parse(fs.readFileSync(path.join(testDataDir, 'RemoveBox.json'), 'utf-8'));
            expect(content.movie).toHaveLength(1);
            expect(content.movie[0].id).toBe('m2');
        });

        test('SVC-BOX-029: 收藏夹不存在抛错误', async () => {
            await expect(service.removeMovieFromBox('NotExists', 'm1', testDataDir))
                .rejects.toThrow('收藏夹不存在');
        });
    });

    describe('updateMovieInBox', () => {
        test('SVC-BOX-030: 更新电影信息成功', async () => {
            const box = {
                metadata: { name: 'UpdateBox' },
                movie: [{ id: 'movie1', comment: 'Old' }]
            };
            fs.writeFileSync(path.join(testDataDir, 'UpdateBox.json'), JSON.stringify(box));

            await service.updateMovieInBox('UpdateBox', 'movie1', { comment: 'Updated' }, testDataDir);

            const content = JSON.parse(fs.readFileSync(path.join(testDataDir, 'UpdateBox.json'), 'utf-8'));
            expect(content.movie[0].comment).toBe('Updated');
        });

        test('SVC-BOX-031: 电影不存在抛错误', async () => {
            const box = { metadata: { name: 'NoMovieBox' }, movie: [] };
            fs.writeFileSync(path.join(testDataDir, 'NoMovieBox.json'), JSON.stringify(box));

            await expect(service.updateMovieInBox('NoMovieBox', 'notexists', {}, testDataDir))
                .rejects.toThrow('电影不存在');
        });
    });

    describe('addMoviesToBox', () => {
        test('SVC-BOX-032: 批量添加多个电影到收藏夹', async () => {
            const box = { metadata: { name: 'BatchAddBox' }, movie: [] };
            fs.writeFileSync(path.join(testDataDir, 'BatchAddBox.json'), JSON.stringify(box));

            const movieInfoList = [
                { id: 'movie1', status: 'unwatched', comment: 'Good' },
                { id: 'movie2', status: 'new', comment: 'Great' },
                { id: 'movie3', status: 'unwatched', comment: '' }
            ];

            const result = await service.addMoviesToBox('BatchAddBox', movieInfoList, testDataDir);
            expect(result.success).toBe(true);
            expect(result.addedCount).toBe(3);
            expect(result.updatedCount).toBe(0);

            const content = JSON.parse(fs.readFileSync(path.join(testDataDir, 'BatchAddBox.json'), 'utf-8'));
            expect(content.movie).toHaveLength(3);
            expect(content.movie.map(m => m.id)).toContain('movie1');
            expect(content.movie.map(m => m.id)).toContain('movie2');
            expect(content.movie.map(m => m.id)).toContain('movie3');
        });

        test('SVC-BOX-033: 部分电影已存在时更新', async () => {
            const box = {
                metadata: { name: 'PartialUpdateBox' },
                movie: [{ id: 'movie1', status: 'watched', comment: 'Old comment' }]
            };
            fs.writeFileSync(path.join(testDataDir, 'PartialUpdateBox.json'), JSON.stringify(box));

            const movieInfoList = [
                { id: 'movie1', status: 'unwatched', comment: 'New comment' },
                { id: 'movie2', status: 'new', comment: 'New movie' }
            ];

            const result = await service.addMoviesToBox('PartialUpdateBox', movieInfoList, testDataDir);
            expect(result.success).toBe(true);
            expect(result.addedCount).toBe(1);
            expect(result.updatedCount).toBe(1);

            const content = JSON.parse(fs.readFileSync(path.join(testDataDir, 'PartialUpdateBox.json'), 'utf-8'));
            expect(content.movie).toHaveLength(2);
            const movie1 = content.movie.find(m => m.id === 'movie1');
            expect(movie1.status).toBe('unwatched');
            expect(movie1.comment).toBe('New comment');
        });

        test('SVC-BOX-034: 收藏夹不存在时自动创建', async () => {
            const movieInfoList = [
                { id: 'movie1', status: 'unwatched' },
                { id: 'movie2', status: 'new' }
            ];

            const result = await service.addMoviesToBox('AutoCreateBox', movieInfoList, testDataDir);
            expect(result.success).toBe(true);
            expect(result.addedCount).toBe(2);

            const content = JSON.parse(fs.readFileSync(path.join(testDataDir, 'AutoCreateBox.json'), 'utf-8'));
            expect(content.movie).toHaveLength(2);
            expect(content.metadata.name).toBe('AutoCreateBox');
        });

        test('SVC-BOX-035: 空电影列表返回成功', async () => {
            const box = { metadata: { name: 'EmptyListBox' }, movie: [] };
            fs.writeFileSync(path.join(testDataDir, 'EmptyListBox.json'), JSON.stringify(box));

            const result = await service.addMoviesToBox('EmptyListBox', [], testDataDir);
            expect(result.success).toBe(true);
            expect(result.addedCount).toBe(0);
            expect(result.updatedCount).toBe(0);
        });

        test('SVC-BOX-036: 电影信息无ID时跳过', async () => {
            const box = { metadata: { name: 'SkipInvalidBox' }, movie: [] };
            fs.writeFileSync(path.join(testDataDir, 'SkipInvalidBox.json'), JSON.stringify(box));

            const movieInfoList = [
                { id: 'validMovie', status: 'unwatched' },
                { status: 'unwatched' },
                null,
                { id: 'anotherValid', status: 'new' }
            ];

            const result = await service.addMoviesToBox('SkipInvalidBox', movieInfoList, testDataDir);
            expect(result.success).toBe(true);
            expect(result.addedCount).toBe(2);

            const content = JSON.parse(fs.readFileSync(path.join(testDataDir, 'SkipInvalidBox.json'), 'utf-8'));
            expect(content.movie).toHaveLength(2);
        });

        test('SVC-BOX-037: 默认status和rating值', async () => {
            const box = { metadata: { name: 'DefaultValueBox' }, movie: [] };
            fs.writeFileSync(path.join(testDataDir, 'DefaultValueBox.json'), JSON.stringify(box));

            const movieInfoList = [
                { id: 'movie1' },
                { id: 'movie2', status: 'watched' }
            ];

            await service.addMoviesToBox('DefaultValueBox', movieInfoList, testDataDir);

            const content = JSON.parse(fs.readFileSync(path.join(testDataDir, 'DefaultValueBox.json'), 'utf-8'));
            const movie1 = content.movie.find(m => m.id === 'movie1');
            expect(movie1.status).toBe('unwatched');
            expect(movie1.rating).toBe(0);
            expect(movie1.comment).toBe('');
        });
    });
});

/**
 * EmbyAdapterService 单元测试
 */
const EmbyAdapterService = require('../../src/main/services/EmbyAdapterService');
const SettingsService = require('../../src/main/services/SettingsService');
const path = require('path');
const fs = require('fs');

describe('EmbyAdapterService', () => {
    let service;
    let settingsService;
    let testDataDir;

    beforeEach(() => {
        testDataDir = path.join(__dirname, 'test-data', 'emby');
        if (!fs.existsSync(testDataDir)) {
            fs.mkdirSync(testDataDir, { recursive: true });
        }
        const settingsPath = path.join(testDataDir, 'settings.json');
        settingsService = new SettingsService(settingsPath);
        service = new EmbyAdapterService(settingsService);
        // 屏蔽 SettingsService 内 fire-and-forget 的异步设置写入
        if (settingsService.fileService && typeof settingsService.fileService.writeJson === 'function') {
            jest.spyOn(settingsService.fileService, 'writeJson').mockResolvedValue({ success: true });
        }
    });

    afterEach(() => {
        if (fs.existsSync(testDataDir)) {
            fs.rmSync(testDataDir, { recursive: true, force: true });
        }
    });

    describe('getConfig / setConfig', () => {
        test('SVC-EMBY-001: 返回默认Emby配置', () => {
            const config = service.getConfig();
            expect(config.serverUrl).toBe('');
            expect(config.apiKey).toBe('');
            expect(config.username).toBe('');
            expect(config.password).toBe('');
            expect(config.language).toBe('zh-CN');
            expect(config.enabled).toBe(false);
        });

        test('SVC-EMBY-002: 合并保存自定义配置', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            service.setConfig({
                serverUrl: 'http://192.168.1.100:8096',
                apiKey: 'test-key'
            });
            const config = service.getConfig();
            expect(config.serverUrl).toBe('http://192.168.1.100:8096');
            expect(config.apiKey).toBe('test-key');
            // 未覆盖的字段保持默认
            expect(config.language).toBe('zh-CN');
        });
    });

    describe('normalizeServerUrl', () => {
        test('SVC-EMBY-003: 自动补全 http:// 协议', () => {
            expect(service.normalizeServerUrl('192.168.1.100:8096')).toBe('http://192.168.1.100:8096');
        });

        test('SVC-EMBY-004: 去除末尾斜杠', () => {
            expect(service.normalizeServerUrl('http://192.168.1.100:8096/')).toBe('http://192.168.1.100:8096');
        });

        test('SVC-EMBY-005: 保留已有协议', () => {
            expect(service.normalizeServerUrl('https://emby.example.com')).toBe('https://emby.example.com');
        });

        test('SVC-EMBY-006: 空值返回空字符串', () => {
            expect(service.normalizeServerUrl('')).toBe('');
            expect(service.normalizeServerUrl(null)).toBe('');
        });
    });

    describe('ensureAuthenticated', () => {
        test('SVC-EMBY-007: 未配置服务器地址抛出错误', async () => {
            await expect(service.ensureAuthenticated()).rejects.toThrow('Emby 服务器地址未配置');
        });

        test('SVC-EMBY-008: 未配置认证信息抛出错误', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            service.setConfig({ serverUrl: 'http://192.168.1.100:8096' });
            await expect(service.ensureAuthenticated()).rejects.toThrow('Emby 未配置 API Key 或用户名/密码');
        });

        test('SVC-EMBY-009: API Key 认证直接返回', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            service.setConfig({
                serverUrl: 'http://192.168.1.100:8096',
                apiKey: 'test-key',
                userId: 'user-1'
            });
            const auth = await service.ensureAuthenticated();
            expect(auth.apiKey).toBe('test-key');
            expect(auth.userId).toBe('user-1');
        });

        test('SVC-EMBY-010: API Key 无 userId 时拉取用户列表', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            service.setConfig({
                serverUrl: 'http://192.168.1.100:8096',
                apiKey: 'test-key'
            });
            service._getUsers = jest.fn().mockResolvedValue([
                { Id: 'user-1', Name: 'admin' },
                { Id: 'user-2', Name: 'test' }
            ]);
            const auth = await service.ensureAuthenticated();
            expect(auth.apiKey).toBe('test-key');
            expect(auth.userId).toBe('user-1');
        });
    });

    describe('testConnection', () => {
        test('SVC-EMBY-011: 未配置服务器返回失败', async () => {
            const result = await service.testConnection();
            expect(result.reachable).toBe(false);
            expect(result.error).toContain('未配置');
        });

        test('SVC-EMBY-012: 连接成功返回服务器信息', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            service.setConfig({ serverUrl: 'http://192.168.1.100:8096' });
            service._request = jest.fn().mockResolvedValue({
                ServerName: 'MyEmby',
                Version: '4.8.0.0',
                Id: 'sys-1'
            });
            const result = await service.testConnection();
            expect(result.reachable).toBe(true);
            expect(result.serverName).toBe('MyEmby');
            expect(result.version).toBe('4.8.0.0');
        });

        test('SVC-EMBY-013: 连接失败捕获错误', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            service.setConfig({ serverUrl: 'http://192.168.1.100:8096' });
            service._request = jest.fn().mockRejectedValue(new Error('ECONNREFUSED'));
            const result = await service.testConnection();
            expect(result.reachable).toBe(false);
            expect(result.error).toContain('ECONNREFUSED');
        });
    });

    describe('getImageUrl', () => {
        test('SVC-EMBY-014: 构造海报 URL', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            service.setConfig({
                serverUrl: 'http://192.168.1.100:8096',
                apiKey: 'test-key'
            });
            const url = service.getImageUrl('item-1', 'tag-abc', 400);
            expect(url).toBe('http://192.168.1.100:8096/emby/Items/item-1/Images/Primary?maxWidth=400&tag=tag-abc&api_key=test-key');
        });

        test('SVC-EMBY-015: 缺少 itemId 返回 null', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            service.setConfig({ serverUrl: 'http://x:8096', apiKey: 'k' });
            expect(service.getImageUrl('', 'tag')).toBeNull();
            expect(service.getImageUrl(null, 'tag')).toBeNull();
        });
    });

    describe('getPlaybackUrl', () => {
        test('SVC-EMBY-016: 构造直连播放 URL', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            service.setConfig({
                serverUrl: 'http://192.168.1.100:8096',
                apiKey: 'test-key'
            });
            const url = service.getPlaybackUrl('item-1', 'ms-1');
            expect(url).toContain('/emby/Videos/item-1/stream');
            expect(url).toContain('Static=true');
            expect(url).toContain('MediaSourceId=ms-1');
            expect(url).toContain('api_key=test-key');
        });

        test('SVC-EMBY-017: 缺省 mediaSourceId 使用 itemId', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            service.setConfig({ serverUrl: 'http://x:8096', apiKey: 'k' });
            const url = service.getPlaybackUrl('item-1');
            expect(url).toContain('MediaSourceId=item-1');
        });
    });

    describe('resolveSort', () => {
        test('SVC-EMBY-018: 映射评分降序', () => {
            expect(service.resolveSort('rating', 'desc')).toEqual({
                by: 'CommunityRating',
                order: 'Descending'
            });
        });

        test('SVC-EMBY-019: 未知字段返回 null', () => {
            expect(service.resolveSort('unknown', 'asc')).toBeNull();
        });
    });

    describe('mapItem', () => {
        test('SVC-EMBY-020: 完整映射 Emby Item', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            service.setConfig({
                serverUrl: 'http://192.168.1.100:8096',
                apiKey: 'test-key'
            });
            const item = {
                Id: 'item-1',
                Name: '沙丘',
                Overview: '电影简介',
                ProductionYear: 2021,
                PremiereDate: '2021-09-03T00:00:00.000Z',
                CommunityRating: 8.1,
                OfficialRating: 'PG-13',
                Genres: ['科幻', '冒险'],
                Studios: [{ Name: '华纳' }, { Name: '传奇' }],
                RunTimeTicks: 81000000000,
                ImageTags: { Primary: 'img-tag-1' },
                People: [
                    { Id: 'p1', Name: '提莫西', Type: 'Actor', Role: '保罗', PrimaryImageTag: 'p-img' },
                    { Id: 'p2', Name: '丹尼斯', Type: 'Director', PrimaryImageTag: 'd-img' }
                ],
                MediaSources: [{ Id: 'ms-1', Container: 'mkv' }]
            };
            const mapped = service.mapItem(item);

            expect(mapped.id).toBe('item-1');
            expect(mapped.title).toBe('沙丘');
            expect(mapped.year).toBe(2021);
            expect(mapped.rating).toBe(8.1);
            expect(mapped.officialRating).toBe('PG-13');
            expect(mapped.genres).toEqual(['科幻', '冒险']);
            expect(mapped.studios).toEqual(['华纳', '传奇']);
            expect(mapped.runtime).toBe(8100);
            expect(mapped.posterUrl).toContain('/emby/Items/item-1/Images/Primary');
            expect(mapped.mediaSourceId).toBe('ms-1');
            expect(mapped.actors).toHaveLength(1);
            expect(mapped.actors[0]).toMatchObject({ name: '提莫西', role: '保罗' });
            expect(mapped.directors).toEqual(['丹尼斯']);
        });

        test('SVC-EMBY-021: 空 Item 返回 null', () => {
            expect(service.mapItem({})).toBeNull();
            expect(service.mapItem(null)).toBeNull();
        });

        test('SVC-EMBY-022: 缺失字段有默认值', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            service.setConfig({ serverUrl: 'http://x:8096', apiKey: 'k' });
            const mapped = service.mapItem({ Id: 'item-1', Name: '无名' });
            expect(mapped.year).toBe('');
            expect(mapped.rating).toBe(0);
            expect(mapped.runtime).toBe(0);
            expect(mapped.genres).toEqual([]);
            expect(mapped.actors).toEqual([]);
            expect(mapped.directors).toEqual([]);
            expect(mapped.posterUrl).toBeNull();
        });
    });
});

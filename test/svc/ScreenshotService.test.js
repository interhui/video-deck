const ScreenshotService = require('../../src/main/services/ScreenshotService');
const path = require('path');
const fs = require('fs');

describe('ScreenshotService', () => {
    let service;
    let testDataDir;

    beforeEach(() => {
        service = new ScreenshotService();
        testDataDir = path.join(__dirname, 'test-data', 'screenshotservice');
        if (!fs.existsSync(testDataDir)) {
            fs.mkdirSync(testDataDir, { recursive: true });
        }
    });

    afterEach(() => {
        if (fs.existsSync(testDataDir)) {
            fs.rmSync(testDataDir, { recursive: true, force: true });
        }
    });

    describe('constructor', () => {
        test('SVC-SCREENSHOT-001: 创建实例', () => {
            expect(service).toBeDefined();
            expect(service.SCREENSHOT_PATTERN).toBeDefined();
            expect(service.SCREENSHOT_PREFIX).toBe('screenshot_');
            expect(service.SCREENSHOT_EXT).toBe('.jpg');
        });
    });

    describe('getScreenshots', () => {
        test('SVC-SCREENSHOT-002: 返回空数组当目录不存在', async () => {
            const result = await service.getScreenshots('/nonexistent/path');
            expect(result).toEqual([]);
        });

        test('SVC-SCREENSHOT-003: 返回空数组当目录为空', async () => {
            const emptyDir = path.join(testDataDir, 'empty');
            fs.mkdirSync(emptyDir);
            const result = await service.getScreenshots(emptyDir);
            expect(result).toEqual([]);
        });

        test('SVC-SCREENSHOT-004: 正确返回截图列表', async () => {
            const movieDir = path.join(testDataDir, 'movie1');
            fs.mkdirSync(movieDir);
            fs.writeFileSync(path.join(movieDir, 'screenshot_1.jpg'), 'test1');
            fs.writeFileSync(path.join(movieDir, 'screenshot_2.jpg'), 'test2');
            fs.writeFileSync(path.join(movieDir, 'screenshot_10.jpg'), 'test10');

            const result = await service.getScreenshots(movieDir);
            expect(result.length).toBe(3);
            expect(result[0].number).toBe(1);
            expect(result[1].number).toBe(2);
            expect(result[2].number).toBe(10);
            expect(result[0].filename).toBe('screenshot_1.jpg');
        });

        test('SVC-SCREENSHOT-005: 过滤非截图文件', async () => {
            const movieDir = path.join(testDataDir, 'movie2');
            fs.mkdirSync(movieDir);
            fs.writeFileSync(path.join(movieDir, 'screenshot_1.jpg'), 'test');
            fs.writeFileSync(path.join(movieDir, 'poster.jpg'), 'poster');
            fs.writeFileSync(path.join(movieDir, 'movie.nfo'), 'nfo');

            const result = await service.getScreenshots(movieDir);
            expect(result.length).toBe(1);
            expect(result[0].filename).toBe('screenshot_1.jpg');
        });

        test('SVC-SCREENSHOT-006: 截图按编号排序', async () => {
            const movieDir = path.join(testDataDir, 'movie3');
            fs.mkdirSync(movieDir);
            fs.writeFileSync(path.join(movieDir, 'screenshot_5.jpg'), 'test5');
            fs.writeFileSync(path.join(movieDir, 'screenshot_1.jpg'), 'test1');
            fs.writeFileSync(path.join(movieDir, 'screenshot_3.jpg'), 'test3');

            const result = await service.getScreenshots(movieDir);
            expect(result[0].number).toBe(1);
            expect(result[1].number).toBe(3);
            expect(result[2].number).toBe(5);
        });
    });

    describe('getScreenshotCurrentTime', () => {
        test('SVC-SCREENSHOT-007: 返回取整的当前时间', () => {
            const result = service.getScreenshotCurrentTime(123.456);
            expect(result).toBe(123);
        });

        test('SVC-SCREENSHOT-008: 返回取整的当前时间(小数)', () => {
            const result = service.getScreenshotCurrentTime(45.9);
            expect(result).toBe(45);
        });
    });

    describe('generateScreenshotFilename', () => {
        test('SVC-SCREENSHOT-009: 生成正确的文件名', () => {
            const result = service.generateScreenshotFilename(1);
            expect(result).toBe('screenshot_1.jpg');
        });

        test('SVC-SCREENSHOT-010: 生成大编号文件名', () => {
            const result = service.generateScreenshotFilename(100);
            expect(result).toBe('screenshot_100.jpg');
        });
    });

    describe('saveScreenshot', () => {
        test('SVC-SCREENSHOT-011: 保存base64图片', async () => {
            const movieDir = path.join(testDataDir, 'movie5');
            fs.mkdirSync(movieDir);
            const base64Data = 'data:image/jpeg;base64,dGVzdGltYWdl';

            const result = await service.saveScreenshot(movieDir, base64Data, 1);
            expect(result.success).toBe(true);
            expect(result.filename).toBe('screenshot_1.jpg');
            expect(fs.existsSync(result.path)).toBe(true);
        });

        test('SVC-SCREENSHOT-012: 保存纯base64字符串', async () => {
            const movieDir = path.join(testDataDir, 'movie6');
            fs.mkdirSync(movieDir);
            const base64Data = 'dGVzdGltYWdl';

            const result = await service.saveScreenshot(movieDir, base64Data, 1);
            expect(result.success).toBe(true);
        });

        test('SVC-SCREENSHOT-013: 目录不存在时自动创建', async () => {
            const movieDir = path.join(testDataDir, 'newmovie');
            const base64Data = 'dGVzdGltYWdl';

            const result = await service.saveScreenshot(movieDir, base64Data, 1);
            expect(result.success).toBe(true);
            expect(fs.existsSync(movieDir)).toBe(true);
        });

        test('SVC-SCREENSHOT-014: 抛出错误当路径为空', async () => {
            await expect(service.saveScreenshot(null, 'data', 1)).rejects.toThrow();
        });

        test('SVC-SCREENSHOT-015: 抛出错误当数据为空', async () => {
            const movieDir = path.join(testDataDir, 'movie7');
            fs.mkdirSync(movieDir);
            await expect(service.saveScreenshot(movieDir, null, 1)).rejects.toThrow();
        });
    });

    describe('deleteScreenshot', () => {
        test('SVC-SCREENSHOT-016: 删除存在的截图', async () => {
            const movieDir = path.join(testDataDir, 'movie8');
            fs.mkdirSync(movieDir);
            const filePath = path.join(movieDir, 'screenshot_1.jpg');
            fs.writeFileSync(filePath, 'test');

            const result = await service.deleteScreenshot(movieDir, 1);
            expect(result.success).toBe(true);
            expect(fs.existsSync(filePath)).toBe(false);
        });

        test('SVC-SCREENSHOT-017: 返回失败当截图不存在', async () => {
            const movieDir = path.join(testDataDir, 'movie9');
            fs.mkdirSync(movieDir);

            const result = await service.deleteScreenshot(movieDir, 1);
            expect(result.success).toBe(false);
            expect(result.error).toBe('Screenshot file not found');
        });
    });

    describe('screenshotExists', () => {
        test('SVC-SCREENSHOT-018: 返回true当截图存在', async () => {
            const movieDir = path.join(testDataDir, 'movie10');
            fs.mkdirSync(movieDir);
            fs.writeFileSync(path.join(movieDir, 'screenshot_1.jpg'), 'test');

            const result = await service.screenshotExists(movieDir, 1);
            expect(result).toBe(true);
        });

        test('SVC-SCREENSHOT-019: 返回false当截图不存在', async () => {
            const movieDir = path.join(testDataDir, 'movie11');
            fs.mkdirSync(movieDir);

            const result = await service.screenshotExists(movieDir, 1);
            expect(result).toBe(false);
        });
    });

    describe('readScreenshotAsBase64', () => {
        test('SVC-SCREENSHOT-020: 读取截图返回base64', async () => {
            const movieDir = path.join(testDataDir, 'movie12');
            fs.mkdirSync(movieDir);
            fs.writeFileSync(path.join(movieDir, 'screenshot_1.jpg'), 'testimage');

            const result = await service.readScreenshotAsBase64(movieDir, 1);
            expect(result).toContain('data:image/jpeg;base64,');
        });

        test('SVC-SCREENSHOT-021: 返回null当截图不存在', async () => {
            const movieDir = path.join(testDataDir, 'movie13');
            fs.mkdirSync(movieDir);

            const result = await service.readScreenshotAsBase64(movieDir, 1);
            expect(result).toBeNull();
        });
    });

    describe('readScreenshotAsBase64Sync', () => {
        test('SVC-SCREENSHOT-022: 同步读取截图', () => {
            const movieDir = path.join(testDataDir, 'movie14');
            fs.mkdirSync(movieDir);
            fs.writeFileSync(path.join(movieDir, 'screenshot_1.jpg'), 'testimage');

            const result = service.readScreenshotAsBase64Sync(movieDir, 1);
            expect(result).toContain('data:image/jpeg;base64,');
        });

        test('SVC-SCREENSHOT-023: 同步读取不存在返回null', () => {
            const movieDir = path.join(testDataDir, 'movie15');
            fs.mkdirSync(movieDir);

            const result = service.readScreenshotAsBase64Sync(movieDir, 1);
            expect(result).toBeNull();
        });
    });
});
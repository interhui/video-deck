/**
 * ExportService 单元测试
 */
const ExportService = require('../../src/main/services/ExportService');
const path = require('path');
const fs = require('fs');

describe('ExportService', () => {
    let service;
    let testDataDir;
    let testMoviesDir;
    let testExportDir;

    beforeEach(() => {
        service = new ExportService();
        testDataDir = path.join(__dirname, 'test-data');
        testMoviesDir = path.join(testDataDir, 'movies');
        testExportDir = path.join(testDataDir, 'exports');

        if (!fs.existsSync(testMoviesDir)) {
            fs.mkdirSync(testMoviesDir, { recursive: true });
        }
        if (!fs.existsSync(testExportDir)) {
            fs.mkdirSync(testExportDir, { recursive: true });
        }
    });

    afterEach(() => {
        if (fs.existsSync(testDataDir)) {
            fs.rmSync(testDataDir, { recursive: true, force: true });
        }
    });

    describe('exportBoxToCsv', () => {
        test('SVC-EXPORT-001: 导出CSV包含正确表头', async () => {
            const movies = [{ movieId: 'm1', name: '电影A', category: 'movie' }];
            const exportPath = path.join(testExportDir, 'test.csv');

            await service.exportBoxToCsv(movies, exportPath);

            const content = fs.readFileSync(exportPath, 'utf8');
            const lines = content.split('\n');
            expect(lines[0]).toBe('电影ID,电影名称,电影描述,电影排序标题,演员,导演,上映时间,发行商,电影时长,标签,文件地址,视频编码,视频宽度,视频高度,视频时间');
        });

        test('SVC-EXPORT-002: 正确导出电影数据行', async () => {
            const movies = [
                {
                    movieId: 'movie-测试',
                    name: '测试电影',
                    description: '这是一部测试电影',
                    sorttitle: '测试',
                    actors: ['演员A', '演员B'],
                    director: '导演X',
                    publishDate: '2024-01-01',
                    studio: '测试发行商',
                    runtime: '120',
                    tags: ['动作', '科幻'],
                    original_filename: 'D:/Movies/test.mp4',
                    videoCodec: 'H264',
                    videoWidth: '1920',
                    videoHeight: '1080',
                    videoDuration: '7200'
                }
            ];
            const exportPath = path.join(testExportDir, 'test.csv');

            await service.exportBoxToCsv(movies, exportPath);

            const content = fs.readFileSync(exportPath, 'utf8');
            const lines = content.split('\n');
            expect(lines[1]).toContain('movie-测试');
            expect(lines[1]).toContain('测试电影');
            expect(lines[1]).toContain('演员A/演员B');
            expect(lines[1]).toContain('动作/科幻');
            expect(lines[1]).toContain('H264');
            expect(lines[1]).toContain('1920');
            expect(lines[1]).toContain('1080');
        });

        test('SVC-EXPORT-003: 处理特殊字符（逗号和引号）', async () => {
            const movies = [
                {
                    movieId: 'm1',
                    name: '电影,包含逗号',
                    description: '描述"包含引号"',
                    actors: [],
                    tags: []
                }
            ];
            const exportPath = path.join(testExportDir, 'test.csv');

            await service.exportBoxToCsv(movies, exportPath);

            const content = fs.readFileSync(exportPath, 'utf8');
            expect(content).toContain('"电影,包含逗号"');
            expect(content).toContain('"描述""包含引号"""');
        });

        test('SVC-EXPORT-004: 空电影列表导出空CSV', async () => {
            const movies = [];
            const exportPath = path.join(testExportDir, 'empty.csv');

            await service.exportBoxToCsv(movies, exportPath);

            const content = fs.readFileSync(exportPath, 'utf8');
            const lines = content.split('\n').filter(l => l.trim());
            expect(lines.length).toBe(1);
            expect(lines[0]).toContain('电影ID');
        });

        test('SVC-EXPORT-005: 返回成功结果和正确数量', async () => {
            const movies = [
                { movieId: 'm1', name: '电影1' },
                { movieId: 'm2', name: '电影2' }
            ];
            const exportPath = path.join(testExportDir, 'test.csv');

            const result = await service.exportBoxToCsv(movies, exportPath);

            expect(result.success).toBe(true);
            expect(result.count).toBe(2);
        });

        test('SVC-EXPORT-006: 使用outline作为描述备选', async () => {
            const movies = [
                {
                    movieId: 'm1',
                    name: '电影A',
                    outline: 'outline描述',
                    description: null
                }
            ];
            const exportPath = path.join(testExportDir, 'test.csv');

            await service.exportBoxToCsv(movies, exportPath);

            const content = fs.readFileSync(exportPath, 'utf8');
            expect(content).toContain('outline描述');
        });

        test('SVC-EXPORT-007: 使用year作为上映时间备选', async () => {
            const movies = [
                {
                    movieId: 'm1',
                    name: '电影A',
                    year: '2023',
                    publishDate: null
                }
            ];
            const exportPath = path.join(testExportDir, 'test.csv');

            await service.exportBoxToCsv(movies, exportPath);

            const content = fs.readFileSync(exportPath, 'utf8');
            expect(content).toContain('2023');
        });

        test('SVC-EXPORT-008: 使用videoDuration作为时长备选', async () => {
            const movies = [
                {
                    movieId: 'm1',
                    name: '电影A',
                    videoDuration: '3600',
                    runtime: null
                }
            ];
            const exportPath = path.join(testExportDir, 'test.csv');

            await service.exportBoxToCsv(movies, exportPath);

            const content = fs.readFileSync(exportPath, 'utf8');
            expect(content).toContain('3600');
        });
    });

    describe('exportBoxToDpl', () => {
        test('SVC-EXPORT-009: DPL文件包含正确头部', async () => {
            const movies = [{ movieId: 'm1', name: '电影A', original_filename: 'D:/test.mp4' }];
            const exportPath = path.join(testExportDir, 'test.dpl');

            await service.exportBoxToDpl(movies, exportPath);

            const content = fs.readFileSync(exportPath, 'utf8');
            expect(content).toContain('[playlist]');
            expect(content).toContain('NumberOfEntries=1');
            expect(content).toContain('CurrentEntry=1');
        });

        test('SVC-EXPORT-010: DPL正确输出文件条目', async () => {
            const movies = [
                {
                    movieId: 'm1',
                    name: '电影A',
                    original_filename: 'D:/Movies/A.mp4',
                    videoDuration: '7200'
                },
                {
                    movieId: 'm2',
                    name: '电影B',
                    original_filename: 'D:/Movies/B.mkv',
                    videoDuration: '8100'
                }
            ];
            const exportPath = path.join(testExportDir, 'test.dpl');

            await service.exportBoxToDpl(movies, exportPath);

            const content = fs.readFileSync(exportPath, 'utf8');
            expect(content).toContain('File1=D:/Movies/A.mp4');
            expect(content).toContain('Title1=电影A');
            expect(content).toContain('Length1=7200000');
            expect(content).toContain('Played1=0');
            expect(content).toContain('File2=D:/Movies/B.mkv');
            expect(content).toContain('Title2=电影B');
            expect(content).toContain('Length2=8100000');
        });

        test('SVC-EXPORT-011: 正确计算时长毫秒数', async () => {
            const movies = [
                {
                    movieId: 'm1',
                    name: '电影A',
                    original_filename: 'D:/test.mp4',
                    videoDuration: '90'
                }
            ];
            const exportPath = path.join(testExportDir, 'test.dpl');

            await service.exportBoxToDpl(movies, exportPath);

            const content = fs.readFileSync(exportPath, 'utf8');
            expect(content).toContain('Length1=90000');
        });

        test('SVC-EXPORT-012: videoDuration为空时长度为0', async () => {
            const movies = [
                {
                    movieId: 'm1',
                    name: '电影A',
                    original_filename: 'D:/test.mp4'
                }
            ];
            const exportPath = path.join(testExportDir, 'test.dpl');

            await service.exportBoxToDpl(movies, exportPath);

            const content = fs.readFileSync(exportPath, 'utf8');
            expect(content).toContain('Length1=0');
        });

        test('SVC-EXPORT-013: 返回成功结果', async () => {
            const movies = [{ movieId: 'm1', name: '电影A' }];
            const exportPath = path.join(testExportDir, 'test.dpl');

            const result = await service.exportBoxToDpl(movies, exportPath);

            expect(result.success).toBe(true);
            expect(result.count).toBe(1);
        });

        test('SVC-EXPORT-014: NumberOfEntries正确反映电影数量', async () => {
            const movies = [
                { movieId: 'm1', name: '电影A' },
                { movieId: 'm2', name: '电影B' },
                { movieId: 'm3', name: '电影C' }
            ];
            const exportPath = path.join(testExportDir, 'test.dpl');

            await service.exportBoxToDpl(movies, exportPath);

            const content = fs.readFileSync(exportPath, 'utf8');
            expect(content).toContain('NumberOfEntries=3');
        });
    });

    describe('exportBoxToZip', () => {
        test('SVC-EXPORT-015: ZIP包含movie.nfo文件', async () => {
            const movieId = 'movie-test';
            const movieDir = path.join(testMoviesDir, 'movie', movieId);
            fs.mkdirSync(movieDir, { recursive: true });
            fs.writeFileSync(path.join(movieDir, 'movie.nfo'), '<movie><title>测试</title></movie>');

            const movies = [{ movieId: movieId, name: '测试电影', category: 'movie', basePath: movieDir }];
            const exportPath = path.join(testExportDir, 'test.zip');

            await service.exportBoxToZip(movies, testMoviesDir, exportPath);

            expect(fs.existsSync(exportPath)).toBe(true);
            const AdmZip = require('adm-zip');
            const zip = new AdmZip(exportPath);
            const entries = zip.getEntries();
            expect(entries.some(e => e.entryName === `${movieId}/movie.nfo`)).toBe(true);
        });

        test('SVC-EXPORT-015a: 使用basePath而非拼接路径', async () => {
            const movieId = 'movie-test';
            const movieDir = path.join(testMoviesDir, 'custom-location', movieId);
            fs.mkdirSync(movieDir, { recursive: true });
            fs.writeFileSync(path.join(movieDir, 'movie.nfo'), '<movie><title>测试</title></movie>');

            const movies = [{ movieId: movieId, name: '测试电影', category: 'movie', basePath: movieDir }];
            const exportPath = path.join(testExportDir, 'test.zip');

            await service.exportBoxToZip(movies, testMoviesDir, exportPath);

            const AdmZip = require('adm-zip');
            const zip = new AdmZip(exportPath);
            const entries = zip.getEntries();
            expect(entries.some(e => e.entryName === `${movieId}/movie.nfo`)).toBe(true);
        });

        test('SVC-EXPORT-016: ZIP包含poster文件', async () => {
            const movieId = 'movie-test';
            const movieDir = path.join(testMoviesDir, 'movie', movieId);
            fs.mkdirSync(movieDir, { recursive: true });
            fs.writeFileSync(path.join(movieDir, 'movie.nfo'), '<movie></movie>');
            fs.writeFileSync(path.join(movieDir, 'poster.jpg'), 'fake-image');

            const movies = [{ movieId: movieId, name: '测试电影', category: 'movie', basePath: movieDir }];
            const exportPath = path.join(testExportDir, 'test.zip');

            await service.exportBoxToZip(movies, testMoviesDir, exportPath);

            const AdmZip = require('adm-zip');
            const zip = new AdmZip(exportPath);
            const entries = zip.getEntries();
            expect(entries.some(e => e.entryName === `${movieId}/poster.jpg`)).toBe(true);
        });

        test('SVC-EXPORT-017: ZIP包含多种poster格式', async () => {
            const movieId = 'movie-test';
            const movieDir = path.join(testMoviesDir, 'movie', movieId);
            fs.mkdirSync(movieDir, { recursive: true });
            fs.writeFileSync(path.join(movieDir, 'movie.nfo'), '<movie></movie>');
            fs.writeFileSync(path.join(movieDir, 'poster.jpg'), 'jpg');
            fs.writeFileSync(path.join(movieDir, 'movie-poster.png'), 'png');

            const movies = [{ movieId: movieId, name: '测试电影', category: 'movie', basePath: movieDir }];
            const exportPath = path.join(testExportDir, 'test.zip');

            await service.exportBoxToZip(movies, testMoviesDir, exportPath);

            const AdmZip = require('adm-zip');
            const zip = new AdmZip(exportPath);
            const entries = zip.getEntries();
            expect(entries.some(e => e.entryName === `${movieId}/poster.jpg`)).toBe(true);
            expect(entries.some(e => e.entryName === `${movieId}/movie-poster.png`)).toBe(true);
        });

        test('SVC-EXPORT-018: 电影目录不存在时跳过', async () => {
            const movies = [{ movieId: 'nonexistent', name: '不存在', category: 'movie', basePath: '/nonexistent/path' }];
            const exportPath = path.join(testExportDir, 'test.zip');

            const result = await service.exportBoxToZip(movies, testMoviesDir, exportPath);

            expect(fs.existsSync(exportPath)).toBe(true);
            const AdmZip = require('adm-zip');
            const zip = new AdmZip(exportPath);
            const entries = zip.getEntries();
            expect(entries.length).toBe(0);
            expect(result.count).toBe(0);
            expect(result.skipped).toContain('nonexistent');
        });

        test('SVC-EXPORT-019: 返回成功结果和实际导出数量', async () => {
            const movieId = 'movie-test';
            const movieDir = path.join(testMoviesDir, 'movie', movieId);
            fs.mkdirSync(movieDir, { recursive: true });
            fs.writeFileSync(path.join(movieDir, 'movie.nfo'), '<movie></movie>');

            const movies = [{ movieId: movieId, name: '电影A', category: 'movie', basePath: movieDir }];
            const exportPath = path.join(testExportDir, 'test.zip');

            const result = await service.exportBoxToZip(movies, testMoviesDir, exportPath);

            expect(result.success).toBe(true);
            expect(result.count).toBe(1);
            expect(result.skipped).toEqual([]);
        });
    });

    describe('exportBox', () => {
        test('SVC-EXPORT-020: 根据类型调用正确的导出方法', async () => {
            const movies = [{ movieId: 'm1', name: '电影A' }];
            const csvPath = path.join(testExportDir, 'test.csv');
            const dplPath = path.join(testExportDir, 'test.dpl');

            const csvResult = await service.exportBox('csv', movies, testMoviesDir, csvPath);
            const dplResult = await service.exportBox('dpl', movies, testMoviesDir, dplPath);

            expect(csvResult.success).toBe(true);
            expect(dplResult.success).toBe(true);
            expect(fs.existsSync(csvPath)).toBe(true);
            expect(fs.existsSync(dplPath)).toBe(true);
        });

        test('SVC-EXPORT-021: 不支持的类型抛出错误', async () => {
            const movies = [{ movieId: 'm1', name: '电影A' }];
            const exportPath = path.join(testExportDir, 'test.xyz');

            await expect(service.exportBox('xyz', movies, testMoviesDir, exportPath))
                .rejects.toThrow('不支持的导出格式');
        });

        test('SVC-EXPORT-021a: JSON导出成功', async () => {
            const movies = [
                { movieId: 'm1', name: '电影A', boxStatus: 'completed', boxRating: 5 },
                { movieId: 'm2', name: '电影B', boxStatus: 'unwatched', boxRating: 0 }
            ];
            const exportPath = path.join(testExportDir, 'test.json');

            const result = await service.exportBox('json', movies, testMoviesDir, exportPath, 'MyBox');

            expect(result.success).toBe(true);
            expect(result.count).toBe(2);
        });
    });

    describe('exportBoxToJson', () => {
        test('SVC-EXPORT-031: JSON包含正确结构', async () => {
            const movies = [
                { movieId: 'm1', name: '电影A', boxStatus: 'completed', boxRating: 5, boxComment: '好看' }
            ];
            const exportPath = path.join(testExportDir, 'test.json');

            await service.exportBoxToJson(movies, 'TestBox', exportPath);

            const content = fs.readFileSync(exportPath, 'utf8');
            const data = JSON.parse(content);
            expect(data.movie).toBeDefined();
            expect(data.metadata).toBeDefined();
            expect(data.metadata.name).toBe('TestBox');
        });

        test('SVC-EXPORT-032: JSON包含电影数据', async () => {
            const movies = [
                { movieId: 'movie-测试', name: '测试电影', boxStatus: 'watching', boxRating: 3, boxComment: '还不错' }
            ];
            const exportPath = path.join(testExportDir, 'test.json');

            await service.exportBoxToJson(movies, 'MyBox', exportPath);

            const content = fs.readFileSync(exportPath, 'utf8');
            const data = JSON.parse(content);
            expect(data.movie.length).toBe(1);
            expect(data.movie[0].id).toBe('movie-测试');
            expect(data.movie[0].status).toBe('watching');
            expect(data.movie[0].rating).toBe(3);
            expect(data.movie[0].comment).toBe('还不错');
        });

        test('SVC-EXPORT-033: 返回成功结果', async () => {
            const movies = [
                { movieId: 'm1', name: '电影A' },
                { movieId: 'm2', name: '电影B' }
            ];
            const exportPath = path.join(testExportDir, 'test.json');

            const result = await service.exportBoxToJson(movies, 'TestBox', exportPath);

            expect(result.success).toBe(true);
            expect(result.count).toBe(2);
        });

        test('SVC-EXPORT-034: 空电影列表导出空movie数组', async () => {
            const movies = [];
            const exportPath = path.join(testExportDir, 'empty.json');

            await service.exportBoxToJson(movies, 'EmptyBox', exportPath);

            const content = fs.readFileSync(exportPath, 'utf8');
            const data = JSON.parse(content);
            expect(data.movie).toEqual([]);
            expect(data.metadata.name).toBe('EmptyBox');
        });
    });

    describe('generateExportFileName', () => {
        test('SVC-EXPORT-035: 生成ZIP文件名', () => {
            const fileName = service.generateExportFileName('MyBox', 'zip');
            expect(fileName).toMatch(/^MyBox-\d{14}-export\.zip$/);
        });

        test('SVC-EXPORT-036: 生成CSV文件名', () => {
            const fileName = service.generateExportFileName('MyBox', 'csv');
            expect(fileName).toMatch(/^MyBox-\d{14}-export\.csv$/);
        });

        test('SVC-EXPORT-037: 生成DPL文件名', () => {
            const fileName = service.generateExportFileName('MyBox', 'dpl');
            expect(fileName).toMatch(/^MyBox-\d{14}-export\.dpl$/);
        });

        test('SVC-EXPORT-038: 生成JSON文件名', () => {
            const fileName = service.generateExportFileName('MyBox', 'json');
            expect(fileName).toMatch(/^MyBox-\d{14}-export\.json$/);
        });

        test('SVC-EXPORT-039: 未知类型无扩展名', () => {
            const fileName = service.generateExportFileName('MyBox', 'unknown');
            expect(fileName).toMatch(/^MyBox-\d{14}-export$/);
        });
    });

    describe('getExportFilters', () => {
        test('SVC-EXPORT-040: ZIP过滤器', () => {
            const filters = service.getExportFilters('zip');
            expect(filters).toEqual([{ name: 'ZIP文件', extensions: ['zip'] }]);
        });

        test('SVC-EXPORT-041: CSV过滤器', () => {
            const filters = service.getExportFilters('csv');
            expect(filters).toEqual([{ name: 'CSV文件', extensions: ['csv'] }]);
        });

        test('SVC-EXPORT-042: DPL过滤器', () => {
            const filters = service.getExportFilters('dpl');
            expect(filters).toEqual([{ name: 'PotPlayer播放列表', extensions: ['dpl'] }]);
        });

        test('SVC-EXPORT-043: JSON过滤器', () => {
            const filters = service.getExportFilters('json');
            expect(filters).toEqual([{ name: 'JSON文件', extensions: ['json'] }]);
        });

        test('SVC-EXPORT-044: 默认过滤器', () => {
            const filters = service.getExportFilters('unknown');
            expect(filters).toEqual([{ name: '所有文件', extensions: ['*'] }]);
        });
    });

    describe('getExportTimestamp', () => {
        test('SVC-EXPORT-045: 时间戳格式正确', () => {
            const timestamp = service.getExportTimestamp();
            expect(timestamp).toMatch(/^\d{14}$/);
            expect(timestamp.length).toBe(14);
        });
    });
});
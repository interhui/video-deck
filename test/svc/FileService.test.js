/**
 * FileService 单元测试
 */
const FileService = require('../../src/main/services/FileService');
const path = require('path');
const fs = require('fs');

describe('FileService', () => {
    let service;
    let testDataDir;

    beforeEach(() => {
        service = new FileService();
        testDataDir = path.join(__dirname, 'test-data', 'fileservice');
        if (!fs.existsSync(testDataDir)) {
            fs.mkdirSync(testDataDir, { recursive: true });
        }
    });

    afterEach(() => {
        // Clean up test files
        if (fs.existsSync(testDataDir)) {
            fs.rmSync(testDataDir, { recursive: true, force: true });
        }
    });

    describe('constructor', () => {
        test('SVC-FILE-001: 创建实例', () => {
            expect(service).toBeDefined();
            expect(service.baseDir).toBeDefined();
        });
    });

    describe('fileExists', () => {
        test('SVC-FILE-002: 文件存在返回true', async () => {
            const testFile = path.join(testDataDir, 'exists.txt');
            fs.writeFileSync(testFile, 'test content');
            const result = await service.fileExists(testFile);
            expect(result).toBe(true);
        });

        test('SVC-FILE-003: 文件不存在返回false', async () => {
            const result = await service.fileExists(path.join(testDataDir, 'notexists.txt'));
            expect(result).toBe(false);
        });
    });

    describe('fileExistsSync', () => {
        test('SVC-FILE-004: 存在返回true', () => {
            const testFile = path.join(testDataDir, 'syncexists.txt');
            fs.writeFileSync(testFile, 'test');
            expect(service.fileExistsSync(testFile)).toBe(true);
        });

        test('SVC-FILE-005: 不存在返回false', () => {
            expect(service.fileExistsSync(path.join(testDataDir, 'notexists.txt'))).toBe(false);
        });
    });

    describe('getCategoryFolders', () => {
        test('SVC-FILE-006: 返回文件夹列表', async () => {
            fs.mkdirSync(path.join(testDataDir, 'folder1'));
            fs.mkdirSync(path.join(testDataDir, 'folder2'));
            const result = await service.getCategoryFolders(testDataDir);
            expect(result).toContain('folder1');
            expect(result).toContain('folder2');
        });

        test('SVC-FILE-007: 目录不存在返回空', async () => {
            const result = await service.getCategoryFolders(path.join(testDataDir, 'notexists'));
            expect(result).toEqual([]);
        });
    });

    describe('getMovieFolders', () => {
        test('SVC-FILE-008: 返回电影文件夹映射', async () => {
            const movieDir = path.join(testDataDir, 'movie1');
            fs.mkdirSync(movieDir);
            const result = await service.getMovieFolders(testDataDir);
            expect(result).toHaveProperty('movie1');
            expect(result.movie1).toBe(movieDir);
        });

        test('SVC-FILE-009: 目录不存在返回空对象', async () => {
            const result = await service.getMovieFolders(path.join(testDataDir, 'notexists'));
            expect(result).toEqual({});
        });
    });

    describe('readMovieNfo', () => {
        test('SVC-FILE-010: 正确读取NFO', async () => {
            const movieDir = path.join(testDataDir, 'TestMovie');
            fs.mkdirSync(movieDir);
            const nfoContent = `<?xml version="1.0" encoding="UTF-8"?>
<movie>
    <id>test-id</id>
    <title>Test Movie</title>
    <year>2024</year>
    <outline>Test outline</outline>
    <director>Test Director</director>
    <actor><name>Actor 1</name></actor>
    <actor><name>Actor 2</name></actor>
    <tag>action</tag>
    <tag>drama</tag>
    <userRating>5</userRating>
</movie>`;
            fs.writeFileSync(path.join(movieDir, 'movie.nfo'), nfoContent);
            const result = await service.readMovieNfo(movieDir);
            expect(result.id).toBe('test-id');
            expect(result.title).toBe('Test Movie');
            expect(result.year).toBe('2024');
        });

        test('SVC-FILE-011: 文件不存在返回null', async () => {
            const result = await service.readMovieNfo(path.join(testDataDir, 'notexists'));
            expect(result).toBeNull();
        });
    });

    describe('writeMovieNfo', () => {
        test('SVC-FILE-012: 正确写入NFO文件', async () => {
            const movieDir = path.join(testDataDir, 'WriteTest');
            fs.mkdirSync(movieDir);
            const movieData = {
                id: 'write-test',
                title: 'Write Test Movie',
                year: '2024'
            };
            await service.writeMovieNfo(movieDir, movieData);
            const nfoPath = path.join(movieDir, 'movie.nfo');
            expect(fs.existsSync(nfoPath)).toBe(true);
            const content = fs.readFileSync(nfoPath, 'utf-8');
            expect(content).toContain('Write Test Movie');
        });
    });

    describe('generateMovieNfo', () => {
        test('SVC-FILE-017: 生成完整XML', () => {
            const data = {
                id: 'gen-test',
                title: 'Generate Test',
                year: '2024',
                director: 'Director',
                actors: ['Actor 1'],
                tag: ['action'],
                userRating: 5
            };
            const xml = service.generateMovieNfo(data);
            expect(xml).toContain('<id>gen-test</id>');
            expect(xml).toContain('<title>Generate Test</title>');
        });

        test('SVC-FILE-018: XML转义特殊字符', () => {
            const data = { title: 'Title with & < > " quotes' };
            const xml = service.generateMovieNfo(data);
            expect(xml).toContain('&amp;');
            expect(xml).toContain('&lt;');
            expect(xml).toContain('&gt;');
        });

        test('SVC-FILE-019: 生成包含视频信息的NFO', () => {
            const data = {
                id: 'video-test',
                title: 'Video Test Movie',
                year: '2024',
                videoCodec: 'H264',
                videoWidth: '1920',
                videoHeight: '1080',
                videoDuration: '7200'
            };
            const xml = service.generateMovieNfo(data);
            expect(xml).toContain('<codec>H264</codec>');
            expect(xml).toContain('<width>1920</width>');
            expect(xml).toContain('<height>1080</height>');
            expect(xml).toContain('<durationinseconds>7200</durationinseconds>');
            expect(xml).toContain('<fileinfo>');
            expect(xml).toContain('<streamdetails>');
            expect(xml).toContain('<video>');
        });

        test('SVC-FILE-020: 生成仅有部分视频信息的NFO', () => {
            const data = {
                id: 'partial-video-test',
                title: 'Partial Video Test',
                videoCodec: 'H265',
                videoWidth: '3840',
                videoHeight: '2160'
            };
            const xml = service.generateMovieNfo(data);
            expect(xml).toContain('<codec>H265</codec>');
            expect(xml).toContain('<width>3840</width>');
            expect(xml).toContain('<height>2160</height>');
            expect(xml).not.toContain('<durationinseconds>');
        });
    });

    describe('readDir', () => {
        test('SVC-FILE-019: 返回文件列表', async () => {
            fs.writeFileSync(path.join(testDataDir, 'file1.txt'), '');
            fs.writeFileSync(path.join(testDataDir, 'file2.txt'), '');
            const result = await service.readDir(testDataDir);
            expect(result).toContain('file1.txt');
            expect(result).toContain('file2.txt');
        });

        test('SVC-FILE-020: 目录不存在返回空', async () => {
            const result = await service.readDir(path.join(testDataDir, 'notexists'));
            expect(result).toEqual([]);
        });
    });

    describe('createDir', () => {
        test('SVC-FILE-021: 创建目录成功', async () => {
            const newDir = path.join(testDataDir, 'newdir', 'subdir');
            await service.createDir(newDir);
            expect(fs.existsSync(newDir)).toBe(true);
        });
    });

    describe('ensureDir', () => {
        test('SVC-FILE-022: 目录不存在时创建', async () => {
            const newDir = path.join(testDataDir, 'ensure', 'nested');
            await service.ensureDir(newDir);
            expect(fs.existsSync(newDir)).toBe(true);
        });

        test('SVC-FILE-023: 已存在不报错', async () => {
            const existingDir = path.join(testDataDir, 'existing');
            fs.mkdirSync(existingDir);
            await expect(service.ensureDir(existingDir)).resolves.not.toThrow();
        });
    });

    describe('writeFile', () => {
        test('SVC-FILE-024: 写入文件成功', async () => {
            const filePath = path.join(testDataDir, 'write.txt');
            await service.writeFile(filePath, 'test content');
            expect(fs.readFileSync(filePath, 'utf-8')).toBe('test content');
        });
    });

    describe('readFile', () => {
        test('SVC-FILE-025: 读取文件内容', async () => {
            const filePath = path.join(testDataDir, 'read.txt');
            fs.writeFileSync(filePath, 'read content');
            const result = await service.readFile(filePath);
            expect(result).toBe('read content');
        });

        test('SVC-FILE-026: 文件不存在抛错误', async () => {
            await expect(service.readFile(path.join(testDataDir, 'notexists.txt')))
                .rejects.toThrow();
        });
    });

    describe('deleteFile', () => {
        test('SVC-FILE-027: 删除文件成功', async () => {
            const filePath = path.join(testDataDir, 'delete.txt');
            fs.writeFileSync(filePath, '');
            await service.deleteFile(filePath);
            expect(fs.existsSync(filePath)).toBe(false);
        });

        test('SVC-FILE-028: 不存在不报错', async () => {
            await expect(service.deleteFile(path.join(testDataDir, 'notexists.txt')))
                .resolves.not.toThrow();
        });
    });

    describe('copyFile', () => {
        test('SVC-FILE-030: 复制文件成功', async () => {
            const src = path.join(testDataDir, 'source.txt');
            const dest = path.join(testDataDir, 'dest.txt');
            fs.writeFileSync(src, 'copy content');
            await service.copyFile(src, dest);
            expect(fs.existsSync(dest)).toBe(true);
            expect(fs.readFileSync(dest, 'utf-8')).toBe('copy content');
        });

        test('SVC-FILE-031: 源不存在抛错误', async () => {
            await expect(service.copyFile(
                path.join(testDataDir, 'notexists.txt'),
                path.join(testDataDir, 'dest.txt')
            )).rejects.toThrow();
        });
    });

    describe('readJson', () => {
        test('SVC-FILE-032: 正确读取JSON', async () => {
            const filePath = path.join(testDataDir, 'test.json');
            fs.writeFileSync(filePath, JSON.stringify({ key: 'value' }));
            const result = await service.readJson(filePath);
            expect(result.key).toBe('value');
        });

        test('SVC-FILE-033: 文件不存在返回null', async () => {
            const result = await service.readJson(path.join(testDataDir, 'notexists.json'));
            expect(result).toBeNull();
        });
    });

    describe('writeJson', () => {
        test('SVC-FILE-034: 正确写入JSON', async () => {
            const filePath = path.join(testDataDir, 'write.json');
            await service.writeJson(filePath, { test: 'data' });
            const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            expect(content.test).toBe('data');
        });
    });

    describe('getFileExtension', () => {
        test('SVC-FILE-035: 正确返回扩展名', () => {
            expect(service.getFileExtension('test.jpg')).toBe('.jpg');
        });

        test('SVC-FILE-036: 大写转小写', () => {
            expect(service.getFileExtension('test.PNG')).toBe('.png');
        });

        test('SVC-FILE-037: 无扩展名返回空', () => {
            expect(service.getFileExtension('noextension')).toBe('');
        });
    });

    describe('getFileNameWithoutExtension', () => {
        test('SVC-FILE-038: 返回无扩展名文件名', () => {
            expect(service.getFileNameWithoutExtension('test.jpg')).toBe('test');
        });
    });

    describe('readImageAsBase64', () => {
        test('SVC-FILE-039: 返回base64字符串', async () => {
            const imgPath = path.join(testDataDir, 'test.jpg');
            fs.writeFileSync(imgPath, Buffer.from([0xFF, 0xD8, 0xFF]));
            const result = await service.readImageAsBase64(imgPath);
            expect(result).toContain('data:image/jpeg;base64,');
        });

        test('SVC-FILE-040: 文件不存在返回null', async () => {
            const result = await service.readImageAsBase64(path.join(testDataDir, 'notexists.jpg'));
            expect(result).toBeNull();
        });
    });

    describe('getMimeType', () => {
        test('SVC-FILE-041: 返回正确MIME类型', () => {
            expect(service.getMimeType('.jpg')).toBe('image/jpeg');
            expect(service.getMimeType('.png')).toBe('image/png');
        });

        test('SVC-FILE-042: 未知类型返回默认', () => {
            expect(service.getMimeType('.unknown')).toBe('application/octet-stream');
        });
    });

    describe('scanDirectoryForMovies', () => {
        test('SVC-FILE-043: 返回子文件夹列表', async () => {
            fs.mkdirSync(path.join(testDataDir, 'movie1'));
            fs.mkdirSync(path.join(testDataDir, 'movie2'));
            const result = await service.scanDirectoryForMovies(testDataDir);
            expect(result).toContain('movie1');
            expect(result).toContain('movie2');
        });
    });

    describe('copyDir', () => {
        test('SVC-FILE-047: 复制目录成功', async () => {
            const srcDir = path.join(testDataDir, 'copySrc');
            const destDir = path.join(testDataDir, 'copyDest');
            fs.mkdirSync(srcDir);
            fs.writeFileSync(path.join(srcDir, 'file.txt'), 'content');
            await service.copyDir(srcDir, destDir);
            expect(fs.existsSync(path.join(destDir, 'file.txt'))).toBe(true);
        });
    });

    describe('moveDir', () => {
        test('SVC-FILE-048: 移动目录成功', async () => {
            const srcDir = path.join(testDataDir, 'moveSrc');
            const destDir = path.join(testDataDir, 'moveDest');
            fs.mkdirSync(srcDir);
            fs.writeFileSync(path.join(srcDir, 'file.txt'), 'content');
            await service.moveDir(srcDir, destDir);
            expect(fs.existsSync(path.join(destDir, 'file.txt'))).toBe(true);
            expect(fs.existsSync(srcDir)).toBe(false);
        });
    });

    describe('scanDirectoryRecursively', () => {
        test('SVC-FILE-049: 递归扫描返回包含movie.nfo的文件夹', async () => {
            // 创建测试结构
            const movieDir1 = path.join(testDataDir, 'movie1');
            const movieDir2 = path.join(testDataDir, 'movie2');
            const subDir = path.join(testDataDir, 'subfolder');
            const nestedMovieDir = path.join(subDir, 'nestedMovie');

            fs.mkdirSync(movieDir1, { recursive: true });
            fs.mkdirSync(movieDir2, { recursive: true });
            fs.mkdirSync(nestedMovieDir, { recursive: true });

            // movie1 有 movie.nfo
            fs.writeFileSync(path.join(movieDir1, 'movie.nfo'), '<?xml version="1.0"?><movie><title>Movie 1</title></movie>');
            fs.writeFileSync(path.join(movieDir1, 'poster.jpg'), Buffer.from([0xFF, 0xD8]));

            // movie2 有 movie.nfo
            fs.writeFileSync(path.join(movieDir2, 'movie.nfo'), '<?xml version="1.0"?><movie><title>Movie 2</title></movie>');

            // nestedMovie 有 movie.nfo
            fs.writeFileSync(path.join(nestedMovieDir, 'movie.nfo'), '<?xml version="1.0"?><movie><title>Nested Movie</title></movie>');

            const result = await service.scanDirectoryRecursively(testDataDir);

            expect(result.length).toBe(3);
            expect(result.some(m => m.folderName === 'movie1')).toBe(true);
            expect(result.some(m => m.folderName === 'movie2')).toBe(true);
            expect(result.some(m => m.folderName === 'nestedMovie')).toBe(true);
        });

        test('SVC-FILE-050: 无movie.nfo的文件夹被跳过', async () => {
            const emptyDir = path.join(testDataDir, 'emptyDir');
            const movieDir = path.join(testDataDir, 'validMovie');

            fs.mkdirSync(emptyDir);
            fs.mkdirSync(movieDir);
            fs.writeFileSync(path.join(movieDir, 'movie.nfo'), '<?xml version="1.0"?><movie></movie>');

            const result = await service.scanDirectoryRecursively(testDataDir);

            expect(result.length).toBe(1);
            expect(result[0].folderName).toBe('validMovie');
        });

        test('SVC-FILE-051: 目录不存在返回空数组', async () => {
            const result = await service.scanDirectoryRecursively(path.join(testDataDir, 'notExists'));
            expect(result).toEqual([]);
        });

        test('SVC-FILE-052-1: 优先查找movie.nfo，不存在时查找其他nfo文件', async () => {
            const movieDir1 = path.join(testDataDir, 'movieWithMovieNfo');
            const movieDir2 = path.join(testDataDir, 'movieWithOtherNfo');

            fs.mkdirSync(movieDir1, { recursive: true });
            fs.mkdirSync(movieDir2, { recursive: true });

            fs.writeFileSync(path.join(movieDir1, 'movie.nfo'), '<?xml version="1.0"?><movie><title>Movie 1</title></movie>');
            fs.writeFileSync(path.join(movieDir2, 'custom.nfo'), '<?xml version="1.0"?><movie><title>Movie 2</title></movie>');

            const result = await service.scanDirectoryRecursively(testDataDir);

            expect(result.length).toBe(2);
            const movie1 = result.find(m => m.folderName === 'movieWithMovieNfo');
            const movie2 = result.find(m => m.folderName === 'movieWithOtherNfo');

            expect(movie1.nfoPath).toBe(path.join(movieDir1, 'movie.nfo'));
            expect(movie2.nfoPath).toBe(path.join(movieDir2, 'custom.nfo'));
        });

        test('SVC-FILE-052-2: movie.nfo优先于其他nfo文件', async () => {
            const movieDir = path.join(testDataDir, 'movieWithBoth');

            fs.mkdirSync(movieDir, { recursive: true });
            fs.writeFileSync(path.join(movieDir, 'movie.nfo'), '<?xml version="1.0"?><movie><title>Main</title></movie>');
            fs.writeFileSync(path.join(movieDir, 'custom.nfo'), '<?xml version="1.0"?><movie><title>Custom</title></movie>');

            const result = await service.scanDirectoryRecursively(testDataDir);

            const movie = result.find(m => m.folderName === 'movieWithBoth');
            expect(movie.nfoPath).toBe(path.join(movieDir, 'movie.nfo'));
        });
    });

    describe('findMoviePoster', () => {
        test('SVC-FILE-052: 查找-poster.jpg文件', async () => {
            const movieDir = path.join(testDataDir, 'testMovie');
            fs.mkdirSync(movieDir);
            fs.writeFileSync(path.join(movieDir, 'movie.nfo'), '<?xml version="1.0"?><movie></movie>');
            fs.writeFileSync(path.join(movieDir, '星际穿越-poster.jpg'), Buffer.from([0xFF, 0xD8]));

            const result = await service.findMoviePoster(movieDir);

            expect(result.posterPath).toContain('星际穿越-poster.jpg');
            expect(result.posterExt).toBe('.jpg');
        });

        test('SVC-FILE-053: 查找poster.jpg文件', async () => {
            const movieDir = path.join(testDataDir, 'testMovie2');
            fs.mkdirSync(movieDir);
            fs.writeFileSync(path.join(movieDir, 'movie.nfo'), '<?xml version="1.0"?><movie></movie>');
            fs.writeFileSync(path.join(movieDir, 'poster.jpg'), Buffer.from([0xFF, 0xD8]));

            const result = await service.findMoviePoster(movieDir);

            expect(result.posterPath).toContain('poster.jpg');
            expect(result.posterExt).toBe('.jpg');
        });

        test('SVC-FILE-054: 查找cover.jpg文件', async () => {
            const movieDir = path.join(testDataDir, 'testMovie3');
            fs.mkdirSync(movieDir);
            fs.writeFileSync(path.join(movieDir, 'movie.nfo'), '<?xml version="1.0"?><movie></movie>');
            fs.writeFileSync(path.join(movieDir, 'cover.jpg'), Buffer.from([0xFF, 0xD8]));

            const result = await service.findMoviePoster(movieDir);

            expect(result.posterPath).toContain('cover.jpg');
        });

        test('SVC-FILE-055: 无海报文件返回null', async () => {
            const movieDir = path.join(testDataDir, 'noPosterMovie');
            fs.mkdirSync(movieDir);
            fs.writeFileSync(path.join(movieDir, 'movie.nfo'), '<?xml version="1.0"?><movie></movie>');

            const result = await service.findMoviePoster(movieDir);

            expect(result.posterPath).toBeNull();
            expect(result.posterExt).toBeNull();
        });
    });

    describe('parseCsvFile', () => {
        test('SVC-FILE-056: 解析CSV文件返回电影数组', async () => {
            const csvContent = `电影ID,电影名称,电影描述,排序标题,演员,导演,上映时间,发行商,电影时长,标签,文件地址,视频编码,视频宽度,视频高度,视频时间
movie-001,星际穿越,科幻电影,星际穿越,马修·麦康纳|安妮·海瑟薇,克里斯托弗·诺兰,2014,派拉蒙,169,科幻|冒险,D:/Movies/星际穿越.mp4,H264,1920,1080,10140`;

            const csvPath = path.join(testDataDir, 'movies.csv');
            fs.writeFileSync(csvPath, csvContent);

            const result = await service.parseCsvFile(csvPath);

            expect(result.length).toBe(1);
            expect(result[0].movieId).toBe('movie-001');
            expect(result[0].title).toBe('星际穿越');
            expect(result[0].director).toBe('克里斯托弗·诺兰');
            expect(result[0].actors).toEqual(['马修·麦康纳', '安妮·海瑟薇']);
            expect(result[0].runtime).toBe('169');
            expect(result[0].videoCodec).toBe('H264');
        });

        test('SVC-FILE-057: CSV文件不存在返回空数组', async () => {
            const result = await service.parseCsvFile(path.join(testDataDir, 'notexists.csv'));
            expect(result).toEqual([]);
        });

        test('SVC-FILE-058: 解析多行CSV', async () => {
            const csvContent = `电影ID,电影名称,电影描述,排序标题,演员,导演,上映时间,发行商,电影时长,标签,文件地址,视频编码,视频宽度,视频高度,视频时间
movie-001,电影1,描述1,标题1,演员1|演员2,导演1,2020,发行商1,120,标签1,D:/1.mp4,H264,1920,1080,7200
movie-002,电影2,描述2,标题2,演员3,导演2,2021,发行商2,100,标签2,D:/2.mp4,H265,1280,720,6000`;

            const csvPath = path.join(testDataDir, 'movies2.csv');
            fs.writeFileSync(csvPath, csvContent);

            const result = await service.parseCsvFile(csvPath);

            expect(result.length).toBe(2);
            expect(result[0].title).toBe('电影1');
            expect(result[1].title).toBe('电影2');
        });
    });

    describe('parseCsvLine', () => {
        test('SVC-FILE-059: 解析简单CSV行', () => {
            const line = 'value1,value2,value3';
            const result = service.parseCsvLine(line);
            expect(result).toEqual(['value1', 'value2', 'value3']);
        });

        test('SVC-FILE-060: 解析带引号的CSV行', () => {
            const line = '"value with, comma","normal value"';
            const result = service.parseCsvLine(line);
            expect(result).toEqual(['value with, comma', 'normal value']);
        });

        test('SVC-FILE-061: 解析转义引号', () => {
            const line = '"value ""with"" quotes","normal"';
            const result = service.parseCsvLine(line);
            expect(result[0]).toBe('value "with" quotes');
        });
    });

    describe('copyFile', () => {
        test('SVC-FILE-062: 复制文件成功', async () => {
            const srcFile = path.join(testDataDir, 'copySrc.txt');
            const destFile = path.join(testDataDir, 'copyDest.txt');
            fs.writeFileSync(srcFile, 'test content');

            await service.copyFile(srcFile, destFile);

            expect(fs.existsSync(destFile)).toBe(true);
            expect(fs.readFileSync(destFile, 'utf-8')).toBe('test content');
        });
    });

    describe('scanDirectoryForVideoFiles', () => {
        test('SVC-FILE-063: 扫描视频文件-正常情况', async () => {
            // 创建测试视频文件
            const videoDir = path.join(testDataDir, 'videos');
            fs.mkdirSync(videoDir, { recursive: true });
            fs.writeFileSync(path.join(videoDir, 'movie1.mp4'), 'video content 1');
            fs.writeFileSync(path.join(videoDir, 'movie2.mkv'), 'video content 2');
            fs.writeFileSync(path.join(videoDir, 'movie3.avi'), 'video content 3');
            fs.writeFileSync(path.join(videoDir, 'other.txt'), 'not a video');

            const result = await service.scanDirectoryForVideoFiles(videoDir);

            expect(result).toHaveLength(3);
            expect(result.map(v => v.fileName)).toEqual(['movie1.mp4', 'movie2.mkv', 'movie3.avi']);
            result.forEach(v => {
                expect(v.filePath).toBeDefined();
                expect(v.fileNameWithoutExt).toBeDefined();
                expect(v.fileExt).toBeDefined();
                expect(v.fileSize).toBeGreaterThan(0);
            });
        });

        test('SVC-FILE-064: 扫描视频文件-目录不存在', async () => {
            const result = await service.scanDirectoryForVideoFiles(path.join(testDataDir, 'notexists'));
            expect(result).toEqual([]);
        });

        test('SVC-FILE-065: 扫描视频文件-空目录', async () => {
            const emptyDir = path.join(testDataDir, 'empty');
            fs.mkdirSync(emptyDir, { recursive: true });

            const result = await service.scanDirectoryForVideoFiles(emptyDir);
            expect(result).toEqual([]);
        });

        test('SVC-FILE-066: 扫描视频文件-仅非视频文件', async () => {
            const dir = path.join(testDataDir, 'novideos');
            fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(path.join(dir, 'readme.txt'), 'readme');
            fs.writeFileSync(path.join(dir, 'data.json'), '{}');

            const result = await service.scanDirectoryForVideoFiles(dir);
            expect(result).toEqual([]);
        });

        test('SVC-FILE-067: 扫描视频文件-文件名排序（数字）', async () => {
            const videoDir = path.join(testDataDir, 'sorted');
            fs.mkdirSync(videoDir, { recursive: true });
            fs.writeFileSync(path.join(videoDir, 'video10.mp4'), '10');
            fs.writeFileSync(path.join(videoDir, 'video2.mp4'), '2');
            fs.writeFileSync(path.join(videoDir, 'video1.mp4'), '1');

            const result = await service.scanDirectoryForVideoFiles(videoDir);

            expect(result).toHaveLength(3);
            expect(result[0].fileName).toBe('video1.mp4');
            expect(result[1].fileName).toBe('video2.mp4');
            expect(result[2].fileName).toBe('video10.mp4');
        });

        test('SVC-FILE-068: 扫描视频文件-文件名不含扩展名正确', async () => {
            const videoDir = path.join(testDataDir, 'noext');
            fs.mkdirSync(videoDir, { recursive: true });
            fs.writeFileSync(path.join(videoDir, 'Test.Movie.2024.mp4'), 'content');

            const result = await service.scanDirectoryForVideoFiles(videoDir);

            expect(result).toHaveLength(1);
            expect(result[0].fileNameWithoutExt).toBe('Test.Movie.2024');
        });
    });

    describe('VIDEO_EXTENSIONS', () => {
        test('SVC-FILE-069: 支持常用视频扩展名', () => {
            expect(FileService.VIDEO_EXTENSIONS).toContain('.mp4');
            expect(FileService.VIDEO_EXTENSIONS).toContain('.mkv');
            expect(FileService.VIDEO_EXTENSIONS).toContain('.avi');
            expect(FileService.VIDEO_EXTENSIONS).toContain('.mov');
        });

        test('SVC-FILE-070: 支持其他视频格式', () => {
            expect(FileService.VIDEO_EXTENSIONS).toContain('.wmv');
            expect(FileService.VIDEO_EXTENSIONS).toContain('.flv');
            expect(FileService.VIDEO_EXTENSIONS).toContain('.webm');
            expect(FileService.VIDEO_EXTENSIONS).toContain('.m4v');
        });
    });
});

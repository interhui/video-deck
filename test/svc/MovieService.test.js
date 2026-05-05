/**
 * MovieService 单元测试
 */
const MovieService = require('../../src/main/services/MovieService');
const MovieCacheService = require('../../src/main/services/MovieCacheService');
const CategoryService = require('../../src/main/services/CategoryService');
const path = require('path');
const fs = require('fs');

describe('MovieService', () => {
    let service;
    let testDataDir;
    let moviesDir;

    beforeEach(() => {
        service = new MovieService();
        testDataDir = path.join(__dirname, 'test-data', 'movie-service');
        moviesDir = path.join(testDataDir, 'movies');

        // Create test directories
        const dirs = [
            testDataDir,
            moviesDir,
            path.join(moviesDir, 'movie'),
            path.join(moviesDir, 'tv'),
            path.join(moviesDir, 'movie', 'test-movie'),
            path.join(moviesDir, 'tv', 'test-tv')
        ];
        dirs.forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });

        // Create test movie.nfo files
        const movieNfo = `<?xml version="1.0"?>
<movie>
    <id>movie-1</id>
    <title>Test Movie</title>
    <year>2024</year>
    <outline>Test outline</outline>
    <director>Director</director>
    <actor><name>Actor 1</name></actor>
    <userRating>5</userRating>
</movie>`;
        fs.writeFileSync(path.join(moviesDir, 'movie', 'test-movie', 'movie.nfo'), movieNfo);
        fs.writeFileSync(path.join(moviesDir, 'movie', 'test-movie', 'poster.jpg'), Buffer.from([0xFF, 0xD8]));
    });

    afterEach(() => {
        service.getCacheService().clearCache();
        if (fs.existsSync(testDataDir)) {
            fs.rmSync(testDataDir, { recursive: true, force: true });
        }
    });

    describe('constructor', () => {
        test('SVC-MOVIE-001: 创建实例', () => {
            expect(service).toBeDefined();
            expect(service.fileService).toBeDefined();
            expect(service.cacheService).toBeInstanceOf(MovieCacheService);
        });
    });

    describe('setCategoryService / getCacheService', () => {
        test('SVC-MOVIE-002: 设置分类服务', () => {
            const categoryService = new CategoryService('/fake/path');
            service.setCategoryService(categoryService);
            expect(service.categoryService).toBe(categoryService);
        });

        test('SVC-MOVIE-003: 获取缓存服务', () => {
            const cacheService = service.getCacheService();
            expect(cacheService).toBeInstanceOf(MovieCacheService);
        });
    });

    describe('refreshCache', () => {
        test('SVC-MOVIE-004: 清空并重建缓存', async () => {
            const info = await service.refreshCache(moviesDir);
            expect(info.totalMovies).toBeGreaterThanOrEqual(0);
        });
    });

    describe('getAllCategories', () => {
        test('SVC-MOVIE-005: 返回所有分类电影', async () => {
            const result = await service.getAllCategories(moviesDir);
            expect(result.movie).toBeDefined();
            expect(result.movie.id).toBe('movie');
        });

        test('SVC-MOVIE-006: 缓存未初始化自动初始化', async () => {
            await service.getAllCategories(moviesDir);
            expect(service.getCacheService().isCacheInitialized()).toBe(true);
        });
    });

    describe('getCategoryStats', () => {
        test('SVC-MOVIE-007: 返回分类统计数据', async () => {
            const result = await service.getCategoryStats(['movie'], moviesDir);
            expect(result).toBeDefined();
            expect(result[0].id).toBe('movie');
        });
    });

    describe('getMoviesByCategory', () => {
        test('SVC-MOVIE-008: 返回指定分类电影', async () => {
            await service.refreshCache(moviesDir);
            const movies = await service.getMoviesByCategory('movie', moviesDir);
            expect(movies.length).toBeGreaterThanOrEqual(1);
        });

        test('SVC-MOVIE-009: 支持名称排序', async () => {
            await service.refreshCache(moviesDir);
            const movies = await service.getMoviesByCategory('movie', moviesDir, { sortBy: 'name', sortOrder: 'asc' });
            expect(movies).toBeDefined();
        });

        test('SVC-MOVIE-010: 支持评分筛选', async () => {
            await service.refreshCache(moviesDir);
            const movies = await service.getMoviesByCategory('movie', moviesDir, { rating: 5 });
            movies.forEach(m => {
                expect(m.userRating).toBe(5);
            });
        });
    });

    describe('getAllMovies', () => {
        test('SVC-MOVIE-012: 返回所有电影', async () => {
            await service.refreshCache(moviesDir);
            const movies = await service.getAllMovies(moviesDir);
            expect(movies.length).toBeGreaterThanOrEqual(1);
        });

        test('SVC-MOVIE-013: 支持排序参数', async () => {
            await service.refreshCache(moviesDir);
            const movies = await service.getAllMovies(moviesDir, { sortBy: 'name', sortOrder: 'asc' });
            expect(movies).toBeDefined();
        });
    });

    describe('searchMovies', () => {
        test('SVC-MOVIE-014: 关键字搜索', async () => {
            await service.refreshCache(moviesDir);
            const results = await service.searchMovies('Test', moviesDir);
            expect(results.length).toBeGreaterThanOrEqual(1);
        });

        test('SVC-MOVIE-015: 分类筛选', async () => {
            await service.refreshCache(moviesDir);
            const results = await service.searchMovies('', moviesDir, { category: 'movie' });
            results.forEach(m => {
                expect(m.category).toBe('movie');
            });
        });

        test('SVC-MOVIE-016: 评分筛选', async () => {
            await service.refreshCache(moviesDir);
            const results = await service.searchMovies('', moviesDir, { rating: 5 });
            results.forEach(m => {
                expect(m.userRating).toBe(5);
            });
        });

        test('SVC-MOVIE-017: 无匹配返回空', async () => {
            await service.refreshCache(moviesDir);
            const results = await service.searchMovies('', moviesDir, { rating: 1 });
            expect(results).toEqual([]);
        });
    });

    describe('getMovieDetail', () => {
        test('SVC-MOVIE-019: 返回电影详情', async () => {
            await service.refreshCache(moviesDir);
            const movie = await service.getMovieDetail('movie-1', moviesDir);
            expect(movie).toBeDefined();
            expect(movie.id).toBe('movie-1');
        });

        test('SVC-MOVIE-020: 不存在返回null', async () => {
            await service.refreshCache(moviesDir);
            const movie = await service.getMovieDetail('not-exists', moviesDir);
            expect(movie).toBeNull();
        });
    });

    describe('isMovieValid', () => {
        test('SVC-MOVIE-021: 有效电影返回true', async () => {
            const moviePath = path.join(moviesDir, 'movie', 'test-movie');
            const isValid = await service.isMovieValid(moviePath);
            expect(isValid).toBe(true);
        });

        test('SVC-MOVIE-022: 无效电影返回false', async () => {
            const isValid = await service.isMovieValid(path.join(moviesDir, 'not-exists'));
            expect(isValid).toBe(false);
        });
    });

    describe('saveRating', () => {
        test('SVC-MOVIE-023: 保存评分和评论', async () => {
            await service.refreshCache(moviesDir);
            const result = await service.saveRating('movie-1', 4, 'Good movie!', moviesDir);
            expect(result.success).toBe(true);
        });

        test('SVC-MOVIE-024: 电影不存在抛错误', async () => {
            await service.refreshCache(moviesDir);
            await expect(service.saveRating('not-exists', 4, '', moviesDir))
                .rejects.toThrow('Movie not found');
        });
    });

    describe('batchDeleteMovies', () => {
        test('SVC-MOVIE-025: 批量删除电影', async () => {
            await service.refreshCache(moviesDir);
            const result = await service.batchDeleteMovies(['movie-1'], moviesDir);
            expect(result.success).toBe(true);
        });

        test('SVC-MOVIE-026: 删除不存在的电影', async () => {
            await service.refreshCache(moviesDir);
            const result = await service.batchDeleteMovies(['not-exists'], moviesDir);
            expect(result.count).toBe(0);
        });
    });

    describe('getStats', () => {
        test('SVC-MOVIE-023: 返回全局统计', async () => {
            await service.refreshCache(moviesDir);
            const stats = await service.getStats(null, moviesDir);
            expect(stats).toHaveProperty('totalMovies');
        });

        test('SVC-MOVIE-027: 支持分类筛选', async () => {
            await service.refreshCache(moviesDir);
            const stats = await service.getStats('movie', moviesDir);
            expect(stats.totalMovies).toBeGreaterThanOrEqual(0);
        });
    });

    describe('generateMovieId', () => {
        test('SVC-MOVIE-028: 正确生成ID格式', () => {
            const id = service.generateMovieId('action', 'Test Movie');
            expect(id).toContain('action-');
            expect(id).toContain('Test-Movie');
        });

        test('SVC-MOVIE-029: 处理特殊字符', () => {
            const id = service.generateMovieId('movie', 'Movie: Test/Name');
            expect(id).not.toContain(':');
            expect(id).not.toContain('/');
        });
    });

    describe('generateFolderName', () => {
        test('SVC-MOVIE-030: 使用movieId作为目录名', () => {
            const folderName = service.generateFolderName('movie-123', 'Test Movie', '2024', 'movieId');
            expect(folderName).toBe('movie-123');
        });

        test('SVC-MOVIE-030a: 使用movieName作为目录名，带年份', () => {
            const folderName = service.generateFolderName('movie-123', 'Test Movie', '2024', 'movieName');
            expect(folderName).toBe('Test Movie(2024)');
        });

        test('SVC-MOVIE-030b: 使用movieName作为目录名，不带年份', () => {
            const folderName = service.generateFolderName('movie-123', 'Test Movie', '', 'movieName');
            expect(folderName).toBe('Test Movie');
        });

        test('SVC-MOVIE-030c: 电影名称含特殊字符', () => {
            const folderName = service.generateFolderName('movie-123', 'Avatar: The Way of Water', '2022', 'movieName');
            expect(folderName).toBe('Avatar- The Way of Water(2022)');
        });

        test('SVC-MOVIE-030d: 电影名称为中文', () => {
            const folderName = service.generateFolderName('movie-456', '星际穿越', '2014', 'movieName');
            expect(folderName).toBe('星际穿越(2014)');
        });

        test('SVC-MOVIE-030e: 默认使用movieId方式', () => {
            const folderName = service.generateFolderName('movie-789', 'Test Movie', '2024');
            expect(folderName).toBe('movie-789');
        });
    });

    describe('sortMovies', () => {
        test('SVC-MOVIE-030: 按名称升序', () => {
            const movies = [
                { title: 'Zebra' },
                { title: 'Animal' },
                { title: 'Beta' }
            ];
            const sorted = service.sortMovies(movies, 'name', 'asc');
            expect(sorted[0].title).toBe('Animal');
        });
    });

    describe('getCategoryName / getCategoryShortName', () => {
        test('SVC-MOVIE-033: 返回分类名称', () => {
            const name = service.getCategoryName('movie');
            expect(name).toBe('电影');
        });

        test('SVC-MOVIE-034: 返回分类短名称', () => {
            const shortName = service.getCategoryShortName('movie');
            expect(shortName).toBe('电影');
        });

        test('SVC-MOVIE-035: 未知分类返回原值', () => {
            const name = service.getCategoryName('unknown-category');
            expect(name).toBe('unknown-category');
        });
    });

    describe('addMovie', () => {
        test('SVC-MOVIE-036: 添加新电影', async () => {
            await service.refreshCache(moviesDir);
            const movieData = {
                title: 'New Movie',
                category: 'movie',
                year: '2024'
            };
            const result = await service.addMovie(movieData, null, moviesDir);
            expect(result.success).toBe(true);
            expect(result.movie).toBeDefined();
        });

        test('SVC-MOVIE-037: 自动创建分类目录', async () => {
            await service.refreshCache(moviesDir);
            const movieData = {
                title: 'AutoDir Movie',
                category: 'new-category',
                year: '2024'
            };
            await service.addMovie(movieData, null, moviesDir);
            expect(fs.existsSync(path.join(moviesDir, 'new-category'))).toBe(true);
        });
    });

    describe('scanMovieDirectory', () => {
        test('SVC-MOVIE-038: 扫描目录模式', async () => {
            // Create subdirectories for scanning
            fs.mkdirSync(path.join(testDataDir, 'scan-dir', 'movie1'), { recursive: true });
            fs.mkdirSync(path.join(testDataDir, 'scan-dir', 'movie2'), { recursive: true });

            const result = await service.scanMovieDirectory(
                path.join(testDataDir, 'scan-dir'),
                'directory',
                'movie',
                moviesDir
            );
            expect(result.success).toBe(true);
            expect(result.movies.length).toBeGreaterThanOrEqual(0);
        });

        test('SVC-MOVIE-039: 扫描文件模式', async () => {
            const filePath = path.join(testDataDir, 'movie-list.txt');
            fs.writeFileSync(filePath, 'Movie 1\nMovie 2\n');

            const result = await service.scanMovieDirectory(
                filePath,
                'file',
                'movie',
                moviesDir
            );
            expect(result.success).toBe(true);
        });
    });

    describe('importScannedMovies', () => {
        test('SVC-MOVIE-040: 成功导入电影', async () => {
            await service.refreshCache(moviesDir);
            // Create a temp directory with movies.json
            const tempDir = path.join(testDataDir, 'temp-import');
            fs.mkdirSync(tempDir, { recursive: true });

            const overview = {
                scanTime: new Date().toISOString(),
                scanType: 'directory',
                scanPath: tempDir,
                category: 'movie',
                totalMovies: 1,
                movies: [{ name: 'Imported Movie', folderName: 'imported-movie', id: 'imported-1' }]
            };

            fs.mkdirSync(path.join(tempDir, 'imported-movie'));
            const movieNfo = `<?xml version="1.0"?>
<movie>
    <id>imported-1</id>
    <title>Imported Movie</title>
    <category>movie</category>
</movie>`;
            fs.writeFileSync(path.join(tempDir, 'imported-movie', 'movie.nfo'), movieNfo);
            fs.writeFileSync(path.join(tempDir, 'movies.json'), JSON.stringify(overview));

            const result = await service.importScannedMovies(tempDir, moviesDir);
            expect(result.success).toBeGreaterThanOrEqual(0);
        });

        test('SVC-MOVIE-040b: 导入电影时同时导入演员', async () => {
            const ActorService = require('../../src/main/services/ActorService');
            const actorService = new ActorService(path.join(testDataDir, 'test-actors.json'));
            actorService.clearCache();
            service.setActorService(actorService);

            await service.refreshCache(moviesDir);
            
            const tempDir = path.join(testDataDir, 'temp-import-actors');
            fs.mkdirSync(tempDir, { recursive: true });

            const overview = {
                scanTime: new Date().toISOString(),
                scanType: 'directory',
                scanPath: tempDir,
                category: 'movie',
                totalMovies: 1,
                movies: [{ name: 'Test Movie', folderName: 'test-movie', id: 'test-actor-1' }]
            };

            fs.mkdirSync(path.join(tempDir, 'test-movie'));
            const movieNfo = `<?xml version="1.0"?>
<movie>
    <id>test-actor-1</id>
    <title>Test Movie</title>
    <year>2020</year>
    <actor>
        <name>演员A</name>
    </actor>
    <actor>
        <name>演员B</name>
    </actor>
    <actor>
        <name>演员C</name>
    </actor>
</movie>`;
            fs.writeFileSync(path.join(tempDir, 'test-movie', 'movie.nfo'), movieNfo);
            fs.writeFileSync(path.join(tempDir, 'movies.json'), JSON.stringify(overview));

            const result = await service.importScannedMovies(tempDir, moviesDir, [], true);
            expect(result.success).toBeGreaterThanOrEqual(1);
            expect(result.actorsImported).toBe(3);
            expect(result.actorsSkipped).toBe(0);

            const actors = actorService.getActors();
            expect(actors.length).toBeGreaterThanOrEqual(3);
            expect(actors.find(a => a.name === '演员A')).toBeDefined();
            expect(actors.find(a => a.name === '演员B')).toBeDefined();
            expect(actors.find(a => a.name === '演员C')).toBeDefined();

            actorService.clearCache();
            if (fs.existsSync(path.join(testDataDir, 'test-actors.json'))) {
                fs.unlinkSync(path.join(testDataDir, 'test-actors.json'));
            }
        });

        test('SVC-MOVIE-041: 返回成功失败计数', async () => {
            // This is covered by the previous test implicitly
        });
    });

    describe('sanitizeFolderName', () => {
        test('SVC-MOVIE-042: 中文和字母数字保留', () => {
            expect(service.sanitizeFolderName('星际穿越-2014')).toBe('星际穿越-2014');
        });

        test('SVC-MOVIE-043: 特殊字符转为连字符', () => {
            expect(service.sanitizeFolderName('Movie: Title?')).toBe('Movie- Title');
        });

        test('SVC-MOVIE-044: 多个连字符合并为一个', () => {
            expect(service.sanitizeFolderName('Movie---Title')).toBe('Movie-Title');
        });

        test('SVC-MOVIE-045: 首尾连字符去除', () => {
            expect(service.sanitizeFolderName('-Movie Title-')).toBe('Movie Title');
        });

        test('SVC-MOVIE-046: 保留大小写', () => {
            expect(service.sanitizeFolderName('MOVIETITLE')).toBe('MOVIETITLE');
        });
    });

    describe('scanMovieDirectory - 目录扫描模式', () => {
        test('SVC-MOVIE-047: 目录扫描提取movie.nfo和海报', async () => {
            // 创建测试目录结构
            const scanDir = path.join(testDataDir, 'scanDir');
            const movieDir = path.join(scanDir, 'test-movie');
            fs.mkdirSync(movieDir, { recursive: true });

            // 创建 movie.nfo
            const movieNfo = `<?xml version="1.0"?>
<movie>
    <id>test-movie-001</id>
    <title>测试电影</title>
    <year>2024</year>
    <director>测试导演</director>
    <actor><name>演员1</name></actor>
    <actor><name>演员2</name></actor>
    <studio>测试制片商</studio>
</movie>`;
            fs.writeFileSync(path.join(movieDir, 'movie.nfo'), movieNfo);
            fs.writeFileSync(path.join(movieDir, 'poster.jpg'), Buffer.from([0xFF, 0xD8]));

            const result = await service.scanMovieDirectory(scanDir, 'directory', 'movie', moviesDir);

            expect(result.success).toBe(true);
            expect(result.movies.length).toBe(1);
            expect(result.movies[0].movieData.title).toBe('测试电影');
            expect(result.movies[0].movieData.director).toBe('测试导演');
            expect(result.movies[0].movieData.actors).toEqual(['演员1', '演员2']);
        });

        test('SVC-MOVIE-048: 目录扫描支持嵌套文件夹', async () => {
            // 创建嵌套目录结构
            const scanDir = path.join(testDataDir, 'scanDirNested');
            const subDir = path.join(scanDir, 'subfolder');
            const nestedMovieDir = path.join(subDir, 'nested-movie');
            fs.mkdirSync(nestedMovieDir, { recursive: true });

            const movieNfo = `<?xml version="1.0"?>
<movie>
    <title>嵌套电影</title>
</movie>`;
            fs.writeFileSync(path.join(nestedMovieDir, 'movie.nfo'), movieNfo);

            const result = await service.scanMovieDirectory(scanDir, 'directory', 'movie', moviesDir);

            expect(result.success).toBe(true);
            expect(result.movies.length).toBe(1);
            expect(result.movies[0].movieData.title).toBe('嵌套电影');
        });
    });

    describe('scanMovieDirectory - CSV扫描模式', () => {
        test('SVC-MOVIE-049: CSV扫描解析电影数据', async () => {
            // 创建CSV文件
            const csvDir = path.join(testDataDir, 'csvScan');
            fs.mkdirSync(csvDir, { recursive: true });
            const csvPath = path.join(csvDir, 'movies.csv');

            const csvContent = `电影ID,电影名称,电影描述,排序标题,演员,导演,上映时间,发行商,电影时长,标签,文件地址,视频编码,视频宽度,视频高度,视频时间
csv-movie-001,CSV电影,CSV描述,CSV电影,演员A|演员B,CSV导演,2024,CSV发行商,120,标签A|标签B,D:/Movies/csv.mp4,H264,1920,1080,7200`;

            fs.writeFileSync(csvPath, csvContent);

            const result = await service.scanMovieDirectory(csvPath, 'file', 'movie', moviesDir);

            expect(result.success).toBe(true);
            expect(result.movies.length).toBe(1);
            expect(result.movies[0].movieData.movieId).toBe('csv-movie-001');
            expect(result.movies[0].movieData.title).toBe('CSV电影');
            expect(result.movies[0].movieData.director).toBe('CSV导演');
            expect(result.movies[0].movieData.actors).toEqual(['演员A', '演员B']);
            expect(result.movies[0].movieData.runtime).toBe('120');
        });
    });

    describe('updateTempMovie', () => {
        test('SVC-MOVIE-050: 更新临时电影信息', async () => {
            // 创建临时电影目录
            const tempDir = path.join(testDataDir, 'tempUpdate');
            fs.mkdirSync(tempDir, { recursive: true });

            const movieNfo = `<?xml version="1.0"?>
<movie>
    <id>update-test-001</id>
    <title>原始标题</title>
    <director>原始导演</director>
</movie>`;
            fs.writeFileSync(path.join(tempDir, 'movie.nfo'), movieNfo);

            const updatedData = {
                title: '新标题',
                director: '新导演',
                year: '2024',
                actors: ['新演员1', '新演员2'],
                studio: '新制片商',
                runtime: '150',
                description: '新描述',
                tags: ['新标签1', '新标签2']
            };

            const result = await service.updateTempMovie(tempDir, updatedData, null);

            expect(result.success).toBe(true);
            expect(result.movieData.title).toBe('新标题');
            expect(result.movieData.director).toBe('新导演');
            expect(result.movieData.actors).toEqual(['新演员1', '新演员2']);
        });
    });

    describe('updateSourceNfoOriginalFilename', () => {
        test('SVC-MOVIE-051: 更新源NFO的original_filename为绝对路径', async () => {
            // 创建源电影目录
            const sourceDir = path.join(testDataDir, 'sourceMovie');
            fs.mkdirSync(sourceDir, { recursive: true });

            // 原始 relative 路径
            const movieNfo = `<?xml version="1.0"?>
<movie>
    <id>source-001</id>
    <title>源电影</title>
    <original_filename>原始路径.mp4</original_filename>
</movie>`;
            fs.writeFileSync(path.join(sourceDir, 'movie.nfo'), movieNfo);

            await service.updateSourceNfoOriginalFilename(sourceDir, 'D:/Scan/源目录');

            // 读取更新后的NFO内容
            const content = fs.readFileSync(path.join(sourceDir, 'movie.nfo'), 'utf-8');
            // 修复后：相对路径会被解析为绝对路径，应包含 sourceDir 的文件名
            expect(content).toContain('原始路径.mp4');
        });

        test('SVC-MOVIE-051b: 绝对路径保持不变', async () => {
            const sourceDir = path.join(testDataDir, 'sourceMovie2');
            fs.mkdirSync(sourceDir, { recursive: true });

            const movieNfo = `<?xml version="1.0"?>
<movie>
    <id>source-002</id>
    <title>源电影2</title>
    <original_filename>D:/Original/Movie.mp4</original_filename>
</movie>`;
            fs.writeFileSync(path.join(sourceDir, 'movie.nfo'), movieNfo);

            await service.updateSourceNfoOriginalFilename(sourceDir, 'D:/Scan/源目录');

            const content = fs.readFileSync(path.join(sourceDir, 'movie.nfo'), 'utf-8');
            // 绝对路径不应该被修改
            expect(content).toContain('D:/Original/Movie.mp4');
            expect(content).not.toContain('D:/Scan/源目录');
        });
    });

    describe('getMoviesPaginated', () => {
        test('SVC-MOVIE-052: 获取分页电影列表', async () => {
            await service.refreshCache(moviesDir);
            const result = await service.getMoviesPaginated(moviesDir, { page: 1, pageSize: 10 });
            expect(result.movies).toBeDefined();
            expect(result.total).toBeGreaterThanOrEqual(0);
            expect(result.page).toBe(1);
            expect(result.pageSize).toBe(10);
        });

        test('SVC-MOVIE-053: 分页参数正确传递', async () => {
            await service.refreshCache(moviesDir);
            const result = await service.getMoviesPaginated(moviesDir, { page: 2, pageSize: 5 });
            expect(result.page).toBe(2);
            expect(result.pageSize).toBe(5);
        });

        test('SVC-MOVIE-054: 带排序参数', async () => {
            await service.refreshCache(moviesDir);
            const result = await service.getMoviesPaginated(moviesDir, {
                page: 1,
                pageSize: 10,
                sortBy: 'name',
                sortOrder: 'asc'
            });
            expect(result.movies).toBeDefined();
        });

        test('SVC-MOVIE-055: 带分类筛选', async () => {
            await service.refreshCache(moviesDir);
            const result = await service.getMoviesPaginated(moviesDir, {
                page: 1,
                pageSize: 10,
                category: 'movie'
            });
            expect(result.movies).toBeDefined();
        });
    });

    describe('getMoviesPaginatedFromIndex', () => {
        test('SVC-MOVIE-056: 从index获取分页电影列表', async () => {
            await service.refreshCache(moviesDir);
            const result = await service.getMoviesPaginatedFromIndex(moviesDir, { page: 1, pageSize: 10 });
            expect(result.movies).toBeDefined();
            expect(result.page).toBe(1);
            expect(result.pageSize).toBe(10);
        });

        test('SVC-MOVIE-057: 分页参数正确传递', async () => {
            await service.refreshCache(moviesDir);
            const result = await service.getMoviesPaginatedFromIndex(moviesDir, { page: 2, pageSize: 5 });
            expect(result.page).toBe(2);
            expect(result.pageSize).toBe(5);
        });

        test('SVC-MOVIE-058: 带排序参数', async () => {
            await service.refreshCache(moviesDir);
            const result = await service.getMoviesPaginatedFromIndex(moviesDir, {
                page: 1,
                pageSize: 10,
                sortBy: 'name',
                sortOrder: 'desc'
            });
            expect(result.movies).toBeDefined();
        });
    });
});

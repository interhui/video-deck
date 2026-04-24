/**
 * IndexService 单元测试
 */
const IndexService = require('../../src/main/services/IndexService');
const FileService = require('../../src/main/services/FileService');
const path = require('path');
const fs = require('fs');

describe('IndexService', () => {
    let service;
    let fileService;
    let testDataDir;
    let moviesDir;

    beforeEach(() => {
        service = new IndexService();
        fileService = new FileService();
        testDataDir = path.join(__dirname, 'test-data', 'index');
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
    });

    afterEach(() => {
        if (fs.existsSync(testDataDir)) {
            fs.rmSync(testDataDir, { recursive: true, force: true });
        }
    });

    describe('constructor', () => {
        test('SVC-INDEX-001: 创建实例', () => {
            expect(service).toBeDefined();
            expect(service.fileService).toBeInstanceOf(FileService);
        });
    });

    describe('getIndexPath', () => {
        test('SVC-INDEX-002: 返回正确索引路径', () => {
            const result = service.getIndexPath('movie', moviesDir);
            expect(result).toBe(path.join(moviesDir, 'movie', 'index.json'));
        });
    });

    describe('extractIndexMovieData', () => {
        test('SVC-INDEX-003: 提取正确索引字段', () => {
            const movie = {
                id: 'test-id',
                title: 'Test Title',
                name: 'Test Name',
                description: 'Test Desc',
                year: '2024',
                outline: 'Test Outline',
                director: 'Director',
                actors: ['Actor 1'],
                studio: 'Studio',
                userRating: 5,
                tag: ['action'],
                tags: ['action'],
                fileset: ['file1', 'file2']
            };
            const result = service.extractIndexMovieData(movie);
            expect(result.id).toBe('test-id');
            expect(result.title).toBe('Test Title');
            expect(result.actors).toEqual(['Actor 1']);
            expect(result.fileCount).toBe(2);
        });

        test('SVC-INDEX-003a: 包含basePath字段', () => {
            const basePath = 'D:\\movies\\movie\\test-movie';
            const movie = {
                id: 'test-id',
                title: 'Test Title',
                path: basePath
            };
            const result = service.extractIndexMovieData(movie, null, basePath);
            expect(result.basePath).toBe(basePath);
        });

        test('SVC-INDEX-003b: basePath从movie.path获取', () => {
            const basePath = 'D:\\movies\\movie\\test-movie';
            const movie = {
                id: 'test-id',
                title: 'Test Title',
                path: basePath
            };
            const result = service.extractIndexMovieData(movie);
            expect(result.basePath).toBe(basePath);
        });

        test('SVC-INDEX-004: 处理缺失字段', () => {
            const movie = { id: 'test-id' };
            const result = service.extractIndexMovieData(movie);
            expect(result.name).toBe('');
            expect(result.description).toBe('');
            expect(result.actors).toEqual([]);
            expect(result.basePath).toBeNull();
        });
    });

    describe('buildCategoryIndex', () => {
        test('SVC-INDEX-005: 构建索引成功', async () => {
            const result = await service.buildCategoryIndex('movie', moviesDir);
            expect(result.success).toBe(true);
            expect(result.category).toBe('movie');
            expect(fs.existsSync(path.join(moviesDir, 'movie', 'index.json'))).toBe(true);
        });

        test('SVC-INDEX-006: 返回正确统计', async () => {
            const result = await service.buildCategoryIndex('movie', moviesDir);
            expect(result.movieCount).toBe(1);
        });

        test('SVC-INDEX-006a: index.json包含basePath', async () => {
            await service.buildCategoryIndex('movie', moviesDir);
            const movies = await service.getMoviesFromIndex('movie', moviesDir);
            expect(movies[0].basePath).toBeDefined();
            expect(movies[0].basePath).toContain('test-movie');
        });
    });

    describe('rebuildAllIndexes', () => {
        test('SVC-INDEX-007: 重建所有分类索引', async () => {
            const result = await service.rebuildAllIndexes(moviesDir);
            expect(result.success).toBe(true);
            expect(result.results.length).toBeGreaterThanOrEqual(2);
        });
    });

    describe('getMoviesFromIndex', () => {
        test('SVC-INDEX-008: 返回电影列表', async () => {
            await service.buildCategoryIndex('movie', moviesDir);
            const movies = await service.getMoviesFromIndex('movie', moviesDir);
            expect(movies.length).toBeGreaterThanOrEqual(1);
        });

        test('SVC-INDEX-009: 不存在返回空数组', async () => {
            const movies = await service.getMoviesFromIndex('nonexistent', moviesDir);
            expect(movies).toEqual([]);
        });

        test('SVC-INDEX-010: 损坏index返回空', async () => {
            fs.writeFileSync(path.join(moviesDir, 'movie', 'index.json'), 'bad json');
            const movies = await service.getMoviesFromIndex('movie', moviesDir);
            expect(movies).toEqual([]);
        });
    });

    describe('updateMovieIndex', () => {
        test('SVC-INDEX-011: 更新电影数据', async () => {
            await service.buildCategoryIndex('movie', moviesDir);
            const movie = {
                id: 'movie-1',
                title: 'Updated Title',
                year: '2024'
            };
            const result = await service.updateMovieIndex(movie, 'movie', moviesDir);
            expect(result.success).toBe(true);
        });

        test('SVC-INDEX-012: 新电影添加到索引', async () => {
            await service.buildCategoryIndex('movie', moviesDir);
            const movie = {
                id: 'new-movie',
                title: 'New Movie',
                year: '2024'
            };
            const result = await service.updateMovieIndex(movie, 'movie', moviesDir);
            expect(result.success).toBe(true);
        });
    });

    describe('deleteMovieFromIndex', () => {
        test('SVC-INDEX-013: 删除电影成功', async () => {
            await service.buildCategoryIndex('movie', moviesDir);
            const result = await service.deleteMovieFromIndex('movie-1', 'movie', moviesDir);
            expect(result.success).toBe(true);
        });

        test('SVC-INDEX-014: 不存在返回成功', async () => {
            await service.buildCategoryIndex('movie', moviesDir);
            const result = await service.deleteMovieFromIndex('nonexistent', 'movie', moviesDir);
            expect(result.success).toBe(true);
        });
    });

    describe('indexExists', () => {
        test('SVC-INDEX-015: 存在返回true', async () => {
            await service.buildCategoryIndex('movie', moviesDir);
            const exists = await service.indexExists('movie', moviesDir);
            expect(exists).toBe(true);
        });

        test('SVC-INDEX-016: 不存在返回false', async () => {
            const exists = await service.indexExists('nonexistent', moviesDir);
            expect(exists).toBe(false);
        });
    });

    describe('checkIndexesExist', () => {
        test('SVC-INDEX-017: 全部存在allExist为true', async () => {
            await service.rebuildAllIndexes(moviesDir);
            const result = await service.checkIndexesExist(moviesDir);
            expect(result.allExist).toBe(true);
            expect(result.missingCategories).toEqual([]);
        });

        test('SVC-INDEX-018: 缺少返回false+缺失列表', async () => {
            // Don't build any indexes
            const result = await service.checkIndexesExist(moviesDir);
            expect(result.allExist).toBe(false);
            expect(result.missingCategories.length).toBeGreaterThan(0);
        });
    });

    describe('getAllCategoriesIndexMovies', () => {
        test('SVC-INDEX-019: 返回所有分类电影', async () => {
            await service.rebuildAllIndexes(moviesDir);
            const result = await service.getAllCategoriesIndexMovies(moviesDir);
            expect(result.movie).toBeDefined();
        });

        test('SVC-INDEX-020: 每电影含category字段', async () => {
            await service.rebuildAllIndexes(moviesDir);
            const result = await service.getAllCategoriesIndexMovies(moviesDir);
            if (result.movie && result.movie.length > 0) {
                expect(result.movie[0].category).toBe('movie');
            }
        });
    });
});

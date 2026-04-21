/**
 * DatabaseService 单元测试
 */
const DatabaseService = require('../../src/main/services/DatabaseService');
const path = require('path');
const fs = require('fs');

describe('DatabaseService', () => {
    let service;
    let testDataDir;
    let dbPath;

    beforeEach(() => {
        testDataDir = path.join(__dirname, 'test-data', 'database');
        if (!fs.existsSync(testDataDir)) {
            fs.mkdirSync(testDataDir, { recursive: true });
        }
        dbPath = path.join(testDataDir, 'test.db');
        service = new DatabaseService(dbPath);
    });

    afterEach(() => {
        service.close();
        if (fs.existsSync(testDataDir)) {
            fs.rmSync(testDataDir, { recursive: true, force: true });
        }
    });

    describe('constructor', () => {
        test('SVC-DB-001: 创建实例初始化数据', () => {
            expect(service).toBeDefined();
            expect(service.data).toBeDefined();
            expect(service.data.movies).toEqual([]);
            expect(service.data.tags).toEqual([]);
        });
    });

    describe('getDatabase', () => {
        test('SVC-DB-002: 返回自身', () => {
            expect(service.getDatabase()).toBe(service);
        });
    });

    describe('saveMovieState', () => {
        test('SVC-DB-003: 保存状态成功', () => {
            service.data.movies = [{ id: 'movie-1', status: 'unwatched' }];
            service.saveMovieState('movie-1', { status: 'watching', playTime: 30 });
            expect(service.data.movies[0].status).toBe('watching');
        });

        test('SVC-DB-004: 累加播放时间', () => {
            service.data.movies = [{ id: 'movie-1', totalPlayTime: 10 }];
            service.saveMovieState('movie-1', { status: 'watching', playTime: 30 });
            expect(service.data.movies[0].totalPlayTime).toBe(40);
        });

        test('SVC-DB-005: 播放次数累加', () => {
            service.data.movies = [{ id: 'movie-1', playCount: 1 }];
            service.saveMovieState('movie-1', { status: 'watching', playTime: 30 });
            expect(service.data.movies[0].playCount).toBe(2);
        });
    });

    describe('getMovieState', () => {
        test('SVC-DB-006: 返回完整状态', () => {
            service.data.movies = [{
                id: 'movie-1',
                status: 'watching',
                playCount: 5,
                totalPlayTime: 120,
                lastPlayed: '2024-01-01',
                firstPlayed: '2024-01-01'
            }];
            const state = service.getMovieState('movie-1');
            expect(state.status).toBe('watching');
            expect(state.playCount).toBe(5);
            expect(state.totalPlayTime).toBe(120);
        });

        test('SVC-DB-007: 不存在返回null', () => {
            const state = service.getMovieState('not-exists');
            expect(state).toBeNull();
        });
    });

    describe('getMovieStats', () => {
        test('SVC-DB-008: 返回全局统计', () => {
            service.data.movies = [
                { id: '1', status: 'completed', userRating: 5 },
                { id: '2', status: 'watching', userRating: 3 },
                { id: '3', status: 'unwatched', userRating: 0 }
            ];
            const stats = service.getMovieStats();
            expect(stats.totalMovies).toBe(3);
            expect(stats.playedMovies).toBe(1);
            expect(stats.playingMovies).toBe(1);
            expect(stats.unwatchedMovies).toBe(1);
        });

        test('SVC-DB-009: 支持分类筛选', () => {
            service.data.movies = [
                { id: '1', category: 'movie', status: 'completed' },
                { id: '2', category: 'tv', status: 'completed' }
            ];
            const stats = service.getMovieStats('movie');
            expect(stats.totalMovies).toBe(1);
        });
    });

    describe('updatePlayTime', () => {
        test('SVC-DB-012: 更新播放时间', () => {
            // Reset the data first to avoid state pollution from previous tests
            service.data.movies = [{ id: 'movie-1', totalPlayTime: 10, playCount: 0 }];
            service.updatePlayTime('movie-1', 45);
            expect(service.data.movies[0].totalPlayTime).toBe(55); // 10 + 45
            expect(service.data.movies[0].playCount).toBe(1);
        });
    });

    describe('saveUserRating', () => {
        test('SVC-DB-013: 保存评分', () => {
            service.data.movies = [{ id: 'movie-1' }];
            service.saveUserRating('movie-1', 5, 'Great movie!');
            expect(service.data.movies[0].userRating).toBe(5);
            expect(service.data.movies[0].userComment).toBe('Great movie!');
        });

        test('SVC-DB-014: 保存评论', () => {
            service.data.movies = [{ id: 'movie-1' }];
            service.saveUserRating('movie-1', 4, 'Nice');
            expect(service.data.movies[0].userComment).toBe('Nice');
        });
    });

    describe('getTags', () => {
        test('SVC-DB-017: 返回排序标签', () => {
            service.data.tags = [
                { id: 'z-tag', name: 'Zebra' },
                { id: 'a-tag', name: 'Alpha' }
            ];
            const tags = service.getTags();
            expect(tags[0].name).toBe('Alpha');
            expect(tags[1].name).toBe('Zebra');
        });
    });

    describe('addTagsToMovie', () => {
        test('SVC-DB-018: 添加标签成功', () => {
            service.data.movie_tags = [];
            service.addTagsToMovie('movie-1', ['tag-1', 'tag-2']);
            expect(service.data.movie_tags).toHaveLength(2);
        });

        test('SVC-DB-019: 重复标签不添加', () => {
            service.data.movie_tags = [{ movie_id: 'movie-1', tag_id: 'tag-1' }];
            service.addTagsToMovie('movie-1', ['tag-1', 'tag-2']);
            expect(service.data.movie_tags).toHaveLength(2);
        });
    });

    describe('removeTagsFromMovie', () => {
        test('SVC-DB-020: 移除标签成功', () => {
            service.data.movie_tags = [
                { movie_id: 'movie-1', tag_id: 'tag-1' },
                { movie_id: 'movie-1', tag_id: 'tag-2' }
            ];
            service.removeTagsFromMovie('movie-1', ['tag-1']);
            expect(service.data.movie_tags).toHaveLength(1);
            expect(service.data.movie_tags[0].tag_id).toBe('tag-2');
        });
    });

    describe('getMovieTags', () => {
        test('SVC-DB-021: 返回电影标签', () => {
            service.data.tags = [
                { id: 'tag-1', name: 'Action' },
                { id: 'tag-2', name: 'Drama' }
            ];
            service.data.movie_tags = [
                { movie_id: 'movie-1', tag_id: 'tag-1' },
                { movie_id: 'movie-1', tag_id: 'tag-2' }
            ];
            const tags = service.getMovieTags('movie-1');
            expect(tags).toHaveLength(2);
        });
    });

    describe('upsertMovie', () => {
        test('SVC-DB-022: 新电影插入', () => {
            service.upsertMovie({ id: 'new-movie', title: 'New Movie' });
            expect(service.data.movies).toHaveLength(1);
            expect(service.data.movies[0].id).toBe('new-movie');
        });

        test('SVC-DB-023: 现有电影更新', () => {
            service.data.movies = [{ id: 'movie-1', title: 'Old Title' }];
            service.upsertMovie({ id: 'movie-1', title: 'New Title' });
            expect(service.data.movies[0].title).toBe('New Title');
        });
    });

    describe('searchMovies', () => {
        beforeEach(() => {
            service.data.movies = [
                { id: '1', name: 'Action Movie', category: 'movie', status: 'completed', userRating: 5, tags: ['action'] },
                { id: '2', name: 'Drama Movie', category: 'movie', status: 'watching', userRating: 3, tags: ['drama'] },
                { id: '3', name: 'TV Show', category: 'tv', status: 'unwatched', userRating: 4, tags: ['drama'] }
            ];
            service.data.movie_tags = [
                { movie_id: '1', tag_id: 'action' },
                { movie_id: '2', tag_id: 'drama' },
                { movie_id: '3', tag_id: 'drama' }
            ];
            service.data.tags = [
                { id: 'action', name: '动作' },
                { id: 'drama', name: '剧情' }
            ];
        });

        test('SVC-DB-025: 关键字搜索', () => {
            const results = service.searchMovies('Action');
            expect(results).toHaveLength(1);
            expect(results[0].name).toBe('Action Movie');
        });

        test('SVC-DB-026: 分类筛选', () => {
            const results = service.searchMovies('', { category: 'tv' });
            expect(results).toHaveLength(1);
            expect(results[0].category).toBe('tv');
        });

        test('SVC-DB-027: 状态筛选', () => {
            const results = service.searchMovies('', { status: 'completed' });
            expect(results).toHaveLength(1);
            expect(results[0].status).toBe('completed');
        });

        test('SVC-DB-028: 标签筛选', () => {
            const results = service.searchMovies('', { tagId: 'drama' });
            expect(results.length).toBe(2);
        });

        test('SVC-DB-029: 评分筛选', () => {
            const results = service.searchMovies('', { rating: '5' });
            expect(results).toHaveLength(1);
            expect(results[0].userRating).toBe(5);
        });

        test('SVC-DB-031: 排序功能', () => {
            const results = service.searchMovies('', { sort: 'name-asc' });
            expect(results[0].name).toBe('Action Movie');
        });
    });

    describe('deleteMovies', () => {
        test('SVC-DB-032: 删除电影及关联', () => {
            service.data.movies = [{ id: 'movie-1' }, { id: 'movie-2' }];
            service.data.movie_tags = [
                { movie_id: 'movie-1', tag_id: 'tag-1' },
                { movie_id: 'movie-2', tag_id: 'tag-2' }
            ];
            service.deleteMovies(['movie-1']);
            expect(service.data.movies).toHaveLength(1);
            expect(service.data.movie_tags).toHaveLength(1);
        });
    });

    describe('close', () => {
        test('SVC-DB-033: 保存并关闭', () => {
            service.data.movies = [{ id: 'test' }];
            service.close();
            expect(fs.existsSync(dbPath)).toBe(true);
        });
    });
});

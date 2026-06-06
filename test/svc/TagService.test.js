/**
 * TagService 单元测试
 */
const TagService = require('../../src/main/services/TagService');
const path = require('path');
const fs = require('fs');

describe('TagService', () => {
    let service;
    let testDataDir;

    beforeEach(() => {
        testDataDir = path.join(__dirname, 'test-data', 'tags');
        if (!fs.existsSync(testDataDir)) {
            fs.mkdirSync(testDataDir, { recursive: true });
        }
        service = new TagService(path.join(testDataDir, 'tags.json'));
        service.clearCache();
    });

    afterEach(() => {
        service.clearCache();
        if (fs.existsSync(testDataDir)) {
            fs.rmSync(testDataDir, { recursive: true, force: true });
        }
    });

    describe('constructor', () => {
        test('SVC-TAG-001: 创建TagService实例', () => {
            expect(service).toBeDefined();
            expect(service.tagsCache).toBeNull();
        });
    });

    describe('loadTags (异步)', () => {
        test('SVC-TAG-002: 有缓存直接返回', async () => {
            service.tagsCache = [{ id: 'cached', name: 'Cached' }];
            const result = await service.loadTags();
            expect(result).toEqual([{ id: 'cached', name: 'Cached' }]);
        });

        test('SVC-TAG-003: 无缓存有文件读取并缓存', async () => {
            const tags = [{ id: 'action', name: '动作' }];
            fs.writeFileSync(path.join(testDataDir, 'tags.json'), JSON.stringify(tags));

            const result = await service.loadTags();
            expect(result).toEqual(tags);
            expect(service.tagsCache).toEqual(tags);
        });

        test('SVC-TAG-004: 无缓存无文件用默认保存', async () => {
            const result = await service.loadTags();
            expect(result).toHaveLength(5);
            expect(fs.existsSync(path.join(testDataDir, 'tags.json'))).toBe(true);
        });
    });

    describe('getTags (同步)', () => {
        test('SVC-TAG-005: 无缓存无文件返回默认', () => {
            const tags = service.getTags();
            expect(tags).toHaveLength(5);
        });

        test('SVC-TAG-006: 有缓存直接返回', () => {
            service.tagsCache = [{ id: 'test', name: 'Test' }];
            const tags = service.getTags();
            expect(tags).toEqual([{ id: 'test', name: 'Test' }]);
        });
    });

    describe('getTagNameById', () => {
        test('SVC-TAG-007: 正确返回标签名', () => {
            service.tagsCache = [{ id: 'action', name: '动作' }, { id: 'rpg', name: '角色扮演' }];
            expect(service.getTagNameById('action')).toBe('动作');
        });

        test('SVC-TAG-008: ID不存在返回null', () => {
            service.tagsCache = [{ id: 'action', name: '动作' }];
            expect(service.getTagNameById('unknown')).toBeNull();
        });

        test('SVC-TAG-009: 空数组返回null', () => {
            service.tagsCache = [];
            expect(service.getTagNameById('anything')).toBeNull();
        });
    });

    describe('getTagNamesByIds', () => {
        test('SVC-TAG-010: 返回标签名数组', () => {
            service.tagsCache = [{ id: 'action', name: '动作' }, { id: 'rpg', name: '角色扮演' }];
            const result = service.getTagNamesByIds(['action', 'rpg']);
            expect(result).toEqual(['动作', '角色扮演']);
        });

        test('SVC-TAG-011: 空数组返回空数组', () => {
            service.tagsCache = [{ id: 'action', name: '动作' }];
            expect(service.getTagNamesByIds([])).toEqual([]);
        });

        test('SVC-TAG-012: null/undefined返回空数组', () => {
            service.tagsCache = [{ id: 'action', name: '动作' }];
            expect(service.getTagNamesByIds(null)).toEqual([]);
            expect(service.getTagNamesByIds(undefined)).toEqual([]);
        });

        test('SVC-TAG-013: 部分ID存在只返回存在的', () => {
            service.tagsCache = [{ id: 'action', name: '动作' }];
            const result = service.getTagNamesByIds(['action', 'unknown']);
            expect(result).toEqual(['动作']);
        });
    });

    describe('saveTags', () => {
        test('SVC-TAG-014: 保存并更新缓存', async () => {
            const newTags = [{ id: 'new', name: 'New Tag' }];
            await service.saveTags(newTags);
            expect(service.tagsCache).toEqual(newTags);
            const content = JSON.parse(fs.readFileSync(path.join(testDataDir, 'tags.json'), 'utf-8'));
            expect(content).toEqual(newTags);
        });
    });

    describe('clearCache', () => {
        test('SVC-TAG-017: 清除缓存', () => {
            service.tagsCache = [{ id: 'test', name: 'Test' }];
            service.clearCache();
            expect(service.tagsCache).toBeNull();
        });
    });

    describe('extractAndCompareTags', () => {
        test('SVC-TAG-018: 从电影数据中提取并比对标签', () => {
            service.tagsCache = [{ id: 'action', name: '动作' }];
            
            const allIndexMovies = {
                'movie': [
                    { id: 'm1', name: 'Movie1', tags: ['科幻', '剧情'] },
                    { id: 'm2', name: 'Movie2', tags: ['科幻', '爱情'] },
                    { id: 'm3', name: 'Movie3', tags: ['剧情', '科幻'] },
                    { id: 'm4', name: 'Movie4', tags: ['喜剧'] }
                ]
            };
            
            const result = service.extractAndCompareTags(allIndexMovies);
            
            expect(result).toHaveLength(2);
            expect(result.find(t => t.name === '科幻')).toBeDefined();
            expect(result.find(t => t.name === '科幻').count).toBe(3);
            expect(result.find(t => t.name === '剧情')).toBeDefined();
            expect(result.find(t => t.name === '剧情').count).toBe(2);
            expect(result.find(t => t.name === '喜剧')).toBeUndefined();
            expect(result.find(t => t.name === '爱情')).toBeUndefined();
        });

        test('SVC-TAG-019: 空电影数据返回空数组', () => {
            service.tagsCache = [];
            const result = service.extractAndCompareTags({});
            expect(result).toEqual([]);
        });

        test('SVC-TAG-020: 标签使用次数<=1不返回', () => {
            service.tagsCache = [];
            
            const allIndexMovies = {
                'movie': [
                    { id: 'm1', name: 'Movie1', tags: ['科幻'] },
                    { id: 'm2', name: 'Movie2', tags: ['剧情'] }
                ]
            };
            
            const result = service.extractAndCompareTags(allIndexMovies);
            expect(result).toEqual([]);
        });

        test('SVC-TAG-021: 已管理的标签不返回', () => {
            service.tagsCache = [{ id: '科幻', name: '科幻' }];
            
            const allIndexMovies = {
                'movie': [
                    { id: 'm1', name: 'Movie1', tags: ['科幻'] },
                    { id: 'm2', name: 'Movie2', tags: ['科幻'] }
                ]
            };
            
            const result = service.extractAndCompareTags(allIndexMovies);
            expect(result).toEqual([]);
        });

        test('SVC-TAG-022: 按使用次数降序排列', () => {
            service.tagsCache = [];
            
            const allIndexMovies = {
                'movie': [
                    { id: 'm1', name: 'Movie1', tags: ['科幻', '剧情'] },
                    { id: 'm2', name: 'Movie2', tags: ['科幻', '爱情'] },
                    { id: 'm3', name: 'Movie3', tags: ['剧情'] },
                    { id: 'm4', name: 'Movie4', tags: ['爱情'] }
                ]
            };
            
            const result = service.extractAndCompareTags(allIndexMovies);
            expect(result[0].name).toBe('科幻');
            expect(result[0].count).toBe(2);
            expect(result[1].name).toBe('剧情');
            expect(result[1].count).toBe(2);
            expect(result[2].name).toBe('爱情');
            expect(result[2].count).toBe(2);
        });
    });

    describe('batchAddTags', () => {
        test('SVC-TAG-023: 批量添加新标签', async () => {
            service.tagsCache = [{ id: 'action', name: '动作' }];
            
            const tagsToAdd = [
                { id: 'scifi', name: '科幻' },
                { id: 'drama', name: '剧情' }
            ];
            
            const result = await service.batchAddTags(tagsToAdd);
            
            expect(result.success).toBe(true);
            expect(result.addedCount).toBe(2);
            
            const tags = await service.loadTags();
            expect(tags).toHaveLength(3);
            expect(tags.find(t => t.id === 'scifi')).toBeDefined();
            expect(tags.find(t => t.id === 'drama')).toBeDefined();
        });

        test('SVC-TAG-024: 添加已存在的标签不重复', async () => {
            service.tagsCache = [{ id: 'action', name: '动作' }];
            
            const tagsToAdd = [
                { id: 'action', name: '动作' },
                { id: 'drama', name: '剧情' }
            ];
            
            const result = await service.batchAddTags(tagsToAdd);
            
            expect(result.success).toBe(true);
            expect(result.addedCount).toBe(1);
            
            const tags = await service.loadTags();
            expect(tags).toHaveLength(2);
        });

        test('SVC-TAG-025: 空数组添加返回成功但计数为0', async () => {
            service.tagsCache = [];
            
            const result = await service.batchAddTags([]);
            
            expect(result.success).toBe(true);
            expect(result.addedCount).toBe(0);
        });
    });

    describe('getMoviesByTagId', () => {
        test('SVC-TAG-026: 根据标签ID获取电影列表', () => {
            service.tagsCache = [{ id: '科幻', name: '科幻' }];
            
            const allIndexMovies = {
                'movie': [
                    { id: 'm1', name: 'Movie1', title: 'Movie1', tags: ['科幻', '剧情'], actors: ['Actor1'], description: 'Desc1', publishDate: '2020', studio: 'Studio1', director: 'Director1' },
                    { id: 'm2', name: 'Movie2', title: 'Movie2', tags: ['剧情'] },
                    { id: 'm3', name: 'Movie3', title: 'Movie3', tags: ['科幻'], actors: ['Actor2'], description: 'Desc3', year: '2021', studio: 'Studio3', director: 'Director3' }
                ],
                'anime': [
                    { id: 'a1', name: 'Anime1', title: 'Anime1', tags: ['科幻'] }
                ]
            };
            
            const movies = service.getMoviesByTagId(allIndexMovies, '科幻');
            
            expect(movies).toHaveLength(3);
            expect(movies.find(m => m.id === 'm1')).toBeDefined();
            expect(movies.find(m => m.id === 'm1').category).toBe('movie');
            expect(movies.find(m => m.id === 'm3')).toBeDefined();
            expect(movies.find(m => m.id === 'a1')).toBeDefined();
            expect(movies.find(m => m.id === 'a1').category).toBe('anime');
        });

        test('SVC-TAG-027: 标签不存在返回空数组', () => {
            const allIndexMovies = {
                'movie': [
                    { id: 'm1', name: 'Movie1', tags: ['科幻'] }
                ]
            };
            
            const movies = service.getMoviesByTagId(allIndexMovies, '不存在');
            expect(movies).toEqual([]);
        });

        test('SVC-TAG-028: 电影无标签字段返回空数组', () => {
            const allIndexMovies = {
                'movie': [
                    { id: 'm1', name: 'Movie1' }
                ]
            };
            
            const movies = service.getMoviesByTagId(allIndexMovies, '科幻');
            expect(movies).toEqual([]);
        });

        test('SVC-TAG-029: 返回的电影包含完整字段', () => {
            const allIndexMovies = {
                'movie': [
                    { id: 'm1', name: 'Movie1', title: 'Movie One', tags: ['科幻'], actors: ['Actor1', 'Actor2'], description: 'A great movie', outline: 'Short desc', publishDate: '2020', year: '2020', studio: 'Studio A', director: 'Director X', poster: 'poster.jpg' }
                ]
            };
            
            const movies = service.getMoviesByTagId(allIndexMovies, '科幻');
            
            expect(movies).toHaveLength(1);
            expect(movies[0].id).toBe('m1');
            expect(movies[0].name).toBe('Movie1');
            expect(movies[0].title).toBe('Movie One');
            expect(movies[0].actors).toEqual(['Actor1', 'Actor2']);
            expect(movies[0].description).toBe('A great movie');
            expect(movies[0].publishDate).toBe('2020');
            expect(movies[0].year).toBe('2020');
            expect(movies[0].studio).toBe('Studio A');
            expect(movies[0].director).toBe('Director X');
            expect(movies[0].poster).toBe('poster.jpg');
            expect(movies[0].category).toBe('movie');
        });
    });

    describe('searchTags', () => {
        test('SVC-TAG-030: 无关键字返回全部标签', () => {
            service.tagsCache = [
                { id: 'action', name: '动作' },
                { id: 'scifi', name: '科幻' },
                { id: 'drama', name: '剧情' }
            ];
            
            const result = service.searchTags('');
            expect(result).toHaveLength(3);
            expect(result).toEqual(service.tagsCache);
        });

        test('SVC-TAG-031: 关键字匹配标签ID', () => {
            service.tagsCache = [
                { id: 'action', name: '动作' },
                { id: 'scifi', name: '科幻' },
                { id: 'drama', name: '剧情' }
            ];
            
            const result = service.searchTags('act');
            expect(result).toHaveLength(1);
            expect(result[0].id).toBe('action');
        });

        test('SVC-TAG-032: 关键字匹配标签名称', () => {
            service.tagsCache = [
                { id: 'action', name: '动作' },
                { id: 'scifi', name: '科幻' },
                { id: 'drama', name: '剧情' }
            ];
            
            const result = service.searchTags('科');
            expect(result).toHaveLength(1);
            expect(result[0].name).toBe('科幻');
        });

        test('SVC-TAG-033: 关键字匹配多个标签', () => {
            service.tagsCache = [
                { id: 'action', name: '动作' },
                { id: 'scifi', name: '科幻电影' },
                { id: 'drama', name: '剧情电影' }
            ];
            
            const result = service.searchTags('电影');
            expect(result).toHaveLength(2);
            expect(result.find(t => t.id === 'scifi')).toBeDefined();
            expect(result.find(t => t.id === 'drama')).toBeDefined();
        });

        test('SVC-TAG-034: 关键字不匹配返回空数组', () => {
            service.tagsCache = [
                { id: 'action', name: '动作' },
                { id: 'scifi', name: '科幻' }
            ];
            
            const result = service.searchTags('xyz');
            expect(result).toEqual([]);
        });

        test('SVC-TAG-035: 关键字大小写不敏感', () => {
            service.tagsCache = [
                { id: 'Action', name: '动作' },
                { id: 'SciFi', name: '科幻' }
            ];
            
            const result = service.searchTags('ACTION');
            expect(result).toHaveLength(1);
            expect(result[0].id).toBe('Action');
        });

        test('SVC-TAG-036: null关键字返回全部标签', () => {
            service.tagsCache = [
                { id: 'action', name: '动作' },
                { id: 'scifi', name: '科幻' }
            ];
            
            const result = service.searchTags(null);
            expect(result).toHaveLength(2);
        });

        test('SVC-TAG-037: 标签无ID或name字段时过滤', () => {
            service.tagsCache = [
                { id: 'action', name: '动作' },
                { id: null, name: '科幻' },
                { id: 'drama', name: null }
            ];
            
            const result = service.searchTags('科幻');
            expect(result).toHaveLength(1);
            expect(result[0].name).toBe('科幻');
        });
    });

    describe('getTagMovieCountMap', () => {
        test('SVC-TAG-038: 返回标签及其关联电影数量', () => {
            service.tagsCache = [
                { id: 'action', name: '动作' },
                { id: 'scifi', name: '科幻' },
                { id: 'drama', name: '剧情' }
            ];

            const allIndexMovies = {
                'movie': [
                    { id: 'm1', name: 'Movie1', tags: ['action', 'scifi'] },
                    { id: 'm2', name: 'Movie2', tags: ['action'] },
                    { id: 'm3', name: 'Movie3', tags: ['scifi', 'drama'] }
                ]
            };

            const result = service.getTagMovieCountMap(allIndexMovies);

            expect(result).toHaveLength(3);
            expect(result.find(t => t.id === 'action')).toEqual({ id: 'action', name: '动作', movieCount: 2 });
            expect(result.find(t => t.id === 'scifi')).toEqual({ id: 'scifi', name: '科幻', movieCount: 2 });
            expect(result.find(t => t.id === 'drama')).toEqual({ id: 'drama', name: '剧情', movieCount: 1 });
        });

        test('SVC-TAG-039: 按电影数量降序排列', () => {
            service.tagsCache = [
                { id: 'action', name: '动作' },
                { id: 'scifi', name: '科幻' },
                { id: 'drama', name: '剧情' }
            ];

            const allIndexMovies = {
                'movie': [
                    { id: 'm1', name: 'Movie1', tags: ['action'] },
                    { id: 'm2', name: 'Movie2', tags: ['action'] },
                    { id: 'm3', name: 'Movie3', tags: ['action', 'scifi'] },
                    { id: 'm4', name: 'Movie4', tags: ['drama'] }
                ]
            };

            const result = service.getTagMovieCountMap(allIndexMovies);

            expect(result[0].id).toBe('action');
            expect(result[0].movieCount).toBe(3);
        });

        test('SVC-TAG-040: 无关联电影的标签数量为0', () => {
            service.tagsCache = [
                { id: 'action', name: '动作' },
                { id: 'unused', name: '未使用' }
            ];

            const allIndexMovies = {
                'movie': [
                    { id: 'm1', name: 'Movie1', tags: ['action'] }
                ]
            };

            const result = service.getTagMovieCountMap(allIndexMovies);

            expect(result.find(t => t.id === 'unused').movieCount).toBe(0);
        });

        test('SVC-TAG-041: 空电影数据返回所有标签数量为0', () => {
            service.tagsCache = [
                { id: 'action', name: '动作' },
                { id: 'scifi', name: '科幻' }
            ];

            const result = service.getTagMovieCountMap({});

            expect(result).toHaveLength(2);
            result.forEach(tag => {
                expect(tag.movieCount).toBe(0);
            });
        });

        test('SVC-TAG-042: 电影无tags字段不影响统计', () => {
            service.tagsCache = [
                { id: 'action', name: '动作' }
            ];

            const allIndexMovies = {
                'movie': [
                    { id: 'm1', name: 'Movie1' },
                    { id: 'm2', name: 'Movie2', tags: ['action'] }
                ]
            };

            const result = service.getTagMovieCountMap(allIndexMovies);

            expect(result.find(t => t.id === 'action').movieCount).toBe(1);
        });

        test('SVC-TAG-043: 跨分类统计标签电影数量', () => {
            service.tagsCache = [
                { id: 'action', name: '动作' }
            ];

            const allIndexMovies = {
                'movie': [
                    { id: 'm1', name: 'Movie1', tags: ['action'] }
                ],
                'anime': [
                    { id: 'a1', name: 'Anime1', tags: ['action'] }
                ]
            };

            const result = service.getTagMovieCountMap(allIndexMovies);

            expect(result.find(t => t.id === 'action').movieCount).toBe(2);
        });
    });
});

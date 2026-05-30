/**
 * CLI Output Utils Tests
 */

const {
    formatRating,
    formatStatus,
    formatPlayTime,
    outputMovieList,
    outputTagList,
    outputCategoryList,
    outputBoxList
} = require('../../src/cli/utils/output');

describe('CLI Output Utils', () => {
    describe('formatRating', () => {
        test('CLI-OUTPUT-RATING-001: 0分应返回"-"', () => {
            expect(formatRating(0)).toBe('-');
        });

        test('CLI-OUTPUT-RATING-002: 3分应返回"★★★☆☆"', () => {
            expect(formatRating(3)).toBe('★★★☆☆');
        });

        test('CLI-OUTPUT-RATING-003: 5分应返回"★★★★★"', () => {
            expect(formatRating(5)).toBe('★★★★★');
        });

        test('CLI-OUTPUT-RATING-004: 空值应返回"-"', () => {
            expect(formatRating(null)).toBe('-');
            expect(formatRating(undefined)).toBe('-');
        });

        test('CLI-OUTPUT-RATING-005: 小数评分（如 3.5）', () => {
            expect(formatRating(3.5)).toBe('★★★☆');
        });
    });

    describe('formatStatus', () => {
        test('CLI-OUTPUT-STATUS-001: unwatched应返回"未观看"', () => {
            expect(formatStatus('unwatched')).toBe('未观看');
        });

        test('CLI-OUTPUT-STATUS-002: watching应返回"观看中"', () => {
            expect(formatStatus('watching')).toBe('观看中');
        });

        test('CLI-OUTPUT-STATUS-003: completed应返回"已完成"', () => {
            expect(formatStatus('completed')).toBe('已完成');
        });

        test('CLI-OUTPUT-STATUS-004: 未知状态应返回原值', () => {
            expect(formatStatus('unknown')).toBe('unknown');
            expect(formatStatus(null)).toBe('-');
        });
    });

    describe('formatPlayTime', () => {
        test('CLI-OUTPUT-PLAYTIME-001: 零值应返回"-"', () => {
            expect(formatPlayTime(0)).toBe('-');
            expect(formatPlayTime(null)).toBe('-');
        });

        test('CLI-OUTPUT-PLAYTIME-002: 分钟级应正确格式化', () => {
            expect(formatPlayTime(45)).toBe('45分钟');
        });

        test('CLI-OUTPUT-PLAYTIME-003: 小时级应正确格式化', () => {
            expect(formatPlayTime(125)).toBe('2小时 5分钟');
        });

        test('CLI-OUTPUT-PLAYTIME-004: 超大播放时间', () => {
            expect(formatPlayTime(10080)).toBe('168小时 0分钟');
        });
    });

    describe('outputMovieList', () => {
        test('CLI-OUTPUT-MOVIELIST-001: 空电影列表输出', () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
            outputMovieList([]);
            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });

        test('CLI-OUTPUT-MOVIELIST-002: 有电影列表输出', () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
            outputMovieList([
                { id: 'movie-test1', name: 'Test Movie', category: 'movie', userRating: 5, status: 'unwatched' }
            ]);
            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });
    });

    describe('outputTagList', () => {
        test('CLI-OUTPUT-TAGLIST-001: 空标签列表输出', () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
            outputTagList([]);
            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });

        test('CLI-OUTPUT-TAGLIST-002: 有标签列表输出', () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
            outputTagList([
                { id: 'action', name: '动作', movieCount: 5 }
            ]);
            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });
    });

    describe('outputCategoryList', () => {
        test('CLI-OUTPUT-CATEGORYLIST-001: 空分类列表输出', () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
            outputCategoryList([]);
            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });

        test('CLI-OUTPUT-CATEGORYLIST-002: 有分类列表输出', () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
            outputCategoryList([
                { id: 'movie', name: '电影', movieCount: 10 }
            ]);
            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });
    });

    describe('outputBoxList', () => {
        test('CLI-OUTPUT-BOXLIST-001: 空收藏夹列表输出', () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
            outputBoxList([]);
            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });

        test('CLI-OUTPUT-BOXLIST-002: 有收藏夹列表输出', () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
            outputBoxList([
                { name: 'Test Box', description: 'Test', movieCount: 2 }
            ]);
            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });
    });
});

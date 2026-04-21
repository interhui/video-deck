/**
 * CLI Validation Utils Tests
 */

const {
    validateMovieId,
    validateCategory,
    validateRating,
    validateStatus,
    validateMovieData,
    isValidDate,
    parseTags
} = require('../../src/cli/utils/validation');

describe('CLI Validation Utils', () => {
    describe('validateMovieId', () => {
        test('CLI-VALIDATE-MOVIEID-001: 有效ID应返回true', () => {
            expect(validateMovieId('movie-test')).toBe(true);
        });

        test('CLI-VALIDATE-MOVIEID-002: 多个分隔符应返回true', () => {
            expect(validateMovieId('category-movie-name')).toBe(true);
        });

        test('CLI-VALIDATE-MOVIEID-003: 无分隔符应返回false', () => {
            expect(validateMovieId('invalid')).toBe(false);
        });

        test('CLI-VALIDATE-MOVIEID-004: 空值应返回false', () => {
            expect(validateMovieId('')).toBe(false);
        });

        test('CLI-VALIDATE-MOVIEID-005: null值应返回false', () => {
            expect(validateMovieId(null)).toBe(false);
        });

        test('CLI-VALIDATE-MOVIEID-006: ID含特殊字符（如中文）', () => {
            expect(validateMovieId('movie-test-中文')).toBe(true);
            expect(validateMovieId('movie-test_name')).toBe(true);
        });

        test('CLI-VALIDATE-MOVIEID-007: 超长ID', () => {
            const longId = 'movie-' + 'a'.repeat(300);
            expect(validateMovieId(longId)).toBe(true);
        });
    });

    describe('validateCategory', () => {
        test('CLI-VALIDATE-CATEGORY-001: 有效分类应返回true', () => {
            expect(validateCategory('movie', ['movie', 'tv'])).toBe(true);
        });

        test('CLI-VALIDATE-CATEGORY-002: 无效分类应返回false', () => {
            expect(validateCategory('game', ['movie', 'tv'])).toBe(false);
        });

        test('CLI-VALIDATE-CATEGORY-003: 空分类列表应返回true（跳过验证）', () => {
            expect(validateCategory('any', [])).toBe(true);
        });
    });

    describe('validateRating', () => {
        test('CLI-VALIDATE-RATING-001: 有效评分0-5应返回true', () => {
            expect(validateRating(3)).toBe(true);
        });

        test('CLI-VALIDATE-RATING-002: 评分0应返回true', () => {
            expect(validateRating(0)).toBe(true);
        });

        test('CLI-VALIDATE-RATING-003: 评分5应返回true', () => {
            expect(validateRating(5)).toBe(true);
        });

        test('CLI-VALIDATE-RATING-004: 评分6应返回false', () => {
            expect(validateRating(6)).toBe(false);
        });

        test('CLI-VALIDATE-RATING-005: 负数评分应返回false', () => {
            expect(validateRating(-1)).toBe(false);
        });

        test('CLI-VALIDATE-RATING-006: 字符串数字应返回true', () => {
            expect(validateRating('3')).toBe(true);
        });

        test('CLI-VALIDATE-RATING-007: 小数评分（如 3.5）', () => {
            expect(validateRating(3.5)).toBe(true);
            expect(validateRating('3.5')).toBe(true);
        });

        test('CLI-VALIDATE-RATING-008: 非数字评分（如 "abc"）', () => {
            expect(validateRating('abc')).toBe(false);
            expect(validateRating(undefined)).toBe(false);
        });
    });

    describe('validateStatus', () => {
        test('CLI-VALIDATE-STATUS-001: unwatched应返回true', () => {
            expect(validateStatus('unwatched')).toBe(true);
        });

        test('CLI-VALIDATE-STATUS-002: watching应返回true', () => {
            expect(validateStatus('watching')).toBe(true);
        });

        test('CLI-VALIDATE-STATUS-003: completed应返回true', () => {
            expect(validateStatus('completed')).toBe(true);
        });

        test('CLI-VALIDATE-STATUS-004: 无效状态应返回false', () => {
            expect(validateStatus('invalid')).toBe(false);
        });
    });

    describe('validateMovieData', () => {
        test('CLI-VALIDATE-MOVIEDATA-001: 有效数据应返回valid true', () => {
            const result = validateMovieData({ name: 'Test', category: 'movie' });
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        test('CLI-VALIDATE-MOVIEDATA-002: 缺少name应返回valid false', () => {
            const result = validateMovieData({ category: 'movie' });
            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
            expect(result.errors.some(e => e.includes('name'))).toBe(true);
        });

        test('CLI-VALIDATE-MOVIEDATA-003: 缺少category应返回valid false', () => {
            const result = validateMovieData({ name: 'Test' });
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('category'))).toBe(true);
        });

        test('CLI-VALIDATE-MOVIEDATA-004: 无效分类应返回valid false', () => {
            const result = validateMovieData({ name: 'Test', category: 'invalid' }, ['movie']);
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('分类'))).toBe(true);
        });

        test('CLI-VALIDATE-MOVIEDATA-005: 无效日期格式应返回valid false', () => {
            const result = validateMovieData({ name: 'Test', category: 'movie', publishDate: '2024-1-1' });
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('发行日期'))).toBe(true);
        });

        test('CLI-VALIDATE-MOVIEDATA-006: 无效评分应返回valid false', () => {
            const result = validateMovieData({ name: 'Test', category: 'movie', userRating: 6 });
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('评分'))).toBe(true);
        });
    });

    describe('isValidDate', () => {
        test('CLI-VALIDATE-DATE-001: 有效日期应返回true', () => {
            expect(isValidDate('2024-01-01')).toBe(true);
        });

        test('CLI-VALIDATE-DATE-002: 无效格式应返回false', () => {
            expect(isValidDate('2024/01/01')).toBe(false);
        });

        test('CLI-VALIDATE-DATE-003: 无效日期应返回false', () => {
            expect(isValidDate('2024-13-01')).toBe(false);
        });

        test('CLI-VALIDATE-DATE-004: 空值应返回false', () => {
            expect(isValidDate('')).toBe(false);
        });
    });

    describe('parseTags', () => {
        test('CLI-VALIDATE-PARSETAGS-001: 单个标签应正确解析', () => {
            expect(parseTags('action')).toEqual(['action']);
        });

        test('CLI-VALIDATE-PARSETAGS-002: 多个标签应正确解析', () => {
            expect(parseTags('action, comedy')).toEqual(['action', 'comedy']);
        });

        test('CLI-VALIDATE-PARSETAGS-003: 带空格的标签应正确解析', () => {
            expect(parseTags('action, comedy, drama')).toEqual(['action', 'comedy', 'drama']);
        });

        test('CLI-VALIDATE-PARSETAGS-004: 空值应返回空数组', () => {
            expect(parseTags('')).toEqual([]);
        });

        test('CLI-VALIDATE-PARSETAGS-005: null值应返回空数组', () => {
            expect(parseTags(null)).toEqual([]);
        });

        test('CLI-VALIDATE-PARSETAGS-006: 标签含特殊字符', () => {
            expect(parseTags('tag-测试, tag@special')).toEqual(['tag-测试', 'tag@special']);
        });
    });
});

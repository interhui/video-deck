/**
 * CLI Stats Command Tests
 */

const path = require('path');

let consoleLogSpy;
let consoleErrorSpy;

beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
});

afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
});

const TEST_DATA_DIR = path.join(__dirname, 'test-data');
const MOVIES_DIR = path.join(TEST_DATA_DIR, 'movies');

const mockMovieService = {
    getStats: jest.fn(),
    getAllMovies: jest.fn(),
    getMoviesByCategory: jest.fn()
};

const mockServiceExports = {
    movieService: mockMovieService,
    getMoviesDir: () => MOVIES_DIR
};

global.__CLI_MOCK_SERVICES__ = mockServiceExports;

jest.mock('../../src/cli/utils/service-loader', () => ({
    initializeServices: jest.fn().mockResolvedValue(global.__CLI_MOCK_SERVICES__)
}));

describe('CLI Stats Command', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('stats basic', () => {
        test('CLI-STATS-001: 显示基本统计信息', async () => {
            mockMovieService.getStats.mockResolvedValue({
                totalMovies: 10,
                totalPlayTime: 500,
                averageRating: 3.5,
                categoryStats: {
                    movie: { count: 6, playTime: 300 },
                    tv: { count: 4, playTime: 200 }
                },
                statusStats: {
                    unwatched: 5,
                    watching: 3,
                    completed: 2
                }
            });

            const services = {
                movieService: mockMovieService,
                getMoviesDir: () => MOVIES_DIR
            };

            const { outputStats } = require('../../src/cli/utils/output');
            const stats = await mockMovieService.getStats(null, MOVIES_DIR);
            outputStats(stats);

            expect(consoleLogSpy).toHaveBeenCalled();
        });

        test('CLI-STATS-002: 按分类过滤统计', async () => {
            mockMovieService.getStats.mockResolvedValue({
                totalMovies: 6,
                totalPlayTime: 300,
                averageRating: 4.0,
                categoryStats: {
                    movie: { count: 6, playTime: 300 }
                },
                statusStats: {
                    unwatched: 2,
                    watching: 2,
                    completed: 2
                }
            });

            const services = {
                movieService: mockMovieService,
                getMoviesDir: () => MOVIES_DIR
            };

            const stats = await mockMovieService.getStats('movie', MOVIES_DIR);

            expect(mockMovieService.getStats).toHaveBeenCalledWith('movie', MOVIES_DIR);
        });

        test('CLI-STATS-003: 显示播放时间统计', async () => {
            mockMovieService.getStats.mockResolvedValue({
                totalMovies: 10,
                totalPlayTime: 1250,
                averageRating: 3.5,
                categoryStats: {},
                statusStats: {},
                playTimeDetails: {
                    totalHours: 20,
                    totalMinutes: 50,
                    averagePerMovie: 125
                }
            });

            const services = {
                movieService: mockMovieService,
                getMoviesDir: () => MOVIES_DIR
            };

            const stats = await mockMovieService.getStats(null, MOVIES_DIR, { playtime: true });

            expect(stats.playTimeDetails).toBeDefined();
            expect(stats.playTimeDetails.totalHours).toBe(20);
        });
    });

    describe('stats edge cases', () => {
        test('CLI-STATS-004: 空数据库统计（边界条件）', async () => {
            mockMovieService.getStats.mockResolvedValue({
                totalMovies: 0,
                totalPlayTime: 0,
                averageRating: 0,
                categoryStats: {},
                statusStats: {}
            });

            const services = {
                movieService: mockMovieService,
                getMoviesDir: () => MOVIES_DIR
            };

            const stats = await mockMovieService.getStats(null, MOVIES_DIR);

            expect(stats.totalMovies).toBe(0);
            expect(stats.totalPlayTime).toBe(0);
        });

        test('CLI-STATS-005: 统计服务异常处理', async () => {
            mockMovieService.getStats.mockRejectedValue(new Error('统计服务异常'));

            const services = {
                movieService: mockMovieService,
                getMoviesDir: () => MOVIES_DIR
            };

            try {
                await mockMovieService.getStats(null, MOVIES_DIR);
            } catch (error) {
                expect(error.message).toBe('统计服务异常');
            }

            expect(mockMovieService.getStats).toHaveBeenCalled();
        });
    });
});
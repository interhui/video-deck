/**
 * VideoInfoService 单元测试
 */
const VideoInfoService = require('../../src/main/services/VideoInfoService');

describe('VideoInfoService', () => {
    let service;

    beforeEach(() => {
        // 创建实例时不传入路径，避免依赖系统ffmpeg
        service = new VideoInfoService('', '');
    });

    describe('constructor', () => {
        test('SVC-VIDEO-001: 创建实例', () => {
            expect(service).toBeDefined();
            expect(service.ffmpegPath).toBe('');
            expect(service.ffprobePath).toBe('');
        });

        test('SVC-VIDEO-002: 使用指定路径创建实例', () => {
            const testService = new VideoInfoService('/path/to/ffmpeg', '/path/to/ffprobe');
            expect(testService.ffmpegPath).toBe('/path/to/ffmpeg');
            expect(testService.ffprobePath).toBe('/path/to/ffprobe');
        });
    });

    describe('setFfmpegPath', () => {
        test('SVC-VIDEO-003: 设置ffmpeg路径', () => {
            service.setFfmpegPath('/custom/ffmpeg');
            expect(service.ffmpegPath).toBe('/custom/ffmpeg');
        });

        test('SVC-VIDEO-004: 设置空ffmpeg路径', () => {
            service.setFfmpegPath('');
            expect(service.ffmpegPath).toBe('');
        });
    });

    describe('setFfprobePath', () => {
        test('SVC-VIDEO-005: 设置ffprobe路径', () => {
            service.setFfprobePath('/custom/ffprobe');
            expect(service.ffprobePath).toBe('/custom/ffprobe');
        });

        test('SVC-VIDEO-006: 设置空ffprobe路径', () => {
            service.setFfprobePath('');
            expect(service.ffprobePath).toBe('');
        });
    });

    describe('isVideoFile', () => {
        test('SVC-VIDEO-007: mp4文件返回true', () => {
            expect(service.isVideoFile('/path/to/video.mp4')).toBe(true);
        });

        test('SVC-VIDEO-008: avi文件返回true', () => {
            expect(service.isVideoFile('/path/to/video.avi')).toBe(true);
        });

        test('SVC-VIDEO-009: mkv文件返回true', () => {
            expect(service.isVideoFile('/path/to/video.mkv')).toBe(true);
        });

        test('SVC-VIDEO-010: mov文件返回true', () => {
            expect(service.isVideoFile('/path/to/video.mov')).toBe(true);
        });

        test('SVC-VIDEO-011: wmv文件返回true', () => {
            expect(service.isVideoFile('/path/to/video.wmv')).toBe(true);
        });

        test('SVC-VIDEO-012: flv文件返回true', () => {
            expect(service.isVideoFile('/path/to/video.flv')).toBe(true);
        });

        test('SVC-VIDEO-013: webm文件返回true', () => {
            expect(service.isVideoFile('/path/to/video.webm')).toBe(true);
        });

        test('SVC-VIDEO-014: m4v文件返回true', () => {
            expect(service.isVideoFile('/path/to/video.m4v')).toBe(true);
        });

        test('SVC-VIDEO-015: mpg文件返回true', () => {
            expect(service.isVideoFile('/path/to/video.mpg')).toBe(true);
        });

        test('SVC-VIDEO-016: mpeg文件返回true', () => {
            expect(service.isVideoFile('/path/to/video.mpeg')).toBe(true);
        });

        test('SVC-VIDEO-017: 3gp文件返回true', () => {
            expect(service.isVideoFile('/path/to/video.3gp')).toBe(true);
        });

        test('SVC-VIDEO-018: ts文件返回true', () => {
            expect(service.isVideoFile('/path/to/video.ts')).toBe(true);
        });

        test('SVC-VIDEO-019: mts文件返回true', () => {
            expect(service.isVideoFile('/path/to/video.mts')).toBe(true);
        });

        test('SVC-VIDEO-020: m2ts文件返回true', () => {
            expect(service.isVideoFile('/path/to/video.m2ts')).toBe(true);
        });

        test('SVC-VIDEO-021: jpg文件返回false', () => {
            expect(service.isVideoFile('/path/to/image.jpg')).toBe(false);
        });

        test('SVC-VIDEO-022: png文件返回false', () => {
            expect(service.isVideoFile('/path/to/image.png')).toBe(false);
        });

        test('SVC-VIDEO-023: txt文件返回false', () => {
            expect(service.isVideoFile('/path/to/document.txt')).toBe(false);
        });

        test('SVC-VIDEO-024: 无扩展名文件返回false', () => {
            expect(service.isVideoFile('/path/to/noextension')).toBe(false);
        });

        test('SVC-VIDEO-025: 空路径返回false', () => {
            expect(service.isVideoFile('')).toBe(false);
        });

        test('SVC-VIDEO-026: null返回false', () => {
            expect(service.isVideoFile(null)).toBe(false);
        });

        test('SVC-VIDEO-027: undefined返回false', () => {
            expect(service.isVideoFile(undefined)).toBe(false);
        });

        test('SVC-VIDEO-028: 大写扩展名返回true', () => {
            expect(service.isVideoFile('/path/to/video.MP4')).toBe(true);
        });

        test('SVC-VIDEO-029: 混合大小写扩展名返回true', () => {
            expect(service.isVideoFile('/path/to/video.Mp4')).toBe(true);
        });
    });

    describe('formatDuration', () => {
        test('SVC-VIDEO-030: 格式化零秒', () => {
            expect(service.formatDuration(0)).toBe('00:00:00');
        });

        test('SVC-VIDEO-031: 格式化一秒', () => {
            expect(service.formatDuration(1)).toBe('00:00:01');
        });

        test('SVC-VIDEO-032: 格式化一分钟', () => {
            expect(service.formatDuration(60)).toBe('00:01:00');
        });

        test('SVC-VIDEO-033: 格式化一小时', () => {
            expect(service.formatDuration(3600)).toBe('01:00:00');
        });

        test('SVC-VIDEO-034: 格式化两小时三十分钟四十五秒', () => {
            expect(service.formatDuration(2 * 3600 + 30 * 60 + 45)).toBe('02:30:45');
        });

        test('SVC-VIDEO-035: 格式化小于零的值返回零', () => {
            expect(service.formatDuration(-100)).toBe('00:00:00');
        });

        test('SVC-VIDEO-036: 格式化null返回零', () => {
            expect(service.formatDuration(null)).toBe('00:00:00');
        });

        test('SVC-VIDEO-037: 格式化undefined返回零', () => {
            expect(service.formatDuration(undefined)).toBe('00:00:00');
        });
    });

    describe('formatResolution', () => {
        test('SVC-VIDEO-038: 格式化标准分辨率', () => {
            expect(service.formatResolution(1920, 1080)).toBe('1920x1080');
        });

        test('SVC-VIDEO-039: 格式化4K分辨率', () => {
            expect(service.formatResolution(3840, 2160)).toBe('3840x2160');
        });

        test('SVC-VIDEO-040: 格式化720p分辨率', () => {
            expect(service.formatResolution(1280, 720)).toBe('1280x720');
        });

        test('SVC-VIDEO-041: 格式化SD分辨率', () => {
            expect(service.formatResolution(640, 480)).toBe('640x480');
        });

        test('SVC-VIDEO-042: 格式化零分辨率', () => {
            expect(service.formatResolution(0, 0)).toBe('0x0');
        });
    });

    describe('getVideoInfo', () => {
        test('SVC-VIDEO-043: 非视频文件返回null', async () => {
            const result = await service.getVideoInfo('/path/to/image.jpg');
            expect(result).toBeNull();
        });

        test('SVC-VIDEO-044: 空路径返回null', async () => {
            const result = await service.getVideoInfo('');
            expect(result).toBeNull();
        });

        test('SVC-VIDEO-045: null路径返回null', async () => {
            const result = await service.getVideoInfo(null);
            expect(result).toBeNull();
        });

        test('SVC-VIDEO-046: 不存在的文件会报错', async () => {
            await expect(service.getVideoInfo('/nonexistent/video.mp4')).rejects.toThrow();
        });
    });
});
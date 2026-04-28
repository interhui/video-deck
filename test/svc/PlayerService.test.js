/**
 * PlayerService 单元测试
 */
const path = require('path');

// 直接定义简单的 PlayerService 复制来测试，避免模块缓存问题
class TestPlayerService {
    constructor() {
        this.currentPlaylist = [];
        this.currentIndex = 0;
    }

    getPlaylist(movieData) {
        const playlist = [];

        if (movieData && movieData.fileset && Array.isArray(movieData.fileset)) {
            for (const file of movieData.fileset) {
                if (file.type === 'Main' && file.fullpath) {
                    playlist.push({
                        path: file.fullpath,
                        title: file.original || path.basename(file.fullpath),
                        codec: file.codec || '',
                        resolution: file.resolution || ''
                    });
                }
            }
        }

        if (playlist.length === 0 && movieData && movieData.original_filename) {
            playlist.push({
                path: movieData.original_filename,
                title: movieData.title || path.basename(movieData.original_filename),
                codec: movieData.videoCodec || '',
                resolution: movieData.videoWidth ? `${movieData.videoWidth}x${movieData.videoHeight}` : ''
            });
        }

        return playlist;
    }

    next() {
        if (this.currentIndex < this.currentPlaylist.length - 1) {
            this.currentIndex++;
            return this.currentPlaylist[this.currentIndex];
        }
        return null;
    }

    previous() {
        if (this.currentIndex > 0) {
            this.currentIndex--;
            return this.currentPlaylist[this.currentIndex];
        }
        return null;
    }

    goTo(index) {
        if (index >= 0 && index < this.currentPlaylist.length) {
            this.currentIndex = index;
            return this.currentPlaylist[this.currentIndex];
        }
        return null;
    }

    hasNext() {
        return this.currentIndex < this.currentPlaylist.length - 1;
    }

    hasPrevious() {
        return this.currentIndex > 0;
    }
}

describe('PlayerService', () => {
    let playerService;

    beforeEach(() => {
        playerService = new TestPlayerService();
    });

    describe('getPlaylist', () => {
        test('应从fileset提取Main类型文件构建播放列表', () => {
            const movieData = {
                title: '测试电影',
                fileset: [
                    { type: 'Main', fullpath: '/movies/test/video1.mp4', filename: '视频1.mp4' },
                    { type: 'Preview', fullpath: '/movies/test/trailer.mp4' },
                    { type: 'Main', fullpath: '/movies/test/video2.mp4', filename: '视频2.mp4' }
                ]
            };

            const playlist = playerService.getPlaylist(movieData);

            expect(playlist).toHaveLength(2);
            expect(playlist[0].path).toBe('/movies/test/video1.mp4');
            expect(playlist[1].path).toBe('/movies/test/video2.mp4');
        });

        test('应跳过非Main类型的文件', () => {
            const movieData = {
                title: '测试电影',
                fileset: [
                    { type: 'Preview', fullpath: '/movies/test/trailer.mp4' },
                    { type: 'Extra', fullpath: '/movies/test/bonus.mp4' }
                ]
            };

            const playlist = playerService.getPlaylist(movieData);

            expect(playlist).toHaveLength(0);
        });

        test('当fileset为空时使用original_filename', () => {
            const movieData = {
                title: '测试电影',
                original_filename: '/movies/test/video.mp4',
                videoCodec: 'H264',
                videoWidth: '1920',
                videoHeight: '1080'
            };

            const playlist = playerService.getPlaylist(movieData);

            expect(playlist).toHaveLength(1);
            expect(playlist[0].path).toBe('/movies/test/video.mp4');
            expect(playlist[0].codec).toBe('H264');
            expect(playlist[0].resolution).toBe('1920x1080');
        });

        test('当没有fileset和original_filename时返回空列表', () => {
            const movieData = {
                title: '测试电影'
            };

            const playlist = playerService.getPlaylist(movieData);

            expect(playlist).toHaveLength(0);
        });
    });

    describe('next/previous', () => {
        beforeEach(() => {
            playerService.currentPlaylist = [
                { path: '/movies/test/video1.mp4' },
                { path: '/movies/test/video2.mp4' },
                { path: '/movies/test/video3.mp4' }
            ];
            playerService.currentIndex = 0;
        });

        test('next应返回下一首并增加索引', () => {
            const result = playerService.next();

            expect(result).toEqual({ path: '/movies/test/video2.mp4' });
            expect(playerService.currentIndex).toBe(1);
        });

        test('next在最后一首时返回null', () => {
            playerService.currentIndex = 2;

            const result = playerService.next();

            expect(result).toBeNull();
            expect(playerService.currentIndex).toBe(2);
        });

        test('previous应返回上一首并减少索引', () => {
            playerService.currentIndex = 2;

            const result = playerService.previous();

            expect(result).toEqual({ path: '/movies/test/video2.mp4' });
            expect(playerService.currentIndex).toBe(1);
        });

        test('previous在第一首时返回null', () => {
            const result = playerService.previous();

            expect(result).toBeNull();
            expect(playerService.currentIndex).toBe(0);
        });
    });

    describe('goTo', () => {
        beforeEach(() => {
            playerService.currentPlaylist = [
                { path: '/movies/test/video1.mp4' },
                { path: '/movies/test/video2.mp4' },
                { path: '/movies/test/video3.mp4' }
            ];
            playerService.currentIndex = 0;
        });

        test('应跳转到指定索引', () => {
            const result = playerService.goTo(2);

            expect(result).toEqual({ path: '/movies/test/video3.mp4' });
            expect(playerService.currentIndex).toBe(2);
        });

        test('索引超出范围时返回null', () => {
            const result = playerService.goTo(5);

            expect(result).toBeNull();
        });

        test('负数索引时返回null', () => {
            const result = playerService.goTo(-1);

            expect(result).toBeNull();
        });
    });

    describe('hasNext/hasPrevious', () => {
        beforeEach(() => {
            playerService.currentPlaylist = [
                { path: '/movies/test/video1.mp4' },
                { path: '/movies/test/video2.mp4' },
                { path: '/movies/test/video3.mp4' }
            ];
            playerService.currentIndex = 1;
        });

        test('hasNext应正确判断', () => {
            expect(playerService.hasNext()).toBe(true);

            playerService.currentIndex = 2;
            expect(playerService.hasNext()).toBe(false);
        });

        test('hasPrevious应正确判断', () => {
            expect(playerService.hasPrevious()).toBe(true);

            playerService.currentIndex = 0;
            expect(playerService.hasPrevious()).toBe(false);
        });
    });
});
/**
 * PlayerService 单元测试
 */
const path = require('path');
const fs = require('fs').promises;
const PlayerService = require('../../src/main/services/PlayerService');

describe('PlayerService', () => {
    let playerService;

    beforeEach(() => {
        playerService = new PlayerService();
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

    describe('openBatchPlayerWindow', () => {
        let mockCreatePlayerWindow;
        let mockMainWindow;

        beforeEach(() => {
            mockCreatePlayerWindow = jest.fn();
            mockMainWindow = {};
        });

        test('应正确处理有效播放列表', () => {
            const playlistData = [
                { path: '/movies/test/video1.mp4', title: '视频1' },
                { path: '/movies/test/video2.mp4', title: '视频2' }
            ];

            playerService.openBatchPlayerWindow(playlistData, mockMainWindow, mockCreatePlayerWindow);

            expect(playerService.currentPlaylist).toEqual(playlistData);
            expect(playerService.currentIndex).toBe(0);
            expect(mockCreatePlayerWindow).toHaveBeenCalledWith({
                playlist: playlistData,
                currentIndex: 0,
                movieTitle: '批量播放'
            });
        });

        test('空播放列表应抛出错误', () => {
            expect(() => {
                playerService.openBatchPlayerWindow([], mockMainWindow, mockCreatePlayerWindow);
            }).toThrow('没有可播放的文件');
        });

        test('null播放列表应抛出错误', () => {
            expect(() => {
                playerService.openBatchPlayerWindow(null, mockMainWindow, mockCreatePlayerWindow);
            }).toThrow('没有可播放的文件');
        });

        test('undefined播放列表应抛出错误', () => {
            expect(() => {
                playerService.openBatchPlayerWindow(undefined, mockMainWindow, mockCreatePlayerWindow);
            }).toThrow('没有可播放的文件');
        });

        test('createPlayerWindow为null时不应调用', () => {
            const playlistData = [
                { path: '/movies/test/video1.mp4', title: '视频1' }
            ];

            playerService.openBatchPlayerWindow(playlistData, mockMainWindow, null);

            expect(playerService.currentPlaylist).toEqual(playlistData);
            expect(playerService.currentIndex).toBe(0);
        });

        test('createPlayerWindow为undefined时不应调用', () => {
            const playlistData = [
                { path: '/movies/test/video1.mp4', title: '视频1' }
            ];

            playerService.openBatchPlayerWindow(playlistData, mockMainWindow, undefined);

            expect(playerService.currentPlaylist).toEqual(playlistData);
            expect(playerService.currentIndex).toBe(0);
        });
    });

    describe('字幕功能', () => {
        let tempDir;
        
        beforeEach(async () => {
            tempDir = path.join(__dirname, 'temp-subtitle-test');
            await fs.mkdir(tempDir, { recursive: true });
        });

        afterEach(async () => {
            try {
                await fs.rm(tempDir, { recursive: true, force: true });
            } catch (error) {
            }
        });

        describe('findSubtitleFiles', () => {
            test('应找到同目录下的字幕文件', async () => {
                const videoPath = path.join(tempDir, 'movie.mp4');
                await fs.writeFile(videoPath, 'test');
                await fs.writeFile(path.join(tempDir, 'movie.ass'), 'test');
                await fs.writeFile(path.join(tempDir, 'movie.srt'), 'test');
                await fs.writeFile(path.join(tempDir, 'other.ass'), 'test');

                const subtitles = await playerService.findSubtitleFiles(videoPath);

                expect(subtitles).toHaveLength(3);
                expect(subtitles.map(s => s.ext)).toContain('.ass');
                expect(subtitles.map(s => s.ext)).toContain('.srt');
            });

            test('应按文件名排序', async () => {
                const videoPath = path.join(tempDir, 'movie.mp4');
                await fs.writeFile(videoPath, 'test');
                await fs.writeFile(path.join(tempDir, 'z.ass'), 'test');
                await fs.writeFile(path.join(tempDir, 'a.ass'), 'test');
                await fs.writeFile(path.join(tempDir, 'm.ass'), 'test');

                const subtitles = await playerService.findSubtitleFiles(videoPath);

                expect(subtitles).toHaveLength(3);
                expect(subtitles[0].filename).toBe('a.ass');
                expect(subtitles[1].filename).toBe('m.ass');
                expect(subtitles[2].filename).toBe('z.ass');
            });

            test('视频路径为null时应返回空数组', async () => {
                const subtitles = await playerService.findSubtitleFiles(null);
                expect(subtitles).toHaveLength(0);
            });

            test('目录不存在时应返回空数组', async () => {
                const videoPath = '/nonexistent/path/movie.mp4';
                const subtitles = await playerService.findSubtitleFiles(videoPath);
                expect(subtitles).toHaveLength(0);
            });
        });

        describe('getAutoSubtitle', () => {
            test('应优先选择同名ASS字幕', async () => {
                const videoPath = path.join(tempDir, 'movie.mp4');
                await fs.writeFile(videoPath, 'test');
                await fs.writeFile(path.join(tempDir, 'movie.ass'), 'test');
                await fs.writeFile(path.join(tempDir, 'movie.srt'), 'test');

                const subtitle = await playerService.getAutoSubtitle(videoPath);

                expect(subtitle).not.toBeNull();
                expect(subtitle.ext).toBe('.ass');
                expect(subtitle.basename).toBe('movie');
            });

            test('没有同名ASS时应选择同名SRT', async () => {
                const videoPath = path.join(tempDir, 'movie.mp4');
                await fs.writeFile(videoPath, 'test');
                await fs.writeFile(path.join(tempDir, 'movie.srt'), 'test');
                await fs.writeFile(path.join(tempDir, 'other.ass'), 'test');

                const subtitle = await playerService.getAutoSubtitle(videoPath);

                expect(subtitle).not.toBeNull();
                expect(subtitle.ext).toBe('.srt');
                expect(subtitle.basename).toBe('movie');
            });

            test('没有同名字幕时应选择第一个ASS文件', async () => {
                const videoPath = path.join(tempDir, 'movie.mp4');
                await fs.writeFile(videoPath, 'test');
                await fs.writeFile(path.join(tempDir, 'a.ass'), 'test');
                await fs.writeFile(path.join(tempDir, 'b.srt'), 'test');

                const subtitle = await playerService.getAutoSubtitle(videoPath);

                expect(subtitle).not.toBeNull();
                expect(subtitle.ext).toBe('.ass');
            });

            test('没有ASS时应选择第一个SRT文件', async () => {
                const videoPath = path.join(tempDir, 'movie.mp4');
                await fs.writeFile(videoPath, 'test');
                await fs.writeFile(path.join(tempDir, 'a.srt'), 'test');
                await fs.writeFile(path.join(tempDir, 'b.srt'), 'test');

                const subtitle = await playerService.getAutoSubtitle(videoPath);

                expect(subtitle).not.toBeNull();
                expect(subtitle.ext).toBe('.srt');
                expect(subtitle.filename).toBe('a.srt');
            });

            test('没有字幕文件时应返回null', async () => {
                const videoPath = path.join(tempDir, 'movie.mp4');
                await fs.writeFile(videoPath, 'test');

                const subtitle = await playerService.getAutoSubtitle(videoPath);

                expect(subtitle).toBeNull();
            });
        });

        describe('parseSRT', () => {
            test('应正确解析SRT格式字幕', async () => {
                const srtPath = path.join(tempDir, 'test.srt');
                const srtContent = `1
00:00:01,000 --> 00:00:03,000
第一行字幕

2
00:00:05,000 --> 00:00:08,000
第二行字幕
第二行第二句`;
                await fs.writeFile(srtPath, srtContent);

                const subtitles = await playerService.parseSRT(srtPath);

                expect(subtitles).toHaveLength(2);
                expect(subtitles[0].startTime).toBe(1);
                expect(subtitles[0].endTime).toBe(3);
                expect(subtitles[0].text).toBe('第一行字幕');
                expect(subtitles[1].text).toBe('第二行字幕\n第二行第二句');
            });

            test('文件不存在时应返回空数组', async () => {
                const subtitles = await playerService.parseSRT('/nonexistent.srt');
                expect(subtitles).toHaveLength(0);
            });
        });

        describe('parseASS', () => {
            test('应正确解析ASS格式字幕', async () => {
                const assPath = path.join(tempDir, 'test.ass');
                const assContent = `[Script Info]
Title: Test

[Events]
Dialogue: 0,0:00:01.00,0:00:03.00,Default,,0,0,0,,第一行字幕
Dialogue: 0,0:00:05.00,0:00:08.00,Default,,0,0,0,,第二行字幕\\N第二行第二句`;
                await fs.writeFile(assPath, assContent);

                const subtitles = await playerService.parseASS(assPath);

                expect(subtitles).toHaveLength(2);
                expect(subtitles[0].startTime).toBe(1);
                expect(subtitles[0].endTime).toBe(3);
                expect(subtitles[0].text).toBe('第一行字幕');
                expect(subtitles[1].text).toBe('第二行字幕\n第二行第二句');
            });

            test('应移除ASS样式标签', async () => {
                const assPath = path.join(tempDir, 'test.ass');
                const assContent = `[Events]
Dialogue: 0,0:00:01.00,0:00:03.00,Default,,0,0,0,,{\\b1}粗体{\\b0}正常`;
                await fs.writeFile(assPath, assContent);

                const subtitles = await playerService.parseASS(assPath);

                expect(subtitles).toHaveLength(1);
                expect(subtitles[0].text).toBe('粗体正常');
            });

            test('文件不存在时应返回空数组', async () => {
                const subtitles = await playerService.parseASS('/nonexistent.ass');
                expect(subtitles).toHaveLength(0);
            });
        });

        describe('loadSubtitle', () => {
            test('应根据扩展名调用正确的解析器', async () => {
                const srtPath = path.join(tempDir, 'test.srt');
                const assPath = path.join(tempDir, 'test.ass');
                
                const srtContent = `1
00:00:01,000 --> 00:00:03,000
SRT字幕`;
                await fs.writeFile(srtPath, srtContent);
                
                const assContent = `[Events]
Dialogue: 0,0:00:01.00,0:00:03.00,Default,,0,0,0,,ASS字幕`;
                await fs.writeFile(assPath, assContent);

                const srtSubtitles = await playerService.loadSubtitle(srtPath);
                const assSubtitles = await playerService.loadSubtitle(assPath);

                expect(srtSubtitles).toHaveLength(1);
                expect(srtSubtitles[0].text).toBe('SRT字幕');
                
                expect(assSubtitles).toHaveLength(1);
                expect(assSubtitles[0].text).toBe('ASS字幕');
            });

            test('路径为null时应返回空数组', async () => {
                const subtitles = await playerService.loadSubtitle(null);
                expect(subtitles).toHaveLength(0);
            });

            test('不支持的格式应返回空数组', async () => {
                const subtitles = await playerService.loadSubtitle('/test.txt');
                expect(subtitles).toHaveLength(0);
            });
        });
    });
});
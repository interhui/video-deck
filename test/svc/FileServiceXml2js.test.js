/**
 * FileService XML2js优化 - 单元测试
 * 测试基于xml2js的NFO文件解析和生成功能
 */
const FileService = require('../../src/main/services/FileService');
const path = require('path');
const fs = require('fs');

describe('FileService Xml2js Optimization', () => {
    let service;
    let testDataDir;

    beforeEach(() => {
        service = new FileService();
        testDataDir = path.join(__dirname, 'test-data', 'fileservice-xml2js');
        if (!fs.existsSync(testDataDir)) {
            fs.mkdirSync(testDataDir, { recursive: true });
        }
    });

    afterEach(() => {
        // Clean up test files
        if (fs.existsSync(testDataDir)) {
            fs.rmSync(testDataDir, { recursive: true, force: true });
        }
    });

    // ========================================================================
    // _parseMovieNfoXmlAsync 测试 - 使用xml2js的异步解析方法
    // ========================================================================
    describe('_parseMovieNfoXmlAsync', () => {
        test('SVC-XML2JS-001: 异步解析简单NFO', async () => {
            const xml = `<?xml version="1.0" encoding="UTF-8"?>
<movie>
    <id>test-async-id</id>
    <title>Async Test Movie</title>
    <year>2024</year>
    <director>Test Director</director>
</movie>`;

            const result = await service._parseMovieNfoXmlAsync(xml);

            expect(result.id).toBe('test-async-id');
            expect(result.title).toBe('Async Test Movie');
            expect(result.year).toBe('2024');
            expect(result.director).toBe('Test Director');
        });

        test('SVC-XML2JS-002: 异步解析多个标签', async () => {
            const xml = `<?xml version="1.0"?>
<movie>
    <title>Test Movie</title>
    <tag>sci-fi</tag>
    <tag>adventure</tag>
    <tag>drama</tag>
</movie>`;

            const result = await service._parseMovieNfoXmlAsync(xml);

            expect(result.tag).toEqual(['sci-fi', 'adventure', 'drama']);
        });

        test('SVC-XML2JS-003: 异步解析多个演员', async () => {
            const xml = `<?xml version="1.0"?>
<movie>
    <title>Test Movie</title>
    <actor><name>Actor 1</name><name>Actor 2</name></actor>
</movie>`;

            const result = await service._parseMovieNfoXmlAsync(xml);

            expect(result.actors).toEqual(['Actor 1', 'Actor 2']);
        });

        test('SVC-XML2JS-003a: 异步解析多个Actor节点每个包含单个Name（格式1）', async () => {
            // Format 1: Multiple <actor> nodes, each with one <name>
            const xml = `<?xml version="1.0"?>
<movie>
    <title>Test Movie</title>
    <actor>
        <name>Louis Jourdan</name>
        <role>Kamal Khan</role>
        <thumb>https://image.tmdb.org/t/p/h632/5c16pYXo2Xaa4Y4Bj7ZiCiO6eAa.jpg</thumb>
        <profile>https://www.themoviedb.org/person/10508</profile>
        <tmdbid>10508</tmdbid>
    </actor>
    <actor>
        <name>Kristina Wayborn</name>
        <role>Magda</role>
        <thumb>https://image.tmdb.org/t/p/h632/taa97RZeY6XpqEemhPHCtwaH8rV.jpg</thumb>
        <profile>https://www.themoviedb.org/person/10509</profile>
        <tmdbid>10509</tmdbid>
    </actor>
</movie>`;

            const result = await service._parseMovieNfoXmlAsync(xml);

            expect(result.actors).toEqual(['Louis Jourdan', 'Kristina Wayborn']);
            expect(result.actors.length).toBe(2);
        });

        test('SVC-XML2JS-003b: 异步解析单个Actor节点包含多个Name（格式2）', async () => {
            // Format 2: Single <actor> node with multiple <name> elements
            const xml = `<?xml version="1.0"?>
<movie>
    <title>Test Movie</title>
    <actor>
        <name>Louis Jourdan</name>
        <name>Kristina Wayborn</name>
    </actor>
</movie>`;

            const result = await service._parseMovieNfoXmlAsync(xml);

            expect(result.actors).toEqual(['Louis Jourdan', 'Kristina Wayborn']);
            expect(result.actors.length).toBe(2);
        });

        test('SVC-XML2JS-003c: 异步解析混合格式的演员（三个演员两种格式混合）', async () => {
            // Mixed: Multiple <actor> nodes, some with multiple names
            const xml = `<?xml version="1.0"?>
<movie>
    <title>Test Movie</title>
    <actor>
        <name>Louis Jourdan</name>
        <name>Kristina Wayborn</name>
    </actor>
    <actor>
        <name>另一位演员</name>
    </actor>
</movie>`;

            const result = await service._parseMovieNfoXmlAsync(xml);

            expect(result.actors).toEqual(['Louis Jourdan', 'Kristina Wayborn', '另一位演员']);
            expect(result.actors.length).toBe(3);
        });

        test('SVC-XML2JS-004: 异步解析视频信息', async () => {
            const xml = `<?xml version="1.0"?>
<movie>
    <id>video-test</id>
    <title>Video Test</title>
    <fileinfo>
        <streamdetails>
            <video>
                <codec>H265</codec>
                <width>3840</width>
                <height>2160</height>
                <durationinseconds>9000</durationinseconds>
            </video>
        </streamdetails>
    </fileinfo>
</movie>`;

            const result = await service._parseMovieNfoXmlAsync(xml);

            expect(result.videoCodec).toBe('H265');
            expect(result.videoWidth).toBe('3840');
            expect(result.videoHeight).toBe('2160');
            expect(result.videoDuration).toBe('9000');
        });

        test('SVC-XML2JS-005: 异步解析fileset', async () => {
            const xml = `<?xml version="1.0"?>
<movie>
    <title>Fileset Test</title>
    <fileset>
        <file>
            <filename>video.mp4</filename>
            <fullpath>D:/Movies/video.mp4</fullpath>
            <type>Main</type>
            <videocodec>H264</videocodec>
            <videowidth>1920</videowidth>
            <videoheight>1080</videoheight>
        </file>
        <file>
            <filename>subtitle.srt</filename>
            <type>Subtitle</type>
            <memo>Chinese subtitles</memo>
        </file>
    </fileset>
</movie>`;

            const result = await service._parseMovieNfoXmlAsync(xml);

            expect(result.fileset).toBeDefined();
            expect(result.fileset.length).toBe(2);
            expect(result.fileset[0].filename).toBe('video.mp4');
            expect(result.fileset[0].type).toBe('Main');
            expect(result.fileset[0].videoCodec).toBe('H264');
            expect(result.fileset[1].type).toBe('Subtitle');
            expect(result.fileset[1].memo).toBe('Chinese subtitles');
        });

        test('SVC-XML2JS-006: 异步解析处理缺失字段', async () => {
            const xml = `<?xml version="1.0"?><movie><title>Only Title</title></movie>`;

            const result = await service._parseMovieNfoXmlAsync(xml);

            expect(result.title).toBe('Only Title');
            expect(result.id).toBeUndefined();
            expect(result.year).toBeUndefined();
            expect(result.tag).toEqual([]);
            expect(result.actors).toEqual([]);
        });

        test('SVC-XML2JS-007: 异步解析处理空movie节点', async () => {
            const xml = `<?xml version="1.0"?><movie></movie>`;

            const result = await service._parseMovieNfoXmlAsync(xml);

            expect(result).toEqual({});
        });

        test('SVC-XML2JS-008: 异步解析处理所有文本字段', async () => {
            const xml = `<?xml version="1.0"?>
<movie>
    <id>full-test-id</id>
    <title>Full Test</title>
    <year>2024</year>
    <outline>This is an outline</outline>
    <sorttitle>Sort Title</sorttitle>
    <runtime>120</runtime>
    <studio>Test Studio</studio>
    <director>Test Director</director>
    <original_filename>D:/test/original.mkv</original_filename>
    <description>This is a description</description>
</movie>`;

            const result = await service._parseMovieNfoXmlAsync(xml);

            expect(result.id).toBe('full-test-id');
            expect(result.title).toBe('Full Test');
            expect(result.year).toBe('2024');
            expect(result.outline).toBe('This is an outline');
            expect(result.sorttitle).toBe('Sort Title');
            expect(result.runtime).toBe('120');
            expect(result.studio).toBe('Test Studio');
            expect(result.director).toBe('Test Director');
            expect(result.original_filename).toBe('D:/test/original.mkv');
            expect(result.description).toBe('This is a description');
        });
    });

    // ========================================================================
    // readMovieNfo 测试 - 集成xml2js解析
    // ========================================================================
    describe('readMovieNfo with xml2js', () => {
        test('SVC-XML2JS-009: 从文件读取并解析NFO', async () => {
            const movieDir = path.join(testDataDir, 'ReadNfoTest');
            fs.mkdirSync(movieDir);

            const nfoContent = `<?xml version="1.0" encoding="UTF-8"?>
<movie>
    <id>read-test-id</id>
    <title>Read Test Movie</title>
    <year>2024</year>
    <tag>action</tag>
    <tag>comedy</tag>
    <actor><name>Star Actor</name></actor>
    <fileinfo>
        <streamdetails>
            <video>
                <codec>H264</codec>
                <width>1280</width>
                <height>720</height>
            </video>
        </streamdetails>
    </fileinfo>
</movie>`;

            fs.writeFileSync(path.join(movieDir, 'movie.nfo'), nfoContent);

            const result = await service.readMovieNfo(movieDir);

            expect(result.id).toBe('read-test-id');
            expect(result.title).toBe('Read Test Movie');
            expect(result.year).toBe('2024');
            expect(result.tag).toEqual(['action', 'comedy']);
            expect(result.actors).toEqual(['Star Actor']);
            expect(result.videoCodec).toBe('H264');
            expect(result.videoWidth).toBe('1280');
            expect(result.videoHeight).toBe('720');
        });

        test('SVC-XML2JS-010: 读取不存在的文件返回null', async () => {
            const result = await service.readMovieNfo(path.join(testDataDir, 'notexists'));
            expect(result).toBeNull();
        });
    });

    // ========================================================================
    // generateMovieNfo 测试 - 使用xml2js生成
    // ========================================================================
    describe('generateMovieNfo with xml2js', () => {
        test('SVC-XML2JS-011: 生成包含fileset的NFO', () => {
            const data = {
                id: 'fileset-gen-test',
                title: 'Fileset Generate Test',
                year: '2024',
                fileset: [
                    {
                        type: 'Main',
                        fullpath: 'D:/Movies/test.mp4',
                        filename: 'test.mp4',
                        videoCodec: 'H264',
                        videoWidth: '1920',
                        videoHeight: '1080',
                        videoDuration: '7200'
                    },
                    {
                        type: 'Subtitle',
                        filename: 'chinese.srt',
                        memo: 'Chinese subtitles'
                    }
                ]
            };

            const xml = service.generateMovieNfo(data);

            // Main文件的视频信息应该在movie级别
            expect(xml).toContain('<codec>H264</codec>');
            expect(xml).toContain('<width>1920</width>');
            expect(xml).toContain('<height>1080</height>');
            expect(xml).toContain('<durationinseconds>7200</durationinseconds>');

            // original_filename应该来自Main文件的fullpath
            expect(xml).toContain('<original_filename>D:/Movies/test.mp4</original_filename>');

            // 非Main文件应该在fileset中
            expect(xml).toContain('<fileset>');
            expect(xml).toContain('<type>Subtitle</type>');
            expect(xml).toContain('<memo>Chinese subtitles</memo>');
        });

        test('SVC-XML2JS-012: 生成带所有字段的完整NFO', () => {
            const data = {
                id: 'full-gen-test',
                title: 'Full Generate Test',
                year: '2024',
                outline: 'This is an outline',
                sorttitle: 'Sort Title',
                runtime: '120',
                studio: 'Test Studio',
                director: 'Test Director',
                description: 'This is a description',
                tags: ['action', 'sci-fi'],
                actors: ['Actor 1', 'Actor 2'],
                videoCodec: 'H265',
                videoWidth: '3840',
                videoHeight: '2160',
                videoDuration: '9000'
            };

            const xml = service.generateMovieNfo(data);

            expect(xml).toContain('<id>full-gen-test</id>');
            expect(xml).toContain('<title>Full Generate Test</title>');
            expect(xml).toContain('<year>2024</year>');
            expect(xml).toContain('<outline>This is an outline</outline>');
            expect(xml).toContain('<sorttitle>Sort Title</sorttitle>');
            expect(xml).toContain('<runtime>120</runtime>');
            expect(xml).toContain('<studio>Test Studio</studio>');
            expect(xml).toContain('<director>Test Director</director>');
            expect(xml).toContain('<description>This is a description</description>');
            expect(xml).toContain('<tag>action</tag>');
            expect(xml).toContain('<tag>sci-fi</tag>');
            expect(xml).toContain('<name>Actor 1</name>');
            expect(xml).toContain('<name>Actor 2</name>');
            expect(xml).toContain('<codec>H265</codec>');
            expect(xml).toContain('<width>3840</width>');
            expect(xml).toContain('<height>2160</height>');
            expect(xml).toContain('<durationinseconds>9000</durationinseconds>');
        });

        test('SVC-XML2JS-013: 生成NFO处理无视频信息的fileset', () => {
            const data = {
                title: 'No Video Info Test',
                fileset: [
                    {
                        type: 'Subtitle',
                        filename: 'chinese.srt'
                    }
                ]
            };

            const xml = service.generateMovieNfo(data);

            expect(xml).toContain('<title>No Video Info Test</title>');
            expect(xml).not.toContain('<fileinfo>');
            expect(xml).toContain('<fileset>');
        });

        test('SVC-XML2JS-014: 生成NFO处理仅有部分视频信息', () => {
            const data = {
                title: 'Partial Video Test',
                videoCodec: 'H264',
                videoWidth: '1920'
                // 没有videoHeight和videoDuration
            };

            const xml = service.generateMovieNfo(data);

            expect(xml).toContain('<codec>H264</codec>');
            expect(xml).toContain('<width>1920</width>');
            expect(xml).not.toContain('<height>');
            expect(xml).not.toContain('<durationinseconds>');
        });
    });

    // ========================================================================
    // XML转义测试
    // ========================================================================
    describe('XML escaping in generateMovieNfo', () => {
        test('SVC-XML2JS-015: 转义XML特殊字符', () => {
            const data = { title: 'Title with & < > characters' };
            const xml = service.generateMovieNfo(data);

            expect(xml).toContain('&amp;');
            expect(xml).toContain('&lt;');
            expect(xml).toContain('&gt;');
        });

        test('SVC-XML2JS-016: 转义中文和特殊符号', () => {
            const data = { title: '电影标题：星际穿越' };
            const xml = service.generateMovieNfo(data);

            expect(xml).toContain('<title>电影标题：星际穿越</title>');
        });

        test('SVC-XML2JS-017: 转义单引号', () => {
            const data = { title: "Title with 'single quotes'" };
            const xml = service.generateMovieNfo(data);

            expect(xml).toContain("'single quotes'");
        });
    });

    // ========================================================================
    // 往返测试 - 解析后生成，生成后解析
    // ========================================================================
    describe('Round-trip parsing and generating', () => {
        test('SVC-XML2JS-018: 解析后生成保持数据完整性', async () => {
            const originalXml = `<?xml version="1.0" encoding="UTF-8"?>
<movie>
    <id>round-trip-test</id>
    <title>Round Trip Test</title>
    <year>2024</year>
    <tag>action</tag>
    <tag>drama</tag>
    <actor><name>Actor One</name></actor>
    <actor><name>Actor Two</name></actor>
    <fileinfo>
        <streamdetails>
            <video>
                <codec>H265</codec>
                <width>1920</width>
                <height>1080</height>
                <durationinseconds>7200</durationinseconds>
            </video>
        </streamdetails>
    </fileinfo>
</movie>`;

            // 解析
            const parsed = await service._parseMovieNfoXmlAsync(originalXml);

            // 生成
            const generatedXml = service.generateMovieNfo(parsed);

            // 再次解析
            const reParsed = await service._parseMovieNfoXmlAsync(generatedXml);

            // 验证数据完整性
            expect(reParsed.id).toBe(parsed.id);
            expect(reParsed.title).toBe(parsed.title);
            expect(reParsed.year).toBe(parsed.year);
            expect(reParsed.tag).toEqual(parsed.tag);
            expect(reParsed.actors).toEqual(parsed.actors);
            expect(reParsed.videoCodec).toBe(parsed.videoCodec);
            expect(reParsed.videoWidth).toBe(parsed.videoWidth);
            expect(reParsed.videoHeight).toBe(parsed.videoHeight);
            expect(reParsed.videoDuration).toBe(parsed.videoDuration);
        });
    });

    // ========================================================================
    // writeMovieNfo 测试 - 集成xml2js
    // ========================================================================
    describe('writeMovieNfo with xml2js', () => {
        test('SVC-XML2JS-019: 写入NFO文件', async () => {
            const movieDir = path.join(testDataDir, 'WriteNfoTest');
            fs.mkdirSync(movieDir);

            const movieData = {
                title: 'Write Test Movie',
                year: '2024',
                director: 'Test Director',
                tags: ['action', 'comedy'],
                actors: ['Actor 1', 'Actor 2'],
                videoCodec: 'H264',
                videoWidth: '1920',
                videoHeight: '1080'
            };

            await service.writeMovieNfo(movieDir, movieData);

            const nfoPath = path.join(movieDir, 'movie.nfo');
            expect(fs.existsSync(nfoPath)).toBe(true);

            const content = fs.readFileSync(nfoPath, 'utf-8');
            expect(content).toContain('<title>Write Test Movie</title>');
            expect(content).toContain('<year>2024</year>');
            expect(content).toContain('<tag>action</tag>');
            expect(content).toContain('<tag>comedy</tag>');
            expect(content).toContain('<name>Actor 1</name>');
            expect(content).toContain('<name>Actor 2</name>');
        });
    });

    // ========================================================================
    // 辅助方法测试
    // ========================================================================
    describe('Helper methods', () => {
        test('SVC-XML2JS-020: _separateMainFile分离Main和非Main文件', () => {
            const movieData = {
                fileset: [
                    { type: 'Main', filename: 'main.mp4' },
                    { type: 'Subtitle', filename: 'sub.srt' },
                    { type: 'Main', filename: 'another.mp4' },
                    { type: 'Extra', filename: 'extra.txt' }
                ]
            };

            const { mainFile, nonMainFiles } = service._separateMainFile(movieData);

            expect(mainFile.filename).toBe('main.mp4');
            expect(nonMainFiles.length).toBe(3);
            expect(nonMainFiles[0].filename).toBe('sub.srt');
            expect(nonMainFiles[1].filename).toBe('another.mp4');
            expect(nonMainFiles[2].filename).toBe('extra.txt');
        });

        test('SVC-XML2JS-021: _separateMainFile处理空fileset', () => {
            const { mainFile, nonMainFiles } = service._separateMainFile({});

            expect(mainFile).toBeNull();
            expect(nonMainFiles).toEqual([]);
        });

        test('SVC-XML2JS-022: _hasVideoInfo检测完整视频信息', () => {
            const complete = {
                videoCodec: 'H264',
                videoWidth: '1920',
                videoHeight: '1080',
                videoDuration: '7200'
            };

            const partial = {
                videoCodec: 'H264',
                videoWidth: '1920'
            };

            const empty = {
                videoCodec: '',
                videoWidth: '',
                videoHeight: '',
                videoDuration: ''
            };

            expect(service._hasVideoInfo(complete)).toBe(true);
            expect(service._hasVideoInfo(partial)).toBe(true);
            expect(service._hasVideoInfo(empty)).toBe(false);
        });

        test('SVC-XML2JS-023: _sanitizeValue处理各种值', () => {
            expect(service._sanitizeValue(undefined)).toBe('');
            expect(service._sanitizeValue(null)).toBe('');
            expect(service._sanitizeValue('')).toBe('');
            expect(service._sanitizeValue('normal')).toBe('normal');
            expect(service._sanitizeValue(123)).toBe('123');
            expect(service._sanitizeValue(0)).toBe('0');
        });
    });
});

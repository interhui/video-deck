/**
 * LibraryUtils 单元测试
 *
 * 覆盖：
 *   - computeLibraryPaths（路径派生）
 *   - applyLibraryPathsToServices（服务重定向）
 *   - prepareLibraryDir / prepareLibraryDirSync（目录与配置文件初始化）
 */
const path = require('path');
const fs = require('fs');
const os = require('os');
const {
    computeLibraryPaths,
    applyLibraryPathsToServices,
    prepareLibraryDir,
    prepareLibraryDirSync,
    PATH_CONFIG_FILES,
    REQUIRED_SUBDIRS,
    INIT_CONFIG_FILES
} = require('../../src/main/utils/LibraryUtils');

// 一次性 build 一个 fakeFileService，避免每次 prepareLibraryDir 测试都重复构造
function makeFakeFileService() {
    const ensured = new Set();
    const written = new Map();
    return {
        ensured,
        written,
        ensureDir: jest.fn(async (p) => {
            if (!ensured.has(p)) {
                ensured.add(p);
                fs.mkdirSync(p, { recursive: true });
            }
        }),
        fileExists: jest.fn(async (p) => fs.existsSync(p)),
        writeJson: jest.fn(async (p, content) => {
            fs.writeFileSync(p, JSON.stringify(content, null, 2), 'utf-8');
            written.set(p, content);
        })
    };
}

// build 一个最小化的 settingsService mock
function makeFakeSettingsService(dir) {
    return {
        getLibraryDir: jest.fn(() => dir || '')
    };
}

describe('LibraryUtils', () => {
    let workDir;
    let libDir;

    beforeEach(() => {
        workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'movie-mgt-libutils-'));
        libDir = path.join(workDir, 'MyLibrary');
    });

    afterEach(() => {
        if (fs.existsSync(workDir)) {
            fs.rmSync(workDir, { recursive: true, force: true });
        }
    });

    // -----------------------------------------------------------------
    // 路径计算
    // -----------------------------------------------------------------
    describe('computeLibraryPaths', () => {
        test('LIB-UTILS-001: dir 为空时返回 4 个空字符串', () => {
            const settingsService = makeFakeSettingsService('');
            const paths = computeLibraryPaths(settingsService);
            expect(paths).toEqual({
                dir: '',
                moviesDir: '',
                actorPhotoDir: '',
                movieboxDir: ''
            });
        });

        test('LIB-UTILS-002: dir 设置后派生三个子目录', () => {
            const settingsService = makeFakeSettingsService('D:\\VideoLib\\JAV');
            const paths = computeLibraryPaths(settingsService);
            expect(paths.dir).toBe('D:\\VideoLib\\JAV');
            expect(paths.moviesDir).toBe(path.join('D:\\VideoLib\\JAV', 'movies'));
            expect(paths.actorPhotoDir).toBe(path.join('D:\\VideoLib\\JAV', 'actors'));
            expect(paths.movieboxDir).toBe(path.join('D:\\VideoLib\\JAV', 'boxes'));
        });

        test('LIB-UTILS-003: settingsService 为 null 或缺少 getLibraryDir 时安全返回空路径', () => {
            expect(computeLibraryPaths(null)).toEqual({
                dir: '', moviesDir: '', actorPhotoDir: '', movieboxDir: ''
            });
            expect(computeLibraryPaths({})).toEqual({
                dir: '', moviesDir: '', actorPhotoDir: '', movieboxDir: ''
            });
            expect(computeLibraryPaths({ getLibraryDir: 'not a function' })).toEqual({
                dir: '', moviesDir: '', actorPhotoDir: '', movieboxDir: ''
            });
        });
    });

    // -----------------------------------------------------------------
    // 服务重定向
    // -----------------------------------------------------------------
    describe('applyLibraryPathsToServices', () => {
        test('LIB-UTILS-010: dir 为空时不调用任何 setter', () => {
            const tagService = { setTagsPath: jest.fn() };
            const boxService = { setBoxesConfigPath: jest.fn() };
            applyLibraryPathsToServices({ dir: '' }, { tagService, boxService });
            expect(tagService.setTagsPath).not.toHaveBeenCalled();
            expect(boxService.setBoxesConfigPath).not.toHaveBeenCalled();
        });

        test('LIB-UTILS-011: dir 有效时为 5 个配置服务设置对应的 ${dir}/<file> 路径', () => {
            const tagService = { setTagsPath: jest.fn() };
            const categoryService = { setCategoryConfigPath: jest.fn() };
            const boxService = { setBoxesConfigPath: jest.fn() };
            const actorService = { setActorFilePath: jest.fn() };
            const movieHistoryService = { setHistoryFilePath: jest.fn() };

            applyLibraryPathsToServices({ dir: 'D:\\lib' }, {
                tagService,
                categoryService,
                boxService,
                actorService,
                movieHistoryService
            });

            expect(tagService.setTagsPath).toHaveBeenCalledWith(path.join('D:\\lib', 'tags.json'));
            expect(categoryService.setCategoryConfigPath).toHaveBeenCalledWith(path.join('D:\\lib', 'categories.json'));
            expect(boxService.setBoxesConfigPath).toHaveBeenCalledWith(path.join('D:\\lib', 'boxes.json'));
            expect(actorService.setActorFilePath).toHaveBeenCalledWith(path.join('D:\\lib', 'actor.json'));
            expect(movieHistoryService.setHistoryFilePath).toHaveBeenCalledWith(path.join('D:\\lib', 'history.json'));
        });

        test('LIB-UTILS-012: services 缺少部分方法时安全跳过', () => {
            // 只有 tagService 有 setter，其它都没有
            const tagService = { setTagsPath: jest.fn() };
            applyLibraryPathsToServices({ dir: 'D:\\lib' }, {
                tagService,
                categoryService: {},
                boxService: null,
                actorService: undefined,
                movieHistoryService: { setHistoryFilePath: 'not a function' }
            });
            // 不抛错，tagService 被调用一次
            expect(tagService.setTagsPath).toHaveBeenCalledTimes(1);
        });

        test('LIB-UTILS-013: paths 为 null 或 services 为空时安全跳过', () => {
            expect(() => applyLibraryPathsToServices(null, {})).not.toThrow();
            expect(() => applyLibraryPathsToServices(undefined, null)).not.toThrow();
        });

        test('LIB-UTILS-014: PATH_CONFIG_FILES 包含全部 5 个 JSON 名称', () => {
            expect(Object.keys(PATH_CONFIG_FILES).sort()).toEqual(
                ['actor', 'boxes', 'categories', 'history', 'tags']
            );
            for (const fileName of Object.values(PATH_CONFIG_FILES)) {
                expect(fileName.endsWith('.json')).toBe(true);
            }
        });
    });

    // -----------------------------------------------------------------
    // 目录与配置文件的初始化
    // -----------------------------------------------------------------
    describe('prepareLibraryDir', () => {
        test('LIB-UTILS-020: 在不存在的目录上创建根目录 + 3 个子目录 + 5 个配置文件', async () => {
            const result = await prepareLibraryDir(libDir);

            expect(result.dir).toBe(libDir);
            expect(result.createdDirs).toContain(libDir);
            for (const sub of REQUIRED_SUBDIRS) {
                expect(fs.existsSync(path.join(libDir, sub))).toBe(true);
            }
            expect(result.createdDirs).toEqual(expect.arrayContaining([
                path.join(libDir, 'movies'),
                path.join(libDir, 'actors'),
                path.join(libDir, 'boxes')
            ]));

            for (const cfg of INIT_CONFIG_FILES) {
                const fp = path.join(libDir, cfg.fileName);
                expect(result.createdFiles).toContain(fp);
                expect(fs.existsSync(fp)).toBe(true);
                const parsed = JSON.parse(fs.readFileSync(fp, 'utf-8'));
                expect(parsed).toBeDefined();
            }

            // 默认值检查
            expect(JSON.parse(fs.readFileSync(path.join(libDir, 'actor.json'), 'utf-8'))).toEqual({ actor: [] });
            expect(JSON.parse(fs.readFileSync(path.join(libDir, 'boxes.json'), 'utf-8'))).toEqual({ boxes: [] });
            expect(JSON.parse(fs.readFileSync(path.join(libDir, 'history.json'), 'utf-8'))).toEqual({ history: [] });
            const tags = JSON.parse(fs.readFileSync(path.join(libDir, 'tags.json'), 'utf-8'));
            expect(Array.isArray(tags)).toBe(true);
            const categories = JSON.parse(fs.readFileSync(path.join(libDir, 'categories.json'), 'utf-8'));
            expect(Array.isArray(categories.categories)).toBe(true);
        });

        test('LIB-UTILS-021: 重复调用是幂等的（已存在的目录/文件不会被覆盖）', async () => {
            const first = await prepareLibraryDir(libDir);
            expect(first.createdDirs.length).toBeGreaterThan(0);

            // 写入自定义 tags 内容，确认第二次不会覆盖
            const customTagsPath = path.join(libDir, 'tags.json');
            fs.writeFileSync(customTagsPath, JSON.stringify([{ id: 'custom', name: '自定义' }]), 'utf-8');

            const second = await prepareLibraryDir(libDir);
            expect(second.createdDirs).toEqual([]);
            expect(second.createdFiles).toEqual([]);
            expect(second.skippedFiles.length).toBe(INIT_CONFIG_FILES.length);

            const tags = JSON.parse(fs.readFileSync(customTagsPath, 'utf-8'));
            expect(tags).toEqual([{ id: 'custom', name: '自定义' }]);
        });

        test('LIB-UTILS-022: 部分存在的目录只补齐缺失的子目录和文件', async () => {
            fs.mkdirSync(libDir, { recursive: true });
            fs.mkdirSync(path.join(libDir, 'movies'), { recursive: true });
            fs.writeFileSync(path.join(libDir, 'actor.json'), JSON.stringify({ actor: [{ name: 'X' }] }), 'utf-8');

            const result = await prepareLibraryDir(libDir);

            expect(result.createdDirs).toEqual(expect.arrayContaining([
                path.join(libDir, 'actors'),
                path.join(libDir, 'boxes')
            ]));
            expect(result.createdDirs).not.toContain(path.join(libDir, 'movies'));
            expect(result.skippedFiles).toContain(path.join(libDir, 'actor.json'));
            expect(result.createdFiles).toEqual(expect.arrayContaining([
                path.join(libDir, 'boxes.json'),
                path.join(libDir, 'categories.json'),
                path.join(libDir, 'history.json'),
                path.join(libDir, 'tags.json')
            ]));

            // actor.json 保持不变
            expect(JSON.parse(fs.readFileSync(path.join(libDir, 'actor.json'), 'utf-8')))
                .toEqual({ actor: [{ name: 'X' }] });
        });

        test('LIB-UTILS-023: 路径为空或非字符串时报错', async () => {
            await expect(prepareLibraryDir('')).rejects.toThrow();
            await expect(prepareLibraryDir(null)).rejects.toThrow();
            await expect(prepareLibraryDir(undefined)).rejects.toThrow();
        });

        test('LIB-UTILS-024: 通过 fileService 注入可以工作', async () => {
            const fakeFs = makeFakeFileService();
            const result = await prepareLibraryDir(libDir, { fileService: fakeFs });
            expect(fakeFs.ensureDir).toHaveBeenCalled();
            expect(fakeFs.writeJson).toHaveBeenCalled();
            expect(result.createdFiles.length).toBe(INIT_CONFIG_FILES.length);

            // 真实磁盘上应该存在 5 个文件
            for (const cfg of INIT_CONFIG_FILES) {
                expect(fs.existsSync(path.join(libDir, cfg.fileName))).toBe(true);
            }
        });
    });

    describe('prepareLibraryDirSync', () => {
        test('LIB-UTILS-030: 同步版本行为与异步版本一致', () => {
            const result = prepareLibraryDirSync(libDir);
            expect(fs.existsSync(libDir)).toBe(true);
            for (const sub of REQUIRED_SUBDIRS) {
                expect(fs.existsSync(path.join(libDir, sub))).toBe(true);
            }
            for (const cfg of INIT_CONFIG_FILES) {
                expect(fs.existsSync(path.join(libDir, cfg.fileName))).toBe(true);
            }
            expect(result.createdDirs.length).toBeGreaterThan(0);
            expect(result.createdFiles.length).toBe(INIT_CONFIG_FILES.length);
        });

        test('LIB-UTILS-031: 同步版本对空路径抛错', () => {
            expect(() => prepareLibraryDirSync('')).toThrow();
            expect(() => prepareLibraryDirSync(null)).toThrow();
        });
    });
});
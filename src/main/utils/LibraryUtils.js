/**
 * 影视库工具集
 *
 * 把与"影视库"相关的两件事放在同一个模块：
 *   1. 路径计算与服务重定向：computeLibraryPaths / applyLibraryPathsToServices
 *      - 从 settingsService.getLibraryDir() 派生子目录路径
 *      - 把 5 个跨影视库的配置 JSON 文件重定向到 ${currentLibrary.dir}/ 之下，
 *        并清空对应服务的内存缓存。
 *   2. 目录与配置文件的初始化：prepareLibraryDir / prepareLibraryDirSync
 *      - 用户添加新库时，确保根目录、3 个子目录 (movies/actors/boxes)、
 *        5 个默认配置文件 (actor.json/boxes.json/categories.json/history.json/tags.json) 就绪。
 *
 * 模块无 Electron 依赖，主进程和 CLI 都可使用。
 */
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const HardCodeService = require('../services/HardCodeService');

// ---------------------------------------------------------------------------
// 路径计算与服务重定向
// ---------------------------------------------------------------------------

// 影视库 dir 下的 5 个配置文件名（路径映射）
const PATH_CONFIG_FILES = {
    actor: 'actor.json',
    boxes: 'boxes.json',
    categories: 'categories.json',
    history: 'history.json',
    tags: 'tags.json'
};

/**
 * 计算当前库的所有相关路径
 * @param {object} settingsService
 * @returns {{dir: string, moviesDir: string, actorPhotoDir: string, movieboxDir: string}}
 */
function computeLibraryPaths(settingsService) {
    if (!settingsService || typeof settingsService.getLibraryDir !== 'function') {
        return { dir: '', moviesDir: '', actorPhotoDir: '', movieboxDir: '' };
    }
    const dir = settingsService.getLibraryDir();
    if (!dir) {
        return { dir: '', moviesDir: '', actorPhotoDir: '', movieboxDir: '' };
    }
    return {
        dir,
        moviesDir: path.join(dir, 'movies'),
        actorPhotoDir: path.join(dir, 'actors'),
        movieboxDir: path.join(dir, 'boxes')
    };
}

/**
 * 将当前库的 dir 应用到 5 个配置服务上，并清空它们的内存缓存。
 * 当 dir 为空（库尚未配置）时直接返回，不修改服务，让它们继续使用内存中的默认值。
 *
 * @param {{dir: string}} paths - 通常是 computeLibraryPaths() 的返回值
 * @param {object} services - { tagService, categoryService, boxService, actorService, movieHistoryService }
 */
function applyLibraryPathsToServices(paths, services) {
    if (!paths || !paths.dir) {
        return;
    }
    const s = services || {};
    const dir = paths.dir;

    if (s.tagService && typeof s.tagService.setTagsPath === 'function') {
        s.tagService.setTagsPath(path.join(dir, PATH_CONFIG_FILES.tags));
    }
    if (s.categoryService && typeof s.categoryService.setCategoryConfigPath === 'function') {
        s.categoryService.setCategoryConfigPath(path.join(dir, PATH_CONFIG_FILES.categories));
    }
    if (s.boxService && typeof s.boxService.setBoxesConfigPath === 'function') {
        s.boxService.setBoxesConfigPath(path.join(dir, PATH_CONFIG_FILES.boxes));
    }
    if (s.actorService && typeof s.actorService.setActorFilePath === 'function') {
        s.actorService.setActorFilePath(path.join(dir, PATH_CONFIG_FILES.actor));
    }
    if (s.movieHistoryService && typeof s.movieHistoryService.setHistoryFilePath === 'function') {
        s.movieHistoryService.setHistoryFilePath(path.join(dir, PATH_CONFIG_FILES.history));
    }
}

// ---------------------------------------------------------------------------
// 目录与配置文件的初始化
// ---------------------------------------------------------------------------

// 影视库根目录下必须存在的 3 个子目录
const REQUIRED_SUBDIRS = ['movies', 'actors', 'boxes'];

// 5 个配置文件的默认内容（用于首次创建时写入）
const INIT_CONFIG_FILES = [
    {
        fileName: 'actor.json',
        defaultContent: () => ({ actor: [] })
    },
    {
        fileName: 'boxes.json',
        defaultContent: () => ({ boxes: [] })
    },
    {
        fileName: 'categories.json',
        defaultContent: (hardCode) => ({
            categories: hardCode.getDefaultCategories(),
            predefinedTags: [],
            customTags: []
        })
    },
    {
        fileName: 'history.json',
        defaultContent: () => ({ history: [] })
    },
    {
        fileName: 'tags.json',
        defaultContent: (hardCode) => hardCode.getDefaultTags()
    }
];

/**
 * 从 categories.json 中读取分类 ID 列表。
 * 解析失败或文件不存在时返回空数组（不抛错），让上游决定如何降级。
 * @param {string} filePath
 * @returns {Array<{id: string}>}
 */
function readCategoryIdsFromFile(filePath) {
    try {
        if (!filePath || !fsSync.existsSync(filePath)) {
            return [];
        }
        const raw = fsSync.readFileSync(filePath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (!parsed || !Array.isArray(parsed.categories)) {
            return [];
        }
        return parsed.categories.filter(c => c && typeof c.id === 'string' && c.id.trim());
    } catch (error) {
        console.error('[LibraryUtils] Failed to read categories.json:', error.message || error);
        return [];
    }
}

/**
 * 同步版本：确保 moviesDir 下存在以每个分类 ID 命名的子目录。
 * 已存在的目录跳过；新建的目录路径记录到 result.createdDirs。
 * @param {string} moviesDir
 * @param {string} categoriesFilePath
 * @param {{createdDirs: string[]}} result
 */
function ensureCategoryDirsSync(moviesDir, categoriesFilePath, result) {
    if (!moviesDir || !categoriesFilePath) {
        return;
    }
    const categories = readCategoryIdsFromFile(categoriesFilePath);
    for (const cat of categories) {
        const categoryDir = path.join(moviesDir, cat.id.trim());
        if (fsSync.existsSync(categoryDir)) {
            continue;
        }
        try {
            fsSync.mkdirSync(categoryDir, { recursive: true });
            if (result) {
                result.createdDirs.push(categoryDir);
            }
        } catch (error) {
            console.error(`[LibraryUtils] Failed to create category dir ${categoryDir}:`, error.message || error);
        }
    }
}

/**
 * 确保 library 目录及子目录、5 个配置文件就绪。
 * @param {string} dir - 影视库根目录
 * @param {object} [opts]
 * @param {object} [opts.fileService] - 可选 FileService 实例；不传则内部使用 fs.promises
 * @returns {Promise<{dir: string, createdDirs: string[], createdFiles: string[], skippedFiles: string[]}>}
 */
async function prepareLibraryDir(dir, opts = {}) {
    if (!dir || typeof dir !== 'string' || !dir.trim()) {
        throw new Error('影视库目录不能为空');
    }
    const target = dir.trim();
    const fsPromises = opts.fileService ? null : fs;
    const ensureDir = async (p) => {
        if (opts.fileService) {
            await opts.fileService.ensureDir(p);
        } else {
            await fsPromises.mkdir(p, { recursive: true });
        }
    };
    const fileExists = async (p) => {
        if (opts.fileService) {
            return opts.fileService.fileExists(p);
        }
        try {
            await fsPromises.access(p);
            return true;
        } catch {
            return false;
        }
    };
    const writeFile = async (p, content) => {
        if (opts.fileService) {
            await opts.fileService.writeJson(p, content);
        } else {
            await fsPromises.writeFile(p, JSON.stringify(content, null, 2), 'utf-8');
        }
    };

    const result = {
        dir: target,
        createdDirs: [],
        createdFiles: [],
        skippedFiles: []
    };

    // 1) 根目录
    const rootExists = await fileExists(target);
    if (!rootExists) {
        await ensureDir(target);
        result.createdDirs.push(target);
    }

    // 2) 三个子目录
    for (const sub of REQUIRED_SUBDIRS) {
        const subPath = path.join(target, sub);
        if (!(await fileExists(subPath))) {
            await ensureDir(subPath);
            result.createdDirs.push(subPath);
        }
    }

    // 3) 5 个配置文件（缺失时按默认内容创建）
    const hardCode = new HardCodeService();
    for (const cfg of INIT_CONFIG_FILES) {
        const filePath = path.join(target, cfg.fileName);
        if (await fileExists(filePath)) {
            result.skippedFiles.push(filePath);
            continue;
        }
        const content = cfg.defaultContent(hardCode);
        await writeFile(filePath, content);
        result.createdFiles.push(filePath);
    }

    // 4) 根据 categories.json 中的分类 ID，在 moviesDir 下创建对应的分类子目录
    const moviesDir = path.join(target, 'movies');
    const categoriesFilePath = path.join(target, PATH_CONFIG_FILES.categories);
    if (await fileExists(moviesDir)) {
        const categories = readCategoryIdsFromFile(categoriesFilePath);
        for (const cat of categories) {
            const categoryDir = path.join(moviesDir, cat.id.trim());
            if (!(await fileExists(categoryDir))) {
                await ensureDir(categoryDir);
                result.createdDirs.push(categoryDir);
            }
        }
    }

    return result;
}

/**
 * 同步版本：在需要立即返回结果时使用（CLI 启动初始化）。
 * @param {string} dir
 * @returns {{dir: string, createdDirs: string[], createdFiles: string[], skippedFiles: string[]}}
 */
function prepareLibraryDirSync(dir) {
    if (!dir || typeof dir !== 'string' || !dir.trim()) {
        throw new Error('影视库目录不能为空');
    }
    const target = dir.trim();
    const result = {
        dir: target,
        createdDirs: [],
        createdFiles: [],
        skippedFiles: []
    };

    if (!fsSync.existsSync(target)) {
        fsSync.mkdirSync(target, { recursive: true });
        result.createdDirs.push(target);
    }

    for (const sub of REQUIRED_SUBDIRS) {
        const subPath = path.join(target, sub);
        if (!fsSync.existsSync(subPath)) {
            fsSync.mkdirSync(subPath, { recursive: true });
            result.createdDirs.push(subPath);
        }
    }

    const hardCode = new HardCodeService();
    for (const cfg of INIT_CONFIG_FILES) {
        const filePath = path.join(target, cfg.fileName);
        if (fsSync.existsSync(filePath)) {
            result.skippedFiles.push(filePath);
            continue;
        }
        const content = cfg.defaultContent(hardCode);
        fsSync.writeFileSync(filePath, JSON.stringify(content, null, 2), 'utf-8');
        result.createdFiles.push(filePath);
    }

    // 根据 categories.json 中的分类 ID，在 moviesDir 下创建对应的分类子目录
    const moviesDir = path.join(target, 'movies');
    const categoriesFilePath = path.join(target, PATH_CONFIG_FILES.categories);
    if (fsSync.existsSync(moviesDir)) {
        ensureCategoryDirsSync(moviesDir, categoriesFilePath, result);
    }

    return result;
}

module.exports = {
    // 路径计算与服务重定向
    computeLibraryPaths,
    applyLibraryPathsToServices,
    PATH_CONFIG_FILES,
    // 目录与配置文件初始化
    prepareLibraryDir,
    prepareLibraryDirSync,
    REQUIRED_SUBDIRS,
    INIT_CONFIG_FILES
};
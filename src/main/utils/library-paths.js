/**
 * 影视库路径辅助工具
 *
 * 负责两件事：
 *   1. 从 settingsService.getLibraryDir() 派生 电影/演员照片/收藏夹 三个子目录路径。
 *   2. 把 5 个跨影视库的配置 JSON 文件（actor/boxes/categories/history/tags）
 *      重定向到 ${currentLibrary.dir}/ 之下，并清空对应服务的内存缓存。
 *
 * 这两个函数无 Electron 依赖，可以同时在主进程和 CLI 中使用。
 */
const path = require('path');

// 影视库 dir 下的 5 个配置文件名
const CONFIG_FILES = {
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
        s.tagService.setTagsPath(path.join(dir, CONFIG_FILES.tags));
    }
    if (s.categoryService && typeof s.categoryService.setCategoryConfigPath === 'function') {
        s.categoryService.setCategoryConfigPath(path.join(dir, CONFIG_FILES.categories));
    }
    if (s.boxService && typeof s.boxService.setBoxesConfigPath === 'function') {
        s.boxService.setBoxesConfigPath(path.join(dir, CONFIG_FILES.boxes));
    }
    if (s.actorService && typeof s.actorService.setActorFilePath === 'function') {
        s.actorService.setActorFilePath(path.join(dir, CONFIG_FILES.actor));
    }
    if (s.movieHistoryService && typeof s.movieHistoryService.setHistoryFilePath === 'function') {
        s.movieHistoryService.setHistoryFilePath(path.join(dir, CONFIG_FILES.history));
    }
}

module.exports = {
    computeLibraryPaths,
    applyLibraryPathsToServices,
    CONFIG_FILES
};
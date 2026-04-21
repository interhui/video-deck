/**
 * 文件系统服务
 * 负责所有文件系统的操作
 */
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const xml2js = require('xml2js');

// ============================================================================
// XML解析与生成配置
// ============================================================================

/**
 * xml2js解析器配置
 * explicitArray: false - 确保单个子元素不放在数组中
 * mergeAttrs: true - 将属性合并到对象中
 * normalizeTags: true - 将标签名转为小写，便于字段匹配
 * 验证: 测试用例 SVC-FILE-013 至 SVC-FILE-022
 */
const XML_PARSER_OPTIONS = {
    explicitArray: false,      // 不将单个元素包装成数组，便于访问
    mergeAttrs: true,          // 合并属性到对象中
    trim: true,                // 去除文本值两端的空白字符
    normalizeTags: true,       // 将标签名转为小写，确保与字段名匹配
    strict: false              // 允许非严格XML解析，提高容错性
};

/**
 * xml2js生成器配置
 * xmldec: 自定义XML声明头
 * headless: true - 不在根元素前添加额外换行
 * indent: '    ' - 使用4空格缩进
 * 验证: 测试用例 SVC-FILE-017 至 SVC-FILE-020
 */
const XML_BUILDER_OPTIONS = {
    xmldec: {
        version: '1.0',
        encoding: 'UTF-8',
        standalone: true
    },
    headless: true,            // 不在XML声明后添加额外换行
    indent: '    ',             // 4空格缩进
    newline: '\n'               // 换行符
};

/**
 * NFO电影对象中支持的所有简单文本字段列表
 * 这些字段在NFO XML中以<field>value</field>形式存储
 * 验证: 测试用例 SVC-FILE-013, SVC-FILE-014
 */
const NFO_TEXT_FIELDS = [
    'id',
    'title',
    'year',
    'outline',
    'sorttitle',
    'runtime',
    'studio',
    'director',
    'original_filename',
    'description'
];

/**
 * 从NFO对象中提取的顶级字段（不出现在生成逻辑中）
 * 这些字段在generateMovieNfo中需要特殊处理
 */
const NFO_INTERNAL_FIELDS = [
    'tag',
    'actors',
    'fileinfo',
    'fileset',
    'videoCodec',
    'videoWidth',
    'videoHeight',
    'videoDuration'
];

class FileService {
    constructor() {
        this.baseDir = path.join(__dirname, '..', '..');
    }

    /**
     * 获取指定目录下所有分类文件夹名称
     * @param {string} baseDir - 基础目录路径
     * @returns {Promise<string[]>} 返回文件夹名称数组
     */
    async getCategoryFolders(baseDir) {
        try {
            const fullPath = path.resolve(baseDir);
            const exists = await this.fileExists(fullPath);
            if (!exists) {
                return [];
            }

            const entries = await fs.readdir(fullPath, { withFileTypes: true });
            const folders = entries
                .filter(entry => entry.isDirectory())
                .map(entry => entry.name);

            return folders;
        } catch (error) {
            console.error('Error getting category folders:', error);
            throw error;
        }
    }

    /**
     * 获取指定目录下所有电影文件夹
     * @param {string} categoryDir - 分类目录路径
     * @returns {Promise<object>} 返回 {folderName: folderPath} 对象
     */
    async getMovieFolders(categoryDir) {
        try {
            const fullPath = path.resolve(categoryDir);
            const exists = await this.fileExists(fullPath);
            if (!exists) {
                return {};
            }

            const entries = await fs.readdir(fullPath, { withFileTypes: true });
            const movieFolders = {};

            for (const entry of entries) {
                if (entry.isDirectory()) {
                    movieFolders[entry.name] = path.join(fullPath, entry.name);
                }
            }

            return movieFolders;
        } catch (error) {
            console.error('Error getting movie folders:', error);
            throw error;
        }
    }

    /**
     * 读取 NFO 文件内容（XML格式）
     * @param {string} moviePath - 电影文件夹路径
     * @param {boolean} isMovieNfo - 是否强制读取movie.nfo文件（保持向后兼容）
     * 
     * @returns {Promise<object>} 返回电影信息对象
     */
    async readMovieNfo(moviePath, isMovieNfo = true) {
        try {
            const movieNfoPath = isMovieNfo ? path.join(moviePath, 'movie.nfo') : moviePath;
            const exists = await this.fileExists(movieNfoPath);
            if (!exists) {
                return null;
            }

            const content = await fs.readFile(movieNfoPath, 'utf-8');
            return await this.parseMovieNfo(content);
        } catch (error) {
            console.error('Error reading movie.nfo:', error);
            throw error;
        }
    }

    async parseMovieNfo(xmlContent) {
        /**
         * 将xml2js回调结果转换为Promise
         * @param {string} xml - XML字符串
         * @returns {Promise<object>} 解析后的对象
         */
        const parseXmlToObject = (xml) => {
            return new Promise((resolve, reject) => {
                xml2js.parseString(xml, XML_PARSER_OPTIONS, (err, result) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(result);
                    }
                });
            });
        };

        // Step 1: 使用xml2js解析XML为JS对象
        const parsedResult = await parseXmlToObject(xmlContent);

        // Step 2: 安全获取movie根节点
        const movieNode = parsedResult.movie;
        if (!movieNode) {
            return {};
        }

        // Step 3: 构建返回对象
        const movie = {};

        // 3.1 解析简单文本字段
        for (const field of NFO_TEXT_FIELDS) {
            if (movieNode[field] !== undefined && movieNode[field] !== null) {
                const fieldValue = this._extractTextValue(movieNode[field]);
                if (fieldValue) {
                    movie[field] = fieldValue;
                }
            }
        }

        // 3.2 解析标签列表（可能有多个<tag>）
        movie.tag = this._extractTags(movieNode);

        // 3.3 解析演员列表（从<actor><name>结构中提取）
        movie.actors = this._extractActors(movieNode);

        // 3.4 解析视频信息（从fileinfo中提取）
        const videoInfo = this._extractVideoInfo(movieNode);
        Object.assign(movie, videoInfo);

        // 3.5 解析fileset（关联文件列表）
        movie.fileset = this._extractFileset(movieNode);

        return movie;
    }

    /**
     * 从movie节点中提取标签列表
     * @private
     * @param {object} movieNode - 解析后的movie节点对象
     * @returns {string[]} 标签数组
     */
    _extractTags(movieNode) {
        const tags = [];

        // 处理tag字段（可能是字符串、字符串数组或对象）
        const tagField = movieNode.tag;
        if (tagField === undefined || tagField === null) {
            return tags;
        }

        // 如果是数组，直接收集所有标签
        if (Array.isArray(tagField)) {
            for (const tagItem of tagField) {
                const tagValue = this._extractTextValue(tagItem);
                if (tagValue) {
                    tags.push(tagValue);
                }
            }
        } else {
            // 单个标签
            const tagValue = this._extractTextValue(tagField);
            if (tagValue) {
                tags.push(tagValue);
            }
        }

        return tags;
    }

    /**
     * 从movie节点中提取演员列表
     * @private
     * @param {object} movieNode - 解析后的movie节点对象
     * @returns {string[]} 演员姓名数组
     */
    _extractActors(movieNode) {
        const actors = [];

        // 处理actor字段（可能是对象或对象数组）
        const actorField = movieNode.actor;
        if (actorField === undefined || actorField === null) {
            return actors;
        }

        // 获取所有actor节点的列表
        const actorList = Array.isArray(actorField) ? actorField : [actorField];

        for (const actorNode of actorList) {
            if (typeof actorNode !== 'object') {
                continue;
            }

            // 从actor节点中提取所有<name>子元素
            const nameField = actorNode.name;
            if (nameField === undefined || nameField === null) {
                continue;
            }

            // name可能是单个字符串或数组
            if (Array.isArray(nameField)) {
                for (const nameItem of nameField) {
                    const nameValue = this._extractTextValue(nameItem);
                    if (nameValue) {
                        actors.push(nameValue);
                    }
                }
            } else {
                const nameValue = this._extractTextValue(nameField);
                if (nameValue) {
                    actors.push(nameValue);
                }
            }
        }

        return actors;
    }

    /**
     * 从movie节点中提取视频信息
     * @private
     * @param {object} movieNode - 解析后的movie节点对象
     * @returns {object} 包含videoCodec, videoWidth, videoHeight, videoDuration的对象
     */
    _extractVideoInfo(movieNode) {
        const videoInfo = {
            videoCodec: undefined,
            videoWidth: undefined,
            videoHeight: undefined,
            videoDuration: undefined,
            fileinfo: undefined
        };

        // 获取fileinfo节点
        const fileinfoNode = movieNode.fileinfo;
        if (!fileinfoNode) {
            return videoInfo;
        }

        // 保存原始fileinfo字符串（如果有）
        if (typeof fileinfoNode === 'string') {
            videoInfo.fileinfo = fileinfoNode;
        }

        // 导航到 video 节点: fileinfo > streamdetails > video
        let videoNode = null;

        // 处理不同的结构形式
        if (fileinfoNode.streamdetails) {
            const streamdetails = fileinfoNode.streamdetails;
            // streamdetails.video 可能是单个对象或数组
            if (streamdetails.video) {
                videoNode = Array.isArray(streamdetails.video)
                    ? streamdetails.video[0]
                    : streamdetails.video;
            }
        }

        if (!videoNode) {
            return videoInfo;
        }

        // 提取视频属性
        if (videoNode.codec !== undefined && videoNode.codec !== null) {
            const codecValue = this._extractTextValue(videoNode.codec);
            if (codecValue) {
                videoInfo.videoCodec = codecValue.toUpperCase();
            }
        }

        if (videoNode.width !== undefined && videoNode.width !== null) {
            const widthValue = this._extractTextValue(videoNode.width);
            if (widthValue) {
                videoInfo.videoWidth = String(widthValue);
            }
        }

        if (videoNode.height !== undefined && videoNode.height !== null) {
            const heightValue = this._extractTextValue(videoNode.height);
            if (heightValue) {
                videoInfo.videoHeight = String(heightValue);
            }
        }

        if (videoNode.durationinseconds !== undefined && videoNode.durationinseconds !== null) {
            const durationValue = this._extractTextValue(videoNode.durationinseconds);
            if (durationValue) {
                videoInfo.videoDuration = String(durationValue);
            }
        }

        return videoInfo;
    }

    /**
     * 从movie节点中提取fileset（关联文件列表）
     * @private
     * @param {object} movieNode - 解析后的movie节点对象
     * @returns {object[]} 文件数组，每项包含filename, fullpath, type, videoCodec, videoWidth, videoHeight, videoDuration, memo
     */
    _extractFileset(movieNode) {
        const fileset = [];

        // 获取fileset节点
        const filesetNode = movieNode.fileset;
        if (!filesetNode) {
            return fileset;
        }

        // 获取所有file节点的列表
        const fileList = filesetNode.file;
        if (!fileList) {
            return fileset;
        }

        // 确保是数组形式
        const fileArray = Array.isArray(fileList) ? fileList : [fileList];

        for (const fileNode of fileArray) {
            if (typeof fileNode !== 'object') {
                continue;
            }

            const file = {};

            // 提取各字段
            if (fileNode.filename !== undefined && fileNode.filename !== null) {
                const value = this._extractTextValue(fileNode.filename);
                if (value) file.filename = value;
            }

            if (fileNode.fullpath !== undefined && fileNode.fullpath !== null) {
                const value = this._extractTextValue(fileNode.fullpath);
                if (value) file.fullpath = value;
            }

            if (fileNode.type !== undefined && fileNode.type !== null) {
                const value = this._extractTextValue(fileNode.type);
                if (value) file.type = value;
            }

            if (fileNode.videocodec !== undefined && fileNode.videocodec !== null) {
                const value = this._extractTextValue(fileNode.videocodec);
                if (value) file.videoCodec = value.toUpperCase();
            }

            if (fileNode.videowidth !== undefined && fileNode.videowidth !== null) {
                const value = this._extractTextValue(fileNode.videowidth);
                if (value) file.videoWidth = String(value);
            }

            if (fileNode.videoheight !== undefined && fileNode.videoheight !== null) {
                const value = this._extractTextValue(fileNode.videoheight);
                if (value) file.videoHeight = String(value);
            }

            if (fileNode.videoduration !== undefined && fileNode.videoduration !== null) {
                const value = this._extractTextValue(fileNode.videoduration);
                if (value) file.videoDuration = String(value);
            }

            if (fileNode.memo !== undefined && fileNode.memo !== null) {
                const value = this._extractTextValue(fileNode.memo);
                if (value) file.memo = value;
            }

            fileset.push(file);
        }

        return fileset;
    }

    /**
     * 从xml2js解析的节点中提取文本值
     * xml2js在某些情况下会将文本值包装在对象中（如{_:'text'}或{'$':{...},'_':'text'}）
     * @private
     * @param {any} node - xml2js解析的节点
     * @returns {string} 提取的文本值
     */
    _extractTextValue(node) {
        if (node === undefined || node === null) {
            return '';
        }

        // 如果是字符串，直接返回
        if (typeof node === 'string') {
            return node;
        }

        // 如果是数字，转换为字符串
        if (typeof node === 'number') {
            return String(node);
        }

        // 如果是对象，尝试提取文本值
        if (typeof node === 'object') {
            // 常见格式：{_: 'text'} 或 { '$': {...}, '_': 'text' }
            if (node._ !== undefined) {
                return String(node._);
            }
            // 也可能有 value 属性
            if (node.value !== undefined) {
                return String(node.value);
            }
        }

        return '';
    }

    /**
     * 写入 movie.nfo 文件（XML格式）
     * @param {string} moviePath - 电影文件夹路径
     * @param {object} movieData - 电影数据对象
     */
    async writeMovieNfo(moviePath, movieData) {
        try {
            const movieNfoPath = path.join(moviePath, 'movie.nfo');
            const xmlContent = this.generateMovieNfo(movieData);
            await fs.writeFile(movieNfoPath, xmlContent, 'utf-8');
        } catch (error) {
            console.error('Error writing movie.nfo:', error);
            throw error;
        }
    }

    /**
     * 使用xml2js生成movie.nfo XML内容
     *
     * @description
     * 该方法将电影数据对象转换为NFO格式的XML字符串。
     * 生成的XML包含以下结构：
     * - 简单文本字段：id, title, year, outline, sorttitle, runtime, studio, director, original_filename, description
     * - 标签：多个<tag>元素
     * - 演员：<actor><name>结构
     * - 视频信息：<fileinfo><streamdetails><video>结构
     * - 文件集：<fileset><file>结构
     *
     * 特殊处理逻辑：
     * - 如果fileset中存在Main类型的文件，其视频信息会被提取到movie级别的fileinfo中
     * - original_filename优先使用Main文件的fullpath
     * - 非Main类型的文件会保留在fileset中
     *
     * @param {object} movieData - 电影数据对象，支持的字段：
     * @param {string} [movieData.id] - 电影ID
     * @param {string} [movieData.title] - 电影标题
     * @param {string} [movieData.year] - 发行年份
     * @param {string} [movieData.outline] - 电影概述
     * @param {string} [movieData.sorttitle] - 排序标题
     * @param {string} [movieData.runtime] - 运行时长(分钟)
     * @param {string} [movieData.studio] - 制作公司
     * @param {string} [movieData.director] - 导演
     * @param {string} [movieData.original_filename] - 原始文件名
     * @param {string} [movieData.description] - 详细描述
     * @param {string[]} [movieData.tags] - 标签数组（也支持movieData.tag）
     * @param {string[]} [movieData.actors] - 演员姓名数组
     * @param {string} [movieData.videoCodec] - 视频编码
     * @param {string} [movieData.videoWidth] - 视频宽度
     * @param {string} [movieData.videoHeight] - 视频高度
     * @param {string} [movieData.videoDuration] - 视频时长(秒)
     * @param {string} [movieData.fileinfo] - 原始fileinfo字符串（当没有独立视频字段时使用）
     * @param {object[]} [movieData.fileset] - 文件集数组，每项包含filename, fullpath, type, videoCodec, videoWidth, videoHeight, videoDuration, memo
     * @returns {string} NFO格式的XML内容字符串
     *
     * @example
     * const movieData = {
     *     title: '星际穿越',
     *     year: '2014',
     *     director: '克里斯托弗·诺兰',
     *     actors: ['马修·麦康纳', '安妮·海瑟薇'],
     *     tags: ['科幻', '冒险'],
     *     videoCodec: 'H264',
     *     videoWidth: '1920',
     *     videoHeight: '1080'
     * };
     * const xml = fileService.generateMovieNfo(movieData);
     */
    generateMovieNfo(movieData) {
        // Step 1: 从fileset中分离Main文件和非Main文件
        const { mainFile, nonMainFiles } = this._separateMainFile(movieData);

        // Step 2: 构建movie对象的JS结构
        const movieObj = this._buildMovieObject(movieData, mainFile, nonMainFiles);

        // Step 3: 使用xml2js.Builder生成XML
        // 注意：xml2js.Builder需要以'movie'作为根键名的对象
        const builder = new xml2js.Builder(XML_BUILDER_OPTIONS);
        const xmlObj = { movie: movieObj };
        let xml = builder.buildObject(xmlObj);

        // Step 4: 确保XML声明头正确
        if (!xml.startsWith('<?xml')) {
            xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' + xml;
        }

        return xml;
    }

    /**
     * 从movieData的fileset中分离Main文件和非Main文件
     * 注意：只保留第一个Main文件，其余Main文件会归入nonMainFiles
     * @private
     * @param {object} movieData - 电影数据对象
     * @returns {object} 包含mainFile和nonMainFiles的对象
     */
    _separateMainFile(movieData) {
        let mainFile = null;
        const nonMainFiles = [];

        if (movieData.fileset && Array.isArray(movieData.fileset)) {
            for (const file of movieData.fileset) {
                if (file.type === 'Main' && !mainFile) {
                    // 只保留第一个Main文件
                    mainFile = file;
                } else {
                    nonMainFiles.push(file);
                }
            }
        }

        return { mainFile, nonMainFiles };
    }

    /**
     * 构建用于xml2js生成XML的movie对象结构
     * @private
     * @param {object} movieData - 原始电影数据对象
     * @param {object} mainFile - Main文件对象（可为null）
     * @param {object[]} nonMainFiles - 非Main文件数组
     * @returns {object} 用于生成XML的JS对象
     */
    _buildMovieObject(movieData, mainFile, nonMainFiles) {
        const movie = {};

        // 2.1 添加简单文本字段（排除internal字段和original_filename）
        const fieldsToInclude = NFO_TEXT_FIELDS.filter(f => f !== 'original_filename');
        for (const field of fieldsToInclude) {
            if (movieData[field]) {
                movie[field] = this._sanitizeValue(movieData[field]);
            }
        }

        // 2.2 处理original_filename（优先使用Main文件的fullpath）
        const originalFilename = this._getOriginalFilename(movieData, mainFile);
        if (originalFilename) {
            movie.original_filename = originalFilename;
        }

        // 2.3 添加标签
        const tags = movieData.tags || movieData.tag;
        if (tags && Array.isArray(tags)) {
            movie.tag = tags.map(tag => this._sanitizeValue(tag));
        }

        // 2.4 添加演员（使用嵌套结构）
        if (movieData.actors && Array.isArray(movieData.actors) && movieData.actors.length > 0) {
            movie.actor = {
                name: movieData.actors.map(actor => this._sanitizeValue(actor))
            };
        }

        // 2.5 添加视频信息（从Main文件或movieData获取）
        const videoInfo = this._collectVideoInfo(movieData, mainFile);
        if (this._hasVideoInfo(videoInfo)) {
            movie.fileinfo = {
                streamdetails: {
                    video: {
                        codec: videoInfo.videoCodec,
                        width: videoInfo.videoWidth,
                        height: videoInfo.videoHeight,
                        durationinseconds: videoInfo.videoDuration
                    }
                }
            };
        } else if (movieData.fileinfo) {
            // 如果没有独立视频信息但有原始fileinfo字符串
            movie.fileinfo = movieData.fileinfo;
        }

        // 2.6 添加fileset（仅非Main文件）
        if (nonMainFiles.length > 0) {
            movie.fileset = {
                file: nonMainFiles.map(file => this._buildFileNode(file))
            };
        }

        return movie;
    }

    /**
     * 获取original_filename的值
     * @private
     * @param {object} movieData - 电影数据对象
     * @param {object} mainFile - Main文件对象（可为null）
     * @returns {string} original_filename值
     */
    _getOriginalFilename(movieData, mainFile) {
        if (mainFile && mainFile.fullpath) {
            return mainFile.fullpath;
        }
        return movieData.original_filename || '';
    }

    /**
     * 收集视频信息（优先从Main文件获取）
     * @private
     * @param {object} movieData - 电影数据对象
     * @param {object} mainFile - Main文件对象（可为null）
     * @returns {object} 视频信息对象
     */
    _collectVideoInfo(movieData, mainFile) {
        return {
            videoCodec: mainFile ? (mainFile.videoCodec || movieData.videoCodec || '') : (movieData.videoCodec || ''),
            videoWidth: mainFile ? (mainFile.videoWidth || movieData.videoWidth || '') : (movieData.videoWidth || ''),
            videoHeight: mainFile ? (mainFile.videoHeight || movieData.videoHeight || '') : (movieData.videoHeight || ''),
            videoDuration: mainFile ? (mainFile.videoDuration || movieData.videoDuration || '') : (movieData.videoDuration || '')
        };
    }

    /**
     * 检查视频信息对象是否有有效数据
     * @private
     * @param {object} videoInfo - 视频信息对象
     * @returns {boolean} 是否有有效数据
     */
    _hasVideoInfo(videoInfo) {
        return !!(videoInfo.videoCodec || videoInfo.videoWidth || videoInfo.videoHeight || videoInfo.videoDuration);
    }

    /**
     * 构建单个file节点的JS对象
     * @private
     * @param {object} file - 文件数据对象
     * @returns {object} file节点对象
     */
    _buildFileNode(file) {
        const fileNode = {};

        if (file.filename) {
            fileNode.filename = this._sanitizeValue(file.filename);
        }
        if (file.fullpath) {
            fileNode.fullpath = this._sanitizeValue(file.fullpath);
        }
        if (file.type) {
            fileNode.type = this._sanitizeValue(file.type);
        }
        if (file.videoCodec) {
            fileNode.videocodec = this._sanitizeValue(file.videoCodec);
        }
        if (file.videoWidth) {
            fileNode.videowidth = this._sanitizeValue(file.videoWidth);
        }
        if (file.videoHeight) {
            fileNode.videoheight = this._sanitizeValue(file.videoHeight);
        }
        if (file.videoDuration) {
            fileNode.videoduration = this._sanitizeValue(file.videoDuration);
        }
        if (file.memo) {
            fileNode.memo = this._sanitizeValue(file.memo);
        }

        return fileNode;
    }

    /**
     * 清理和转换值，确保适合XML输出
     * xml2js.Builder会自动处理XML转义，因此这里只做类型转换和空值处理
     * @private
     * @param {any} value - 要清理的值
     * @returns {string} 清理后的字符串值
     */
    _sanitizeValue(value) {
        if (value === undefined || value === null) {
            return '';
        }
        // 转换为字符串
        return String(value);
    }

    /**
     * 检查文件是否存在
     * @param {string} filePath - 文件路径
     * @returns {Promise<boolean>} 是否存在
     */
    async fileExists(filePath) {
        try {
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * 检查文件是否存在（同步版本）
     * @param {string} filePath - 文件路径
     * @returns {boolean} 是否存在
     */
    fileExistsSync(filePath) {
        return fsSync.existsSync(filePath);
    }

    /**
     * 读取目录内容
     * @param {string} dirPath - 目录路径
     * @returns {Promise<string[]>} 文件列表
     */
    async readDir(dirPath) {
        try {
            const exists = await this.fileExists(dirPath);
            if (!exists) {
                return [];
            }
            return await fs.readdir(dirPath);
        } catch (error) {
            console.error('Error reading directory:', error);
            throw error;
        }
    }

    /**
     * 创建目录
     * @param {string} dirPath - 目录路径
     */
    async createDir(dirPath) {
        try {
            await fs.mkdir(dirPath, { recursive: true });
        } catch (error) {
            console.error('Error creating directory:', error);
            throw error;
        }
    }

    /**
     * 确保目录存在（如果不存在则创建）
     * @param {string} dirPath - 目录路径
     */
    async ensureDir(dirPath) {
        try {
            await fs.mkdir(dirPath, { recursive: true });
        } catch (error) {
            // 忽略目录已存在的错误
            if (error.code !== 'EEXIST') {
                console.error('Error ensuring directory:', error);
                throw error;
            }
        }
    }

    /**
     * 读取文件
     * @param {string} filePath - 文件路径
     * @returns {Promise<string>} 文件内容
     */
    async readFile(filePath) {
        try {
            return await fs.readFile(filePath, 'utf-8');
        } catch (error) {
            console.error('Error reading file:', error);
            throw error;
        }
    }

    /**
     * 删除文件
     * @param {string} filePath - 文件路径
     */
    async deleteFile(filePath) {
        try {
            const exists = await this.fileExists(filePath);
            if (exists) {
                await fs.unlink(filePath);
            }
        } catch (error) {
            console.error('Error deleting file:', error);
            throw error;
        }
    }

    /**
     * 删除目录
     * @param {string} dirPath - 目录路径
     */
    async deleteDir(dirPath) {
        try {
            const exists = await this.fileExists(dirPath);
            if (exists) {
                await fs.rm(dirPath, { recursive: true, force: true });
            }
        } catch (error) {
            console.error('Error deleting directory:', error);
            throw error;
        }
    }

    /**
     * 读取 JSON 文件
     * @param {string} filePath - 文件路径
     * @returns {Promise<object>} JSON 对象
     */
    async readJson(filePath) {
        try {
            const exists = await this.fileExists(filePath);
            if (!exists) {
                return null;
            }
            const content = await fs.readFile(filePath, 'utf-8');
            return JSON.parse(content);
        } catch (error) {
            console.error('Error reading JSON file:', error);
            throw error;
        }
    }

    /**
     * 写入 JSON 文件
     * @param {string} filePath - 文件路径
     * @param {object} data - 数据对象
     */
    async writeJson(filePath, data) {
        try {
            const dir = path.dirname(filePath);
            await this.createDir(dir);
            await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
        } catch (error) {
            console.error('Error writing JSON file:', error);
            throw error;
        }
    }

    /**
     * 获取分类配置文件
     * @returns {Promise<object>} 分类配置
     */
    async getCategoryConfig() {
        const configPath = path.join(this.baseDir, 'config', 'categories.json');
        return await this.readJson(configPath);
    }

    /**
     * 保存分类配置文件
     * @param {object} config - 分类配置
     */
    async saveCategoryConfig(config) {
        const configPath = path.join(this.baseDir, 'config', 'categories.json');
        await this.writeJson(configPath, config);
    }

    /**
     * 获取文件扩展名
     * @param {string} filePath - 文件路径
     * @returns {string} 扩展名
     */
    getFileExtension(filePath) {
        return path.extname(filePath).toLowerCase();
    }

    /**
     * 获取文件名（不含扩展名）
     * @param {string} filePath - 文件路径
     * @returns {string} 文件名
     */
    getFileNameWithoutExtension(filePath) {
        return path.basename(filePath, path.extname(filePath));
    }

    /**
     * 读取图片文件为 base64
     * @param {string} imagePath - 图片路径
     * @returns {Promise<string>} base64 字符串
     */
    async readImageAsBase64(imagePath) {
        try {
            const exists = await this.fileExists(imagePath);
            if (!exists) {
                return null;
            }
            const buffer = await fs.readFile(imagePath);
            const ext = this.getFileExtension(imagePath);
            const mimeType = this.getMimeType(ext);
            return `data:${mimeType};base64,${buffer.toString('base64')}`;
        } catch (error) {
            console.error('Error reading image:', error);
            return null;
        }
    }

    /**
     * 获取 MIME 类型
     * @param {string} ext - 扩展名
     * @returns {string} MIME 类型
     */
    getMimeType(ext) {
        const mimeTypes = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
            '.svg': 'image/svg+xml'
        };
        return mimeTypes[ext] || 'application/octet-stream';
    }

    /**
     * 扫描目录获取所有子文件夹名称
     * @param {string} dirPath - 目录路径
     * @returns {Promise<string[]>} 子文件夹名称数组
     */
    async scanDirectoryForMovies(dirPath) {
        try {
            const fullPath = path.resolve(dirPath);
            const exists = await this.fileExists(fullPath);
            if (!exists) {
                return [];
            }

            const entries = await fs.readdir(fullPath, { withFileTypes: true });
            const folders = entries
                .filter(entry => entry.isDirectory())
                .map(entry => entry.name);

            return folders;
        } catch (error) {
            console.error('Error scanning directory for movies:', error);
            throw error;
        }
    }

    /**
     * 复制目录到目标路径
     * @param {string} srcPath - 源路径
     * @param {string} destPath - 目标路径
     */
    async copyDir(srcPath, destPath) {
        try {
            await this.ensureDir(destPath);
            const entries = await fs.readdir(srcPath, { withFileTypes: true });

            for (const entry of entries) {
                const srcEntry = path.join(srcPath, entry.name);
                const destEntry = path.join(destPath, entry.name);

                if (entry.isDirectory()) {
                    await this.copyDir(srcEntry, destEntry);
                } else {
                    await this.copyFile(srcEntry, destEntry);
                }
            }
        } catch (error) {
            console.error('Error copying directory:', error);
            throw error;
        }
    }

    /**
     * 移动目录到目标路径
     * @param {string} srcPath - 源路径
     * @param {string} destPath - 目标路径
     */
    async moveDir(srcPath, destPath) {
        try {
            // 确保目标目录存在
            await this.ensureDir(path.dirname(destPath));
            // 删除目标目录（如果存在）
            await this.deleteDir(destPath);
            // 重命名/移动目录
            await fs.rename(srcPath, destPath);
        } catch (error) {
            // 如果 rename 失败（跨设备），尝试复制后删除
            if (error.code === 'EXDEV' || error.code === 'EPERM') {
                console.log('Cross-device move detected, using copy+delete approach');
                await this.copyDir(srcPath, destPath);
                await this.deleteDir(srcPath);
            } else {
                console.error('Error moving directory:', error);
                throw error;
            }
        }
    }

    /**
     * 递归扫描目录，查找包含nfo文件的文件夹
     * 优先查找movie.nfo，如果不存在则查找*.nfo
     * @param {string} dirPath - 目录路径
     * @returns {Promise<object[]>} 包含nfo文件的文件夹信息数组
     */
    async scanDirectoryRecursively(dirPath) {
        const movieFolders = [];

        /**
         * 递归扫描函数
         * @param {string} currentDir - 当前目录
         */
        async function scanRecursive(currentDir) {
            try {
                const exists = await this.fileExists(currentDir);
                if (!exists) {
                    return;
                }

                const entries = await fs.readdir(currentDir, { withFileTypes: true });

                for (const entry of entries) {
                    const fullPath = path.join(currentDir, entry.name);

                    if (entry.isDirectory()) {
                        let nfoPath = null;
                        
                        const movieNfoPath = path.join(fullPath, 'movie.nfo');
                        const hasMovieNfo = await this.fileExists(movieNfoPath);
                        
                        if (hasMovieNfo) {
                            nfoPath = movieNfoPath;
                        } else {
                            const files = await fs.readdir(fullPath);
                            const nfoFile = files.find(f => typeof f === 'string' && f.toLowerCase().endsWith('.nfo'));
                            if (nfoFile) {
                                nfoPath = path.join(fullPath, nfoFile);
                            }
                        }

                        if (nfoPath) {
                            const posterInfo = await this.findMoviePoster(fullPath);
                            movieFolders.push({
                                folderPath: fullPath,
                                folderName: entry.name,
                                nfoPath: nfoPath,
                                posterPath: posterInfo.posterPath,
                                posterExt: posterInfo.posterExt
                            });
                        } else {
                            await scanRecursive.call(this, fullPath);
                        }
                    }
                }
            } catch (error) {
                console.error('Error scanning directory recursively:', error);
            }
        }

        await scanRecursive.call(this, dirPath);
        return movieFolders;
    }

    /**
     * 查找文件夹中的海报文件
     * 支持的命名模式：*-poster.jpg, poster.jpg, cover.jpg, folder.jpg
     * @param {string} folderPath - 文件夹路径
     * @returns {Promise<object>} 海报信息 {posterPath, posterExt}
     */
    async findMoviePoster(folderPath) {
        const posterPatterns = [
            /-poster\.jpg$/i,
            /-poster\.jpeg$/i,
            /-poster\.png$/i,
            /-poster\.webp$/i,
            /^poster\.jpg$/i,
            /^poster\.jpeg$/i,
            /^cover\.jpg$/i,
            /^cover\.jpeg$/i,
            /^folder\.jpg$/i,
            /^folder\.jpeg$/i
        ];

        try {
            const exists = await this.fileExists(folderPath);
            if (!exists) {
                return { posterPath: null, posterExt: null };
            }

            const entries = await fs.readdir(folderPath, { withFileTypes: true });

            for (const entry of entries) {
                if (entry.isFile()) {
                    for (const pattern of posterPatterns) {
                        if (pattern.test(entry.name)) {
                            const posterPath = path.join(folderPath, entry.name);
                            const ext = path.extname(entry.name).toLowerCase();
                            return { posterPath, posterExt: ext };
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error finding movie poster:', error);
        }

        return { posterPath: null, posterExt: null };
    }

    /**
     * 解析CSV格式的电影数据文件
     * CSV列：电影ID、电影名称、电影描述、排序标题、演员(|分割)、导演、上映时间、发行商、电影时长(分钟)、标签、文件地址、视频编码、视频宽度、视频高度、视频时间
     * @param {string} filePath - CSV文件路径
     * @returns {Promise<object[]>} 电影数据数组
     */
    async parseCsvFile(filePath) {
        const movies = [];

        try {
            const exists = await this.fileExists(filePath);
            if (!exists) {
                return movies;
            }

            const content = await fs.readFile(filePath, 'utf-8');
            const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);

            // 跳过表头
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;

                // 简单CSV解析（处理带引号的值）
                const values = this.parseCsvLine(line);

                if (values.length >= 14) {
                    const [
                        movieId,
                        title,
                        description,
                        sortTitle,
                        actorsStr,
                        director,
                        year,
                        studio,
                        runtime,
                        tagsStr,
                        fileAddress,
                        videoCodec,
                        videoWidth,
                        videoHeight,
                        videoDuration
                    ] = values;

                    // 解析演员数组
                    const actors = actorsStr ? actorsStr.split('|').map(a => a.trim()).filter(a => a) : [];

                    // 解析标签数组
                    const tags = tagsStr ? tagsStr.split('|').map(t => t.trim()).filter(t => t) : [];

                    movies.push({
                        movieId: movieId?.trim() || '',
                        title: title?.trim() || '',
                        description: description?.trim() || '',
                        sortTitle: sortTitle?.trim() || '',
                        actors: actors,
                        director: director?.trim() || '',
                        year: year?.trim() || '',
                        studio: studio?.trim() || '',
                        runtime: runtime?.trim() || '',
                        tags: tags,
                        fileAddress: fileAddress?.trim() || '',
                        videoCodec: videoCodec?.trim() || '',
                        videoWidth: videoWidth?.trim() || '',
                        videoHeight: videoHeight?.trim() || '',
                        videoDuration: videoDuration?.trim() || '',
                        // 内部使用字段
                        fileset: fileAddress ? [{
                            type: 'Main',
                            fullpath: fileAddress.trim(),
                            filename: path.basename(fileAddress.trim()),
                            videoCodec: videoCodec?.trim() || '',
                            videoWidth: videoWidth?.trim() || '',
                            videoHeight: videoHeight?.trim() || '',
                            videoDuration: videoDuration?.trim() || ''
                        }] : []
                    });
                }
            }
        } catch (error) {
            console.error('Error parsing CSV file:', error);
        }

        return movies;
    }

    /**
     * 解析CSV行，支持带引号的值
     * @param {string} line - CSV行
     * @returns {string[]} 解析后的值数组
     */
    parseCsvLine(line) {
        const values = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            const nextChar = line[i + 1];

            if (inQuotes) {
                if (char === '"' && nextChar === '"') {
                    // 转义的双引号
                    current += '"';
                    i++;
                } else if (char === '"') {
                    // 结束引号
                    inQuotes = false;
                } else {
                    current += char;
                }
            } else {
                if (char === '"') {
                    // 开始引号
                    inQuotes = true;
                } else if (char === ',') {
                    // 分隔符
                    values.push(current);
                    current = '';
                } else {
                    current += char;
                }
            }
        }

        values.push(current);
        return values;
    }

    /**
     * 复制文件到目标路径
     * @param {string} srcPath - 源文件路径
     * @param {string} destPath - 目标文件路径
     * @returns {Promise<string>} 目标文件路径
     */
    async copyFile(srcPath, destPath) {
        try {
            const destDir = path.dirname(destPath);
            await this.ensureDir(destDir);
            await fs.copyFile(srcPath, destPath);
            return destPath;
        } catch (error) {
            console.error('Error copying file:', error);
            throw error;
        }
    }

    /**
     * 写入文件内容
     * @param {string} filePath - 文件路径
     * @param {string} content - 文件内容
     */
    async writeFile(filePath, content) {
        try {
            await this.ensureDir(path.dirname(filePath));
            await fs.writeFile(filePath, content, 'utf-8');
        } catch (error) {
            console.error('Error writing file:', error);
            throw error;
        }
    }
}

module.exports = FileService;

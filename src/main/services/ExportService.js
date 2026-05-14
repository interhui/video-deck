/**
 * 导出服务
 * 负责电影盒子的导出逻辑处理
 */
const archiver = require('archiver');
const path = require('path');
const fs = require('fs');

class ExportService {
    constructor() {
        this.archiver = archiver;
    }

    /**
     * 导出盒子为ZIP格式
     * @param {Array} movies - 电影列表
     * @param {string} moviesDir - 电影目录路径
     * @param {string} exportPath - 导出文件路径
     * @returns {Promise<object>} 导出结果
     */
    async exportBoxToZip(movies, moviesDir, exportPath) {
        console.log(`[ExportService] exportBoxToZip 开始`);
        console.log(`[ExportService] moviesDir: ${moviesDir}`);
        console.log(`[ExportService] exportPath: ${exportPath}`);
        console.log(`[ExportService] 待导出电影数量: ${movies.length}`);

        const output = fs.createWriteStream(exportPath);
        const archive = this.archiver('zip', { zlib: { level: 9 } });

        return new Promise((resolve, reject) => {
            let exportedCount = 0;
            let skippedMovies = [];

            output.on('close', () => {
                console.log(`[ExportService] ZIP导出完成，实际导出: ${exportedCount}，跳过: ${skippedMovies.length}`);
                if (skippedMovies.length > 0) {
                    console.log(`[ExportService] 跳过的电影: ${skippedMovies.join(', ')}`);
                }
                resolve({ success: true, count: exportedCount, skipped: skippedMovies });
            });

            archive.on('error', (err) => {
                console.error(`[ExportService] ZIP archiver错误: ${err.message}`);
                reject(err);
            });

            archive.on('warning', (err) => {
                console.warn(`[ExportService] ZIP archiver警告: ${err.message}`);
            });

            archive.pipe(output);

            for (const movie of movies) {
                const movieDir = movie.basePath || movie.path || path.join(moviesDir, movie.category, movie.movieId);
                const nfoPath = path.join(movieDir, 'movie.nfo');
                
                console.log(`[ExportService] 处理电影: ${movie.movieId}`);
                console.log(`[ExportService] basePath: ${movie.basePath}`);
                console.log(`[ExportService] movieDir: ${movieDir}, exists: ${fs.existsSync(movieDir)}`);
                
                if (!fs.existsSync(movieDir)) {
                    console.log(`[ExportService] 电影目录不存在，跳过: ${movie.movieId}`);
                    skippedMovies.push(movie.movieId);
                    continue;
                }

                const posterFiles = fs.readdirSync(movieDir)
                    .filter(f => f.match(/^(poster|.*-poster)\.(jpg|png|jpeg)$/i));
                console.log(`[ExportService] 找到poster文件: ${posterFiles.join(', ') || '无'}`);

                if (fs.existsSync(nfoPath)) {
                    console.log(`[ExportService] 添加movie.nfo到ZIP`);
                    archive.file(nfoPath, { name: `${movie.movieId}/movie.nfo` });
                } else {
                    console.log(`[ExportService] movie.nfo不存在: ${nfoPath}`);
                }

                for (const posterFile of posterFiles) {
                    const posterPath = path.join(movieDir, posterFile);
                    console.log(`[ExportService] 添加poster到ZIP: ${posterFile}`);
                    archive.file(posterPath, { name: `${movie.movieId}/${posterFile}` });
                }
                
                exportedCount++;
            }

            console.log(`[ExportService] 开始finalize ZIP`);
            archive.finalize();
        });
    }

    /**
     * 导出盒子为CSV格式
     * @param {Array} movies - 电影列表
     * @param {string} exportPath - 导出文件路径
     * @returns {Promise<object>} 导出结果
     */
    async exportBoxToCsv(movies, exportPath) {
        const headers = [
            '电影ID', '电影名称', '电影描述', '电影排序标题', '演员', '导演',
            '上映时间', '发行商', '电影时长', '标签', '文件地址',
            '视频编码', '视频宽度', '视频高度', '视频时间'
        ];

        const rows = movies.map(movie => {
            const tags = (movie.tags || []).join('/');
            const actors = (movie.actors || []).join('/');
            const fileAddress = movie.original_filename || '';
            const duration = movie.videoDuration || movie.runtime || '';

            return [
                movie.movieId || '',
                movie.name || '',
                movie.description || movie.outline || '',
                movie.sorttitle || '',
                actors,
                movie.director || '',
                movie.publishDate || movie.year || '',
                movie.studio || '',
                movie.runtime || '',
                tags,
                fileAddress,
                movie.videoCodec || '',
                movie.videoWidth || '',
                movie.videoHeight || '',
                duration
            ].map(field => {
                const escaped = String(field).replace(/"/g, '""');
                if (escaped.includes(',') || escaped.includes('\n') || escaped.includes('"')) {
                    return `"${escaped}"`;
                }
                return escaped;
            }).join(',');
        });

        const csvContent = headers.join(',') + '\n' + rows.join('\n');
        await fs.promises.writeFile(exportPath, csvContent, 'utf-8');

        return { success: true, count: movies.length };
    }

    /**
     * 导出盒子为DPL格式（PotPlayer播放列表）
     * @param {Array} movies - 电影列表
     * @param {string} exportPath - 导出文件路径
     * @returns {Promise<object>} 导出结果
     */
    async exportBoxToDpl(movies, exportPath) {
        console.log(`[ExportService] exportBoxToDpl 开始`);
        console.log(`[ExportService] exportPath: ${exportPath}`);
        console.log(`[ExportService] 电影数量: ${movies.length}`);

        let content = '[playlist]\n';
        content += `NumberOfEntries=${movies.length}\n`;
        content += 'CurrentEntry=1\n\n';

        for (let i = 0; i < movies.length; i++) {
            const movie = movies[i];
            const index = i + 1;
            const filePath = movie.original_filename || '';
            const title = movie.name || '';
            const durationMs = (parseInt(movie.videoDuration) || 0) * 1000;

            content += `File${index}=${filePath}\n`;
            content += `Title${index}=${title}\n`;
            content += `Length${index}=${durationMs}\n`;
            content += `Played${index}=0\n\n`;
        }

        await fs.promises.writeFile(exportPath, content, 'utf-8');

        console.log(`[ExportService] DPL导出完成`);
        return { success: true, count: movies.length };
    }

    /**
     * 导出盒子为JSON格式
     * @param {Array} movies - 电影列表（盒子中的电影数据）
     * @param {string} boxName - 盒子名称
     * @param {string} exportPath - 导出文件路径
     * @returns {Promise<object>} 导出结果
     */
    async exportBoxToJson(movies, boxName, exportPath) {
        console.log(`[ExportService] exportBoxToJson 开始`);
        console.log(`[ExportService] boxName: ${boxName}`);
        console.log(`[ExportService] exportPath: ${exportPath}`);
        console.log(`[ExportService] 电影数量: ${movies.length}`);

        const boxData = {
            movie: movies.map(m => ({
                id: m.movieId || m.id,
                status: m.boxStatus || 'unwatched',
                rating: m.boxRating || 0,
                comment: m.boxComment || ''
            })),
            metadata: {
                name: boxName,
                description: ''
            }
        };

        const jsonContent = JSON.stringify(boxData, null, 2);
        await fs.promises.writeFile(exportPath, jsonContent, 'utf-8');

        console.log(`[ExportService] JSON导出完成，导出数量: ${movies.length}`);
        return { success: true, count: movies.length };
    }

    /**
     * 导出盒子
     * @param {string} exportType - 导出类型 (zip/csv/dpl/json)
     * @param {Array} movies - 电影列表
     * @param {string} moviesDir - 电影目录路径
     * @param {string} exportPath - 导出文件路径
     * @param {string} boxName - 盒子名称（用于JSON导出）
     * @returns {Promise<object>} 导出结果
     */
    async exportBox(exportType, movies, moviesDir, exportPath, boxName = '') {
        switch (exportType) {
            case 'zip':
                return await this.exportBoxToZip(movies, moviesDir, exportPath);
            case 'csv':
                return await this.exportBoxToCsv(movies, exportPath);
            case 'dpl':
                return await this.exportBoxToDpl(movies, exportPath);
            case 'json':
                return await this.exportBoxToJson(movies, boxName, exportPath);
            default:
                throw new Error('不支持的导出格式');
        }
    }

    /**
     * 生成导出文件名
     * @param {string} boxName - 盒子名称
     * @param {string} exportType - 导出类型
     * @returns {string} 默认文件名
     */
    generateExportFileName(boxName, exportType) {
        const timestamp = this.getExportTimestamp();
        const extensions = {
            'zip': '.zip',
            'csv': '.csv',
            'dpl': '.dpl',
            'json': '.json'
        };
        return `${boxName}-${timestamp}-export${extensions[exportType] || ''}`;
    }

    /**
     * 获取导出时间戳
     * @returns {string} 格式化的时间戳
     */
    getExportTimestamp() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        return `${year}${month}${day}${hours}${minutes}${seconds}`;
    }

    /**
     * 获取导出文件过滤器
     * @param {string} exportType - 导出类型
     * @returns {Array} 文件过滤器数组
     */
    getExportFilters(exportType) {
        switch (exportType) {
            case 'zip':
                return [{ name: 'ZIP文件', extensions: ['zip'] }];
            case 'csv':
                return [{ name: 'CSV文件', extensions: ['csv'] }];
            case 'dpl':
                return [{ name: 'PotPlayer播放列表', extensions: ['dpl'] }];
            case 'json':
                return [{ name: 'JSON文件', extensions: ['json'] }];
            default:
                return [{ name: '所有文件', extensions: ['*'] }];
        }
    }
}

module.exports = ExportService;
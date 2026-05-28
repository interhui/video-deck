/**
 * 电影盒子服务
 * 负责电影盒子的业务逻辑处理
 */
const FileService = require('./FileService');
const path = require('path');

class BoxService {
    constructor() {
        this.fileService = new FileService();
    }

    /**
     * 获取盒子目录路径
     * @param {string} movieboxDir - 电影盒子目录
     * @returns {string} 盒子目录路径
     */
    getBoxesDir(movieboxDir) {
        return movieboxDir;
    }

    /**
     * 获取所有电影盒子
     * @param {string} movieboxDir - 基础目录
     * @returns {Promise<Array>} 盒子列表
     */
    async getAllBoxes(movieboxDir) {
        try {
            const boxesDir = this.getBoxesDir(movieboxDir);
            const exists = await this.fileService.fileExists(boxesDir);

            if (!exists) {
                return [];
            }

            const files = await this.fileService.readDir(boxesDir);
            const boxes = [];

            for (const file of files) {
                // 跳过已删除的备份文件
                if (file.endsWith('.json.del')) {
                    continue;
                }
                if (file.endsWith('.json')) {
                    const boxName = file.replace('.json', '');
                    const boxData = await this.readBoxFile(boxesDir, boxName);
                    if (boxData) {
                        // 计算盒子中的电影总数
                        let movieCount = 0;
                        const movies = boxData.movie || [];
                        movieCount = movies.length;

                        // 获取metadata中的信息
                        const metadata = boxData.metadata || {};
                        boxes.push({
                            name: metadata.name || boxName,
                            description: metadata.description || '',
                            originalName: boxName,
                            movieCount: movieCount
                        });
                    }
                }
            }

            return boxes;
        } catch (error) {
            console.error('Error getting all boxes:', error);
            throw error;
        }
    }

    /**
     * 读取盒子文件
     * @param {string} boxesDir - 盒子目录
     * @param {string} boxName - 盒子名称
     * @returns {Promise<object>} 盒子数据
     */
    async readBoxFile(boxesDir, boxName) {
        try {
            const filePath = path.join(boxesDir, `${boxName}.json`);
            const exists = await this.fileService.fileExists(filePath);

            if (!exists) {
                return null;
            }

            const content = await this.fileService.readFile(filePath);

            // 检查内容是否为空或无效
            if (!content || content.trim() === '') {
                console.warn(`Box file ${boxName}.json is empty, returning empty object`);
                return {};
            }

            return JSON.parse(content);
        } catch (error) {
            console.error('Error reading box file:', error);
            // 如果是 JSON 解析错误，返回空对象而不是抛出异常
            if (error instanceof SyntaxError) {
                return {};
            }
            throw error;
        }
    }

    /**
     * 创建电影盒子
     * @param {string} boxName - 盒子名称
     * @param {string} description - 盒子描述
     * @param {string} movieboxDir - 基础目录
     * @returns {Promise<object>} 创建结果
     */
    async createBox(boxName, description, movieboxDir) {
        try {
            const boxesDir = this.getBoxesDir(movieboxDir);

            // 确保盒子目录存在
            await this.fileService.ensureDir(boxesDir);

            // 检查盒子是否已存在
            const boxPath = path.join(boxesDir, `${boxName}.json`);
            const exists = await this.fileService.fileExists(boxPath);

            if (exists) {
                throw new Error('盒子已存在');
            }

            // 创建带metadata的电影盒子
            const newBox = {
                movie: [],
                metadata: {
                    name: boxName,
                    description: description || ''
                }
            };
            await this.fileService.writeFile(boxPath, JSON.stringify(newBox, null, 2));

            return { success: true, name: boxName };
        } catch (error) {
            console.error('Error creating box:', error);
            throw error;
        }
    }

    /**
     * 删除电影盒子（重命名为备份文件）
     * @param {string} boxName - 盒子名称
     * @param {string} movieboxDir - 基础目录
     * @returns {Promise<object>} 删除结果
     */
    async deleteBox(boxName, movieboxDir) {
        try {
            const boxesDir = this.getBoxesDir(movieboxDir);
            const boxPath = path.join(boxesDir, `${boxName}.json`);

            const exists = await this.fileService.fileExists(boxPath);
            if (!exists) {
                throw new Error('盒子不存在');
            }

            // 生成带时间戳的备份文件名
            const timestamp = this.getFormattedTimestamp();
            const backupPath = path.join(boxesDir, `${boxName}-${timestamp}.json.del`);

            // 读取原文件内容
            const content = await this.fileService.readFile(boxPath);

            // 写入备份文件
            await this.fileService.writeFile(backupPath, content);

            // 删除原文件
            await this.fileService.deleteFile(boxPath);

            return { success: true, backupPath: backupPath };
        } catch (error) {
            console.error('Error deleting box:', error);
            throw error;
        }
    }

    /**
     * 获取格式化的当前时间戳
     * @returns {string} 格式化的时间戳 (YYYYMMDDHHmmss)
     */
    getFormattedTimestamp() {
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
     * 更新电影盒子信息
     * @param {string} boxName - 原盒子名称
     * @param {string} newName - 新盒子名称
     * @param {string} description - 盒子描述
     * @param {string} movieboxDir - 基础目录
     * @returns {Promise<object>} 更新结果
     */
    async updateBox(boxName, newName, description, movieboxDir) {
        try {
            const boxesDir = this.getBoxesDir(movieboxDir);
            const oldBoxPath = path.join(boxesDir, `${boxName}.json`);
            const newBoxPath = path.join(boxesDir, `${newName}.json`);

            const exists = await this.fileService.fileExists(oldBoxPath);
            if (!exists) {
                throw new Error('盒子不存在');
            }

            // 检查新名称是否与其他盒子冲突
            if (newName !== boxName) {
                const newExists = await this.fileService.fileExists(newBoxPath);
                if (newExists) {
                    throw new Error('新盒子名称已存在');
                }
            }

            // 读取现有盒子数据
            const boxData = await this.readBoxFile(boxesDir, boxName);

            // 更新metadata
            boxData.metadata = {
                name: newName,
                description: description || ''
            };

            // 保存到新文件名
            await this.fileService.writeFile(newBoxPath, JSON.stringify(boxData, null, 2));

            // 如果名称变更，删除旧文件
            if (newName !== boxName) {
                await this.fileService.deleteFile(oldBoxPath);
            }

            return { success: true, name: newName };
        } catch (error) {
            console.error('Error updating box:', error);
            throw error;
        }
    }

    /**
     * 获取盒子详情
     * @param {string} boxName - 盒子名称
     * @param {string} movieboxDir - 基础目录
     * @returns {Promise<object>} 盒子详情
     */
    async getBoxDetail(boxName, movieboxDir) {
        try {
            const boxesDir = this.getBoxesDir(movieboxDir);
            const boxData = await this.readBoxFile(boxesDir, boxName);

            if (!boxData) {
                return null;
            }

            // 获取metadata
            const metadata = boxData.metadata || {};
            // 计算电影总数
            const movies = boxData.movie || [];

            return {
                name: metadata.name || boxName,
                description: metadata.description || '',
                originalName: boxName,
                data: boxData,
                movieCount: movies.length,
                movies: movies
            };
        } catch (error) {
            console.error('Error getting box detail:', error);
            throw error;
        }
    }

    /**
     * 添加电影到盒子
     * @param {string} boxName - 盒子名称
     * @param {object} movieInfo - 电影信息（包含id, comment等）
     * @param {string} movieboxDir - 基础目录
     * @returns {Promise<object>} 添加结果
     */
    async addMovieToBox(boxName, movieInfo, movieboxDir) {
        try {
            const result = await this.addMoviesToBox(boxName, [movieInfo], movieboxDir);
            return { success: true, added: result.addedCount > 0, updated: result.updatedCount > 0 };
        } catch (error) {
            console.error('Error adding movie to box:', error);
            throw error;
        }
    }

    /**
     * 从盒子中移除电影
     * @param {string} boxName - 盒子名称
     * @param {string} movieId - 电影ID
     * @param {string} movieboxDir - 基础目录
     * @returns {Promise<object>} 移除结果
     */
    async removeMovieFromBox(boxName, movieId, movieboxDir) {
        try {
            const boxesDir = this.getBoxesDir(movieboxDir);
            const boxData = await this.readBoxFile(boxesDir, boxName);

            if (!boxData || !boxData.movie) {
                throw new Error('盒子不存在');
            }

            // 移除电影
            boxData.movie = boxData.movie.filter(m => m.id !== movieId);

            // 保存盒子数据
            const boxPath = path.join(boxesDir, `${boxName}.json`);
            await this.fileService.writeFile(boxPath, JSON.stringify(boxData, null, 2));

            return { success: true };
        } catch (error) {
            console.error('Error removing movie from box:', error);
            throw error;
        }
    }

    /**
     * 清理盒子中已删除的电影
     * @param {string} boxName - 盒子名称
     * @param {Array<string>} validMovieIds - 有效的电影ID列表
     * @param {string} movieboxDir - 基础目录
     * @returns {Promise<object>} 清理结果 { success, removedCount }
     */
    async cleanBox(boxName, validMovieIds, movieboxDir) {
        try {
            const boxesDir = this.getBoxesDir(movieboxDir);
            const boxData = await this.readBoxFile(boxesDir, boxName);

            if (!boxData || !boxData.movie) {
                return { success: true, removedCount: 0 };
            }

            const originalCount = boxData.movie.length;
            boxData.movie = boxData.movie.filter(m => validMovieIds.includes(m.id));
            const removedCount = originalCount - boxData.movie.length;

            if (removedCount > 0) {
                const boxPath = path.join(boxesDir, `${boxName}.json`);
                await this.fileService.writeFile(boxPath, JSON.stringify(boxData, null, 2));
            }

            return { success: true, removedCount };
        } catch (error) {
            console.error('Error cleaning box:', error);
            throw error;
        }
    }

    /**
     * 更新盒子中电影的信息
     * @param {string} boxName - 盒子名称
     * @param {string} movieId - 电影ID
     * @param {object} movieInfo - 电影信息
     * @param {string} movieboxDir - 基础目录
     * @returns {Promise<object>} 更新结果
     */
    async updateMovieInBox(boxName, movieId, movieInfo, movieboxDir) {
        try {
            const boxesDir = this.getBoxesDir(movieboxDir);
            const boxData = await this.readBoxFile(boxesDir, boxName);

            if (!boxData || !boxData.movie) {
                throw new Error('盒子不存在');
            }

            const movieIndex = boxData.movie.findIndex(m => m.id === movieId);

            if (movieIndex < 0) {
                throw new Error('电影不存在');
            }

            boxData.movie[movieIndex] = {
                ...boxData.movie[movieIndex],
                ...movieInfo
            };

            const boxPath = path.join(boxesDir, `${boxName}.json`);
            await this.fileService.writeFile(boxPath, JSON.stringify(boxData, null, 2));

            return { success: true };
        } catch (error) {
            console.error('Error updating movie in box:', error);
            throw error;
        }
    }

    async addMoviesToBox(boxName, movieInfoList, movieboxDir) {
        try {
            const boxesDir = this.getBoxesDir(movieboxDir);
            const boxPath = path.join(boxesDir, `${boxName}.json`);

            let boxData = await this.readBoxFile(boxesDir, boxName);

            if (!boxData) {
                boxData = { movie: [], metadata: { name: boxName, description: '' } };
            }

            if (!boxData.movie) {
                boxData.movie = [];
            }

            let addedCount = 0;
            let updatedCount = 0;

            for (const movieInfo of movieInfoList) {
                if (!movieInfo || !movieInfo.id) {
                    continue;
                }

                const existingIndex = boxData.movie.findIndex(m => m.id === movieInfo.id);

                if (existingIndex >= 0) {
                    boxData.movie[existingIndex] = {
                        ...boxData.movie[existingIndex],
                        ...movieInfo
                    };
                    updatedCount++;
                } else {
                    boxData.movie.push({
                        id: movieInfo.id,
                        status: movieInfo.status || 'unwatched',
                        rating: movieInfo.rating || 0,
                        comment: movieInfo.comment || ''
                    });
                    addedCount++;
                }
            }

            await this.fileService.writeFile(boxPath, JSON.stringify(boxData, null, 2));

            return { success: true, addedCount, updatedCount };
        } catch (error) {
            console.error('Error adding movies to box:', error);
            throw error;
        }
    }
}

module.exports = BoxService;

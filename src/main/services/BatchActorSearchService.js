/**
 * 批量演员搜索服务
 * 用于批量搜索和更新演员信息
 */
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

class BatchActorSearchService {
    constructor(settingsService, tmdbAdapterService, r18AdapterService, actorService) {
        this.settingsService = settingsService;
        this.tmdbAdapterService = tmdbAdapterService;
        this.r18AdapterService = r18AdapterService;
        this.actorService = actorService;
        this.cancelled = false;
    }

    cancel() {
        this.cancelled = true;
    }

    resetCancelled() {
        this.cancelled = false;
    }

    getAdapter(adapterType) {
        if (adapterType === 'tmdb') {
            return this.tmdbAdapterService;
        } else if (adapterType === 'r18') {
            return this.r18AdapterService;
        }
        throw new Error(`Unknown adapter type: ${adapterType}`);
    }

    async downloadImage(url, outputPath) {
        return new Promise((resolve, reject) => {
            const protocol = url.startsWith('https') ? https : http;

            const request = protocol.get(url, (response) => {
                if (response.statusCode === 302 || response.statusCode === 301) {
                    const redirectUrl = response.headers.location;
                    this.downloadImage(redirectUrl, outputPath).then(resolve).catch(reject);
                    return;
                }

                if (response.statusCode !== 200) {
                    reject(new Error(`Failed to download image: HTTP ${response.statusCode}`));
                    return;
                }

                const file = fsSync.createWriteStream(outputPath);
                response.pipe(file);
                file.on('finish', () => {
                    file.close();
                    resolve(outputPath);
                });
                file.on('error', (err) => {
                    fsSync.unlink(outputPath, () => { });
                    reject(err);
                });
            });

            request.on('error', (err) => {
                fsSync.unlink(outputPath, () => { });
                reject(err);
            });
        });
    }

    /**
     * 搜索单个演员
     * @param {string} actorName - 演员姓名
     * @param {string} adapterType - 适配器类型 ('tmdb' or 'r18')
     * @returns {Promise<Object>} 搜索结果
     */
    async searchActor(actorName, adapterType) {
        const adapter = this.getAdapter(adapterType);

        try {
            // 搜索演员
            const searchResults = await adapter.searchPerson(actorName);

            if (!searchResults || searchResults.length === 0) {
                return {
                    success: false,
                    status: 'none',
                    actorName: actorName,
                    results: []
                };
            }

            // 选择第一个结果
            const firstResult = searchResults[0];
            const personDetail = await adapter.getPerson(firstResult.actor_id);

            return {
                success: true,
                status: 'completed',
                actorName: actorName,
                result: {
                    name: personDetail.name || actorName,
                    birthday: personDetail.birthday || '',
                    memo: personDetail.memo || '',
                    profile_url: personDetail.profile_url || null,
                    photoBase64: personDetail.photoBase64 || null
                }
            };
        } catch (error) {
            return {
                success: false,
                status: 'error',
                actorName: actorName,
                error: error.message
            };
        }
    }

    /**
     * 批量搜索演员
     * @param {Array} actors - 演员名称列表
     * @param {string} adapterType - 适配器类型
     * @param {Function} progressCallback - 进度回调
     * @returns {Promise<Array>} 搜索结果列表
     */
    async batchSearchActors(actors, adapterType, progressCallback) {
        this.resetCancelled();
        const results = [];

        for (let i = 0; i < actors.length; i++) {
            if (this.cancelled) {
                break;
            }

            const actorName = actors[i];

            if (progressCallback) {
                progressCallback({
                    current: i + 1,
                    total: actors.length,
                    actorName: actorName,
                    status: 'searching'
                });
            }

            const searchResult = await this.searchActor(actorName, adapterType);

            results.push({
                actorName: actorName,
                searchResult: searchResult
            });

            if (progressCallback) {
                progressCallback({
                    current: i + 1,
                    total: actors.length,
                    actorName: actorName,
                    status: searchResult.status,
                    result: searchResult.result
                });
            }
        }

        return results;
    }

    /**
     * 保存演员信息
     * @param {string} oldName - 原演员名称
     * @param {Object} actorInfo - 新演员信息
     * @returns {Promise<Object>} 保存结果
     */
    async saveActorInfo(oldName, actorInfo) {
        try {
            let photoPath = '';

            // 下载并保存照片
            if (actorInfo.profile_url) {
                const photoDir = this.settingsService.getActorPhotoDir();
                if (photoDir) {
                    const ext = path.extname(actorInfo.profile_url) || '.jpg';
                    const fileName = `${Date.now()}_${oldName.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')}${ext}`;
                    photoPath = path.join(photoDir, fileName);

                    try {
                        await this.downloadImage(actorInfo.profile_url, photoPath);
                    } catch (error) {
                        console.error(`Failed to download actor photo: ${error.message}`);
                        photoPath = '';
                    }
                }
            }

            // 更新演员信息
            const newActor = {
                name: actorInfo.name || oldName,
                birthday: actorInfo.birthday || '',
                memo: actorInfo.memo || '',
                photo: photoPath
            };

            // 如果演员已存在，保留原有的 rating 和 favorites
            const existingActors = await this.actorService.loadActors();
            const existingActor = existingActors.find(a => a.name === oldName);
            if (existingActor) {
                newActor.rating = existingActor.rating || 0;
                newActor.favorites = existingActor.favorites || false;
            }

            await this.actorService.updateActor(oldName, newActor);

            return {
                success: true,
                actorName: oldName,
                photoPath: photoPath
            };
        } catch (error) {
            console.error(`Error saving actor ${oldName}:`, error);
            return {
                success: false,
                actorName: oldName,
                error: error.message
            };
        }
    }

    /**
     * 批量保存演员
     * @param {Array} batchResults - 批量搜索结果
     * @param {Function} progressCallback - 进度回调
     * @returns {Promise<Array>} 保存结果列表
     */
    async batchSaveActors(batchResults, progressCallback) {
        this.resetCancelled();
        const savedResults = [];

        for (let i = 0; i < batchResults.length; i++) {
            if (this.cancelled) {
                break;
            }

            const item = batchResults[i];

            // 支持两种格式：1) {actorName, searchResult: {success, result}} 2) {actorName, status, result}
            const searchResult = item.searchResult || { success: item.status === 'completed', result: item.result, status: item.status };

            if (!searchResult.success || !searchResult.result) {
                savedResults.push({
                    actorName: item.actorName,
                    success: false,
                    status: searchResult.status || 'none'
                });
                continue;
            }

            if (progressCallback) {
                progressCallback({
                    current: i + 1,
                    total: batchResults.length,
                    actorName: item.actorName,
                    status: 'saving'
                });
            }

            const saveResult = await this.saveActorInfo(item.actorName, searchResult.result);

            savedResults.push({
                actorName: item.actorName,
                success: saveResult.success,
                status: saveResult.success ? 'saved' : 'error',
                photoPath: saveResult.photoPath,
                error: saveResult.error
            });

            if (progressCallback) {
                progressCallback({
                    current: i + 1,
                    total: batchResults.length,
                    actorName: item.actorName,
                    status: saveResult.success ? 'saved' : 'error'
                });
            }
        }

        return savedResults;
    }
}

module.exports = BatchActorSearchService;
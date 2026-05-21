/**
 * 标签服务
 * 负责从配置文件加载标签数据并提供缓存
 */
const FileService = require('./FileService');
const HardCodeService = require('./HardCodeService');
const path = require('path');

class TagService {
    constructor(tagsPath) {
        this.tagsPath = tagsPath;
        this.fileService = new FileService();
        this.hardCodeService = new HardCodeService();
        this.tagsCache = null;  // 标签缓存
    }

    /**
     * 从配置文件加载标签
     * 如果缓存存在则直接返回缓存
     * @returns {Promise<Array>} 标签数组
     */
    async loadTags() {
        // 如果缓存存在，直接返回
        if (this.tagsCache !== null) {
            return this.tagsCache;
        }

        try {
            const tags = await this.fileService.readJson(this.tagsPath);

            if (tags && Array.isArray(tags)) {
                this.tagsCache = tags;
            } else {
                // 如果配置文件不存在或格式错误，使用默认标签
                this.tagsCache = this.hardCodeService.getDefaultTags();
                // 保存默认标签到配置文件
                await this.saveTags(this.tagsCache);
            }

            return this.tagsCache;
        } catch (error) {
            console.error('Error loading tags:', error);
            this.tagsCache = this.hardCodeService.getDefaultTags();
            return this.tagsCache;
        }
    }

    /**
     * 获取所有标签（同步方法，使用缓存）
     * 如果缓存为空则从文件加载
     * @returns {Array} 标签数组
     */
    getTags() {
        if (this.tagsCache === null) {
            // 同步上下文下，尝试从文件系统读取
            try {
                const fs = require('fs');
                if (fs.existsSync(this.tagsPath)) {
                    const content = fs.readFileSync(this.tagsPath, 'utf-8');
                    this.tagsCache = JSON.parse(content);
                } else {
                    this.tagsCache = this.hardCodeService.getDefaultTags();
                }
            } catch (error) {
                console.error('Error reading tags synchronously:', error);
                this.tagsCache = this.hardCodeService.getDefaultTags();
            }
        }
        return this.tagsCache;
    }

    /**
     * 根据ID获取标签名称
     * @param {string} tagId - 标签ID
     * @returns {string} 标签名称，如果未找到返回null
     */
    getTagNameById(tagId) {
        const tags = this.getTags();
        const tag = tags.find(t => t.id === tagId);
        return tag ? tag.name : null;
    }

    /**
     * 根据ID数组获取标签名称数组
     * @param {Array<string>} tagIds - 标签ID数组
     * @returns {Array<string>} 标签名称数组（只包含已找到的标签）
     */
    getTagNamesByIds(tagIds) {
        if (!tagIds || !Array.isArray(tagIds)) {
            return [];
        }
        return tagIds
            .map(id => this.getTagNameById(id))
            .filter(name => name !== null);
    }

    /**
     * 保存标签到配置文件
     * @param {Array} tags - 标签数组
     */
    async saveTags(tags) {
        try {
            await this.fileService.writeJson(this.tagsPath, tags);
            this.tagsCache = tags;
        } catch (error) {
            console.error('Error saving tags:', error);
            throw error;
        }
    }

    /**
     * 清除缓存，强制重新加载
     */
    clearCache() {
        this.tagsCache = null;
    }

    /**
     * 从 index.json 提取标签并进行比对
     * @param {Object} allIndexMovies - 所有分类的电影索引数据
     * @returns {Array} 未管理且使用次数 > 1 的标签列表
     */
    extractAndCompareTags(allIndexMovies) {
        const tagCount = {};
        
        Object.values(allIndexMovies).forEach(movies => {
            movies.forEach(movie => {
                if (movie.tags && Array.isArray(movie.tags)) {
                    movie.tags.forEach(tag => {
                        if (tag && tag.trim()) {
                            const normalizedTag = tag.trim();
                            tagCount[normalizedTag] = (tagCount[normalizedTag] || 0) + 1;
                        }
                    });
                }
            });
        });

        const managedTags = this.getTags();
        const managedTagSet = new Set(managedTags.map(t => t.id));

        const newTags = Object.entries(tagCount)
            .filter(([tagName, count]) => count > 1 && !managedTagSet.has(tagName))
            .map(([tagName, count]) => ({ name: tagName, count }))
            .sort((a, b) => b.count - a.count);

        return newTags;
    }

    /**
     * 批量添加标签
     * @param {Array} tagsToAdd - 要添加的标签数组 [{ id, name }]
     * @returns {Promise<Object>} 添加结果
     */
    async batchAddTags(tagsToAdd) {
        try {
            const existingTags = await this.loadTags();
            const addedTags = [];
            
            for (const tag of tagsToAdd) {
                if (!existingTags.find(t => t.id === tag.id)) {
                    existingTags.push({ id: tag.id, name: tag.name });
                    addedTags.push(tag);
                }
            }
            
            await this.saveTags(existingTags);
            return { success: true, addedCount: addedTags.length };
        } catch (error) {
            console.error('Error batch adding tags:', error);
            throw error;
        }
    }
}

module.exports = TagService;

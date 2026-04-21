/**
 * 分类服务
 * 负责从配置文件加载分类数据并提供缓存
 */
const FileService = require('./FileService');
const HardCodeService = require('./HardCodeService');
const path = require('path');

class CategoryService {
    constructor(categoryConfigPath) {
        this.categoryConfigPath = categoryConfigPath;
        this.fileService = new FileService();
        this.hardCodeService = new HardCodeService();
        this.categoriesCache = null;  // 分类缓存
    }

    /**
     * 从配置文件加载分类数据
     * 如果缓存存在则直接返回缓存
     * @returns {Promise<Array>} 分类数组
     */
    async loadCategories() {
        // 如果缓存存在，直接返回
        if (this.categoriesCache !== null) {
            return this.categoriesCache;
        }

        try {
            const config = await this.fileService.readJson(this.categoryConfigPath);

            if (config && config.categories && Array.isArray(config.categories)) {
                this.categoriesCache = config.categories;
            } else {
                // 如果配置文件不存在或格式错误，使用默认分类
                this.categoriesCache = this.hardCodeService.getDefaultCategories();
                // 保存默认分类到配置文件
                await this.saveCategories(this.categoriesCache);
            }

            return this.categoriesCache;
        } catch (error) {
            console.error('Error loading categories:', error);
            this.categoriesCache = this.hardCodeService.getDefaultCategories();
            return this.categoriesCache;
        }
    }

    /**
     * 获取所有分类（同步方法，使用缓存）
     * 如果缓存为空则从文件加载
     * @returns {Array} 分类数组
     */
    getCategories() {
        if (this.categoriesCache === null) {
            // 同步上下文下，尝试从文件系统读取
            try {
                const fs = require('fs');
                if (fs.existsSync(this.categoryConfigPath)) {
                    const content = fs.readFileSync(this.categoryConfigPath, 'utf-8');
                    const config = JSON.parse(content);
                    this.categoriesCache = config.categories || this.hardCodeService.getDefaultCategories();
                } else {
                    this.categoriesCache = this.hardCodeService.getDefaultCategories();
                }
            } catch (error) {
                console.error('Error reading categories synchronously:', error);
                this.categoriesCache = this.hardCodeService.getDefaultCategories();
            }
        }
        return this.categoriesCache;
    }

    /**
     * 根据ID获取分类信息
     * @param {string} categoryId - 分类ID
     * @returns {object|null} 分类信息，如果未找到返回null
     */
    getCategoryById(categoryId) {
        const categories = this.getCategories();
        const category = categories.find(c => c.id === categoryId);
        return category || null;
    }

    /**
     * 根据ID获取分类名称
     * @param {string} categoryId - 分类ID
     * @returns {string|null} 分类名称，如果未找到返回null
     */
    getCategoryName(categoryId) {
        const category = this.getCategoryById(categoryId);
        return category ? category.name : null;
    }

    /**
     * 根据ID获取分类短名称
     * @param {string} categoryId - 分类ID
     * @returns {string|null} 分类短名称，如果未找到返回null
     */
    getCategoryShortName(categoryId) {
        const category = this.getCategoryById(categoryId);
        return category ? category.shortName : null;
    }

    /**
     * 根据ID获取分类图标路径
     * @param {string} categoryId - 分类ID
     * @returns {string|null} 分类图标路径，如果未找到返回null
     */
    getCategoryIcon(categoryId) {
        const category = this.getCategoryById(categoryId);
        return category ? category.icon : null;
    }

    /**
     * 根据ID获取分类颜色
     * @param {string} categoryId - 分类ID
     * @returns {string|null} 分类颜色，如果未找到返回null
     */
    getCategoryColor(categoryId) {
        const category = this.getCategoryById(categoryId);
        return category ? category.color : null;
    }

    /**
     * 保存分类到配置文件
     * @param {Array} categories - 分类数组
     */
    async saveCategories(categories) {
        try {
            const config = {
                categories: categories
            };
            await this.fileService.writeJson(this.categoryConfigPath, config);
            this.categoriesCache = categories;
        } catch (error) {
            console.error('Error saving categories:', error);
            throw error;
        }
    }

    /**
     * 清除缓存，强制重新加载
     */
    clearCache() {
        this.categoriesCache = null;
    }

    /**
     * 获取分类数量
     * @returns {Promise<number>} 分类数量
     */
    async getCategoryCount() {
        const categories = await this.loadCategories();
        return categories.length;
    }
}

module.exports = CategoryService;

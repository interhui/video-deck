/**
 * 演员服务
 * 负责从配置文件加载演员数据并提供缓存
 */
const FileService = require('./FileService');
const path = require('path');

class ActorService {
    constructor(actorFilePath) {
        this.actorFilePath = actorFilePath;
        this.fileService = new FileService();
        this.actorsCache = null;  // 演员缓存
    }

    /**
     * 从配置文件加载演员
     * 如果缓存存在则直接返回缓存
     * @returns {Promise<Array>} 演员数组
     */
    async loadActors() {
        // 如果缓存存在，直接返回
        if (this.actorsCache !== null) {
            return this.actorsCache;
        }

        try {
            const data = await this.fileService.readJson(this.actorFilePath);

            if (data && Array.isArray(data.actor)) {
                this.actorsCache = data.actor;
            } else {
                // 如果配置文件不存在或格式错误，返回空数组
                this.actorsCache = [];
            }

            return this.actorsCache;
        } catch (error) {
            console.error('Error loading actors:', error.message || error);
            this.actorsCache = [];
            return this.actorsCache;
        }
    }

    /**
     * 获取所有演员（同步方法，使用缓存）
     * 如果缓存为空则从文件加载
     * @returns {Array} 演员数组
     */
    getActors() {
        if (this.actorsCache === null) {
            // 同步上下文下，尝试从文件系统读取
            try {
                const fs = require('fs');
                if (fs.existsSync(this.actorFilePath)) {
                    const content = fs.readFileSync(this.actorFilePath, 'utf-8');
                    const data = JSON.parse(content);
                    this.actorsCache = data.actor || [];
                } else {
                    this.actorsCache = [];
                }
            } catch (error) {
                console.error('Error reading actors synchronously:', error.message || error);
                this.actorsCache = [];
            }
        }
        return this.actorsCache;
    }

    /**
     * 添加演员
     * @param {Object} actor - 演员对象
     * @param {string} actor.name - 演员姓名（必填）
     * @param {string} actor.nickname - 昵称
     * @param {string} actor.birthday - 生日
     * @param {string} actor.memo - 备注
     * @param {string} actor.photo - 照片地址
     * @returns {Promise<void>}
     */
    async addActor(actor) {
        if (!actor || !actor.name) {
            throw new Error('演员姓名不能为空');
        }

        const actors = await this.loadActors();

        // 检查是否已存在同名演员
        if (actors.find(a => a.name === actor.name)) {
            throw new Error('演员已存在');
        }

        actors.push({
            name: actor.name,
            nickname: actor.nickname || '',
            birthday: actor.birthday || '',
            memo: actor.memo || '',
            photo: actor.photo || '',
            rating: actor.rating || 0,
            favorites: actor.favorites || false
        });

        await this.saveActors(actors);
    }

    /**
     * 更新演员
     * @param {string} oldName - 原演员姓名
     * @param {Object} newActor - 新演员对象
     * @returns {Promise<void>}
     */
    async updateActor(oldName, newActor) {
        if (!oldName) {
            throw new Error('原演员姓名不能为空');
        }

        const actors = await this.loadActors();
        const index = actors.findIndex(a => a.name === oldName);

        if (index === -1) {
            throw new Error('演员不存在');
        }

        // 如果新姓名与旧姓名不同，且新姓名已存在，则报错
        if (newActor.name && newActor.name !== oldName) {
            if (actors.find(a => a.name === newActor.name)) {
                throw new Error('新演员姓名已存在');
            }
        }

        actors[index] = {
            name: newActor.name || oldName,
            nickname: newActor.nickname !== undefined ? newActor.nickname : actors[index].nickname,
            birthday: newActor.birthday !== undefined ? newActor.birthday : actors[index].birthday,
            memo: newActor.memo !== undefined ? newActor.memo : actors[index].memo,
            photo: newActor.photo !== undefined ? newActor.photo : actors[index].photo,
            rating: newActor.rating !== undefined ? newActor.rating : (actors[index].rating || 0),
            favorites: newActor.favorites !== undefined ? newActor.favorites : (actors[index].favorites || false)
        };

        await this.saveActors(actors);
    }

    /**
     * 删除演员
     * @param {string} name - 演员姓名
     * @returns {Promise<void>}
     */
    async deleteActor(name) {
        if (!name) {
            throw new Error('演员姓名不能为空');
        }

        const actors = await this.loadActors();
        const index = actors.findIndex(a => a.name === name);

        if (index === -1) {
            throw new Error('演员不存在');
        }

        actors.splice(index, 1);
        await this.saveActors(actors);
    }

    /**
     * 保存演员到配置文件
     * @param {Array} actors - 演员数组
     */
    async saveActors(actors) {
        try {
            const data = { actor: actors };
            await this.fileService.writeJson(this.actorFilePath, data);
            this.actorsCache = actors;
        } catch (error) {
            console.error('Error saving actors:', error.message || error);
            throw error;
        }
    }

    /**
     * 清除缓存，强制重新加载
     */
    clearCache() {
        this.actorsCache = null;
    }

    /**
     * 切换演员配置文件路径（用于切换影视库时重定向）
     * @param {string} newPath - 新的 actor.json 文件路径
     */
    setActorFilePath(newPath) {
        this.actorFilePath = newPath;
        this.actorsCache = null;
    }

    /**
     * 获取演员数量
     * @returns {Promise<number>} 演员数量
     */
    async getActorCount() {
        const actors = await this.loadActors();
        return actors.length;
    }

    /**
     * 批量导入演员（仅导入不在actor.json中的新演员）
     * @param {Array<string>} actorNames - 演员姓名数组
     * @returns {Promise<object>} 导入结果 {added: number, skipped: number, addedActors: Array}
     */
    async importActors(actorNames) {
        if (!actorNames || !Array.isArray(actorNames)) {
            return { added: 0, skipped: 0, addedActors: [] };
        }

        const actors = await this.loadActors();
        const existingNames = new Set(actors.map(a => a.name));
        
        const addedActors = [];
        let added = 0;
        let skipped = 0;

        for (const actorName of actorNames) {
            if (!actorName || typeof actorName !== 'string') {
                skipped++;
                continue;
            }

            const trimmedName = actorName.trim();
            if (!trimmedName) {
                skipped++;
                continue;
            }

            if (existingNames.has(trimmedName)) {
                skipped++;
                continue;
            }

            const newActor = {
                name: trimmedName,
                nickname: '',
                birthday: '',
                memo: '',
                rating: 0,
                favorites: false
            };

            actors.push(newActor);
            existingNames.add(trimmedName);
            addedActors.push(newActor);
            added++;
        }

        if (added > 0) {
            await this.saveActors(actors);
        }

        return { added, skipped, addedActors };
    }
}

module.exports = ActorService;

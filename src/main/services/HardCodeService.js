/**
 * 硬编码配置服务
 * 负责管理所有硬编码的默认配置数据
 * 包括默认设置、默认标签、默认分类等
 */
const path = require('path');

class HardCodeService {
    /**
     * 获取默认设置
     * @returns {object} 默认设置
     */
    getDefaultSettings() {
        return {
            version: '1.0.0',
            lastUpdate: Date.now(),

            appearance: {
                theme: 'dark',
                language: 'zh-CN'
            },

            layout: {
                sidebarWidth: 200,
                posterSize: 'medium',
                columns: 6,
                viewMode: 'grid',
                sortBy: 'name-asc',
                sortOrder: 'asc'
            },

            library: {
                moviesDir: path.join(__dirname, 'movies'),
                actorPhotoDir: path.join(__dirname, 'actors'),
                newMovieHours: 72
            },

            moviebox: {
                movieboxDir: path.join(__dirname, 'boxes')
            },

            tmdb: {
                url: 'api.themoviedb.org',
                token: '',
                language: 'zh-CN'
            },

            r18: {
                dbUrl: '',
                dbUsername: '',
                dbPassword: ''
            },

            videoParsing: {
                ffmpegPath: '',
                ffprobePath: ''
            }
        };
    }

    /**
     * 获取默认标签
     * @returns {Array} 默认标签数组
     */
    getDefaultTags() {
        return [
            { id: 'action', name: '动作' },
            { id: 'adventure', name: '冒险' },
            { id: 'rpg', name: '角色扮演' },
            { id: 'strategy', name: '策略' },
            { id: 'simulation', name: '模拟' },
            { id: 'sports', name: '体育' },
            { id: 'racing', name: '竞速' },
            { id: 'puzzle', name: '解谜' },
            { id: 'horror', name: '恐怖' },
            { id: 'multiplayer', name: '多人' }
        ];
    }

    /**
     * 获取默认分类列表
     * @returns {Array} 默认分类数组
     */
    getDefaultCategories() {
        return [
            {
                id: 'movie',
                name: '电影',
                shortName: '电影',
                icon: 'image/category-icons/movie.png',
                color: '#003791',
                order: 1
            },
            {
                id: 'tv',
                name: '电视剧',
                shortName: '剧集',
                icon: 'image/category-icons/tv.png',
                color: '#107C10',
                order: 2
            },
            {
                id: 'documentary',
                name: '纪录片',
                shortName: '纪录片',
                icon: 'image/category-icons/documentary.png',
                color: '#E60012',
                order: 3
            },
            {
                id: 'anime',
                name: '动漫',
                shortName: '动漫',
                icon: 'image/category-icons/anime.png',
                color: '#888888',
                order: 4
            }
        ];
    }
}

module.exports = HardCodeService;

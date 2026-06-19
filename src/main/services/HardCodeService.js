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
                posterStyle: 'vertical',
                columns: 6,
                viewMode: 'grid',
                sortBy: 'name-asc',
                sortOrder: 'asc'
            },

            library: {
                libraries: {
                    default: {
                        moviesDir: path.join(__dirname, 'movies'),
                        actorPhotoDir: path.join(__dirname, 'actors'),
                        movieboxDir: path.join(__dirname, 'boxes')
                    }
                },
                currentLibrary: 'default',
                newMovieHours: 72
            },

            tmdb: {
                url: 'api.themoviedb.org',
                token: '',
                language: 'zh-CN',
                posterUrl: 'https://image.tmdb.org/t/p'
            },

            r18: {
                dbUrl: '',
                dbUsername: '',
                dbPassword: '',
                posterUrl: 'https://pics.dmm.co.jp'
            },

            videoParsing: {
                ffmpegPath: '',
                ffprobePath: ''
            },

            proxy: {
                enabled: false,
                address: '',
                username: '',
                password: ''
            },

            http: {
                enabled: false,
                listenAddress: '0.0.0.0',
                listenPort: 8080
            },

            player: {
                subtitle: {
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    fontSize: '36px',
                    fontWeight: '800',
                    textStroke: '2px #000'
                }
            }
        };
    }

    /**
     * 获取默认标签
     * @returns {Array} 默认标签数组
     */
    getDefaultTags() {
        return [
            { id: '动作', name: '动作' },
            { id: '剧情', name: '剧情' },
            { id: '动画', name: '动画' },
            { id: '爱情', name: '爱情' },
            { id: '战争', name: '战争' }
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

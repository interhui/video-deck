/**
 * R18电影适配服务
 * 用于通过电影名称获取电影详细信息，从PostgreSQL数据库查询
 */
const { Pool } = require('pg');
const { makeHttpRequest, checkUrlAccessible } = require('../utils/http-utils');

class R18AdapterService {
    constructor(settingsService, tmdbAdapterService) {
        this.settingsService = settingsService;
        this.tmdbAdapterService = tmdbAdapterService;
        this.pool = null;
    }

    getR18Config() {
        const settings = this.settingsService.getSettings();
        return {
            dbUrl: settings.r18?.dbUrl || '',
            dbUsername: settings.r18?.dbUsername || '',
            dbPassword: settings.r18?.dbPassword || ''
        };
    }

    async initPool() {
        const config = this.getR18Config();

        if (!config.dbUrl) {
            throw new Error('R18 database URL not configured');
        }

        if (this.pool) {
            return this.pool;
        }

        // 解析 connectionString 提取 host/port/database
        const urlMatch = config.dbUrl.match(/postgresql:\/\/([^:]+):(\d+)\/(\w+)/);
        const poolConfig = {
            max: 10,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 5000
        };

        if (urlMatch) {
            poolConfig.host = urlMatch[1].split('@').pop(); // 移除可能的 user@ 部分
            poolConfig.port = parseInt(urlMatch[2], 10);
            poolConfig.database = urlMatch[3];
            poolConfig.user = config.dbUsername;
            poolConfig.password = config.dbPassword;
            // 处理 user@host 格式
            const userHostMatch = config.dbUrl.match(/postgresql:\/\/([^@]+)@([^:]+):(\d+)\/(\w+)/);
            if (userHostMatch) {
                poolConfig.user = userHostMatch[1];
                poolConfig.host = userHostMatch[2];
                poolConfig.port = parseInt(userHostMatch[3], 10);
                poolConfig.database = userHostMatch[4];
            }
        } else {
            // 后备方案：直接使用 connectionString
            poolConfig.connectionString = config.dbUrl;
            poolConfig.user = config.dbUsername;
            poolConfig.password = config.dbPassword;
        }

        console.debug('[R18AdapterService] Pool config:', {
            host: poolConfig.host,
            port: poolConfig.port,
            database: poolConfig.database,
            user: poolConfig.user,
            passwordSet: !!poolConfig.password
        });

        this.pool = new Pool(poolConfig);

        return this.pool;
    }

    async closePool() {
        if (this.pool) {
            await this.pool.end();
            this.pool = null;
        }
    }

    async query(sql) {
        const pool = await this.initPool();
        try {
            const result = await pool.query(sql);
            return result.rows;
        } catch (error) {
            console.error('[R18AdapterService] Database query error:', error);
            console.error('[R18AdapterService] Error details:', error.message);
            throw error;
        }
    }

    async makeHttpRequest(url) {
        return makeHttpRequest(url);
    }

    buildImageUrl(path) {
        if (!path) return null;
        // 如果path以ps结尾，替换为pl
        let finalPath = path;
        if (path.endsWith('ps')) {
            finalPath = path.slice(0, -2) + 'pl';
        }
        return `https://pics.dmm.co.jp/${finalPath}.jpg`;
    }

    /**
     * 从日期字符串中提取年份
     * @param {string} dateStr - 日期字符串
     * @returns {string} 年份字符串，无法解析时返回空字符串
     */
    extractYear(dateStr) {
        if (!dateStr) return '';
        try {
            const year = new Date(dateStr).getFullYear();
            if (isNaN(year)) {
                console.warn(`[R18AdapterService] Cannot parse year from date: ${dateStr}`);
                return '';
            }
            return year.toString();
        } catch (error) {
            console.warn(`[R18AdapterService] Error parsing date: ${dateStr}`, error.message);
            return '';
        }
    }

    /**
     * 检查图片URL是否可访问
     * @param {string} url - 图片URL
     * @returns {Promise<boolean>} URL可访问返回true
     */
    async checkImageAccessible(url) {
        try {
            return await checkUrlAccessible(url);
        } catch (error) {
            console.error(`[R18AdapterService] Error checking image URL: ${url}`, error.message);
            return false;
        }
    }

    async searchMovie(keyword) {
        const config = this.getR18Config();

        if (!config.dbUrl) {
            throw new Error('R18 database URL not configured');
        }

        if (!keyword || typeof keyword !== 'string') {
            throw new Error('Keyword is required');
        }

        const escapedKeyword = keyword.trim().replace(/'/g, "''");
        const sql = `
            select
                dv.dvd_id as search_id,
                dv.title_ja as title,
                dv.release_date as year,
                '' as poster_url
            from
                derived_video as dv
            where
                dv.dvd_id is not null and
                (dv.title_ja like '%${escapedKeyword}%' or dv.dvd_id like '%${escapedKeyword}%')
        `;

        const rows = await this.query(sql);

        return rows.map(row => ({
            title: row.title || '',
            overview: row.overview || '',
            year: this.extractYear(row.year),
            search_id: row.search_id,
            poster_url: row.poster_url || null
        }));
    }

    async getMovie(searchId) {
        const config = this.getR18Config();

        if (!config.dbUrl) {
            throw new Error('R18 database URL not configured');
        }

        if (!searchId || typeof searchId !== 'string' || searchId.trim() === '') {
            console.error('[R18AdapterService] Invalid searchId:', searchId);
            throw new Error('Search ID is required');
        }

        const escapedId = searchId.toString().replace(/'/g, "''");
        const sql = `
            SELECT
                dv.dvd_id as movie_id,
                dv.title_ja as title,
                dv.runtime_mins as runtime,
                dv.release_date as year,
                dv.jacket_full_url as poster_url,
                dm.name_en as production_companies,
                (
                    SELECT STRING_AGG(dc.name_ja, ',' ORDER BY dc.name_ja)
                    FROM derived_video_category dvc
                    JOIN derived_category dc ON dvc.category_id = dc.id
                    WHERE dvc.content_id = dv.content_id
                ) AS tags,
                (
                    SELECT STRING_AGG(DISTINCT da.name_kanji, ',' ORDER BY da.name_kanji)
                    FROM derived_video_actress dva
                    JOIN derived_actress da ON dva.actress_id = da.id
                    WHERE dva.content_id = dv.content_id
                ) AS actors,
                (
                    SELECT STRING_AGG(dd.name_kanji, ',' ORDER BY dd.name_kanji)
                    FROM derived_video_director dvd
                    JOIN derived_director dd ON dvd.director_id = dd.id
                    WHERE dvd.content_id = dv.content_id
                ) AS directors
            FROM derived_video dv
            LEFT JOIN derived_maker dm ON dv.maker_id = dm.id
            LEFT JOIN derived_label dl ON dv.label_id = dl.id
            LEFT JOIN derived_series ds ON dv.series_id = ds.id
            WHERE dv.dvd_id = '${escapedId}'
        `;

        const rows = await this.query(sql);

        if (rows.length === 0) {
            return null;
        }

        const movie = rows[0];

        let actors = [];
        if (movie.actors && typeof movie.actors === 'string') {
            actors = movie.actors.split(',').map(name => name.trim()).filter(name => name).map(name => ({
                person_id: '',
                name: name,
                profile_url: null
            }));
        }

        let directors = [];
        if (movie.directors && typeof movie.directors === 'string') {
            directors = movie.directors.split(',').map(name => name.trim()).filter(name => name).map(name => ({
                person_id: '',
                name: name,
                profile_url: null
            }));
        }

        let tags = [];
        if (movie.tags && typeof movie.tags === 'string') {
            tags = movie.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
        }

        // 构建海报URL并检查是否可访问
        const posterUrl = this.buildImageUrl(movie.poster_url || null);
        let posterAccessible = false;
        if (posterUrl) {
            posterAccessible = await this.checkImageAccessible(posterUrl);
            if (!posterAccessible) {
                console.log(`[R18AdapterService] Poster URL not accessible: ${posterUrl}`);
            }
        }

        return {
            movie_id: movie.movie_id || '',
            title: movie.title || '',
            overview: movie.overview || '',
            tags: tags || '',
            production_companies: movie.production_companies ? [movie.production_companies] : [],
            runtime: movie.runtime || 0,
            poster_url: posterAccessible ? posterUrl : null,
            actors: actors,
            directors: directors,
            year: this.extractYear(movie.year)
        };
    }

    async searchPerson(actorName) {
        const config = this.getR18Config();

        if (!config.dbUrl) {
            throw new Error('R18 database URL not configured');
        }

        if (!actorName || typeof actorName !== 'string') {
            throw new Error('Actor name is required');
        }

        const escapedName = actorName.trim().replace(/'/g, "''");

        const sql = `
        select
            da.id as actor_id,
            da.name_kanji as actor_name
        from
            derived_actress da
        where
            da.name_kanji like '%${escapedName}%'
        `;

        const rows = await this.query(sql);

        return rows.map(row => ({
            actor_id: row.actor_id || '',
            actor_name: row.actor_name || '',
            actor_profile_url: row.actor_profile_url || null
        }));
    }

    async getPerson(actorId) {
        const config = this.getR18Config();

        if (!config.dbUrl) {
            throw new Error('R18 database URL not configured');
        }

        if (!actorId) {
            throw new Error('Actor ID is required');
        }

        const escapedId = actorId.toString().replace(/'/g, "''");
        const query = `SELECT DISTINCT ?item ?itemLabel ?image ?imdbId ?birthday ?height WHERE {
                SERVICE wikibase:label { bd:serviceParam wikibase:language "[AUTO_LANGUAGE],mul,en". }
                {
                    SELECT DISTINCT ?item WHERE {
                    ?item p:P9781 ?statement0.
                    ?statement0 ps:P9781 "${escapedId}".
                    }
                    LIMIT 3
                }
                OPTIONAL { ?item wdt:P18 ?image. }
                OPTIONAL { ?item wdt:P4985 ?imdbId. }
                OPTIONAL { ?item wdt:P569 ?birthday. }
                OPTIONAL { ?item wdt:P2048 ?height. }
            }`;

        const encodedQuery = encodeURIComponent(query);
        const url = `https://query.wikidata.org/sparql?query=${encodedQuery}&format=json`;

        try {
            const response = await this.makeHttpRequest(url);

            if (!response.results || !response.results.bindings || response.results.bindings.length === 0) {
                return {
                    name: '',
                    birthday: '',
                    memo: '',
                    profile_url: null
                };
            }

            const binding = response.results.bindings[0];
            const name = binding.itemLabel?.value || '';
            
            let birthday = '';
            if (binding.birthday?.value) {
                const date = new Date(binding.birthday.value);
                birthday = date.toISOString().split('T')[0];
            }

            const height = binding.height?.value || '';
            const profileUrl = binding.image?.value || null;

            const imdbId = binding.imdbId?.value || '';

            if (imdbId) {
                try {
                    const tmdbPerson = await this.tmdbAdapterService.getPerson(imdbId);
                    return {
                        name: tmdbPerson.name || name,
                        birthday: tmdbPerson.birthday || birthday,
                        memo: tmdbPerson.memo || height,
                        profile_url: tmdbPerson.profile_url || profileUrl
                    };
                } catch (error) {
                    console.error('Error fetching TMDB person:', error);
                }
            }

            return {
                name: name,
                birthday: birthday,
                memo: height,
                profile_url: profileUrl
            };
        } catch (error) {
            console.error('Error fetching Wikidata:', error.message);
            return {
                name: '',
                birthday: '',
                memo: '',
                profile_url: null
            };
        }
    }
}

module.exports = R18AdapterService;
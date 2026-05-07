/**
 * R18电影适配服务
 * 用于通过电影名称获取电影详细信息，从PostgreSQL数据库查询
 */
const { Pool } = require('pg');
const { makeHttpRequest } = require('../utils/http-utils');

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

        this.pool = new Pool({
            connectionString: config.dbUrl,
            user: config.dbUsername,
            password: config.dbPassword,
            max: 10,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 5000
        });

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
            console.error('Database query error:', error);
            throw error;
        }
    }

    async makeHttpRequest(url) {
        return makeHttpRequest(url);
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
                movie_id as search_id, 
                movie_name as title, 
                description as overview, 
                year, 
                poster_url 
            from 
                movie_lib 
            where 
                movie_name like '%${escapedKeyword}%' or movie_id like '%${escapedKeyword}%'
        `;

        const rows = await this.query(sql);

        return rows.map(row => ({
            title: row.title || '',
            overview: row.overview || '',
            year: row.year || '',
            search_id: row.search_id,
            poster_url: row.poster_url || null
        }));
    }

    async getMovie(searchId) {
        const config = this.getR18Config();

        if (!config.dbUrl) {
            throw new Error('R18 database URL not configured');
        }

        if (!searchId) {
            throw new Error('Search ID is required');
        }

        const escapedId = searchId.toString().replace(/'/g, "''");
        const sql = `
            select 
                movie_id, 
                movie_name as title, 
                description as overview, 
                tags,
                studio as production_companies,
                runtime as runtime,
                actors,
                directors,
                year, 
                poster_url 
            from 
                movie_lib 
            where
                movie_id='${escapedId}'
        `;

        const rows = await this.query(sql);

        if (rows.length === 0) {
            return null;
        }

        const movie = rows[0];

        let actors = [];
        if (movie.actors) {
            try {
                const actorData = typeof movie.actors === 'string' ? JSON.parse(movie.actors) : movie.actors;
                if (Array.isArray(actorData)) {
                    actors = actorData.map(actor => ({
                        person_id: actor.actor_id || actor.id || '',
                        name: actor.actor_name || actor.name || '',
                        profile_url: actor.actor_profile_url || actor.profile_url || null
                    }));
                }
            } catch (e) {
                console.error('Error parsing actors data:', e);
            }
        }

        let directors = [];
        if (movie.directors) {
            try {
                const directorData = typeof movie.directors === 'string' ? JSON.parse(movie.directors) : movie.directors;
                if (Array.isArray(directorData)) {
                    directors = directorData.map(director => ({
                        person_id: director.director_id || director.id || '',
                        name: director.director_name || director.name || '',
                        profile_url: director.director_profile_url || director.profile_url || null
                    }));
                }
            } catch (e) {
                console.error('Error parsing directors data:', e);
            }
        }

        let tags = [];
        if (movie.tags) {
            try {
                const tagData = typeof movie.tags === 'string' ? JSON.parse(movie.tags) : movie.tags;
                if (Array.isArray(tagData)) {
                    tags = tagData;
                } else if (typeof tagData === 'string') {
                    tags = tagData.split(',').map(t => t.trim()).filter(t => t);
                }
            } catch (e) {
                if (typeof movie.tags === 'string') {
                    tags = movie.tags.split(',').map(t => t.trim()).filter(t => t);
                }
            }
        }

        let productionCompanies = [];
        if (movie.production_companies) {
            try {
                const companyData = typeof movie.production_companies === 'string' 
                    ? JSON.parse(movie.production_companies) : movie.production_companies;
                if (Array.isArray(companyData)) {
                    productionCompanies = companyData;
                } else if (typeof companyData === 'string') {
                    productionCompanies = companyData.split(',').map(c => c.trim()).filter(c => c);
                }
            } catch (e) {
                if (typeof movie.production_companies === 'string') {
                    productionCompanies = movie.production_companies.split(',').map(c => c.trim()).filter(c => c);
                }
            }
        }

        return {
            movie_id: movie.movie_id || '',
            title: movie.title || '',
            overview: movie.overview || '',
            tags: tags || '',
            production_companies: productionCompanies || '',
            runtime: movie.runtime || 0,
            poster_url: movie.poster_url || null,
            actors: actors,
            directors: directors,
            year: movie.year || ''
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
                actor_id,
                actor_name,
                actor_profile_url
            from
                devli_actress
            where
                actor_name like '%${escapedName}%'
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
                    return {
                        name: name,
                        birthday: birthday,
                        memo: height,
                        profile_url: profileUrl
                    };
                }
            }

            return {
                name: name,
                birthday: birthday,
                memo: height,
                profile_url: profileUrl
            };
        } catch (error) {
            console.error('Error fetching Wikidata:', error);
            throw error;
        }
    }
}

module.exports = R18AdapterService;
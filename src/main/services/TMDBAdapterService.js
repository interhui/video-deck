/**
 * TMDB电影适配服务
 * 用于通过电影名称获取电影详细信息
 */
const https = require('https');

class TMDBMovieAdapterService {
    constructor(settingsService) {
        this.settingsService = settingsService;
    }

    getTmdbConfig() {
        const settings = this.settingsService.getSettings();
        return {
            url: settings.tmdb?.url || 'api.themoviedb.org',
            token: settings.tmdb?.token || '',
            language: settings.tmdb?.language || 'zh-CN'
        };
    }

    buildImageUrl(path, size = 'original') {
        if (!path) return null;
        return `https://image.tmdb.org/t/p/${size}${path}`;
    }

    makeRequest(url, token) {
        return new Promise((resolve, reject) => {
            const options = {
                hostname: url.split('/')[0],
                path: '/' + url.split('/').slice(1).join('/'),
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            };

            const req = https.request(options, (res) => {
                let data = '';

                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        try {
                            resolve(JSON.parse(data));
                        } catch (error) {
                            reject(new Error(`JSON parse error: ${error.message}`));
                        }
                    } else {
                        reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                    }
                });
            });

            req.on('error', (error) => {
                reject(error);
            });

            req.setTimeout(10000, () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });

            req.end();
        });
    }

    async searchMovie(keyword) {
        const config = this.getTmdbConfig();

        if (!config.token) {
            throw new Error('TMDB token not configured');
        }

        if (!keyword || typeof keyword !== 'string') {
            throw new Error('Keyword is required');
        }

        const encodedKeyword = encodeURIComponent(keyword.trim());
        const url = `${config.url}/3/search/movie?include_adult=false&include_video=false&language=${config.language}&page=1&query=${encodedKeyword}`;

        const response = await this.makeRequest(url, config.token);

        if (!response.results || !Array.isArray(response.results)) {
            return [];
        }

        return response.results.map(movie => ({
            title: movie.title || '',
            overview: movie.overview || '',
            year: movie.release_date ? movie.release_date.split('-')[0] : '',
            search_id: movie.id,
            poster_url: this.buildImageUrl(movie.poster_path, 'w200')
        }));
    }

    async getMovie(searchId) {
        const config = this.getTmdbConfig();

        if (!config.token) {
            throw new Error('TMDB token not configured');
        }

        if (!searchId) {
            throw new Error('Search ID is required');
        }

        const url = `${config.url}/3/movie/${searchId}?language=${config.language}&append_to_response=credits`;
        const movie = await this.makeRequest(url, config.token);
        const genres = (movie.genres || []).map(g => g.name);
        const productionCompanies = (movie.production_companies || []).map(c => c.name);
        const runtime = movie.runtime || 0;
        const posterUrl = this.buildImageUrl(movie.poster_path, 'original');

        const actors = (movie.credits?.cast || []).map(actor => ({
            person_id: actor.id,
            name: actor.name,
            character: actor.character,
            profile_url: this.buildImageUrl(actor.profile_path, 'w200')
        }));

        const directors = (movie.credits?.crew || [])
            .filter(crew => crew.job === 'Director')
            .map(director => ({
                person_id: director.id,
                name: director.name,
                profile_url: this.buildImageUrl(director.profile_path, 'w200')
            }));

        return {
            movie_id: movie.imdb_id || '',
            title: movie.title || '',
            overview: movie.overview || '',
            genres: genres,
            production_companies: productionCompanies,
            runtime: runtime,
            poster_url: posterUrl,
            actors: actors,
            directors: directors,
            year: movie.release_date ? movie.release_date.split('-')[0] : ''
        };
    }

    async getPerson(personId) {
        const config = this.getTmdbConfig();

        if (!config.token) {
            throw new Error('TMDB token not configured');
        }

        if (!personId) {
            throw new Error('Person ID is required');
        }

        const url = `${config.url}/3/person/${personId}?language=${config.language}`;
        const person = await this.makeRequest(url, config.token);

        return {
            name: person.name || '',
            birthday: person.birthday || '',
            biography: person.biography || '',
            profile_url: this.buildImageUrl(person.profile_path, 'original')
        };
    }
}

module.exports = TMDBMovieAdapterService;
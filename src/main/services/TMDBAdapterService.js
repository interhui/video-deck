/**
 * TMDB电影适配服务
 * 用于通过电影名称获取电影详细信息
 */
const { makeHttpRequest } = require('../utils/http-utils');

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
        const posterBaseUrl = this.settingsService.getSettings().tmdb?.posterUrl || 'https://image.tmdb.org/t/p';
        return `${posterBaseUrl}/${size}${path}`;
    }

    async makeRequest(url, token) {
        return makeHttpRequest(url, { token });
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
        const url = `${config.url}/3/search/movie?include_video=false&language=${config.language}&page=1&query=${encodedKeyword}`;

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

        const actors = (movie.credits?.cast || [])
            .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
            .slice(0, 15)
            .map(actor => ({
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
            tags: genres,
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
            memo: person.biography || '',
            profile_url: this.buildImageUrl(person.profile_path, 'original')
        };
    }

    async searchPerson(actorName) {
        const config = this.getTmdbConfig();

        if (!config.token) {
            throw new Error('TMDB token not configured');
        }

        if (!actorName || typeof actorName !== 'string') {
            throw new Error('Actor name is required');
        }

        const encodedName = encodeURIComponent(actorName.trim());
        const url = `${config.url}/3/search/person?include_adult=true&language=zh-CN&page=1&query=${encodedName}`;

        const response = await this.makeRequest(url, config.token);

        if (!response.results || !Array.isArray(response.results)) {
            return [];
        }

        return response.results.map(person => ({
            actor_id: person.id,
            actor_name: person.name || '',
            actor_profile_url: this.buildImageUrl(person.profile_path, 'w200')
        }));
    }
}

module.exports = TMDBMovieAdapterService;
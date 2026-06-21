/**
 * 批量电影搜索服务
 * 用于批量搜索和刮削电影信息
 */
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { downloadImage } = require('../utils/HttpUtils');

class BatchSearchService {
    constructor(settingsService, tmdbAdapterService, r18AdapterService, movieService, fileService) {
        this.settingsService = settingsService;
        this.tmdbAdapterService = tmdbAdapterService;
        this.r18AdapterService = r18AdapterService;
        this.movieService = movieService;
        this.fileService = fileService;
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
        return downloadImage(url, outputPath);
    }

    async searchMovie(movieId, movieName, adapterType) {
        const adapter = this.getAdapter(adapterType);
        const keyword = movieName || movieId;
        
        try {
            const searchResults = await adapter.searchMovie(keyword);
            
            if (!searchResults || searchResults.length === 0) {
                return {
                    success: false,
                    status: 'none',
                    movieId: movieId,
                    results: []
                };
            }

            const firstResult = searchResults[0];
            const movieDetail = await adapter.getMovie(firstResult.search_id);
            
            return {
                success: true,
                status: 'completed',
                movieId: movieId,
                result: {
                    title: movieDetail.title || movieName,
                    overview: movieDetail.overview || '',
                    year: movieDetail.year || '',
                    runtime: movieDetail.runtime || 0,
                    poster_url: movieDetail.poster_url || null,
                    actors: movieDetail.actors || [],
                    directors: movieDetail.directors || [],
                    tags: movieDetail.tags || [],
                    production_companies: movieDetail.production_companies || []
                }
            };
        } catch (error) {
            return {
                success: false,
                status: 'error',
                movieId: movieId,
                error: error.message
            };
        }
    }

    async saveMovieInfo(movieInfo, searchResult, category, movieFolderPath, posterFileName = 'poster.jpg') {
        const moviesDir = this.settingsService.getMoviesDir();

        if (!moviesDir) {
            throw new Error('Movies directory not configured');
        }

        let movieDir;
        if (movieInfo.path) {
            movieDir = movieInfo.path;
        } else {
            movieDir = path.join(moviesDir, category, movieFolderPath);
        }
        
        if (!fsSync.existsSync(movieDir)) {
            throw new Error(`Movie directory not found: ${movieDir}`);
        }
        
        let existingNfoData = null;
        const nfoPath = path.join(movieDir, 'movie.nfo');
        
        if (fsSync.existsSync(nfoPath)) {
            try {
                existingNfoData = await this.fileService.readMovieNfo(movieDir);
            } catch (error) {
                console.error('Error reading existing movie.nfo:', error.message);
            }
        }

        let posterPath = null;
        if (searchResult.poster_url) {
            posterPath = path.join(movieDir, posterFileName);
            try {
                await this.downloadImage(searchResult.poster_url, posterPath);
            } catch (error) {
                console.error(`Failed to download poster: ${error.message}`);
                posterPath = null;
            }
        }

        const actorsList = searchResult.actors && searchResult.actors.length > 0 
            ? searchResult.actors.map(a => a.name) 
            : (movieInfo.actors ? movieInfo.actors.split(',').map(a => a.trim()) : []);

        const nfoData = {
            id: movieInfo.id || movieInfo.movieId,
            title: searchResult.title || movieInfo.name,
            year: searchResult.year || movieInfo.publishDate || movieInfo.year || '',
            outline: searchResult.overview || '',
            runtime: searchResult.runtime || movieInfo.runtime || 0,
            studio: searchResult.production_companies || movieInfo.studio || '',
            director: searchResult.directors && searchResult.directors.length > 0
                ? searchResult.directors.map(d => d.name).join(', ')
                : movieInfo.director || '',
            actors: actorsList,
            tags: searchResult.tags || movieInfo.tags || []
        };

        if (existingNfoData) {
            if (existingNfoData.original_filename) {
                nfoData.original_filename = existingNfoData.original_filename;
            }
            if (existingNfoData.fileinfo) {
                nfoData.fileinfo = existingNfoData.fileinfo;
            }
            if (existingNfoData.fileset) {
                nfoData.fileset = existingNfoData.fileset;
            }
        }

        await this.fileService.writeMovieNfo(movieDir, nfoData);

        return {
            success: true,
            nfoPath: nfoPath,
            posterPath: posterPath
        };
    }

    async batchSearchMovies(movies, adapterType, progressCallback) {
        this.resetCancelled();
        const results = [];
        
        for (let i = 0; i < movies.length; i++) {
            if (this.cancelled) {
                break;
            }
            
            const movie = movies[i];
            
            if (progressCallback) {
                progressCallback({
                    current: i + 1,
                    total: movies.length,
                    movieId: movie.id || movie.movieId,
                    status: 'searching'
                });
            }

            const searchResult = await this.searchMovie(
                movie.id || movie.movieId,
                movie.name,
                adapterType
            );

            results.push({
                movie: movie,
                searchResult: searchResult
            });

            if (progressCallback) {
                progressCallback({
                    current: i + 1,
                    total: movies.length,
                    movieId: movie.id || movie.movieId,
                    status: searchResult.status,
                    result: searchResult.result
                });
            }
        }

        return results;
    }

    async batchSaveMovies(batchResults, progressCallback) {
        this.resetCancelled();
        const savedResults = [];

        for (let i = 0; i < batchResults.length; i++) {
            if (this.cancelled) {
                break;
            }
            
            const item = batchResults[i];
            
            if (!item.searchResult.success || !item.searchResult.result) {
                savedResults.push({
                    movie: item.movie,
                    success: false,
                    status: item.searchResult.status
                });
                continue;
            }

            if (progressCallback) {
                progressCallback({
                    current: i + 1,
                    total: batchResults.length,
                    movieId: item.movie.id || item.movie.movieId,
                    movieName: item.movie.name || item.searchResult.result.title,
                    status: 'saving'
                });
            }

            try {
                const saveResult = await this.saveMovieInfo(
                    item.movie,
                    item.searchResult.result,
                    item.movie.category,
                    item.movie.folderName || ''
                );

                savedResults.push({
                    movie: item.movie,
                    success: true,
                    status: 'saved',
                    nfoPath: saveResult.nfoPath,
                    posterPath: saveResult.posterPath
                });

                if (progressCallback) {
                    progressCallback({
                        current: i + 1,
                        total: batchResults.length,
                        movieId: item.movie.id || item.movie.movieId,
                        movieName: item.movie.name || item.searchResult.result.title,
                        status: 'saved'
                    });
                }
            } catch (error) {
                console.error('Error saving movie:', error.message || error);
                savedResults.push({
                    movie: item.movie,
                    success: false,
                    status: 'error',
                    error: error.message
                });
            }
        }

        return savedResults;
    }
}

module.exports = BatchSearchService;
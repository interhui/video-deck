/**
 * 标签视图逻辑
 * 独立视图，列出所有标签，点击查看关联电影
 */

const state = {
    tags: [],
    tagSearchKeyword: '',
    currentTagId: '',
    currentTagName: '',
    movies: [],
    categories: [],
    currentCategory: '',
    currentSort: 'name-asc',
    searchKeyword: '',
    detailEditModeLocked: false,
    settings: {}
};

const elements = {
    tagList: document.getElementById('tag-list'),
    tagSearchInput: document.getElementById('tag-search-input'),
    playBtn: document.getElementById('play-btn'),
    minimizeBtn: document.getElementById('minimize-btn'),
    closeBtn: document.getElementById('close-btn'),
    searchInput: document.getElementById('search-input'),
    searchBtn: document.getElementById('search-btn'),
    clearSearchBtn: document.getElementById('clear-search-btn'),
    moviesGrid: document.getElementById('movies-grid'),
    emptyState: document.getElementById('empty-state'),
    sortSelect: document.getElementById('sort-select'),
    categoryFilter: document.getElementById('category-filter')
};

let categoriesCache = [];

async function loadCategories() {
    categoriesCache = await loadCategoriesCache();
}

async function init() {
    await loadTheme({
        onLayoutLoaded: (layout) => {
            applyPosterSizeSettings(layout);
            state.settings.layout = layout;
        }
    });

    await loadCategories();

    bindEvents();
    initSplitter();

    window.electronAPI.onThemeChanged((theme) => {
        applyTheme(theme);
    });

    window.electronAPI.onDetailEditModeChanged((isEditing) => {
        state.detailEditModeLocked = isEditing;
    });

    await loadTagList();
}

async function loadTagList() {
    try {
        const tags = await window.electronAPI.getTagMovieCountMap();
        if (Array.isArray(tags)) {
            state.tags = tags;
        } else {
            state.tags = [];
        }
        renderTagList();
        if (state.tags.length > 0 && !state.currentTagId) {
            await selectTag(state.tags[0].id, state.tags[0].name);
        }
    } catch (error) {
        console.error('Error loading tag list:', error.message || error);
        state.tags = [];
        renderTagList();
    }
}

function renderTagList() {
    if (state.tags.length === 0) {
        elements.tagList.innerHTML = '<li class="box-category-item" style="color: var(--text-secondary); cursor: default; justify-content: center;">暂无标签</li>';
        return;
    }

    let filteredTags = state.tags;
    if (state.tagSearchKeyword) {
        const keyword = state.tagSearchKeyword.toLowerCase();
        filteredTags = state.tags.filter(tag =>
            (tag.name && tag.name.toLowerCase().includes(keyword)) ||
            (tag.id && tag.id.toLowerCase().includes(keyword))
        );
    }

    if (filteredTags.length === 0) {
        elements.tagList.innerHTML = '<li class="box-category-item" style="color: var(--text-secondary); cursor: default; justify-content: center;">无匹配标签</li>';
        return;
    }

    let html = '';
    filteredTags.forEach(tag => {
        const isActive = tag.id === state.currentTagId;
        html += `
            <li class="box-category-item ${isActive ? 'active' : ''}" data-tag-id="${escapeHtml(tag.id)}" data-tag-name="${escapeHtml(tag.name)}">
                <span class="category-name">${escapeHtml(tag.name)}</span>
                <span class="movie-count">${tag.movieCount || 0}</span>
            </li>
        `;
    });

    elements.tagList.innerHTML = html;

    elements.tagList.querySelectorAll('.box-category-item[data-tag-id]').forEach(item => {
        item.addEventListener('click', () => {
            selectTag(item.dataset.tagId, item.dataset.tagName);
        });
    });
}

async function selectTag(tagId, tagName) {
    state.currentTagId = tagId;
    state.currentTagName = tagName;

    document.querySelectorAll('#tag-list .box-category-item').forEach(item => {
        item.classList.toggle('active', item.dataset.tagId === tagId);
    });

    state.currentCategory = '';
    state.currentSort = 'name-asc';
    state.searchKeyword = '';

    elements.searchInput.value = '';
    elements.sortSelect.value = 'name-asc';
    elements.categoryFilter.value = '';
    elements.clearSearchBtn.style.display = 'none';

    await loadTagMovies();
}

async function loadTagMovies() {
    try {
        const result = await window.electronAPI.getMoviesByTag(state.currentTagId);
        if (result && result.success && Array.isArray(result.movies)) {
            state.movies = result.movies;
        } else {
            state.movies = [];
        }
        state.categories = [...new Set(state.movies.map(m => m.category).filter(Boolean))];
        _updateCategoryFilter();
        renderMovies();
    } catch (error) {
        console.error('Error loading tag movies:', error.message || error);
        state.movies = [];
        state.categories = [];
        renderMovies();
    }
}

function _updateCategoryFilter() {
    updateCategoryFilter({ selectEl: elements.categoryFilter, categories: state.categories, movies: state.movies, categoriesCache });
}

function renderMovies() {
    let filteredMovies = getFilteredMovies(state.movies, { category: state.currentCategory, tag: '', searchKeyword: state.searchKeyword });

    const [sortBy, sortOrder] = state.currentSort.split('-');
    filteredMovies = sortMovies(filteredMovies, sortBy, sortOrder);

    if (!filteredMovies || filteredMovies.length === 0) {
        elements.moviesGrid.innerHTML = '';
        elements.emptyState.style.display = 'flex';
        return;
    }

    elements.emptyState.style.display = 'none';

    const posterStyleClass = state.settings.layout?.posterStyle === 'horizontal' ? 'horizontal-poster' : '';

    const html = filteredMovies.map(movie => {
        return `
            <div class="box-movie-card movie-card ${posterStyleClass}" data-movie-id="${movie.id}" data-id="${movie.id}">
                <div class="movie-poster-container" style="width: 100%; height: calc(100% - 50px); position: relative;">
                    <div class="movie-poster-overlay">
                        ${movie.poster ?
                            `<img class="movie-poster" src="${movie.poster}" alt="${movie.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                             <div class="movie-poster-placeholder" style="display:none;">🎬</div>` :
                            `<div class="movie-poster-placeholder">🎬</div>`
                        }
                        <button class="movie-play-btn" title="播放电影">▶</button>
                    </div>
                </div>
                <div class="movie-info">
                    <div class="movie-name">${movie.name}</div>
                    <div class="movie-extra">${movie.actors || '-'}</div>
                </div>
                ${(movie.year || movie.publishDate) ? `<div class="movie-year">${movie.year || movie.publishDate}</div>` : ''}
            </div>
        `;
    }).join('');

    elements.moviesGrid.innerHTML = html;

    bindCardEvents();
}

function bindCardEvents() {
    document.querySelectorAll('.box-movie-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.classList.contains('movie-play-btn')) {
                e.stopPropagation();
                const movieId = card.dataset.id;
                playMovie(movieId);
                return;
            }

            const movieId = card.dataset.id;
            openMovieDetail(movieId);
        });
    });

    document.querySelectorAll('.box-movie-card .movie-play-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const card = btn.closest('.box-movie-card');
            if (card) {
                const movieId = card.dataset.id;
                playMovie(movieId);
            }
        });
    });
}

async function openMovieDetail(movieId) {
    if (state.detailEditModeLocked) {
        return;
    }
    try {
        const movie = state.movies.find(m => m.id === movieId);
        if (movie) {
            await window.electronAPI.openMovieDetail(movie);
        }
    } catch (error) {
        console.error('Error opening movie detail:', error.message || error);
    }
}

async function playMovie(movieId) {
    try {
        const movieDetail = await window.electronAPI.getMovieDetail(movieId);
        if (!movieDetail || movieDetail.error) {
            alert('获取电影详情失败');
            return;
        }

        await window.electronAPI.openPlayerWindow(movieDetail, 0);
    } catch (error) {
        console.error('Error playing movie:', error.message || error);
        alert('播放失败: ' + error.message);
    }
}

async function playTagMovies() {
    if (!state.currentTagId) {
        alert('请先选择一个标签');
        return;
    }

    try {
        const playlist = [];
        const allMovies = getFilteredMovies(state.movies, { category: state.currentCategory, tag: '', searchKeyword: state.searchKeyword });

        for (const movie of allMovies) {
            const movieDetail = await window.electronAPI.getMovieDetail(movie.id);

            let movieVideoAdded = false;

            if (movieDetail && !movieDetail.error && movieDetail.fileset && Array.isArray(movieDetail.fileset)) {
                for (const file of movieDetail.fileset) {
                    const fileType = file.type || file.fileType;
                    if (fileType === 'Main' && file.fullpath) {
                        playlist.push({
                            path: file.fullpath,
                            title: `${movieDetail.name} - ${file.filename || ''}`,
                            codec: file.codec || file.videoCodec || '',
                            resolution: file.resolution || (file.videoWidth ? `${file.videoWidth}x${file.videoHeight}` : ''),
                            movieId: movie.id,
                            category: movie.category
                        });
                        movieVideoAdded = true;
                    }
                }
            }

            if (!movieVideoAdded && movieDetail && !movieDetail.error && movieDetail.original_filename) {
                playlist.push({
                    path: movieDetail.original_filename,
                    title: movieDetail.name || '',
                    codec: movieDetail.videoCodec || '',
                    resolution: movieDetail.videoWidth ? `${movieDetail.videoWidth}x${movieDetail.videoHeight}` : '',
                    movieId: movie.id,
                    category: movie.category
                });
                movieVideoAdded = true;
            }

            if (!movieVideoAdded && movie.original_filename) {
                playlist.push({
                    path: movie.original_filename,
                    title: movie.name || movie.title || '',
                    codec: '',
                    resolution: '',
                    movieId: movie.id,
                    category: movie.category
                });
            }
        }

        if (playlist.length === 0) {
            alert('该标签没有可播放的视频文件');
            return;
        }

        await window.electronAPI.openBatchPlayerWindow(playlist);
    } catch (error) {
        console.error('Error playing tag movies:', error.message || error);
        alert('播放失败: ' + error.message);
    }
}

function initSplitter() {
    const splitter = document.getElementById('tag-splitter');
    const sidebar = document.getElementById('tag-sidebar');
    const movieWall = document.getElementById('tag-movie-wall');

    if (!splitter || !sidebar || !movieWall) return;

    let isResizing = false;

    splitter.addEventListener('mousedown', () => {
        isResizing = true;
        splitter.classList.add('active');
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    });

    document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;
        const containerRect = sidebar.parentElement.getBoundingClientRect();
        const newWidth = e.clientX - containerRect.left;
        if (newWidth >= 150 && newWidth <= 400) {
            sidebar.style.width = `${newWidth}px`;
            sidebar.style.minWidth = `${newWidth}px`;
            document.documentElement.style.setProperty('--sidebar-width', `${newWidth}px`);
        }
    });

    document.addEventListener('mouseup', () => {
        if (isResizing) {
            isResizing = false;
            splitter.classList.remove('active');
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        }
    });
}

function bindEvents() {
    elements.tagSearchInput.addEventListener('input', () => {
        state.tagSearchKeyword = elements.tagSearchInput.value.trim();
        renderTagList();
    });

    elements.tagSearchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            state.tagSearchKeyword = elements.tagSearchInput.value.trim();
            renderTagList();
        }
    });

    elements.playBtn.addEventListener('click', async () => {
        await playTagMovies();
    });

    elements.minimizeBtn.addEventListener('click', () => {
        window.electronAPI.minimizeWindow();
    });

    elements.closeBtn.addEventListener('click', () => {
        window.close();
    });

    elements.searchBtn.addEventListener('click', () => {
        state.searchKeyword = elements.searchInput.value.trim();
        renderMovies();
        _updateClearButtonVisibility();
    });

    elements.searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            state.searchKeyword = e.target.value.trim();
            renderMovies();
            _updateClearButtonVisibility();
        }
    });

    elements.clearSearchBtn.addEventListener('click', () => {
        elements.searchInput.value = '';
        state.searchKeyword = '';
        renderMovies();
        _updateClearButtonVisibility();
    });

    elements.sortSelect.addEventListener('change', (e) => {
        state.currentSort = e.target.value;
        renderMovies();
    });

    elements.categoryFilter.addEventListener('change', (e) => {
        state.currentCategory = e.target.value;
        renderMovies();
    });

    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'f') {
            e.preventDefault();
            elements.searchInput.focus();
        }
    });
}

function _updateClearButtonVisibility() {
    updateClearButtonVisibility(elements.clearSearchBtn, state.searchKeyword);
}

document.addEventListener('DOMContentLoaded', init);

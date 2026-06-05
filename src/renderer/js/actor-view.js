/**
 * 演员视图逻辑
 * 独立视图，列出所有演员，点击查看关联电影
 */

const state = {
    actors: [],
    actorSearchKeyword: '',
    currentActorName: '',
    movies: [],
    categories: [],
    currentCategory: '',
    currentSort: 'name-asc',
    searchKeyword: '',
    currentTag: '',
    currentTagFilter: '',
    tagFilterSearchKeyword: '',
    tempSelectedTag: null,
    detailEditModeLocked: false,
    showFavoritesOnly: false,
    settings: {}
};

const elements = {
    actorList: document.getElementById('actor-list'),
    actorSearchInput: document.getElementById('actor-search-input'),
    playBtn: document.getElementById('play-btn'),
    minimizeBtn: document.getElementById('minimize-btn'),
    closeBtn: document.getElementById('close-btn'),
    searchInput: document.getElementById('search-input'),
    searchBtn: document.getElementById('search-btn'),
    clearSearchBtn: document.getElementById('clear-search-btn'),
    moviesGrid: document.getElementById('movies-grid'),
    emptyState: document.getElementById('empty-state'),
    sortSelect: document.getElementById('sort-select'),
    categoryFilter: document.getElementById('category-filter'),
    tagFilter: document.getElementById('tag-filter'),
    tagFilterModal: document.getElementById('tag-filter-modal'),
    closeTagFilter: document.getElementById('close-tag-filter'),
    tagFilterList: document.getElementById('tag-filter-list'),
    tagFilterSearchInput: document.getElementById('tag-filter-search-input'),
    tagFilterSearchBtn: document.getElementById('tag-filter-search-btn'),
    tagFilterClearBtn: document.getElementById('tag-filter-clear-btn'),
    confirmTagFilter: document.getElementById('confirm-tag-filter'),
    cancelTagFilter: document.getElementById('cancel-tag-filter'),
    favoriteFilter: document.getElementById('favorite-filter')
};

let categoriesCache = [];
let tagsCache = [];

async function loadCategories() {
    categoriesCache = await loadCategoriesCache();
}

async function loadTags() {
    tagsCache = await loadTagsCache();
    _updateTagFilter();
}

function _updateTagFilter() {
    updateTagFilter({ selectEl: elements.tagFilter, tags: tagsCache, showSelectOption: true, maxDisplay: 10 });
}

async function init() {
    await loadTheme({
        onLayoutLoaded: (layout) => {
            applyPosterSizeSettings(layout);
            state.settings.layout = layout;
        }
    });

    await loadCategories();
    await loadTags();

    bindEvents();
    initSplitter();

    window.electronAPI.onThemeChanged((theme) => {
        applyTheme(theme);
    });

    window.electronAPI.onDetailEditModeChanged((isEditing) => {
        state.detailEditModeLocked = isEditing;
    });

    await loadActorList();
}

async function loadActorList() {
    try {
        const actors = await window.electronAPI.getActorMovieCountMap();
        if (Array.isArray(actors)) {
            state.actors = actors;
        } else {
            state.actors = [];
        }
        renderActorList();
        if (state.actors.length > 0 && !state.currentActorName) {
            await selectActor(state.actors[0].name);
        }
    } catch (error) {
        console.error('Error loading actor list:', error);
        state.actors = [];
        renderActorList();
    }
}

function renderActorList() {
    if (state.actors.length === 0) {
        elements.actorList.innerHTML = '<li class="box-category-item" style="color: var(--text-secondary); cursor: default; justify-content: center;">暂无演员</li>';
        return;
    }

    let filteredActors = state.actors;
    if (state.showFavoritesOnly) {
        filteredActors = filteredActors.filter(actor => actor.favorites);
    }
    if (state.actorSearchKeyword) {
        const keyword = state.actorSearchKeyword.toLowerCase();
        filteredActors = state.actors.filter(actor =>
            actor.name && actor.name.toLowerCase().includes(keyword)
        );
    }

    if (filteredActors.length === 0) {
        elements.actorList.innerHTML = '<li class="box-category-item" style="color: var(--text-secondary); cursor: default; justify-content: center;">无匹配演员</li>';
        return;
    }

    filteredActors.sort((a, b) => (b.movieCount || 0) - (a.movieCount || 0));

    let html = '';
    filteredActors.forEach(actor => {
        const isActive = actor.name === state.currentActorName;
        html += `
            <li class="box-category-item ${isActive ? 'active' : ''}" data-actor-name="${escapeHtml(actor.name)}">
                <span class="category-name">${escapeHtml(actor.name)}</span>
                <span class="movie-count">${actor.movieCount || 0}</span>
            </li>
        `;
    });

    elements.actorList.innerHTML = html;

    elements.actorList.querySelectorAll('.box-category-item[data-actor-name]').forEach(item => {
        item.addEventListener('click', () => {
            selectActor(item.dataset.actorName);
        });
    });
}

async function selectActor(actorName) {
    state.currentActorName = actorName;

    document.querySelectorAll('#actor-list .box-category-item').forEach(item => {
        item.classList.toggle('active', item.dataset.actorName === actorName);
    });

    state.currentCategory = '';
    state.currentSort = 'name-asc';
    state.searchKeyword = '';
    state.currentTag = '';
    state.currentTagFilter = '';

    elements.searchInput.value = '';
    elements.sortSelect.value = 'name-asc';
    elements.categoryFilter.value = '';
    elements.tagFilter.value = '';
    elements.clearSearchBtn.style.display = 'none';

    await loadActorMovies();
}

async function loadActorMovies() {
    try {
        const movies = await window.electronAPI.getActorMovieList(state.currentActorName);
        state.movies = movies || [];
        state.categories = [...new Set(state.movies.map(m => m.category).filter(Boolean))];
        _updateCategoryFilter();
        renderMovies();
    } catch (error) {
        console.error('Error loading actor movies:', error);
        state.movies = [];
        state.categories = [];
        renderMovies();
    }
}

function _updateCategoryFilter() {
    updateCategoryFilter({ selectEl: elements.categoryFilter, categories: state.categories, movies: state.movies, categoriesCache });
}

function renderMovies() {
    let filteredMovies = getFilteredMovies(state.movies, { category: state.currentCategory, tag: state.currentTag, searchKeyword: state.searchKeyword });

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
        console.error('Error opening movie detail:', error);
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
        console.error('Error playing movie:', error);
        alert('播放失败: ' + error.message);
    }
}

async function playActorMovies() {
    if (!state.currentActorName) {
        alert('请先选择一个演员');
        return;
    }

    try {
        const playlist = [];
        const allMovies = getFilteredMovies(state.movies, { category: state.currentCategory, tag: state.currentTag, searchKeyword: state.searchKeyword });

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
            alert('该演员没有可播放的视频文件');
            return;
        }

        await window.electronAPI.openBatchPlayerWindow(playlist);
    } catch (error) {
        console.error('Error playing actor movies:', error);
        alert('播放失败: ' + error.message);
    }
}

function openTagFilterModal() {
    state.tagFilterSearchKeyword = '';
    elements.tagFilterSearchInput.value = '';
    state.tempSelectedTag = state.currentTagFilter || null;
    _renderTagFilterList();
    elements.tagFilterModal.style.display = 'flex';
}

function closeTagFilterModal() {
    elements.tagFilterModal.style.display = 'none';
}

function confirmTagFilter() {
    state.currentTagFilter = state.tempSelectedTag;
    state.currentTag = state.currentTagFilter || '';
    _updateTagFilterDisplay();
    closeTagFilterModal();
    renderMovies();
}

function cancelTagFilter() {
    state.currentTagFilter = '';
    state.currentTag = '';
    state.tempSelectedTag = null;
    _updateTagFilterDisplay();
    closeTagFilterModal();
    renderMovies();
}

function _renderTagFilterList() {
    renderTagFilterList({ tags: tagsCache, searchKeyword: state.tagFilterSearchKeyword, selectedTag: state.tempSelectedTag, listEl: elements.tagFilterList, onToggleTag: _toggleTagSelection });
}

function _toggleTagSelection(tagId) {
    toggleTagSelection(tagId, {
        currentSelected: state.tempSelectedTag,
        listEl: elements.tagFilterList,
        onStateChanged: (newSelected) => { state.tempSelectedTag = newSelected; }
    });
}

function _updateTagFilterDisplay() {
    updateTagFilterDisplay({ selectEl: elements.tagFilter, currentTagFilter: state.currentTagFilter, tags: tagsCache });
}

function _updateTagFilterClearButton() {
    updateTagFilterClearButton(elements.tagFilterClearBtn, state.tagFilterSearchKeyword);
}

function _updateClearButtonVisibility() {
    updateClearButtonVisibility(elements.clearSearchBtn, state.searchKeyword);
}

function initSplitter() {
    const splitter = document.getElementById('actor-splitter');
    const sidebar = document.getElementById('actor-sidebar');
    const movieWall = document.getElementById('actor-movie-wall');

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
    elements.actorSearchInput.addEventListener('input', () => {
        state.actorSearchKeyword = elements.actorSearchInput.value.trim();
        renderActorList();
    });

    elements.actorSearchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            state.actorSearchKeyword = elements.actorSearchInput.value.trim();
            renderActorList();
        }
    });

    elements.favoriteFilter.addEventListener('change', (e) => {
        state.showFavoritesOnly = e.target.checked;
        renderActorList();
    });

    elements.playBtn.addEventListener('click', async () => {
        await playActorMovies();
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

    elements.tagFilter.addEventListener('change', (e) => {
        const value = e.target.value;
        if (value === '') {
            state.currentTag = '';
            state.currentTagFilter = '';
            renderMovies();
        } else if (value === 'select') {
            openTagFilterModal();
        } else {
            state.currentTag = value;
            state.currentTagFilter = value;
            renderMovies();
        }
    });

    elements.closeTagFilter.addEventListener('click', closeTagFilterModal);
    elements.cancelTagFilter.addEventListener('click', cancelTagFilter);
    elements.tagFilterModal.addEventListener('click', (e) => {
        if (e.target === elements.tagFilterModal) {
            cancelTagFilter();
        }
    });

    elements.confirmTagFilter.addEventListener('click', confirmTagFilter);

    elements.tagFilterSearchBtn.addEventListener('click', () => {
        state.tagFilterSearchKeyword = elements.tagFilterSearchInput.value.trim();
        _updateTagFilterClearButton();
        _renderTagFilterList();
    });

    elements.tagFilterSearchInput.addEventListener('input', () => {
        state.tagFilterSearchKeyword = elements.tagFilterSearchInput.value.trim();
        _updateTagFilterClearButton();
        _renderTagFilterList();
    });

    elements.tagFilterSearchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            state.tagFilterSearchKeyword = elements.tagFilterSearchInput.value.trim();
            _updateTagFilterClearButton();
            _renderTagFilterList();
        }
    });

    elements.tagFilterClearBtn.addEventListener('click', () => {
        elements.tagFilterSearchInput.value = '';
        state.tagFilterSearchKeyword = '';
        _updateTagFilterClearButton();
        _renderTagFilterList();
    });

    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'f') {
            e.preventDefault();
            elements.searchInput.focus();
        }
    });
}

document.addEventListener('DOMContentLoaded', init);

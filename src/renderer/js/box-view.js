/**
 * 收藏记录视图逻辑
 * 独立视图，列出所有收藏夹，点击查看电影
 */

const state = {
    boxes: [],
    boxSearchKeyword: '',
    currentBoxName: '',
    movies: [],
    categories: [],
    currentCategory: '',
    currentStatus: '',
    currentSort: 'name-asc',
    searchKeyword: '',
    currentTag: '',
    currentRating: '',
    currentTagFilter: '',
    tagFilterSearchKeyword: '',
    tempSelectedTag: null,
    detailEditModeLocked: false,
    settings: {},
    newMovieHours: 72
};

const elements = {
    boxList: document.getElementById('box-list'),
    boxSearchInput: document.getElementById('box-search-input'),
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
    statusFilter: document.getElementById('status-filter'),
    tagFilter: document.getElementById('tag-filter'),
    ratingFilter: document.getElementById('rating-filter'),
    tagFilterModal: document.getElementById('tag-filter-modal'),
    closeTagFilter: document.getElementById('close-tag-filter'),
    tagFilterList: document.getElementById('tag-filter-list'),
    tagFilterSearchInput: document.getElementById('tag-filter-search-input'),
    tagFilterSearchBtn: document.getElementById('tag-filter-search-btn'),
    tagFilterClearBtn: document.getElementById('tag-filter-clear-btn'),
    confirmTagFilter: document.getElementById('confirm-tag-filter'),
    cancelTagFilter: document.getElementById('cancel-tag-filter')
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
        },
        onThemeLoaded: (settings) => {
            if (settings && settings.library) {
                state.newMovieHours = settings.library.newMovieHours || 72;
            }
        }
    });

    await loadCategories();
    await loadTags();

    bindEvents();
    initSplitter();

    window.electronAPI.onThemeChanged((theme) => {
        applyTheme(theme);
    });

    window.electronAPI.onBoxUpdated(async () => {
        await loadBoxList();
        if (state.currentBoxName) {
            await loadBoxData();
        }
    });

    window.electronAPI.onDetailEditModeChanged((isEditing) => {
        state.detailEditModeLocked = isEditing;
    });

    await loadBoxList();
}

async function loadBoxList() {
    try {
        const boxes = await window.electronAPI.getAllBoxes();
        if (Array.isArray(boxes)) {
            state.boxes = boxes;
        } else {
            state.boxes = [];
        }
        renderBoxList();
        if (state.boxes.length > 0 && !state.currentBoxName) {
            await selectBox(state.boxes[0].originalName);
        }
    } catch (error) {
        console.error('Error loading box list:', error);
        state.boxes = [];
        renderBoxList();
    }
}

function renderBoxList() {
    if (state.boxes.length === 0) {
        elements.boxList.innerHTML = '<li class="box-category-item" style="color: var(--text-secondary); cursor: default; justify-content: center;">暂无收藏夹</li>';
        return;
    }

    let filteredBoxes = state.boxes;
    if (state.boxSearchKeyword) {
        const keyword = state.boxSearchKeyword.toLowerCase();
        filteredBoxes = state.boxes.filter(box =>
            (box.name && box.name.toLowerCase().includes(keyword)) ||
            (box.description && box.description.toLowerCase().includes(keyword))
        );
    }

    if (filteredBoxes.length === 0) {
        elements.boxList.innerHTML = '<li class="box-category-item" style="color: var(--text-secondary); cursor: default; justify-content: center;">无匹配收藏夹</li>';
        return;
    }

    let html = '';
    filteredBoxes.forEach(box => {
        const isActive = box.originalName === state.currentBoxName;
        html += `
            <li class="box-category-item ${isActive ? 'active' : ''}" data-box-name="${escapeHtml(box.originalName)}">
                <span class="category-name">${escapeHtml(box.name)}</span>
                <span class="movie-count">${box.movieCount || 0}</span>
            </li>
        `;
    });

    elements.boxList.innerHTML = html;

    elements.boxList.querySelectorAll('.box-category-item[data-box-name]').forEach(item => {
        item.addEventListener('click', () => {
            selectBox(item.dataset.boxName);
        });
    });
}

async function selectBox(boxName) {
    state.currentBoxName = boxName;

    document.querySelectorAll('#box-list .box-category-item').forEach(item => {
        item.classList.toggle('active', item.dataset.boxName === boxName);
    });

    state.currentCategory = '';
    state.currentStatus = '';
    state.currentSort = 'name-asc';
    state.searchKeyword = '';
    state.currentTag = '';
    state.currentTagFilter = '';
    state.currentRating = '';

    elements.searchInput.value = '';
    elements.sortSelect.value = 'name-asc';
    elements.categoryFilter.value = '';
    elements.statusFilter.value = '';
    elements.tagFilter.value = '';
    elements.ratingFilter.value = '';
    elements.clearSearchBtn.style.display = 'none';

    await loadBoxData();
}

async function loadBoxData() {
    try {
        const boxDetail = await window.electronAPI.getBoxDetail(state.currentBoxName);

        if (!boxDetail || boxDetail.error) {
            console.error('Error loading box:', boxDetail.error);
            state.movies = [];
            state.categories = [];
            renderMovies();
            return;
        }

        await loadMoviesFromBox(boxDetail.data);
    } catch (error) {
        console.error('Error loading box data:', error);
    }
}

async function loadMoviesFromBox(boxData) {
    try {
        const boxMovies = boxData.movie || [];
        const boxMovieIds = boxMovies.map(bm => bm.id);
        const boxMovieMap = new Map();
        boxMovies.forEach(bm => {
            boxMovieMap.set(bm.id, {
                boxStatus: bm.status || 'unwatched',
                boxRating: bm.rating || 0,
                boxComment: bm.comment
            });
        });

        const allMovies = await window.electronAPI.getAllMovies({});
        const movies = [];
        const categoriesSet = new Set();
        const validMovieIds = new Set();

        for (const movie of allMovies) {
            const matchedBoxId = boxMovieIds.includes(movie.id) ? movie.id : null;
            if (matchedBoxId) {
                const boxInfo = boxMovieMap.get(matchedBoxId);
                if (boxInfo) {
                    categoriesSet.add(movie.category);
                    let boxStatus = boxInfo.boxStatus;
                    if (boxStatus === 'new') {
                        const hoursDiff = movie.update_time ? (Date.now() - movie.update_time) / (60 * 60 * 1000) : Infinity;
                        if (hoursDiff >= state.newMovieHours) {
                            boxStatus = 'unwatched';
                        }
                    }
                    movies.push({
                        ...movie,
                        boxStatus,
                        boxRating: boxInfo.boxRating,
                        boxComment: boxInfo.boxComment
                    });
                    validMovieIds.add(matchedBoxId);
                }
            }
        }

        const deletedMovieIds = boxMovieIds.filter(id => !validMovieIds.has(id));
        if (deletedMovieIds.length > 0) {
            const cleanResult = await window.electronAPI.cleanBox({
                boxName: state.currentBoxName,
                validMovieIds: Array.from(validMovieIds)
            });
            if (cleanResult.success && cleanResult.removedCount > 0) {
                console.log(`Removed ${cleanResult.removedCount} deleted movies from box`);
            }
        }

        state.movies = movies;
        state.categories = Array.from(categoriesSet);

        _updateCategoryFilter();
        renderMovies();
    } catch (error) {
        console.error('Error loading movies from box:', error);
    }
}

function _updateCategoryFilter() {
    updateCategoryFilter({ selectEl: elements.categoryFilter, categories: state.categories, movies: state.movies, categoriesCache });
}

function renderMovies() {
    let filteredMovies = getFilteredMovies(state.movies, { category: state.currentCategory, tag: state.currentTag, status: state.currentStatus, rating: state.currentRating, searchKeyword: state.searchKeyword });

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
                <span class="box-status-tag ${movie.boxStatus || 'unwatched'}" data-movie-id="${movie.id}" data-category="${movie.category}">${getStatusText(movie.boxStatus)}</span>
                <div class="movie-poster-container" style="width: 100%; height: calc(100% - 50px); position: relative;">
                    <div class="movie-poster-overlay">
                        ${movie.poster ?
                            `<img class="movie-poster" src="${movie.poster}" alt="${movie.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                             <div class="movie-poster-placeholder" style="display:none;">🎬</div>` :
                            `<div class="movie-poster-placeholder">🎬</div>`
                        }
                        <button class="movie-play-btn" title="播放电影">▶</button>
                    </div>
                    ${movie.boxRating ? `<div class="movie-rating">${'⭐'.repeat(movie.boxRating)}</div>` : ''}
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
                playBoxMovie(movieId);
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
                playBoxMovie(movieId);
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
            await window.electronAPI.openMovieDetail({
                ...movie,
                fromBox: true,
                boxName: state.currentBoxName
            });
        }
    } catch (error) {
        console.error('Error opening movie detail:', error);
    }
}

async function playBoxMovie(movieId) {
    try {
        const movieDetail = await window.electronAPI.getMovieDetail(movieId);
        if (!movieDetail || movieDetail.error) {
            alert('获取电影详情失败');
            return;
        }

        await window.electronAPI.openPlayerWindow(movieDetail, 0);
    } catch (error) {
        console.error('Error playing box movie:', error);
        alert('播放失败: ' + error.message);
    }
}

async function playBoxMovies() {
    if (!state.currentBoxName) {
        alert('请先选择一个收藏夹');
        return;
    }

    try {
        const playlist = [];
        const allMovies = getFilteredMovies(state.movies, { category: state.currentCategory, tag: state.currentTag, status: state.currentStatus, rating: state.currentRating, searchKeyword: state.searchKeyword });

        for (const movie of allMovies) {
            const movieDetail = await window.electronAPI.getMovieDetail(movie.id);

            let movieVideoAdded = false;

            if (movieDetail && !movieDetail.error && movieDetail.fileset && Array.isArray(movieDetail.fileset)) {
                for (const file of movieDetail.fileset) {
                    const fileType = file.type || file.fileType;
                    if (fileType === 'Main' && file.fullpath) {
                        playlist.push({
                            path: file.fullpath,
                            title: `${movieDetail.name} - ${file.filename || path.basename(file.fullpath)}`,
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
                    title: movieDetail.name || path.basename(movieDetail.original_filename),
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
                    title: movie.name || movie.title || path.basename(movie.original_filename),
                    codec: '',
                    resolution: '',
                    movieId: movie.id,
                    category: movie.category
                });
            }
        }

        if (playlist.length === 0) {
            alert('收藏夹中没有可播放的视频文件');
            return;
        }

        await window.electronAPI.openBatchPlayerWindow(playlist);
    } catch (error) {
        console.error('Error playing box movies:', error);
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

function initSplitter() {
    const splitter = document.getElementById('box-splitter');
    const sidebar = document.getElementById('box-sidebar');
    const movieWall = document.getElementById('box-movie-wall');

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
    elements.boxSearchInput.addEventListener('input', () => {
        state.boxSearchKeyword = elements.boxSearchInput.value.trim();
        renderBoxList();
    });

    elements.boxSearchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            state.boxSearchKeyword = elements.boxSearchInput.value.trim();
            renderBoxList();
        }
    });

    elements.minimizeBtn.addEventListener('click', () => {
        window.electronAPI.minimizeWindow();
    });

    elements.closeBtn.addEventListener('click', () => {
        window.close();
    });

    elements.playBtn.addEventListener('click', async () => {
        await playBoxMovies();
    });

    elements.searchBtn.addEventListener('click', () => {
        state.searchKeyword = elements.searchInput.value.trim();
        renderMovies();
        updateClearButtonVisibility(elements.clearSearchBtn, state.searchKeyword);
    });

    elements.searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            state.searchKeyword = e.target.value.trim();
            renderMovies();
            updateClearButtonVisibility(elements.clearSearchBtn, state.searchKeyword);
        }
    });

    elements.clearSearchBtn.addEventListener('click', () => {
        elements.searchInput.value = '';
        state.searchKeyword = '';
        renderMovies();
        updateClearButtonVisibility(elements.clearSearchBtn, state.searchKeyword);
    });

    elements.sortSelect.addEventListener('change', (e) => {
        state.currentSort = e.target.value;
        renderMovies();
    });

    elements.categoryFilter.addEventListener('change', (e) => {
        state.currentCategory = e.target.value;
        renderMovies();
    });

    elements.statusFilter.addEventListener('change', (e) => {
        state.currentStatus = e.target.value;
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

    elements.ratingFilter.addEventListener('change', (e) => {
        state.currentRating = e.target.value;
        renderMovies();
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

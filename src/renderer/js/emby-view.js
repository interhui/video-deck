/**
 * Emby 影视库视图逻辑
 * 独立窗口：连接 Emby 服务器，浏览/搜索电影、查看详情、播放
 */
const state = {
    config: null,
    views: [],
    currentLibraryId: '',
    currentSort: 'name-asc',
    searchKeyword: '',
    movies: [],
    total: 0,
    startIndex: 0,
    pageSize: 60,
    loading: false,
    currentMovie: null
};

const elements = {
    librarySelect: document.getElementById('library-select'),
    sortSelect: document.getElementById('sort-select'),
    searchInput: document.getElementById('search-input'),
    searchBtn: document.getElementById('search-btn'),
    clearSearchBtn: document.getElementById('clear-search-btn'),
    refreshBtn: document.getElementById('refresh-btn'),
    connectionStatus: document.getElementById('connection-status'),
    moviesGrid: document.getElementById('movies-grid'),
    emptyState: document.getElementById('empty-state'),
    emptyStateText: document.getElementById('empty-state-text'),
    gotoSettingsBtn: document.getElementById('goto-settings-btn'),
    loadMoreBar: document.getElementById('load-more-bar'),
    loadMoreBtn: document.getElementById('load-more-btn'),
    loadedCount: document.getElementById('loaded-count'),
    minimizeBtn: document.getElementById('minimize-btn'),
    closeBtn: document.getElementById('close-btn'),
    // 详情模态框
    detailModal: document.getElementById('movie-detail-modal'),
    detailTitle: document.getElementById('detail-title'),
    detailPoster: document.getElementById('detail-poster'),
    detailYear: document.getElementById('detail-year'),
    detailRating: document.getElementById('detail-rating'),
    detailRuntime: document.getElementById('detail-runtime'),
    detailOfficialRating: document.getElementById('detail-official-rating'),
    detailGenres: document.getElementById('detail-genres'),
    detailOverview: document.getElementById('detail-overview'),
    detailActors: document.getElementById('detail-actors'),
    detailDirectors: document.getElementById('detail-directors'),
    detailStudios: document.getElementById('detail-studios'),
    closeDetail: document.getElementById('close-detail'),
    closeDetailBottom: document.getElementById('close-detail-bottom'),
    detailPlayBtn: document.getElementById('detail-play-btn')
};

async function init() {
    await loadTheme();

    window.electronAPI.onThemeChanged((theme) => {
        applyTheme(theme);
    });

    bindEvents();

    // 加载配置并检查连接
    await loadConfig();
    if (isConfigured()) {
        await refreshViews();
        await loadMovies();
    } else {
        showUnconfigured();
    }
}

function isConfigured() {
    return Boolean(state.config && state.config.serverUrl);
}

function bindEvents() {
    elements.librarySelect.addEventListener('change', () => {
        state.currentLibraryId = elements.librarySelect.value;
        state.startIndex = 0;
        loadMovies();
    });

    elements.sortSelect.addEventListener('change', () => {
        state.currentSort = elements.sortSelect.value;
        state.startIndex = 0;
        loadMovies();
    });

    elements.searchBtn.addEventListener('click', () => {
        state.searchKeyword = elements.searchInput.value.trim();
        state.startIndex = 0;
        loadMovies();
    });

    elements.searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            state.searchKeyword = elements.searchInput.value.trim();
            state.startIndex = 0;
            loadMovies();
        }
    });

    elements.searchInput.addEventListener('input', () => {
        elements.clearSearchBtn.style.display = elements.searchInput.value ? 'block' : 'none';
    });

    elements.clearSearchBtn.addEventListener('click', () => {
        elements.searchInput.value = '';
        elements.clearSearchBtn.style.display = 'none';
        state.searchKeyword = '';
        state.startIndex = 0;
        loadMovies();
    });

    elements.refreshBtn.addEventListener('click', () => {
        state.startIndex = 0;
        loadMovies();
    });

    elements.loadMoreBtn.addEventListener('click', () => {
        state.startIndex += state.pageSize;
        loadMovies(true);
    });

    elements.gotoSettingsBtn.addEventListener('click', () => {
        window.close();
    });

    elements.minimizeBtn.addEventListener('click', () => {
        window.electronAPI.minimizeWindow();
    });

    elements.closeBtn.addEventListener('click', () => {
        window.close();
    });

    // 详情模态框
    elements.closeDetail.addEventListener('click', () => {
        elements.detailModal.style.display = 'none';
    });
    elements.closeDetailBottom.addEventListener('click', () => {
        elements.detailModal.style.display = 'none';
    });
    elements.detailModal.addEventListener('click', (e) => {
        if (e.target === elements.detailModal) {
            elements.detailModal.style.display = 'none';
        }
    });
    elements.detailPlayBtn.addEventListener('click', async () => {
        if (!state.currentMovie) return;
        const result = await window.electronAPI.embyPlayMovie({
            itemId: state.currentMovie.id,
            mediaSourceId: state.currentMovie.mediaSourceId,
            title: state.currentMovie.title
        });
        if (result.error) {
            alert('播放失败: ' + result.error);
        }
    });
}

async function loadConfig() {
    const result = await window.electronAPI.embyGetConfig();
    if (result && !result.error) {
        state.config = result;
    } else {
        state.config = null;
    }
}

/**
 * 测试连接并显示连接状态
 */
async function testConnection() {
    const result = await window.electronAPI.embyTestConnection();
    if (result && result.reachable) {
        elements.connectionStatus.textContent = `已连接 ${result.serverName} v${result.version}`;
        elements.connectionStatus.className = 'emby-connection-status connected';
        return true;
    }
    elements.connectionStatus.textContent = result && result.error ? `连接失败: ${result.error}` : '未连接';
    elements.connectionStatus.className = 'emby-connection-status disconnected';
    return false;
}

async function refreshViews() {
    await testConnection();
    const result = await window.electronAPI.embyGetViews();
    if (!result || result.error) {
        showUnconfigured(result && result.error ? result.error : '获取库视图失败');
        return;
    }
    state.views = result;
    renderViews();
}

function renderViews() {
    elements.librarySelect.innerHTML = '<option value="">全部库视图</option>';
    state.views.forEach(view => {
        const option = document.createElement('option');
        option.value = view.id;
        option.textContent = view.name;
        elements.librarySelect.appendChild(option);
    });
    // 恢复默认库视图
    if (state.config && state.config.libraryId) {
        elements.librarySelect.value = state.config.libraryId;
        state.currentLibraryId = state.config.libraryId;
    }
}

async function loadMovies(isAppend = false) {
    if (state.loading) return;
    state.loading = true;

    const [sortBy, sortOrder] = state.currentSort.split('-');

    const result = await window.electronAPI.embyGetMovies({
        libraryId: state.currentLibraryId,
        keyword: state.searchKeyword,
        startIndex: state.startIndex,
        limit: state.pageSize,
        sortBy,
        sortOrder
    });

    state.loading = false;

    if (!result || result.error) {
        showUnconfigured(result && result.error ? result.error : '获取电影列表失败');
        return;
    }

    state.movies = isAppend ? [...state.movies, ...result.items] : result.items;
    state.total = result.total;

    renderMovies(isAppend);
    updateLoadMore();
    elements.emptyState.style.display = state.movies.length === 0 ? 'flex' : 'none';
    elements.gotoSettingsBtn.style.display = 'none';
    elements.loadMoreBar.style.display = state.total > state.movies.length ? 'flex' : 'none';
}

function renderMovies(isAppend) {
    const html = state.movies.map(movie => {
        const posterStyleClass = '';
        return `
            <div class="movie-card ${posterStyleClass}" data-movie-id="${escapeHtml(movie.id)}">
                <div class="movie-poster-overlay">
                    ${movie.posterUrl ?
                        `<img class="movie-poster" src="${movie.posterUrl}" alt="${escapeHtml(movie.title)}" loading="lazy"
                             onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                         <div class="movie-poster-placeholder" style="display:none;">🎬</div>` :
                        `<div class="movie-poster-placeholder">🎬</div>`
                    }
                    <button class="movie-play-btn" title="播放电影">▶</button>
                </div>
                <div class="movie-info">
                    <div class="movie-name">${escapeHtml(movie.title)}</div>
                    <div class="movie-extra">${movie.year ? escapeHtml(String(movie.year)) : ''}${movie.rating ? ' · ⭐' + Number(movie.rating).toFixed(1) : ''}</div>
                </div>
                ${movie.year ? `<div class="movie-year">${escapeHtml(String(movie.year))}</div>` : ''}
            </div>
        `;
    }).join('');

    if (isAppend) {
        elements.moviesGrid.insertAdjacentHTML('beforeend', html);
    } else {
        elements.moviesGrid.innerHTML = html;
    }

    // 绑定卡片点击与播放按钮
    elements.moviesGrid.querySelectorAll('.movie-card').forEach(card => {
        card.addEventListener('click', async (e) => {
            if (e.target.classList.contains('movie-play-btn')) {
                await handlePlay(card.dataset.movieId);
                return;
            }
            await showDetail(card.dataset.movieId);
        });
    });
}

function updateLoadMore() {
    if (state.total > state.movies.length) {
        elements.loadMoreBar.style.display = 'flex';
        elements.loadedCount.textContent = `已加载 ${state.movies.length} / ${state.total}`;
    } else {
        elements.loadMoreBar.style.display = state.movies.length > 0 ? 'none' : 'none';
        elements.loadedCount.textContent = state.movies.length > 0 ? `共 ${state.movies.length} 部电影` : '';
    }
}

async function handlePlay(itemId) {
    const result = await window.electronAPI.embyPlayMovie({
        itemId,
        mediaSourceId: null,
        title: getMovieTitle(itemId)
    });
    if (result.error) {
        alert('播放失败: ' + result.error);
    }
}

function getMovieTitle(itemId) {
    const movie = state.movies.find(m => m.id === itemId);
    return movie ? movie.title : 'Emby 电影';
}

async function showDetail(itemId) {
    const result = await window.electronAPI.embyGetMovieDetail(itemId);
    if (!result || result.error) {
        alert('获取详情失败: ' + (result && result.error ? result.error : '未知错误'));
        return;
    }
    state.currentMovie = result;

    elements.detailTitle.textContent = result.title || '电影详情';
    elements.detailPoster.src = result.posterUrl || '';
    elements.detailPoster.style.display = result.posterUrl ? 'block' : 'none';

    const metaParts = [];
    if (result.year) metaParts.push(`年份: ${result.year}`);
    if (result.runtime) metaParts.push(`片长: ${formatDuration(result.runtime)}`);
    if (result.officialRating) metaParts.push(`分级: ${result.officialRating}`);
    if (result.rating) metaParts.push(`评分: ${Number(result.rating).toFixed(1)}`);
    elements.detailYear.textContent = metaParts.join(' · ');
    elements.detailRating.textContent = '';
    elements.detailRuntime.textContent = '';
    elements.detailOfficialRating.textContent = '';

    elements.detailGenres.innerHTML = (result.genres || [])
        .map(g => `<span class="emby-genre-tag">${escapeHtml(g)}</span>`)
        .join('');

    elements.detailOverview.textContent = result.overview || '暂无简介';

    elements.detailActors.innerHTML = (result.actors && result.actors.length > 0)
        ? result.actors.map(a => {
            const photo = a.profileUrl
                ? `<img class="emby-actor-photo" src="${a.profileUrl}" alt="${escapeHtml(a.name)}" loading="lazy" onerror="this.style.display='none';">`
                : '';
            return `<div class="emby-actor-item">${photo}<span>${escapeHtml(a.name)}${a.role ? `（${escapeHtml(a.role)}）` : ''}</span></div>`;
        }).join('')
        : '暂无演员信息';

    elements.detailDirectors.textContent = (result.directors && result.directors.length > 0)
        ? result.directors.join('、')
        : '暂无';

    elements.detailStudios.textContent = (result.studios && result.studios.length > 0)
        ? result.studios.join('、')
        : '暂无';

    elements.detailModal.style.display = 'flex';
}

function showUnconfigured(message) {
    elements.moviesGrid.innerHTML = '';
    elements.loadMoreBar.style.display = 'none';
    elements.emptyState.style.display = 'flex';
    elements.gotoSettingsBtn.style.display = 'block';
    elements.emptyStateText.textContent = message || 'Emby 服务器未配置，请先在主窗口 设置 → 电影设置 → Emby设置 中配置服务器';
}

document.addEventListener('DOMContentLoaded', init);

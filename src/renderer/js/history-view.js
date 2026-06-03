/**
 * 历史记录视图逻辑
 */

const state = {
    historyData: { history: [] },
    selectedDate: '',
    searchKeyword: '',
    currentCategory: '',
    currentTag: '',
    selectedMovies: new Set(),
    categoriesCache: [],
    tagsCache: [],
    settings: {}
};

const elements = {
    searchInput: document.getElementById('search-input'),
    searchBtn: document.getElementById('search-btn'),
    clearSearchBtn: document.getElementById('clear-search-btn'),
    minimizeBtn: document.getElementById('minimize-btn'),
    closeBtn: document.getElementById('close-btn'),
    timelineList: document.getElementById('timeline-list'),
    historyContent: document.getElementById('history-content'),
    emptyState: document.getElementById('empty-state'),
    categoryFilter: document.getElementById('category-filter'),
    tagFilter: document.getElementById('tag-filter'),
    batchActions: document.getElementById('batch-actions'),
    batchPlayBtn: document.getElementById('batch-play-btn')
};

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

    await loadHistoryData();
}

async function loadCategories() {
    try {
        const categories = await window.electronAPI.getCategoriesFromCache();
        if (Array.isArray(categories)) {
            state.categoriesCache = categories;
        }
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

async function loadTags() {
    try {
        const tags = await window.electronAPI.getTags();
        if (Array.isArray(tags)) {
            state.tagsCache = tags;
            updateTagFilter();
        }
    } catch (error) {
        console.error('Error loading tags:', error);
    }
}

function updateTagFilter() {
    elements.tagFilter.innerHTML = '<option value="">全部标签</option>';
    state.tagsCache.forEach(tag => {
        const option = document.createElement('option');
        option.value = tag.id;
        option.textContent = tag.name;
        elements.tagFilter.appendChild(option);
    });
}

function updateCategoryFilter() {
    elements.categoryFilter.innerHTML = '<option value="">全部分类</option>';
    const categories = getCategoriesFromHistory();
    categories.forEach(category => {
        const name = getCategoryName(category, state.categoriesCache);
        const option = document.createElement('option');
        option.value = category;
        option.textContent = name;
        elements.categoryFilter.appendChild(option);
    });
}

function getCategoriesFromHistory() {
    const categories = new Set();
    state.historyData.history.forEach(entry => {
        entry.records.forEach(record => {
            if (record.movieData && record.movieData.category) {
                categories.add(record.movieData.category);
            }
        });
    });
    return Array.from(categories);
}

function initSplitter() {
    const splitter = document.getElementById('history-splitter');
    const sidebar = document.getElementById('history-sidebar');
    const movieArea = document.getElementById('history-movie-area');

    if (!splitter || !sidebar || !movieArea) return;

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
    elements.minimizeBtn.addEventListener('click', () => {
        window.electronAPI.minimizeWindow();
    });

    elements.closeBtn.addEventListener('click', () => {
        window.close();
    });

    elements.searchBtn.addEventListener('click', () => {
        state.searchKeyword = elements.searchInput.value.trim();
        renderHistoryContent();
        updateClearButtonVisibility();
    });

    elements.searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            state.searchKeyword = e.target.value.trim();
            renderHistoryContent();
            updateClearButtonVisibility();
        }
    });

    elements.clearSearchBtn.addEventListener('click', () => {
        elements.searchInput.value = '';
        state.searchKeyword = '';
        renderHistoryContent();
        updateClearButtonVisibility();
    });

    elements.categoryFilter.addEventListener('change', (e) => {
        state.currentCategory = e.target.value;
        renderHistoryContent();
    });

    elements.tagFilter.addEventListener('change', (e) => {
        state.currentTag = e.target.value;
        renderHistoryContent();
    });

    elements.batchPlayBtn.addEventListener('click', async () => {
        await playSelectedMovies();
    });
}

function updateClearButtonVisibility() {
    elements.clearSearchBtn.style.display = state.searchKeyword ? 'block' : 'none';
}

async function loadHistoryData() {
    try {
        const result = await window.electronAPI.getPlayHistory(null, null);
        if (result && result.history) {
            state.historyData = result;

            const allMovies = await window.electronAPI.getAllMovies({});
            const movieMap = new Map();
            if (Array.isArray(allMovies)) {
                allMovies.forEach(m => movieMap.set(m.id, m));
            }

            state.historyData.history.forEach(entry => {
                entry.records.forEach(record => {
                    if (record.movieId) {
                        record.movieData = movieMap.get(record.movieId) || null;
                    }
                });
            });

            deduplicateHistoryRecords();

            const sortedHistory = [...state.historyData.history].sort((a, b) => b.date.localeCompare(a.date));
            state.historyData.history = sortedHistory;
        }

        renderTimeline();
        updateCategoryFilter();
        renderHistoryContent();
    } catch (error) {
        console.error('Error loading history data:', error);
    }
}

function deduplicateHistoryRecords() {
    state.historyData.history.forEach(entry => {
        const seen = new Map();
        const uniqueRecords = [];
        entry.records.forEach(record => {
            const movieId = record.movieId || record.movieName;
            if (!seen.has(movieId)) {
                seen.set(movieId, record);
                uniqueRecords.push(record);
            } else {
                const existing = seen.get(movieId);
                if (record.time > existing.time) {
                    const idx = uniqueRecords.indexOf(existing);
                    uniqueRecords[idx] = record;
                    seen.set(movieId, record);
                }
            }
        });
        entry.records = uniqueRecords;
    });
}

function renderTimeline() {
    const dates = state.historyData.history.map(entry => entry.date);

    if (dates.length === 0) {
        elements.timelineList.innerHTML = '<li class="timeline-empty">暂无记录</li>';
        return;
    }

    elements.timelineList.innerHTML = dates.map(date => {
        const entry = state.historyData.history.find(e => e.date === date);
        const count = entry ? entry.records.length : 0;
        const isActive = date === state.selectedDate;
        return `
            <li class="timeline-item ${isActive ? 'active' : ''}" data-date="${date}">
                <span class="timeline-date">${date}</span>
                <span class="timeline-count">${count}</span>
            </li>
        `;
    }).join('');

    document.querySelectorAll('.timeline-item').forEach(item => {
        item.addEventListener('click', () => {
            state.selectedDate = item.dataset.date;
            document.querySelectorAll('.timeline-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            scrollToDate(state.selectedDate);
        });
    });
}

function scrollToDate(date) {
    const dateSection = document.querySelector(`.history-date-section[data-date="${date}"]`);
    if (dateSection) {
        dateSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function renderHistoryContent() {
    let filteredHistory = [...state.historyData.history];

    if (state.searchKeyword) {
        const keyword = state.searchKeyword.toLowerCase();
        filteredHistory = filteredHistory.map(entry => ({
            ...entry,
            records: entry.records.filter(record =>
                record.movieName.toLowerCase().includes(keyword) ||
                (record.movieData && record.movieData.name && record.movieData.name.toLowerCase().includes(keyword))
            )
        })).filter(entry => entry.records.length > 0);
    }

    if (state.currentCategory) {
        filteredHistory = filteredHistory.map(entry => ({
            ...entry,
            records: entry.records.filter(record =>
                record.movieData && record.movieData.category === state.currentCategory
            )
        })).filter(entry => entry.records.length > 0);
    }

    if (state.currentTag) {
        filteredHistory = filteredHistory.map(entry => ({
            ...entry,
            records: entry.records.filter(record =>
                record.movieData && record.movieData.tags && record.movieData.tags.includes(state.currentTag)
            )
        })).filter(entry => entry.records.length > 0);
    }

    if (filteredHistory.length === 0) {
        elements.historyContent.innerHTML = '';
        elements.emptyState.style.display = 'flex';
        return;
    }

    elements.emptyState.style.display = 'none';

    const posterStyleClass = state.settings.layout?.posterStyle === 'horizontal' ? 'horizontal-poster' : '';

    let html = '';
    filteredHistory.forEach(entry => {
        html += `
            <div class="history-date-section" data-date="${entry.date}">
                <div class="history-date-header">
                    <span class="history-date-label">${entry.date}</span>
                    <div class="history-date-divider"></div>
                </div>
                <div class="history-movies-grid">
        `;

        entry.records.forEach(record => {
            const movie = record.movieData;
            const movieKey = record.movieId || record.movieName;
            const isSelected = state.selectedMovies.has(movieKey);

            if (movie) {
                html += `
                    <div class="history-movie-card movie-card ${posterStyleClass} ${isSelected ? 'selected' : ''}" 
                         data-date="${entry.date}" data-time="${record.time}" data-movie-id="${movie.id}" data-movie-key="${movieKey}">
                        <div class="movie-card-checkbox">
                            <input type="checkbox" class="movie-select-checkbox" 
                                   data-movie-key="${movieKey}" data-movie-id="${movie.id}"
                                   ${isSelected ? 'checked' : ''}>
                        </div>
                        <button class="history-delete-btn" data-date="${entry.date}" data-time="${record.time}" title="删除记录">✕</button>
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
                            <div class="movie-extra">${record.time}</div>
                        </div>
                        ${(movie.year || movie.publishDate) ? `<div class="movie-year">${movie.year || movie.publishDate}</div>` : ''}
                    </div>
                `;
            } else {
                html += `
                    <div class="history-movie-card movie-card ${posterStyleClass} ${isSelected ? 'selected' : ''}" 
                         data-date="${entry.date}" data-time="${record.time}" data-movie-id="" data-movie-key="${movieKey}">
                        <div class="movie-card-checkbox">
                            <input type="checkbox" class="movie-select-checkbox" 
                                   data-movie-key="${movieKey}" data-movie-id=""
                                   ${isSelected ? 'checked' : ''}>
                        </div>
                        <button class="history-delete-btn" data-date="${entry.date}" data-time="${record.time}" title="删除记录">✕</button>
                        <div class="movie-poster-container" style="width: 100%; height: calc(100% - 50px); position: relative;">
                            <div class="movie-poster-overlay">
                                <div class="movie-poster-placeholder">🎬</div>
                            </div>
                        </div>
                        <div class="movie-info">
                            <div class="movie-name">${record.movieName}</div>
                            <div class="movie-extra">${record.time}</div>
                        </div>
                    </div>
                `;
            }
        });

        html += `
                </div>
            </div>
        `;
    });

    elements.historyContent.innerHTML = html;
    bindCardEvents();
}

function bindCardEvents() {
    document.querySelectorAll('.history-movie-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.classList.contains('history-delete-btn')) return;
            if (e.target.type === 'checkbox') return;
            if (e.target.classList.contains('movie-play-btn')) {
                e.stopPropagation();
                const movieId = card.dataset.movieId;
                if (movieId) {
                    playMovie(movieId);
                }
                return;
            }

            const movieId = card.dataset.movieId;
            if (movieId) {
                openMovieDetail(movieId);
            }
        });
    });

    document.querySelectorAll('.history-movie-card .movie-play-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const card = btn.closest('.history-movie-card');
            if (card) {
                const movieId = card.dataset.movieId;
                if (movieId) {
                    playMovie(movieId);
                }
            }
        });
    });

    document.querySelectorAll('.history-delete-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const date = btn.dataset.date;
            const time = btn.dataset.time;
            await deleteHistoryRecord(date, time);
        });
    });

    document.querySelectorAll('.movie-select-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const movieKey = checkbox.dataset.movieKey;
            const card = checkbox.closest('.history-movie-card');
            if (checkbox.checked) {
                state.selectedMovies.add(movieKey);
                if (card) card.classList.add('selected');
            } else {
                state.selectedMovies.delete(movieKey);
                if (card) card.classList.remove('selected');
            }
            updateBatchActionsVisibility();
        });
    });
}

async function deleteHistoryRecord(date, time) {
    const confirmed = confirm('确定要删除这条历史记录吗？');
    if (!confirmed) return;

    try {
        const result = await window.electronAPI.deletePlayHistory(date, time);
        if (result && result.success) {
            await loadHistoryData();
        } else {
            alert('删除失败');
        }
    } catch (error) {
        console.error('Error deleting history record:', error);
        alert('删除失败: ' + error.message);
    }
}

async function openMovieDetail(movieId) {
    try {
        const movieDetail = await window.electronAPI.getMovieDetail(movieId);
        if (movieDetail && !movieDetail.error) {
            await window.electronAPI.openMovieDetail(movieDetail);
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

function updateBatchActionsVisibility() {
    if (state.selectedMovies.size > 0) {
        elements.batchActions.style.display = 'flex';
    } else {
        elements.batchActions.style.display = 'none';
    }
}

async function playSelectedMovies() {
    if (state.selectedMovies.size === 0) {
        alert('请先选择要播放的电影');
        return;
    }

    try {
        const playlist = [];

        for (const movieKey of state.selectedMovies) {
            const movieDetail = await window.electronAPI.getMovieDetail(movieKey);
            if (!movieDetail || movieDetail.error) continue;

            if (movieDetail.fileset && Array.isArray(movieDetail.fileset)) {
                for (const file of movieDetail.fileset) {
                    const fileType = file.type || file.fileType;
                    if (fileType === 'Main' && file.fullpath) {
                        playlist.push({
                            path: file.fullpath,
                            title: `${movieDetail.name} - ${file.filename || ''}`,
                            movieId: movieKey,
                            category: movieDetail.category
                        });
                    }
                }
            }

            const hasMainFile = playlist.some(item => item.movieId === movieKey);
            if (!hasMainFile && movieDetail.original_filename) {
                playlist.push({
                    path: movieDetail.original_filename,
                    title: movieDetail.name || movieDetail.original_filename,
                    movieId: movieKey,
                    category: movieDetail.category
                });
            }
        }

        if (playlist.length === 0) {
            alert('选中的电影没有可播放的视频文件');
            return;
        }

        await window.electronAPI.openBatchPlayerWindow(playlist);
    } catch (error) {
        console.error('Error playing selected movies:', error);
        alert('播放失败: ' + error.message);
    }
}

document.addEventListener('DOMContentLoaded', init);

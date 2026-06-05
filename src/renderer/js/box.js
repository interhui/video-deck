/**
 * 电影收藏夹视图逻辑
 */

// 状态管理
const state = {
    boxName: '', //收藏夹名称
    boxData: null, //收藏夹数据对象
    movies: [], //电影列表
    categories: [], //收藏夹中的分类列表
    currentCategory: '', //当前选中的分类(左侧栏过滤)
    currentStatus: '', //当前选中的状态
    currentSort: 'name-asc', //当前排序方式
    searchKeyword: '', //搜索关键词
    viewMode: 'grid', //视图模式
    selectedMovies: new Set(), //选中的电影集合
    detailEditModeLocked: false, //详情编辑模式锁定状态
    currentTag: '', //当前选中的标签筛选
    currentRating: '', //当前选中的评分筛选
    lazyLoader: null, //懒加载管理器
    settings: {},
    newMovieHours: 72,
    currentTagFilter: '', //当前标签过滤(用于模态窗)
    tagFilterModalVisible: false, //标签过滤模态窗可见性
    tagFilterSearchKeyword: '', //标签过滤搜索关键词
    tempSelectedTag: null //临时选中的标签
};

// DOM 元素
const elements = {
    backBtn: document.getElementById('back-btn'),
    boxTitle: document.getElementById('box-title'),
    minimizeBtn: document.getElementById('minimize-btn'),
    closeBtn: document.getElementById('close-btn'),
    boxDescription: document.getElementById('box-description'),
    boxDescriptionText: document.getElementById('box-description-text'),
    searchInput: document.getElementById('search-input'),
    searchBtn: document.getElementById('search-btn'),
    clearSearchBtn: document.getElementById('clear-search-btn'),
    viewCardBtn: document.getElementById('view-card-btn'),
    viewTableBtn: document.getElementById('view-table-btn'),
    batchRemoveBtn: document.getElementById('batch-remove-btn'),
    exportBtn: document.getElementById('export-btn'),
    playBtn: document.getElementById('play-btn'),
    moviesGrid: document.getElementById('movies-grid'),
    emptyState: document.getElementById('empty-state'),
    statsBar: {
        total: document.getElementById('total-movies'),
        newMovies: document.getElementById('new-movies'),
        played: document.getElementById('played-movies'),
        playing: document.getElementById('playing-movies'),
        unplayed: document.getElementById('unplayed-movies')
    },
    categoryList: document.getElementById('category-list'),
    categoryFilter: document.getElementById('category-filter'),
    statusFilter: document.getElementById('status-filter'),
    sortSelect: document.getElementById('sort-select'),
    tagFilter: document.getElementById('tag-filter'),
    ratingFilter: document.getElementById('rating-filter'),
    statusModal: document.getElementById('status-modal'),
    statusMovieName: document.getElementById('status-movie-name'),
    confirmStatusBtn: document.getElementById('confirm-status-btn'),
    cancelStatusBtn: document.getElementById('cancel-status-btn'),
    exportModal: document.getElementById('export-modal'),
    exportBoxName: document.getElementById('export-box-name'),
    confirmExportBtn: document.getElementById('confirm-export-btn'),
    cancelExportBtn: document.getElementById('cancel-export-btn'),
    tagFilterModal: document.getElementById('tag-filter-modal'),
    closeTagFilter: document.getElementById('close-tag-filter'),
    tagFilterList: document.getElementById('tag-filter-list'),
    tagFilterSearchInput: document.getElementById('tag-filter-search-input'),
    tagFilterSearchBtn: document.getElementById('tag-filter-search-btn'),
    tagFilterClearBtn: document.getElementById('tag-filter-clear-btn'),
    confirmTagFilter: document.getElementById('confirm-tag-filter'),
    cancelTagFilter: document.getElementById('cancel-tag-filter')
};

// 当前正在修改状态的电影
let currentStatusMovie = null;
let currentEditingRating = 0;

// 分类缓存
let categoriesCache = [];

async function loadCategories() {
    categoriesCache = await loadCategoriesCache();
}

let tagsCache = [];

async function loadTags() {
    tagsCache = await loadTagsCache();
    _updateTagFilter();
}

function _updateTagFilter() {
    updateTagFilter({ selectEl: elements.tagFilter, tags: tagsCache, showSelectOption: true, maxDisplay: 10 });
}

/**
 * 打开标签过滤模态窗
 */
async function openTagFilterModal() {
    state.tagFilterModalVisible = true;
    state.tagFilterSearchKeyword = '';
    elements.tagFilterSearchInput.value = '';
    await loadTags();
    state.tempSelectedTag = state.currentTagFilter || null;
    _renderTagFilterList();
    elements.tagFilterModal.style.display = 'flex';
}

/**
 * 关闭标签过滤模态窗
 */
function closeTagFilterModal() {
    state.tagFilterModalVisible = false;
    elements.tagFilterModal.style.display = 'none';
}

/**
 * 确认标签过滤选择
 */
/**
 * 确认标签过滤选择
 */
function confirmTagFilter() {
    state.currentTagFilter = state.tempSelectedTag;
    state.currentTag = state.currentTagFilter || '';
    _updateTagFilterDisplay();
    closeTagFilterModal();
    const filteredMovies = getFilteredMovies(state.movies, { category: state.currentCategory, tag: state.currentTag, status: state.currentStatus, rating: state.currentRating, searchKeyword: state.searchKeyword });
    updateCategoryListWithFilteredMovies(filteredMovies);
    renderMovies(state.movies);
}

/**
 * 取消标签过滤选择，重置为"全部标签"
 */
function cancelTagFilter() {
    state.currentTagFilter = '';
    state.currentTag = '';
    state.tempSelectedTag = null;
    _updateTagFilterDisplay();
    closeTagFilterModal();
    const filteredMovies = getFilteredMovies(state.movies, { category: state.currentCategory, tag: state.currentTag, status: state.currentStatus, rating: state.currentRating, searchKeyword: state.searchKeyword });
    updateCategoryListWithFilteredMovies(filteredMovies);
    renderMovies(state.movies);
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

/**
 * 初始化
 */
async function init() {
    console.log('Box view initialized');

    // 获取URL参数中的收藏夹名称
    const urlParams = new URLSearchParams(window.location.search);
    state.boxName = urlParams.get('name');

    if (!state.boxName) {
        alert('未指定电影收藏夹');
        window.close();
        return;
    }

    // 设置页面标题
    elements.boxTitle.textContent = state.boxName;

    // 加载主题设置
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

    // 加载分类缓存
    await loadCategories();

    // 加载标签
    await loadTags();

    // 绑定事件
    bindEvents();

    // 初始化分隔线拖动
    initSplitter();

    // 监听收藏夹更新事件
    window.electronAPI.onBoxUpdated(async () => {
        await loadBoxData();
    });

    // 监听主题变化
    window.electronAPI.onThemeChanged((theme) => {
        applyTheme(theme);
    });

    // 监听详情窗口编辑模式变化（锁定/解锁电影卡片点击）
    window.electronAPI.onDetailEditModeChanged((isEditing) => {
        state.detailEditModeLocked = isEditing;
    });

    // 加载收藏夹数据
    await loadBoxData();
}

/**
 * 初始化分隔线拖动功能
 */
function initSplitter() {
    const splitter = document.getElementById('box-splitter');
    const sidebar = document.getElementById('box-sidebar');
    const movieWall = document.getElementById('box-movie-wall');

    if (!splitter || !sidebar || !movieWall) {
        return;
    }

    let isResizing = false;
    let minWidth = 150;
    let maxWidth = 400;

    splitter.addEventListener('mousedown', (e) => {
        isResizing = true;
        splitter.classList.add('active');
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    });

    document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;

        const containerRect = sidebar.parentElement.getBoundingClientRect();
        const newWidth = e.clientX - containerRect.left;

        if (newWidth >= minWidth && newWidth <= maxWidth) {
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

/**
 * 绑定事件
 */
function bindEvents() {
    // 返回按钮
    elements.backBtn.addEventListener('click', () => {
        window.close();
    });

    // 最小化按钮
    elements.minimizeBtn.addEventListener('click', () => {
        window.electronAPI.minimizeWindow();
    });

    // 关闭按钮
    elements.closeBtn.addEventListener('click', () => {
        window.close();
    });

    // 搜索
    elements.searchBtn.addEventListener('click', () => {
        state.searchKeyword = elements.searchInput.value.trim();
        const filteredMovies = getFilteredMovies(state.movies, { category: state.currentCategory, tag: state.currentTag, status: state.currentStatus, rating: state.currentRating, searchKeyword: state.searchKeyword });
        updateCategoryListWithFilteredMovies(filteredMovies);
        renderMovies(state.movies);
        updateClearButtonVisibility(elements.clearSearchBtn, state.searchKeyword);
    });

    elements.searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            state.searchKeyword = e.target.value.trim();
            const filteredMovies = getFilteredMovies(state.movies, { category: state.currentCategory, tag: state.currentTag, status: state.currentStatus, rating: state.currentRating, searchKeyword: state.searchKeyword });
            updateCategoryListWithFilteredMovies(filteredMovies);
            renderMovies(state.movies);
            updateClearButtonVisibility(elements.clearSearchBtn, state.searchKeyword);
        }
    });

    // 清除搜索
    elements.clearSearchBtn.addEventListener('click', () => {
        elements.searchInput.value = '';
        state.searchKeyword = '';
        updateCategoryList();
        renderMovies(state.movies);
        updateClearButtonVisibility(elements.clearSearchBtn, state.searchKeyword);
    });

    updateClearButtonVisibility(elements.clearSearchBtn, state.searchKeyword);

    function switchView(view) {
        state.viewMode = view;
        if (view === 'grid') {
            elements.moviesGrid.classList.remove('list-view');
            elements.viewCardBtn.classList.add('active');
            elements.viewTableBtn.classList.remove('active');
        } else {
            elements.moviesGrid.classList.add('list-view');
            elements.viewCardBtn.classList.remove('active');
            elements.viewTableBtn.classList.add('active');
        }
        if (state.lazyLoader) {
            state.lazyLoader.destroy();
            state.lazyLoader = null;
        }
        renderMovies(state.movies, false);
        updateBatchButtonVisibility();
    }

    elements.viewCardBtn.addEventListener('click', () => switchView('grid'));
    elements.viewTableBtn.addEventListener('click', () => switchView('list'));

    // 分类筛选下拉框
    elements.categoryFilter.addEventListener('change', (e) => {
        setCurrentCategory(e.target.value);
    });

    // 状态筛选
    elements.statusFilter.addEventListener('change', (e) => {
        state.currentStatus = e.target.value;
        const filteredMovies = getFilteredMovies(state.movies, { category: state.currentCategory, tag: state.currentTag, status: state.currentStatus, rating: state.currentRating, searchKeyword: state.searchKeyword });
        updateCategoryListWithFilteredMovies(filteredMovies);
        renderMovies(state.movies);
    });

    // 排序
    elements.sortSelect.addEventListener('change', (e) => {
        state.currentSort = e.target.value;
        renderMovies(state.movies);
    });

    // 标签筛选
    elements.tagFilter.addEventListener('change', (e) => {
        const value = e.target.value;
        if (value === '') {
            state.currentTag = '';
            state.currentTagFilter = '';
            const filteredMovies = getFilteredMovies(state.movies, { category: state.currentCategory, tag: state.currentTag, status: state.currentStatus, rating: state.currentRating, searchKeyword: state.searchKeyword });
            updateCategoryListWithFilteredMovies(filteredMovies);
            renderMovies(state.movies);
        } else if (value === 'select') {
            openTagFilterModal();
        } else {
            state.currentTag = value;
            state.currentTagFilter = value;
            const filteredMovies = getFilteredMovies(state.movies, { category: state.currentCategory, tag: state.currentTag, status: state.currentStatus, rating: state.currentRating, searchKeyword: state.searchKeyword });
            updateCategoryListWithFilteredMovies(filteredMovies);
            renderMovies(state.movies);
        }
    });

    // 标签过滤模态窗关闭
    elements.closeTagFilter.addEventListener('click', closeTagFilterModal);
    elements.cancelTagFilter.addEventListener('click', cancelTagFilter);
    elements.tagFilterModal.addEventListener('click', (e) => {
        if (e.target === elements.tagFilterModal) {
            cancelTagFilter();
        }
    });

    // 标签过滤模态窗确认
    elements.confirmTagFilter.addEventListener('click', confirmTagFilter);

    // 标签过滤搜索
    elements.tagFilterSearchBtn.addEventListener('click', () => {
        const keyword = elements.tagFilterSearchInput.value.trim();
        state.tagFilterSearchKeyword = keyword;
        _updateTagFilterClearButton();
        _renderTagFilterList();
    });

    elements.tagFilterSearchInput.addEventListener('input', () => {
        const keyword = elements.tagFilterSearchInput.value.trim();
        state.tagFilterSearchKeyword = keyword;
        _updateTagFilterClearButton();
        _renderTagFilterList();
    });

    elements.tagFilterSearchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const keyword = e.target.value.trim();
            state.tagFilterSearchKeyword = keyword;
            _updateTagFilterClearButton();
            _renderTagFilterList();
        }
    });

    // 清除标签过滤搜索
    elements.tagFilterClearBtn.addEventListener('click', () => {
        elements.tagFilterSearchInput.value = '';
        state.tagFilterSearchKeyword = '';
        _updateTagFilterClearButton();
        _renderTagFilterList();
    });

    // 评分筛选
    elements.ratingFilter.addEventListener('change', (e) => {
        state.currentRating = e.target.value;
        const filteredMovies = getFilteredMovies(state.movies, { category: state.currentCategory, tag: state.currentTag, status: state.currentStatus, rating: state.currentRating, searchKeyword: state.searchKeyword });
        updateCategoryListWithFilteredMovies(filteredMovies);
        renderMovies(state.movies);
    });

    // 批量移除按钮
    elements.batchRemoveBtn.addEventListener('click', async () => {
        await batchRemoveMovies();
    });

    // 状态修改弹窗按钮
    elements.confirmStatusBtn.addEventListener('click', async () => {
        await confirmStatusChange();
    });

    elements.cancelStatusBtn.addEventListener('click', () => {
        closeStatusModal();
    });

    // 关闭按钮
    document.getElementById('close-status-modal').addEventListener('click', () => {
        closeStatusModal();
    });

    // 点击弹窗外部关闭
    elements.statusModal.addEventListener('click', (e) => {
        if (e.target === elements.statusModal) {
            closeStatusModal();
        }
    });

    // 评分星星点击
    document.querySelectorAll('.rating-star').forEach(star => {
        star.addEventListener('click', (e) => {
            e.stopPropagation();
            const rating = parseInt(star.dataset.rating, 10);
            currentEditingRating = currentEditingRating === rating ? 0 : rating;
            updateRatingDisplay();
        });
    });

    // 导出按钮
    elements.exportBtn.addEventListener('click', () => {
        openExportModal();
    });

    elements.playBtn.addEventListener('click', async () => {
        await playBoxMovies();
    });

    // 导出弹窗按钮
    elements.confirmExportBtn.addEventListener('click', async () => {
        await confirmExport();
    });

    elements.cancelExportBtn.addEventListener('click', () => {
        closeExportModal();
    });

    // 关闭导出弹窗
    document.getElementById('close-export-modal').addEventListener('click', () => {
        closeExportModal();
    });

    // 点击导出弹窗外部关闭
    elements.exportModal.addEventListener('click', (e) => {
        if (e.target === elements.exportModal) {
            closeExportModal();
        }
    });
}

/**
 * 设置当前分类筛选
 * 统一处理左侧栏和下拉框的分类选择
 */
function setCurrentCategory(category) {
    state.currentCategory = category;

    // 更新左侧栏选中状态
    document.querySelectorAll('.box-category-item').forEach(item => {
        if (item.dataset.category === category) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });

    // 更新下拉框
    elements.categoryFilter.value = category;

    // 重新渲染
    renderMovies(state.movies);
}

/**
 * 加载收藏夹数据
 */
async function loadBoxData() {
    try {
        const boxDetail = await window.electronAPI.getBoxDetail(state.boxName);

        if (!boxDetail || boxDetail.error) {
            console.error('Error loading box:', boxDetail.error);
            alert('加载收藏夹失败');
            return;
        }

        state.boxData = boxDetail.data;

        // 更新收藏夹标题
        elements.boxTitle.textContent = boxDetail.name || state.boxName;

        // 更新收藏夹描述
        if (boxDetail.description) {
            elements.boxDescription.style.display = 'block';
            elements.boxDescriptionText.textContent = boxDetail.description;
        } else {
            elements.boxDescription.style.display = 'none';
        }

        // 获取所有电影详情
        await loadMoviesFromBox(boxDetail.data);
    } catch (error) {
        console.error('Error loading box data:', error);
    }
}

/**
 * 从收藏夹数据加载电影
 */
async function loadMoviesFromBox(boxData) {
    try {
        // 提取收藏夹中的电影ID列表
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

        // 收藏夹电影使用一次性加载（收藏夹通常不会太大，且需要完整的电影数据进行筛选）
        await loadMoviesFromBoxAll(boxMovieIds, boxMovieMap);
    } catch (error) {
        console.error('Error loading movies from box:', error);
    }
}

/**
 * 一次性加载所有收藏夹电影（用于筛选模式）
 */
async function loadMoviesFromBoxAll(boxMovieIds, boxMovieMap) {
    try {
        const allMovies = await window.electronAPI.getAllMovies({});
        const movies = [];
        const categoriesSet = new Set();
        const validMovieIds = new Set();

        for (const movie of allMovies) {
            // 检查电影是否在收藏夹中（收藏夹存储的是 movie.id）
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

        // 检查是否有电影已从库中删除，如果有则清理收藏夹
        const deletedMovieIds = boxMovieIds.filter(id => !validMovieIds.has(id));
        if (deletedMovieIds.length > 0) {
            console.log(`发现 ${deletedMovieIds.length} 个电影已从库中删除，正在清理收藏夹...`);
            const cleanResult = await window.electronAPI.cleanBox({
                boxName: state.boxName,
                validMovieIds: Array.from(validMovieIds)
            });
            if (cleanResult.success && cleanResult.removedCount > 0) {
                console.log(`已从收藏夹中移除 ${cleanResult.removedCount} 个已删除的电影`);
            }
        }

        state.movies = movies;
        state.categories = Array.from(categoriesSet);

        // 更新分类列表（左侧栏）
        updateCategoryList();

        // 更新分类筛选下拉框
        _updateCategoryFilter();

        // 渲染电影
        renderMovies(movies, false);

        // 更新统计
        updateStats(movies);
    } catch (error) {
        console.error('Error loading all box movies:', error);
    }
}

/**
 * 初始化收藏夹懒加载管理器
 */
async function initBoxLazyLoader(boxMovieIds, boxMovieMap) {
    // 如果已存在懒加载器，先销毁
    if (state.lazyLoader) {
        state.lazyLoader.destroy();
    }

    const sortOptions = {
        sortBy: state.currentSort.split('-')[0],
        sortOrder: state.currentSort.split('-')[1]
    };

    // 用于存储已添加到收藏夹的电影ID（避免重复）
    const addedMovieIds = new Set();

    // 获取滚动容器（.movie-wall 或 #box-movie-wall）
    const scrollContainer = document.getElementById('box-movie-wall') || document.getElementById('movie-wall');

    state.lazyLoader = new LazyLoader({
        pageSize: 100,
        scrollContainer: scrollContainer,
        loadPage: async (page, pageSize) => {
            // 调用分页API获取电影
            const result = await window.electronAPI.getMoviesPaginated({
                page,
                pageSize,
                sortBy: sortOptions.sortBy,
                sortOrder: sortOptions.sortOrder
            });

            if (result && result.movies) {
                // 过滤出收藏夹中的电影，并添加收藏夹信息
                const filteredMovies = [];
                const categoriesSet = new Set();

                for (const movie of result.movies) {
                    const boxInfo = boxMovieMap.get(movie.id);
                    if (boxInfo && !addedMovieIds.has(movie.id)) {
                        addedMovieIds.add(movie.id);
                        filteredMovies.push({
                            ...movie,
                            boxStatus: boxInfo.boxStatus,
                            boxRating: boxInfo.boxRating,
                            boxComment: boxInfo.boxComment
                        });
                        categoriesSet.add(movie.category);
                    }
                }

                // 更新分类列表
                categoriesSet.forEach(cat => {
                    if (!state.categories.includes(cat)) {
                        state.categories.push(cat);
                    }
                });

                return {
                    ...result,
                    movies: filteredMovies,
                    total: boxMovieIds.length  // 使用收藏夹电影总数作为总数
                };
            }

            return result;
        },
        onRender: (movies, isAppend) => {
            renderMovies(movies, isAppend);
            // 更新分类列表
            updateCategoryList();
            _updateCategoryFilter();
        },
        onComplete: () => {
            console.log('All box movies loaded');
            updateStats(state.movies);
        },
        onError: (error) => {
            console.error('Box LazyLoader error:', error);
        }
    });
}

/**
 * 更新分类列表（左侧栏）
 */
function updateCategoryList() {
    const totalCount = state.movies.length;
    let html = `
        <li class="box-category-item active" data-category="">
            <span class="category-name">全部</span>
            <span class="movie-count">${totalCount}</span>
        </li>
    `;

    state.categories.forEach(category => {
        const count = state.movies.filter(m => m.category === category).length;
        const name = getCategoryName(category);
        html += `
            <li class="box-category-item" data-category="${category}">
                <span class="category-name">${name}</span>
                <span class="movie-count">${count}</span>
            </li>
        `;
    });

    elements.categoryList.innerHTML = html;

    // 绑定点击事件
    document.querySelectorAll('.box-category-item').forEach(item => {
        item.addEventListener('click', () => {
            setCurrentCategory(item.dataset.category);
        });
    });
}

/**
 * 根据过滤后的电影列表更新分类列表（搜索时使用）
 * @param {Array} filteredMovies - 过滤后的电影列表
 */
function updateCategoryListWithFilteredMovies(filteredMovies) {
    const totalCount = filteredMovies.length;
    let html = `
        <li class="box-category-item active" data-category="">
            <span class="category-name">全部</span>
            <span class="movie-count">${totalCount}</span>
        </li>
    `;

    state.categories.forEach(category => {
        const count = filteredMovies.filter(m => m.category === category).length;
        const name = getCategoryName(category);
        // 只显示有匹配电影的分类
        if (count > 0) {
            html += `
                <li class="box-category-item" data-category="${category}">
                    <span class="category-name">${name}</span>
                    <span class="movie-count">${count}</span>
                </li>
            `;
        }
    });

    elements.categoryList.innerHTML = html;

    // 绑定点击事件
    document.querySelectorAll('.box-category-item').forEach(item => {
        item.addEventListener('click', () => {
            setCurrentCategory(item.dataset.category);
        });
    });
}

function _updateCategoryFilter() {
    updateCategoryFilter({ selectEl: elements.categoryFilter, categories: state.categories, movies: state.movies, categoriesCache });
}

/**
 * 渲染电影列表
 * @param {Array} movies - 电影列表
 * @param {boolean} isAppend - 是否追加模式（true=追加，false=替换）
 */
function renderMovies(movies, isAppend = false) {
    // 应用过滤
    let filteredMovies = movies;

    // 分类过滤
    if (state.currentCategory) {
        filteredMovies = filteredMovies.filter(m => m.category === state.currentCategory);
    }

    // 状态过滤
    if (state.currentStatus) {
        filteredMovies = filteredMovies.filter(m => m.boxStatus === state.currentStatus);
    }

    // 标签过滤
    if (state.currentTag) {
        filteredMovies = filteredMovies.filter(m =>
            m.tags && m.tags.includes(state.currentTag)
        );
    }

    // 评分过滤
    if (state.currentRating) {
        const rating = parseInt(state.currentRating, 10);
        if (!isNaN(rating)) {
            filteredMovies = filteredMovies.filter(m =>
                m.boxRating !== undefined && m.boxRating === rating
            );
        }
    }

    // 搜索过滤（名称、描述、标签）
    if (state.searchKeyword) {
        const keyword = state.searchKeyword.toLowerCase();
        filteredMovies = filteredMovies.filter(m =>
            m.name.toLowerCase().includes(keyword) ||
            (m.description && m.description.toLowerCase().includes(keyword)) ||
            (m.tags && m.tags.some(tag => tag.toLowerCase().includes(keyword)))
        );
    }

    // 排序
    const [sortBy, sortOrder] = state.currentSort.split('-');
    filteredMovies = sortMovies(filteredMovies, sortBy, sortOrder);

    if (!filteredMovies || filteredMovies.length === 0) {
        if (!isAppend) {
            elements.moviesGrid.innerHTML = '';
            elements.moviesGrid.classList.remove('list-view');
            elements.emptyState.style.display = 'flex';
        }
        return;
    }

    elements.emptyState.style.display = 'none';

    let html = '';

    // 非追加模式时，需要渲染表头
    if (!isAppend) {
        if (state.viewMode === 'list') {
            // 列表视图
            html += `
                <div class="list-view-header">
                    <div class="movie-checkbox">
                        <input type="checkbox" id="select-all" ${state.selectedMovies.size === filteredMovies.length && filteredMovies.length > 0 ? 'checked' : ''}>
                    </div>
                    <div class="movie-action-col">操作</div>
                    <div class="movie-id-col">电影ID</div>
                    <div class="movie-name">名称</div>
                    <div class="movie-actors-col">主演</div>
                    <div class="movie-publish-date">上映时间</div>
                    <div class="movie-publisher-col">发行商</div>
                    <div class="movie-status">状态</div>
                    <div class="movie-rating">评分</div>
                </div>
            `;
        }
    }

    html += filteredMovies.map(movie => {
        const isSelected = state.selectedMovies.has(movie.id);

        if (state.viewMode === 'list') {
            // 列表视图
            return `
                <div class="box-movie-card movie-card ${isSelected ? 'selected' : ''}" data-movie-id="${movie.id}" data-id="${movie.id}">
                    <div class="movie-checkbox">
                        <input type="checkbox" class="movie-select-checkbox" data-movie-id="${movie.id}" ${isSelected ? 'checked' : ''}>
                    </div>
                    <div class="movie-action-col">
                        <button class="remove-btn" data-movie-id="${movie.id}" title="从收藏夹中移除">✕</button>
                    </div>
                    <div class="movie-id-col">${movie.id || ''}</div>
                    <div class="movie-name">${movie.name}</div>
                    <div class="movie-actors-col">${movie.actors || '-'}</div>
                    <div class="movie-publish-date">${movie.publishDate || '-'}</div>
                    <div class="movie-publisher-col">${movie.studio || '-'}</div>
                    <div class="movie-status"><span class="box-list-status ${movie.boxStatus || 'unwatched'}" data-movie-id="${movie.id}" data-category="${movie.category}">${getStatusText(movie.boxStatus)}</span></div>
                    <div class="movie-rating">${movie.boxRating ? '⭐'.repeat(movie.boxRating) : '-'}</div>
                </div>
            `;
        } else {
            const posterStyleClass = state.settings.layout?.posterStyle === 'horizontal' ? 'horizontal-poster' : '';
            // 网格视图
            return `
                <div class="box-movie-card movie-card ${posterStyleClass}" data-movie-id="${movie.id}" data-id="${movie.id}">
                    <button class="remove-btn" data-movie-id="${movie.id}" title="从收藏夹中移除">✕</button>
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
        }
    }).join('');

    if (isAppend) {
        // 追加模式：向现有内容追加
        elements.moviesGrid.insertAdjacentHTML('beforeend', html);
    } else {
        // 替换模式：替换整个内容
        elements.moviesGrid.innerHTML = html;
    }

    // 绑定点击事件
    document.querySelectorAll('.box-movie-card').forEach(card => {
        card.addEventListener('click', (e) => {
            // 如果点击的是移除按钮、复选框或播放按钮，不打开详情
            if (e.target.classList.contains('remove-btn')) return;
            if (e.target.type === 'checkbox') return;
            if (e.target.classList.contains('movie-play-btn')) {
                e.stopPropagation();
                const movieId = card.dataset.id;  // 使用真实的id而非movieId
                playBoxMovie(movieId);
                return;
            }

            const movieId = card.dataset.id;  // 使用真实的id而非movieId
            openMovieDetail(movieId);
        });
    });

    // 绑定播放按钮事件（冒泡处理）
    document.querySelectorAll('.box-movie-card .movie-play-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const card = btn.closest('.box-movie-card');
            if (card) {
                const movieId = card.dataset.id;  // 使用真实的id而非movieId
                playBoxMovie(movieId);
            }
        });
    });

    // 绑定移除按钮事件
    document.querySelectorAll('.remove-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const movieId = btn.dataset.movieId;
            await removeMovieFromBox(movieId);
        });
    });

    // 绑定状态标签点击事件
    document.querySelectorAll('.box-status-tag, .box-list-status').forEach(tag => {
        tag.addEventListener('click', (e) => {
            e.stopPropagation();
            const movieId = tag.dataset.movieId;
            const category = tag.dataset.category;
            openStatusModal(movieId, category);
        });
    });

    // 绑定全选复选框事件
    const selectAllCheckbox = document.getElementById('select-all');
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                filteredMovies.forEach(movie => state.selectedMovies.add(movie.id));
            } else {
                state.selectedMovies.clear();
            }
            renderMovies(state.movies, false);
            updateBatchButtonVisibility();
        });
    }

    // 绑定单个复选框事件
    document.querySelectorAll('.movie-select-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const movieId = checkbox.dataset.movieId;
            if (checkbox.checked) {
                state.selectedMovies.add(movieId);
            } else {
                state.selectedMovies.delete(movieId);
            }
            updateSelectAllState();
            updateBatchButtonVisibility();
        });
    });
}

/**
 * 更新全选复选框状态
 */
function updateSelectAllState() {
    const selectAllCheckbox = document.getElementById('select-all');
    const checkboxes = document.querySelectorAll('.movie-select-checkbox');
    if (selectAllCheckbox && checkboxes.length > 0) {
        const allChecked = Array.from(checkboxes).every(cb => cb.checked);
        selectAllCheckbox.checked = allChecked;
    }
}

/**
 * 从收藏夹中移除电影
 */
async function removeMovieFromBox(movieId) {
    const confirmed = confirm('确定要从收藏夹中移除这部电影吗？');

    if (!confirmed) return;

    try {
        const movie = state.movies.find(m => m.id === movieId);
        if (!movie) return;

        const result = await window.electronAPI.removeMovieFromBox({
            boxName: state.boxName,
            category: movie.category,
            movieId: movieId
        });

        if (!result.error) {
            // 重新加载收藏夹数据
            await loadBoxData();
        } else {
            alert('移除失败: ' + result.error);
        }
    } catch (error) {
        console.error('Error removing movie from box:', error);
        alert('移除失败: ' + error.message);
    }
}

/**
 * 批量从收藏夹中移除电影
 */
async function batchRemoveMovies() {
    if (state.selectedMovies.size === 0) {
        alert('请先选择要移除的电影');
        return;
    }

    const confirmed = confirm(`确定要从收藏夹中移除选中的 ${state.selectedMovies.size} 部电影吗？`);

    if (!confirmed) return;

    try {
        let successCount = 0;
        let failCount = 0;

        for (const movieId of state.selectedMovies) {
            const movie = state.movies.find(m => m.movieId === movieId);
            if (!movie) continue;

            const result = await window.electronAPI.removeMovieFromBox({
                boxName: state.boxName,
                category: movie.category,
                movieId: movieId
            });

            if (!result.error) {
                successCount++;
            } else {
                failCount++;
            }
        }

        if (failCount > 0) {
            alert(`移除完成：成功 ${successCount} 个，失败 ${failCount} 个`);
        } else {
            alert(`已成功移除 ${successCount} 部电影`);
        }

        // 清空选择
        state.selectedMovies.clear();

        // 重新加载收藏夹数据
        await loadBoxData();
    } catch (error) {
        console.error('Error batch removing movies from box:', error);
        alert('批量移除失败: ' + error.message);
    }
}

/**
 * 更新批量操作按钮可见性
 */
function updateBatchButtonVisibility() {
    // 只在列表视图且有选中电影时显示批量移除按钮
    if (state.viewMode === 'list' && state.selectedMovies.size > 0) {
        elements.batchRemoveBtn.style.display = 'block';
    } else {
        elements.batchRemoveBtn.style.display = 'none';
    }
}

/**
 * 打开状态修改弹窗
 */
function openStatusModal(movieId, category) {
    const movie = state.movies.find(m => m.movieId === movieId);
    if (!movie) return;

    currentStatusMovie = { movieId, category, movie };
    elements.statusMovieName.textContent = movie.name;

    // 设置单选框的选中状态
    const currentStatus = movie.boxStatus || 'unwatched';
    const radioButtons = document.querySelectorAll('input[name="status"]');
    radioButtons.forEach(radio => {
        radio.checked = radio.value === currentStatus;
    });

    // 设置评分
    currentEditingRating = movie.boxRating || 0;
    updateRatingDisplay();

    elements.statusModal.style.display = 'flex';
}

/**
 * 关闭状态修改弹窗
 */
function closeStatusModal() {
    elements.statusModal.style.display = 'none';
    currentStatusMovie = null;
}

/**
 * 更新评分显示
 */
function updateRatingDisplay() {
    const stars = document.querySelectorAll('.rating-star');
    stars.forEach(star => {
        const rating = parseInt(star.dataset.rating, 10);
        if (rating <= currentEditingRating) {
            star.textContent = '★';
            star.classList.add('active');
        } else {
            star.textContent = '☆';
            star.classList.remove('active');
        }
    });
}

/**
 * 确认状态修改
 */
async function confirmStatusChange() {
    if (!currentStatusMovie) return;

    const { movieId, category, movie } = currentStatusMovie;
    const selectedRadio = document.querySelector('input[name="status"]:checked');
    if (!selectedRadio) return;

    const newStatus = selectedRadio.value;

    try {
        const result = await window.electronAPI.updateMovieInBox({
            boxName: state.boxName,
            category: category,
            movieId: movieId,
            movieInfo: {
                status: newStatus,
                rating: currentEditingRating
            }
        });

        if (!result.error) {
            closeStatusModal();
            await loadBoxData();
        } else {
            alert('修改失败: ' + result.error);
        }
    } catch (error) {
        console.error('Error updating movie:', error);
        alert('修改失败: ' + error.message);
    }
}

/**
 * 打开电影详情
 */
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
                boxName: state.boxName
            });
        }
    } catch (error) {
        console.error('Error opening movie detail:', error);
    }
}

/**
 * 更新统计数据
 */
function updateStats(movies) {
    elements.statsBar.total.textContent = `电影总数：${movies.length}`;
    elements.statsBar.newMovies.textContent = `新电影：${movies.filter(m => m.boxStatus === 'new').length}`;
    elements.statsBar.played.textContent = `已完成：${movies.filter(m => m.boxStatus === 'completed').length}`;
    elements.statsBar.playing.textContent = `观看中：${movies.filter(m => m.boxStatus === 'watching').length}`;
    elements.statsBar.unplayed.textContent = `未观看：${movies.filter(m => m.boxStatus === 'unwatched').length}`;
}

/**
 * 打开导出弹窗
 */
function openExportModal() {
    elements.exportBoxName.textContent = state.boxName;
    const firstRadio = document.querySelector('input[name="export-type"]');
    if (firstRadio) {
        firstRadio.checked = true;
    }
    elements.exportModal.style.display = 'flex';
}

/**
 * 关闭导出弹窗
 */
function closeExportModal() {
    elements.exportModal.style.display = 'none';
}

/**
 * 确认导出
 */
async function confirmExport() {
    const selectedRadio = document.querySelector('input[name="export-type"]:checked');
    if (!selectedRadio) {
        alert('请选择导出格式');
        return;
    }

    const exportType = selectedRadio.value;
    const withVideoOnly = document.getElementById('export-with-video').checked;
    const timestamp = getExportTimestamp();
    
    const extensions = {
        'zip': '.zip',
        'csv': '.csv',
        'dpl': '.dpl',
        'json': '.json'
    };
    
    const defaultFileName = `${state.boxName}-${timestamp}-export${extensions[exportType]}`;

    closeExportModal();

    try {
        const result = await window.electronAPI.showExportSaveDialog({
            defaultPath: defaultFileName,
            filters: getExportFilters(exportType)
        });

        if (result.canceled) {
            return;
        }

        const exportPath = result.filePath;
        const allMovies = getFilteredMovies(state.movies, { category: state.currentCategory, tag: state.currentTag, status: state.currentStatus, rating: state.currentRating, searchKeyword: state.searchKeyword });
        
        let moviesToExport = allMovies;
        let videoCount = 0;
        
        if (withVideoOnly) {
            moviesToExport = allMovies.filter(m => m.original_filename && m.original_filename.trim() !== '');
            videoCount = moviesToExport.length;
        } else {
            videoCount = allMovies.filter(m => m.original_filename && m.original_filename.trim() !== '').length;
        }
        
        const exportResult = await window.electronAPI.exportBox({
            boxName: state.boxName,
            exportType: exportType,
            exportPath: exportPath,
            movies: moviesToExport
        });

        if (exportResult.success) {
            const totalCount = exportResult.count || moviesToExport.length;
            let message = `导出成功！共导出 ${totalCount} 部电影（含 ${videoCount} 个视频）`;
            if (exportResult.skipped && exportResult.skipped.length > 0) {
                message += `\n跳过 ${exportResult.skipped.length} 部（目录不存在）`;
            }
            alert(message);
        } else {
            alert('导出失败: ' + exportResult.error);
        }
    } catch (error) {
        console.error('Error exporting box:', error);
        alert('导出失败: ' + error.message);
    }
}

async function playBoxMovies() {
    try {
        const playlist = [];
        const allMovies = getFilteredMovies(state.movies, { category: state.currentCategory, tag: state.currentTag, status: state.currentStatus, rating: state.currentRating, searchKeyword: state.searchKeyword });

        for (const movie of allMovies) {
            const movieIdToUse = movie.id;
            const movieDetail = await window.electronAPI.getMovieDetail(movieIdToUse);
            
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

/**
 * 播放单个电影（从box详情）
 */
async function playBoxMovie(movieId) {
    try {
        console.log('[playBoxMovie] movieId:', movieId);
        const movieDetail = await window.electronAPI.getMovieDetail(movieId);
        console.log('[playBoxMovie] getMovieDetail result:', movieDetail);
        if (!movieDetail || movieDetail.error) {
            alert('获取电影详情失败');
            return;
        }

        // 构建播放列表
        const playlist = [];

        if (movieDetail.fileset && Array.isArray(movieDetail.fileset)) {
            for (const file of movieDetail.fileset) {
                const fileType = file.type || file.fileType;
                if (fileType === 'Main' && file.fullpath) {
                    playlist.push({
                        path: file.fullpath,
                        title: `${movieDetail.name} - ${file.filename || path.basename(file.fullpath)}`,
                        codec: file.codec || file.videoCodec || '',
                        resolution: file.resolution || (file.videoWidth ? `${file.videoWidth}x${file.videoHeight}` : '')
                    });
                }
            }
        }

        // 如果没有从fileset找到视频，尝试使用original_filename
        if (playlist.length === 0 && movieDetail.original_filename) {
            playlist.push({
                path: movieDetail.original_filename,
                title: movieDetail.name || path.basename(movieDetail.original_filename),
                codec: movieDetail.videoCodec || '',
                resolution: movieDetail.videoWidth ? `${movieDetail.videoWidth}x${movieDetail.videoHeight}` : ''
            });
        }

        if (playlist.length === 0) {
            alert('没有可播放的视频文件');
            return;
        }

        await window.electronAPI.openPlayerWindow(movieDetail, 0);
    } catch (error) {
        console.error('Error playing box movie:', error);
        alert('播放失败: ' + error.message);
    }
}

/**
 * 获取导出时间戳
 */
function getExportTimestamp() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

/**
 * 获取导出文件过滤器
 */
function getExportFilters(exportType) {
    switch (exportType) {
        case 'zip':
            return [{ name: 'ZIP文件', extensions: ['zip'] }];
        case 'csv':
            return [{ name: 'CSV文件', extensions: ['csv'] }];
        case 'dpl':
            return [{ name: 'PotPlayer播放列表', extensions: ['dpl'] }];
        case 'json':
            return [{ name: 'JSON文件', extensions: ['json'] }];
        default:
            return [{ name: '所有文件', extensions: ['*'] }];
    }
}

// 初始化
document.addEventListener('DOMContentLoaded', init);

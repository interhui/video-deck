/**
 * 主界面逻辑
 */

// 状态管理
const state = {
    categories: [],
    boxes: [],
    movies: [],
    currentCategory: '',
    currentBox: '',
    currentSort: 'name-asc',
    searchKeyword: '',
    viewMode: 'grid',
    settings: {},
    selectedMovies: new Set(),
    detailEditModeLocked: false,
    tags: [],  // 标签缓存
    selectedTags: new Set(),  // 当前选中的标签（用于添加电影）
    sidebarSearchActive: false,  // 侧边栏是否处于搜索激活状态
    currentTag: '',  // 当前选中的标签筛选
    // 文件关联相关
    movieFiles: [],  // 当前电影的关联文件列表
    selectedFileIndex: -1,  // 当前选中的文件索引
    pendingFilePath: '',  // 待添加文件的路径
    // 目录扫描相关
    scanTempDir: '',  // 当前扫描的临时目录
    scanMovies: [],  // 当前扫描的电影列表
    currentEditMovie: null,  // 当前编辑的扫描电影
    // 演员相关
    actors: [],  // 演员列表缓存
    selectedActors: [],  // 当前选中的演员（用于添加电影）
    currentActorFilter: [],  // 当前用于电影筛选的演员名称列表
    actorFilterModalVisible: false,  // 演员过滤模态窗是否显示
    // 演员选择弹窗状态
    actorSelectorSearchKeyword: '',  // 搜索关键字
    actorSelectorCurrentPage: 1,  // 当前页码
    actorSelectorPageSize: 10,  // 每页记录数
    // 懒加载相关
    lazyLoader: null  // 懒加载管理器
};

// DOM 元素
const elements = {
    categoryFilter: document.getElementById('category-filter'),
    sortSelect: document.getElementById('sort-select'),
    tagFilter: document.getElementById('tag-filter'),
    searchInput: document.getElementById('search-input'),
    searchBtn: document.getElementById('search-btn'),
    clearSearchBtn: document.getElementById('clear-search-btn'),
    viewToggle: document.getElementById('view-toggle'),
    refreshBtn: document.getElementById('refresh-btn'),
    settingsBtn: document.getElementById('settings-btn'),
    categoryList: document.getElementById('category-list'),
    boxList: document.getElementById('box-list'),
    moviesGrid: document.getElementById('movies-grid'),
    emptyState: document.getElementById('empty-state'),
    statsBar: {
        total: document.getElementById('total-movies'),
        actor: document.getElementById('total-actor'),
        category: document.getElementById('total-category')
    },
    settingsModal: document.getElementById('settings-modal'),
    closeSettings: document.getElementById('close-settings'),
    saveSettings: document.getElementById('save-settings'),
    cancelSettings: document.getElementById('cancel-settings'),
    themeSelect: document.getElementById('theme-select'),
    sidebarWidth: document.getElementById('sidebar-width'),
    posterSize: document.getElementById('poster-size'),
    moviesDirInput: document.getElementById('movies-dir-input'),
    selectDirBtn: document.getElementById('select-dir-btn'),
    movieboxDirInput: document.getElementById('moviebox-dir-input'),
    selectMovieboxDirBtn: document.getElementById('select-moviebox-dir-btn'),
    actorPhotoDirInput: document.getElementById('actor-photo-dir-input'),
    selectActorPhotoDirBtn: document.getElementById('select-actor-photo-dir-btn'),
    addBoxBtn: document.getElementById('add-box-btn'),
    boxList: document.getElementById('box-list'),
    createBoxModal: document.getElementById('create-box-modal'),
    boxNameInput: document.getElementById('box-name-input'),
    boxDescriptionInput: document.getElementById('box-description-input'),
    confirmCreateBox: document.getElementById('confirm-create-box'),
    cancelCreateBox: document.getElementById('cancel-create-box'),
    closeCreateBox: document.getElementById('close-create-box'),
    // 编辑盒子相关
    editBoxModal: document.getElementById('edit-box-modal'),
    editBoxNameInput: document.getElementById('edit-box-name-input'),
    editBoxDescriptionInput: document.getElementById('edit-box-description-input'),
    editBoxOriginalName: document.getElementById('edit-box-original-name'),
    confirmEditBox: document.getElementById('confirm-edit-box'),
    cancelEditBox: document.getElementById('cancel-edit-box'),
    closeEditBox: document.getElementById('close-edit-box'),
    // 删除盒子相关
    deleteBoxModal: document.getElementById('delete-box-modal'),
    confirmDeleteBox: document.getElementById('confirm-delete-box'),
    cancelDeleteBox: document.getElementById('cancel-delete-box'),
    closeDeleteBox: document.getElementById('close-delete-box'),
    // 批量添加相关
    batchAddBtn: document.getElementById('batch-add-btn'),
    batchAddModal: document.getElementById('batch-add-modal'),
    batchAddInfo: document.getElementById('batch-add-info'),
    batchBoxSelect: document.getElementById('batch-box-select'),
    confirmBatchAdd: document.getElementById('confirm-batch-add'),
    cancelBatchAdd: document.getElementById('cancel-batch-add'),
    closeBatchAdd: document.getElementById('close-batch-add'),
    // 批量删除相关
    batchDeleteBtn: document.getElementById('batch-delete-btn'),

    // 目录扫描相关
    scanDirBtn: document.getElementById('scan-dir-btn'),

    // 添加电影相关
    addMovieModal: document.getElementById('add-movie-modal'),
    closeAddMovie: document.getElementById('close-add-movie'),
    movieNameInput: document.getElementById('movie-name'),
    movieIdInput: document.getElementById('movie-id-input'),
    movieCategorySelect: document.getElementById('movie-category'),
    moviePublishDate: document.getElementById('movie-publish-date'),
    movieDirector: document.getElementById('movie-director'),
    movieStudio: document.getElementById('movie-publisher'),
    movieActors: document.getElementById('movie-actors'),
    movieDescription: document.getElementById('movie-description'),
    movieTags: document.getElementById('movie-tags'),
    selectCoverBtn: document.getElementById('select-cover-btn'),
    movieCoverInput: document.getElementById('movie-cover-input'),
    coverName: document.getElementById('cover-name'),
    coverPreview: document.getElementById('cover-preview'),
    confirmAddMovie: document.getElementById('confirm-add-movie'),
    cancelAddMovie: document.getElementById('cancel-add-movie'),
    addMovieFooter: document.getElementById('add-movie-footer'),

    // 演员选择相关
    actorSelectorModal: document.getElementById('actor-selector-modal'),
    closeActorSelector: document.getElementById('close-actor-selector'),
    actorSelectorList: document.getElementById('actor-selector-list'),
    actorSelectorSearchInput: document.getElementById('actor-selector-search-input'),
    actorSelectorSearchBtn: document.getElementById('actor-selector-search-btn'),
    actorSelectorClearBtn: document.getElementById('actor-selector-clear-btn'),
    actorSelectorPrevBtn: document.getElementById('actor-selector-prev-btn'),
    actorSelectorNextBtn: document.getElementById('actor-selector-next-btn'),
    actorSelectorPageInfo: document.getElementById('actor-selector-page-info'),
    confirmActorSelection: document.getElementById('confirm-actor-selection'),
    cancelActorSelection: document.getElementById('cancel-actor-selection'),

    // 演员过滤相关
    actorFilter: document.getElementById('actor-filter'),
    actorFilterModal: document.getElementById('actor-filter-modal'),
    closeActorFilter: document.getElementById('close-actor-filter'),
    actorFilterList: document.getElementById('actor-filter-list'),
    actorRatingFilter: document.getElementById('actor-rating-filter'),
    actorFavoriteFilter: document.getElementById('actor-favorite-filter'),
    actorFilterSearchInput: document.getElementById('actor-filter-search-input'),
    actorFilterSearchBtn: document.getElementById('actor-filter-search-btn'),
    actorFilterClearBtn: document.getElementById('actor-filter-clear-btn'),
    confirmActorFilter: document.getElementById('confirm-actor-filter'),
    cancelActorFilter: document.getElementById('cancel-actor-filter'),

    // 电影文件管理相关
    addFileBtn: document.getElementById('add-file-btn'),
    fileList: document.getElementById('file-list'),
    fileDetails: document.getElementById('file-details'),
    fileFullpath: document.getElementById('file-fullpath'),
    fileCodec: document.getElementById('file-codec'),
    fileResolution: document.getElementById('file-resolution'),
    fileDuration: document.getElementById('file-duration'),
    fileMemo: document.getElementById('file-memo'),
    addFileModal: document.getElementById('add-file-modal'),
    closeAddFile: document.getElementById('close-add-file'),
    selectFileBtn: document.getElementById('select-file-btn'),
    fileSelectInput: document.getElementById('file-select-input'),
    selectedFileName: document.getElementById('selected-file-name'),
    selectedFileInfo: document.getElementById('selected-file-info'),
    newFileFullpath: document.getElementById('new-file-fullpath'),
    newFileType: document.getElementById('new-file-type'),
    newFileCodec: document.getElementById('new-file-codec'),
    newFileResolution: document.getElementById('new-file-resolution'),
    newFileDuration: document.getElementById('new-file-duration'),
    newFileMemo: document.getElementById('new-file-memo'),
    confirmAddFile: document.getElementById('confirm-add-file'),
    cancelAddFile: document.getElementById('cancel-add-file'),

    // 目录扫描相关
    scanDirModal: document.getElementById('scan-dir-modal'),
    closeScanDir: document.getElementById('close-scan-dir'),
    scanPathInput: document.getElementById('scan-path-input'),
    selectScanPathBtn: document.getElementById('select-scan-path-btn'),
    scanCategorySelect: document.getElementById('scan-category-select'),
    confirmScanDir: document.getElementById('confirm-scan-dir'),
    cancelScanDir: document.getElementById('cancel-scan-dir'),

    // 扫描结果相关
    scanResultModal: document.getElementById('scan-result-modal'),
    closeScanResult: document.getElementById('close-scan-result'),
    scanResultInfo: document.getElementById('scan-result-info'),
    scanResultImport: document.getElementById('scan-result-import'),
    scanResultCancel: document.getElementById('scan-result-cancel'),
    scanMoviesList: document.getElementById('scan-movies-list'),

    // 单个电影编辑相关
    scanMovieEditModal: document.getElementById('scan-movie-edit-modal'),
    closeScanMovieEdit: document.getElementById('close-scan-movie-edit'),
    scanMovieTempPath: document.getElementById('scan-movie-temp-path'),
    scanMovieId: document.getElementById('scan-movie-id'),
    scanMovieName: document.getElementById('scan-movie-name'),
    scanMoviePublishDate: document.getElementById('scan-movie-publish-date'),
    scanMovieDirector: document.getElementById('scan-movie-director'),
    scanMovieActors: document.getElementById('scan-movie-actors'),
    scanMoviePublisher: document.getElementById('scan-movie-publisher'),
    scanMovieRuntime: document.getElementById('scan-movie-runtime'),
    scanMovieDescription: document.getElementById('scan-movie-description'),
    scanSelectCoverBtn: document.getElementById('scan-select-cover-btn'),
    scanMovieCoverInput: document.getElementById('scan-movie-cover-input'),
    scanCoverPreview: document.getElementById('scan-cover-preview'),

    // 扫描电影标签相关
    scanMovieTags: document.getElementById('scan-movie-tags'),
    scanTagSelectorModal: document.getElementById('scan-tag-selector-modal'),
    closeScanTagSelector: document.getElementById('close-scan-tag-selector'),
    scanTagSelectorList: document.getElementById('scan-tag-selector-list'),
    confirmScanTagSelection: document.getElementById('confirm-scan-tag-selection'),
    cancelScanTagSelection: document.getElementById('cancel-scan-tag-selection'),

    // 刷新进度相关
    refreshProgressModal: document.getElementById('refresh-progress-modal'),
    refreshProgressText: document.getElementById('refresh-progress-text'),
    refreshProgressBar: document.getElementById('refresh-progress-bar'),    

    confirmScanMovieEdit: document.getElementById('confirm-scan-movie-edit'),
    cancelScanMovieEdit: document.getElementById('cancel-scan-movie-edit')
    
};

/**
 * 初始化应用
 */
async function init() {
    console.log('Initializing app...');

    // 加载设置
    await loadSettings();

    // 加载标签
    await loadTags();

    // 加载演员列表
    await loadActors();

    // 加载分类列表
    await loadCategories();

    // 加载盒子列表
    await loadBoxes();

    // 加载电影
    await loadMovies();

    // 绑定事件
    bindEvents();

    // 初始化目录扫描事件
    initScanDirEvents();

    // 初始化分隔线拖动
    initSplitter();

    // 加载统计数据
    await loadStats();

    console.log('App initialized');
}

/**
 * 初始化分隔线拖动功能
 */
function initSplitter() {
    const splitter = document.getElementById('main-splitter');
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('movie-wall');

    if (!splitter || !sidebar || !mainContent) {
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
 * 加载标签缓存
 */
async function loadTags() {
    try {
        const tags = await window.electronAPI.getTags();
        if (Array.isArray(tags)) {
            state.tags = tags;
            updateTagFilter();
        }
    } catch (error) {
        console.error('Error loading tags:', error);
    }
}

/**
 * 更新标签筛选下拉框
 */
function updateTagFilter() {
    elements.tagFilter.innerHTML = '<option value="">全部标签</option>';
    state.tags.forEach(tag => {
        const option = document.createElement('option');
        option.value = tag.id;
        option.textContent = tag.name;
        elements.tagFilter.appendChild(option);
    });
}

/**
 * 打开演员过滤模态窗
 */
async function openActorFilterModal() {
    state.actorFilterModalVisible = true;
    state.actorFilterSearchKeyword = '';
    elements.actorFilterSearchInput.value = '';
    elements.actorRatingFilter.value = '';
    elements.actorFavoriteFilter.checked = false;
    // 重新加载演员数据
    await loadActors();
    // 使用之前选中的演员作为当前选中状态
    state.tempSelectedActors = [...state.currentActorFilter];
    renderActorFilterList();
    elements.actorFilterModal.style.display = 'flex';
}

/**
 * 关闭演员过滤模态窗
 */
function closeActorFilterModal() {
    state.actorFilterModalVisible = false;
    elements.actorFilterModal.style.display = 'none';
}

/**
 * 确认演员过滤选择
 */
function confirmActorFilter() {
    state.currentActorFilter = [...state.tempSelectedActors];
    updateActorFilterDisplay();
    closeActorFilterModal();
    loadMovies();
}

/**
 * 取消演员过滤选择，重置为"全部演员"
 */
function cancelActorFilter() {
    state.currentActorFilter = [];
    updateActorFilterDisplay();
    closeActorFilterModal();
    loadMovies();
}

/**
 * 切换演员选中状态
 */
function toggleActorSelection(actorName) {
    const index = state.tempSelectedActors.indexOf(actorName);
    if (index === -1) {
        state.tempSelectedActors.push(actorName);
    } else {
        state.tempSelectedActors.splice(index, 1);
    }
    // 更新卡片选中状态
    const card = document.querySelector(`.actor-filter-card[data-name="${CSS.escape(actorName)}"]`);
    if (card) {
        card.classList.toggle('selected', state.tempSelectedActors.includes(actorName));
        const checkbox = card.querySelector('.card-checkbox');
        checkbox.classList.toggle('checked', state.tempSelectedActors.includes(actorName));
    }
}

/**
 * 渲染演员过滤列表
 */
function renderActorFilterList() {
    const ratingFilter = elements.actorRatingFilter.value ? parseInt(elements.actorRatingFilter.value, 10) : null;
    const favoriteFilter = elements.actorFavoriteFilter.checked;
    const searchKeyword = state.actorFilterSearchKeyword || '';

    // 过滤演员
    let filteredActors = state.actors.filter(actor => {
        // 评分过滤
        if (ratingFilter !== null && actor.rating !== ratingFilter) {
            return false;
        }
        // 收藏过滤
        if (favoriteFilter && !actor.favorites) {
            return false;
        }
        // 搜索过滤
        if (searchKeyword) {
            const keyword = searchKeyword.toLowerCase();
            const nameMatch = actor.name && actor.name.toLowerCase().includes(keyword);
            const nicknameMatch = actor.nickname && actor.nickname.toLowerCase().includes(keyword);
            const birthdayMatch = actor.birthday && actor.birthday.includes(keyword);
            if (!nameMatch && !nicknameMatch && !birthdayMatch) {
                return false;
            }
        }
        return true;
    });

    // 按姓名排序
    filteredActors.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    // 渲染卡片
    if (filteredActors.length === 0) {
        elements.actorFilterList.innerHTML = '<div class="actor-filter-empty">暂无演员</div>';
        return;
    }

    elements.actorFilterList.innerHTML = filteredActors.map(actor => {
        const isSelected = state.tempSelectedActors.includes(actor.name);
        const ratingStars = actor.rating ? '⭐'.repeat(actor.rating) : '';
        const photoHtml = actor.photo
            ? `<img src="file://${actor.photo}" alt="${escapeHtml(actor.name)}">`
            : `<div class="card-placeholder">${escapeHtml(actor.name ? actor.name.charAt(0) : '?')}</div>`;
        const favoriteClass = actor.favorites ? 'favorited' : '';

        return `
            <div class="actor-filter-card ${isSelected ? 'selected' : ''}" data-name="${escapeHtml(actor.name)}">
                <div class="card-checkbox ${isSelected ? 'checked' : ''}" data-actor-name="${escapeHtml(actor.name)}"></div>
                <span class="card-favorite ${favoriteClass}" data-actor-favorite="${escapeHtml(actor.name)}">${actor.favorites ? '❤' : '♡'}</span>
                <div class="card-photo">${photoHtml}</div>
                ${ratingStars ? `<div class="card-rating">${ratingStars}</div>` : ''}
                <div class="card-info">
                    <div class="card-name">${escapeHtml(actor.name)}</div>
                    <div class="card-birthday">${formatBirthday(actor.birthday)}</div>
                </div>
            </div>
        `;
    }).join('');

    // 绑定卡片点击事件
    elements.actorFilterList.querySelectorAll('.actor-filter-card').forEach(card => {
        card.addEventListener('click', () => {
            const actorName = card.dataset.name;
            toggleActorSelection(actorName);
        });
    });

    // 绑定复选框点击事件（阻止冒泡）
    elements.actorFilterList.querySelectorAll('.card-checkbox').forEach(checkbox => {
        checkbox.addEventListener('click', (e) => {
            e.stopPropagation();
            const actorName = checkbox.dataset.actorName;
            toggleActorSelection(actorName);
        });
    });

    // 绑定收藏按钮点击事件（阻止冒泡）
    elements.actorFilterList.querySelectorAll('.card-favorite').forEach(favoriteBtn => {
        favoriteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const actorName = favoriteBtn.dataset.actorFavorite;
            toggleActorFavorite(actorName);
        });
    });
}

/**
 * 切换演员收藏状态（在模态窗中快速收藏）
 */
async function toggleActorFavorite(actorName) {
    const actor = state.actors.find(a => a.name === actorName);
    if (!actor) return;

    try {
        const result = await window.electronAPI.updateActor({
            oldName: actor.name,
            newActor: {
                name: actor.name,
                rating: actor.rating,
                favorites: !actor.favorites
            }
        });

        if (result.error) {
            console.error('Error updating actor favorite:', result.error);
            return;
        }

        // 更新本地状态
        actor.favorites = !actor.favorites;

        // 更新卡片显示
        const card = document.querySelector(`.actor-filter-card[data-name="${CSS.escape(actorName)}"]`);
        if (card) {
            const favoriteBtn = card.querySelector('.card-favorite');
            favoriteBtn.classList.toggle('favorited', actor.favorites);
            favoriteBtn.textContent = actor.favorites ? '❤' : '♡';
        }
    } catch (error) {
        console.error('Error toggling actor favorite:', error);
    }
}

/**
 * 更新演员过滤下拉框显示
 */
function updateActorFilterDisplay() {
    const count = state.currentActorFilter.length;
    if (count === 0) {
        // 重置为默认选项（全部演员）
        elements.actorFilter.innerHTML = `
            <option value="">全部演员</option>
            <option value="select">选择演员</option>
        `;
        elements.actorFilter.value = '';
    } else {
        // 设置显示为"选择演员(N)"
        elements.actorFilter.innerHTML = `
            <option value="">全部演员</option>
            <option value="select" selected>选择演员(${count})</option>
        `;
    }
}

/**
 * 更新演员过滤搜索清除按钮可见性
 */
function updateActorFilterClearButton() {
    if (state.actorFilterSearchKeyword) {
        elements.actorFilterClearBtn.style.display = 'block';
    } else {
        elements.actorFilterClearBtn.style.display = 'none';
    }
}

/**
 * 格式化生日显示
 */
function formatBirthday(birthday) {
    if (!birthday) return '';
    const date = new Date(birthday);
    return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
}

/**
 * 加载设置
 */
async function loadSettings() {
    try {
        state.settings = await window.electronAPI.getSettings();

        // 应用主题
        applyTheme(state.settings.appearance.theme);

        // 应用布局设置
        applyLayoutSettings(state.settings.layout);

        // 更新设置表单
        if (elements.themeSelect) elements.themeSelect.value = state.settings.appearance?.theme || 'dark';
        if (elements.sidebarWidth) elements.sidebarWidth.value = state.settings.layout?.sidebarWidth || 200;
        if (elements.posterSize) elements.posterSize.value = state.settings.layout?.posterSize || 'medium';
        if (elements.moviesDirInput) elements.moviesDirInput.value = state.settings.library?.moviesDir || '';
        if (elements.movieboxDirInput) elements.movieboxDirInput.value = state.settings.moviebox?.movieboxDir || '';
        if (elements.actorPhotoDirInput) elements.actorPhotoDirInput.value = state.settings.library?.actorPhotoDir || '';

        state.viewMode = state.settings.layout.viewMode;
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

/**
 * 显示Toast提示
 */
function showToast(message, duration = 3000) {
    // 检查是否已存在toast容器
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.style.cssText = 'position: fixed; top: 20px; left: 50%; transform: translateX(-50%); z-index: 10000; pointer-events: none;';
        document.body.appendChild(toastContainer);
    }

    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = 'background: rgba(0, 0, 0, 0.85); color: white; padding: 12px 24px; border-radius: 8px; margin-bottom: 8px; font-size: 14px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); pointer-events: none;';
    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, duration);
}

/**
 * 应用布局设置
 */
function applyLayoutSettings(layout) {
    document.documentElement.style.setProperty('--sidebar-width', `${layout.sidebarWidth}px`);
    document.documentElement.style.setProperty('--poster-min-width', getPosterMinSize(layout.posterSize));
    document.documentElement.style.setProperty('--poster-max-width', getPosterMaxSize(layout.posterSize));

    // 使用 CSS Grid 的自动填充实现响应式布局
    // 不再使用固定列数，让浏览器根据窗口大小自动计算

    if (layout.viewMode === 'list') {
        elements.moviesGrid.classList.add('list-view');
    } else {
        elements.moviesGrid.classList.remove('list-view');
    }
}

/**
 * 获取海报尺寸
 */
function getPosterSize(size) {
    const sizes = {
        small: '120px',
        medium: '180px',
        large: '240px'
    };
    return sizes[size] || sizes.medium;
}

/**
 * 获取海报最小尺寸（用于自动响应式计算）
 */
function getPosterMinSize(size) {
    const sizes = {
        small: '100px',
        medium: '140px',
        large: '180px'
    };
    return sizes[size] || sizes.medium;
}

/**
 * 获取海报最大尺寸
 */
function getPosterMaxSize(size) {
    const sizes = {
        small: '150px',
        medium: '220px',
        large: '280px'
    };
    return sizes[size] || sizes.medium;
}

/**
 * 加载分类列表
 */
async function loadCategories() {
    try {
        const categories = await window.electronAPI.getCategories();

        if (categories.error) {
            console.error('Error loading categories:', categories.error);
            return;
        }

        state.categories = categories;

        // 更新筛选下拉框
        updateCategoryFilter(categories);

        // 更新侧边栏
        renderSidebar(categories);
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

/**
 * 更新分类筛选下拉框
 */
function updateCategoryFilter(categories) {
    elements.categoryFilter.innerHTML = '<option value="">全部分类</option>';
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = `${category.name} (${category.movieCount})`;
        elements.categoryFilter.appendChild(option);
    });
}

/**
 * 更新侧边栏
 */
function renderSidebar(categories) {
    let html = `
        <li class="category-item${state.currentCategory === '' ? ' active' : ''}" data-category="">
            <span class="category-name">全部分类</span>
            <span class="movie-count">${getTotalMovieCount(categories)}</span>
        </li>
    `;

    categories.forEach(category => {
        html += `
            <li class="category-item${state.currentCategory === category.id ? ' active' : ''}" data-category="${category.id}">
                <span class="category-name">${category.name}</span>
                <span class="movie-count">${category.movieCount}</span>
            </li>
        `;
    });

    elements.categoryList.innerHTML = html;

    // 绑定点击事件
    document.querySelectorAll('.category-item').forEach(item => {
        item.addEventListener('click', () => {
            setCurrentCategory(item.dataset.category);
        });
    });
}

/**
 * 设置当前分类筛选
 * 统一处理左侧栏和下拉框的分类选择
 */
function setCurrentCategory(category) {
    // 如果有筛选条件被激活，点击分类时清除筛选条件
    if (state.currentTag) {
        state.currentTag = '';
        elements.tagFilter.value = '';
    }

    state.currentCategory = category;
    state.currentBox = ''; // 清除当前盒子

    // 更新左侧栏分类选中状态
    document.querySelectorAll('.category-item').forEach(item => {
        if (item.dataset.category === category) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });

    // 清除左侧栏盒子选中状态
    document.querySelectorAll('.box-item').forEach(i => i.classList.remove('active'));

    // 更新下拉框
    elements.categoryFilter.value = category;

    // 加载电影
    loadMovies();
}

/**
 * 获取电影总数
 */
function getTotalMovieCount(categories) {
    return categories.reduce((sum, c) => sum + c.movieCount, 0);
}

/**
 * 加载盒子列表
 */
async function loadBoxes() {
    try {
        const boxes = await window.electronAPI.getAllBoxes();
        state.boxes = boxes;
        updateBoxList(boxes);
    } catch (error) {
        console.error('Error loading boxes:', error);
    }
}

/**
 * 更新盒子列表
 */
function updateBoxList(boxes) {
    let html = '';

    boxes.forEach(box => {
        html += `
            <li class="box-item" data-box="${box.name}" data-original-name="${box.originalName || box.name}">
                <span class="box-name">${box.name}</span>
                <span class="box-count">${box.movieCount}</span>
                <div class="box-actions">
                    <button class="box-edit-btn" title="编辑" data-box="${box.originalName || box.name}">✎</button>
                    <button class="box-delete-btn" title="删除" data-box="${box.originalName || box.name}">✖</button>
                </div>
            </li>
        `;
    });

    elements.boxList.innerHTML = html;

    // 绑定盒子点击事件（打开盒子视图）
    document.querySelectorAll('.box-item').forEach(item => {
        item.addEventListener('click', (e) => {
            // 如果点击的是按钮，不处理
            if (e.target.classList.contains('box-edit-btn') || e.target.classList.contains('box-delete-btn')) {
                return;
            }

            // 清除分类选中状态
            document.querySelectorAll('.category-item').forEach(i => i.classList.remove('active'));

            // 清除之前的盒子选中状态
            document.querySelectorAll('.box-item').forEach(i => i.classList.remove('active'));

            // 设置当前盒子选中状态
            item.classList.add('active');
            state.currentBox = item.dataset.originalName || item.dataset.box;

            // 打开盒子视图（新窗口）
            openBoxView(state.currentBox);
        });
    });

    // 绑定编辑按钮点击事件
    document.querySelectorAll('.box-edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const boxOriginalName = btn.dataset.box;
            openEditBoxModal(boxOriginalName);
        });
    });

    // 绑定删除按钮点击事件
    document.querySelectorAll('.box-delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const boxOriginalName = btn.dataset.box;
            openDeleteBoxModal(boxOriginalName);
        });
    });
}

/**
 * 打开编辑盒子模态框
 */
async function openEditBoxModal(boxOriginalName) {
    try {
        const boxDetail = await window.electronAPI.getBoxDetail(boxOriginalName);
        if (boxDetail && !boxDetail.error) {
            document.getElementById('edit-box-original-name').value = boxOriginalName;
            document.getElementById('edit-box-name-input').value = boxDetail.name || boxOriginalName;
            document.getElementById('edit-box-description-input').value = boxDetail.description || '';
            elements.editBoxModal.style.display = 'flex';
        }
    } catch (error) {
        console.error('Error opening edit box modal:', error);
    }
}

/**
 * 打开删除盒子确认模态框
 */
function openDeleteBoxModal(boxName) {
    document.getElementById('delete-box-name').textContent = boxName;
    elements.deleteBoxModal.style.display = 'flex';
}

/**
 * 打开盒子视图（新窗口）
 */
async function openBoxView(boxName) {
    try {
        await window.electronAPI.openBoxWindow(boxName);
    } catch (error) {
        console.error('Error opening box view:', error);
    }
}

/**
 * 加载电影列表
 */
async function loadMovies() {
    try {
        console.log('loadMovies: searchKeyword:', state.searchKeyword, 'currentTag:', state.currentTag, 'currentActorFilter.length:', state.currentActorFilter.length, 'currentCategory:', state.currentCategory);

        // 搜索模式下使用原有的一次性加载逻辑
        if (state.searchKeyword || state.currentTag || state.currentActorFilter.length > 0) {
            // 销毁旧的懒加载器，避免滚动时继续加载未筛选的数据
            if (state.lazyLoader) {
                state.lazyLoader.destroy();
                state.lazyLoader = null;
            }
            console.log('loadMovies: calling loadMoviesAll');
            await loadMoviesAll();
            return;
        }

        // 非搜索模式使用懒加载
        // 如果之前有筛选激活过，先恢复侧边栏
        if (state.sidebarSearchActive) {
            renderSidebar(state.categories);
            state.sidebarSearchActive = false;
        }
        console.log('loadMovies: calling initLazyLoader');
        await initLazyLoader();
        state.lazyLoader.loadFirstPage();
    } catch (error) {
        console.error('Error loading movies:', error);
    }
}

/**
 * 一次性加载所有电影（用于搜索模式）
 */
async function loadMoviesAll() {
    try {
        let movies;

        // 构建筛选条件
        const filterOptions = {
            sortBy: state.currentSort.split('-')[0],
            sortOrder: state.currentSort.split('-')[1],
            tagId: state.currentTag || undefined,
            actors: state.currentActorFilter.length > 0 ? state.currentActorFilter : undefined
        };

        if (state.searchKeyword) {
            // 搜索电影
            console.log('loadMoviesAll: search path, actors:', filterOptions.actors);
            movies = await window.electronAPI.searchMovies({
                keyword: state.searchKeyword,
                filters: {
                    category: state.currentCategory,
                    sort: state.currentSort,
                    tagId: filterOptions.tagId,
                    rating: filterOptions.rating,
                    actors: filterOptions.actors
                }
            });
        } else if (state.currentCategory) {
            // 按分类加载
            console.log('loadMoviesAll: category path, actors:', filterOptions.actors);
            movies = await window.electronAPI.getMoviesByCategory({
                category: state.currentCategory,
                sortBy: filterOptions.sortBy,
                sortOrder: filterOptions.sortOrder,
                tagId: filterOptions.tagId,
                rating: filterOptions.rating,
                actors: filterOptions.actors
            });
        } else {
            // 加载所有电影
            console.log('loadMoviesAll: all movies path, actors:', filterOptions.actors);
            movies = await window.electronAPI.getAllMovies({
                sortBy: filterOptions.sortBy,
                sortOrder: filterOptions.sortOrder,
                tagId: filterOptions.tagId,
                rating: filterOptions.rating,
                actors: filterOptions.actors
            });
        }

        if (movies.error) {
            console.error('Error loading movies:', movies.error);
            return;
        }

        state.movies = movies;
        renderMovies(movies, false);

        // 检查是否有任何筛选条件激活
        const filtersActive = state.searchKeyword || state.currentTag || state.currentActorFilter.length > 0;

        // 更新侧边栏分类计数
        if (filtersActive) {
            updateSidebarWithSearchResults(movies);
            state.sidebarSearchActive = true;
        } else if (state.sidebarSearchActive) {
            // 清除筛选后恢复原始侧边栏
            renderSidebar(state.categories);
            state.sidebarSearchActive = false;
        }
    } catch (error) {
        console.error('Error loading movies all:', error);
    }
}

/**
 * 初始化懒加载管理器
 */
async function initLazyLoader() {
    // 如果已存在懒加载器，先销毁
    if (state.lazyLoader) {
        state.lazyLoader.destroy();
    }

    const filterOptions = {
        sortBy: state.currentSort.split('-')[0],
        sortOrder: state.currentSort.split('-')[1]
    };

    // 获取滚动容器（.movie-wall）
    const scrollContainer = document.getElementById('movie-wall');
    console.log('initLazyLoader: scrollContainer =', scrollContainer);

    // 创建懒加载管理器
    state.lazyLoader = new LazyLoader({
        pageSize: 100,
        scrollContainer: scrollContainer,
        loadPage: async (page, pageSize) => {
            // 根据是否有分类筛选选择API
            if (state.currentCategory) {
                return await window.electronAPI.getMoviesPaginated({
                    category: state.currentCategory,
                    page,
                    pageSize,
                    sortBy: filterOptions.sortBy,
                    sortOrder: filterOptions.sortOrder
                });
            } else {
                return await window.electronAPI.getMoviesPaginatedFromIndex({
                    page,
                    pageSize,
                    sortBy: filterOptions.sortBy,
                    sortOrder: filterOptions.sortOrder
                });
            }
        },
        onRender: (movies, isAppend) => {
            // 更新 state.movies 以支持视图切换
            if (isAppend) {
                state.movies = [...(state.movies || []), ...movies];
            } else {
                state.movies = movies;
            }
            renderMovies(movies, isAppend);
        },
        onComplete: () => {
            console.log('All movies loaded');
        },
        onError: (error) => {
            console.error('LazyLoader error:', error);
        }
    });
}

/**
 * 根据搜索结果更新侧边栏分类计数
 */
function updateSidebarWithSearchResults(movies) {
    // 按分类分组统计电影数量
    const categoryCounts = {};
    movies.forEach(movie => {
        const categoryId = movie.category;
        categoryCounts[categoryId] = (categoryCounts[categoryId] || 0) + 1;
    });

    // 构建更新后的分类列表
    const totalCount = movies.length;
    let html = `
        <li class="category-item active" data-category="">
            <span class="category-name">全部分类</span>
            <span class="movie-count">${totalCount}</span>
        </li>
    `;

    state.categories.forEach(category => {
        const count = categoryCounts[category.id] || 0;
        // 只有有电影的分类才显示
        if (count > 0) {
            html += `
                <li class="category-item" data-category="${category.id}">
                    <span class="category-name">${category.name}</span>
                    <span class="movie-count">${count}</span>
                </li>
            `;
        }
    });

    elements.categoryList.innerHTML = html;

    // 重新绑定点击事件
    document.querySelectorAll('.category-item').forEach(item => {
        item.addEventListener('click', () => {
            setCurrentCategory(item.dataset.category);
        });
    });
}

/**
 * 渲染电影列表
 * @param {Array} movies - 电影列表
 * @param {boolean} isAppend - 是否追加模式（true=追加，false=替换）
 */
function renderMovies(movies, isAppend = false) {
    if (!movies || movies.length === 0) {
        if (!isAppend) {
            elements.moviesGrid.innerHTML = '';
            elements.emptyState.style.display = 'flex';
        }
        return;
    }

    elements.emptyState.style.display = 'none';

    let html = '';

    // 非追加模式时，需要渲染表头
    if (!isAppend) {
        if (state.viewMode === 'list') {
            // 列表视图 - 表格形式
            html += `
                <div class="list-view-header">
                    <div class="movie-checkbox">
                        <input type="checkbox" id="select-all" ${state.selectedMovies.size === movies.length && movies.length > 0 ? 'checked' : ''}>
                    </div>
                    <div class="movie-icon"></div>
                    <div class="movie-id-col">电影ID</div>
                    <div class="movie-name">名称</div>
                    <div class="movie-actors-col">主演</div>
                    <div class="movie-description">描述</div>
                    <div class="movie-publish-date">上映时间</div>
                    <div class="movie-studio-col">发行商</div>
                    <div class="movie-category-info">分类</div>
                    <div class="movie-director-col">导演</div>
                    <div class="movie-files-col">文件</div>
                </div>
            `;
        }
    }

    html += movies.map(movie => {
        const isSelected = state.selectedMovies.has(movie.id);

        if (state.viewMode === 'list') {
            // 列表视图 - 表格行
            const fileCount = movie.fileCount || 0;
            return `
                <div class="movie-card ${isSelected ? 'selected' : ''}" data-movie-id="${movie.id}">
                    <div class="movie-checkbox">
                        <input type="checkbox" class="movie-select-checkbox" data-movie-id="${movie.id}" ${isSelected ? 'checked' : ''}>
                    </div>
                    <div class="movie-icon">
                        ${movie.poster ?
                            `<img src="${movie.poster}" alt="${movie.name}">` :
                            `<div class="movie-icon-placeholder">🎬</div>`
                        }
                    </div>
                    <div class="movie-id-col">
                        ${movie.id || ''}
                    </div>
                    <div class="movie-name">
                        ${movie.name}
                    </div>
                    <div class="movie-actors-col">${movie.actors || '-'}</div>
                    <div class="movie-description">${movie.description ? (movie.description.length > 30 ? movie.description.substring(0, 30) + '...' : movie.description) : '-'}</div>
                    <div class="movie-publish-date">${movie.publishDate || '-'}</div>
                    <div class="movie-studio-col">${movie.studio || '-'}</div>
                    <div class="movie-category-info">${getCategoryName(movie.category)}</div>
                    <div class="movie-director-col">${movie.director || '-'}</div>
                    <div class="movie-files-col">${fileCount > 0 ? '📁 ' + fileCount : '-'}</div>
                </div>
            `;
        } else {
            // 网格视图
            return `
                <div class="movie-card ${isSelected ? 'selected' : ''}" data-movie-id="${movie.id}">
                    <div class="movie-card-checkbox">
                        <input type="checkbox" class="movie-select-checkbox" data-movie-id="${movie.id}" ${isSelected ? 'checked' : ''}>
                    </div>
                    ${movie.poster ?
                        `<img class="movie-poster" src="${movie.poster}" alt="${movie.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                         <div class="movie-poster-placeholder" style="display:none;">🎬</div>` :
                        `<div class="movie-poster-placeholder">🎬</div>`
                    }
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

    // 绑定电影卡片点击事件（排除复选框）
    document.querySelectorAll('.movie-card').forEach(card => {
        card.addEventListener('click', (e) => {
            // 如果点击的是复选框，不打开详情
            if (e.target.type === 'checkbox') return;
            const movieId = card.dataset.movieId;
            openMovieDetail(movieId);
        });
    });

    // 绑定复选框事件
    bindCheckboxEvents(movies);
}

/**
 * 更新单个电影卡片的海报
 */
function updateMovieCard(updatedMovie) {
    if (!updatedMovie || !updatedMovie.id) return;

    // 更新 state.movies 中的对应电影数据
    const movieIndex = state.movies.findIndex(m => m.id === updatedMovie.id);
    if (movieIndex !== -1) {
        state.movies[movieIndex] = { ...state.movies[movieIndex], ...updatedMovie };
    }

    // 查找对应的电影卡片元素
    const movieCard = document.querySelector(`.movie-card[data-movie-id="${updatedMovie.id}"]`);
    if (!movieCard) return;

    // 更新网格视图中的海报图片
    const posterImg = movieCard.querySelector('.movie-poster');
    const posterPlaceholder = movieCard.querySelector('.movie-poster-placeholder');

    if (updatedMovie.poster) {
        // 添加时间戳强制刷新缓存
        const posterUrl = updatedMovie.poster + (updatedMovie.poster.includes('?') ? '&' : '?') + 't=' + Date.now();
        if (posterImg) {
            posterImg.src = posterUrl;
            posterImg.style.display = 'block';
            posterImg.onerror = function() {
                this.style.display = 'none';
                if (posterPlaceholder) posterPlaceholder.style.display = 'flex';
            };
        }
        if (posterPlaceholder) {
            posterPlaceholder.style.display = 'none';
        }
    } else {
        if (posterImg) posterImg.style.display = 'none';
        if (posterPlaceholder) posterPlaceholder.style.display = 'flex';
    }

    // 更新列表视图中的图标
    const movieIconImg = movieCard.querySelector('.movie-icon img');
    const movieIconPlaceholder = movieCard.querySelector('.movie-icon-placeholder');

    if (updatedMovie.poster) {
        const posterUrl = updatedMovie.poster + (updatedMovie.poster.includes('?') ? '&' : '?') + 't=' + Date.now();
        if (movieIconImg) {
            movieIconImg.src = posterUrl;
            movieIconImg.style.display = 'block';
        }
        if (movieIconPlaceholder) {
            movieIconPlaceholder.style.display = 'none';
        }
    } else {
        if (movieIconImg) movieIconImg.style.display = 'none';
        if (movieIconPlaceholder) movieIconPlaceholder.style.display = 'flex';
    }
}

/**
 * 绑定复选框事件
 */
function bindCheckboxEvents(movies) {
    // 全选复选框
    const selectAllCheckbox = document.getElementById('select-all');
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                movies.forEach(movie => state.selectedMovies.add(movie.id));
            } else {
                state.selectedMovies.clear();
            }
            renderMovies(movies);
            updateBatchAddButtonVisibility();
            updateBatchDeleteButtonVisibility();
        });
    }

    // 单个复选框
    document.querySelectorAll('.movie-select-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const movieId = checkbox.dataset.movieId;
            if (checkbox.checked) {
                state.selectedMovies.add(movieId);
            } else {
                state.selectedMovies.delete(movieId);
            }

            // 更新卡片选中状态
            const card = checkbox.closest('.movie-card');
            if (checkbox.checked) {
                card.classList.add('selected');
            } else {
                card.classList.remove('selected');
            }

            // 更新全选复选框状态
            const selectAll = document.getElementById('select-all');
            if (selectAll) {
                selectAll.checked = state.selectedMovies.size === movies.length && movies.length > 0;
            }

            // 更新批量添加按钮可见性
            updateBatchAddButtonVisibility();
            updateBatchDeleteButtonVisibility();
        });
    });

    // 列表视图中的行点击可选中（点击复选框不触发）
    document.querySelectorAll('.movies-grid.list-view .movie-card').forEach(card => {
        card.addEventListener('click', (e) => {
            // 如果点击的是复选框，不处理
            if (e.target.type === 'checkbox') return;

            const movieId = card.dataset.movieId;
            if (state.selectedMovies.has(movieId)) {
                state.selectedMovies.delete(movieId);
                card.classList.remove('selected');
            } else {
                state.selectedMovies.add(movieId);
                card.classList.add('selected');
            }

            // 更新复选框状态
            const checkbox = card.querySelector('.movie-select-checkbox');
            if (checkbox) {
                checkbox.checked = state.selectedMovies.has(movieId);
            }

            // 更新全选复选框状态
            const selectAll = document.getElementById('select-all');
            if (selectAll) {
                selectAll.checked = state.selectedMovies.size === movies.length && movies.length > 0;
            }

            // 更新批量添加按钮可见性
            updateBatchAddButtonVisibility();
            updateBatchDeleteButtonVisibility();
        });
    });
}

/**
 * 更新批量添加按钮可见性
 */
function updateBatchAddButtonVisibility() {
    if (state.selectedMovies.size > 0) {
        elements.batchAddBtn.style.display = 'block';
        elements.batchAddBtn.textContent = `批量添加 (${state.selectedMovies.size})`;
    } else {
        elements.batchAddBtn.style.display = 'none';
    }
}

/**
 * 更新批量删除按钮可见性
 */
function updateBatchDeleteButtonVisibility() {
    if (state.selectedMovies.size > 0) {
        elements.batchDeleteBtn.style.display = 'block';
        elements.batchDeleteBtn.textContent = `批量删除 (${state.selectedMovies.size})`;
    } else {
        elements.batchDeleteBtn.style.display = 'none';
    }
}

/**
 * 获取分类名称
 */
function getCategoryName(categoryId) {
    const category = state.categories.find(c => c.id === categoryId);
    return category ? category.shortName : categoryId;
}

/**
 * 打开电影详情
 */
async function openMovieDetail(movieId) {
    // 检查详情窗口是否处于编辑模式，锁定状态下禁止点击
    if (state.detailEditModeLocked) {
        return;
    }
    try {
        // 获取完整的电影详情数据（包含NFO中的所有字段）
        const movie = await window.electronAPI.getMovieDetail(movieId);
        if (movie && !movie.error) {
            await window.electronAPI.openMovieDetail(movie);
        }
    } catch (error) {
        console.error('Error opening movie detail:', error);
    }
}

/**
 * 加载统计数据
 */
async function loadStats() {
    try {
        const stats = await window.electronAPI.getMovieStats();

        if (stats.error) {
            console.error('Error loading stats:', stats.error);
            return;
        }

        elements.statsBar.total.textContent = `电影总数：${stats.totalMovies || 0}`;
        elements.statsBar.actor.textContent = `演员总数：${stats.totalActorCount || 0}`;
        elements.statsBar.category.textContent = `分类总数：${stats.totalCategoryCount || 0}`;
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

/**
 * 绑定事件
 */
function bindEvents() {
    // 分类筛选
    elements.categoryFilter.addEventListener('change', (e) => {
        setCurrentCategory(e.target.value);
    });

    // 排序
    elements.sortSelect.addEventListener('change', (e) => {
        state.currentSort = e.target.value;
        loadMovies();
    });

    // 标签筛选
    elements.tagFilter.addEventListener('change', (e) => {
        state.currentTag = e.target.value;
        loadMovies();
    });

    // 演员筛选
    elements.actorFilter.addEventListener('change', (e) => {
        const value = e.target.value;
        if (value === '') {
            // 选择"全部演员"，清除筛选
            state.currentActorFilter = [];
            // 恢复下拉框完整选项
            elements.actorFilter.innerHTML = `
                <option value="" selected>全部演员</option>
                <option value="select">选择演员</option>
            `;
            loadMovies();
        } else if (value === 'select') {
            // 选择"选择演员"，打开模态窗
            openActorFilterModal();
        }
    });

    // 演员过滤模态窗关闭
    elements.closeActorFilter.addEventListener('click', closeActorFilterModal);
    elements.cancelActorFilter.addEventListener('click', cancelActorFilter);
    elements.actorFilterModal.addEventListener('click', (e) => {
        if (e.target === elements.actorFilterModal) {
            cancelActorFilter();
        }
    });

    // 演员过滤模态窗确认
    elements.confirmActorFilter.addEventListener('click', confirmActorFilter);

    // 演员过滤评分筛选
    elements.actorRatingFilter.addEventListener('change', renderActorFilterList);

    // 演员过滤收藏筛选
    elements.actorFavoriteFilter.addEventListener('change', renderActorFilterList);

    // 演员过滤搜索
    elements.actorFilterSearchBtn.addEventListener('click', () => {
        const keyword = elements.actorFilterSearchInput.value.trim();
        state.actorFilterSearchKeyword = keyword;
        updateActorFilterClearButton();
        renderActorFilterList();
    });

    elements.actorFilterSearchInput.addEventListener('input', () => {
        const keyword = elements.actorFilterSearchInput.value.trim();
        state.actorFilterSearchKeyword = keyword;
        updateActorFilterClearButton();
        renderActorFilterList();
    });

    elements.actorFilterSearchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const keyword = e.target.value.trim();
            state.actorFilterSearchKeyword = keyword;
            updateActorFilterClearButton();
            renderActorFilterList();
        }
    });

    // 清除演员过滤搜索
    elements.actorFilterClearBtn.addEventListener('click', () => {
        elements.actorFilterSearchInput.value = '';
        state.actorFilterSearchKeyword = '';
        updateActorFilterClearButton();
        renderActorFilterList();
    });

    // 统计栏点击事件
    elements.statsBar.actor.addEventListener('click', () => {
        window.electronAPI.openActorManagement();
    });

    elements.statsBar.category.addEventListener('click', () => {
        window.electronAPI.openCategoryManagement();
    });

    // 搜索
    elements.searchBtn.addEventListener('click', () => {
        state.searchKeyword = elements.searchInput.value.trim();
        loadMovies();
        updateClearButtonVisibility();
    });

    elements.searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            state.searchKeyword = e.target.value.trim();
            loadMovies();
            updateClearButtonVisibility();
        }
    });

    // 清除搜索
    elements.clearSearchBtn.addEventListener('click', () => {
        elements.searchInput.value = '';
        state.searchKeyword = '';
        loadMovies();
        updateClearButtonVisibility();
    });

    // 更新清除按钮可见性
    function updateClearButtonVisibility() {
        if (state.searchKeyword) {
            elements.clearSearchBtn.style.display = 'block';
        } else {
            elements.clearSearchBtn.style.display = 'none';
        }
    }

    // 视图切换
    elements.viewToggle.addEventListener('click', () => {
        state.viewMode = state.viewMode === 'grid' ? 'list' : 'grid';
        elements.moviesGrid.classList.toggle('list-view');
        // 视图切换时完整重新渲染，保留懒加载器以便继续加载
        renderMovies(state.movies, false);
    });

    // 清除所有筛选条件
    function clearAllFilters() {
        // 清除状态变量
        state.searchKeyword = '';
        state.currentTag = '';
        state.currentCategory = '';

        // 清除UI元素
        elements.searchInput.value = '';
        elements.tagFilter.value = '';
        elements.categoryFilter.value = '';
        elements.clearSearchBtn.style.display = 'none';

        // 更新左侧栏分类选中状态为"全部分类"
        document.querySelectorAll('.category-item').forEach(item => {
            if (item.dataset.category === '') {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        // 清除左侧栏盒子选中状态
        document.querySelectorAll('.box-item').forEach(i => i.classList.remove('active'));
    }

     // 刷新电影库（带进度弹窗）
    async function refreshLibraryWithProgress() {
        // 显示进度弹窗
        elements.refreshProgressModal.style.display = 'flex';
        elements.refreshProgressText.textContent = '正在重建索引...';
        elements.refreshProgressBar.style.width = '0%';

        // 监听进度更新
        window.electronAPI.onRefreshLibraryProgress(({ current, total, movieName }) => {
            const percent = total > 0 ? Math.round((current / total) * 100) : 0;
            elements.refreshProgressText.textContent = `正在重建索引，总计${total}个电影，当前第${current}个电影`;
            elements.refreshProgressBar.style.width = percent + '%';
        });

        try {
            await window.electronAPI.refreshMovieLibrary();
        } catch (error) {
            console.error('Error refreshing movie library:', error);
        }

        // 关闭进度弹窗
        elements.refreshProgressModal.style.display = 'none';

        // 刷新界面数据
        clearAllFilters();
        await loadCategories();
        await loadMovies();
        await loadStats();
    }

    // 刷新电影库按钮
    elements.refreshBtn.addEventListener('click', () => {
        refreshLibraryWithProgress();
    });

    // 设置按钮
    elements.settingsBtn.addEventListener('click', () => {
        elements.settingsModal.style.display = 'flex';
    });

    // 关闭设置
    elements.closeSettings.addEventListener('click', () => {
        elements.settingsModal.style.display = 'none';
    });

    elements.cancelSettings.addEventListener('click', () => {
        elements.settingsModal.style.display = 'none';
    });

    // 保存设置
    elements.saveSettings.addEventListener('click', saveSettingsHandler);

    // 选择目录
    elements.selectDirBtn.addEventListener('click', async () => {
        const result = await window.electronAPI.selectDirectory();
        if (!result.canceled && result.path) {
            elements.moviesDirInput.value = result.path;
        }
    });

    // 选择电影盒子目录
    elements.selectMovieboxDirBtn.addEventListener('click', async () => {
        const result = await window.electronAPI.selectDirectory();
        if (!result.canceled && result.path) {
            elements.movieboxDirInput.value = result.path;
        }
    });

    // 选择演员照片目录
    elements.selectActorPhotoDirBtn.addEventListener('click', async () => {
        const result = await window.electronAPI.selectDirectory();
        if (!result.canceled && result.path) {
            elements.actorPhotoDirInput.value = result.path;
        }
    });

    // 监听刷新事件
    window.electronAPI.onRefreshLibrary(() => {
        refreshLibraryWithProgress();

    });

    // 监听电影更新事件（海报更新等）
    window.electronAPI.onMovieUpdated((updatedMovie) => {
        updateMovieCard(updatedMovie);
    });

    // 监听详情窗口编辑模式变化（锁定/解锁电影卡片点击）
    window.electronAPI.onDetailEditModeChanged((isEditing) => {
        state.detailEditModeLocked = isEditing;
    });

    // 监听盒子更新事件
    window.electronAPI.onBoxUpdated(() => {
        loadBoxes();
    });

    // 监听设置事件
    window.electronAPI.onOpenSettings(() => {
        elements.settingsModal.style.display = 'flex';
    });

    // 监听添加电影事件
    window.electronAPI.onOpenAddMovie(() => {
        // 如果模态框正在显示，先隐藏它以重置状态
        if (elements.addMovieModal.style.display === 'flex') {
            elements.addMovieModal.style.display = 'none';
        }
        // 清除当前焦点状态，防止之前的焦点状态干扰
        if (document.activeElement) {
            document.activeElement.blur();
        }
        resetAddMovieForm();
        populateCategorySelect();
        populateTagsSelect();
        elements.addMovieModal.style.display = 'flex';
        // 使用 requestAnimationFrame 确保在下一帧设置焦点，此时模态框已完全显示
        requestAnimationFrame(() => {
            // 重新获取元素引用确保是最新的
            const movieNameInput = document.getElementById('movie-name');
            if (movieNameInput) {
                movieNameInput.focus();
            }
        });
        // 作为保底方案，50ms 后再次尝试设置焦点
        setTimeout(() => {
            const movieNameInput = document.getElementById('movie-name');
            if (movieNameInput && document.activeElement !== movieNameInput) {
                movieNameInput.focus();
            }
        }, 50);
    });

    // 监听主题变化
    window.electronAPI.onThemeChanged((theme) => {
        applyTheme(theme);
    });

    // 点击模态框外部关闭
    elements.settingsModal.addEventListener('click', (e) => {
        if (e.target === elements.settingsModal) {
            elements.settingsModal.style.display = 'none';
        }
    });

    // 创建盒子按钮
    elements.addBoxBtn.addEventListener('click', () => {
        elements.boxNameInput.value = '';
        elements.createBoxModal.style.display = 'flex';
        elements.boxNameInput.focus();
    });

    // 确认创建盒子
    elements.confirmCreateBox.addEventListener('click', async () => {
        const boxName = elements.boxNameInput.value.trim();
        const description = elements.boxDescriptionInput.value.trim();

        if (!boxName) {
            alert('请输入盒子名称');
            return;
        }

        try {
            const result = await window.electronAPI.createBox({ boxName, description });

            if (!result.error) {
                elements.createBoxModal.style.display = 'none';
                elements.boxNameInput.value = '';
                elements.boxDescriptionInput.value = '';
                await loadBoxes();
            } else {
                alert('创建失败: ' + result.error);
            }
        } catch (error) {
            console.error('Error creating box:', error);
            alert('创建失败: ' + error.message);
        }
    });

    // 取消创建盒子
    elements.cancelCreateBox.addEventListener('click', () => {
        elements.createBoxModal.style.display = 'none';
    });

    // 关闭创建盒子模态框
    elements.closeCreateBox.addEventListener('click', () => {
        elements.createBoxModal.style.display = 'none';
    });

    // 点击模态框外部关闭
    elements.createBoxModal.addEventListener('click', (e) => {
        if (e.target === elements.createBoxModal) {
            elements.createBoxModal.style.display = 'none';
        }
    });

    // ==================== 编辑盒子相关事件 ====================

    // 确认编辑盒子
    elements.confirmEditBox.addEventListener('click', async () => {
        const originalName = elements.editBoxOriginalName.value;
        const newName = elements.editBoxNameInput.value.trim();
        const description = elements.editBoxDescriptionInput.value.trim();

        if (!newName) {
            alert('请输入盒子名称');
            return;
        }

        try {
            const result = await window.electronAPI.updateBox({ boxName: originalName, newName, description });

            if (!result.error) {
                elements.editBoxModal.style.display = 'none';
                await loadBoxes();
            } else {
                alert('编辑失败: ' + result.error);
            }
        } catch (error) {
            console.error('Error editing box:', error);
            alert('编辑失败: ' + error.message);
        }
    });

    // 取消编辑盒子
    elements.cancelEditBox.addEventListener('click', () => {
        elements.editBoxModal.style.display = 'none';
    });

    // 关闭编辑盒子模态框
    elements.closeEditBox.addEventListener('click', () => {
        elements.editBoxModal.style.display = 'none';
    });

    // 点击编辑模态框外部关闭
    elements.editBoxModal.addEventListener('click', (e) => {
        if (e.target === elements.editBoxModal) {
            elements.editBoxModal.style.display = 'none';
        }
    });

    // ==================== 删除盒子相关事件 ====================

    // 确认删除盒子
    elements.confirmDeleteBox.addEventListener('click', async () => {
        const deleteBoxName = document.getElementById('delete-box-name').textContent;

        try {
            const result = await window.electronAPI.deleteBox(deleteBoxName);

            if (!result.error) {
                elements.deleteBoxModal.style.display = 'none';
                await loadBoxes();
            } else {
                alert('删除失败: ' + result.error);
            }
        } catch (error) {
            console.error('Error deleting box:', error);
            alert('删除失败: ' + error.message);
        }
    });

    // 取消删除盒子
    elements.cancelDeleteBox.addEventListener('click', () => {
        elements.deleteBoxModal.style.display = 'none';
    });

    // 关闭删除盒子模态框
    elements.closeDeleteBox.addEventListener('click', () => {
        elements.deleteBoxModal.style.display = 'none';
    });

    // 点击删除模态框外部关闭
    elements.deleteBoxModal.addEventListener('click', (e) => {
        if (e.target === elements.deleteBoxModal) {
            elements.deleteBoxModal.style.display = 'none';
        }
    });

    // ==================== 批量添加相关事件 ====================

    // 批量添加按钮
    elements.batchAddBtn.addEventListener('click', async () => {
        if (state.selectedMovies.size === 0) {
            alert('请先选择要添加的电影');
            return;
        }

        // 获取所有盒子
        const boxes = await window.electronAPI.getAllBoxes();

        if (!boxes || boxes.length === 0) {
            alert('请先创建电影盒子');
            return;
        }

        // 填充盒子选择下拉框
        elements.batchBoxSelect.innerHTML = '<option value="">选择电影盒子...</option>';
        boxes.forEach(box => {
            const option = document.createElement('option');
            option.value = box.name;
            option.textContent = `${box.name} (${box.movieCount}部电影)`;
            elements.batchBoxSelect.appendChild(option);
        });

        // 显示已选电影数量
        elements.batchAddInfo.textContent = `已选择 ${state.selectedMovies.size} 部电影`;

        // 显示模态框
        elements.batchAddModal.style.display = 'flex';
    });

    // 确认批量添加
    elements.confirmBatchAdd.addEventListener('click', async () => {
        const boxName = elements.batchBoxSelect.value;

        if (!boxName) {
            alert('请选择电影盒子');
            return;
        }

        try {
            let addedCount = 0;
            const selectedMovieIds = Array.from(state.selectedMovies);

            for (const movieId of selectedMovieIds) {
                const movie = state.movies.find(m => m.id === movieId);
                if (movie) {
                    const result = await window.electronAPI.addMovieToBox({
                        boxName: boxName,
                        category: movie.category,
                        movieInfo: {
                            id: movie.id,
                            status: 'unwatched',
                            firstWatched: '',
                            lastWatched: '',
                            totalWatchTime: 0,
                            watchCount: 0
                        }
                    });

                    if (!result.error) {
                        addedCount++;
                    }
                }
            }

            alert(`已经添加${addedCount}个到${boxName}`);

            // 关闭模态框
            elements.batchAddModal.style.display = 'none';

            // 清空选择
            state.selectedMovies.clear();
            updateBatchAddButtonVisibility();
            updateBatchDeleteButtonVisibility();
            await loadMovies();
        } catch (error) {
            console.error('Error batch adding to box:', error);
            alert('添加失败: ' + error.message);
        }
    });

    // 取消批量添加
    elements.cancelBatchAdd.addEventListener('click', () => {
        elements.batchAddModal.style.display = 'none';
    });

    // 关闭批量添加模态框
    elements.closeBatchAdd.addEventListener('click', () => {
        elements.batchAddModal.style.display = 'none';
    });

    // 点击模态框外部关闭
    elements.batchAddModal.addEventListener('click', (e) => {
        if (e.target === elements.batchAddModal) {
            elements.batchAddModal.style.display = 'none';
        }
    });

    // ==================== 批量删除相关事件 ====================

    // 批量删除按钮点击
    elements.batchDeleteBtn.addEventListener('click', async () => {
        if (state.selectedMovies.size === 0) {
            alert('请先选择要删除的电影');
            return;
        }

        const selectedCount = state.selectedMovies.size;
        const confirmed = confirm(`是否删除 ${selectedCount} 个电影？`);

        if (!confirmed) {
            return;
        }

        try {
            // 获取所有盒子信息
            const boxes = await window.electronAPI.getAllBoxes();
            const selectedMovieIds = Array.from(state.selectedMovies);

            // 先从所有盒子中移除这些电影
            for (const movieId of selectedMovieIds) {
                const movie = state.movies.find(m => m.id === movieId);
                if (!movie) continue;

                // 从所有盒子中移除该电影
                for (const box of boxes) {
                    const boxDetail = await window.electronAPI.getBoxDetail(box.name);
                    if (boxDetail && boxDetail.data && boxDetail.data[movie.category]) {
                        const movieInBox = boxDetail.data[movie.category].find(m => m.id === movie.movieId);
                        if (movieInBox) {
                            await window.electronAPI.removeMovieFromBox({
                                boxName: box.name,
category: movie.category,
                                movieId: movie.movieId
                            });
                        }
                    }
                }
            }

            // 批量删除电影
            await window.electronAPI.batchDeleteMovies({ movieIds: selectedMovieIds });

            alert(`已删除 ${selectedCount} 部电影`);

            // 清空选择
            state.selectedMovies.clear();
            updateBatchAddButtonVisibility();
            updateBatchDeleteButtonVisibility();

            // 刷新电影库、分类列表和电影盒子
            await loadMovies();
            await loadCategories();
            await loadBoxes();
            await loadStats();
        } catch (error) {
            console.error('Error batch deleting movies:', error);
            alert('删除失败: ' + error.message);
        }
    });

    // ==================== 目录扫描相关事件 ====================

    // 打开目录扫描模态框
    elements.scanDirBtn.addEventListener('click', () => {
        openScanDirModal();
    });

    // ==================== 添加电影相关事件 ====================

    // 关闭添加电影模态框
    elements.closeAddMovie.addEventListener('click', () => {
        elements.addMovieModal.style.display = 'none';
    });

    elements.cancelAddMovie.addEventListener('click', () => {
        elements.addMovieModal.style.display = 'none';
    });

    // 点击模态框外部关闭
    elements.addMovieModal.addEventListener('click', (e) => {
        // 如果点击目标是模态框本身（背景遮罩），则关闭
        // 点击任何内容区域（按钮、表单元素等）不关闭
        const modal = elements.addMovieModal;
        const modalContent = modal.querySelector('.modal-content');

        // 如果点击的是模态框背景（不是内容区域），则关闭
        // 只有直接点击 modal（背景）时才关闭，点击 modalContent 或其子元素时不关闭
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });

    // 选择封面图片
    elements.selectCoverBtn.addEventListener('click', () => {
        elements.movieCoverInput.click();
    });

    // 封面图片选择变化
    elements.movieCoverInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            elements.coverName.textContent = file.name;

            // 预览图片
            const reader = new FileReader();
            reader.onload = (event) => {
                elements.coverPreview.innerHTML = `<img src="${event.target.result}" alt="Cover Preview">`;
            };
            reader.readAsDataURL(file);
        }
    });

    // ==================== 电影文件管理相关事件 ====================

    // Tab 切换事件
    document.querySelectorAll('.tab-btn[data-tab]').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.dataset.tab;
            // 切换 tab 按钮状态
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            // 切换 tab 内容显示
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            document.getElementById('tab-' + tabName).classList.add('active');
            // 仅在电影信息 Tab 显示保存/取消按钮
            elements.addMovieFooter.style.display = (tabName === 'movie-info') ? 'flex' : 'none';
        });
    });

    // 打开添加文件弹窗
    elements.addFileBtn.addEventListener('click', () => {
        resetAddFileForm();
        elements.addFileModal.style.display = 'flex';
    });

    // 关闭添加文件弹窗
    elements.closeAddFile.addEventListener('click', () => {
        elements.addFileModal.style.display = 'none';
    });

    elements.cancelAddFile.addEventListener('click', () => {
        elements.addFileModal.style.display = 'none';
    });

    // 点击模态框外部关闭
    elements.addFileModal.addEventListener('click', (e) => {
        if (e.target === elements.addFileModal) {
            elements.addFileModal.style.display = 'none';
        }
    });

    // 选择文件按钮
    elements.selectFileBtn.addEventListener('click', async () => {
        const result = await window.electronAPI.selectFile();
        if (!result.canceled && result.path) {
            const filePath = result.path;
            const fileName = result.name || filePath.split(/[/\\]/).pop();

            state.pendingFilePath = filePath;
            elements.selectedFileName.textContent = fileName;
            elements.newFileFullpath.value = filePath;
            elements.newFileType.value = 'Main';
            elements.newFileCodec.value = '';
            elements.newFileResolution.value = '';
            elements.newFileDuration.value = '';
            elements.selectedFileInfo.style.display = 'block';
            elements.confirmAddFile.disabled = false;
        }
    });

    // 确认添加文件
    elements.confirmAddFile.addEventListener('click', () => {
        // 检查是否已存在Main类型的文件
        const fileType = elements.newFileType.value;
        if (fileType === 'Main') {
            const hasMainFile = state.movieFiles.some(f => f.type === 'Main');
            if (hasMainFile) {
                alert('已存在电影正片，一个电影只能添加一个正片文件');
                return;
            }
        }

        // 解析视频尺寸
        const resolution = elements.newFileResolution.value.trim();
        let videoWidth = '';
        let videoHeight = '';
        if (resolution) {
            const resMatch = resolution.match(/^(\d+)\s*[xX]\s*(\d+)$/);
            if (resMatch) {
                videoWidth = resMatch[1];
                videoHeight = resMatch[2];
            }
        }

        // 从fullpath提取文件名
        const fullPath = elements.newFileFullpath.value;
        const fileName = fullPath.split(/[/\\]/).pop();

        const fileEntry = {
            filename: fileName,
            fullpath: fullPath,
            type: fileType,
            memo: elements.newFileMemo.value.trim(),
            videoCodec: elements.newFileCodec.value,
            videoWidth: videoWidth,
            videoHeight: videoHeight,
            videoDuration: elements.newFileDuration.value.trim()
        };

        state.movieFiles.push(fileEntry);
        renderFileList();

        // 选中新添加的文件
        state.selectedFileIndex = state.movieFiles.length - 1;
        showFileDetails(state.selectedFileIndex);

        elements.addFileModal.style.display = 'none';
        resetAddFileForm();

        // 切换到文件列表 tab 并高亮
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelector('.tab-btn[data-tab="movie-files"]').classList.add('active');
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        document.getElementById('tab-movie-files').classList.add('active');
        elements.addMovieFooter.style.display = 'none';
    });

    // 确认添加电影
    elements.confirmAddMovie.addEventListener('click', async () => {
        const name = elements.movieNameInput.value.trim();
        const category = elements.movieCategorySelect.value;
        const customId = elements.movieIdInput ? elements.movieIdInput.value.trim() : '';

        if (!name) {
            alert('请输入电影名称');
            return;
        }

        if (!category) {
            alert('请选择分类');
            return;
        }

        // 检查是否有同名电影（同分类）
        const existingMovie = state.movies.find(m =>
            m.name.toLowerCase() === name.toLowerCase() && m.category === category
        );

        if (existingMovie) {
            const confirmed = confirm(`电影库中已经拥有「${name}」电影，是否进行覆盖？`);
            if (!confirmed) {
                return;
            }
        }

        // 获取表单数据
        const movieData = {
            title: name,
            category: category,
            description: elements.movieDescription ? elements.movieDescription.value.trim() : '',
            year: elements.moviePublishDate ? elements.moviePublishDate.value : '',
            director: elements.movieDirector ? elements.movieDirector.value.trim() : '',
            studio: elements.movieStudio ? elements.movieStudio.value.trim() : '',
            actors: [...state.selectedActors],
            tags: getSelectedTags(),
            fileset: [...state.movieFiles],
            customId: customId
        };

        // 处理封面图片
        const coverFile = elements.movieCoverInput.files[0];
        if (coverFile) {
            movieData.coverImage = await fileToBase64(coverFile);
        }

        try {
            const result = await window.electronAPI.addMovie(movieData);

            if (result.error) {
                alert('添加失败: ' + result.error);
            } else {
                elements.addMovieModal.style.display = 'none';
                await loadMovies();
                await loadCategories();
                await loadStats();
                // 自动打开新添加的电影的详情页面
                // result.movie 包含完整的电影数据
                if (result && result.movie) {
                    await window.electronAPI.openMovieDetail(result.movie);
                }
            }
        } catch (error) {
            console.error('Error adding movie:', error);
            alert('添加失败: ' + error.message);
        }
    });

    // ==================== 导入JSON相关事件 ====================

    // 标签选择弹窗事件
    const tagSelectorModal = document.getElementById('tag-selector-modal');
    const closeTagSelector = document.getElementById('close-tag-selector');
    const cancelTagSelection = document.getElementById('cancel-tag-selection');

    if (closeTagSelector) {
        closeTagSelector.addEventListener('click', () => {
            closeTagSelectorModal();
        });
    }

    if (cancelTagSelection) {
        cancelTagSelection.addEventListener('click', () => {
            closeTagSelectorModal();
        });
    }

    if (tagSelectorModal) {
        tagSelectorModal.addEventListener('click', (e) => {
            if (e.target === tagSelectorModal) {
                closeTagSelectorModal();
            }
        });
    }

    // 演员选择弹窗事件
    const closeActorSelector = document.getElementById('close-actor-selector');
    const cancelActorSelection = document.getElementById('cancel-actor-selection');

    if (closeActorSelector) {
        closeActorSelector.addEventListener('click', () => {
            closeActorSelectorModal();
        });
    }

    if (cancelActorSelection) {
        cancelActorSelection.addEventListener('click', () => {
            closeActorSelectorModal();
        });
    }

    if (elements.confirmActorSelection) {
        elements.confirmActorSelection.addEventListener('click', () => {
            confirmActorSelection();
        });
    }

    if (elements.actorSelectorModal) {
        elements.actorSelectorModal.addEventListener('click', (e) => {
            if (e.target === elements.actorSelectorModal) {
                closeActorSelectorModal();
            }
        });
    }

    // 演员选择弹窗搜索事件
    if (elements.actorSelectorSearchBtn) {
        elements.actorSelectorSearchBtn.addEventListener('click', () => {
            state.actorSelectorSearchKeyword = elements.actorSelectorSearchInput.value.trim();
            state.actorSelectorCurrentPage = 1;
            renderActorSelectorList();
        });
    }

    if (elements.actorSelectorClearBtn) {
        elements.actorSelectorClearBtn.addEventListener('click', () => {
            elements.actorSelectorSearchInput.value = '';
            state.actorSelectorSearchKeyword = '';
            state.actorSelectorCurrentPage = 1;
            elements.actorSelectorClearBtn.style.display = 'none';
            renderActorSelectorList();
        });
    }

    if (elements.actorSelectorSearchInput) {
        elements.actorSelectorSearchInput.addEventListener('input', () => {
            if (elements.actorSelectorClearBtn) {
                elements.actorSelectorClearBtn.style.display = elements.actorSelectorSearchInput.value ? 'block' : 'none';
            }
        });

        elements.actorSelectorSearchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                state.actorSelectorSearchKeyword = elements.actorSelectorSearchInput.value.trim();
                state.actorSelectorCurrentPage = 1;
                renderActorSelectorList();
            }
        });
    }

    // 演员选择弹窗分页事件
    if (elements.actorSelectorPrevBtn) {
        elements.actorSelectorPrevBtn.addEventListener('click', () => {
            if (state.actorSelectorCurrentPage > 1) {
                state.actorSelectorCurrentPage--;
                renderActorSelectorList();
            }
        });
    }

    if (elements.actorSelectorNextBtn) {
        elements.actorSelectorNextBtn.addEventListener('click', () => {
            // 计算总页数
            let filteredActors = state.actors;
            if (state.actorSelectorSearchKeyword) {
                const keyword = state.actorSelectorSearchKeyword.toLowerCase();
                filteredActors = state.actors.filter(actor => {
                    const nameMatch = actor.name && actor.name.toLowerCase().includes(keyword);
                    const nicknameMatch = actor.nickname && actor.nickname.toLowerCase().includes(keyword);
                    return nameMatch || nicknameMatch;
                });
            }
            const totalPages = Math.ceil(filteredActors.length / state.actorSelectorPageSize) || 1;
            if (state.actorSelectorCurrentPage < totalPages) {
                state.actorSelectorCurrentPage++;
                renderActorSelectorList();
            }
        });
    }
}

/**
 * 重置添加电影表单
 */
function resetAddMovieForm() {
    if (elements.movieNameInput) elements.movieNameInput.value = '';
    if (elements.movieIdInput) elements.movieIdInput.value = '';
    if (elements.movieCategorySelect) elements.movieCategorySelect.value = '';
    if (elements.moviePublishDate) elements.moviePublishDate.value = '';
    if (elements.movieDirector) elements.movieDirector.value = '';
    if (elements.movieStudio) elements.movieStudio.value = '';
    if (elements.movieDescription) elements.movieDescription.value = '';
    if (elements.movieCoverInput) elements.movieCoverInput.value = '';
    if (elements.coverName) elements.coverName.textContent = '';
    if (elements.coverPreview) elements.coverPreview.innerHTML = '<div class="cover-placeholder">选择封面图片</div>';

    // 清空标签选择
    state.selectedTags.clear();
    renderSelectedTags();

    // 清空演员选择
    state.selectedActors = [];
    renderSelectedActors();

    // 清空文件关联
    state.movieFiles = [];
    state.selectedFileIndex = -1;
    state.pendingFilePath = '';
    renderFileList();
    hideFileDetails();

    // 重置 Tab 到电影信息
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.tab-btn[data-tab="movie-info"]').classList.add('active');
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById('tab-movie-info').classList.add('active');
    elements.addMovieFooter.style.display = 'flex';
}

/**
 * 格式化文件大小
 * @param {number} bytes - 字节数
 * @returns {string} 格式化后的大小字符串
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 渲染文件列表
 */
function renderFileList() {
    if (state.movieFiles.length === 0) {
        elements.fileList.innerHTML = '<div class="file-list-empty">暂无关联文件</div>';
        return;
    }

    let html = '';
    state.movieFiles.forEach((file, index) => {
        const isSelected = index === state.selectedFileIndex;
        const parts = [];
        if (file.videoCodec) parts.push(file.videoCodec);
        if (file.videoWidth && file.videoHeight) parts.push(`${file.videoWidth}x${file.videoHeight}`);
        if (file.videoDuration) parts.push(formatDuration(file.videoDuration));
        const videoInfo = parts.length > 0 ? parts.join(' | ') : '';

        html += `
            <div class="file-item ${isSelected ? 'selected' : ''}" data-index="${index}">
                <span class="file-icon">📄</span>
                <div class="file-info">
                    <div class="file-name" title="${file.filename || ''}">${file.filename || '未知'}</div>
                    ${videoInfo ? `<div class="file-video-info">${videoInfo}</div>` : ''}
                </div>
                <span class="file-item-delete" data-index="${index}" title="删除">&times;</span>
            </div>
        `;
    });
    elements.fileList.innerHTML = html;

    // 绑定文件项点击事件
    document.querySelectorAll('.file-item').forEach(item => {
        item.addEventListener('click', (e) => {
            // 如果点击的是删除图标，不处理文件选中
            if (e.target.classList.contains('file-item-delete')) {
                return;
            }
            const index = parseInt(item.dataset.index);
            state.selectedFileIndex = index;
            showFileDetails(index);
            renderFileList();
        });
    });

    // 绑定删除图标点击事件
    document.querySelectorAll('.file-item-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const index = parseInt(btn.dataset.index);
            const confirmed = confirm('确定要删除此文件关联记录吗？\n注意：这不会删除原始文件。');
            if (confirmed) {
                state.movieFiles.splice(index, 1);
                if (state.selectedFileIndex >= state.movieFiles.length) {
                    state.selectedFileIndex = state.movieFiles.length - 1;
                }
                if (state.selectedFileIndex >= 0) {
                    showFileDetails(state.selectedFileIndex);
                } else {
                    hideFileDetails();
                }
                renderFileList();
            }
        });
    });
}

/**
 * 显示文件详情
 * @param {number} index - 文件索引
 */
function showFileDetails(index) {
    if (index < 0 || index >= state.movieFiles.length) {
        hideFileDetails();
        return;
    }

    const file = state.movieFiles[index];
    elements.fileFullpath.value = file.fullpath || '';
    elements.fileCodec.value = file.videoCodec || '';
    elements.fileResolution.value = (file.videoWidth && file.videoHeight)
        ? `${file.videoWidth}x${file.videoHeight}` : '';
    elements.fileDuration.value = file.videoDuration ? formatDuration(file.videoDuration) : '';
    elements.fileMemo.value = file.memo || '';

    elements.fileDetails.style.display = 'block';
    document.querySelector('.file-details-empty').style.display = 'none';
}

/**
 * 隐藏文件详情
 */
function hideFileDetails() {
    elements.fileDetails.style.display = 'none';
    document.querySelector('.file-details-empty').style.display = 'flex';
}

/**
 * 选中文件项
 * @param {number} index - 文件索引
 */
function selectFileItem(index) {
    state.selectedFileIndex = index;
    document.querySelectorAll('.file-item').forEach(item => {
        const itemIndex = parseInt(item.dataset.index);
        if (itemIndex === index) {
            item.classList.add('selected');
        } else {
            item.classList.remove('selected');
        }
    });
}

/**
 * 重置添加文件表单
 */
function resetAddFileForm() {
    elements.fileSelectInput.value = '';
    elements.selectedFileName.textContent = '';
    elements.selectedFileInfo.style.display = 'none';
    elements.newFileFullpath.value = '';
    elements.newFileType.value = 'Main';
    elements.newFileCodec.value = '';
    elements.newFileResolution.value = '';
    elements.newFileDuration.value = '';
    elements.newFileMemo.value = '';
    elements.confirmAddFile.disabled = true;
    state.pendingFilePath = '';
}

/**
 * 填充分类选择下拉框
 */
function populateCategorySelect() {
    elements.movieCategorySelect.innerHTML = '<option value="">选择分类...</option>';
    state.categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = category.name;
        elements.movieCategorySelect.appendChild(option);
    });
}

/**
 * 填充标签选择
 */
function populateTagsSelect() {
    // 清空已选标签
    state.selectedTags.clear();

    // 渲染标签选择区域（带X按钮和+按钮）
    renderSelectedTags();
}

/**
 * 渲染已选中的标签
 */
function renderSelectedTags() {
    let html = '';

    // 渲染已选中的标签
    state.selectedTags.forEach(tagId => {
        const tag = state.tags.find(t => t.id === tagId);
        if (tag) {
            html += `
                <span class="tag tag-with-remove" data-tag-id="${tagId}">
                    ${tag.name}
                    <span class="tag-remove" onclick="removeTagFromSelection('${tagId}')">&times;</span>
                </span>
            `;
        }
    });

    // 添加+按钮
    html += `<button class="tag-add-btn" onclick="openTagSelectorModal(); return false;">+</button>`;

    elements.movieTags.innerHTML = html;
}

/**
 * 从已选标签中移除
 */
function removeTagFromSelection(tagId) {
    state.selectedTags.delete(tagId);
    renderSelectedTags();
}

/**
 * 打开标签选择弹窗
 */
function openTagSelectorModal() {
    const modal = document.getElementById('tag-selector-modal');
    if (!modal) {
        console.error('Tag selector modal not found');
        return;
    }

    // 渲染标签选择列表
    const container = document.getElementById('tag-selector-list');
    let html = '';
    state.tags.forEach(tag => {
        const isSelected = state.selectedTags.has(tag.id);
        html += `
            <label class="tag-checkbox ${isSelected ? 'selected' : ''}">
                <input type="checkbox" value="${tag.id}" ${isSelected ? 'checked' : ''} onclick="toggleTagInSelection('${tag.id}')">
                <span>${tag.name}</span>
            </label>
        `;
    });
    container.innerHTML = html;

    modal.style.display = 'flex';
}

/**
 * 切换标签选中状态
 */
function toggleTagInSelection(tagId) {
    if (state.selectedTags.has(tagId)) {
        state.selectedTags.delete(tagId);
    } else {
        state.selectedTags.add(tagId);
    }
    // 更新标签显示
    renderSelectedTags();
    // 更新选择弹窗中的复选框状态
    const checkbox = document.querySelector(`#tag-selector-list input[value="${tagId}"]`);
    if (checkbox) {
        const label = checkbox.closest('.tag-checkbox');
        if (state.selectedTags.has(tagId)) {
            label.classList.add('selected');
        } else {
            label.classList.remove('selected');
        }
    }
}

/**
 * 关闭标签选择弹窗
 */
function closeTagSelectorModal() {
    const modal = document.getElementById('tag-selector-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

/**
 * 确认标签选择
 */
function confirmTagSelection() {
    closeTagSelectorModal();
}

/**
 * 获取选中的标签
 */
function getSelectedTags() {
    return Array.from(state.selectedTags);
}

/**
 * 渲染已选中的演员
 */
function renderSelectedActors() {
    let html = '';

    // 渲染已选中的演员
    state.selectedActors.forEach(actorName => {
        html += `
            <span class="tag tag-with-remove" data-actor-name="${actorName}">
                ${actorName}
                <span class="tag-remove" onclick="removeActorFromSelection('${actorName}'); return false;">&times;</span>
            </span>
        `;
    });

    // 添加+按钮
    html += `<button class="tag-add-btn" onclick="openActorSelectorModal(); return false;">+</button>`;

    elements.movieActors.innerHTML = html;
}

/**
 * 从已选演员中移除
 */
function removeActorFromSelection(actorName) {
    const index = state.selectedActors.indexOf(actorName);
    if (index > -1) {
        state.selectedActors.splice(index, 1);
    }
    renderSelectedActors();
}

/**
 * 打开演员选择弹窗
 */
function openActorSelectorModal() {
    const modal = document.getElementById('actor-selector-modal');
    if (!modal) {
        console.error('Actor selector modal not found');
        return;
    }

    // 重置搜索和分页状态
    state.actorSelectorSearchKeyword = '';
    state.actorSelectorCurrentPage = 1;

    // 清空搜索框
    if (elements.actorSelectorSearchInput) {
        elements.actorSelectorSearchInput.value = '';
    }

    // 渲染演员列表
    renderActorSelectorList();

    modal.style.display = 'flex';
}

/**
 * 渲染演员选择列表
 */
function renderActorSelectorList() {
    if (!elements.actorSelectorList) {
        console.error('Actor selector list element not found');
        return;
    }

    // 根据搜索关键字过滤演员
    let filteredActors = state.actors;
    if (state.actorSelectorSearchKeyword) {
        const keyword = state.actorSelectorSearchKeyword.toLowerCase();
        filteredActors = state.actors.filter(actor => {
            const nameMatch = actor.name && actor.name.toLowerCase().includes(keyword);
            const nicknameMatch = actor.nickname && actor.nickname.toLowerCase().includes(keyword);
            return nameMatch || nicknameMatch;
        });
    }

    // 计算分页
    const totalActors = filteredActors.length;
    const totalPages = Math.ceil(totalActors / state.actorSelectorPageSize) || 1;
    if (state.actorSelectorCurrentPage > totalPages) {
        state.actorSelectorCurrentPage = totalPages;
    }

    // 截取当前页的数据
    const startIndex = (state.actorSelectorCurrentPage - 1) * state.actorSelectorPageSize;
    const endIndex = startIndex + state.actorSelectorPageSize;
    const pageActors = filteredActors.slice(startIndex, endIndex);

    // 生成表格HTML
    let html = `
        <table>
            <thead>
                <tr>
                    <th class="actor-selector-col-name">姓名</th>
                    <th class="actor-selector-col-nickname">昵称</th>
                    <th class="actor-selector-col-birthday">生日</th>
                    <th class="actor-selector-col-memo">备注</th>
                </tr>
            </thead>
            <tbody>
    `;

    if (pageActors.length === 0) {
        html += `
            <tr>
                <td colspan="4" style="text-align: center; color: var(--text-secondary);">暂无演员数据</td>
            </tr>
        `;
    } else {
        pageActors.forEach(actor => {
            const isSelected = state.selectedActors.includes(actor.name);
            html += `
                <tr class="${isSelected ? 'selected' : ''}" data-actor-name="${actor.name}" onclick="toggleActorInSelection('${actor.name}')">
                    <td class="actor-selector-col-name">${escapeHtml(actor.name)}</td>
                    <td class="actor-selector-col-nickname">${escapeHtml(actor.nickname || '-')}</td>
                    <td class="actor-selector-col-birthday">${escapeHtml(actor.birthday || '-')}</td>
                    <td class="actor-selector-col-memo">${escapeHtml(actor.memo || '-')}</td>
                </tr>
            `;
        });
    }

    html += '</tbody></table>';

    elements.actorSelectorList.innerHTML = html;

    // 更新分页信息
    updateActorSelectorPagination(totalPages);
}

/**
 * 更新演员选择分页组件
 */
function updateActorSelectorPagination(totalPages) {
    if (!elements.actorSelectorPageInfo) return;

    elements.actorSelectorPageInfo.textContent = `第 ${state.actorSelectorCurrentPage} / ${totalPages} 页`;

    // 更新翻页按钮状态（使用class控制）
    if (elements.actorSelectorPrevBtn) {
        if (state.actorSelectorCurrentPage <= 1) {
            elements.actorSelectorPrevBtn.classList.add('disabled');
        } else {
            elements.actorSelectorPrevBtn.classList.remove('disabled');
        }
    }
    if (elements.actorSelectorNextBtn) {
        if (state.actorSelectorCurrentPage >= totalPages) {
            elements.actorSelectorNextBtn.classList.add('disabled');
        } else {
            elements.actorSelectorNextBtn.classList.remove('disabled');
        }
    }
}

/**
 * 切换演员选中状态
 */
function toggleActorInSelection(actorName) {
    const index = state.selectedActors.indexOf(actorName);
    if (index > -1) {
        state.selectedActors.splice(index, 1);
    } else {
        state.selectedActors.push(actorName);
    }
    // 更新演员显示
    renderSelectedActors();
    // 更新列表中的选中状态
    const row = document.querySelector(`#actor-selector-list tr[data-actor-name="${actorName}"]`);
    if (row) {
        if (state.selectedActors.includes(actorName)) {
            row.classList.add('selected');
        } else {
            row.classList.remove('selected');
        }
    }
}

/**
 * 关闭演员选择弹窗
 */
function closeActorSelectorModal() {
    const modal = document.getElementById('actor-selector-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

/**
 * 确认演员选择
 */
function confirmActorSelection() {
    closeActorSelectorModal();
}

/**
 * HTML转义，防止XSS
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * 加载演员列表
 */
async function loadActors() {
    try {
        const result = await window.electronAPI.getActors();
        if (result && !result.error) {
            state.actors = result.actors || [];
        } else {
            console.error('Failed to load actors:', result.error);
            state.actors = [];
        }
    } catch (error) {
        console.error('Error loading actors:', error);
        state.actors = [];
    }
}

/**
 * 保存设置处理器
 */
async function saveSettingsHandler() {
    try {
        const newSettings = {
            ...state.settings,
            emulators: state.settings.emulators,
            appearance: {
                ...state.settings.appearance,
                theme: elements.themeSelect.value
            },
            layout: {
                ...state.settings.layout,
                sidebarWidth: parseInt(elements.sidebarWidth.value),
                posterSize: elements.posterSize.value,
                viewMode: state.viewMode
            },
            library: {
                ...state.settings.library,
                moviesDir: elements.moviesDirInput.value,
                actorPhotoDir: elements.actorPhotoDirInput.value
            },
            moviebox: {
                ...state.settings.moviebox,
                movieboxDir: elements.movieboxDirInput.value
            }
        };

        await window.electronAPI.saveSettings(newSettings);

        state.settings = newSettings;
        // 调用 setTheme 广播主题变化到所有窗口
        await window.electronAPI.setTheme(newSettings.appearance.theme);
        applyLayoutSettings(newSettings.layout);

        // 关闭模态框
        elements.settingsModal.style.display = 'none';

        // 重新加载所有电影
        await loadCategories();
        await loadMovies();
        await loadStats();
        // 重新加载盒子列表
        await loadBoxes();
    } catch (error) {
        console.error('Error saving settings:', error);
    }
}

// ==================== 目录扫描相关函数 ====================

/**
 * 打开目录扫描模态框
 */
function openScanDirModal() {
    // 重置表单
    elements.scanPathInput.value = '';
    elements.scanCategorySelect.innerHTML = '<option value="">选择分类...</option>';
    elements.confirmScanDir.disabled = true;

    // 填充分类选择
    state.categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = category.name;
        elements.scanCategorySelect.appendChild(option);
    });

    elements.scanDirModal.style.display = 'flex';
}

/**
 * 关闭目录扫描模态框
 */
function closeScanDirModal() {
    elements.scanDirModal.style.display = 'none';
}

/**
 * 处理扫描路径选择
 */
async function handleSelectScanPath() {
    const scanType = document.querySelector('input[name="scan-type"]:checked').value;

    if (scanType === 'directory') {
        const result = await window.electronAPI.selectDirectory();
        if (!result.canceled && result.path) {
            elements.scanPathInput.value = result.path;
            elements.scanPathInput.dataset.path = result.path;
            elements.scanPathInput.dataset.type = 'directory';
            updateScanConfirmButton();
        }
    } else {
        const result = await window.electronAPI.selectFile([
            { name: 'Text Files', extensions: ['txt', 'csv'] }
        ]);
        if (!result.canceled && result.path) {
            elements.scanPathInput.value = result.path;
            elements.scanPathInput.dataset.path = result.path;
            elements.scanPathInput.dataset.type = 'file';
            updateScanConfirmButton();
        }
    }
}

/**
 * 更新扫描确认按钮状态
 */
function updateScanConfirmButton() {
    const path = elements.scanPathInput.dataset.path;
    const category = elements.scanCategorySelect.value;
    elements.confirmScanDir.disabled = !path || !category;
}

/**
 * 开始扫描目录
 */
async function startScanDirectory() {
    const scanPath = elements.scanPathInput.dataset.path;
    const scanType = elements.scanPathInput.dataset.type;
    const category = elements.scanCategorySelect.value;

    // 获取目录命名方式选项
    const dirNamingOption = document.querySelector('input[name="dir-naming"]:checked').value;

    if (!scanPath || !category) {
        alert('请选择扫描路径和目标分类');
        return;
    }

    try {
        elements.confirmScanDir.disabled = true;
        elements.confirmScanDir.textContent = '扫描中...';

        const result = await window.electronAPI.scanMovieDirectory({
            scanPath: scanPath,
            scanType: scanType,
            category: category,
            dirNaming: dirNamingOption
        });

        if (result.error) {
            alert('扫描失败: ' + result.error);
            return;
        }

        // 保存临时目录和电影列表
        state.scanTempDir = result.tempDir;
        state.scanMovies = result.movies;

        // 关闭扫描设置模态框
        closeScanDirModal();

        // 显示扫描结果
        showScanResults(result.movies, category);

    } catch (error) {
        console.error('Error scanning directory:', error);
        alert('扫描失败: ' + error.message);
    } finally {
        elements.confirmScanDir.disabled = false;
        elements.confirmScanDir.textContent = '开始扫描';
    }
}

/**
 * 显示扫描结果列表
 * 展示：电影ID、电影名称、演员、发行商、电影时长、海报地址、视频文件地址、状态
 */
async function showScanResults(movies, category) {
    const categoryName = state.categories.find(c => c.id === category)?.name || category;
    elements.scanResultInfo.textContent = `共扫描到 ${movies.length} 个电影（分类：${categoryName}）`;

    // 获取电影库中已有的电影ID
    const existingMovieIds = new Set();
    try {
        const allMovies = await window.electronAPI.getAllMoviesFromIndex({});
        allMovies.forEach(m => {
            if (m.id) existingMovieIds.add(m.id);
        });
    } catch (error) {
        console.error('Error fetching existing movies:', error);
    }

    // 获取演员列表用于校验
    const actorNames = new Set();
    try {
        const actorData = await window.electronAPI.getActors();
        if (actorData && actorData.actors) {
            actorData.actors.forEach(a => {
                if (a.name) actorNames.add(a.name);
            });
        }
    } catch (error) {
        console.error('Error fetching actors:', error);
    }

    // 渲染电影列表（table 形式，滚动条仅在 scan-movies-list 内）
    let html = `
        <table>
            <thead>
                <tr>
                    <th class="scan-movie-id">电影ID</th>
                    <th class="scan-movie-name">电影名称</th>
                    <th class="scan-movie-actors">演员</th>
                    <th class="scan-movie-publisher">发行商</th>
                    <th class="scan-movie-runtime">时长</th>
                    <th class="scan-movie-poster">海报</th>
                    <th class="scan-movie-video">视频</th>
                    <th class="scan-movie-status">状态</th>
                    <th class="scan-movie-actions">操作</th>
                </tr>
            </thead>
            <tbody>
    `;

    movies.forEach((movie, index) => {
        const movieData = movie.movieData || {};
        const movieId = movieData.id || movieData.movieId || '-';
        const title = movieData.title || movie.name || '-';
        const studio = movieData.studio || '-';
        const runtime = movieData.runtime || '-';
        const posterPath = movie.posterPath || movieData.poster || '-';
        const videoPath = movie.sourcePath || (movieData.fileset && movieData.fileset[0]?.fullpath) || '-';

        // 检查电影是否已存在
        const isExisting = existingMovieIds.has(movieId);
        const statusText = isExisting ? '已存在' : '新电影';
        const statusClass = isExisting ? 'scan-status-existing' : 'scan-status-new';

        // 处理演员显示，未知演员标红
        const actorsArray = Array.isArray(movieData.actors) ? movieData.actors : [];
        const actorsHtml = actorsArray.map(actor => {
            const isKnownActor = actorNames.has(actor);
            const actorClass = isKnownActor ? '' : 'actor-unknown';
            return `<span class="${actorClass}">${actor}</span>`;
        }).join(', ');

        // 用于显示的文本（未知的演员会标红）
        const actorsDisplay = actorsArray.length > 0 ? actorsHtml : '-';

        // 如果电影已存在或已删除，显示灰色背景
        const rowClass = (isExisting || movie.deleted) ? 'scan-movie-row-deleted' : '';

        html += `
                <tr data-index="${index}" class="${rowClass}" ${movie.deleted ? 'style="display:none;"' : ''}>
                    <td class="scan-movie-id" title="${movieId}">${truncateText(movieId, 20)}</td>
                    <td class="scan-movie-name" title="${title}">${truncateText(title, 20)}</td>
                    <td class="scan-movie-actors" title="${actorsArray.join(', ')}">${actorsDisplay}</td>
                    <td class="scan-movie-publisher" title="${studio}">${truncateText(studio, 10)}</td>
                    <td class="scan-movie-runtime">${runtime}</td>
                    <td class="scan-movie-poster">${posterPath !== '-' ? '<span class="scan-status-ok">有</span>' : '<span class="scan-status-none">无</span>'}</td>
                    <td class="scan-movie-video" title="${videoPath}">${videoPath !== '-' ? '<span class="scan-status-ok">有</span>' : '<span class="scan-status-none">无</span>'}</td>
                    <td class="scan-movie-status"><span class="${statusClass}">${statusText}</span></td>
                    <td class="scan-movie-actions">
                        <button class="btn btn-secondary btn-small" onclick="editScanMovie(${index})">✎</button>
                        <button class="btn btn-danger btn-small" onclick="deleteScanMovie(${index})">✖︎</button>
                    </td>
                </tr>
        `;
    });

    html += `
            </tbody>
        </table>
    `;

    elements.scanMoviesList.innerHTML = html;
    checkAllMoviesConfirmed();
    elements.scanResultModal.style.display = 'flex';
}

/**
 * 截断文本并添加省略号
 * @param {string} text - 原始文本
 * @param {number} maxLength - 最大长度
 * @returns {string} 截断后的文本
 */
function truncateText(text, maxLength) {
    if (!text || text === '-') return text;
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

/**
 * 编辑扫描电影
 */
async function editScanMovie(index) {
    const movie = state.scanMovies[index];
    if (!movie) return;

    state.currentEditMovie = { index, movie };

    // 填充表单
    elements.scanMovieTempPath.value = movie.tempPath;

    // 尝试读取已有的 movie.json
    let movieData = movie.movieData;
    if (!movieData) {
        try {
            const movies = await window.electronAPI.getTempScannedMovies(state.scanTempDir);
            const existingMovie = movies.find(m => m.tempPath === movie.tempPath);
            if (existingMovie) {
                movieData = existingMovie;
                // 更新本地状态
                state.scanMovies[index].movieData = movieData;
            }
        } catch (error) {
            console.error('Error loading movie data:', error);
        }
    }

    // 填充表单数据 - 电影ID
    if (elements.scanMovieId) elements.scanMovieId.value = movieData?.id || movieData?.movieId || '';

    // 填充表单数据 - 电影名称
    if (elements.scanMovieName) elements.scanMovieName.value = movieData?.title || movie.name || '';

    // 填充表单数据 - 上映日期
    if (elements.scanMoviePublishDate) elements.scanMoviePublishDate.value = movieData?.year || '';

    // 填充表单数据 - 导演
    if (elements.scanMovieDirector) elements.scanMovieDirector.value = movieData?.director || '';

    // 填充表单数据 - 制片商
    if (elements.scanMoviePublisher) elements.scanMoviePublisher.value = movieData?.studio || '';

    // 填充表单数据 - 电影时长
    if (elements.scanMovieRuntime) elements.scanMovieRuntime.value = movieData?.runtime || '';

    // 填充表单数据 - 电影描述
    if (elements.scanMovieDescription) elements.scanMovieDescription.value = movieData?.description || '';

    // 加载封面图片 - 查找 tempPath 下的 cover 文件
    let coverFound = false;
    const coverExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
    const coverNames = ['cover', 'poster', 'folder'];

    for (const coverName of coverNames) {
        for (const ext of coverExtensions) {
            const coverPath = `${movie.tempPath}/${coverName}${ext}`;
            try {
                const coverExists = await window.electronAPI.checkFileExists(coverPath);
                if (coverExists) {
                    const coverResponse = await fetch('file://' + coverPath);
                    const blob = await coverResponse.blob();
                    const base64 = await new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onload = () => resolve(reader.result);
                        reader.readAsDataURL(blob);
                    });
                    elements.scanCoverPreview.innerHTML = `<img src="${base64}" alt="Cover">`;
                    elements.scanMovieCoverInput.dataset.cover = base64;
                    coverFound = true;
                    break;
                }
            } catch (error) {
                // 继续尝试其他路径
            }
            if (coverFound) break;
        }
        if (coverFound) break;
    }

    if (!coverFound) {
        elements.scanCoverPreview.innerHTML = '<div class="cover-placeholder">选择封面图片</div>';
        delete elements.scanMovieCoverInput.dataset.cover;
    }
    delete elements.scanMovieCoverInput.dataset.icon;

    // 初始化演员 - 支持字符串或数组
    const actorsData = movieData?.actors;
    if (typeof actorsData === 'string') {
        state.scanEditActors = actorsData.split(',').map(a => a.trim()).filter(a => a);
    } else if (Array.isArray(actorsData)) {
        state.scanEditActors = [...actorsData];
    } else {
        state.scanEditActors = [];
    }
    renderScanEditActors();

    // 初始化标签
    state.scanEditTags = movieData?.tags || movieData?.tag || [];
    renderScanEditTags();

    elements.scanMovieEditModal.style.display = 'flex';
}

/**
 * 删除扫描电影
 */
function deleteScanMovie(index) {
    const movie = state.scanMovies[index];
    if (!movie) return;

    if (confirm(`确定要删除电影 "${movie.movieData?.title || movie.name || '未知'}" 吗？`)) {
        movie.deleted = true;
        // 隐藏对应行
        const row = document.querySelector(`tr[data-index="${index}"]`);
        if (row) {
            row.style.display = 'none';
        }
    }
}

/**
 * 渲染扫描电影编辑的演员
 */
function renderScanEditActors() {
    let html = '';

    // 渲染已选中的演员
    state.scanEditActors.forEach(actorName => {
        html += `
            <span class="tag tag-with-remove" data-actor-name="${escapeHtml(actorName)}">
                ${escapeHtml(actorName)}
                <span class="tag-remove" onclick="removeScanEditActor('${escapeHtml(actorName)}'); return false;">&times;</span>
            </span>
        `;
    });

    // 添加+按钮（打开演员输入）
    html += `<button class="tag-add-btn" id="scan-actor-add-btn">+</button>`;

    if (elements.scanMovieActors) {
        elements.scanMovieActors.innerHTML = html;
    }

    // 绑定添加演员按钮事件
    const addButton = document.getElementById('scan-actor-add-btn');
    if (addButton) {
        const newButton = addButton.cloneNode(true);
        addButton.parentNode.replaceChild(newButton, addButton);
        newButton.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const actorName = prompt('请输入演员名称：');
            if (actorName && actorName.trim()) {
                if (!state.scanEditActors.includes(actorName.trim())) {
                    state.scanEditActors.push(actorName.trim());
                    renderScanEditActors();
                }
            }
        });
    }
}

/**
 * 从扫描电影编辑中移除演员
 */
function removeScanEditActor(actorName) {
    const index = state.scanEditActors.indexOf(actorName);
    if (index > -1) {
        state.scanEditActors.splice(index, 1);
        renderScanEditActors();
    }
}

/**
 * HTML转义
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * 关闭电影编辑模态框
 */
function closeScanMovieEditModal() {
    elements.scanMovieEditModal.style.display = 'none';
    state.currentEditMovie = null;
}

/**
 * 处理扫描电影封面选择
 */
async function handleScanSelectCover() {
    elements.scanMovieCoverInput.click();
}

/**
 * 处理扫描电影封面文件变化
 */
async function handleScanCoverChange(e) {
    const file = e.target.files[0];
    if (!file) return;

    try {
        const base64 = await fileToBase64(file);
        elements.scanCoverPreview.innerHTML = `<img src="${base64}" alt="Cover" style="width: 100%; height: 100%; object-fit: cover;">`;
        elements.scanMovieCoverInput.dataset.cover = base64;
    } catch (error) {
        console.error('Error reading cover file:', error);
    }
}


/**
 * 渲染扫描电影编辑的标签
 */
function renderScanEditTags() {
    console.log('renderScanEditTags called with scanEditTags:', state.scanEditTags);
    
    let html = '';

    state.scanEditTags.forEach(tagId => {
        const tag = state.tags.find(t => t.id === tagId);
        if (tag) {
            html += `
                <span class="tag tag-with-remove" data-tag-id="${tagId}">
                    ${tag.name}
                    <span class="tag-remove" onclick="removeScanEditTag('${tagId}')">&times;</span>
                </span>
            `;
        }
    });

    console.log('About to add add-tag-btn button');
    html += `<button class="tag-add-btn" id="scan-tag-add-btn">+</button>`;

    elements.scanMovieTags.innerHTML = html;
    console.log('renderScanEditTags completed');
    
    // 绑定 add tag 按钮的事件
    const addButton = document.getElementById('scan-tag-add-btn');
    if (addButton) {
        // 移除旧的事件监听器
        const newButton = addButton.cloneNode(true);
        addButton.parentNode.replaceChild(newButton, addButton);
        
        // 使用新的方法绑定事件
        newButton.addEventListener('click', function(e) {
            console.log('Add tag button clicked via event listener');
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            
            // 检查当前模态框状态
            console.log('Current scan movie edit modal state:', {
                display: elements.scanMovieEditModal.style.display,
                isMovieEditModalOpen: elements.scanMovieEditModal.style.display === 'flex'
            });
            
            openScanTagSelector();
        });
        
        console.log('Add tag button event listener bound successfully');
    }
}

/**
 * 移除扫描电影编辑的标签
 */
function removeScanEditTag(tagId) {
    const index = state.scanEditTags.indexOf(tagId);
    if (index > -1) {
        state.scanEditTags.splice(index, 1);
        renderScanEditTags();
    }
}

/**
 * 打开扫描电影标签选择弹窗
 */
function openScanTagSelector() {
    console.log('openScanTagSelector called');
    console.log('Current scanEditTags:', state.scanEditTags);

    // 确保当前的扫描电影编辑模态框仍然打开
    if (elements.scanMovieEditModal.style.display !== 'flex') {
        console.error('Scan movie edit modal is not open! Current display:', elements.scanMovieEditModal.style.display);
        return;
    }
    
    const modal = elements.scanTagSelectorModal;
    if (!modal) {
        console.error('Tag selector modal not found');
        return;
    }

    const container = elements.scanTagSelectorList;
    let html = '';
    state.tags.forEach(tag => {
        const isSelected = state.scanEditTags.includes(tag.id);
        html += `
            <label class="tag-checkbox ${isSelected ? 'selected' : ''}">
                <input type="checkbox" value="${tag.id}" ${isSelected ? 'checked' : ''} onclick="toggleScanTagSelection('${tag.id}')">
                <span>${tag.name}</span>
            </label>
        `;
    });
    container.innerHTML = html;
    console.log('Tag selector modal content prepared');

    modal.style.display = 'flex';
    console.log('Tag selector modal displayed');
    
    // 使用 setTimeout 确保模态框显示后再添加事件监听
    setTimeout(() => {
        // 确保主编辑模态框仍然是打开的
        if (elements.scanMovieEditModal.style.display !== 'flex') {
            console.warn('Main modal was closed while opening tag selector!');
            return;
        }
        
        // 为标签选择器绑定专门的事件处理
        modal.addEventListener('click', function handleModalClick(e) {
            if (e.target === modal) {
                // 只有点击背景时才关闭
                console.log('Closing tag selector modal - clicked on background');
                closeScanTagSelector();
            }
        }, { once: true }); // 只绑定一次
    }, 100);
}

/**
 * 切换扫描电影标签选中状态
 */
function toggleScanTagSelection(tagId) {
    const index = state.scanEditTags.indexOf(tagId);
    if (index > -1) {
        state.scanEditTags.splice(index, 1);
    } else {
        state.scanEditTags.push(tagId);
    }
    renderScanEditTags();
    const checkbox = document.querySelector(`#scan-tag-selector-list input[value="${tagId}"]`);
    if (checkbox) {
        const label = checkbox.closest('.tag-checkbox');
        if (state.scanEditTags.includes(tagId)) {
            label.classList.add('selected');
        } else {
            label.classList.remove('selected');
        }
    }
}

/**
 * 关闭扫描电影标签选择弹窗
 */
function closeScanTagSelector() {
    elements.scanTagSelectorModal.style.display = 'none';
}

/**
 * 确认保存扫描电影编辑
 */
async function confirmScanMovieEdit() {
    if (!state.currentEditMovie) return;

    const { index, movie } = state.currentEditMovie;
    const tempPath = movie.tempPath;

    const movieData = {
        id: elements.scanMovieId ? elements.scanMovieId.value.trim() : '',
        title: elements.scanMovieName ? elements.scanMovieName.value.trim() : '',
        year: elements.scanMoviePublishDate ? elements.scanMoviePublishDate.value : '',
        director: elements.scanMovieDirector ? elements.scanMovieDirector.value.trim() : '',
        studio: elements.scanMoviePublisher ? elements.scanMoviePublisher.value.trim() : '',
        runtime: elements.scanMovieRuntime ? elements.scanMovieRuntime.value : '',
        description: elements.scanMovieDescription ? elements.scanMovieDescription.value : '',
        actors: [...state.scanEditActors],
        tags: [...state.scanEditTags]
    };

    if (!movieData.title) {
        alert('请输入电影名称');
        return;
    }

    try {
        const coverImage = elements.scanMovieCoverInput.dataset.cover || '';
        const iconImage = elements.scanMovieCoverInput.dataset.icon || '';

        const result = await window.electronAPI.updateTempMovie({
            tempPath: tempPath,
            movieData: movieData,
            coverImage: coverImage,
            iconImage: iconImage
        });

        if (result.error) {
            alert('保存失败: ' + result.error);
            return;
        }

        // 更新本地状态
        state.scanMovies[index].name = movieData.title;
        state.scanMovies[index].movieData = result.movieData;

        // 更新列表显示
        const statusEl = document.getElementById(`status-${index}`);
        if (statusEl) {
            statusEl.textContent = '已确认';
            statusEl.classList.add('confirmed');
        }

        // 检查是否所有电影都已确认
        checkAllMoviesConfirmed();

        // 关闭模态框
        closeScanMovieEditModal();

    } catch (error) {
        console.error('Error saving scan movie:', error);
        alert('保存失败: ' + error.message);
    }
}

/**
 * 检查是否所有电影都已确认
 */
function checkAllMoviesConfirmed() {
    const allConfirmed = state.scanMovies.every(movie => movie.movieData);
    elements.scanResultImport.disabled = !allConfirmed;
}

/**
 * 导入所有扫描的电影
 */
async function importAllScannedMovies() {
    if (!state.scanTempDir) {
        alert('无效的扫描目录');
        return;
    }

    try {
        elements.scanResultImport.disabled = true;
        elements.scanResultImport.textContent = '导入中...';

        // 获取电影库中已有的电影ID，用于排除
        const existingMovieIds = new Set();
        try {
            const allMovies = await window.electronAPI.getAllMoviesFromIndex({});
            allMovies.forEach(m => {
                if (m.id) existingMovieIds.add(m.id);
            });
        } catch (error) {
            console.error('Error fetching existing movies:', error);
        }

        // 收集需要排除的电影ID（已删除的电影 + 电影库中已存在的电影）
        const excludeIds = [];
        state.scanMovies.forEach(movie => {
            const movieId = movie.movieData?.id || movie.movieData?.movieId;
            if (movie.deleted || (movieId && existingMovieIds.has(movieId))) {
                if (movieId) excludeIds.push(movieId);
            }
        });

        const result = await window.electronAPI.importScannedMovies(state.scanTempDir, excludeIds);

        if (result.error) {
            alert('导入失败: ' + result.error);
            return;
        }

        // 显示导入结果
        let message = `导入完成！成功: ${result.success} 个`;
        if (result.skipped > 0) {
            message += `，跳过: ${result.skipped} 个`;
        }
        if (result.failed > 0) {
            message += `，失败: ${result.failed} 个`;
        }
        if (result.errors && result.errors.length > 0) {
            message += `\n错误: ${result.errors.join('; ')}`;
        }

        alert(message);

        // 关闭结果模态框
        closeScanResultModal();

        // 刷新电影库
        await loadMovies();
        await loadCategories();
        await loadStats();

    } catch (error) {
        console.error('Error importing scanned movies:', error);
        alert('导入失败: ' + error.message);
    } finally {
        elements.scanResultImport.disabled = false;
        elements.scanResultImport.textContent = '导入全部';
    }
}

/**
 * 取消扫描
 */
async function cancelScan() {
    if (state.scanTempDir) {
        try {
            await window.electronAPI.deleteTempScanDir(state.scanTempDir);
        } catch (error) {
            console.error('Error deleting temp scan dir:', error);
        }
    }

    state.scanTempDir = '';
    state.scanMovies = [];

    closeScanResultModal();
}

/**
 * 关闭扫描结果模态框
 */
function closeScanResultModal() {
    elements.scanResultModal.style.display = 'none';
    state.scanTempDir = '';
    state.scanMovies = [];
}

/**
 * 初始化目录扫描相关事件
 */
function initScanDirEvents() {
    // 扫描目录模态框事件
    elements.closeScanDir.addEventListener('click', closeScanDirModal);
    elements.cancelScanDir.addEventListener('click', closeScanDirModal);
    elements.scanDirModal.addEventListener('click', (e) => {
        if (e.target === elements.scanDirModal) {
            closeScanDirModal();
        }
    });

    // 选择扫描路径
    elements.selectScanPathBtn.addEventListener('click', handleSelectScanPath);

    // 扫描类型变化时清空路径
    document.querySelectorAll('input[name="scan-type"]').forEach(radio => {
        radio.addEventListener('change', () => {
            elements.scanPathInput.value = '';
            delete elements.scanPathInput.dataset.path;
            delete elements.scanPathInput.dataset.type;
            updateScanConfirmButton();
        });
    });

    // 分类选择变化
    elements.scanCategorySelect.addEventListener('change', updateScanConfirmButton);

    // 开始扫描
    elements.confirmScanDir.addEventListener('click', startScanDirectory);

    // 扫描结果模态框事件
    elements.closeScanResult.addEventListener('click', closeScanResultModal);
    elements.scanResultCancel.addEventListener('click', cancelScan);
    elements.scanResultImport.addEventListener('click', importAllScannedMovies);
    elements.scanResultModal.addEventListener('click', (e) => {
        if (e.target === elements.scanResultModal) {
            closeScanResultModal();
        }
    });

    // 电影编辑模态框事件
    elements.closeScanMovieEdit.addEventListener('click', closeScanMovieEditModal);
    elements.cancelScanMovieEdit.addEventListener('click', closeScanMovieEditModal);
    elements.scanMovieEditModal.addEventListener('click', (e) => {
        // 调试日志
        const target = e.target;
        const isBackground = target === elements.scanMovieEditModal;
        const isInsideContent = target.closest('.modal-content') !== null;
        const isAddTagBtn = target.matches('.tag-add-btn') || target.closest('.tag-add-btn');
        
        console.log('Scan movie edit modal clicked:', {
            target: target,
            targetClass: target.className,
            targetId: target.id,
            tagName: target.tagName,
            isBackground: isBackground,
            isInsideContent: isInsideContent,
            isAddTagBtn: isAddTagBtn
        });
        
        // 只有关闭按钮在 modal-content 内，所以我们需要特别处理
        // 如果点击的是背景遮罩（不是内容区域），则关闭
        if (isBackground) {
            console.log('Closing modal - clicked on background overlay');
            closeScanMovieEditModal();
        }
    });

    // 封面选择
    elements.scanSelectCoverBtn.addEventListener('click', handleScanSelectCover);
    elements.scanMovieCoverInput.addEventListener('change', handleScanCoverChange);

    // 标签选择弹窗事件
    elements.closeScanTagSelector.addEventListener('click', closeScanTagSelector);
    elements.cancelScanTagSelection.addEventListener('click', closeScanTagSelector);
    elements.confirmScanTagSelection.addEventListener('click', closeScanTagSelector);
    elements.scanTagSelectorModal.addEventListener('click', (e) => {
        if (e.target === elements.scanTagSelectorModal) {
            closeScanTagSelector();
        }
    });

    // 确认保存
    elements.confirmScanMovieEdit.addEventListener('click', confirmScanMovieEdit);
}

// 初始化应用
document.addEventListener('DOMContentLoaded', init);

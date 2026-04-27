/**
 * 电影详情页逻辑
 */

let currentMovie = null;
let isEditMode = false;
let editData = {};
let fromBox = false;
let boxName = '';
let pendingMovieData = null;
let tagsCache = [];
let categoriesCache = [];
let actorsCache = [];
let selectedActors = [];
let movieDataLoaded = false;
let currentTab = 'movie-info';
let selectedFileIndex = -1;
let editFileset = [];
// 演员选择弹窗状态
let actorSelectorSearchKeyword = '';
let actorSelectorCurrentPage = 1;
const ACTOR_SELECTOR_PAGE_SIZE = 10;

// 电影搜索弹窗状态
let movieSearchResults = [];
let selectedMovie = null;
const MOVIE_SEARCH_MAX_RESULTS = 10;

// DOM 元素
const elements = {
    closeBtn: document.getElementById('close-btn'),
    movieTitle: document.getElementById('movie-title'),
    movieTitleContainer: document.getElementById('movie-title-container'),
    moviePoster: document.getElementById('movie-poster'),
    posterPlaceholder: document.getElementById('poster-placeholder'),
    uploadPosterBtn: document.getElementById('upload-poster-btn'),
    posterUploadInput: document.getElementById('poster-upload-input'),
    movieId: document.getElementById('movie-id'),
    movieCategory: document.getElementById('movie-category'),
    movieDuration: document.getElementById('movie-duration'),
    movieDurationContainer: document.getElementById('movie-duration-container'),
    moviePublishDate: document.getElementById('movie-publish-date'),
    moviePublishDateContainer: document.getElementById('movie-publish-date-container'),
    movieDirector: document.getElementById('movie-director'),
    movieDirectorContainer: document.getElementById('movie-director-container'),
    movieActorsDisplay: document.getElementById('movie-actors-display'),
    movieActorsEdit: document.getElementById('movie-actors-edit'),
    movieActorsContainer: document.getElementById('movie-actors-container'),
    movieStudio: document.getElementById('movie-studio'),
    movieStudioContainer: document.getElementById('movie-studio-container'),
    movieTags: document.getElementById('movie-tags'),
    movieDescription: document.getElementById('movie-description'),
    movieDescriptionContainer: document.getElementById('movie-description-container'),
    filesSection: document.getElementById('files-section'),
    filesCount: document.getElementById('files-count'),
    movieFilesList: document.getElementById('movie-files-list'),
    playBtn: document.getElementById('play-btn'),
    editBtn: document.getElementById('edit-btn'),
    // Actor selector modal
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
    deleteBtn: document.getElementById('delete-btn'),
    saveEditBtn: document.getElementById('save-edit-btn'),
    cancelEditBtn: document.getElementById('cancel-edit-btn'),
    editActions: document.getElementById('normal-actions'),
    normalActions: document.getElementById('normal-actions'),
    boxActions: document.getElementById('box-actions'),
    boxInfoSection: document.getElementById('box-info-section'),
    boxStatus: document.getElementById('box-status'),
    boxRating: document.getElementById('box-rating'),
    editStatusActionBtn: document.getElementById('edit-status-action-btn'),
    editStatusModal: document.getElementById('edit-status-modal'),
    confirmEditStatus: document.getElementById('confirm-edit-status'),
    cancelEditStatus: document.getElementById('cancel-edit-status'),
    addToBoxBtn: document.getElementById('add-to-box-btn'),
    addToBoxModal: document.getElementById('add-to-box-modal'),
    boxSelect: document.getElementById('box-select'),
    confirmAddToBox: document.getElementById('confirm-add-to-box'),
    cancelAddToBox: document.getElementById('cancel-add-to-box'),
    removeFromBoxBtn: document.getElementById('remove-from-box-btn'),
    playBtnBox: document.getElementById('play-btn-box'),
    detailFooter: document.getElementById('detail-footer'),
    tabMovieInfo: document.getElementById('tab-movie-info'),
    tabMovieFiles: document.getElementById('tab-movie-files'),
    addFileBtn: document.getElementById('add-file-btn'),
    fileDetailsEmpty: document.getElementById('file-details-empty'),
    fileDetailsForm: document.getElementById('file-details-form'),
    fileDetailOriginal: document.getElementById('file-detail-original'),
    fileDetailCodec: document.getElementById('file-detail-codec'),
    fileDetailResolution: document.getElementById('file-detail-resolution'),
    fileDetailDuration: document.getElementById('file-detail-duration'),
    fileDetailMemo: document.getElementById('file-detail-memo'),
    deleteFileBtn: document.getElementById('delete-file-btn'),
    fileDetailsActions: document.querySelector('.file-details-actions'),
    addFileModal: document.getElementById('add-file-modal'),
    selectFileBtn: document.getElementById('select-file-btn'),
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
    closeAddFile: document.getElementById('close-add-file'),
    // Movie search modal
    movieSearchBtn: document.getElementById('movie-search-btn'),
    movieSearchModal: document.getElementById('movie-search-modal'),
    movieSearchCategory: document.getElementById('movie-search-category'),
    movieSearchInput: document.getElementById('movie-search-input'),
    movieSearchModalBtn: document.getElementById('movie-search-modal-btn'),
    movieSearchLoading: document.getElementById('movie-search-loading'),
    movieSearchError: document.getElementById('movie-search-error'),
    movieSearchResults: document.getElementById('movie-search-results'),
    confirmMovieSearch: document.getElementById('confirm-movie-search'),
    cancelMovieSearch: document.getElementById('cancel-movie-search'),
    closeMovieSearch: document.getElementById('close-movie-search')
};

/**
 * 初始化
 */
async function init() {
    console.log('Detail page initialized');

    window.electronAPI.onLoadMovieDetail((movieData) => {
        console.log('Loading movie detail:', movieData);
        movieDataLoaded = true;
        loadMovieDetail(movieData);
    });

    window.electronAPI.onThemeChanged((theme) => {
        applyTheme(theme);
    });

    // 监听电影更新事件，刷新海报显示
    window.electronAPI.onMovieUpdated((updatedMovie) => {
        if (currentMovie && currentMovie.id === updatedMovie.id) {
            currentMovie = updatedMovie;
            if (updatedMovie.poster) {
                // 检查是否为外部URL（以http开头），如果是则跳过显示（避免CSP限制）
                if (updatedMovie.poster.startsWith('http://') || updatedMovie.poster.startsWith('https://')) {
                    elements.moviePoster.style.display = 'none';
                    elements.posterPlaceholder.style.display = 'flex';
                } else {
                    // 添加时间戳强制刷新缓存
                    const posterUrl = updatedMovie.poster + (updatedMovie.poster.includes('?') ? '&' : '?') + 't=' + Date.now();
                    elements.moviePoster.src = posterUrl;
                    elements.moviePoster.style.display = 'block';
                    elements.posterPlaceholder.style.display = 'none';
                }
            } else {
                elements.moviePoster.style.display = 'none';
                elements.posterPlaceholder.style.display = 'flex';
            }
        }
    });

    await loadTags();
    await loadCategories();
    await loadActors();
    await loadTheme();
    bindEvents();
    bindTabEvents();
    bindFileEvents();

    window.addEventListener('focus', () => {
        if (!movieDataLoaded) {
            console.log('Window focused but movie data not loaded, requesting...');
            window.electronAPI.getPendingMovieDetail().then(movieData => {
                if (movieData) {
                    console.log('Got movie data on focus:', movieData);
                    movieDataLoaded = true;
                    loadMovieDetail(movieData);
                }
            });
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
            tagsCache = tags;
        }
    } catch (error) {
        console.error('Error loading tags:', error);
    }
}

/**
 * 加载分类缓存
 */
async function loadCategories() {
    try {
        const categories = await window.electronAPI.getCategoriesFromCache();
        if (Array.isArray(categories)) {
            categoriesCache = categories;
        }
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

/**
 * 加载演员缓存
 */
async function loadActors() {
    try {
        const result = await window.electronAPI.getActors();
        if (result && !result.error) {
            actorsCache = result.actors || [];
        } else {
            console.error('Failed to load actors:', result.error);
            actorsCache = [];
        }
    } catch (error) {
        console.error('Error loading actors:', error);
        actorsCache = [];
    }
}

/**
 * 渲染已选中的演员（编辑模式）
 */
function renderSelectedActors() {
    let html = '';
    const MAX_ACTORS_PER_LINE = 6;

    // 渲染已选中的演员
    selectedActors.forEach((actorName, index) => {
        html += `
            <span class="tag tag-with-remove" data-actor-name="${actorName}">
                ${actorName}
                <span class="tag-remove" onclick="removeActorFromSelection('${actorName}'); return false;">&times;</span>
            </span>
        `;

        // 每6个演员添加换行（除了最后一个和+按钮前）
        if ((index + 1) % MAX_ACTORS_PER_LINE === 0 && index < selectedActors.length - 1) {
            html += '<br>';
        }
    });

    // 添加+按钮
    html += `<button class="tag-add-btn" onclick="openActorSelectorModal(); return false;">+</button>`;

    elements.movieActorsEdit.innerHTML = html;
}

/**
 * 从已选演员中移除
 */
function removeActorFromSelection(actorName) {
    const index = selectedActors.indexOf(actorName);
    if (index > -1) {
        selectedActors.splice(index, 1);
    }
    renderSelectedActors();
}

/**
 * 打开演员选择弹窗
 */
function openActorSelectorModal() {
    if (!elements.actorSelectorModal) {
        console.error('Actor selector modal not found');
        return;
    }

    // 重置搜索和分页状态
    actorSelectorSearchKeyword = '';
    actorSelectorCurrentPage = 1;

    // 清空搜索框
    if (elements.actorSelectorSearchInput) {
        elements.actorSelectorSearchInput.value = '';
    }

    // 渲染演员列表
    renderActorSelectorList();

    elements.actorSelectorModal.style.display = 'flex';
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
    let filteredActors = actorsCache;
    if (actorSelectorSearchKeyword) {
        const keyword = actorSelectorSearchKeyword.toLowerCase();
        filteredActors = actorsCache.filter(actor => {
            const nameMatch = actor.name && actor.name.toLowerCase().includes(keyword);
            const nicknameMatch = actor.nickname && actor.nickname.toLowerCase().includes(keyword);
            return nameMatch || nicknameMatch;
        });
    }

    // 计算分页
    const totalActors = filteredActors.length;
    const totalPages = Math.ceil(totalActors / ACTOR_SELECTOR_PAGE_SIZE) || 1;
    if (actorSelectorCurrentPage > totalPages) {
        actorSelectorCurrentPage = totalPages;
    }

    // 截取当前页的数据
    const startIndex = (actorSelectorCurrentPage - 1) * ACTOR_SELECTOR_PAGE_SIZE;
    const endIndex = startIndex + ACTOR_SELECTOR_PAGE_SIZE;
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
            const isSelected = selectedActors.includes(actor.name);
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

    elements.actorSelectorPageInfo.textContent = `第 ${actorSelectorCurrentPage} / ${totalPages} 页`;

    // 更新翻页按钮状态（使用class控制）
    if (elements.actorSelectorPrevBtn) {
        if (actorSelectorCurrentPage <= 1) {
            elements.actorSelectorPrevBtn.classList.add('disabled');
        } else {
            elements.actorSelectorPrevBtn.classList.remove('disabled');
        }
    }
    if (elements.actorSelectorNextBtn) {
        if (actorSelectorCurrentPage >= totalPages) {
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
    const index = selectedActors.indexOf(actorName);
    if (index > -1) {
        selectedActors.splice(index, 1);
    } else {
        selectedActors.push(actorName);
    }
    // 更新演员显示
    renderSelectedActors();
    // 更新列表中的选中状态
    const row = document.querySelector(`#actor-selector-list tr[data-actor-name="${actorName}"]`);
    if (row) {
        if (selectedActors.includes(actorName)) {
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
    if (elements.actorSelectorModal) {
        elements.actorSelectorModal.style.display = 'none';
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
 * 根据标签ID获取标签名称
 */
function getTagNameById(tagId) {
    const tag = tagsCache.find(t => t.id === tagId);
    return tag ? tag.name : tagId;
}

/**
 * Tab 切换事件
 */
function bindTabEvents() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            switchTab(tab);
        });
    });
}

/**
 * 切换 Tab
 */
function switchTab(tab) {
    currentTab = tab;

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });

    elements.tabMovieInfo.style.display = tab === 'movie-info' ? 'block' : 'none';
    elements.tabMovieFiles.style.display = tab === 'movie-files' ? 'block' : 'none';

    if (tab === 'movie-files' && isEditMode) {
        elements.addFileBtn.style.display = 'block';
    } else {
        elements.addFileBtn.style.display = 'none';
    }

    if (tab === 'movie-files' && !isEditMode) {
        elements.fileDetailsActions.style.display = 'none';
    }
}

/**
 * 加载电影详情
 */
function loadMovieDetail(movie) {
    if (isEditMode) {
        pendingMovieData = movie;
        const switchConfirmed = confirm('当前有未保存的编辑，是否放弃更改并切换到选中的电影？\n\n点击"确定"放弃更改，点击"取消"继续编辑当前电影。');
        if (switchConfirmed) {
            discardChangesAndSwitch(movie);
        } else {
            pendingMovieData = null;
        }
        return;
    }

    currentMovie = movie;
    fromBox = movie.fromBox || false;
    boxName = movie.boxName || '';
    selectedFileIndex = -1;
    editFileset = [];

    elements.movieTitle.textContent = movie.name;
    document.title = `${movie.name} - 电影详情`;

    elements.movieId.textContent = movie.movieId || '';

    // 显示电影时长
    const duration = movie.videoDuration;
    if (duration) {
        elements.movieDuration.textContent = formatDuration(duration);
    } else {
        elements.movieDuration.textContent = '未知';
    }

    if (movie.poster) {
        // 检查是否为外部URL（以http开头），如果是则跳过显示（避免CSP限制）
        if (movie.poster.startsWith('http://') || movie.poster.startsWith('https://')) {
            // 外部URL暂不直接显示，等待用户通过电影搜索功能下载
            elements.moviePoster.style.display = 'none';
            elements.posterPlaceholder.style.display = 'flex';
        } else {
            // 添加时间戳强制刷新缓存
            const posterUrl = movie.poster + (movie.poster.includes('?') ? '&' : '?') + 't=' + Date.now();
            elements.moviePoster.src = posterUrl;
            elements.moviePoster.style.display = 'block';
            elements.posterPlaceholder.style.display = 'none';
        }
    } else {
        elements.moviePoster.style.display = 'none';
        elements.posterPlaceholder.style.display = 'flex';
    }

    elements.movieCategory.textContent = getCategoryName(movie.category);
    elements.moviePublishDate.textContent = movie.publishDate || '未知';
    elements.movieDirector.textContent = movie.director || '未知';
    // 渲染演员（每行最多6个）
    renderActorsForDisplay(movie.actors);
    elements.movieStudio.textContent = movie.studio || '未知';
    renderTags(movie.tag || []);
    elements.movieDescription.textContent = movie.description || '暂无描述';

    // 处理fileset：如果original_filename存在但fileset中没有Main文件，则创建一个
    let fileset = movie.fileset || [];
    if (movie.original_filename) {
        const hasMainFile = fileset.some(f => f.type === 'Main');
        if (!hasMainFile) {
            // 从original_filename提取文件名
            const fullPath = movie.original_filename;
            const fileName = fullPath.split(/[/\\]/).pop();
            fileset = [{
                filename: fileName,
                fullpath: fullPath,
                type: 'Main',
                videoCodec: movie.videoCodec || '',
                videoWidth: movie.videoWidth || '',
                videoHeight: movie.videoHeight || '',
                videoDuration: movie.videoDuration || ''
            }, ...fileset];
        }
    }

    // 更新currentMovie.fileset，以便在编辑模式下能正确初始化editFileset
    currentMovie.fileset = fileset;

    renderMovieFiles(fileset);
    clearFileDetails();

    if (fromBox) {
        elements.normalActions.style.display = 'none';
        elements.boxActions.style.display = 'flex';
        elements.boxInfoSection.style.display = 'block';

        const status = movie.boxStatus || 'unwatched';
        elements.boxStatus.textContent = getStatusText(status);
        elements.boxStatus.className = `value box-status-tag-display ${status}`;

        // 更新评分星星
        updateBoxRating(movie.boxRating || 0);
    } else {
        elements.normalActions.style.display = 'flex';
        elements.boxActions.style.display = 'none';
        elements.boxInfoSection.style.display = 'none';
    }

    elements.detailFooter.style.display = 'none';
    switchTab('movie-info');
}

/**
 * 渲染标签
 */
function renderTags(tags) {
    if (!tags || tags.length === 0) {
        elements.movieTags.innerHTML = '<span class="tag">无</span>';
        return;
    }

    const html = tags.map(tagId =>
        `<span class="tag">${getTagNameById(tagId)}</span>`
    ).join('');

    elements.movieTags.innerHTML = html;
}

/**
 * 渲染演员显示（每行最多6个）
 * @param {Array|string} actors - 演员数组或逗号分隔的字符串
 */
function renderActorsForDisplay(actors) {
    if (!actors || (Array.isArray(actors) && actors.length === 0) || (typeof actors === 'string' && actors.trim() === '')) {
        elements.movieActorsDisplay.innerHTML = '<span class="actor-tag">无</span>';
        return;
    }

    // 统一转换为数组
    let actorsArray;
    if (Array.isArray(actors)) {
        actorsArray = actors;
    } else {
        actorsArray = actors.split(',').map(a => a.trim()).filter(a => a);
    }

    if (actorsArray.length === 0) {
        elements.movieActorsDisplay.innerHTML = '<span class="actor-tag">无</span>';
        return;
    }

    const MAX_ACTORS_PER_LINE = 6;
    let html = '';
    let lineBreakAdded = false;

    actorsArray.forEach((actor, index) => {
        html += `<span class="actor-tag">${actor}</span>`;

        // 每6个演员添加换行（除了最后一个）
        if ((index + 1) % MAX_ACTORS_PER_LINE === 0 && index < actorsArray.length - 1) {
            html += '<br>';
            lineBreakAdded = true;
        }
    });

    elements.movieActorsDisplay.innerHTML = html;
}

/**
 * 渲染电影关联文件
 */
function renderMovieFiles(files) {
    if (!files || files.length === 0) {
        elements.filesCount.textContent = '(0)';
        elements.movieFilesList.innerHTML = '<div class="no-files">暂无关联文件</div>';
        return;
    }

    elements.filesCount.textContent = `(${files.length})`;

    const typeLabels = {
        'Main': '电影正片',
        'Preview': '预览片'
    };

    const html = files.map((file, index) => {
        const isMainFile = file.type === 'Main';

        let videoInfoStr = '';

        const parts = [];
        if (file.videoCodec) parts.push(file.videoCodec);
        if (file.videoWidth && file.videoHeight) parts.push(`${file.videoWidth}x${file.videoHeight}`);
        if (file.videoDuration) {
            const durationStr = formatDuration(file.videoDuration);
            parts.push(durationStr);
        }
        if (parts.length > 0) {
            videoInfoStr = `<span class="file-video-info">${parts.join(' | ')}</span>`;
        }


        return `
        <div class="movie-file-item ${index === selectedFileIndex ? 'selected' : ''}" data-index="${index}">
            <span class="file-icon">📄</span>
            <div class="file-info">
                <div class="file-name" title="${file.filename || ''}">${file.filename || '未知'}</div>
                ${videoInfoStr}
                ${file.memo ? `<div class="file-memo">${file.memo}</div>` : ''}
            </div>
            <span class="file-type-badge ${file.type?.toLowerCase() || ''}">${typeLabels[file.type] || file.type || '未知'}</span>
        </div>
        `;
    }).join('');

    elements.movieFilesList.innerHTML = html;
    elements.movieFilesList.querySelectorAll('.movie-file-item').forEach(item => {
        item.addEventListener('click', () => {
            const index = parseInt(item.dataset.index);
            selectFileItem(index);
        });
    });
}

/**
 * 选中文件项
 */
function selectFileItem(index) {
    // 如果在编辑模式下，先保存当前选中文件的更改
    if (isEditMode && selectedFileIndex >= 0 && selectedFileIndex < editFileset.length) {
        editFileset[selectedFileIndex].memo = elements.fileDetailMemo.value;
    }

    selectedFileIndex = index;
    const files = isEditMode ? editFileset : (currentMovie.fileset || []);

    document.querySelectorAll('.movie-file-item').forEach(item => {
        const itemIndex = parseInt(item.dataset.index);
        item.classList.toggle('selected', itemIndex === index);
    });

    if (index >= 0 && index < files.length) {
        const file = files[index];

        elements.fileDetailsEmpty.style.display = 'none';
        elements.fileDetailsForm.style.display = 'flex';

        // 显示文件路径
        elements.fileDetailOriginal.value = file.fullpath || '';

        // 显示视频信息（所有文件类型）
        elements.fileDetailCodec.value = file.videoCodec || '';
        elements.fileDetailResolution.value = (file.videoWidth && file.videoHeight)
            ? `${file.videoWidth}x${file.videoHeight}` : '';
        elements.fileDetailDuration.value = file.videoDuration
            ? formatDuration(file.videoDuration) : '';

        elements.fileDetailMemo.value = file.memo || '';

        if (isEditMode) {
            elements.fileDetailMemo.readOnly = false;
            elements.fileDetailsActions.style.display = 'flex';
        } else {
            elements.fileDetailMemo.readOnly = true;
            elements.fileDetailsActions.style.display = 'none';
        }
    } else {
        clearFileDetails();
    }
}

/**
 * 解析fileinfo XML并提取视频信息
 * @param {string} fileinfoXml - fileinfo XML字符串
 * @returns {object} 包含codec, width, height, durationinseconds的对象
 */
function parseFileinfo(fileinfoXml) {
    if (!fileinfoXml) {
        return { codec: '', width: '', height: '', durationinseconds: '' };
    }

    try {
        // 提取codec
        const codecMatch = fileinfoXml.match(/<codec>([^<]*)<\/codec>/i);
        const codec = codecMatch ? codecMatch[1].toUpperCase() : '';

        // 提取width
        const widthMatch = fileinfoXml.match(/<width>([^<]*)<\/width>/i);
        const width = widthMatch ? widthMatch[1] : '';

        // 提取height
        const heightMatch = fileinfoXml.match(/<height>([^<]*)<\/height>/i);
        const height = heightMatch ? heightMatch[1] : '';

        // 提取durationinseconds
        const durationMatch = fileinfoXml.match(/<durationinseconds>([^<]*)<\/durationinseconds>/i);
        const durationinseconds = durationMatch ? durationMatch[1] : '';

        return { codec, width, height, durationinseconds };
    } catch (e) {
        console.error('Error parsing fileinfo:', e);
        return { codec: '', width: '', height: '', durationinseconds: '' };
    }
}

/**
 * 清除文件详情
 */
function clearFileDetails() {
    selectedFileIndex = -1;
    elements.fileDetailsEmpty.style.display = 'flex';
    elements.fileDetailsForm.style.display = 'none';
    elements.fileDetailOriginal.value = '';
    elements.fileDetailCodec.value = '';
    elements.fileDetailResolution.value = '';
    elements.fileDetailDuration.value = '';
    elements.fileDetailMemo.value = '';
}

/**
 * 渲染编辑模式下的标签组
 */
function renderEditTags(selectedTagIds) {
    let html = '';

    selectedTagIds.forEach(tagId => {
        const tagName = getTagNameById(tagId);
        html += `
            <span class="tag tag-with-remove" data-tag-id="${tagId}">
                ${tagName}
                <span class="tag-remove" onclick="removeTag('${tagId}')">&times;</span>
            </span>
        `;
    });

    html += `<button class="tag-add-btn" onclick="openTagSelector()">+</button>`;

    elements.movieTags.innerHTML = html;
}

/**
 * 移除标签
 */
function removeTag(tagId) {
    const index = editData.tags.indexOf(tagId);
    if (index > -1) {
        editData.tags.splice(index, 1);
        renderEditTags(editData.tags);
    }
}

/**
 * 打开标签选择弹窗
 */
function openTagSelector() {
    const modal = document.getElementById('tag-selector-modal');
    if (!modal) {
        console.error('Tag selector modal not found');
        return;
    }

    const container = document.getElementById('tag-selector-list');
    let html = '';
    tagsCache.forEach(tag => {
        const isSelected = editData.tags.includes(tag.id);
        html += `
            <label class="tag-checkbox ${isSelected ? 'selected' : ''}">
                <input type="checkbox" value="${tag.id}" ${isSelected ? 'checked' : ''} onclick="toggleTagSelection('${tag.id}')">
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
function toggleTagSelection(tagId) {
    const index = editData.tags.indexOf(tagId);
    if (index > -1) {
        editData.tags.splice(index, 1);
    } else {
        editData.tags.push(tagId);
    }
    renderEditTags(editData.tags);
    const checkbox = document.querySelector(`#tag-selector-list input[value="${tagId}"]`);
    if (checkbox) {
        const label = checkbox.closest('.tag-checkbox');
        if (editData.tags.includes(tagId)) {
            label.classList.add('selected');
        } else {
            label.classList.remove('selected');
        }
    }
}

/**
 * 关闭标签选择弹窗
 */
function closeTagSelector() {
    const modal = document.getElementById('tag-selector-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

/**
 * 确认标签选择
 */
function confirmTagSelection() {
    closeTagSelector();
}

/**
 * 更新盒子评分显示
 */
function updateBoxRating(rating) {
    const stars = elements.boxRating.querySelectorAll('.star');
    stars.forEach(star => {
        const starRating = parseInt(star.dataset.rating);
        if (starRating <= rating) {
            star.textContent = '⭐';
            star.classList.add('active');
        } else {
            star.textContent = '☆';
            star.classList.remove('active');
        }
    });
}

/**
 * 打开状态修改弹窗
 */
function openStatusModal() {
    if (!fromBox) return;

    const status = currentMovie.boxStatus || 'unwatched';
    const radioButtons = document.querySelectorAll('input[name="edit-status"]');
    radioButtons.forEach(radio => {
        radio.checked = radio.value === status;
    });

    elements.editStatusModal.style.display = 'flex';
}

/**
 * 关闭状态修改弹窗
 */
function closeStatusModal() {
    elements.editStatusModal.style.display = 'none';
}

/**
 * 确认状态修改
 */
async function confirmStatusEdit() {
    if (!fromBox || !boxName) return;

    const selectedRadio = document.querySelector('input[name="edit-status"]:checked');
    if (!selectedRadio) return;

    const newStatus = selectedRadio.value;

    try {
        const result = await window.electronAPI.updateMovieInBox({
            boxName: boxName,
            category: currentMovie.category,
            movieId: currentMovie.movieId,
            movieInfo: {
                status: newStatus
            }
        });

        if (!result.error) {
            closeStatusModal();
            currentMovie.boxStatus = newStatus;
            elements.boxStatus.textContent = getStatusText(newStatus);
            elements.boxStatus.className = `value box-status-tag-display ${newStatus}`;
        } else {
            alert('修改状态失败: ' + result.error);
        }
    } catch (error) {
        console.error('Error updating movie status:', error);
        alert('修改状态失败: ' + error.message);
    }
}

/**
 * 进入编辑模式
 */
function enterEditMode() {
    isEditMode = true;
    editFileset = JSON.parse(JSON.stringify(currentMovie.fileset || []));

    window.electronAPI.resizeWindow(1120, 750);
    window.electronAPI.setMinSize(840, 750);

    // 初始化演员选择（处理数组或字符串）
    if (currentMovie.actors) {
        if (Array.isArray(currentMovie.actors)) {
            selectedActors = [...currentMovie.actors];
        } else {
            selectedActors = currentMovie.actors.split(',').map(a => a.trim()).filter(a => a);
        }
    } else {
        selectedActors = [];
    }

    editData = {
        name: currentMovie.name,
        publishDate: currentMovie.publishDate || '',
        duration: currentMovie.videoDuration || '',
        director: currentMovie.director || '',
        actors: currentMovie.actors || '',
        studio: currentMovie.studio || '',
        tags: [...(currentMovie.tag || [])],
        description: currentMovie.description || '',
        userComment: currentMovie.userComment || ''
    };

    elements.movieTitleContainer.innerHTML = `<input type="text" id="edit-name" class="edit-input" value="${editData.name}">`;
    elements.movieDurationContainer.innerHTML = `<input type="text" id="edit-duration" class="edit-input" value="${editData.duration}" placeholder="时长（秒）">`;
    elements.moviePublishDateContainer.innerHTML = `<input type="number" id="edit-publish-date" class="edit-input" value="${editData.publishDate}" placeholder="年份" min="1900" max="2100">`;
    elements.movieDirectorContainer.innerHTML = `<input type="text" id="edit-director" class="edit-input" value="${editData.director}" placeholder="导演">`;

    // 演员使用选择器方式
    elements.movieActorsDisplay.style.display = 'none';
    elements.movieActorsEdit.style.display = 'flex';
    renderSelectedActors();

    elements.movieStudioContainer.innerHTML = `<input type="text" id="edit-studio" class="edit-input" value="${editData.studio}" placeholder="制片公司">`;

    renderEditTags(editData.tags);
    elements.movieDescriptionContainer.innerHTML = `<textarea id="edit-description" class="edit-textarea">${editData.description}</textarea>`;

    elements.normalActions.style.display = 'none';
    elements.boxActions.style.display = 'none';
    elements.detailFooter.style.display = 'flex';
    elements.uploadPosterBtn.style.display = 'block';
    elements.moviePoster.style.cursor = 'pointer';
    elements.moviePoster.title = '点击上传新海报';
    elements.movieSearchBtn.style.display = 'inline-block';

    if (currentTab === 'movie-files') {
        elements.addFileBtn.style.display = 'block';
    }

    bindEditModeEvents();
    window.electronAPI.setDetailEditMode(true);
}

/**
 * 退出编辑模式
 */
function exitEditMode() {
    isEditMode = false;
    editFileset = [];
    selectedFileIndex = -1;

    window.electronAPI.resizeWindow(1120, 750);
    window.electronAPI.setMinSize(840, 750);

    elements.movieTitleContainer.innerHTML = `<span id="movie-title">${currentMovie.name}</span>`;
    elements.movieTitle = document.getElementById('movie-title');

    // 恢复时长显示
    const duration = currentMovie.videoDuration;
    elements.movieDurationContainer.innerHTML = `<span id="movie-duration" class="value">${duration ? formatDuration(duration) : '未知'}</span>`;
    elements.movieDuration = document.getElementById('movie-duration');

    elements.moviePublishDateContainer.innerHTML = `<span id="movie-publish-date">${currentMovie.publishDate || '未知'}</span>`;
    elements.moviePublishDate = document.getElementById('movie-publish-date');

    elements.movieDirectorContainer.innerHTML = `<span id="movie-director" class="value">${currentMovie.director || ''}</span>`;
    elements.movieDirector = document.getElementById('movie-director');

    // 恢复演员显示
    renderActorsForDisplay(currentMovie.actors);
    elements.movieActorsDisplay.style.display = 'block';
    elements.movieActorsEdit.style.display = 'none';

    elements.movieStudioContainer.innerHTML = `<span id="movie-studio" class="value">${currentMovie.studio || ''}</span>`;
    elements.movieStudio = document.getElementById('movie-studio');

    renderTags(currentMovie.tags || []);

    elements.movieDescriptionContainer.innerHTML = `<p id="movie-description" class="description">${currentMovie.description || '暂无描述'}</p>`;
    elements.movieDescription = document.getElementById('movie-description');

    elements.detailFooter.style.display = 'none';
    elements.addFileBtn.style.display = 'none';
    elements.uploadPosterBtn.style.display = 'none';
    elements.movieSearchBtn.style.display = 'none';
    elements.moviePoster.style.cursor = 'default';
    elements.moviePoster.title = '';
    elements.moviePoster.onclick = null;
    elements.posterPlaceholder.onclick = null;

    if (fromBox) {
        elements.boxActions.style.display = 'flex';
        elements.normalActions.style.display = 'none';
    } else {
        elements.normalActions.style.display = 'flex';
        elements.boxActions.style.display = 'none';
    }

    clearFileDetails();
    renderMovieFiles(currentMovie.fileset || []);

    window.electronAPI.setDetailEditMode(false);
}

/**
 * 绑定编辑模式事件
 */
function bindEditModeEvents() {
    elements.uploadPosterBtn.onclick = () => {
        elements.posterUploadInput.click();
    };

    elements.moviePoster.onclick = () => {
        elements.posterUploadInput.click();
    };

    elements.posterPlaceholder.onclick = () => {
        elements.posterUploadInput.click();
    };

    elements.posterUploadInput.onchange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            try {
                const base64 = await fileToBase64(file);
                editData.coverImage = base64;
                elements.moviePoster.src = base64;
                elements.moviePoster.style.display = 'block';
                elements.posterPlaceholder.style.display = 'none';
            } catch (error) {
                console.error('Error converting image to base64:', error);
                alert('图片处理失败: ' + error.message);
            }
        }
    };
}

/**
 * 保存编辑
 */
async function saveEdit() {
    const nameInput = document.getElementById('edit-name');
    const publishDateInput = document.getElementById('edit-publish-date');
    const durationInput = document.getElementById('edit-duration');
    const directorInput = document.getElementById('edit-director');
    const studioInput = document.getElementById('edit-studio');
    const descriptionInput = document.getElementById('edit-description');

    if (selectedFileIndex >= 0 && selectedFileIndex < editFileset.length) {
        editFileset[selectedFileIndex].memo = elements.fileDetailMemo.value;
    }

    // 从 fileset 中提取视频信息（从 Main 类型文件）
    const mainFile = editFileset.find(f => f.type === 'Main');
    const videoCodec = mainFile ? (mainFile.videoCodec || '') : (currentMovie.videoCodec || '');
    const videoWidth = mainFile ? (mainFile.videoWidth || '') : (currentMovie.videoWidth || '');
    const videoHeight = mainFile ? (mainFile.videoHeight || '') : (currentMovie.videoHeight || '');
    // 优先使用手动输入的时长，其次使用主文件的时长，最后使用现有数据
    const manualDuration = durationInput ? durationInput.value.trim() : '';
    const videoDuration = manualDuration || (mainFile ? (mainFile.videoDuration || '') : '') || (currentMovie.videoDuration || '');
    const originalFilename = mainFile ? (mainFile.fullpath || '') : (currentMovie.original_filename || '');

    // 确保 folderName 存在，如果缺失则从 id 中提取 (格式: category-folderName)
    let folderName = currentMovie.folderName;
    if (!folderName && currentMovie.id) {
        const parts = currentMovie.id.split('-');
        if (parts.length >= 2) {
            folderName = parts.slice(1).join('-');
        }
    }

    const updatedData = {
        ...currentMovie,
        folderName: folderName,
        name: nameInput ? nameInput.value : editData.name,
        publishDate: publishDateInput ? publishDateInput.value : editData.publishDate,
        director: directorInput ? directorInput.value : editData.director,
        actors: [...selectedActors],
        studio: studioInput ? studioInput.value : editData.studio,
        tags: [...editData.tags],
        description: descriptionInput ? descriptionInput.value : editData.description,
        userComment: currentMovie.userComment || '',
        fileset: editFileset,
        original_filename: originalFilename,
        videoCodec: videoCodec,
        videoWidth: videoWidth,
        videoHeight: videoHeight,
        videoDuration: videoDuration
    };

    // 如果有封面路径，添加到更新数据中
    if (editData.coverPath) {
        updatedData.coverPath = editData.coverPath;
    }
    if (editData.coverImage) {
        updatedData.coverImage = editData.coverImage;
    }

    try {
        const result = await window.electronAPI.saveMovieEdit(updatedData);
        if (!result.error) {
            // 保存成功后，重新获取电影数据以刷新缓存和显示
            const movieDetail = await window.electronAPI.getMovieDetail(currentMovie.id);
            if (movieDetail && !movieDetail.error) {
                currentMovie = movieDetail;
            } else {
                currentMovie = updatedData;
            }
            exitEditMode();
            loadMovieDetail(currentMovie);
        } else {
            alert('保存失败: ' + result.error);
        }
    } catch (error) {
        console.error('Error saving edit:', error);
        alert('保存失败: ' + error.message);
    }
}

/**
 * 取消编辑
 */
function cancelEdit() {
    exitEditMode();
}

/**
 * 放弃更改并切换电影
 */
function discardChangesAndSwitch(movie) {
    isEditMode = false;
    pendingMovieData = null;
    window.electronAPI.setDetailEditMode(false);
    window.electronAPI.resizeWindow(1120, 750);
    window.electronAPI.setMinSize(840, 750);
    loadMovieDetail(movie);
}

/**
 * 文件事件绑定
 */
function bindFileEvents() {
    elements.addFileBtn.addEventListener('click', openAddFileModal);
    elements.selectFileBtn.addEventListener('click', selectFileForAdd);
    elements.confirmAddFile.addEventListener('click', confirmAddFile);
    elements.cancelAddFile.addEventListener('click', closeAddFileModal);
    elements.closeAddFile.addEventListener('click', closeAddFileModal);
    elements.deleteFileBtn.addEventListener('click', deleteSelectedFile);

    elements.addFileModal.addEventListener('click', (e) => {
        if (e.target === elements.addFileModal) {
            closeAddFileModal();
        }
    });
}

/**
 * 打开添加文件弹窗
 */
function openAddFileModal() {
    elements.selectedFileName.textContent = '';
    elements.selectedFileInfo.style.display = 'none';
    elements.newFileFullpath.value = '';
    elements.newFileType.value = 'Main';
    elements.newFileCodec.value = '';
    elements.newFileResolution.value = '';
    elements.newFileDuration.value = '';
    elements.newFileMemo.value = '';
    elements.addFileModal.style.display = 'flex';
}

/**
 * 关闭添加文件弹窗
 */
function closeAddFileModal() {
    elements.addFileModal.style.display = 'none';
}

/**
 * 选择文件
 */
async function selectFileForAdd() {
    const result = await window.electronAPI.selectFile();
    if (!result.canceled && result.path) {
        const filePath = result.path;
        const fileName = result.name || filePath.split(/[/\\]/).pop();

        elements.selectedFileName.textContent = fileName;
        elements.selectedFileInfo.style.display = 'block';
        elements.newFileFullpath.value = filePath;
        elements.newFileType.value = 'Main';
        elements.newFileCodec.value = '';
        elements.newFileResolution.value = '';
        elements.newFileDuration.value = '';
        elements.newFileMemo.value = '';
    }
}

/**
 * 确认添加文件
 */
function confirmAddFile() {
    if (!elements.newFileFullpath.value) {
        alert('请选择文件');
        return;
    }

    const fileType = elements.newFileType.value;

    // 检查是否已存在Main类型的文件
    if (fileType === 'Main') {
        const hasMainFile = editFileset.some(f => f.type === 'Main');
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

    const newFile = {
        filename: fileName,
        fullpath: fullPath,
        type: fileType,
        memo: elements.newFileMemo.value,
        videoCodec: elements.newFileCodec.value,
        videoWidth: videoWidth,
        videoHeight: videoHeight,
        videoDuration: elements.newFileDuration.value.trim()
    };

    editFileset.push(newFile);
    closeAddFileModal();
    renderMovieFiles(editFileset);
    selectFileItem(editFileset.length - 1);
}

/**
 * 删除选中的文件
 */
function deleteSelectedFile() {
    if (selectedFileIndex < 0 || selectedFileIndex >= editFileset.length) {
        return;
    }

    const file = editFileset[selectedFileIndex];
    const confirmed = confirm(`确定删除文件 "${file.filename}" 吗？\n\n注意：这只会删除文件关联记录，不会删除原始文件。`);

    if (confirmed) {
        editFileset.splice(selectedFileIndex, 1);
        clearFileDetails();
        renderMovieFiles(editFileset);
    }
}

/**
 * 格式化文件大小
 */
function formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 绑定事件
 */
function bindEvents() {
    elements.closeBtn.addEventListener('click', () => {
        if (isEditMode) {
            const confirmed = confirm('当前编辑未保存，是否强制退出？');
            if (confirmed) {
                window.electronAPI.setDetailEditMode(false);
                window.close();
            }
        } else {
            window.close();
        }
    });

    elements.playBtn.addEventListener('click', async () => {
        try {
            await window.electronAPI.playMovie(currentMovie.path, currentMovie.category);
        } catch (error) {
            console.error('Error playing movie:', error);
            alert('播放电影失败: ' + error.message);
        }
    });

    elements.editBtn.addEventListener('click', () => {
        enterEditMode();
    });

    elements.saveEditBtn.addEventListener('click', () => {
        saveEdit();
    });

    elements.cancelEditBtn.addEventListener('click', () => {
        cancelEdit();
    });

    elements.deleteBtn.addEventListener('click', async () => {
        const movieName = currentMovie.name;
        const confirmed = confirm(`电影删除\n\n是否确认删除：${movieName}`);

        if (confirmed) {
            try {
                const result = await window.electronAPI.deleteMovie({
                    id: currentMovie.id,
                    category: currentMovie.category,
                    folderName: currentMovie.folderName
                });

                if (!result.error) {
                    window.electronAPI.onRefreshLibrary(() => {});
                    window.close();
                } else {
                    alert('删除失败: ' + result.error);
                }
            } catch (error) {
                console.error('Error deleting movie:', error);
                alert('删除失败: ' + error.message);
            }
        }
    });

    elements.addToBoxBtn.addEventListener('click', async () => {
        try {
            const boxes = await window.electronAPI.getAllBoxes();

            if (!boxes || boxes.length === 0) {
                alert('请先创建电影盒子');
                return;
            }

            elements.boxSelect.innerHTML = '<option value="">选择电影盒子</option>';
            boxes.forEach(box => {
                const option = document.createElement('option');
                option.value = box.name;
                option.textContent = `${box.name} (${box.movieCount}部电影)`;
                elements.boxSelect.appendChild(option);
            });

            elements.addToBoxModal.style.display = 'flex';
        } catch (error) {
            console.error('Error loading boxes:', error);
            alert('加载盒子失败: ' + error.message);
        }
    });

    elements.confirmAddToBox.addEventListener('click', async () => {
        const selectedBoxName = elements.boxSelect.value;

        if (!selectedBoxName) {
            alert('请选择电影盒子');
            return;
        }

        try {
            const result = await window.electronAPI.addMovieToBox({
                boxName: selectedBoxName,
                category: currentMovie.category,
                movieInfo: {
                    id: currentMovie.movieId,
                    status: 'unwatched',
                    rating: 0
                }
            });

            if (!result.error) {
                alert('添加成功');
                elements.addToBoxModal.style.display = 'none';
            } else {
                alert('添加失败: ' + result.error);
            }
        } catch (error) {
            console.error('Error adding to box:', error);
            alert('添加失败: ' + error.message);
        }
    });

    elements.cancelAddToBox.addEventListener('click', () => {
        elements.addToBoxModal.style.display = 'none';
    });

    elements.addToBoxModal.addEventListener('click', (e) => {
        if (e.target === elements.addToBoxModal) {
            elements.addToBoxModal.style.display = 'none';
        }
    });

    elements.removeFromBoxBtn.addEventListener('click', async () => {
        if (!fromBox || !boxName) return;

        const movieName = currentMovie.name;
        const confirmed = confirm(`确定要从电影盒子"${boxName}"中移除电影"${movieName}"吗？`);

        if (confirmed) {
            try {
                const result = await window.electronAPI.removeMovieFromBox({
                    boxName: boxName,
                    category: currentMovie.category,
                    movieId: currentMovie.movieId
                });

                if (!result.error) {
                    window.close();
                } else {
                    alert('移除失败: ' + result.error);
                }
            } catch (error) {
                console.error('Error removing movie from box:', error);
                alert('移除失败: ' + error.message);
            }
        }
    });

    elements.playBtnBox.addEventListener('click', async () => {
        try {
            await window.electronAPI.playMovie(currentMovie.path, currentMovie.category);
        } catch (error) {
            console.error('Error playing movie:', error);
            alert('播放电影失败: ' + error.message);
        }
    });

    elements.boxStatus.addEventListener('click', () => {
        openStatusModal();
    });

    elements.editStatusActionBtn.addEventListener('click', () => {
        openStatusModal();
    });

    elements.confirmEditStatus.addEventListener('click', async () => {
        await confirmStatusEdit();
    });

    elements.cancelEditStatus.addEventListener('click', () => {
        closeStatusModal();
    });

    elements.editStatusModal.addEventListener('click', (e) => {
        if (e.target === elements.editStatusModal) {
            closeStatusModal();
        }
    });

    // 盒子评分星星点击
    elements.boxRating.querySelectorAll('.star').forEach(star => {
        star.addEventListener('click', async () => {
            if (!fromBox) return;
            const rating = parseInt(star.dataset.rating);
            const newRating = currentMovie.boxRating === rating ? 0 : rating;
            const result = await window.electronAPI.updateMovieInBox({
                boxName: boxName,
                category: currentMovie.category,
                movieId: currentMovie.movieId,
                movieInfo: {
                    rating: newRating
                }
            });
            if (!result.error) {
                currentMovie.boxRating = newRating;
                updateBoxRating(newRating);
            }
        });
    });

    elements.boxRating.addEventListener('mouseleave', () => {
        if (!fromBox) return;
        updateBoxRating(currentMovie.boxRating || 0);
    });

    const tagSelectorModal = document.getElementById('tag-selector-modal');
    if (tagSelectorModal) {
        tagSelectorModal.addEventListener('click', (e) => {
            if (e.target === tagSelectorModal) {
                closeTagSelector();
            }
        });
    }

    const closeTagSelectorBtn = document.getElementById('close-tag-selector');
    if (closeTagSelectorBtn) {
        closeTagSelectorBtn.addEventListener('click', () => {
            closeTagSelector();
        });
    }

    const cancelTagSelectionBtn = document.getElementById('cancel-tag-selection');
    if (cancelTagSelectionBtn) {
        cancelTagSelectionBtn.addEventListener('click', () => {
            closeTagSelector();
        });
    }

    // 演员选择弹窗事件
    if (elements.closeActorSelector) {
        elements.closeActorSelector.addEventListener('click', () => {
            closeActorSelectorModal();
        });
    }

    if (elements.cancelActorSelection) {
        elements.cancelActorSelection.addEventListener('click', () => {
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
            actorSelectorSearchKeyword = elements.actorSelectorSearchInput.value.trim();
            actorSelectorCurrentPage = 1;
            renderActorSelectorList();
        });
    }

    if (elements.actorSelectorClearBtn) {
        elements.actorSelectorClearBtn.addEventListener('click', () => {
            elements.actorSelectorSearchInput.value = '';
            actorSelectorSearchKeyword = '';
            actorSelectorCurrentPage = 1;
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
                actorSelectorSearchKeyword = elements.actorSelectorSearchInput.value.trim();
                actorSelectorCurrentPage = 1;
                renderActorSelectorList();
            }
        });
    }

    // 演员选择弹窗分页事件
    if (elements.actorSelectorPrevBtn) {
        elements.actorSelectorPrevBtn.addEventListener('click', () => {
            if (actorSelectorCurrentPage > 1) {
                actorSelectorCurrentPage--;
                renderActorSelectorList();
            }
        });
    }

    if (elements.actorSelectorNextBtn) {
        elements.actorSelectorNextBtn.addEventListener('click', () => {
            // 计算总页数
            let filteredActors = actorsCache;
            if (actorSelectorSearchKeyword) {
                const keyword = actorSelectorSearchKeyword.toLowerCase();
                filteredActors = actorsCache.filter(actor => {
                    return actor.name.toLowerCase().includes(keyword) ||
                        (actor.nickname && actor.nickname.toLowerCase().includes(keyword));
                });
            }
            const totalPages = Math.ceil(filteredActors.length / ACTOR_SELECTOR_PAGE_SIZE);
            if (actorSelectorCurrentPage < totalPages) {
                actorSelectorCurrentPage++;
                renderActorSelectorList();
            }
        });
    }

    // 电影搜索弹窗事件
    if (elements.movieSearchBtn) {
        elements.movieSearchBtn.addEventListener('click', () => {
            openMovieSearchModal();
        });
    }

    if (elements.closeMovieSearch) {
        elements.closeMovieSearch.addEventListener('click', () => {
            closeMovieSearchModal();
        });
    }

    if (elements.cancelMovieSearch) {
        elements.cancelMovieSearch.addEventListener('click', () => {
            closeMovieSearchModal();
        });
    }

    if (elements.confirmMovieSearch) {
        elements.confirmMovieSearch.addEventListener('click', () => {
            confirmMovieSearch();
        });
    }

    if (elements.movieSearchModal) {
        elements.movieSearchModal.addEventListener('click', (e) => {
            if (e.target === elements.movieSearchModal) {
                closeMovieSearchModal();
            }
        });
    }

    if (elements.movieSearchModalBtn) {
        elements.movieSearchModalBtn.addEventListener('click', () => {
            searchMovieMovies();
        });
    }

    if (elements.movieSearchInput) {
        elements.movieSearchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                searchMovieMovies();
            }
        });
    }
}

/**
 * 电影搜索弹窗：打开弹窗
 */
async function openMovieSearchModal() {
    if (!elements.movieSearchModal) {
        console.error('Movie search modal not found');
        return;
    }

    // 显示弹窗
    elements.movieSearchModal.style.display = 'flex';

    // 加载分类列表
    await loadCategoriesForMovieSearch();

    // 重置搜索表单
    resetMovieSearchForm();

    // 自动带入当前电影名称
    if (currentMovie && currentMovie.name) {
        elements.movieSearchInput.value = currentMovie.name;
    }

    // 聚焦到搜索输入框
    elements.movieSearchInput.focus();
}

/**
 * 电影搜索弹窗：加载分类列表
 */
async function loadCategoriesForMovieSearch() {
    try {
        const categories = await window.electronAPI.getCategories();
        if (categories && categories.length > 0) {
            // 按sortOrder排序
            categories.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

            let optionsHtml = '<option value="">所有分类</option>';
            categories.forEach(cat => {
                optionsHtml += `<option value="${cat.id}">${cat.name}</option>`;
            });
            elements.movieSearchCategory.innerHTML = optionsHtml;

            // 如果当前有分类选中，自动选中
            if (currentMovie && currentMovie.category) {
                elements.movieSearchCategory.value = currentMovie.category;
            }
        } else {
            elements.movieSearchCategory.innerHTML = '<option value="">无可用分类</option>';
        }
    } catch (error) {
        console.error('Error loading categories for Movie search:', error);
        elements.movieSearchCategory.innerHTML = '<option value="">加载失败</option>';
    }
}

/**
 * 电影搜索弹窗：重置表单
 */
function resetMovieSearchForm() {
    elements.movieSearchInput.value = '';
    elements.movieSearchLoading.style.display = 'none';
    elements.movieSearchError.style.display = 'none';
    elements.movieSearchError.textContent = '';
    elements.movieSearchResults.innerHTML = '';
    elements.confirmMovieSearch.disabled = true;
    movieSearchResults = [];
    selectedMovie = null;
}

/**
 * 电影搜索弹窗：关闭弹窗
 */
function closeMovieSearchModal() {
    if (!elements.movieSearchModal) return;
    elements.movieSearchModal.style.display = 'none';
    resetMovieSearchForm();
}

/**
 * 电影搜索弹窗：执行搜索
 */
async function searchMovieMovies() {
    const keyword = elements.movieSearchInput.value.trim();

    if (!keyword) {
        elements.movieSearchError.textContent = '请输入电影名称';
        elements.movieSearchError.style.display = 'block';
        return;
    }

    // 显示加载状态
    elements.movieSearchLoading.style.display = 'block';
    elements.movieSearchError.style.display = 'none';
    elements.movieSearchResults.innerHTML = '';
    elements.confirmMovieSearch.disabled = true;
    selectedMovie = null;

    try {
        const results = await window.electronAPI.tmdbSearchMovie(keyword);

        elements.movieSearchLoading.style.display = 'none';

        if (results && results.error) {
            elements.movieSearchError.textContent = results.error;
            elements.movieSearchError.style.display = 'block';
            return;
        }

        if (!results || results.length === 0) {
            elements.movieSearchResults.innerHTML = '<div class="movie-no-results">未找到相关电影</div>';
            return;
        }

        // 限制显示数量
        movieSearchResults = results.slice(0, MOVIE_SEARCH_MAX_RESULTS);
        renderMovieSearchResults(movieSearchResults);

    } catch (error) {
        console.error('Error searching movies:', error);
        elements.movieSearchLoading.style.display = 'none';
        elements.movieSearchError.textContent = '搜索失败: ' + error.message;
        elements.movieSearchError.style.display = 'block';
    }
}

/**
 * 电影搜索弹窗：渲染搜索结果
 * @param {Array} results - 搜索结果数组
 */
function renderMovieSearchResults(results) {
    const html = results.map((movie, index) => `
        <div class="movie-result-item" data-index="${index}">
            <div class="movie-result-poster">
                ${movie.poster_url
            ? `<img src="${movie.poster_url}" alt="${movie.title}" onerror="this.parentElement.innerHTML='<span class=\\'no-poster\\'>🎬</span>'">`
            : '<span class="no-poster">🎬</span>'}
            </div>
            <div class="movie-result-info">
                <div class="movie-result-title" title="${movie.title}">${movie.title}</div>
                <div class="movie-result-year">${movie.year || '未知年份'}</div>
                <div class="movie-result-overview">${movie.overview || '暂无简介'}</div>
            </div>
        </div>
    `).join('');

    elements.movieSearchResults.innerHTML = html;

    // 绑定点击事件
    elements.movieSearchResults.querySelectorAll('.movie-result-item').forEach(item => {
        item.addEventListener('click', () => {
            selectMovieSearchResult(parseInt(item.dataset.index));
        });
    });
}

/**
 * 电影搜索弹窗：选中搜索结果
 * @param {number} index - 选中结果的索引
 */
function selectMovieSearchResult(index) {
    if (index < 0 || index >= movieSearchResults.length) return;

    // 更新选中状态
    selectedMovie = movieSearchResults[index];

    // 更新UI
    elements.movieSearchResults.querySelectorAll('.movie-result-item').forEach((item, i) => {
        item.classList.toggle('selected', i === index);
    });

    // 启用确认按钮
    elements.confirmMovieSearch.disabled = false;
}

/**
 * 电影搜索弹窗：确认选择并填充表单
 */
async function confirmMovieSearch() {
    if (!selectedMovie) {
        alert('请选择一个电影');
        return;
    }

    // 显示加载状态
    elements.confirmMovieSearch.disabled = true;
    elements.confirmMovieSearch.textContent = '加载中...';

    try {
        // 调用getMovie获取详细信息
        const movieDetail = await window.electronAPI.tmdbGetMovie(selectedMovie.search_id);

        if (movieDetail && movieDetail.error) {
            throw new Error(movieDetail.error);
        }

        // 填充编辑表单
        fillEditFormWithMovieData(movieDetail);

        // 关闭弹窗
        closeMovieSearchModal();

    } catch (error) {
        console.error('Error getting movie detail:', error);
        alert('获取电影详情失败: ' + error.message);
    } finally {
        elements.confirmMovieSearch.disabled = false;
        elements.confirmMovieSearch.textContent = '确认';
    }
}

/**
 * 使用电影搜索数据填充编辑表单
 * @param {Object} movieData - 电影数据
 */
function fillEditFormWithMovieData(movieData) {
    // 填充电影名称
    const nameInput = document.getElementById('edit-name');
    if (nameInput && movieData.title) {
        nameInput.value = movieData.title;
        editData.name = movieData.title;
    }

    // 填充发行日期（年份）
    const publishDateInput = document.getElementById('edit-publish-date');
    if (publishDateInput && movieData.year) {
        publishDateInput.value = movieData.year;
        editData.publishDate = movieData.year;
    }

    // 填充电影时长
    const durationInput = document.getElementById('edit-duration');
    if (durationInput && movieData.runtime) {
        durationInput.value = movieData.runtime;
        editData.duration = movieData.runtime;
    }

    // 填充导演
    const directorInput = document.getElementById('edit-director');
    if (directorInput && movieData.directors && movieData.directors.length > 0) {
        const directorNames = movieData.directors.map(d => d.name).join(', ');
        directorInput.value = directorNames;
        editData.director = directorNames;
    }

    // 填充演员
    if (movieData.actors && movieData.actors.length > 0) {
        selectedActors = movieData.actors.map(a => a.name).filter(name => name);
        renderSelectedActors();
        editData.actors = selectedActors.join(', ');
    }

    // 填充制作商/制片公司
    const studioInput = document.getElementById('edit-studio');
    if (studioInput && movieData.production_companies && movieData.production_companies.length > 0) {
        studioInput.value = movieData.production_companies.join(', ');
        editData.studio = movieData.production_companies.join(', ');
    }

    // 填充电影简介
    const descriptionInput = document.getElementById('edit-description');
    if (descriptionInput && movieData.overview) {
        descriptionInput.value = movieData.overview;
        editData.description = movieData.overview;
    }

    // 填充标签
    if (movieData.tags && movieData.tags.length > 0) {
        editData.tags = movieData.tags;
        renderEditTags(editData.tags);
    }

    // 如果有海报URL，下载并保存
    if (movieData.poster_url) {
        downloadAndSetPoster(movieData.poster_url);
    }
}

/**
 * 下载海报并设置为封面
 * @param {string} posterUrl - 海报URL
 */
async function downloadAndSetPoster(posterUrl) {
    try {
        // 确保有folderName
        let folderName = currentMovie.folderName;
        if (!folderName && currentMovie.id) {
            const parts = currentMovie.id.split('-');
            folderName = parts.slice(1).join('-');
        }

        if (!folderName) {
            console.error('Cannot download poster: folderName is missing');
            return;
        }

        // 通过下载方式获取海报
        const result = await window.electronAPI.downloadMovieCover({
            category: currentMovie.category,
            folderName: folderName,
            coverUrl: posterUrl
        });

        if (result && result.success && result.path) {
            // 更新显示 - 使用本地文件路径
            const localPosterPath = result.path + '?t=' + Date.now();
            elements.moviePoster.src = localPosterPath;
            elements.moviePoster.style.display = 'block';
            elements.posterPlaceholder.style.display = 'none';

            // 保存路径到editData供保存时使用
            editData.coverImage = result.path;
        } else if (result && result.error) {
            console.error('Error downloading poster:', result.error);
        }
    } catch (error) {
        console.error('Error downloading poster:', error);
    }
}

// 初始化
document.addEventListener('DOMContentLoaded', init);

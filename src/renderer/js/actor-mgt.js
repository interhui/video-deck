/**
 * 演员管理页面逻辑
 */
document.addEventListener('DOMContentLoaded', async () => {
    // 获取DOM元素
    const searchInput = document.getElementById('search-input');
    const addActorBtn = document.getElementById('add-actor-btn');
    const viewCardBtn = document.getElementById('view-card-btn');
    const viewTableBtn = document.getElementById('view-table-btn');
    const closeBtn = document.getElementById('close-btn');

    const cardView = document.getElementById('card-view');
    const tableView = document.getElementById('table-view');
    const actorCards = document.getElementById('actor-cards');
    const actorTableBody = document.getElementById('actor-table-body');
    const emptyCardList = document.getElementById('empty-card-list');
    const emptyTableList = document.getElementById('empty-table-list');

    const actorModal = document.getElementById('actor-modal');
    const modalTitle = document.getElementById('modal-title');
    const closeModal = document.getElementById('close-modal');
    const actorForm = document.getElementById('actor-form');
    const originalNameInput = document.getElementById('original-name');
    const actorNameInput = document.getElementById('actor-name');
    const actorNicknameInput = document.getElementById('actor-nickname');
    const actorBirthdayInput = document.getElementById('actor-birthday');
    const actorMemoInput = document.getElementById('actor-memo');
    const saveBtn = document.getElementById('save-btn');
    const cancelBtn = document.getElementById('cancel-btn');
    const deleteBtn = document.getElementById('delete-btn');

    const photoInput = document.getElementById('photo-input');
    const photoPreview = document.getElementById('photo-preview');
    const selectPhotoBtn = document.getElementById('select-photo-btn');
    const removePhotoBtn = document.getElementById('remove-photo-btn');

    const ratingSelector = document.getElementById('rating-selector');
    const favoriteHeart = document.getElementById('favorite-heart');

    const actorRatingModal = document.getElementById('actor-rating-modal');
    const ratingActorName = document.getElementById('rating-actor-name');
    const favoriteHeartModal = document.getElementById('favorite-heart-modal');
    const favoriteText = document.getElementById('favorite-text');
    const ratingModalSelector = document.getElementById('rating-modal-selector');
    const closeRatingModal = document.getElementById('close-rating-modal');
    const cancelRatingBtn = document.getElementById('cancel-rating-btn');
    const confirmRatingBtn = document.getElementById('confirm-rating-btn');

    // 演员搜索弹窗 DOM 元素
    const actorSearchModal = document.getElementById('actor-search-modal');
    const closeActorSearchBtn = document.getElementById('close-actor-search');
    const actorSearchInput = document.getElementById('actor-search-input');
    const actorSearchBtn = document.getElementById('actor-search-btn');
    const actorSearchLoading = document.getElementById('actor-search-loading');
    const actorSearchError = document.getElementById('actor-search-error');
    const actorSearchResults = document.getElementById('actor-search-results');
    const confirmActorSearchBtn = document.getElementById('confirm-actor-search');
    const cancelActorSearchBtn = document.getElementById('cancel-actor-search');
    const actorSearchTriggerBtn = document.getElementById('actor-search-trigger-btn');

    // 批量演员搜索弹窗 DOM 元素
    const batchActorSearchModal = document.getElementById('batch-actor-search-modal');
    const closeBatchActorSearchBtn = document.getElementById('close-batch-actor-search');
    const batchActorSearchBtn = document.getElementById('batch-actor-search-btn');
    const batchActorSaveBtn = document.getElementById('batch-actor-save-btn');
    const batchActorCloseBtn = document.getElementById('batch-actor-close-btn');
    const batchActorProgress = document.getElementById('batch-actor-progress');
    const batchActorProgressText = document.getElementById('batch-actor-progress-text');
    const batchActorResultsBody = document.getElementById('batch-actor-results-body');
    const batchSearchActorBtn = document.getElementById('batch-search-actor-btn');
    const selectedCountSpan = document.getElementById('selected-count');

    // 演员搜索状态
    let actorSearchResultsList = [];
    let selectedActorSearchResult = null;

    // 批量搜索状态
    let selectedActors = new Set(); // 选中的演员名称集合
    let batchSearchResults = []; // 批量搜索结果
    let isBatchSearching = false;
    let isBatchSaving = false;

    // 常量
    const ACTOR_SEARCH_MAX_RESULTS = 10;

    // 状态
    let actors = [];
    let currentView = 'card'; // 'card' or 'table'
    let selectedActor = null;
    let isCreating = false;
    let currentPhotoBase64 = '';
    let currentPhotoFileName = '';
    let currentRating = 0;
    let currentFavorite = false;
    let currentRatingModalActor = null;

    // 关闭窗口
    closeBtn.addEventListener('click', () => {
        window.close();
    });

    // 监听主题变化
    window.electronAPI.onThemeChanged((theme) => {
        applyTheme(theme);
    });

    // 加载演员列表
    async function loadActors() {
        try {
            const result = await window.electronAPI.getActors();
            if (result.error) {
                console.error('Error loading actors:', result.error);
                actors = [];
            } else {
                actors = result.actors || [];
            }
            renderActors();
        } catch (error) {
            console.error('Error loading actors:', error);
            actors = [];
            renderActors();
        }
    }

    // 渲染演员列表
    function renderActors(filter = '') {
        const filteredActors = filter
            ? actors.filter(a =>
                (a.name && a.name.toLowerCase().includes(filter.toLowerCase())) ||
                (a.nickname && a.nickname.toLowerCase().includes(filter.toLowerCase()))
            )
            : actors;

        if (currentView === 'card') {
            renderCardView(filteredActors);
        } else {
            renderTableView(filteredActors);
        }
    }

    // 渲染卡片视图
    function renderCardView(actorList) {
        if (actorList.length === 0) {
            actorCards.innerHTML = '';
            emptyCardList.style.display = 'flex';
            return;
        }

        emptyCardList.style.display = 'none';
        actorCards.innerHTML = actorList.map(actor => `
            <div class="actor-card" data-name="${escapeHtml(actor.name)}">
                <label class="actor-checkbox-label">
                    <input type="checkbox" class="actor-checkbox" data-name="${escapeHtml(actor.name)}" ${selectedActors.has(actor.name) ? 'checked' : ''}>
                </label>
                <span class="actor-favorite-tag ${actor.favorites ? 'favorited' : ''}" data-name="${escapeHtml(actor.name)}" onclick="event.stopPropagation(); openActorRatingModal('${escapeHtml(actor.name)}')">${actor.favorites ? '❤' : '♡'}</span>
                <div class="actor-card-photo">
                    ${actor.photo
                        ? `<img src="file://${actor.photo}" alt="${escapeHtml(actor.name)}">`
                        : `<div class="actor-card-placeholder">${escapeHtml(actor.name.charAt(0))}</div>`
                    }
                    ${actor.rating ? `<div class="actor-rating-display">${'⭐'.repeat(actor.rating)}</div>` : ''}
                </div>
                <div class="actor-card-info">
                    <div class="actor-card-name">${escapeHtml(actor.name)}</div>
                    <div class="actor-card-birthday">${formatBirthday(actor.birthday)}</div>
                </div>
            </div>
        `).join('');

        // 绑定点击事件
        actorCards.querySelectorAll('.actor-card').forEach(card => {
            card.addEventListener('click', (e) => {
                // 如果点击的是复选框，不触发行编辑
                if (e.target.classList.contains('actor-checkbox')) {
                    return;
                }
                editActor(card.dataset.name);
            });
        });

        // 绑定复选框事件
        actorCards.querySelectorAll('.actor-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const actorName = e.target.dataset.name;
                if (e.target.checked) {
                    selectedActors.add(actorName);
                } else {
                    selectedActors.delete(actorName);
                }
                updateBatchSearchButton();
            });
        });
    }

    // 渲染表格视图
    function renderTableView(actorList) {
        if (actorList.length === 0) {
            actorTableBody.innerHTML = '';
            emptyTableList.style.display = 'flex';
            return;
        }

        emptyTableList.style.display = 'none';
        actorTableBody.innerHTML = actorList.map(actor => `
            <tr data-name="${escapeHtml(actor.name)}">
                <td class="actor-table-checkbox">
                    <input type="checkbox" class="actor-checkbox" data-name="${escapeHtml(actor.name)}" ${selectedActors.has(actor.name) ? 'checked' : ''}>
                </td>
                <td class="actor-table-photo">
                    ${actor.photo
                        ? `<img src="file://${actor.photo}" alt="${escapeHtml(actor.name)}">`
                        : `<div class="actor-table-placeholder">${escapeHtml(actor.name.charAt(0))}</div>`
                    }
                </td>
                <td>${escapeHtml(actor.name)}</td>
                <td>${escapeHtml(actor.nickname || '')}</td>
                <td>${escapeHtml(actor.birthday || '')}</td>
                <td>${escapeHtml(actor.memo || '')}</td>
                <td class="actor-table-rating">${actor.rating ? '<span class="actor-rating-display-table">' + '★'.repeat(actor.rating) + '</span>' : ''}</td>
                <td class="actor-table-favorite"><span class="actor-favorite-tag-table ${actor.favorites ? 'favorited' : ''}">${actor.favorites ? '❤' : '♡'}</span></td>
                <td class="actor-table-actions">
                    <button class="btn btn-small" onclick="editActor('${escapeHtml(actor.name)}')">编辑</button>
                    <button class="btn btn-small btn-danger" onclick="deleteActorConfirm('${escapeHtml(actor.name)}')">删除</button>
                </td>
            </tr>
        `).join('');

        // 绑定复选框事件
        actorTableBody.querySelectorAll('.actor-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const actorName = e.target.dataset.name;
                if (e.target.checked) {
                    selectedActors.add(actorName);
                } else {
                    selectedActors.delete(actorName);
                }
                updateBatchSearchButton();
            });
        });
    }

    // 关闭评分模态框
    function switchView(view) {
        currentView = view;
        if (view === 'card') {
            cardView.style.display = 'block';
            tableView.style.display = 'none';
            viewCardBtn.classList.add('active');
            viewTableBtn.classList.remove('active');
        } else {
            cardView.style.display = 'none';
            tableView.style.display = 'block';
            viewCardBtn.classList.remove('active');
            viewTableBtn.classList.add('active');
        }
        renderActors(searchInput.value);
    }

    viewCardBtn.addEventListener('click', () => switchView('card'));
    viewTableBtn.addEventListener('click', () => switchView('table'));

    // 搜索
    searchInput.addEventListener('input', (e) => {
        renderActors(e.target.value);
    });

    // 新建演员
    addActorBtn.addEventListener('click', () => {
        isCreating = true;
        selectedActor = null;
        resetForm();
        modalTitle.textContent = '新建演员';
        deleteBtn.style.display = 'none';
        showModal();
    });

    // 编辑演员
    window.editActor = function(name) {
        const actor = actors.find(a => a.name === name);
        if (!actor) return;

        isCreating = false;
        selectedActor = actor;
        originalNameInput.value = actor.name;
        actorNameInput.value = actor.name;
        actorNicknameInput.value = actor.nickname || '';
        actorBirthdayInput.value = actor.birthday || '';
        actorMemoInput.value = actor.memo || '';
        currentPhotoBase64 = '';
        currentPhotoFileName = '';
        currentRating = actor.rating || 0;
        currentFavorite = actor.favorites || false;

        if (actor.photo) {
            photoPreview.innerHTML = `<img src="file://${actor.photo}" alt="${escapeHtml(actor.name)}">`;
            removePhotoBtn.style.display = 'block';
        } else {
            photoPreview.innerHTML = '<div class="photo-placeholder">点击上传照片</div>';
            removePhotoBtn.style.display = 'none';
        }

        modalTitle.textContent = '编辑演员';
        deleteBtn.style.display = 'block';
        updateRatingDisplay();
        updateFavoriteDisplay();
        showModal();
    };

    // 删除演员确认
    window.deleteActorConfirm = function(name) {
        if (!confirm(`确定要删除演员"${name}"吗？`)) {
            return;
        }
        deleteActor(name);
    };

    // 删除演员
    async function deleteActor(name) {
        try {
            const result = await window.electronAPI.deleteActor(name);
            if (result.error) {
                alert(result.error);
                return;
            }
            await loadActors();
            hideModal();
        } catch (error) {
            console.error('Error deleting actor:', error);
            alert('删除失败: ' + error.message);
        }
    }

    // 显示模态框
    function showModal() {
        actorModal.style.display = 'flex';
        actorNameInput.focus();
    }

    // 隐藏模态框
    function hideModal() {
        actorModal.style.display = 'none';
        resetForm();
    }

    // 重置表单
    function resetForm() {
        originalNameInput.value = '';
        actorNameInput.value = '';
        actorNicknameInput.value = '';
        actorBirthdayInput.value = '';
        actorMemoInput.value = '';
        currentPhotoBase64 = '';
        currentPhotoFileName = '';
        currentRating = 0;
        currentFavorite = false;
        photoPreview.innerHTML = '<div class="photo-placeholder">点击上传照片</div>';
        removePhotoBtn.style.display = 'none';
        actorForm.reset();
        updateRatingDisplay();
        updateFavoriteDisplay();
    }

    // 选择照片
    selectPhotoBtn.addEventListener('click', () => {
        photoInput.click();
    });

    photoInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const base64 = await fileToBase64(file);
            currentPhotoBase64 = base64.split(',')[1]; // 去掉 data:image/...;base64, 前缀
            currentPhotoFileName = `${Date.now()}_${file.name}`;
            photoPreview.innerHTML = `<img src="${base64}" alt="照片预览">`;
            removePhotoBtn.style.display = 'block';
        } catch (error) {
            console.error('Error reading file:', error);
            alert('读取照片失败');
        }
    });

    // 移除照片
    removePhotoBtn.addEventListener('click', () => {
        currentPhotoBase64 = '';
        currentPhotoFileName = '';
        photoPreview.innerHTML = '<div class="photo-placeholder">点击上传照片</div>';
        removePhotoBtn.style.display = 'none';
        photoInput.value = '';
    });

    // 保存演员
    async function saveActor() {
        const name = actorNameInput.value.trim();
        const nickname = actorNicknameInput.value.trim();
        const birthday = actorBirthdayInput.value;
        const memo = actorMemoInput.value.trim();

        if (!name) {
            alert('请填写演员姓名');
            return;
        }

        try {
            let photoPath = selectedActor ? selectedActor.photo : '';

            // 如果有新照片，先保存照片
            if (currentPhotoBase64) {
                const photoResult = await window.electronAPI.saveActorPhoto({
                    base64Data: currentPhotoBase64,
                    fileName: currentPhotoFileName
                });
                if (photoResult.error) {
                    alert(photoResult.error);
                    return;
                }
                photoPath = photoResult.filePath;
            }

            const actorData = {
                name,
                nickname,
                birthday,
                memo,
                photo: photoPath,
                rating: currentRating,
                favorites: currentFavorite
            };

            let result;
            if (isCreating) {
                result = await window.electronAPI.createActor(actorData);
            } else {
                result = await window.electronAPI.updateActor({
                    oldName: originalNameInput.value,
                    newActor: actorData
                });
            }

            if (result.error) {
                alert(result.error);
                return;
            }

            await loadActors();
            hideModal();
        } catch (error) {
            console.error('Error saving actor:', error);
            alert('保存失败: ' + error.message);
        }
    }

    // 事件绑定
    closeModal.addEventListener('click', hideModal);
    cancelBtn.addEventListener('click', hideModal);
    saveBtn.addEventListener('click', (e) => {
        e.preventDefault();
        saveActor();
    });
    deleteBtn.addEventListener('click', () => {
        if (selectedActor) {
            deleteActorConfirm(selectedActor.name);
        }
    });

    actorModal.addEventListener('click', (e) => {
        if (e.target === actorModal) {
            hideModal();
        }
    });

    // 评分星星点击事件（编辑模态框）
    ratingSelector.querySelectorAll('.rating-star').forEach(star => {
        star.addEventListener('click', (e) => {
            e.stopPropagation();
            const rating = parseInt(star.dataset.rating, 10);
            currentRating = currentRating === rating ? 0 : rating;
            updateRatingDisplay();
        });
    });

    // 收藏心形点击事件（编辑模态框）
    favoriteHeart.addEventListener('click', (e) => {
        e.stopPropagation();
        currentFavorite = !currentFavorite;
        updateFavoriteDisplay();
    });

    // 更新评分星星显示（编辑模态框）
    function updateRatingDisplay() {
        ratingSelector.querySelectorAll('.rating-star').forEach(star => {
            const rating = parseInt(star.dataset.rating, 10);
            if (rating <= currentRating) {
                star.textContent = '★';
                star.classList.add('active');
            } else {
                star.textContent = '☆';
                star.classList.remove('active');
            }
        });
    }

    // 更新收藏心形显示（编辑模态框）
    function updateFavoriteDisplay() {
        if (currentFavorite) {
            favoriteHeart.textContent = '❤';
            favoriteHeart.classList.add('favorited');
        } else {
            favoriteHeart.textContent = '♡';
            favoriteHeart.classList.remove('favorited');
        }
    }

    // 演员评分模态框功能
    window.openActorRatingModal = function(name) {
        const actor = actors.find(a => a.name === name);
        if (!actor) return;

        currentRatingModalActor = actor;
        ratingActorName.textContent = actor.name;

        // 设置当前状态
        currentRating = actor.rating || 0;
        currentFavorite = actor.favorites || false;

        // 更新显示
        updateRatingModalDisplay();
        updateFavoriteModalDisplay();

        actorRatingModal.style.display = 'flex';
    };

    // 评分星星点击事件（评分模态框）
    ratingModalSelector.querySelectorAll('.rating-star').forEach(star => {
        star.addEventListener('click', (e) => {
            e.stopPropagation();
            const rating = parseInt(star.dataset.rating, 10);
            currentRating = currentRating === rating ? 0 : rating;
            updateRatingModalDisplay();
        });
    });

    // 收藏心形点击事件（评分模态框）
    favoriteHeartModal.addEventListener('click', (e) => {
        e.stopPropagation();
        currentFavorite = !currentFavorite;
        updateFavoriteModalDisplay();
    });

    // 更新评分星星显示（评分模态框）
    function updateRatingModalDisplay() {
        ratingModalSelector.querySelectorAll('.rating-star').forEach(star => {
            const rating = parseInt(star.dataset.rating, 10);
            if (rating <= currentRating) {
                star.textContent = '★';
                star.classList.add('active');
            } else {
                star.textContent = '☆';
                star.classList.remove('active');
            }
        });
    }

    // 更新收藏心形显示（评分模态框）
    function updateFavoriteModalDisplay() {
        if (currentFavorite) {
            favoriteHeartModal.textContent = '❤';
            favoriteHeartModal.classList.add('favorited');
            favoriteText.textContent = '已收藏';
        } else {
            favoriteHeartModal.textContent = '♡';
            favoriteHeartModal.classList.remove('favorited');
            favoriteText.textContent = '未收藏';
        }
    }

    // 关闭评分模态框
    closeRatingModal.addEventListener('click', () => {
        actorRatingModal.style.display = 'none';
        currentRatingModalActor = null;
    });

    cancelRatingBtn.addEventListener('click', () => {
        actorRatingModal.style.display = 'none';
        currentRatingModalActor = null;
    });

    actorRatingModal.addEventListener('click', (e) => {
        if (e.target === actorRatingModal) {
            actorRatingModal.style.display = 'none';
            currentRatingModalActor = null;
        }
    });

    // 确认评分修改
    confirmRatingBtn.addEventListener('click', async () => {
        if (!currentRatingModalActor) return;

        try {
            const result = await window.electronAPI.updateActor({
                oldName: currentRatingModalActor.name,
                newActor: {
                    name: currentRatingModalActor.name,
                    rating: currentRating,
                    favorites: currentFavorite
                }
            });

            if (result.error) {
                alert(result.error);
                return;
            }

            actorRatingModal.style.display = 'none';
            currentRatingModalActor = null;
            await loadActors();
        } catch (error) {
            console.error('Error updating actor rating:', error);
            alert('修改失败: ' + error.message);
        }
    });

    // ==================== 演员搜索弹窗功能 ====================

    // 点击演员名称后的搜索按钮
    actorSearchTriggerBtn.addEventListener('click', () => {
        openActorSearchModal();
    });

    // 关闭演员搜索弹窗
    closeActorSearchBtn.addEventListener('click', () => {
        closeActorSearchModal();
    });

    // 取消演员搜索
    cancelActorSearchBtn.addEventListener('click', () => {
        closeActorSearchModal();
    });

    // 点击演员搜索弹窗背景关闭
    actorSearchModal.addEventListener('click', (e) => {
        if (e.target === actorSearchModal) {
            closeActorSearchModal();
        }
    });

    // 执行演员搜索
    actorSearchBtn.addEventListener('click', () => {
        searchActorPeople();
    });

    // 搜索输入框回车搜索
    actorSearchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchActorPeople();
        }
    });

    // 确认选择演员
    confirmActorSearchBtn.addEventListener('click', () => {
        confirmActorSearch();
    });

    /**
     * 打开演员搜索弹窗
     */
    function openActorSearchModal() {
        // 将当前 actor-name 的值带入搜索框
        actorSearchInput.value = actorNameInput.value.trim();
        resetActorSearchForm();
        actorSearchModal.style.display = 'flex';
        actorSearchInput.focus();
    }

    /**
     * 重置演员搜索表单
     */
    function resetActorSearchForm() {
        actorSearchLoading.style.display = 'none';
        actorSearchError.style.display = 'none';
        actorSearchError.textContent = '';
        actorSearchResults.innerHTML = '';
        confirmActorSearchBtn.disabled = true;
        actorSearchResultsList = [];
        selectedActorSearchResult = null;
    }

    /**
     * 关闭演员搜索弹窗
     */
    function closeActorSearchModal() {
        actorSearchModal.style.display = 'none';
        resetActorSearchForm();
    }

    /**
     * 搜索演员
     */
    async function searchActorPeople() {
        const actorName = actorSearchInput.value.trim();

        if (!actorName) {
            actorSearchError.textContent = '请输入演员名称';
            actorSearchError.style.display = 'block';
            return;
        }

        // 显示加载状态
        actorSearchLoading.style.display = 'block';
        actorSearchError.style.display = 'none';
        actorSearchResults.innerHTML = '';
        confirmActorSearchBtn.disabled = true;
        selectedActorSearchResult = null;

        try {
            const selectedAdapter = document.querySelector('input[name="actor-adapter"]:checked')?.value || 'tmdb';
            let results;
            
            if (selectedAdapter === 'r18') {
                results = await window.electronAPI.r18SearchPerson(actorName);
            } else {
                results = await window.electronAPI.tmdbSearchPerson(actorName);
            }

            actorSearchLoading.style.display = 'none';

            if (results && results.error) {
                actorSearchError.textContent = results.error;
                actorSearchError.style.display = 'block';
                return;
            }

            if (!results || results.length === 0) {
                actorSearchResults.innerHTML = '<div class="actor-no-results">未找到相关演员</div>';
                return;
            }

            // 限制显示数量
            actorSearchResultsList = results.slice(0, ACTOR_SEARCH_MAX_RESULTS);
            renderActorSearchResults(actorSearchResultsList);

        } catch (error) {
            console.error('Error searching actors:', error);
            actorSearchLoading.style.display = 'none';
            actorSearchError.textContent = '搜索失败: ' + error.message;
            actorSearchError.style.display = 'block';
        }
    }

    /**
     * 渲染演员搜索结果
     * @param {Array} results - 搜索结果数组
     */
    function renderActorSearchResults(results) {
        const html = results.map((actor, index) => `
            <div class="actor-result-item" data-index="${index}">
                <div class="actor-result-poster">
                    ${actor.actor_profile_url
                ? `<img src="${actor.actor_profile_url}" alt="${actor.actor_name}" onerror="this.parentElement.innerHTML='<span class=\\'no-actor-photo\\'>👤</span>'">`
                : '<span class="no-actor-photo">👤</span>'}
                </div>
                <div class="actor-result-info">
                    <div class="actor-result-name">${escapeHtml(actor.actor_name)}</div>
                    <div class="actor-result-id">ID: ${actor.actor_id}</div>
                </div>
            </div>
        `).join('');

        actorSearchResults.innerHTML = html;

        // 绑定点击事件
        actorSearchResults.querySelectorAll('.actor-result-item').forEach(item => {
            item.addEventListener('click', () => {
                selectActorSearchResult(parseInt(item.dataset.index));
            });
        });
    }

    /**
     * 选中演员搜索结果
     * @param {number} index - 选中结果的索引
     */
    function selectActorSearchResult(index) {
        if (index < 0 || index >= actorSearchResultsList.length) return;

        // 更新选中状态
        selectedActorSearchResult = actorSearchResultsList[index];

        // 更新UI
        actorSearchResults.querySelectorAll('.actor-result-item').forEach((item, i) => {
            item.classList.toggle('selected', i === index);
        });

        // 启用确认按钮
        confirmActorSearchBtn.disabled = false;
    }

    /**
     * 确认选择演员并填充信息
     */
    async function confirmActorSearch() {
        if (!selectedActorSearchResult) {
            alert('请选择一个演员');
            return;
        }

        // 显示加载状态
        confirmActorSearchBtn.disabled = true;
        confirmActorSearchBtn.textContent = '加载中...';

        try {
            const selectedAdapter = document.querySelector('input[name="actor-adapter"]:checked')?.value || 'tmdb';
            let personDetail;
            
            if (selectedAdapter === 'r18') {
                personDetail = await window.electronAPI.r18GetPerson(selectedActorSearchResult.actor_id);
            } else {
                personDetail = await window.electronAPI.tmdbGetPerson(selectedActorSearchResult.actor_id);
            }

            if (personDetail && personDetail.error) {
                throw new Error(personDetail.error);
            }

            // 填充演员信息到表单
            actorNameInput.value = personDetail.name || selectedActorSearchResult.actor_name;
            actorBirthdayInput.value = personDetail.birthday || '';
            actorMemoInput.value = personDetail.memo || '';

            // 下载并填充演员照片
            if (personDetail.profile_url) {
                try {
                    // 下载照片到演员目录
                    const photoResult = await window.electronAPI.downloadActorPhoto({
                        photoUrl: personDetail.profile_url
                    });

                    if (photoResult && photoResult.success && photoResult.filePath) {
                        currentPhotoFileName = photoResult.fileName || `${Date.now()}_actor.jpg`;
                        currentPhotoBase64 = photoResult.base64 || '';

                        // 显示照片预览
                        if (photoResult.base64) {
                            photoPreview.innerHTML = `<img src="data:image/jpeg;base64,${photoResult.base64}" alt="照片预览">`;
                        } else {
                            photoPreview.innerHTML = `<img src="file://${photoResult.filePath}" alt="照片预览">`;
                        }
                        removePhotoBtn.style.display = 'block';
                    } else if (photoResult && photoResult.error) {
                        console.warn('下载演员照片失败:', photoResult.error);
                    }
                } catch (photoError) {
                    console.error('Error downloading actor photo:', photoError);
                    // 照片下载失败不影响主流程
                }
            }

            // 关闭弹窗
            closeActorSearchModal();

        } catch (error) {
            console.error('Error getting actor detail:', error);
            alert('获取演员详情失败: ' + error.message);
        } finally {
            confirmActorSearchBtn.disabled = false;
            confirmActorSearchBtn.textContent = '确认';
        }
    }

    // ==================== 批量演员搜索功能 ====================

    // 更新批量搜索按钮状态
    function updateBatchSearchButton() {
        const count = selectedActors.size;
        selectedCountSpan.textContent = count;
        batchSearchActorBtn.style.display = count > 0 ? 'inline-block' : 'none';
    }

    // 批量搜索按钮点击
    batchSearchActorBtn.addEventListener('click', () => {
        openBatchActorSearchModal();
    });

    // 关闭批量演员搜索弹窗
    batchActorCloseBtn.addEventListener('click', () => {
        if (isBatchSearching) {
            if (!confirm('搜索正在进行中，确定要关闭吗？')) {
                return;
            }
            window.electronAPI.cancelBatchActorSearch();
        }
        closeBatchActorSearchModal();
    });

    // 点击批量演员搜索弹窗背景关闭
    batchActorSearchModal.addEventListener('click', (e) => {
        if (e.target === batchActorSearchModal) {
            if (isBatchSearching) {
                if (!confirm('搜索正在进行中，确定要关闭吗？')) {
                    return;
                }
                window.electronAPI.cancelBatchActorSearch();
            }
            closeBatchActorSearchModal();
        }
    });

    // 关闭批量演员搜索弹窗按钮
    closeBatchActorSearchBtn.addEventListener('click', () => {
        if (isBatchSearching) {
            if (!confirm('搜索正在进行中，确定要关闭吗？')) {
                return;
            }
            window.electronAPI.cancelBatchActorSearch();
        }
        closeBatchActorSearchModal();
    });

    // 执行批量搜索
    batchActorSearchBtn.addEventListener('click', () => {
        startBatchActorSearch();
    });

    // 执行批量保存
    batchActorSaveBtn.addEventListener('click', () => {
        startBatchActorSave();
    });

    /**
     * 打开批量演员搜索弹窗
     */
    function openBatchActorSearchModal() {
        // 用选中演员的当前信息初始化批量搜索结果
        batchSearchResults = Array.from(selectedActors).map(name => {
            const actor = actors.find(a => a.name === name);
            return {
                actorName: name,
                status: 'pending',
                result: actor ? {
                    birthday: actor.birthday || '',
                    memo: actor.memo || '',
                    profile_url: actor.photo ? 'exists' : null
                } : null
            };
        });
        resetBatchActorSearchForm();
        renderBatchActorResults();
        batchActorSearchModal.style.display = 'flex';
    }

    /**
     * 重置批量演员搜索表单
     */
    function resetBatchActorSearchForm() {
        batchActorProgress.textContent = '准备就绪';
        batchActorSearchBtn.style.display = 'inline-block';
        batchActorSaveBtn.style.display = 'none';
        batchActorCloseBtn.textContent = '关闭';
        batchActorSearchBtn.disabled = false;
        batchActorSaveBtn.disabled = false;
        isBatchSearching = false;
        isBatchSaving = false;
    }

    /**
     * 关闭批量演员搜索弹窗
     */
    function closeBatchActorSearchModal() {
        batchActorSearchModal.style.display = 'none';
        resetBatchActorSearchForm();
    }

    /**
     * 截断文本
     */
    function truncateText(text, maxLength = 40) {
        if (!text) return '-';
        if (text.length <= maxLength) return escapeHtml(text);
        return escapeHtml(text.substring(0, maxLength)) + '...';
    }

    /**
     * 渲染批量搜索结果表格
     */
    function renderBatchActorResults() {
        batchActorResultsBody.innerHTML = batchSearchResults.map((item, index) => {
            let statusText = '';
            let statusClass = '';
            switch (item.status) {
                case 'pending':
                    statusText = '未搜索';
                    statusClass = 'status-pending';
                    break;
                case 'searching':
                    statusText = '搜索中...';
                    statusClass = 'status-searching';
                    break;
                case 'completed':
                    statusText = '已完成';
                    statusClass = 'status-completed';
                    break;
                case 'none':
                    statusText = '未找到';
                    statusClass = 'status-none';
                    break;
                case 'error':
                    statusText = '错误';
                    statusClass = 'status-error';
                    break;
                case 'saving':
                    statusText = '保存中...';
                    statusClass = 'status-saving';
                    break;
                case 'saved':
                    statusText = '已保存';
                    statusClass = 'status-saved';
                    break;
                default:
                    statusText = item.status || '未知';
                    statusClass = '';
            }

            return `
                <tr data-index="${index}">
                    <td class="col-name">${escapeHtml(item.actorName)}</td>
                    <td class="col-birthday">${escapeHtml(item.result?.birthday || '-')}</td>
                    <td class="col-memo" title="${escapeHtml(item.result?.memo || '')}">${truncateText(item.result?.memo || '-', 40)}</td>
                    <td class="col-photo">${item.result?.profile_url ? '有' : '无'}</td>
                    <td class="batch-actor-status ${statusClass}">${statusText}</td>
                </tr>
            `;
        }).join('');
    }

    /**
     * 开始批量演员搜索
     */
    async function startBatchActorSearch() {
        const actors = Array.from(selectedActors);
        if (actors.length === 0) {
            alert('请选择要搜索的演员');
            return;
        }

        const selectedAdapter = document.querySelector('input[name="batch-actor-adapter"]:checked')?.value || 'tmdb';

        // 初始化批量搜索结果
        batchSearchResults = actors.map(name => ({
            actorName: name,
            status: 'pending',
            result: null
        }));
        renderBatchActorResults();

        // 更新UI状态
        batchActorProgress.textContent = '正在搜索...';
        batchActorSearchBtn.style.display = 'none';
        batchActorCloseBtn.textContent = '取消';
        isBatchSearching = true;

        // 监听进度更新
        window.electronAPI.onBatchActorSearchProgress((progress) => {
            if (progress.status === 'searching') {
                batchActorProgress.textContent = `正在搜索: ${progress.current}/${progress.total}（${progress.actorName}）`;

                // 更新对应演员的状态
                const item = batchSearchResults.find(r => r.actorName === progress.actorName);
                if (item) {
                    item.status = 'searching';
                    renderBatchActorResults();
                }
            } else {
                // 搜索完成
                batchActorProgress.textContent = `搜索完成: ${progress.current}/${progress.total}`;

                const item = batchSearchResults.find(r => r.actorName === progress.actorName);
                if (item) {
                    item.status = progress.status;
                    item.result = progress.result;
                    renderBatchActorResults();
                }
            }
        });

        try {
            const result = await window.electronAPI.batchSearchActors({
                actors: actors,
                adapterType: selectedAdapter
            });

            isBatchSearching = false;
            batchActorCloseBtn.textContent = '关闭';

            if (result.error) {
                alert('批量搜索失败: ' + result.error);
                return;
            }

            // 显示保存按钮
            batchActorSaveBtn.style.display = 'inline-block';

        } catch (error) {
            isBatchSearching = false;
            batchActorCloseBtn.textContent = '关闭';
            console.error('Error in batch actor search:', error);
            alert('批量搜索失败: ' + error.message);
        }
    }

    /**
     * 开始批量保存演员
     */
    async function startBatchActorSave() {
        const successItems = batchSearchResults.filter(r => r.status === 'completed' && r.result);
        if (successItems.length === 0) {
            alert('没有可保存的演员');
            return;
        }

        // 更新UI状态
        batchActorSearchBtn.style.display = 'none';
        batchActorSaveBtn.style.display = 'none';
        batchActorCloseBtn.textContent = '取消';
        isBatchSaving = true;
        batchActorProgress.textContent = '正在保存...';

        // 监听保存进度
        window.electronAPI.onBatchActorSaveProgress((progress) => {
            batchActorProgress.textContent = `正在保存: ${progress.current}/${progress.total}（${progress.actorName}）`;

            const item = batchSearchResults.find(r => r.actorName === progress.actorName);
            if (item) {
                item.status = progress.status;
                renderBatchActorResults();
            }
        });

        try {
            const result = await window.electronAPI.batchSaveActors({
                batchResults: batchSearchResults.filter(r => r.status === 'completed' && r.result)
            });

            isBatchSaving = false;
            batchActorCloseBtn.textContent = '关闭';

            if (result.error) {
                alert('批量保存失败: ' + result.error);
                return;
            }

            alert('批量保存完成！');
            closeBatchActorSearchModal();

            // 清空选中状态并刷新列表
            selectedActors.clear();
            updateBatchSearchButton();
            await loadActors();

        } catch (error) {
            isBatchSaving = false;
            batchActorCloseBtn.textContent = '关闭';
            console.error('Error in batch actor save:', error);
            alert('批量保存失败: ' + error.message);
        }
    }

    // 监听演员更新事件
    window.electronAPI.onActorsUpdated(() => {
        loadActors();
    });

    // 初始加载
    loadTheme({
        onLayoutLoaded: applyPosterSizeSettings
    });
    loadActors();
});

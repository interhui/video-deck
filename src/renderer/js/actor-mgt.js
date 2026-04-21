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
            card.addEventListener('click', () => editActor(card.dataset.name));
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

    // 监听演员更新事件
    window.electronAPI.onActorsUpdated(() => {
        loadActors();
    });

    // 初始加载
    loadTheme();
    loadActors();
});

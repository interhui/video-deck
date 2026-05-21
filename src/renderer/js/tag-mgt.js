/**
 * 标签管理页面逻辑
 */
document.addEventListener('DOMContentLoaded', async () => {
    // 获取DOM元素
    const tagList = document.getElementById('tag-list');
    const emptyList = document.getElementById('empty-list');
    const noSelection = document.getElementById('no-selection');
    const tagForm = document.getElementById('tag-form');
    const formTitle = document.getElementById('form-title');
    const tagIdInput = document.getElementById('tag-id');
    const tagNameInput = document.getElementById('tag-name');
    const searchInput = document.getElementById('search-input');
    const closeBtn = document.getElementById('close-btn');

    const addTagBtn = document.getElementById('add-tag-btn');
    const saveBtn = document.getElementById('save-btn');
    const cancelBtn = document.getElementById('cancel-btn');
    const deleteBtn = document.getElementById('delete-btn');

    const extractTagsBtn = document.getElementById('extract-tags-btn');
    const extractModal = document.getElementById('extract-modal');
    const extractModalClose = document.getElementById('extract-modal-close');
    const extractLoading = document.getElementById('extract-loading');
    const extractResult = document.getElementById('extract-result');
    const extractTableBody = document.getElementById('extract-table-body');
    const emptyExtract = document.getElementById('empty-extract');
    const extractModalFooter = document.getElementById('extract-modal-footer');
    const extractSaveBtn = document.getElementById('extract-save-btn');
    const extractCancelBtn = document.getElementById('extract-cancel-btn');

    // 状态
    let tags = [];
    let selectedTag = null;
    let isCreating = false;
    let extractedTags = [];

    // 关闭窗口
    closeBtn.addEventListener('click', () => {
        window.close();
    });

    // 监听主题变化
    window.electronAPI.onThemeChanged((theme) => {
        applyTheme(theme);
    });

    // 加载标签列表
    async function loadTags() {
        try {
            tags = await window.electronAPI.getTags();
            if (tags.error) {
                console.error('Error loading tags:', tags.error);
                tags = [];
            }
            renderTagList();
        } catch (error) {
            console.error('Error loading tags:', error);
            tags = [];
            renderTagList();
        }
    }

    // 渲染标签列表
    function renderTagList(filter = '') {
        const filteredTags = filter
            ? tags.filter(t =>
                t.id.toLowerCase().includes(filter.toLowerCase()) ||
                (t.name && t.name.toLowerCase().includes(filter.toLowerCase()))
            )
            : tags;

        if (filteredTags.length === 0) {
            tagList.innerHTML = '';
            emptyList.style.display = 'flex';
            return;
        }

        emptyList.style.display = 'none';
        tagList.innerHTML = filteredTags.map(tag => `
            <li class="item-card ${selectedTag && selectedTag.id === tag.id ? 'selected' : ''}" data-id="${tag.id}">
                <div class="item-name">${escapeHtml(tag.name)}</div>
            </li>
        `).join('');

        // 绑定点击事件
        tagList.querySelectorAll('.item-card').forEach(card => {
            card.addEventListener('click', () => selectTag(card.dataset.id));
        });
    }

    // 选择标签
    function selectTag(tagId) {
        selectedTag = tags.find(t => t.id === tagId);
        isCreating = false;

        if (selectedTag) {
            tagIdInput.value = selectedTag.id;
            tagIdInput.disabled = true; // 编辑时不能修改ID
            tagNameInput.value = selectedTag.name;
            formTitle.textContent = '编辑标签';
            deleteBtn.style.display = 'block';
        }

        renderTagList(searchInput.value);
        showForm();
    }

    // 显示表单
    function showForm() {
        noSelection.style.display = 'none';
        tagForm.style.display = 'block';
    }

    // 隐藏表单
    function hideForm() {
        tagForm.style.display = 'none';
        noSelection.style.display = 'flex';
    }

    // 重置表单
    function resetForm() {
        tagIdInput.value = '';
        tagIdInput.disabled = false;
        tagNameInput.value = '';
        selectedTag = null;
        isCreating = false;
    }

    // 新建标签
    function createTag() {
        resetForm();
        formTitle.textContent = '新建标签';
        deleteBtn.style.display = 'none';
        isCreating = true;
        showForm();
        tagIdInput.focus();
    }

    // 保存标签
    async function saveTag() {
        const id = tagIdInput.value.trim();
        const name = tagNameInput.value.trim();

        if (!id || !name) {
            alert('请填写标签ID和名称');
            return;
        }

        try {
            let result;
            if (isCreating) {
                result = await window.electronAPI.createTag({ id, name });
            } else {
                result = await window.electronAPI.updateTag({ id, name });
            }

            if (result.error) {
                alert(result.error);
                return;
            }

            await loadTags();
            resetForm();
            hideForm();
        } catch (error) {
            console.error('Error saving tag:', error);
            alert('保存失败: ' + error.message);
        }
    }

    // 删除标签
    async function deleteTag() {
        if (!selectedTag) return;

        if (!confirm(`确定要删除标签"${selectedTag.name}"吗？`)) {
            return;
        }

        try {
            const result = await window.electronAPI.deleteTag(selectedTag.id);
            if (result.error) {
                alert(result.error);
                return;
            }

            await loadTags();
            resetForm();
            hideForm();
        } catch (error) {
            console.error('Error deleting tag:', error);
            alert('删除失败: ' + error.message);
        }
    }

    // 事件绑定
    addTagBtn.addEventListener('click', createTag);
    saveBtn.addEventListener('click', (e) => {
        e.preventDefault();
        saveTag();
    });
    cancelBtn.addEventListener('click', () => {
        resetForm();
        hideForm();
        renderTagList(searchInput.value);
    });
    deleteBtn.addEventListener('click', deleteTag);

    searchInput.addEventListener('input', (e) => {
        renderTagList(e.target.value);
    });

    // 监听标签更新事件
    window.electronAPI.onTagsUpdated(() => {
        loadTags();
    });

    // 标签提取功能
    extractTagsBtn.addEventListener('click', async () => {
        extractedTags = [];
        showExtractModal();
        startExtractTags();
    });

    function showExtractModal() {
        extractModal.style.display = 'flex';
        extractLoading.style.display = 'flex';
        extractResult.style.display = 'none';
        emptyExtract.style.display = 'none';
        extractModalFooter.style.display = 'none';
    }

    async function startExtractTags() {
        try {
            const result = await window.electronAPI.extractTags();
            
            extractLoading.style.display = 'none';
            extractResult.style.display = 'block';
            
            if (result.error) {
                alert('提取标签失败: ' + result.error);
                closeExtractModal();
                return;
            }
            
            extractedTags = result.newTags || [];
            
            if (extractedTags.length === 0) {
                emptyExtract.style.display = 'block';
                extractTableBody.innerHTML = '';
            } else {
                emptyExtract.style.display = 'none';
                renderExtractTable();
            }
            
            extractModalFooter.style.display = 'flex';
        } catch (error) {
            console.error('Error extracting tags:', error);
            alert('提取标签失败: ' + error.message);
            closeExtractModal();
        }
    }

    function renderExtractTable() {
        extractTableBody.innerHTML = extractedTags.map(tag => `
            <tr>
                <td>${escapeHtml(tag.name)}</td>
                <td>${tag.count}</td>
            </tr>
        `).join('');
    }

    extractSaveBtn.addEventListener('click', async () => {
        if (extractedTags.length === 0) {
            closeExtractModal();
            return;
        }

        try {
            const tagsToSave = extractedTags.map(tag => ({
                id: tag.name,
                name: tag.name
            }));

            const result = await window.electronAPI.batchCreateTags(tagsToSave);
            
            if (result.error) {
                alert('保存标签失败: ' + result.error);
                return;
            }

            alert(`成功添加 ${result.addedCount} 个标签`);
            closeExtractModal();
        } catch (error) {
            console.error('Error saving extracted tags:', error);
            alert('保存标签失败: ' + error.message);
        }
    });

    extractCancelBtn.addEventListener('click', () => {
        if (confirm('是否关闭模态窗？')) {
            closeExtractModal();
        }
    });

    extractModalClose.addEventListener('click', () => {
        if (confirm('是否关闭模态窗？')) {
            closeExtractModal();
        }
    });

    function closeExtractModal() {
        extractModal.style.display = 'none';
        extractedTags = [];
    }

    // 初始加载
    loadTheme();
    loadTags();
});

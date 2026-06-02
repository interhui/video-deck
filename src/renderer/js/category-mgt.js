/**
 * 分类管理页面逻辑
 */
document.addEventListener('DOMContentLoaded', async () => {
    // 获取DOM元素
    const categoryList = document.getElementById('category-list');
    const emptyList = document.getElementById('empty-list');
    const noSelection = document.getElementById('no-selection');
    const categoryForm = document.getElementById('category-form');
    const formTitle = document.getElementById('form-title');
    const searchInput = document.getElementById('search-input');
    const closeBtn = document.getElementById('close-btn');
    const minimizeBtn = document.getElementById('minimize-btn');

    const categoryIdInput = document.getElementById('category-id');
    const categoryNameInput = document.getElementById('category-name');
    const categoryShortNameInput = document.getElementById('category-short-name');
    const categoryIconInput = document.getElementById('category-icon');
    const categoryColorInput = document.getElementById('category-color');
    const colorPreview = document.getElementById('color-preview');
    const categoryOrderInput = document.getElementById('category-order');

    const addCategoryBtn = document.getElementById('add-category-btn');
    const saveBtn = document.getElementById('save-btn');
    const cancelBtn = document.getElementById('cancel-btn');
    const deleteBtn = document.getElementById('delete-btn');

    // 状态
    let categories = [];
    let selectedCategory = null;
    let isCreating = false;

    // 关闭窗口
    closeBtn.addEventListener('click', () => {
        window.close();
    });

    // 最小化窗口
    minimizeBtn.addEventListener('click', () => {
        window.electronAPI.minimizeWindow();
    });

    // 监听主题变化
    window.electronAPI.onThemeChanged((theme) => {
        applyTheme(theme);
    });

    // 加载分类列表
    async function loadCategories() {
        try {
            categories = await window.electronAPI.getCategoriesFromCache();
            if (categories.error) {
                console.error('Error loading categories:', categories.error);
                categories = [];
            }
            renderCategoryList();
        } catch (error) {
            console.error('Error loading categories:', error);
            categories = [];
            renderCategoryList();
        }
    }

    // 渲染分类列表
    function renderCategoryList(filter = '') {
        const filteredCategories = filter
            ? categories.filter(c =>
                c.id.toLowerCase().includes(filter.toLowerCase()) ||
                (c.name && c.name.toLowerCase().includes(filter.toLowerCase())) ||
                (c.shortName && c.shortName.toLowerCase().includes(filter.toLowerCase()))
            )
            : categories;

        // 按order排序
        filteredCategories.sort((a, b) => (a.order || 0) - (b.order || 0));

        if (filteredCategories.length === 0) {
            categoryList.innerHTML = '';
            emptyList.style.display = 'flex';
            return;
        }

        emptyList.style.display = 'none';
        categoryList.innerHTML = filteredCategories.map(category => `
            <li class="item-card ${selectedCategory && selectedCategory.id === category.id ? 'selected' : ''}" data-id="${category.id}">
                <div class="item-name">
                    ${category.color ? `<span style="display: inline-block; width: 12px; height: 12px; border-radius: 2px; background: ${escapeHtml(category.color)}; margin-right: 8px; vertical-align: middle;"></span>` : ''}
                    ${escapeHtml(category.name)}
                </div>
                <div class="item-info">${escapeHtml(category.id)} ${category.shortName ? `(${escapeHtml(category.shortName)})` : ''}</div>
            </li>
        `).join('');

        // 绑定点击事件
        categoryList.querySelectorAll('.item-card').forEach(card => {
            card.addEventListener('click', () => selectCategory(card.dataset.id));
        });
    }

    // 选择分类
    function selectCategory(categoryId) {
        selectedCategory = categories.find(c => c.id === categoryId);
        isCreating = false;

        if (selectedCategory) {
            categoryIdInput.value = selectedCategory.id;
            categoryIdInput.disabled = true; // 编辑时不能修改ID
            categoryNameInput.value = selectedCategory.name || '';
            categoryShortNameInput.value = selectedCategory.shortName || '';
            categoryIconInput.value = selectedCategory.icon || '';
            categoryColorInput.value = selectedCategory.color || '#0078d4';
            colorPreview.style.background = selectedCategory.color || '#0078d4';
            categoryOrderInput.value = selectedCategory.order || 0;
            formTitle.textContent = '编辑分类';
            deleteBtn.style.display = 'block';
        }

        renderCategoryList(searchInput.value);
        showForm();
    }

    // 显示表单
    function showForm() {
        noSelection.style.display = 'none';
        categoryForm.style.display = 'block';
    }

    // 隐藏表单
    function hideForm() {
        categoryForm.style.display = 'none';
        noSelection.style.display = 'flex';
    }

    // 重置表单
    function resetForm() {
        categoryIdInput.value = '';
        categoryIdInput.disabled = false;
        categoryNameInput.value = '';
        categoryShortNameInput.value = '';
        categoryIconInput.value = '';
        categoryColorInput.value = '#0078d4';
        colorPreview.style.background = '#0078d4';
        categoryOrderInput.value = 0;
        selectedCategory = null;
        isCreating = false;
    }

    // 新建分类
    function createCategory() {
        resetForm();
        formTitle.textContent = '新建分类';
        deleteBtn.style.display = 'none';
        isCreating = true;
        showForm();
        categoryIdInput.focus();
    }

    // 保存分类
    async function saveCategory() {
        const id = categoryIdInput.value.trim();
        const name = categoryNameInput.value.trim();
        const shortName = categoryShortNameInput.value.trim();
        const icon = categoryIconInput.value.trim();
        const color = categoryColorInput.value;
        const order = parseInt(categoryOrderInput.value) || 0;

        if (!id || !name) {
            alert('请填写分类ID和名称');
            return;
        }

        try {
            const categoryData = {
                id,
                name,
                shortName,
                icon,
                color,
                order
            };

            let result;
            if (isCreating) {
                result = await window.electronAPI.createCategory(categoryData);
            } else {
                result = await window.electronAPI.updateCategory(categoryData);
            }

            if (result.error) {
                alert(result.error);
                return;
            }

            await loadCategories();
            resetForm();
            hideForm();
        } catch (error) {
            console.error('Error saving category:', error);
            alert('保存失败: ' + error.message);
        }
    }

    // 删除分类
    async function deleteCategory() {
        if (!selectedCategory) return;

        if (!confirm(`确定要删除分类"${selectedCategory.name}"吗？`)) {
            return;
        }

        try {
            const result = await window.electronAPI.deleteCategory(selectedCategory.id);
            if (result.error) {
                alert(result.error);
                return;
            }

            await loadCategories();
            resetForm();
            hideForm();
        } catch (error) {
            console.error('Error deleting category:', error);
            alert('删除失败: ' + error.message);
        }
    }

    // 事件绑定
    addCategoryBtn.addEventListener('click', createCategory);
    saveBtn.addEventListener('click', (e) => {
        e.preventDefault();
        saveCategory();
    });
    cancelBtn.addEventListener('click', () => {
        resetForm();
        hideForm();
        renderCategoryList(searchInput.value);
    });
    deleteBtn.addEventListener('click', deleteCategory);

    searchInput.addEventListener('input', (e) => {
        renderCategoryList(e.target.value);
    });

    // 颜色选择器预览
    categoryColorInput.addEventListener('input', (e) => {
        colorPreview.style.background = e.target.value;
    });

    // 监听分类更新事件
    window.electronAPI.onCategoriesUpdated(() => {
        loadCategories();
    });

    // 初始加载
    loadTheme();
    loadCategories();
});

/**
 * 公共工具函数模块
 * 集中管理多个页面共用的工具函数，避免代码冗余
 */

/**
 * 格式化视频时长（秒转为 HH:MM:SS 或 MM:SS 格式）
 * @param {string|number} seconds - 秒数
 * @returns {string} 格式化后的时长字符串
 */
function formatDuration(seconds) {
    if (!seconds) return '';
    const totalSeconds = parseInt(seconds, 10);
    if (isNaN(totalSeconds) || totalSeconds <= 0) return '';

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    if (hours > 0) {
        return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    } else {
        return `${minutes}:${String(secs).padStart(2, '0')}`;
    }
}

/**
 * 将文件转换为 base64
 * @param {File} file - 文件对象
 * @returns {Promise<string>} base64字符串
 */
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

/**
 * 应用主题
 * @param {string} theme - 主题名称 ('light' 或 'dark')
 */
function applyTheme(theme) {
    const links = document.querySelectorAll('link[rel="stylesheet"]');
    let themeLink = null;
    for (const link of links) {
        const href = link.getAttribute('href') || '';
        if (href.includes('themes/dark') || href.includes('themes/light')) {
            themeLink = link;
            break;
        }
    }
    if (themeLink) {
        const currentHref = themeLink.getAttribute('href');
        let newHref;
        if (theme === 'light') {
            newHref = currentHref.replace(/themes\/dark\.css$/, 'themes/light.css');
        } else {
            newHref = currentHref.replace(/themes\/light\.css$/, 'themes/dark.css');
        }
        themeLink.setAttribute('href', newHref);
    }
}

/**
 * 加载主题设置
 * @param {Object} options - 可选配置
 * @param {Function} options.onThemeLoaded - 主题加载后的回调
 */
async function loadTheme(options = {}) {
    try {
        const settings = await window.electronAPI.getSettings();
        if (settings && settings.appearance) {
            applyTheme(settings.appearance.theme);
        }
        if (options.onThemeLoaded) {
            options.onThemeLoaded(settings);
        }
        if (options.onLayoutLoaded && settings && settings.layout) {
            options.onLayoutLoaded(settings.layout);
        }
    } catch (error) {
        console.error('Error loading theme:', error);
    }
}

/**
 * HTML转义（带空值检查）
 * @param {string} text - 待转义的文本
 * @returns {string} 转义后的HTML安全字符串
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * 获取分类名称（优先使用shortName）
 * @param {string} categoryId - 分类ID
 * @param {Array} categoriesCache - 分类缓存数组
 * @returns {string} 分类名称
 */
function getCategoryName(categoryId, categoriesCache = []) {
    if (!categoryId) return '';

    // 优先从缓存获取
    if (categoriesCache.length > 0) {
        const category = categoriesCache.find(c => c.id === categoryId);
        if (category) {
            return category.shortName || category.name;
        }
    }

    // 如果缓存为空，使用硬编码的默认值
    const categoryNames = {
        'movie': '电影',
        'tv': '电视剧',
        'documentary': '纪录片',
        'anime': '动漫'
    };
    return categoryNames[categoryId] || categoryId;
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
 * 格式化生日显示
 * @param {string} birthday - 生日日期字符串
 * @returns {string} 格式化后的日期字符串
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
 * 获取状态文本
 * @param {string} status - 状态标识
 * @returns {string} 状态文本
 */
function getStatusText(status) {
    const statusMap = {
        'unwatched': '未观看',
        'watching': '观看中',
        'completed': '已完成',
        'new': '新电影'
    };
    return statusMap[status] || status;
}

/**
 * 格式化观看时长
 * @param {number} minutes - 分钟数
 * @returns {string} 格式化后的时长字符串
 */
function formatPlaytime(minutes) {
    if (!minutes || minutes === 0) return '-';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}分钟`;
    return `${hours}小时${mins > 0 ? mins + '分钟' : ''}`;
}

/**
 * 获取海报最小尺寸（用于自动响应式计算）
 * @param {string} size - 尺寸标识 ('small', 'medium', 'large')
 * @returns {string} CSS尺寸值
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
 * @param {string} size - 尺寸标识 ('small', 'medium', 'large')
 * @returns {string} CSS尺寸值
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
 * 应用海报尺寸设置到CSS变量
 * @param {Object} layout - 布局设置对象
 */
function applyPosterSizeSettings(layout) {
    document.documentElement.style.setProperty('--poster-min-width', getPosterMinSize(layout.posterSize));
    document.documentElement.style.setProperty('--poster-max-width', getPosterMaxSize(layout.posterSize));
}

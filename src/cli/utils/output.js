/**
 * CLI Output Formatting Utilities
 */
const Table = require('cli-table3');

/**
 * Format rating as stars
 * @param {number} rating - Rating value (0-5)
 * @returns {string} Star representation
 */
function formatRating(rating) {
    if (!rating || rating === 0) return '-';
    const stars = '★'.repeat(rating) + '☆'.repeat(5 - rating);
    return stars;
}

/**
 * Format status in Chinese
 * @param {string} status - Status value
 * @returns {string} Chinese status
 */
function formatStatus(status) {
    const statusMap = {
        'new': '新电影',
        'unwatched': '未观看',
        'watching': '观看中',
        'completed': '已完成'
    };
    return statusMap[status] || status || '-';
}

/**
 * Format play time in human readable format
 * @param {number} minutes - Total minutes
 * @returns {string} Formatted time
 */
function formatPlayTime(minutes) {
    if (!minutes || minutes === 0) return '-';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
        return `${hours}小时 ${mins}分钟`;
    }
    return `${mins}分钟`;
}

/**
 * Output movie list in table format
 * @param {Array} movies - Movie list
 * @param {object} options - Output options
 */
function outputMovieList(movies, options = {}) {
    const format = options.format || 'table';

    if (format === 'json') {
        console.log(JSON.stringify(movies, null, 2));
        return;
    }

    if (format === 'simple') {
        movies.forEach(movie => {
            console.log(`${movie.id} | ${movie.name} | ${movie.category} | ${formatRating(movie.userRating)} | ${formatStatus(movie.status)}`);
        });
        return;
    }

    // Table format
    const table = new Table({
        head: ['ID', '名称', '分类', '评分', '状态'],
        colWidths: [20, 25, 10, 10, 10]
    });

    movies.forEach(movie => {
        table.push([
            movie.id || movie.movieId || '-',
            movie.name || '-',
            movie.category || '-',
            formatRating(movie.userRating),
            formatStatus(movie.status)
        ]);
    });

    console.log(table.toString());
    console.log(`\n共 ${movies.length} 个电影`);
}

/**
 * Output movie detail
 * @param {object} movie - Movie detail
 */
function outputMovieDetail(movie) {
    const divider = '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';

    console.log(divider);
    console.log('  电影详情');
    console.log(divider);
    console.log(`  ID:          ${movie.id || movie.movieId || '-'}`);
    console.log(`  名称:        ${movie.name || '-'}`);
    console.log(`  分类:        ${movie.category || '-'}`);
    console.log(`  状态:        ${formatStatus(movie.status)}`);
    console.log(`  评分:        ${formatRating(movie.userRating)} (${movie.userRating || 0}/5)`);
    console.log(`  发行日期:    ${movie.publishDate || '-'}`);
    console.log(`  导演:        ${movie.director || '-'}`);
    console.log(`  演员:        ${movie.actors || '-'}`);
    console.log(`  制作商:      ${movie.studio || '-'}`);
    console.log(`  观看次数:    ${movie.playCount || 0} 次`);
    console.log(`  观看时长:    ${formatPlayTime(movie.totalPlayTime)}`);
    console.log(`  最后观看:    ${movie.lastPlayed || '-'}`);
    console.log(`  标签:        ${(movie.tags || []).join(', ') || '-'}`);
    console.log(`  描述:        ${movie.description || '-'}`);
    console.log(divider);
}

/**
 * Output box list in table format
 * @param {Array} boxes - Box list
 */
function outputBoxList(boxes) {
    const table = new Table({
        head: ['名称', '描述', '电影数', '分类'],
        colWidths: [20, 30, 10, 20]
    });

    boxes.forEach(box => {
        table.push([
            box.name || '-',
            box.description || '-',
            box.movieCount || 0,
            (box.categories || []).join(', ') || '-'
        ]);
    });

    console.log(table.toString());
    console.log(`\n共 ${boxes.length} 个收藏夹`);
}

/**
 * Output category list in table format
 * @param {Array} categories - Category list
 */
function outputCategoryList(categories) {
    const table = new Table({
        head: ['ID', '名称', '缩写', '电影数量'],
        colWidths: [15, 25, 10, 10]
    });

    categories.forEach(category => {
        table.push([
            category.id || '-',
            category.name || '-',
            category.shortName || '-',
            category.movieCount || 0
        ]);
    });

    console.log(table.toString());
}

/**
 * Output tag list in table format
 * @param {Array} tags - Tag list
 */
function outputTagList(tags) {
    const table = new Table({
        head: ['ID', '名称', '电影数'],
        colWidths: [20, 20, 10]
    });

    tags.forEach(tag => {
        table.push([
            tag.id || '-',
            tag.name || '-',
            tag.movieCount || 0
        ]);
    });

    console.log(table.toString());
}

/**
 * Output statistics
 * @param {object} stats - Statistics object
 */
function outputStats(stats) {
    const divider = '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';

    console.log(divider);
    console.log('  电影库统计');
    console.log(divider);
    console.log(`  电影总数:     ${stats.totalMovies || 0}`);
    console.log(`  平均评分:     ${stats.avgRating || 0}`);
    console.log(divider);
}

/**
 * Output success message
 * @param {string} message - Success message
 * @param {object} data - Additional data
 */
function outputSuccess(message, data = {}) {
    console.log(`✓ ${message}`);
    if (data && Object.keys(data).length > 0) {
        Object.entries(data).forEach(([key, value]) => {
            console.log(`  ${key}:   ${value}`);
        });
    }
}

/**
 * Output error message
 * @param {string} message - Error message
 * @param {string} hint - Hint for user
 */
function outputError(message, hint = '') {
    console.error(`✗ ${message}`);
    if (hint) {
        console.error(`  提示: ${hint}`);
    }
}

/**
 * Output import result
 * @param {object} result - Import result
 */
function outputImportResult(result) {
    console.log('\n导入结果:');
    console.log(`✓ 成功: ${result.success || 0}`);
    console.log(`✗ 失败: ${result.failed || 0}`);

    if (result.errors && result.errors.length > 0) {
        console.log('\n错误列表:');
        result.errors.forEach(err => {
            console.log(`  - ${err}`);
        });
    }
}

module.exports = {
    formatRating,
    formatStatus,
    formatPlayTime,
    outputMovieList,
    outputMovieDetail,
    outputBoxList,
    outputCategoryList,
    outputTagList,
    outputStats,
    outputSuccess,
    outputError,
    outputImportResult
};

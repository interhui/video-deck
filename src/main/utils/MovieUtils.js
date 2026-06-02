/**
 * 电影工具类
 * 提供电影相关的通用方法
 */

/**
 * 对电影列表进行排序
 * @param {Array} movies - 电影列表
 * @param {string} sortBy - 排序字段 (name, rating, year, actor, releasedate, addtime)
 * @param {string} sortOrder - 排序方向 (asc, desc)
 * @returns {Array} 排序后的列表
 */
function sortMovies(movies, sortBy = 'name', sortOrder = 'asc') {
    if (!movies || movies.length === 0) {
        return movies;
    }

    const sorted = [...movies];
    sorted.sort((a, b) => {
        let valA, valB;

        switch (sortBy) {
            case 'name':
                valA = (a.name || a.title || '').toLowerCase();
                valB = (b.name || b.title || '').toLowerCase();
                break;
            case 'rating':
                valA = a.userRating || 0;
                valB = b.userRating || 0;
                break;
            case 'year':
                valA = a.year || 0;
                valB = b.year || 0;
                break;
            case 'actor':
                valA = (a.actors && a.actors.length > 0) ? a.actors[0].toLowerCase() : '';
                valB = (b.actors && b.actors.length > 0) ? b.actors[0].toLowerCase() : '';
                break;
            case 'releasedate':
                valA = a.year || 0;
                valB = b.year || 0;
                break;
            case 'addtime':
                valA = a.update_time || 0;
                valB = b.update_time || 0;
                break;
            default:
                valA = (a.name || a.title || '').toLowerCase();
                valB = (b.name || b.title || '').toLowerCase();
        }

        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
    });

    return sorted;
}

module.exports = {
    sortMovies
};
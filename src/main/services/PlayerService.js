/**
 * 播放器服务
 * 负责管理播放列表和播放器窗口
 */
const path = require('path');

class PlayerService {
    constructor() {
        this.currentPlaylist = [];
        this.currentIndex = 0;
    }

    /**
     * 从电影数据构建播放列表
     * 从 fileset 中提取所有 Main 类型的文件
     * @param {Object} movieData - 电影数据
     * @returns {Array} 播放列表
     */
    getPlaylist(movieData) {
        const playlist = [];

        if (movieData && movieData.fileset && Array.isArray(movieData.fileset)) {
            for (const file of movieData.fileset) {
                // 检查 type 或 fileType 字段
                const fileType = file.type || file.fileType;
                if (fileType === 'Main' && file.fullpath) {
                    playlist.push({
                        path: file.fullpath,
                        title: file.original || file.filename || path.basename(file.fullpath),
                        codec: file.codec || file.videoCodec || '',
                        resolution: file.resolution || (file.videoWidth ? `${file.videoWidth}x${file.videoHeight}` : '')
                    });
                }
            }
        }

        // 如果没有 fileset 或没有 Main 类型文件，尝试使用 original_filename
        if (playlist.length === 0 && movieData && movieData.original_filename) {
            playlist.push({
                path: movieData.original_filename,
                title: movieData.title || path.basename(movieData.original_filename),
                codec: movieData.videoCodec || '',
                resolution: movieData.videoWidth ? `${movieData.videoWidth}x${movieData.videoHeight}` : ''
            });
        }

        return playlist;
    }

    /**
     * 打开播放器窗口
     * @param {Object} movieData - 电影数据
     * @param {Object} mainWindow - 主窗口引用
     * @param {Function} createPlayerWindow - 创建播放器窗口的函数
     */
    openPlayerWindow(movieData, mainWindow, createPlayerWindow) {
        const playlist = this.getPlaylist(movieData);
        if (playlist.length === 0) {
            throw new Error('没有可播放的文件');
        }

        this.currentPlaylist = playlist;
        this.currentIndex = 0;

        if (typeof createPlayerWindow === 'function') {
            createPlayerWindow({
                playlist: playlist,
                currentIndex: 0,
                movieTitle: movieData.title || '电影播放'
            });
        }
    }

    openBatchPlayerWindow(playlistData, mainWindow, createPlayerWindow) {
        if (!playlistData || playlistData.length === 0) {
            throw new Error('没有可播放的文件');
        }

        this.currentPlaylist = playlistData;
        this.currentIndex = 0;

        if (typeof createPlayerWindow === 'function') {
            createPlayerWindow({
                playlist: playlistData,
                currentIndex: 0,
                movieTitle: '批量播放'
            });
        }
    }

    /**
     * 获取当前播放列表
     */
    getCurrentPlaylist() {
        return this.currentPlaylist;
    }

    /**
     * 获取当前播放索引
     */
    getCurrentIndex() {
        return this.currentIndex;
    }

    /**
     * 下一首
     * @returns {Object|null} 下一首信息，如果没有下一首返回 null
     */
    next() {
        if (this.currentIndex < this.currentPlaylist.length - 1) {
            this.currentIndex++;
            return this.currentPlaylist[this.currentIndex];
        }
        return null;
    }

    /**
     * 上一首
     * @returns {Object|null} 上一首信息，如果没有上一首返回 null
     */
    previous() {
        if (this.currentIndex > 0) {
            this.currentIndex--;
            return this.currentPlaylist[this.currentIndex];
        }
        return null;
    }

    /**
     * 跳转到指定索引
     * @param {number} index - 目标索引
     * @returns {Object|null} 目标视频信息
     */
    goTo(index) {
        if (index >= 0 && index < this.currentPlaylist.length) {
            this.currentIndex = index;
            return this.currentPlaylist[this.currentIndex];
        }
        return null;
    }

    /**
     * 是否有下一首
     */
    hasNext() {
        return this.currentIndex < this.currentPlaylist.length - 1;
    }

    /**
     * 是否有上一首
     */
    hasPrevious() {
        return this.currentIndex > 0;
    }
}

module.exports = PlayerService;
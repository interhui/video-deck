/**
 * 视频信息获取服务
 * 负责使用ffmpeg/ffprobe获取视频文件的信息
 */
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');

class VideoInfoService {
    /**
     * 构造函数
     * @param {string} ffmpegPath - ffmpeg可执行文件路径
     * @param {string} ffprobePath - ffprobe可执行文件路径
     */
    constructor(ffmpegPath = '', ffprobePath = '') {
        this.ffmpegPath = ffmpegPath;
        this.ffprobePath = ffprobePath;
        this._configureFFmpeg();
    }

    /**
     * 配置ffmpeg和ffprobe路径
     * @private
     */
    _configureFFmpeg() {
        if (this.ffmpegPath) {
            ffmpeg.setFfmpegPath(this.ffmpegPath);
        }
        if (this.ffprobePath) {
            ffmpeg.setFfprobePath(this.ffprobePath);
        }
    }

    /**
     * 更新ffmpeg路径
     * @param {string} ffmpegPath - ffmpeg可执行文件路径
     */
    setFfmpegPath(ffmpegPath) {
        this.ffmpegPath = ffmpegPath;
        if (ffmpegPath) {
            ffmpeg.setFfmpegPath(ffmpegPath);
        }
    }

    /**
     * 更新ffprobe路径
     * @param {string} ffprobePath - ffprobe可执行文件路径
     */
    setFfprobePath(ffprobePath) {
        this.ffprobePath = ffprobePath;
        if (ffprobePath) {
            ffmpeg.setFfprobePath(ffprobePath);
        }
    }

    /**
     * 检查是否为视频文件
     * @param {string} filePath - 文件路径
     * @returns {boolean} 是否为视频文件
     */
    isVideoFile(filePath) {
        if (!filePath) return false;
        const videoExtensions = ['.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv', '.webm', '.m4v', '.mpg', '.mpeg', '.3gp', '.ts', '.mts', '.m2ts'];
        const ext = path.extname(filePath).toLowerCase();
        return videoExtensions.includes(ext);
    }

    /**
     * 获取视频信息
     * @param {string} videoPath - 视频文件路径
     * @returns {Promise<object>} 视频信息对象，包含codec、width、height、duration
     */
    getVideoInfo(videoPath) {
        return new Promise((resolve, reject) => {
            // 检查是否为视频文件
            if (!this.isVideoFile(videoPath)) {
                resolve(null);
                return;
            }

            // 创建ffprobe命令
            const command = ffmpeg(videoPath);

            // 如果指定了ffprobe路径，设置它
            if (this.ffprobePath) {
                command.setFfprobePath(this.ffprobePath);
            }

            // 执行ffprobe获取视频信息
            command.ffprobe((err, metadata) => {
                if (err) {
                    console.error('Read Video Info Error:', err);
                    reject(err);
                    return;
                }

                // 查找视频流
                const videoStream = metadata.streams.find(s => s.codec_type === 'video');

                if (!videoStream) {
                    resolve(null);
                    return;
                }

                // 提取视频信息
                const videoInfo = {
                    codec: videoStream.codec_name ? videoStream.codec_name.toUpperCase() : '',
                    width: videoStream.width || 0,
                    height: videoStream.height || 0,
                    duration: metadata.format.duration || 0
                };

                resolve(videoInfo);
            });
        });
    }

    /**
     * 格式化时长为人类可读格式
     * @param {number} seconds - 秒数
     * @returns {string} 格式化的时长字符串 (HH:MM:SS)
     */
    formatDuration(seconds) {
        if (!seconds || seconds <= 0) return '00:00:00';

        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);

        return [
            hours.toString().padStart(2, '0'),
            minutes.toString().padStart(2, '0'),
            secs.toString().padStart(2, '0')
        ].join(':');
    }

    /**
     * 格式化分辨率为字符串
     * @param {number} width - 宽度
     * @param {number} height - 高度
     * @returns {string} 分辨率字符串 (WxH)
     */
    formatResolution(width, height) {
        return `${width}x${height}`;
    }
}

module.exports = VideoInfoService;
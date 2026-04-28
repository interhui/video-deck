/**
 * 播放器逻辑
 */
document.addEventListener('DOMContentLoaded', () => {
    // 获取 DOM 元素
    const elements = {
        videoPlayer: document.getElementById('video-player'),
        progressBar: document.getElementById('progress-bar'),
        currentTime: document.getElementById('current-time'),
        totalTime: document.getElementById('total-time'),
        volumeBar: document.getElementById('volume-bar'),
        volumeDisplay: document.getElementById('volume-display'),
        muteBtn: document.getElementById('mute-btn'),
        playPauseBtn: document.getElementById('play-pause-btn'),
        stopBtn: document.getElementById('stop-btn'),
        prevBtn: document.getElementById('prev-btn'),
        nextBtn: document.getElementById('next-btn'),
        playlist: document.getElementById('playlist'),
        playerTitle: document.getElementById('player-title'),
        closeBtn: document.getElementById('close-btn')
    };

    // 状态
    let playlist = [];
    let currentIndex = 0;
    let isPlaying = false;

    // 格式化时间
    function formatTime(seconds) {
        if (isNaN(seconds) || seconds < 0) return '00:00';
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        if (h > 0) {
            return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        }
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }

    // 加载播放列表
    function loadPlaylist(playlistData, initialIndex = 0) {
        playlist = playlistData;
        currentIndex = initialIndex;
        renderPlaylist();
        playItem(currentIndex);
    }

    // 渲染播放列表
    function renderPlaylist() {
        elements.playlist.innerHTML = '';
        playlist.forEach((item, index) => {
            const div = document.createElement('div');
            div.className = 'playlist-item' + (index === currentIndex ? ' active' : '');
            div.innerHTML = `
                <span class="playlist-item-index">${index + 1}</span>
                <span class="playlist-item-title">${item.title || path.basename(item.path)}</span>
            `;
            div.addEventListener('click', () => playItem(index));
            elements.playlist.appendChild(div);
        });
    }

    // 播放指定项
    function playItem(index) {
        if (index < 0 || index >= playlist.length) return;

        currentIndex = index;
        const item = playlist[currentIndex];

        // 使用 file:// 协议播放本地视频
        const videoPath = item.path.replace(/\\/g, '/');
        const fileUrl = `file:///${videoPath}`;

        elements.videoPlayer.src = fileUrl;
        elements.videoPlayer.load();

        // 更新播放列表高亮
        document.querySelectorAll('.playlist-item').forEach((el, i) => {
            el.classList.toggle('active', i === currentIndex);
        });

        // 自动播放
        elements.videoPlayer.play().then(() => {
            isPlaying = true;
            updatePlayPauseBtn();
        }).catch(err => {
            console.error('播放失败:', err);
        });
    }

    // 更新播放/暂停按钮
    function updatePlayPauseBtn() {
        elements.playPauseBtn.textContent = isPlaying ? '⏸' : '▶';
    }

    // 更新进度条
    function updateProgress() {
        if (elements.videoPlayer.duration) {
            const progress = (elements.videoPlayer.currentTime / elements.videoPlayer.duration) * 100;
            elements.progressBar.value = progress;
            elements.currentTime.textContent = formatTime(elements.videoPlayer.currentTime);
        }
    }

    // 事件监听 - 视频播放
    elements.videoPlayer.addEventListener('timeupdate', updateProgress);

    elements.videoPlayer.addEventListener('loadedmetadata', () => {
        elements.totalTime.textContent = formatTime(elements.videoPlayer.duration);
    });

    // 播放结束，自动播放下一首
    elements.videoPlayer.addEventListener('ended', () => {
        if (currentIndex < playlist.length - 1) {
            playItem(currentIndex + 1);
        } else {
            isPlaying = false;
            updatePlayPauseBtn();
        }
    });

    // 播放/暂停
    elements.playPauseBtn.addEventListener('click', () => {
        if (elements.videoPlayer.paused) {
            elements.videoPlayer.play();
            isPlaying = true;
        } else {
            elements.videoPlayer.pause();
            isPlaying = false;
        }
        updatePlayPauseBtn();
    });

    // 停止
    elements.stopBtn.addEventListener('click', () => {
        elements.videoPlayer.pause();
        elements.videoPlayer.currentTime = 0;
        isPlaying = false;
        updatePlayPauseBtn();
    });

    // 上一首
    elements.prevBtn.addEventListener('click', () => {
        if (currentIndex > 0) {
            playItem(currentIndex - 1);
        }
    });

    // 下一首
    elements.nextBtn.addEventListener('click', () => {
        if (currentIndex < playlist.length - 1) {
            playItem(currentIndex + 1);
        }
    });

    // 进度条拖动
    elements.progressBar.addEventListener('input', (e) => {
        const time = (e.target.value / 100) * elements.videoPlayer.duration;
        elements.videoPlayer.currentTime = time;
    });

    // 音量控制
    elements.volumeBar.addEventListener('input', (e) => {
        const volume = e.target.value / 100;
        elements.videoPlayer.volume = volume;
        elements.volumeDisplay.textContent = `${e.target.value}%`;
        updateMuteBtn();
    });

    // 静音按钮
    elements.muteBtn.addEventListener('click', () => {
        elements.videoPlayer.muted = !elements.videoPlayer.muted;
        updateMuteBtn();
    });

    function updateMuteBtn() {
        const volume = elements.videoPlayer.muted ? 0 : elements.videoPlayer.volume * 100;
        elements.muteBtn.textContent = volume === 0 ? '🔇' : '🔊';
    }

    // 关闭按钮
    elements.closeBtn.addEventListener('click', () => {
        window.close();
    });

    // 键盘快捷键
    document.addEventListener('keydown', (e) => {
        switch (e.key) {
            case ' ':
            case 'k':
                e.preventDefault();
                elements.playPauseBtn.click();
                break;
            case 'ArrowLeft':
                elements.videoPlayer.currentTime = Math.max(0, elements.videoPlayer.currentTime - 10);
                break;
            case 'ArrowRight':
                elements.videoPlayer.currentTime = Math.min(elements.videoPlayer.duration, elements.videoPlayer.currentTime + 10);
                break;
            case 'ArrowUp':
                elements.volumeBar.value = Math.min(100, parseInt(elements.volumeBar.value) + 5);
                elements.volumeBar.dispatchEvent(new Event('input'));
                break;
            case 'ArrowDown':
                elements.volumeBar.value = Math.max(0, parseInt(elements.volumeBar.value) - 5);
                elements.volumeBar.dispatchEvent(new Event('input'));
                break;
            case 'm':
                elements.muteBtn.click();
                break;
        }
    });

    // 从主进程接收播放列表数据
    window.electronAPI.onLoadPlayerData((data) => {
        if (data) {
            elements.playerTitle.textContent = data.movieTitle || '电影播放';
            loadPlaylist(data.playlist || [], data.currentIndex || 0);
        }
    });
});
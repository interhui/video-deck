/**
 * 播放器逻辑
 */
document.addEventListener('DOMContentLoaded', async () => {
    // 加载主题设置
    await loadTheme();

    // 监听主题变化
    window.electronAPI.onThemeChanged((theme) => {
        applyTheme(theme);
    });

    // 获取 DOM 元素
    const elements = {
        videoPlayer: document.getElementById('video-player'),
        progressBar: document.getElementById('progress-bar'),
        currentTime: document.getElementById('current-time'),
        totalTime: document.getElementById('total-time'),
        volumeBar: document.getElementById('volume-bar'),
        muteBtn: document.getElementById('mute-btn'),
        playPauseBtn: document.getElementById('play-pause-btn'),
        stopBtn: document.getElementById('stop-btn'),
        prevBtn: document.getElementById('prev-btn'),
        nextBtn: document.getElementById('next-btn'),
        playlist: document.getElementById('playlist'),
        playerTitle: document.getElementById('player-title'),
        minimizeBtn: document.getElementById('minimize-btn'),
        closeBtn: document.getElementById('close-btn'),
        fullscreenBtn: document.getElementById('fullscreen-btn'),
        screenshotBtn: document.getElementById('screenshot-btn'),
        historyBtn: document.getElementById('history-btn'),
        historyModal: document.getElementById('player-history-modal'),
        historyCloseBtn: document.getElementById('history-close-btn'),
        historyClearBtn: document.getElementById('history-clear-btn'),
        historyMovieFilter: document.getElementById('history-movie-filter'),
        historyDateFilter: document.getElementById('history-date-filter'),
        historyList: document.getElementById('history-list'),
        addToBoxBtn: document.getElementById('add-to-box-btn'),
        addToBoxModal: document.getElementById('player-add-to-box-modal'),
        addToBoxCloseBtn: document.getElementById('add-to-box-close-btn'),
        addToBoxInfo: document.getElementById('add-to-box-info'),
        playerBoxSelect: document.getElementById('player-box-select'),
        confirmAddToBox: document.getElementById('confirm-add-to-box'),
        cancelAddToBox: document.getElementById('cancel-add-to-box')
    };

    let currentMovieId = null;
    let currentMovieFolderPath = null;

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
    function loadPlaylist(playlistData, initialIndex = 0, startTime = 0) {
        playlist = playlistData;
        currentIndex = initialIndex;
        renderPlaylist();
        playItem(currentIndex, startTime);
    }

    function removePlaylistItem(index) {
        if (index < 0 || index >= playlist.length) return;

        const isCurrentItem = index === currentIndex;

        if (isCurrentItem) {
            elements.videoPlayer.pause();
            isPlaying = false;
            updatePlayPauseBtn();
        }

        playlist.splice(index, 1);

        if (playlist.length === 0) {
            elements.videoPlayer.src = '';
            currentIndex = 0;
            elements.playerTitle.textContent = '电影播放';
            renderPlaylist();
        } else {
            if (isCurrentItem) {
                if (currentIndex >= playlist.length) {
                    currentIndex = playlist.length - 1;
                }
                playItem(currentIndex);
            } else if (index < currentIndex) {
                currentIndex--;
                renderPlaylist();
            } else {
                renderPlaylist();
            }
        }
    }

    function renderPlaylist() {
        elements.playlist.innerHTML = '';
        playlist.forEach((item, index) => {
            const div = document.createElement('div');
            div.className = 'playlist-item' + (index === currentIndex ? ' active' : '');
            div.innerHTML = `
                <span class="playlist-item-index">${index + 1}</span>
                <span class="playlist-item-title">${item.title || path.basename(item.path)}</span>
                <button class="playlist-item-remove" title="从播放列表移除">✕</button>
            `;
            div.addEventListener('click', (e) => {
                if (e.target.classList.contains('playlist-item-remove')) {
                    e.stopPropagation();
                    removePlaylistItem(index);
                } else {
                    playItem(index);
                }
            });
            elements.playlist.appendChild(div);
        });
    }

    // 播放指定项
    function playItem(index, startTime = 0) {
        if (index < 0 || index >= playlist.length) return;

        currentIndex = index;
        const item = playlist[currentIndex];

        const videoPath = item.path.replace(/\\/g, '/');
        const fileUrl = `file:///${videoPath}`;

        elements.videoPlayer.src = fileUrl;
        elements.videoPlayer.load();

        renderPlaylist();

        const seekToTime = () => {
            if (startTime > 0 && elements.videoPlayer.duration > startTime) {
                elements.videoPlayer.currentTime = startTime;
            }
            elements.videoPlayer.removeEventListener('loadedmetadata', seekToTime);
        };

        if (startTime > 0) {
            elements.videoPlayer.addEventListener('loadedmetadata', seekToTime);
        }

        elements.videoPlayer.play().then(() => {
            isPlaying = true;
            updatePlayPauseBtn();
            const movieName = item.title || path.basename(item.path);
            window.electronAPI.addPlayHistory(movieName).catch(err => {
                console.error('记录播放历史失败:', err);
            });
        }).catch(err => {
            console.error('播放失败:', err);
        });
    }

    // 更新播放/暂停按钮
    function updatePlayPauseBtn() {
        const svg = elements.playPauseBtn.querySelector('svg');
        if (isPlaying) {
            svg.innerHTML = '<rect x="6" y="4" width="4" height="14"/><rect x="14" y="4" width="4" height="14"/>';
        } else {
            svg.innerHTML = '<path d="M8 5v14l11-7z"/>';
        }
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

    // 最小化按钮
    elements.minimizeBtn.addEventListener('click', () => {
        window.electronAPI.minimizeWindow();
    });

    // 关闭按钮
    elements.closeBtn.addEventListener('click', () => {
        window.close();
    });

    // 全屏按钮
    elements.fullscreenBtn.addEventListener('click', () => {
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            elements.videoPlayer.requestFullscreen();
        }
    });

    // 全屏状态变化
    document.addEventListener('fullscreenchange', () => {
        const svg = elements.fullscreenBtn.querySelector('svg');
        if (document.fullscreenElement) {
            svg.innerHTML = '<path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/>';
        } else {
            svg.innerHTML = '<path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>';
        }
        elements.fullscreenBtn.title = document.fullscreenElement ? '退出全屏' : '全屏';
    });

    // 键盘快捷键
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey) {
            if (e.key === 'p' || e.key === 'P') {
                e.preventDefault();
                takeScreenshot();
                return;
            }
            if (e.key === 'f' || e.key === 'F') {
                e.preventDefault();
                elements.fullscreenBtn.click();
                return;
            }
        }
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
            case 's':
                takeScreenshot();
                break;
        }
    });

    function takeScreenshot() {
        if (!currentMovieId || !currentMovieFolderPath) {
            showScreenshotToast('无法保存截图：缺少电影信息');
            return;
        }

        const video = elements.videoPlayer;
        if (!video || video.readyState < 2) {
            showScreenshotToast('无法截图：视频未加载');
            return;
        }

        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const base64Data = canvas.toDataURL('image/jpeg', 0.95);
        const currentTime = video.currentTime;

        window.electronAPI.saveScreenshot(currentMovieId, currentMovieFolderPath, base64Data, currentTime).then(result => {
            if (result.success) {
                showScreenshotToast('截图已保存');
            } else {
                showScreenshotToast('截图保存失败：' + (result.error || '未知错误'));
            }
        }).catch(error => {
            showScreenshotToast('截图保存失败：' + error.message);
        });
    }

    function showScreenshotToast(message) {
        const existingToast = document.querySelector('.screenshot-toast');
        if (existingToast) {
            existingToast.remove();
        }

        const toast = document.createElement('div');
        toast.className = 'screenshot-toast';
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, 2000);
    }

    elements.screenshotBtn.addEventListener('click', takeScreenshot);

    elements.historyBtn.addEventListener('click', async () => {
        await loadAndDisplayHistory();
        elements.historyModal.style.display = 'flex';
    });

    elements.historyCloseBtn.addEventListener('click', () => {
        elements.historyModal.style.display = 'none';
    });

    elements.historyClearBtn.addEventListener('click', async () => {
        if (confirm('确定要清空所有播放历史记录吗？')) {
            await window.electronAPI.clearPlayHistory();
            await loadAndDisplayHistory();
        }
    });

    elements.historyModal.addEventListener('click', (e) => {
        if (e.target === elements.historyModal) {
            elements.historyModal.style.display = 'none';
        }
    });

    elements.historyMovieFilter.addEventListener('input', async () => {
        await loadAndDisplayHistory();
    });

    elements.historyDateFilter.addEventListener('input', async () => {
        await loadAndDisplayHistory();
    });

    async function loadAndDisplayHistory() {
        const movieName = elements.historyMovieFilter.value.trim();
        const date = elements.historyDateFilter.value;

        const history = await window.electronAPI.getPlayHistory(movieName, date);
        renderHistory(history);
    }

    function renderHistory(history) {
        elements.historyList.innerHTML = '';

        if (!history || !history.history || history.history.length === 0) {
            elements.historyList.innerHTML = '<div class="history-empty">暂无播放历史记录</div>';
            return;
        }

        history.history.forEach(entry => {
            const dateDiv = document.createElement('div');
            dateDiv.className = 'history-date';
            dateDiv.textContent = entry.date;
            elements.historyList.appendChild(dateDiv);

            entry.records.forEach(record => {
                const recordDiv = document.createElement('div');
                recordDiv.className = 'history-record';
                recordDiv.innerHTML = `
                    <span class="history-record-text">    ${record.time} ${record.movie}</span>
                    <button class="history-record-delete" title="删除此记录">✕</button>
                `;
                recordDiv.addEventListener('click', async (e) => {
                    if (e.target.classList.contains('history-record-delete')) {
                        e.stopPropagation();
                        await window.electronAPI.deletePlayHistory(entry.date, record.time);
                        await loadAndDisplayHistory();
                    }
                });
                elements.historyList.appendChild(recordDiv);
            });
        });
    }

    window.electronAPI.onLoadPlayerData((data) => {
        if (data) {
            elements.playerTitle.textContent = data.movieTitle || '电影播放';
            currentMovieId = data.movieId || null;
            currentMovieFolderPath = data.movieFolderPath || null;
            loadPlaylist(data.playlist || [], data.currentIndex || 0, data.startTime || 0);
        }
    });

    window.electronAPI.onAddToPlaylist((data) => {
        if (data && data.playlist && data.playlist.length > 0) {
            const addedCount = data.playlist.length;
            data.playlist.forEach(item => {
                playlist.push(item);
            });
            renderPlaylist();
            showScreenshotToast(`已添加 ${addedCount} 个视频到播放列表`);
        }
    });

    elements.addToBoxBtn.addEventListener('click', async () => {
        if (playlist.length === 0) {
            showScreenshotToast('播放列表为空，无法添加到收藏夹');
            return;
        }

        const boxes = await window.electronAPI.getAllBoxes();

        if (!boxes || boxes.length === 0) {
            showScreenshotToast('请先创建电影收藏夹');
            return;
        }

        elements.playerBoxSelect.innerHTML = '<option value="">选择电影收藏夹...</option>';
        boxes.forEach(box => {
            const option = document.createElement('option');
            option.value = box.name;
            option.textContent = `${box.name} (${box.movieCount}部电影)`;
            elements.playerBoxSelect.appendChild(option);
        });

        elements.addToBoxInfo.textContent = `播放列表共 ${playlist.length} 个视频`;
        elements.addToBoxModal.style.display = 'flex';
    });

    elements.addToBoxCloseBtn.addEventListener('click', () => {
        elements.addToBoxModal.style.display = 'none';
    });

    elements.cancelAddToBox.addEventListener('click', () => {
        elements.addToBoxModal.style.display = 'none';
    });

    elements.addToBoxModal.addEventListener('click', (e) => {
        if (e.target === elements.addToBoxModal) {
            elements.addToBoxModal.style.display = 'none';
        }
    });

    elements.confirmAddToBox.addEventListener('click', async () => {
        const boxName = elements.playerBoxSelect.value;

        if (!boxName) {
            showScreenshotToast('请选择电影收藏夹');
            return;
        }

        try {
            let addedCount = 0;

            for (const item of playlist) {
                if (item.movieId && item.category) {
                    const result = await window.electronAPI.addMovieToBox({
                        boxName: boxName,
                        category: item.category,
                        movieInfo: {
                            id: item.movieId,
                            status: 'unwatched',
                            rating: 0,
                            comment: ''
                        }
                    });

                    if (!result.error) {
                        addedCount++;
                    }
                }
            }

            showScreenshotToast(`已添加 ${addedCount} 个电影到 ${boxName}`);
            elements.addToBoxModal.style.display = 'none';
        } catch (error) {
            console.error('Error adding playlist to box:', error);
            showScreenshotToast('添加失败: ' + error.message);
        }
    });
});
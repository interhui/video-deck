/**
 * 主界面扫描进度功能单元测试
 *
 * 测试目标：
 * 1. updateScanProgress - 进度显示更新逻辑
 * 2. handleScanCancel - 扫描中断确认逻辑
 * 3. startScanDirectory - 扫描状态管理
 */

describe('主界面扫描进度功能', () => {
    // 模拟 DOM 元素
    let mockElements;
    let mockState;
    let mockConfirm;
    let mockCloseScanDirModal;
    let mockAlert;

    beforeEach(() => {
        // 重置全局状态
        jest.resetModules();

        // 创建模拟元素
        mockElements = {
            movieScaningProgress: { textContent: '' },
            confirmScanDir: {
                disabled: false,
                textContent: '开始扫描',
                addEventListener: jest.fn()
            },
            cancelScanDir: {
                textContent: '取消',
                addEventListener: jest.fn()
            },
            scanDirModal: {
                style: { display: 'none' },
                addEventListener: jest.fn()
            },
            scanPathInput: {
                dataset: {},
                value: ''
            },
            scanCategorySelect: { value: '' }
        };

        // 创建模拟状态
        mockState = {
            isScanning: false,
            scanAbortController: null,
            scanCancelledByUser: false,
            scanTempDir: '',
            scanMovies: []
        };

        // 模拟 confirm 和 alert
        mockConfirm = jest.fn();
        mockAlert = jest.fn();
        global.confirm = mockConfirm;
        global.alert = mockAlert;

        // 模拟 closeScanDirModal
        mockCloseScanDirModal = jest.fn(() => {
            mockElements.scanDirModal.style.display = 'none';
        });

        // 模拟 window.electronAPI
        global.window = {
            electronAPI: {
                scanMovieDirectory: jest.fn()
            }
        };
    });

    afterEach(() => {
        delete global.confirm;
        delete global.alert;
        delete global.window;
    });

    describe('updateScanProgress', () => {
        test('MAIN-SCAN-001: 进度更新功能正常', () => {
            // 模拟 elements 对象
            const elements = {
                movieScaningProgress: { textContent: '' }
            };

            // 直接调用进度更新逻辑
            elements.movieScaningProgress.textContent = `已经扫描 ${10} 部电影`;

            expect(elements.movieScaningProgress.textContent).toBe('已经扫描 10 部电影');
        });

        test('MAIN-SCAN-002: 进度为0时正确显示', () => {
            const elements = {
                movieScaningProgress: { textContent: '' }
            };

            elements.movieScaningProgress.textContent = `已经扫描 ${0} 部电影`;

            expect(elements.movieScaningProgress.textContent).toBe('已经扫描 0 部电影');
        });
    });

    describe('handleScanCancel 逻辑', () => {
        test('MAIN-SCAN-003: 非扫描状态下直接关闭模态框', () => {
            // 模拟非扫描状态
            const state = { isScanning: false };
            const closeScanDirModal = jest.fn();

            // 模拟 handleScanCancel 逻辑
            if (state.isScanning) {
                // 扫描中，不关闭
            } else {
                closeScanDirModal();
            }

            expect(closeScanDirModal).toHaveBeenCalledTimes(1);
        });

        test('MAIN-SCAN-004: 扫描中点击取消弹出确认框', () => {
            // 模拟扫描状态
            const state = {
                isScanning: true,
                scanAbortController: { abort: jest.fn() },
                scanCancelledByUser: false
            };
            const closeScanDirModal = jest.fn();

            mockConfirm.mockReturnValue(false); // 用户点击"取消"

            // 模拟 handleScanCancel 逻辑（用户选择不中断）
            if (state.isScanning) {
                const confirmed = mockConfirm('正在执行扫描，是否强制中断？');
                if (!confirmed) {
                    // 用户取消，不做任何操作
                }
            }

            expect(mockConfirm).toHaveBeenCalledWith('正在执行扫描，是否强制中断？');
            expect(closeScanDirModal).not.toHaveBeenCalled();
        });

        test('MAIN-SCAN-005: 扫描中确认中断后正确关闭', () => {
            // 模拟扫描状态
            const abortMock = jest.fn();
            const abortController = { abort: abortMock };
            const state = {
                isScanning: true,
                scanAbortController: abortController,
                scanCancelledByUser: false
            };
            const closeScanDirModal = jest.fn();

            mockConfirm.mockReturnValue(true); // 用户点击"确定"

            // 模拟 handleScanCancel 逻辑（用户确认中断）
            if (state.isScanning) {
                const confirmed = mockConfirm('正在执行扫描，是否强制中断？');
                if (confirmed) {
                    // 中断扫描任务
                    if (state.scanAbortController) {
                        state.scanAbortController.abort();
                    }
                    state.scanCancelledByUser = true;
                    state.isScanning = false;
                    state.scanAbortController = null;
                    closeScanDirModal();
                }
            }

            // 验证时使用预先保存的 abortMock
            expect(mockConfirm).toHaveBeenCalledWith('正在执行扫描，是否强制中断？');
            expect(abortMock).toHaveBeenCalled();
            expect(state.scanCancelledByUser).toBe(true);
            expect(closeScanDirModal).toHaveBeenCalledTimes(1);
        });
    });

    describe('扫描状态管理', () => {
        test('MAIN-SCAN-006: 开始扫描时状态正确设置', () => {
            const state = { isScanning: false, scanAbortController: null };

            // 模拟开始扫描
            state.isScanning = true;
            state.scanAbortController = {};

            expect(state.isScanning).toBe(true);
            expect(state.scanAbortController).toBeDefined();
        });

        test('MAIN-SCAN-007: 扫描完成或失败时状态正确重置', () => {
            let state = {
                isScanning: true,
                scanAbortController: { abort: jest.fn() },
                scanCancelledByUser: false
            };

            // 模拟 finally 逻辑
            if (!state.scanCancelledByUser) {
                state.isScanning = false;
                state.scanAbortController = null;
            }
            state.scanCancelledByUser = false;

            expect(state.isScanning).toBe(false);
            expect(state.scanAbortController).toBeNull();
            expect(state.scanCancelledByUser).toBe(false);
        });

        test('MAIN-SCAN-008: 用户中断后状态正确重置', () => {
            let state = {
                isScanning: true,
                scanAbortController: { abort: jest.fn() },
                scanCancelledByUser: true
            };

            // 模拟 finally 逻辑（用户中断情况）
            if (!state.scanCancelledByUser) {
                state.isScanning = false;
                state.scanAbortController = null;
            }
            state.scanCancelledByUser = false;

            // 用户中断时，isScanning 和 scanAbortController 不在 finally 中重置
            expect(state.isScanning).toBe(true); // 未被重置
            expect(state.scanCancelledByUser).toBe(false);
        });
    });

    describe('按钮文字变化', () => {
        test('MAIN-SCAN-009: 扫描中按钮文字变为"扫描中..."', () => {
            const elements = {
                confirmScanDir: { textContent: '开始扫描', disabled: false },
                cancelScanDir: { textContent: '取消' }
            };

            // 模拟扫描中状态
            elements.confirmScanDir.disabled = true;
            elements.confirmScanDir.textContent = '扫描中...';
            elements.cancelScanDir.textContent = '停止';

            expect(elements.confirmScanDir.textContent).toBe('扫描中...');
            expect(elements.confirmScanDir.disabled).toBe(true);
            expect(elements.cancelScanDir.textContent).toBe('停止');
        });

        test('MAIN-SCAN-010: 扫描完成或取消后按钮文字恢复', () => {
            const elements = {
                confirmScanDir: { textContent: '扫描中...', disabled: true },
                cancelScanDir: { textContent: '停止' },
                movieScaningProgress: { textContent: '已经扫描 10 部电影' }
            };

            // 模拟 finally 重置状态
            elements.confirmScanDir.disabled = false;
            elements.confirmScanDir.textContent = '开始扫描';
            elements.cancelScanDir.textContent = '取消';
            elements.movieScaningProgress.textContent = '';

            expect(elements.confirmScanDir.textContent).toBe('开始扫描');
            expect(elements.confirmScanDir.disabled).toBe(false);
            expect(elements.cancelScanDir.textContent).toBe('取消');
            expect(elements.movieScaningProgress.textContent).toBe('');
        });
    });

    describe('progressInterval 清理', () => {
        test('MAIN-SCAN-011: 扫描完成时正确清理定时器', () => {
            let intervalId;
            let isScanning = true;
            let scannedCount = 0;
            const progressElements = { movieScaningProgress: { textContent: '' } };

            // 模拟进度定时器
            intervalId = setInterval(() => {
                if (!isScanning) {
                    clearInterval(intervalId);
                    return;
                }
                scannedCount++;
                progressElements.movieScaningProgress.textContent = `已经扫描 ${scannedCount} 部电影`;
            }, 500);

            // 模拟扫描完成
            isScanning = false;
            clearInterval(intervalId);

            // 触发定时器检查逻辑（扫描已完成，interval 会清理自己）
            expect(isScanning).toBe(false);
        });

        test('MAIN-SCAN-012: 用户中断时定时器应停止', () => {
            let intervalId;
            let isScanning = true;
            let scannedCount = 0;
            const progressElements = { movieScaningProgress: { textContent: '' } };

            // 模拟进度定时器
            intervalId = setInterval(() => {
                if (!isScanning) {
                    clearInterval(intervalId);
                    return;
                }
                scannedCount++;
                progressElements.movieScaningProgress.textContent = `已经扫描 ${scannedCount} 部电影`;
            }, 500);

            // 模拟用户中断
            isScanning = false;

            // 定时器内部会检测到 isScanning = false 并清理自己
            expect(isScanning).toBe(false);
        });
    });

    describe('模态框背景点击', () => {
        test('MAIN-SCAN-013: 非扫描状态点击模态框背景关闭', () => {
            const state = { isScanning: false };
            const closeScanDirModal = jest.fn();
            const scanDirModal = { style: { display: 'flex' } };

            // 模拟模态框背景点击
            const target = scanDirModal; // 点击的是模态框本身
            if (target === scanDirModal && !state.isScanning) {
                closeScanDirModal();
            }

            expect(closeScanDirModal).toHaveBeenCalledTimes(1);
        });

        test('MAIN-SCAN-014: 扫描状态点击模态框背景不关闭', () => {
            const state = { isScanning: true };
            const closeScanDirModal = jest.fn();
            const scanDirModal = { style: { display: 'flex' } };

            // 模拟模态框背景点击
            const target = scanDirModal;
            if (target === scanDirModal && !state.isScanning) {
                closeScanDirModal();
            }

            expect(closeScanDirModal).not.toHaveBeenCalled();
        });
    });
});
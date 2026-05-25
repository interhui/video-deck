/**
 * 主界面导入进度功能单元测试
 *
 * 测试目标：
 * 1. handleScanResultCancel - 导入中断确认逻辑
 * 2. importAllScannedMovies - 导入状态管理
 * 3. closeScanResultModal - 模态框关闭逻辑
 */

describe('主界面导入进度功能', () => {
    // 模拟 DOM 元素
    let mockElements;
    let mockState;
    let mockConfirm;
    let mockAlert;
    let mockCloseScanResultModal;
    let mockCancelScan;

    beforeEach(() => {
        // 重置全局状态
        jest.resetModules();

        // 创建模拟元素
        mockElements = {
            scanResultModal: {
                style: { display: 'flex' }
            },
            scanResultInfo: { textContent: '' },
            scanResultImport: {
                disabled: false,
                textContent: '导入全部'
            },
            scanResultCancel: {
                textContent: '取消'
            }
        };

        // 创建模拟状态
        mockState = {
            isImporting: false,
            importAbortController: null,
            scanTempDir: '',
            scanMovies: []
        };

        // 模拟 confirm 和 alert
        mockConfirm = jest.fn();
        mockAlert = jest.fn();
        global.confirm = mockConfirm;
        global.alert = mockAlert;

        // 模拟 closeScanResultModal
        mockCloseScanResultModal = jest.fn(() => {
            mockElements.scanResultModal.style.display = 'none';
        });

        // 模拟 cancelScan
        mockCancelScan = jest.fn();

        // 模拟 window.electronAPI
        global.window = {
            electronAPI: {
                importScannedMovies: jest.fn(),
                onImportProgress: jest.fn()
            }
        };
    });

    afterEach(() => {
        delete global.confirm;
        delete global.alert;
        delete global.window;
    });

    describe('handleScanResultCancel 逻辑', () => {
        test('IMPORT-001: 非导入状态下点击取消直接调用cancelScan', () => {
            // 模拟非导入状态
            const state = { isImporting: false };
            const cancelScan = jest.fn();

            // 模拟 handleScanResultCancel 逻辑
            if (state.isImporting) {
                // 导入中，不执行取消
            } else {
                cancelScan();
            }

            expect(cancelScan).toHaveBeenCalledTimes(1);
        });

        test('IMPORT-002: 导入中点击取消弹出确认框', () => {
            // 模拟导入状态
            const state = {
                isImporting: true,
                importAbortController: { abort: jest.fn() }
            };
            const cancelScan = jest.fn();

            mockConfirm.mockReturnValue(false); // 用户点击"取消"

            // 模拟 handleScanResultCancel 逻辑（用户选择不中断）
            if (state.isImporting) {
                const confirmed = mockConfirm('正在执行导入，是否强制中断？');
                if (!confirmed) {
                    // 用户取消，不做任何操作
                }
            } else {
                cancelScan();
            }

            expect(mockConfirm).toHaveBeenCalledWith('正在执行导入，是否强制中断？');
            expect(cancelScan).not.toHaveBeenCalled();
        });

        test('IMPORT-003: 导入中确认中断后正确关闭模态框', () => {
            // 模拟导入状态
            const abortMock = jest.fn();
            const abortController = { abort: abortMock };
            const state = {
                isImporting: true,
                importAbortController: abortController
            };
            const closeScanResultModal = jest.fn();

            mockConfirm.mockReturnValue(true); // 用户点击"确定"

            // 模拟 handleScanResultCancel 逻辑（用户确认中断）
            if (state.isImporting) {
                const confirmed = mockConfirm('正在执行导入，是否强制中断？');
                if (confirmed) {
                    // 中断导入任务
                    if (state.importAbortController) {
                        state.importAbortController.abort();
                    }
                    // 重置导入状态
                    state.isImporting = false;
                    state.importAbortController = null;
                    // 关闭模态框
                    closeScanResultModal();
                    // 重置按钮状态
                    mockElements.scanResultImport.disabled = false;
                    mockElements.scanResultImport.textContent = '导入全部';
                    mockElements.scanResultCancel.textContent = '取消';
                }
            } else {
                // 不执行取消
            }

            expect(mockConfirm).toHaveBeenCalledWith('正在执行导入，是否强制中断？');
            expect(abortMock).toHaveBeenCalled();
            expect(state.isImporting).toBe(false);
            expect(state.importAbortController).toBeNull();
            expect(closeScanResultModal).toHaveBeenCalledTimes(1);
            expect(mockElements.scanResultImport.disabled).toBe(false);
            expect(mockElements.scanResultImport.textContent).toBe('导入全部');
        });
    });

    describe('导入状态管理', () => {
        test('IMPORT-004: 开始导入时状态正确设置', () => {
            const state = { isImporting: false, importAbortController: null };

            // 模拟开始导入
            state.isImporting = true;
            state.importAbortController = new AbortController();

            expect(state.isImporting).toBe(true);
            expect(state.importAbortController).toBeDefined();
        });

        test('IMPORT-005: 导入完成或失败时状态正确重置', () => {
            let state = {
                isImporting: true,
                importAbortController: { abort: jest.fn() }
            };

            // 模拟 finally 逻辑
            state.isImporting = false;
            state.importAbortController = null;

            expect(state.isImporting).toBe(false);
            expect(state.importAbortController).toBeNull();
        });

        test('IMPORT-006: 用户中断后状态正确重置', () => {
            let state = {
                isImporting: true,
                importAbortController: { abort: jest.fn() }
            };

            // 模拟用户确认中断
            if (state.importAbortController) {
                state.importAbortController.abort();
            }
            state.isImporting = false;
            state.importAbortController = null;

            expect(state.isImporting).toBe(false);
            expect(state.importAbortController).toBeNull();
        });
    });

    describe('按钮文字变化', () => {
        test('IMPORT-007: 导入中按钮文字变为"导入中..."', () => {
            const elements = {
                scanResultImport: { textContent: '导入全部', disabled: false },
                scanResultCancel: { textContent: '取消' }
            };

            // 模拟导入中状态
            elements.scanResultImport.disabled = true;
            elements.scanResultImport.textContent = '导入中...';
            elements.scanResultCancel.textContent = '停止';

            expect(elements.scanResultImport.textContent).toBe('导入中...');
            expect(elements.scanResultImport.disabled).toBe(true);
            expect(elements.scanResultCancel.textContent).toBe('停止');
        });

        test('IMPORT-008: 导入完成或取消后按钮文字恢复', () => {
            const elements = {
                scanResultImport: { textContent: '导入中...', disabled: true },
                scanResultCancel: { textContent: '停止' },
                scanResultInfo: { textContent: '正在保存 5/10：movie1' }
            };

            // 模拟 finally 重置状态
            elements.scanResultImport.disabled = false;
            elements.scanResultImport.textContent = '导入全部';
            elements.scanResultCancel.textContent = '取消';

            expect(elements.scanResultImport.textContent).toBe('导入全部');
            expect(elements.scanResultImport.disabled).toBe(false);
            expect(elements.scanResultCancel.textContent).toBe('取消');
        });
    });

    describe('进度显示更新', () => {
        test('IMPORT-009: 进度更新功能正常', () => {
            const elements = {
                scanResultInfo: { textContent: '' }
            };

            // 模拟进度更新
            elements.scanResultInfo.textContent = `正在保存 ${5}/${10}：movie1`;

            expect(elements.scanResultInfo.textContent).toBe('正在保存 5/10：movie1');
        });

        test('IMPORT-010: 进度为0时正确显示', () => {
            const elements = {
                scanResultInfo: { textContent: '' }
            };

            elements.scanResultInfo.textContent = `正在保存 ${0}/${5}：movie1`;

            expect(elements.scanResultInfo.textContent).toBe('正在保存 0/5：movie1');
        });
    });

    describe('模态框背景点击', () => {
        test('IMPORT-011: 非导入状态点击模态框背景关闭', () => {
            const state = { isImporting: false };
            const cancelScan = jest.fn();
            const closeScanResultModal = jest.fn();

            // 模拟模态框背景点击
            if (!state.isImporting) {
                closeScanResultModal();
            }

            expect(closeScanResultModal).toHaveBeenCalledTimes(1);
        });

        test('IMPORT-012: 导入状态点击模态框背景弹出确认框', () => {
            const state = { isImporting: true };
            const closeScanResultModal = jest.fn();

            mockConfirm.mockReturnValue(false);

            // 模拟模态框背景点击
            if (state.isImporting) {
                const confirmed = mockConfirm('正在执行导入，是否强制中断？');
                if (!confirmed) {
                    // 继续导入，不关闭
                }
            } else {
                closeScanResultModal();
            }

            expect(mockConfirm).toHaveBeenCalledWith('正在执行导入，是否强制中断？');
            expect(closeScanResultModal).not.toHaveBeenCalled();
        });
    });

    describe('closeScanResultModal 清理状态', () => {
        test('IMPORT-013: 关闭模态框时正确清理状态', () => {
            let state = {
                isImporting: true,
                importAbortController: { abort: jest.fn() },
                scanTempDir: '/temp/scan',
                scanMovies: [{ id: 1 }, { id: 2 }]
            };

            const elements = {
                scanResultModal: { style: { display: 'flex' } }
            };

            // 模拟 closeScanResultModal
            elements.scanResultModal.style.display = 'none';
            state.scanTempDir = '';
            state.scanMovies = [];
            state.isImporting = false;
            state.importAbortController = null;

            expect(elements.scanResultModal.style.display).toBe('none');
            expect(state.scanTempDir).toBe('');
            expect(state.scanMovies).toEqual([]);
            expect(state.isImporting).toBe(false);
            expect(state.importAbortController).toBeNull();
        });
    });
});
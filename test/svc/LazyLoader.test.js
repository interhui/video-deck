/**
 * LazyLoader 单元测试
 */

// Mock LazyLoader before importing
const mockLoadPage = jest.fn();
const mockOnRender = jest.fn();
const mockOnComplete = jest.fn();
const mockOnError = jest.fn();

// We need to evaluate the LazyLoader class directly since it's in a separate file
let LazyLoader;
let originalWindow;

beforeAll(() => {
    // Store original window
    originalWindow = global.window;

    // Create a minimal window mock
    global.window = {
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        pageYOffset: 0,
        innerHeight: 800
    };

    // Mock document
    global.document = {
        documentElement: {
            scrollTop: 0,
            scrollHeight: 1000
        },
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
    };

    // Import LazyLoader
    LazyLoader = require('../../src/renderer/js/utils/lazy-loader');
});

afterAll(() => {
    global.window = originalWindow;
});

describe('LazyLoader', () => {
    let loader;

    beforeEach(() => {
        // Reset mocks
        mockLoadPage.mockReset();
        mockOnRender.mockReset();
        mockOnComplete.mockReset();
        mockOnError.mockReset();

        // Default mock implementation
        mockLoadPage.mockImplementation((page, pageSize) => {
            return Promise.resolve({
                movies: Array(pageSize).fill({}).map((_, i) => ({
                    id: `movie-${page}-${i}`,
                    name: `Movie ${page}-${i}`
                })),
                total: 300,
                page,
                pageSize,
                totalPages: Math.ceil(300 / pageSize)
            });
        });
    });

    test('LAZY-001: 创建实例时初始化默认属性', () => {
        loader = new LazyLoader({
            loadPage: mockLoadPage,
            onRender: mockOnRender,
            onComplete: mockOnComplete,
            onError: mockOnError
        });

        expect(loader.currentPage).toBe(0);
        expect(loader.totalPages).toBe(0);
        expect(loader.isLoading).toBe(false);
        expect(loader.hasMore).toBe(true);
        expect(loader.pageSize).toBe(100);
    });

    test('LAZY-002: 自定义pageSize', () => {
        loader = new LazyLoader({
            loadPage: mockLoadPage,
            onRender: mockOnRender,
            onComplete: mockOnComplete,
            onError: mockOnError,
            pageSize: 50
        });

        expect(loader.pageSize).toBe(50);
    });

    test('LAZY-003: loadFirstPage调用loadPage并触发onRender', async () => {
        loader = new LazyLoader({
            loadPage: mockLoadPage,
            onRender: mockOnRender,
            onComplete: mockOnComplete,
            onError: mockOnError,
            pageSize: 100
        });

        await loader.loadFirstPage();

        expect(mockLoadPage).toHaveBeenCalledWith(1, 100);
        expect(mockOnRender).toHaveBeenCalled();
        expect(loader.currentPage).toBe(1);
    });

    test('LAZY-004: loadNextPage递增页码', async () => {
        loader = new LazyLoader({
            loadPage: mockLoadPage,
            onRender: mockOnRender,
            onComplete: mockOnComplete,
            onError: mockOnError,
            pageSize: 100
        });

        await loader.loadFirstPage();
        await loader.loadNextPage();

        expect(mockLoadPage).toHaveBeenCalledWith(2, 100);
        expect(loader.currentPage).toBe(2);
    });

    test('LAZY-005: 加载完成后hasMore为false', async () => {
        mockLoadPage.mockImplementationOnce((page, pageSize) => {
            return Promise.resolve({
                movies: [{ id: 'movie-1', name: 'Movie 1' }],
                total: 1,
                page,
                pageSize,
                totalPages: 1
            });
        });

        loader = new LazyLoader({
            loadPage: mockLoadPage,
            onRender: mockOnRender,
            onComplete: mockOnComplete,
            onError: mockOnError,
            pageSize: 100
        });

        await loader.loadFirstPage();

        expect(loader.hasMore).toBe(false);
        expect(mockOnComplete).toHaveBeenCalled();
    });

    test('LAZY-006: 加载失败时调用onError', async () => {
        mockLoadPage.mockImplementationOnce(() => {
            return Promise.reject(new Error('Load failed'));
        });

        loader = new LazyLoader({
            loadPage: mockLoadPage,
            onRender: mockOnRender,
            onComplete: mockOnComplete,
            onError: mockOnError,
            pageSize: 100
        });

        await loader.loadFirstPage();

        expect(mockOnError).toHaveBeenCalledWith(expect.any(Error));
    });

    test('LAZY-007: reset重置状态', async () => {
        loader = new LazyLoader({
            loadPage: mockLoadPage,
            onRender: mockOnRender,
            onComplete: mockOnComplete,
            onError: mockOnError,
            pageSize: 100
        });

        await loader.loadFirstPage();
        loader.reset();

        expect(loader.currentPage).toBe(0);
        expect(loader.totalPages).toBe(0);
        expect(loader.isLoading).toBe(false);
        expect(loader.hasMore).toBe(true);
    });

    test('LAZY-008: destroy清理资源', async () => {
        loader = new LazyLoader({
            loadPage: mockLoadPage,
            onRender: mockOnRender,
            onComplete: mockOnComplete,
            onError: mockOnError,
            pageSize: 100
        });

        await loader.loadFirstPage();
        loader.destroy();

        expect(loader.loadPage).toBeNull();
        expect(loader.onRender).toBeNull();
        expect(loader.onComplete).toBeNull();
        expect(loader.onError).toBeNull();
    });

    test('LAZY-009: getLoadedCount返回已加载数量', async () => {
        loader = new LazyLoader({
            loadPage: mockLoadPage,
            onRender: mockOnRender,
            onComplete: mockOnComplete,
            onError: mockOnError,
            pageSize: 100
        });

        await loader.loadFirstPage();

        expect(loader.getLoadedCount()).toBe(100);
    });

    test('LAZY-010: getIsLoading返回加载状态', async () => {
        mockLoadPage.mockImplementation(() => {
            return new Promise(resolve => {
                setTimeout(() => {
                    resolve({
                        movies: [],
                        total: 0,
                        page: 1,
                        pageSize: 100,
                        totalPages: 0
                    });
                }, 100);
            });
        });

        loader = new LazyLoader({
            loadPage: mockLoadPage,
            onRender: mockOnRender,
            onComplete: mockOnComplete,
            onError: mockOnError,
            pageSize: 100
        });

        const loadPromise = loader.loadFirstPage();
        expect(loader.getIsLoading()).toBe(true);

        await loadPromise;
        expect(loader.getIsLoading()).toBe(false);
    });

    test('LAZY-011: getHasMore返回是否有更多数据', async () => {
        loader = new LazyLoader({
            loadPage: mockLoadPage,
            onRender: mockOnRender,
            onComplete: mockOnComplete,
            onError: mockOnError,
            pageSize: 100
        });

        expect(loader.getHasMore()).toBe(true);

        await loader.loadFirstPage();
        // hasMore depends on total and current page
        expect(typeof loader.getHasMore()).toBe('boolean');
    });
});

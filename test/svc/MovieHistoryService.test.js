/**
 * MovieHistoryService 单元测试
 */
const MovieHistoryService = require('../../src/main/services/MovieHistoryService');
const path = require('path');
const fs = require('fs');

describe('MovieHistoryService', () => {
    let service;
    let testDataDir;

    beforeEach(() => {
        testDataDir = path.join(__dirname, 'test-data', 'history');
        if (!fs.existsSync(testDataDir)) {
            fs.mkdirSync(testDataDir, { recursive: true });
        }
        service = new MovieHistoryService(testDataDir);
    });

    afterEach(() => {
        if (fs.existsSync(testDataDir)) {
            fs.rmSync(testDataDir, { recursive: true, force: true });
        }
    });

    describe('constructor', () => {
        test('SVC-HISTORY-001: 创建实例初始化空历史记录', async () => {
            await service.getLoadPromise();
            const history = service.getHistory();
            expect(history).toBeDefined();
            expect(history.history).toBeDefined();
            expect(Array.isArray(history.history)).toBe(true);
        });
    });

    describe('addRecord', () => {
        test('SVC-HISTORY-002: 添加第一条播放记录', async () => {
            await service.getLoadPromise();
            await service.addRecord('ET外星人', 'movie-001');
            const history = service.getHistory();
            expect(history.history.length).toBe(1);
            expect(history.history[0].records.length).toBe(1);
            expect(history.history[0].records[0].movieName).toBe('ET外星人');
            expect(history.history[0].records[0].movieId).toBe('movie-001');
        });

        test('SVC-HISTORY-003: 同一天添加多条记录', async () => {
            await service.getLoadPromise();
            await service.addRecord('ET外星人', 'movie-001');
            await service.addRecord('珍珠港', 'movie-002');
            const history = service.getHistory();
            expect(history.history.length).toBe(1);
            expect(history.history[0].records.length).toBe(2);
            expect(history.history[0].records[0].movieName).toBe('ET外星人');
            expect(history.history[0].records[0].movieId).toBe('movie-001');
            expect(history.history[0].records[1].movieName).toBe('珍珠港');
            expect(history.history[0].records[1].movieId).toBe('movie-002');
        });

        test('SVC-HISTORY-004: 不同日期添加记录', async () => {
            await service.getLoadPromise();
            await service.addRecord('ET外星人', 'movie-001');
            
            const originalDate = service.formatDate(new Date());
            const mockDate = new Date();
            mockDate.setDate(mockDate.getDate() - 1);
            
            const historyFilePath = path.join(testDataDir, 'history.json');
            const existingHistory = await service.fileService.readJson(historyFilePath);
            existingHistory.history.unshift({
                date: service.formatDate(mockDate),
                records: [{ time: '10:00:00', movieName: '一个好人', movieId: 'movie-003' }]
            });
            await service.fileService.writeJson(historyFilePath, existingHistory);
            
            const newService = new MovieHistoryService(testDataDir);
            await newService.getLoadPromise();
            await newService.addRecord('珍珠港', 'movie-002');
            
            const history = newService.getHistory();
            expect(history.history.length).toBe(2);
        });
    });

    describe('trimHistory', () => {
        test('SVC-HISTORY-005: 超过1000条记录时自动裁剪', async () => {
            await service.getLoadPromise();
            
            const historyFilePath = path.join(testDataDir, 'history.json');
            const mockHistory = { history: [] };
            
            for (let i = 0; i < 50; i++) {
                const date = `2026-05-${String(i + 1).padStart(2, '0')}`;
                const records = [];
                for (let j = 0; j < 25; j++) {
                    records.push({
                        time: `${String(j).padStart(2, '0')}:00:00`,
                        movieName: `电影${i * 25 + j}`,
                        movieId: `id-${i * 25 + j}`
                    });
                }
                mockHistory.history.push({ date, records });
            }
            
            await service.fileService.writeJson(historyFilePath, mockHistory);
            
            const newService = new MovieHistoryService(testDataDir);
            await newService.getLoadPromise();
            await newService.addRecord('新电影', 'new-movie');
            
            const history = newService.getHistory();
            let totalRecords = 0;
            history.history.forEach(entry => {
                totalRecords += entry.records.length;
            });
            
            expect(totalRecords).toBeLessThanOrEqual(1000);
        });
    });

    describe('filterHistory', () => {
        test('SVC-HISTORY-006: 根据电影名称筛选', async () => {
            await service.getLoadPromise();
            await service.addRecord('ET外星人', 'movie-001');
            await service.addRecord('珍珠港', 'movie-002');
            await service.addRecord('ET回家', 'movie-003');
            
            const filtered = service.filterHistory('ET', null);
            expect(filtered.history.length).toBe(1);
            expect(filtered.history[0].records.length).toBe(2);
        });

        test('SVC-HISTORY-007: 根据日期筛选', async () => {
            await service.getLoadPromise();
            await service.addRecord('ET外星人', 'movie-001');
            
            const today = service.formatDate(new Date());
            const filtered = service.filterHistory(null, today);
            expect(filtered.history.length).toBe(1);
            expect(filtered.history[0].date).toBe(today);
        });

        test('SVC-HISTORY-008: 同时根据电影名称和日期筛选', async () => {
            await service.getLoadPromise();
            await service.addRecord('ET外星人', 'movie-001');
            await service.addRecord('珍珠港', 'movie-002');
            
            const today = service.formatDate(new Date());
            const filtered = service.filterHistory('ET', today);
            expect(filtered.history.length).toBe(1);
            expect(filtered.history[0].records.length).toBe(1);
        });
    });

    describe('formatDate / formatTime', () => {
        test('SVC-HISTORY-009: 格式化日期为YYYY-MM-DD', () => {
            const date = new Date(2026, 4, 27);
            const formatted = service.formatDate(date);
            expect(formatted).toBe('2026-05-27');
        });

        test('SVC-HISTORY-010: 格式化时间为HH:MM:SS', () => {
            const date = new Date(2026, 4, 27, 14, 30, 5);
            const formatted = service.formatTime(date);
            expect(formatted).toBe('14:30:05');
        });
    });

    describe('clearHistory', () => {
        test('SVC-HISTORY-011: 清空历史记录', async () => {
            await service.getLoadPromise();
            await service.addRecord('ET外星人', 'movie-001');
            await service.clearHistory();
            
            const history = service.getHistory();
            expect(history.history.length).toBe(0);
        });
    });

    describe('deleteRecord', () => {
        test('SVC-HISTORY-013: 删除单条记录', async () => {
            await service.getLoadPromise();
            await service.addRecord('ET外星人', 'movie-001');
            await service.addRecord('珍珠港', 'movie-002');
            
            const history = service.getHistory();
            const date = history.history[0].date;
            const time = history.history[0].records[0].time;
            
            await service.deleteRecord(date, time);
            
            const updatedHistory = service.getHistory();
            expect(updatedHistory.history[0].records.length).toBe(1);
            expect(updatedHistory.history[0].records[0].movieName).toBe('珍珠港');
        });

        test('SVC-HISTORY-014: 删除记录后日期条目自动移除', async () => {
            await service.getLoadPromise();
            await service.addRecord('ET外星人', 'movie-001');
            
            const history = service.getHistory();
            const date = history.history[0].date;
            const time = history.history[0].records[0].time;
            
            await service.deleteRecord(date, time);
            
            const updatedHistory = service.getHistory();
            expect(updatedHistory.history.length).toBe(0);
        });

        test('SVC-HISTORY-015: 删除不存在的时间记录不影响历史', async () => {
            await service.getLoadPromise();
            await service.addRecord('ET外星人', 'movie-001');
            
            const history = service.getHistory();
            const date = history.history[0].date;
            
            await service.deleteRecord(date, '99:99:99');
            
            const updatedHistory = service.getHistory();
            expect(updatedHistory.history[0].records.length).toBe(1);
        });

        test('SVC-HISTORY-016: 删除不存在日期的记录不影响历史', async () => {
            await service.getLoadPromise();
            await service.addRecord('ET外星人', 'movie-001');
            
            await service.deleteRecord('2020-01-01', '10:00:00');
            
            const updatedHistory = service.getHistory();
            expect(updatedHistory.history.length).toBe(1);
        });
    });

    describe('saveHistory / loadHistory', () => {
        test('SVC-HISTORY-012: 保存和加载历史记录', async () => {
            await service.getLoadPromise();
            await service.addRecord('ET外星人', 'movie-001');
            
            const historyFilePath = path.join(testDataDir, 'history.json');
            const savedData = await service.fileService.readJson(historyFilePath);
            expect(savedData.history.length).toBe(1);
            
            const newService = new MovieHistoryService(testDataDir);
            await newService.getLoadPromise();
            const loadedHistory = newService.getHistory();
            expect(loadedHistory.history.length).toBe(1);
            expect(loadedHistory.history[0].records[0].movieName).toBe('ET外星人');
            expect(loadedHistory.history[0].records[0].movieId).toBe('movie-001');
        });
    });
});
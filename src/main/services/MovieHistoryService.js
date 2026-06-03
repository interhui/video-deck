/**
 * 播放历史记录服务
 * 负责播放历史记录的读取、保存和管理
 */
const FileService = require('./FileService');
const path = require('path');

const MAX_HISTORY_RECORDS = 1000;

class MovieHistoryService {
    constructor(configPath) {
        this.configPath = configPath;
        this.historyFilePath = path.join(configPath, 'history.json');
        this.fileService = new FileService();
        this.history = { history: [] };
        this.loadPromise = this.loadHistory();
    }

    async loadHistory() {
        try {
            const data = await this.fileService.readJson(this.historyFilePath);
            if (data && data.history) {
                this.history = data;
            } else {
                this.history = { history: [] };
            }
            return this.history;
        } catch (error) {
            console.error('Error loading history:', error);
            this.history = { history: [] };
            return this.history;
        }
    }

    getLoadPromise() {
        return this.loadPromise;
    }

    async addRecord(movieName, movieId) {
        await this.loadPromise;

        const now = new Date();
        const date = this.formatDate(now);
        const time = this.formatTime(now);

        const newRecord = {
            time: time,
            movieName: movieName,
            movieId: movieId || ''
        };

        const dateEntry = this.history.history.find(entry => entry.date === date);
        if (dateEntry) {
            dateEntry.records.push(newRecord);
        } else {
            this.history.history.push({
                date: date,
                records: [newRecord]
            });
        }

        this.trimHistory();
        await this.saveHistory();
    }

    trimHistory() {
        let totalRecords = 0;
        for (const entry of this.history.history) {
            totalRecords += entry.records.length;
        }

        while (totalRecords > MAX_HISTORY_RECORDS && this.history.history.length > 0) {
            const firstEntry = this.history.history[0];
            if (firstEntry.records.length > 0) {
                firstEntry.records.shift();
                totalRecords--;
                if (firstEntry.records.length === 0) {
                    this.history.history.shift();
                }
            } else {
                this.history.history.shift();
            }
        }
    }

    async saveHistory() {
        try {
            await this.fileService.writeJson(this.historyFilePath, this.history);
        } catch (error) {
            console.error('Error saving history:', error);
            throw error;
        }
    }

    getHistory() {
        return this.history;
    }

    filterHistory(movieName, date) {
        let filtered = this.history.history;

        if (date) {
            filtered = filtered.filter(entry => entry.date === date);
        }

        if (movieName) {
            filtered = filtered.map(entry => ({
                date: entry.date,
                records: entry.records.filter(record => 
                    record.movieName.toLowerCase().includes(movieName.toLowerCase())
                )
            })).filter(entry => entry.records.length > 0);
        }

        return { history: filtered };
    }

    formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    formatTime(date) {
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return `${hours}:${minutes}:${seconds}`;
    }

    async clearHistory() {
        this.history = { history: [] };
        await this.saveHistory();
    }

    async deleteRecord(date, time) {
        await this.loadPromise;

        const dateEntry = this.history.history.find(entry => entry.date === date);
        if (dateEntry) {
            const recordIndex = dateEntry.records.findIndex(record => record.time === time);
            if (recordIndex !== -1) {
                dateEntry.records.splice(recordIndex, 1);
                if (dateEntry.records.length === 0) {
                    const dateIndex = this.history.history.findIndex(entry => entry.date === date);
                    if (dateIndex !== -1) {
                        this.history.history.splice(dateIndex, 1);
                    }
                }
                await this.saveHistory();
            }
        }
    }
}

module.exports = MovieHistoryService;
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

class ScreenshotService {
    constructor() {
        this.SCREENSHOT_PATTERN = /^screenshot_(\d+)\.jpg$/i;
        this.SCREENSHOT_PREFIX = 'screenshot_';
        this.SCREENSHOT_EXT = '.jpg';
    }

    async getScreenshots(movieFolderPath) {
        if (!movieFolderPath) {
            return [];
        }

        try {
            const exists = await fs.access(movieFolderPath).then(() => true).catch(() => false);
            if (!exists) {
                return [];
            }

            const files = await fs.readdir(movieFolderPath);
            const screenshots = [];

            for (const file of files) {
                const match = file.match(this.SCREENSHOT_PATTERN);
                if (match) {
                    const number = parseInt(match[1], 10);
                    screenshots.push({
                        filename: file,
                        number: number,
                        path: path.join(movieFolderPath, file)
                    });
                }
            }

            screenshots.sort((a, b) => a.number - b.number);
            return screenshots;
        } catch (error) {
            console.error('Error getting screenshots:', error.message || error);
            return [];
        }
    }

    getScreenshotCurrentTime(currentTime) {
        return Math.floor(currentTime);
    }

    generateScreenshotFilename(number) {
        return `${this.SCREENSHOT_PREFIX}${number}${this.SCREENSHOT_EXT}`;
    }

    async saveScreenshot(movieFolderPath, imageData, number) {
        if (!movieFolderPath || !imageData) {
            throw new Error('Movie folder path and image data are required');
        }

        try {
            const exists = await fs.access(movieFolderPath).then(() => true).catch(() => false);
            if (!exists) {
                await fs.mkdir(movieFolderPath, { recursive: true });
            }

            const filename = this.generateScreenshotFilename(number);
            const filePath = path.join(movieFolderPath, filename);

            let buffer;
            if (typeof imageData === 'string') {
                if (imageData.startsWith('data:image')) {
                    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
                    buffer = Buffer.from(base64Data, 'base64');
                } else {
                    buffer = Buffer.from(imageData, 'base64');
                }
            } else if (Buffer.isBuffer(imageData)) {
                buffer = imageData;
            } else {
                throw new Error('Invalid image data format');
            }

            await fs.writeFile(filePath, buffer);
            return {
                success: true,
                path: filePath,
                filename: filename,
                number: number
            };
        } catch (error) {
            console.error('Error saving screenshot:', error.message || error);
            throw error;
        }
    }

    async deleteScreenshot(movieFolderPath, number) {
        if (!movieFolderPath || !number) {
            throw new Error('Movie folder path and number are required');
        }

        try {
            const filename = this.generateScreenshotFilename(number);
            const filePath = path.join(movieFolderPath, filename);

            const exists = await fs.access(filePath).then(() => true).catch(() => false);
            if (!exists) {
                return { success: false, error: 'Screenshot file not found' };
            }

            await fs.unlink(filePath);
            return { success: true };
        } catch (error) {
            console.error('Error deleting screenshot:', error.message || error);
            return { success: false, error: error.message };
        }
    }

    async screenshotExists(movieFolderPath, number) {
        if (!movieFolderPath || !number) {
            return false;
        }

        try {
            const filename = this.generateScreenshotFilename(number);
            const filePath = path.join(movieFolderPath, filename);
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    }

    readScreenshotAsBase64Sync(movieFolderPath, number) {
        if (!movieFolderPath || !number) {
            return null;
        }

        try {
            const filename = this.generateScreenshotFilename(number);
            const filePath = path.join(movieFolderPath, filename);

            if (!fsSync.existsSync(filePath)) {
                return null;
            }

            const buffer = fsSync.readFileSync(filePath);
            return `data:image/jpeg;base64,${buffer.toString('base64')}`;
        } catch (error) {
            console.error('Error reading screenshot:', error.message || error);
            return null;
        }
    }

    async readScreenshotAsBase64(movieFolderPath, number) {
        if (!movieFolderPath || !number) {
            return null;
        }

        try {
            const filename = this.generateScreenshotFilename(number);
            const filePath = path.join(movieFolderPath, filename);

            const exists = await fs.access(filePath).then(() => true).catch(() => false);
            if (!exists) {
                return null;
            }

            const buffer = await fs.readFile(filePath);
            return `data:image/jpeg;base64,${buffer.toString('base64')}`;
        } catch (error) {
            console.error('Error reading screenshot:', error.message || error);
            return null;
        }
    }
}

module.exports = ScreenshotService;
/**
 * HTTP请求工具模块
 * 用于主进程服务的HTTP请求
 */
const https = require('https');
const http = require('http');
const zlib = require('zlib');
const fsSync = require('fs');
const { HttpsProxyAgent } = require('https-proxy-agent');

let globalProxyAgent = null;

function setGlobalProxy(proxyUrl) {
    if (proxyUrl) {
        globalProxyAgent = new HttpsProxyAgent(proxyUrl);
    } else {
        globalProxyAgent = null;
    }
}

function getGlobalProxyAgent() {
    return globalProxyAgent;
}

/**
 * 发送HTTPS GET请求
 * @param {string} url - 请求URL（可以是完整URL或hostname+path格式）
 * @param {Object} options - 请求选项
 * @param {string} options.token - 认证Token（可选）
 * @param {Object} options.headers - 自定义请求头（可选）
 * @param {number} options.timeout - 超时时间（毫秒，默认10000）
 * @returns {Promise<Object>} 返回JSON响应数据
 */
function makeHttpRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const timeout = options.timeout || 10000;

        let requestOptions;

        if (url.startsWith('http://') || url.startsWith('https://')) {
            const urlObj = new URL(url);
            requestOptions = {
                hostname: urlObj.hostname,
                port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
                path: urlObj.pathname + urlObj.search,
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    ...options.headers
                }
            };
        } else {
            const parts = url.split('/');
            requestOptions = {
                hostname: parts[0],
                path: '/' + parts.slice(1).join('/'),
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    ...options.headers
                }
            };
        }

        if (options.token) {
            requestOptions.headers['Authorization'] = `Bearer ${options.token}`;
        }

        if (options.proxyAgent || globalProxyAgent) {
            requestOptions.agent = options.proxyAgent || globalProxyAgent;
        }

        const protocol = url.startsWith('http://') ? http : https;
        const req = protocol.request(requestOptions, (res) => {
            const contentEncoding = res.headers['content-encoding'];
            let stream = res;
            
            if (contentEncoding === 'gzip') {
                stream = res.pipe(zlib.createGunzip());
            } else if (contentEncoding === 'br') {
                stream = res.pipe(zlib.createBrotliDecompress());
            } else if (contentEncoding === 'deflate') {
                stream = res.pipe(zlib.createInflate());
            }

            const chunks = [];
            stream.on('data', (chunk) => {
                chunks.push(chunk);
            });

            stream.on('end', () => {
                const data = Buffer.concat(chunks).toString('utf-8');
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        resolve(JSON.parse(data));
                    } catch (error) {
                        reject(new Error(`JSON parse error: ${error.message}`));
                    }
                } else {
                    reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                }
            });

            stream.on('error', (error) => {
                reject(new Error(`Decompression error: ${error.message}`));
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.setTimeout(timeout, () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });

        req.end();
    });
}

/**
 * 检查URL是否可访问（返回200状态码）
 * @param {string} url - 要检查的URL
 * @param {number} timeout - 超时时间（毫秒，默认5000）
 * @returns {Promise<boolean>} URL可访问返回true，否则返回false
 */
function checkUrlAccessible(url, timeout = 5000, proxyAgent = null) {
    return new Promise((resolve) => {
        try {
            const urlObj = new URL(url);
            const requestOptions = {
                hostname: urlObj.hostname,
                port: urlObj.port || 443,
                path: urlObj.pathname + urlObj.search,
                method: 'GET',
                timeout
            };
            if (proxyAgent || globalProxyAgent) {
                requestOptions.agent = proxyAgent || globalProxyAgent;
            }
            const req = https.request(requestOptions, (res) => {
                resolve(res.statusCode === 200);
            });

            req.on('error', () => resolve(false));
            req.on('timeout', () => {
                req.destroy();
                resolve(false);
            });

            req.end();
        } catch (error) {
            resolve(false);
        }
    });
}

/**
 * 下载图片到本地文件
 * @param {string} url - 图片URL
 * @param {string} outputPath - 输出文件路径
 * @returns {Promise<string>} 返回输出文件路径
 */
function downloadImage(url, outputPath) {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https') ? https : http;

        const request = protocol.get(url, (response) => {
            if (response.statusCode === 302 || response.statusCode === 301) {
                const redirectUrl = response.headers.location;
                downloadImage(redirectUrl, outputPath).then(resolve).catch(reject);
                return;
            }

            if (response.statusCode !== 200) {
                reject(new Error(`Failed to download image: HTTP ${response.statusCode}`));
                return;
            }

            const file = fsSync.createWriteStream(outputPath);
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve(outputPath);
            });
            file.on('error', (err) => {
                fsSync.unlink(outputPath, () => {});
                reject(err);
            });
        });

        request.on('error', (err) => {
            fsSync.unlink(outputPath, () => {});
            reject(err);
        });
    });
}

module.exports = {
    makeHttpRequest,
    checkUrlAccessible,
    downloadImage,
    setGlobalProxy,
    getGlobalProxyAgent
};
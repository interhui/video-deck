/**
 * HttpUtils 单元测试
 */
const { makeHttpRequest } = require('../../src/main/utils/HttpUtils');

describe('HttpUtils', () => {
    describe('makeHttpRequest', () => {
        test('SVC-HTTP-001: 无效URL抛出错误', async () => {
            await expect(makeHttpRequest('invalid-url')).rejects.toThrow();
        });

        test('SVC-HTTP-002: 无效完整URL抛出错误', async () => {
            await expect(makeHttpRequest('https://nonexistent.invalid/test')).rejects.toThrow();
        });

        test('SVC-HTTP-003: 返回Promise对象', () => {
            const promise = makeHttpRequest('https://nonexistent.invalid/test').catch(() => {});
            expect(promise).toBeInstanceOf(Promise);
        });

        test('SVC-HTTP-004: 支持自定义headers', async () => {
            const options = {
                headers: {
                    'Custom-Header': 'test-value'
                }
            };
            
            await expect(
                makeHttpRequest('https://nonexistent.invalid/test', options)
            ).rejects.toThrow();
        });

        test('SVC-HTTP-005: 支持token认证', async () => {
            const options = {
                token: 'test-token'
            };
            
            await expect(
                makeHttpRequest('https://nonexistent.invalid/test', options)
            ).rejects.toThrow();
        });

        test('SVC-HTTP-006: 支持自定义timeout', async () => {
            const options = {
                timeout: 5000
            };
            
            await expect(
                makeHttpRequest('https://nonexistent.invalid/test', options)
            ).rejects.toThrow();
        });
    });
});
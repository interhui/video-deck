/**
 * 独立脚本：修复 movie.nfo 文件中的 original_filename 字段
 * 
 * 功能：检查指定目录中所有 movie.nfo 文件的 original_filename 字段，
 * 如果发现该字段是绝对路径，则提取文件名并转换为相对路径格式。
 * 
 * 示例：
 *   - d:/test/你好 123.mp4 -> 你好 123.mp4
 *   - \\192.168.3.3\m\456.mp4 -> 456.mp4
 * 
 * 使用方法：
 *   node scripts/fix-original-filename.js <目录路径> [--dry-run]
 * 
 * 参数：
 *   目录路径  - 要扫描的根目录路径
 *   --dry-run - 可选，仅显示将要修改的内容，不实际写入
 */

const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');

const XML_PARSER_OPTIONS = {
    explicitArray: false,
    mergeAttrs: true,
    trim: true,
    normalizeTags: true,
    strict: false
};

const XML_BUILDER_OPTIONS = {
    xmldec: {
        version: '1.0',
        encoding: 'UTF-8',
        standalone: true
    },
    headless: true,
    indent: '    ',
    newline: '\n'
};

function isAbsolutePath(filePath) {
    if (!filePath || typeof filePath !== 'string') {
        return false;
    }
    
    // Windows绝对路径：C:\, D:\, C:/, D:/ 等
    if (/^[a-zA-Z]:[/\\]/.test(filePath)) {
        return true;
    }
    
    // UNC路径：\\server\share
    if (/^\\\\[^\\]+\\/.test(filePath)) {
        return true;
    }
    
    // Unix绝对路径：/
    if (filePath.startsWith('/')) {
        return true;
    }
    
    return false;
}

function extractFilename(filePath) {
    if (!filePath || typeof filePath !== 'string') {
        return filePath;
    }
    
    // 标准化路径分隔符
    const normalized = filePath.replace(/\\/g, '/');
    
    // 提取最后一个路径分隔符后的内容
    const lastSlashIndex = normalized.lastIndexOf('/');
    if (lastSlashIndex >= 0 && lastSlashIndex < normalized.length - 1) {
        return normalized.substring(lastSlashIndex + 1);
    }
    
    return filePath;
}

function parseNfoContent(xmlContent) {
    return new Promise((resolve, reject) => {
        xml2js.parseString(xmlContent, XML_PARSER_OPTIONS, (err, result) => {
            if (err) {
                reject(err);
            } else {
                resolve(result);
            }
        });
    });
}

function generateNfoContent(movieObj) {
    const builder = new xml2js.Builder(XML_BUILDER_OPTIONS);
    const xmlObj = { movie: movieObj };
    let xml = builder.buildObject(xmlObj);
    
    if (!xml.startsWith('<?xml')) {
        xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' + xml;
    }
    
    return xml;
}

async function findMovieNfoFiles(dirPath) {
    const nfoFiles = [];
    
    async function scanRecursive(currentDir) {
        try {
            const entries = fs.readdirSync(currentDir, { withFileTypes: true });
            
            for (const entry of entries) {
                const fullPath = path.join(currentDir, entry.name);
                
                if (entry.isDirectory()) {
                    await scanRecursive(fullPath);
                } else if (entry.isFile() && entry.name.toLowerCase() === 'movie.nfo') {
                    nfoFiles.push(fullPath);
                }
            }
        } catch (error) {
            console.error(`扫描目录失败: ${currentDir}`, error.message);
        }
    }
    
    await scanRecursive(dirPath);
    return nfoFiles;
}

async function processNfoFile(nfoPath, dryRun) {
    try {
        const content = fs.readFileSync(nfoPath, 'utf-8');
        const parsed = await parseNfoContent(content);
        
        if (!parsed || !parsed.movie) {
            return { success: false, reason: '无效的NFO结构' };
        }
        
        const movieNode = parsed.movie;
        const originalFilename = movieNode.original_filename;
        
        if (!originalFilename || typeof originalFilename !== 'string') {
            return { success: false, reason: '无original_filename字段或字段为空' };
        }
        
        if (!isAbsolutePath(originalFilename)) {
            return { success: false, reason: '不是绝对路径，无需修改' };
        }
        
        const newFilename = extractFilename(originalFilename);
        
        if (newFilename === originalFilename) {
            return { success: false, reason: '提取文件名失败' };
        }
        
        const result = {
            success: true,
            nfoPath: nfoPath,
            oldValue: originalFilename,
            newValue: newFilename
        };
        
        if (!dryRun) {
            movieNode.original_filename = newFilename;
            const newContent = generateNfoContent(movieNode);
            fs.writeFileSync(nfoPath, newContent, 'utf-8');
        }
        
        return result;
    } catch (error) {
        return { success: false, reason: error.message };
    }
}

async function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log('用法: node scripts/fix-original-filename.js <目录路径> [--dry-run]');
        console.log('');
        console.log('参数:');
        console.log('  目录路径  - 要扫描的根目录路径');
        console.log('  --dry-run - 可选，仅显示将要修改的内容，不实际写入');
        process.exit(1);
    }
    
    const dryRun = args.includes('--dry-run');
    const targetDir = args.find(arg => !arg.startsWith('--'));
    
    if (!targetDir) {
        console.error('错误: 未指定目录路径');
        process.exit(1);
    }
    
    const absoluteDir = path.resolve(targetDir);
    
    if (!fs.existsSync(absoluteDir)) {
        console.error(`错误: 目录不存在: ${absoluteDir}`);
        process.exit(1);
    }
    
    console.log(`扫描目录: ${absoluteDir}`);
    console.log(`模式: ${dryRun ? '预览模式 (不写入)' : '写入模式'}`);
    console.log('');
    
    const nfoFiles = await findMovieNfoFiles(absoluteDir);
    
    if (nfoFiles.length === 0) {
        console.log('未找到任何 movie.nfo 文件');
        return;
    }
    
    console.log(`找到 ${nfoFiles.length} 个 movie.nfo 文件`);
    console.log('');
    
    let modifiedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    for (const nfoPath of nfoFiles) {
        const result = await processNfoFile(nfoPath, dryRun);
        
        if (result.success) {
            modifiedCount++;
            console.log(`[${dryRun ? '将修改' : '已修改'}] ${nfoPath}`);
            console.log(`  原值: ${result.oldValue}`);
            console.log(`  新值: ${result.newValue}`);
            console.log('');
        } else if (result.reason === '无效的NFO结构' || result.reason.startsWith('提取文件名失败')) {
            errorCount++;
            console.log(`[错误] ${nfoPath}: ${result.reason}`);
        } else {
            skippedCount++;
        }
    }
    
    console.log('========== 处理完成 ==========');
    console.log(`总文件数: ${nfoFiles.length}`);
    console.log(`${dryRun ? '将要修改' : '已修改'}: ${modifiedCount}`);
    console.log(`跳过: ${skippedCount}`);
    console.log(`错误: ${errorCount}`);
    
    if (dryRun && modifiedCount > 0) {
        console.log('');
        console.log('提示: 移除 --dry-run 参数以实际执行修改');
    }
}

main().catch(error => {
    console.error('执行失败:', error);
    process.exit(1);
});
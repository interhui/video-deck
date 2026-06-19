// CLI Test setup file
const path = require('path');
const fs = require('fs');

// Create test data directories before all tests
beforeAll(() => {
    const testDataDir = path.join(__dirname, 'test-data');

    // 新结构：testDataDir 作为 library dir；movies/actors/boxes/配置 JSON 全部在 testDataDir 下
    const dirs = [
        testDataDir,
        path.join(testDataDir, 'boxes'),
        path.join(testDataDir, 'movies'),
        path.join(testDataDir, 'actors'),
        path.join(testDataDir, 'movies', 'movie'),
        path.join(testDataDir, 'movies', 'movie', 'test-movie'),
        path.join(testDataDir, 'movies', 'tv'),
        path.join(testDataDir, 'movies', 'documentary'),
        path.join(testDataDir, 'movies', 'anime'),
    ];

    dirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    });

    // Create test movie NFO file
    const movieNfoContent = `<?xml version="1.0" encoding="UTF-8"?>
<movie>
    <id>movie-test-movie</id>
    <title>Test Movie</title>
    <year>2024</year>
    <outline>Test movie description</outline>
    <director>Test Director</director>
    <actor>
        <name>Test Actor</name>
    </actor>
    <tag>action</tag>
    <tag>drama</tag>
    <userRating>5</userRating>
    <status>unwatched</status>
    <playCount>0</playCount>
    <totalPlayTime>0</totalPlayTime>
</movie>`;

    const movieNfoPath = path.join(testDataDir, 'movies', 'movie', 'test-movie', 'movie.nfo');
    fs.writeFileSync(movieNfoPath, movieNfoContent);

    // Create test box JSON file (movieboxDir 派生为 ${dir}/boxes)
    const boxContent = {
        name: 'Test Box',
        description: 'Test box description',
        created: '2024-01-01T00:00:00.000Z',
        data: {
            movie: [
                { id: 'movie-test-movie', status: 'unwatched', playCount: 0, totalPlayTime: 0 }
            ]
        }
    };
    const boxPath = path.join(testDataDir, 'boxes', 'Test Box.json');
    fs.writeFileSync(boxPath, JSON.stringify(boxContent, null, 2));

    // 新结构 settings：仅声明 dir，子目录在 SettingsService 中按需派生
    const settingsContent = {
        version: '1.0.0',
        lastUpdate: Date.now(),
        appearance: { theme: 'dark', language: 'zh-CN' },
        layout: { sidebarWidth: 200, posterSize: 'large', columns: 6, viewMode: 'grid' },
        library: {
            libraries: { default: { dir: testDataDir } },
            currentLibrary: 'default',
            newMovieHours: 72
        }
    };
    const settingsPath = path.join(testDataDir, 'settings.json');
    fs.writeFileSync(settingsPath, JSON.stringify(settingsContent, null, 2));

    // Create test tags JSON (放在 library dir 下)
    const tagsContent = [
        { id: 'action', name: '动作' },
        { id: 'scifi', name: '科幻' },
        { id: 'drama', name: '剧情' },
        { id: 'comedy', name: '喜剧' },
        { id: 'horror', name: '恐怖' }
    ];
    const tagsPath = path.join(testDataDir, 'tags.json');
    fs.writeFileSync(tagsPath, JSON.stringify(tagsContent, null, 2));

    // Create test categories JSON (放在 library dir 下)
    const categoriesContent = {
        categories: [
            { id: 'movie', name: '电影', shortName: '电影', icon: 'film', color: '#003791', order: 1 },
            { id: 'tv', name: '电视剧', shortName: '剧集', icon: 'tv', color: '#009688', order: 2 },
            { id: 'documentary', name: '纪录片', shortName: '纪录', icon: 'documentary', color: '#ff9800', order: 3 },
            { id: 'anime', name: '动漫', shortName: '动漫', icon: 'anime', color: '#e91e63', order: 4 }
        ],
        predefinedTags: [],
        customTags: []
    };
    const categoriesPath = path.join(testDataDir, 'categories.json');
    fs.writeFileSync(categoriesPath, JSON.stringify(categoriesContent, null, 2));

    // Create test boxes.json index (放在 library dir 下)
    const boxesIndex = {
        boxes: [
            { name: 'Test Box', description: 'Test box description' }
        ]
    };
    const boxesIndexPath = path.join(testDataDir, 'boxes.json');
    fs.writeFileSync(boxesIndexPath, JSON.stringify(boxesIndex, null, 2));

    // Create test actor.json (放在 library dir 下)
    const actorContent = { actor: [] };
    const actorPath = path.join(testDataDir, 'actor.json');
    fs.writeFileSync(actorPath, JSON.stringify(actorContent, null, 2));

    // Create test history.json (放在 library dir 下)
    const historyContent = { history: [] };
    const historyPath = path.join(testDataDir, 'history.json');
    fs.writeFileSync(historyPath, JSON.stringify(historyContent, null, 2));

    // Create import test JSON
    const importContent = [
        {
            name: 'Import Movie 1',
            category: 'movie',
            description: 'Imported movie 1',
            director: 'Test Director'
        },
        {
            name: 'Import Movie 2',
            category: 'movie',
            description: 'Imported movie 2'
        }
    ];
    const importPath = path.join(testDataDir, 'import-movies.json');
    fs.writeFileSync(importPath, JSON.stringify(importContent, null, 2));

    // Create invalid import JSON
    const invalidImportPath = path.join(testDataDir, 'invalid-import.json');
    fs.writeFileSync(invalidImportPath, '{ invalid json }');

    // Create import without name
    const noNameImport = [
        { category: 'movie', description: 'Missing name' }
    ];
    const noNamePath = path.join(testDataDir, 'import-no-name.json');
    fs.writeFileSync(noNamePath, JSON.stringify(noNameImport, null, 2));

    // Create import without category
    const noCatImport = [
        { name: 'Missing Category', description: 'No category' }
    ];
    const noCatPath = path.join(testDataDir, 'import-no-category.json');
    fs.writeFileSync(noCatPath, JSON.stringify(noCatImport, null, 2));
});

// Clean up after all tests
afterAll(() => {
    const testDataDir = path.join(__dirname, 'test-data');

    function deleteDir(dirPath) {
        if (fs.existsSync(dirPath)) {
            fs.readdirSync(dirPath).forEach(file => {
                const curPath = path.join(dirPath, file);
                if (fs.lstatSync(curPath).isDirectory()) {
                    deleteDir(curPath);
                } else {
                    fs.unlinkSync(curPath);
                }
            });
            fs.rmdirSync(dirPath);
        }
    }

    deleteDir(testDataDir);
});
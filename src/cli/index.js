#!/usr/bin/env node

/**
 * Movie Management CLI
 * Command-line interface for movie management
 */
const { Command } = require('commander');
const path = require('path');

// Import commands
const movieCommands = require('./commands/movie');
const boxCommands = require('./commands/box');
const configCommands = require('./commands/config');
const categoryCommands = require('./commands/category');
const tagCommands = require('./commands/tag');

// Import service loader
const { initializeServices } = require('./utils/service-loader');

// Create commander instance
const program = new Command();

// Version
program
    .version('1.0.0')
    .name('movie-mgt')
    .description('Movie Management CLI - Electron-based movie manager');

// Global options
program
    .option('-c, --config <path>', 'Specify config file path')
    .option('-l, --library-dir <dir>', 'Specify library root directory (overrides the current library\'s dir from settings)')
    .option('-m, --movies-dir <dir>', '(Deprecated) Specify movies directory; ignored. Use --library-dir instead.')
    .option('-b, --box-dir <dir>', '(Deprecated) Specify moviebox directory; ignored. Use --library-dir instead.')
    .option('-o, --output <format>', 'Output format: table|json|simple', 'table')
    .option('--no-color', 'Disable color output')
    .option('-v, --verbose', 'Verbose output mode');

// Services storage
let servicesInstance = null;

/**
 * Initialize services with CLI options
 */
async function getServices(options) {
    if (!servicesInstance) {
        // 获取可执行文件所在目录（兼容 pkg 打包后的运行方式）
        const exeDir = path.dirname(process.execPath);

        // 默认 settings 路径
        const defaultSettingsPath = path.join(exeDir, 'config', 'settings.json');

        if (options.moviesDir || options.boxDir) {
            console.warn('[CLI] --movies-dir / --box-dir 已弃用，请使用 --library-dir 指定影视库根目录');
        }

        servicesInstance = await initializeServices({
            settingsPath: options.config || defaultSettingsPath
        });

        // 若用户在命令行中显式指定了 --library-dir，则覆盖当前库的 dir
        if (options.libraryDir && servicesInstance.settingsService) {
            servicesInstance.settingsService.setLibraryDir(options.libraryDir);
            // 重新触发 5 个配置服务的路径重定向
            const { computeLibraryPaths, applyLibraryPathsToServices } = require('../main/utils/library-paths');
            applyLibraryPathsToServices(computeLibraryPaths(servicesInstance.settingsService), servicesInstance);
        }
    }
    return servicesInstance;
}

// ==================== Movie Commands ====================

// Create movie subcommand
const movieProgram = program
    .command('movie')
    .alias('m')
    .description('Movie management commands');

movieProgram
    .command('list')
    .alias('ls')
    .description('List all movies or movies by category')
    .option('-c, --category <id>', 'Filter by category')
    .option('-t, --tag <tagId>', 'Filter by tag')
    .option('-s, --status <status>', 'Filter by status')
    .option('--sort <field>', 'Sort by field (name, rating, playtime)')
    .option('--desc', 'Sort descending')
    .option('-o, --output <format>', 'Output format')
    .action(async (cmdOptions) => {
        const services = await getServices(program.opts());
        await movieCommands.listMovies(services, cmdOptions);
    });

movieProgram
    .command('search')
    .argument('<keyword>', 'Search keyword')
    .description('Search movies by keyword')
    .option('-c, --category <id>', 'Filter by category')
    .option('-t, --tag <tagId>', 'Filter by tag')
    .option('-o, --output <format>', 'Output format')
    .action(async (keyword, cmdOptions) => {
        const services = await getServices(program.opts());
        await movieCommands.searchMovies(services, keyword, cmdOptions);
    });

movieProgram
    .command('show')
    .alias('info')
    .argument('<movieId>', 'Movie ID')
    .description('Show movie details')
    .action(async (movieId) => {
        const services = await getServices(program.opts());
        await movieCommands.showMovie(services, movieId);
    });

movieProgram
    .command('add')
    .argument('<name>', 'Movie name')
    .argument('<category>', 'Category ID')
    .description('Add a new movie')
    .option('--description <text>', 'Movie description')
    .option('--director <name>', 'Director')
    .option('--actors <names>', 'Actors')
    .option('--studio <name>', 'Studio')
    .option('--publish-date <date>', 'Publish date (YYYY-MM-DD)')
    .option('--tags <tags>', 'Tags (comma-separated)')
    .option('--cover <path>', 'Cover image path')
    .action(async (name, category, cmdOptions) => {
        const services = await getServices(program.opts());
        await movieCommands.addMovie(services, name, { category, ...cmdOptions });
    });

movieProgram
    .command('edit')
    .argument('<movieId>', 'Movie ID')
    .description('Edit movie information')
    .option('--name <name>', 'Movie name')
    .option('--description <text>', 'Movie description')
    .option('--director <name>', 'Director')
    .option('--actors <names>', 'Actors')
    .option('--studio <name>', 'Studio')
    .option('--publish-date <date>', 'Publish date')
    .option('--tags <tags>', 'Tags (comma-separated, will replace)')
    .option('--add-tags <tags>', 'Add tags (comma-separated)')
    .option('--remove-tags <tags>', 'Remove tags (comma-separated)')
    .option('--rating <number>', 'User rating (0-5)')
    .action(async (movieId, cmdOptions) => {
        const services = await getServices(program.opts());
        await movieCommands.editMovie(services, movieId, cmdOptions);
    });

movieProgram
    .command('delete')
    .alias('rm')
    .argument('<movieId>', 'Movie ID')
    .description('Delete a movie')
    .option('-f, --force', 'Force delete without confirmation')
    .action(async (movieId, cmdOptions) => {
        const services = await getServices(program.opts());
        await movieCommands.deleteMovie(services, movieId, cmdOptions);
    });

movieProgram
    .command('status')
    .argument('<movieId>', 'Movie ID')
    .argument('<status>', 'Movie status')
    .description('Update movie status')
    .action(async (movieId, status) => {
        const services = await getServices(program.opts());
        await movieCommands.updateStatus(services, movieId, status);
    });

// ==================== Box Commands ====================

// Create box subcommand
const boxProgram = program
    .command('box')
    .alias('b')
    .description('Box management commands');

boxProgram
    .command('list')
    .alias('ls')
    .description('List all movie boxes')
    .option('-o, --output <format>', 'Output format')
    .action(async (cmdOptions) => {
        const services = await getServices(program.opts());
        await boxCommands.listBoxes(services, cmdOptions);
    });

boxProgram
    .command('show')
    .alias('info')
    .argument('<boxName>', 'Box name')
    .description('Show box details')
    .option('-o, --output <format>', 'Output format')
    .action(async (boxName, cmdOptions) => {
        const services = await getServices(program.opts());
        await boxCommands.showBox(services, boxName, cmdOptions);
    });

boxProgram
    .command('create')
    .argument('<boxName>', 'Box name')
    .description('Create a new movie box')
    .option('--description <text>', 'Box description')
    .action(async (boxName, cmdOptions) => {
        const services = await getServices(program.opts());
        await boxCommands.createBox(services, boxName, cmdOptions);
    });

boxProgram
    .command('edit')
    .argument('<boxName>', 'Box name')
    .description('Update box information')
    .option('--name <name>', 'New box name')
    .option('--description <text>', 'Box description')
    .action(async (boxName, cmdOptions) => {
        const services = await getServices(program.opts());
        await boxCommands.updateBox(services, boxName, cmdOptions);
    });

boxProgram
    .command('delete')
    .alias('rm')
    .argument('<boxName>', 'Box name')
    .description('Delete a movie box')
    .option('-f, --force', 'Force delete without confirmation')
    .action(async (boxName, cmdOptions) => {
        const services = await getServices(program.opts());
        await boxCommands.deleteBox(services, boxName, cmdOptions);
    });

boxProgram
    .command('add')
    .argument('<boxName>', 'Box name')
    .argument('<movieId>', 'Movie ID')
    .description('Add movie to box')
    .action(async (boxName, movieId) => {
        const services = await getServices(program.opts());
        await boxCommands.addMovieToBox(services, boxName, movieId);
    });

boxProgram
    .command('remove')
    .argument('<boxName>', 'Box name')
    .argument('<movieId>', 'Movie ID')
    .description('Remove movie from box')
    .action(async (boxName, movieId) => {
        const services = await getServices(program.opts());
        await boxCommands.removeMovieFromBox(services, boxName, movieId);
    });

// ==================== Category Commands ====================

const categoryProgram = program
    .command('category')
    .alias('c')
    .description('Category management commands');

categoryProgram
    .command('list')
    .alias('ls')
    .description('List all categories')
    .option('-o, --output <format>', 'Output format')
    .action(async (cmdOptions) => {
        const services = await getServices(program.opts());
        await categoryCommands.listCategories(services, cmdOptions);
    });

categoryProgram
    .command('show')
    .alias('info')
    .argument('<categoryId>', 'Category ID')
    .description('Show category details')
    .action(async (categoryId) => {
        const services = await getServices(program.opts());
        await categoryCommands.showCategory(services, categoryId);
    });

// ==================== Tag Commands ====================

const tagProgram = program
    .command('tag')
    .alias('t')
    .description('Tag management commands');

tagProgram
    .command('list')
    .alias('ls')
    .description('List all tags')
    .option('-o, --output <format>', 'Output format')
    .action(async (cmdOptions) => {
        const services = await getServices(program.opts());
        await tagCommands.listTags(services, cmdOptions);
    });

tagProgram
    .command('create')
    .argument('<tagId>', 'Tag ID')
    .argument('<tagName>', 'Tag name')
    .description('Create a new tag')
    .action(async (tagId, tagName) => {
        const services = await getServices(program.opts());
        await tagCommands.createTag(services, tagId, tagName);
    });

tagProgram
    .command('delete')
    .argument('<tagId>', 'Tag ID')
    .description('Delete a tag')
    .action(async (tagId) => {
        const services = await getServices(program.opts());
        await tagCommands.deleteTag(services, tagId);
    });

// ==================== Config Commands ====================

const configProgram = program
    .command('config')
    .alias('c')
    .description('Configuration management');

configProgram
    .command('show')
    .alias('list')
    .description('Show current configuration')
    .option('-o, --output <format>', 'Output format')
    .action(async (cmdOptions) => {
        const services = await getServices(program.opts());
        await configCommands.showConfig(services, cmdOptions);
    });

configProgram
    .command('set')
    .argument('<key>', 'Key')
    .argument('<value>', 'Value')
    .description('Set configuration value')
    .action(async (key, value) => {
        const services = await getServices(program.opts());
        await configCommands.setConfig(services, key, value);
    });

configProgram
    .command('get')
    .argument('<key>', 'Key')
    .description('Get configuration value')
    .action(async (key) => {
        const services = await getServices(program.opts());
        await configCommands.getConfig(services, key);
    });

configProgram
    .command('reset')
    .description('Reset configuration to defaults')
    .action(async () => {
        const services = await getServices(program.opts());
        await configCommands.resetConfig(services);
    });

// ==================== Stats Command ====================

program
    .command('stats')
    .description('Show movie library statistics')
    .option('-c, --category <id>', 'Filter by category')
    .option('--playtime', 'Show playtime stats')
    .action(async (cmdOptions) => {
        const services = await getServices(program.opts());
        const { movieService, getMoviesDir } = services;
        const moviesDir = getMoviesDir();

        try {
            const stats = await movieService.getStats(cmdOptions.category, moviesDir);
            const { outputStats } = require('./utils/output');
            outputStats(stats);
        } catch (error) {
            console.error(`Error: ${error.message}`);
        }
    });

// ==================== Interactive Mode ====================

program
    .command('interactive')
    .alias('i')
    .description('Start interactive mode')
    .action(() => {
        console.log('Interactive mode not yet implemented.');
        console.log('Use individual commands instead.');
    });

// Parse and execute
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
    program.outputHelp();
}

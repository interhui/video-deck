# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Electron-based movie management application (电影管理程序) with GUI and CLI interfaces. Movies are organized by categories and stored as NFO files with cover images.

## Common Commands

```bash
# GUI
npm start              # Start Electron app
npm run dev            # Start with logging enabled

# CLI (movie-mgt command)
node src/cli/index.js movie list   # List movies
movie-mgt movie search <keyword>  # Search movies
movie-mgt box list     # List movie boxes
movie-mgt stats        # Show library statistics

# Build
npm run build:gui      # Build Electron app (output: dist/)
npm run build:cli      # Build CLI executable (pkg)
npm run build:cli:all  # Build CLI for all platforms

# Testing
npm test                    # Run service unit tests (test/svc/)
npm test -- --testNamePattern="SVC-R18-010"  # Run single test
npm run test:cli             # Run CLI unit tests
```

## Architecture

### Service Layer Architecture

Shared service layer (`src/main/services/`) consumed by both GUI and CLI:

| Service | Purpose |
|---------|---------|
| MovieService | Core movie CRUD, NFO file parsing |
| BoxService | Movie box (curated collections) management |
| CategoryService | Category definitions and metadata |
| TagService | Tag management (config/tags.json) |
| IndexService | Category index.json files for fast listing |
| FileService | File system operations, NFO parsing, folder scanning |
| MovieCacheService | Caching layer for movie data |
| SettingsService | App settings (config/settings.json) |
| DatabaseService | SQLite database for GUI |
| R18AdapterService | R18/PostgreSQL movie/actor search |
| TMDBAdapterService | TMDB API movie/actor search |
| BatchSearchService | Batch movie scraping with progress events |

### GUI Structure (`src/renderer/`)

- HTML files in root load corresponding JS modules from `js/` subdirectory
- `detail.js` handles movie detail/edit dialogs
- `main.js` handles main window (movie wall, sidebar, batch operations)
- IPC communication via `preload.js` and handlers in `src/main/ipc-handlers.js`
- Renderer CSS in `css/main.css`

### CLI Structure (`src/cli/`)

Commander.js subcommands: `movie` (m), `box` (b), `category` (c), `tag` (t), `config`, `stats`, `import`
Service loader at `src/cli/utils/service-loader.js` resolves paths for both dev (`node`) and packaged (`pkg`) modes.

### Data Storage

- **Movies**: `movies/<category>/<movie-folder>/movie.nfo` (NFO format)
- **Categories**: `config/categories.json`
- **Tags**: `config/tags.json`
- **Settings**: `config/settings.json`
- **Boxes**: `boxes/` directory as JSON files
- **Indexes**: `index.json` per category for fast movie listing

### Movie Scraping Flow (R18/TMDB)

1. `searchMovie(keyword)` returns array with `search_id`, `title`, `year`, `poster_url`
2. `getMovie(searchId)` fetches full details (runtime, actors, directors, tags, overview)
3. Both adapters follow same interface for consistent GUI handling

### Test Organization

- `test/svc/` - Service unit tests (Jest, run via `npm test`)
- `test/cli/` - CLI unit tests (separate jest.config.js)
- `test/testcase-*.md` - Test case documentation

# IOP WordPress site

- Theme lives in wp-content/themes/<package.json name>/. Edit src/ only; never dist/ or WP core. package.json owns theme name and version.
- A dev server is usually already running at http://localhost:8080. Ask before `pnpm run dev`.
- wp-cli: `npm run wp-cli -- wp <command>` (runs in Docker), not a host `wp`.
- Ask before `pnpm run pull:*`, `db:*`, anything that overwrites local data, or creating WP users.
- Releases: `pnpm version patch|minor|major`. Never hand-edit version metadata.
- Paths are case-sensitive in deploy targets; match filename case exactly.
- Block patterns: numeric filename prefix sets inserter order; format with `format-wp-block-pattern`.
- Format theme.json files with `sort-wp-json`.
- Placeholder images: src/_placeholder/<name>/*.jpg, pale gray and neutral, safe if leaked.
- SVG: single-color via CSS mask-image; multi-color inline via file_get_contents(get_theme_file_path(...)).
- Don't add new ideasonpurpose/wp-svg-lib usage; leave existing usage alone.

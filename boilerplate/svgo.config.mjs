/**
 * This is primarily intended to work with the SVGO VS Code Plugin, and to
 * save trips out to SVGOMG.
 *
 * This config allows for immediate optimization of SVGs in the editor
 *
 *
 * @links
 * - SVGO: https://github.com/svg/svgo
 * - SVGO preset-default docs: https://svgo.dev/docs/preset-default
 * - VS Code Plugin: https://marketplace.visualstudio.com/items?itemName=1000ch.svgo
 * - SVGOMG: https://jakearchibald.github.io/svgomg/
 */

export default {
  js2svg: {
    indent: 4, // number
    pretty: true, // boolean
  },

  plugins: [
    {
      name: "preset-default",
      params: {
        overrides: {
          cleanupIds: false,
        },
      },
    },
    "removeDimensions",
  ],
};

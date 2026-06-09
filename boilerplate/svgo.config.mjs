/**
 * This is primarily intended to work with the SVGO VS Code Plugin, and to
 * save trips out to SVGOMG.
 *
 * This config allows for immediate optimization of SVGs in the editor
 *
 * @links
 * - SVGO: https://github.com/svg/svgo
 * - SVGO preset-default docs: https://svgo.dev/docs/preset-default
 * - VS Code Plugin: https://marketplace.visualstudio.com/items?itemName=1000ch.svgo
 * - SVGOMG: https://jakearchibald.github.io/svgomg/
 */

export default {
  js2svg: {
    indent: 4,
    pretty: true,
  },

  plugins: [
    {
      name: "addDimensionsFromViewBox",
      type: "visitor",
      fn: () => {
        return {
          element: {
            enter: (node) => {
              if (node.name !== "svg") return;
              if (!node.attributes.viewBox) return;
              if (node.attributes.width && node.attributes.height) return;

              const parts = node.attributes.viewBox.trim().split(/[\s,]+/);
              if (parts.length !== 4) return;

              if (!node.attributes.width) {
                node.attributes.width = parts[2];
              }
              if (!node.attributes.height) {
                node.attributes.height = parts[3];
              }
            },
          },
        };
      },
    },
    {
      name: "removeTopLevelFillNone",
      type: "visitor",
      fn: () => {
        return {
          element: {
            enter: (node) => {
              if (node.name !== "svg") return;
              if (node.attributes.fill !== "none") return;

              delete node.attributes.fill;
            },
          },
        };
      },
    },
    {
      name: "preset-default",
      params: {
        overrides: {
          cleanupIds: false,
          removeUselessStrokeAndFill: {
            removeNone: true,
          },
        },
      },
    },
  ],
};

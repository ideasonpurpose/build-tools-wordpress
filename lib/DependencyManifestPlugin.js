import fs from "fs-extra";
import path from "path";

export class DependencyManifestPlugin {
  constructor(options) {
    const defaults = {
      writeManifestFile: false,
      manifestFile: "./dependency-manifest.json",
    };
    this.config = { ...defaults, ...options };
    this.name = "Dependency Manifest Plugin";
    this.manifest = {};
  }

  apply(compiler) {

    // TODO: Switch this to tapPromise and make the function async
    compiler.hooks.emit.tapAsync(this.name, (compilation, callback) => {
      // const logger = compilation.getLogger("dependency-manifest-plugin");
      // logger.info(compilation.namedChunkGroups.keys());

      // console.log(
      //   "in DependencyManifestPlugin emit hook",
      //   Object.keys(compilation),
      // );

      // console.log(Array.from(compilation.namedChunkGroups.keys()))

      Array.from(compilation.namedChunkGroups.entries()).forEach(
        ([key, group]) => {
          this.manifest[key] = group.chunks.reduce(
            (entry, chunk) => {

              // console.log({ files: Array.from(chunk.files) });

              Array.from(chunk.files)
                /**
                 * hot-update files will stomp on the main file, filter them out
                 */
                .filter((file) => !file.includes("hot-update"))
                .forEach((file) => {
                  const { chunkGraph } = compilation;

                  // console.log({file})
                  const ext = path.extname(file);

                  const filepath = path.resolve(
                    compiler.options.output.publicPath,
                    file,
                  );

                  // const fullPath = path.resolve(compiler.options.output.path, file);
                  // const stats = fs.statSync(fullPath);
                  // console.log({ file, size: stats.size });

                  let silo, fileKey;
                  /**
                   * If the chunk has one or more entryModules, it's a file
                   * If there are zero entryModules, it's a generated dependency
                   */
                  if (chunkGraph.getNumberOfEntryModules(chunk) > 0) {
                    silo = "files";
                    fileKey = key + ext;
                  } else {
                    silo = "dependencies";
                    fileKey = chunk.id + ext;
                  }

                  entry[silo][fileKey] = filepath;
                });
                // console.log({entry})
              return entry;
            },
            { files: {}, dependencies: {} },
          );
        },
      );

      // console.log(this.manifest);

      callback();
    });

    compiler.hooks.afterEmit.tapPromise(this.name, async () => {
      if (this.config.writeManifestFile) {
        return await fs.outputJSON(
          path.resolve(compiler.options.output.path, this.config.manifestFile),
          this.manifest,
          { spaces: 2 },
        );
      }
      console.log("in DependencyManifestPlugin afterEmit");
    });
  }
}

// export default DependencyManifestPlugin;

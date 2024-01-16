import AfterDoneReporterPlugin from "./lib/AfterDoneReporterPlugin.js";
import buildConfig from "./lib/buildConfig.js";
import DependencyManifestPlugin from "./lib/DependencyManifestPlugin.js";
import devserverProxy from "./lib/devserver-proxy.js";
import WatchRunReporterPlugin from "./lib/WatchRunReporterPlugin.js";


export { AfterDoneReporterPlugin};

export default {
  buildConfig,
  DependencyManifestPlugin,
  devserverProxy,
  WatchRunReporterPlugin,
};

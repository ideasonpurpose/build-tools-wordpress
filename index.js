import AfterDoneReporterPlugin from "./lib/AfterDoneReporterPlugin.js";
import buildConfig from "./lib/buildConfig.js";
import DependencyManifestPlugin from "./lib/DependencyManifestPlugin.js";
import devserverProxy from "./lib/devserver-proxy.js";
import WatchRunReporterPlugin from "./lib/WatchRunReporterPlugin.js";


console.log({
  AfterDoneReporterPlugin,
  buildConfig,
  DependencyManifestPlugin,
  devserverProxy,
  WatchRunReporterPlugin,
})

export default {
  AfterDoneReporterPlugin,
  buildConfig,
  DependencyManifestPlugin,
  devserverProxy,
  WatchRunReporterPlugin,
};

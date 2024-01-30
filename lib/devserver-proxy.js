// const { dns } = require("dns").promises;

// DO NOT destructure this or we won't be able to mock it
// import {promises as dnsPromises} from "dns";
// import dns from "dns";
import chalk from "chalk";
import { isIP } from "net";

import { findLocalPort } from "./find-local-docker-port.js";
/**
 * If config.proxy is explicitly not false, return a {proxy} object
 * otherwise return an empty object.
 */
export async function devserverProxy(config) {
  let target = config.proxy;

  if (config.proxy === true) {
    const localPort = await findLocalPort();
    // console.log({ localPort });
    if (localPort && localPort.hostname && localPort.port) {
      target = new URL(`http://${localPort.hostname}:${localPort.port}`);
      console.log(
        chalk.cyan.bold(
          `PORT FROM DEVSERVER-PROXY: TRUE ${localPort.port}`,
          target,
        ),
      );
    }
  } else if (!!isIP(config.proxy)) {
    /**
     * Bare IP addresses
     * net.isIP() returns 4, 6 or 0(IPv4, IPv6 or not-an-IP address)
     */
    target = new URL(`http://${config.proxy}`);
  } else if (typeof config.proxy === "string") {
    /**
     * It's a string, first see if it can be made into a URL, then try it as
     * a docker container name, then fail.
     */
    try {
      target = new URL(config.proxy);
    } catch (err) {
      const localPort = await findLocalPort(config.proxy);
      if (localPort && localPort.hostname && localPort.port) {
        target = new URL(`http://${localPort.hostname}:${localPort.port}`);
        console.log(
          chalk.cyan.bold(
            `PORT FROM DEVSERVER-PROXY: "${config.proxy} ${localPort.port}`,
            target,
          ),
        );
      }
    }
  }

  if (!target) {
    return {};
  }

  const proxy = {
    "**": {
      target: target.origin,
      secure: false,
      autoRewrite: true,
      selfHandleResponse: true, // necessary to avoid res.end being called automatically
      changeOrigin: true, // needed for virtual hosted sites
      cookieDomainRewrite: "", // was `${config.host}:8080` ??
      headers: { "Accept-Encoding": "identity" },

      onError: (err, req, res) => {
        if (err.code === "ECONNRESET") {
          console.log(chalk.yellow("Caught ECONNRESET error, ignoring..."));
        } else {
          console.log("Devserver Proxy Error: ", req.url, err, err.stack);
          res.writeHead(500, { "Content-Type": "text-plain" });
          res.end("Webpack DevServer Proxy Error: " + err);
        }
      },

      onProxyRes: function (proxyRes, req, res) {
        /**
         * Update urls in files with these content-types
         */
        const contentTypes = [
          "application/javascript",
          "application/json",
          "multipart/form-data",
          "text/css",
          "text/html",
          "text/plain",
        ];

        let originalBody = [];

        proxyRes.on("data", (data) => originalBody.push(data));

        proxyRes.on("end", () => {
          res.statusCode = proxyRes.statusCode;
          if (proxyRes.statusMessage) {
            res.statusMessage = proxyRes.statusMessage;
          }

          Object.keys(proxyRes.headers).forEach((key) => {
            let header = proxyRes.headers[key];
            if (typeof header == "string") {
              header = header.replace(
                new RegExp(target.host, "gi"),
                req.headers.host,
              );
            }
            res.setHeader(String(key).trim(), header);
          });

          originalBody = Buffer.concat(originalBody);
          let newBody;
          const type = (proxyRes.headers["content-type"] || "").split(";")[0];
          const wpRegexp = new RegExp(
            "^/wp-(?:admin|includes|content/plugins).*(?:css|js|map)$",
          );
          const originRegExp = new RegExp(
            `(http:\\\\/\\\\/|http://)${target.host}`,
            "gi",
          );

          if (contentTypes.includes(type) && !wpRegexp.test(req.path)) {
            newBody = originalBody
              .toString("utf8")
              .replace(originRegExp, `$1${req.headers.host}`);
            res.setHeader("Content-Length", Buffer.byteLength(newBody));
          } else {
            newBody = originalBody;
          }

          res.end(newBody);
        });
      },
    },
  };

  return { proxy };
}

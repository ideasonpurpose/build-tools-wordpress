//@ts-check

import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { EventEmitter } from "events";

import { devserverProxy } from "../lib/devserver-proxy.js";
import { findLocalPort } from "../lib/find-local-docker-port.js";

const expectedPort = 56789;
const expectedHostName = "stella.dog";
const expectedTarget = `http://${expectedHostName}:${expectedPort}`;

vi.mock("../lib/find-local-docker-port.js");

/** @type {Promise<{port:number,hostname:string}>} */
let localPort;

beforeEach(() => {
  localPort = new Promise((resolve) => {
    resolve({
      port: expectedPort,
      hostname: expectedHostName,
    });
  });
  vi.mocked(findLocalPort).mockReturnValue(localPort);
});

afterEach(() => {
  vi.restoreAllMocks();
});

test("Test proxy settings", async () => {
  let proxy = true;
  const actual = (await devserverProxy({ proxy })).proxy[0];
  expect(actual).toHaveProperty("target");
  expect(actual.context).toContain("**");
});

test("proxy is bare IP address", async () => {
  let proxy = "4.3.2.1";
  const actual = (await devserverProxy({ proxy })).proxy[0];
  expect(actual).toHaveProperty("target", "http://4.3.2.1");
});

test("proxy is a url", async () => {
  let proxy = "https://example.com";
  const actual = (await devserverProxy({ proxy })).proxy[0];
  expect(actual).toHaveProperty("target", proxy);
});

test("proxy is a plain string", async () => {
  let proxy = "sandwich";
  const actual = (await devserverProxy({ proxy })).proxy[0];
  expect(actual).toHaveProperty("target", expectedTarget);
  expect(findLocalPort).toHaveBeenCalledWith(proxy);
});

test("plain string proxy with no local port", async () => {
  vi.mocked(findLocalPort).mockReturnValue(Promise.resolve(null));
  const result = await devserverProxy({ proxy: "sandwich" });
  expect(result.proxy).toHaveLength(1);
  expect(result.proxy[0].target).toBeUndefined();
});

test("Proxy boolean true", async () => {
  vi.mocked(findLocalPort).mockReturnValue(localPort);
  const proxy = true;
  const actual = (await devserverProxy({ proxy })).proxy[0];
  expect(actual).toHaveProperty("target", expectedTarget);
});

test("Proxy boolean true with no local port", async () => {
  vi.mocked(findLocalPort).mockReturnValue(Promise.resolve(null));
  const result = await devserverProxy({ proxy: true });
  expect(result.proxy).toHaveLength(1);
  expect(result.proxy[0].target).toBeUndefined();
});

test("Proxy boolean false", async () => {
  const proxy = false;
  expect(await devserverProxy({ proxy })).toStrictEqual({ proxy: [] });
});

test("test the returned proxy on.error handler", async () => {
  const logSpy = vi.spyOn(console, "log");
  const actual = await devserverProxy({ proxy: true });

  const err = { code: "ECONNRESET" };

  actual.proxy[0].on.error(err, "req", "res");
  expect(logSpy).toHaveBeenLastCalledWith(
    expect.stringContaining("connection reset"),
  );

  err.code = "Unknown Error Code";
  err.stack = "STACK";

  const req = { url: "url" };
  const res = { writeHead: vi.fn(), end: vi.fn() };

  actual.proxy[0].on.error(err, req, res);

  expect(logSpy).toHaveBeenLastCalledWith(
    expect.stringContaining("Proxy error"),
    req.url,
    expect.any(Object),
    err.stack,
  );

  expect(res.writeHead).toHaveBeenCalledWith(500, expect.any(Object));
  expect(res.end).toHaveBeenCalledWith(
    expect.stringContaining("Webpack DevServer Proxy Error: "),
  );
});

test("on.proxyRes Handler", async () => {
  const config = { proxy: "http://localhost:3000" };
  const result = await devserverProxy(config);
  const onProxyRes = result.proxy[0].on.proxyRes;

  const mockProxyRes = new EventEmitter();
  mockProxyRes.statusCode = 200;
  mockProxyRes.statusMessage = "OK";
  mockProxyRes.headers = {
    "content-type": "text/css",
  };
  const mockReq = {
    headers: { host: "example.com" },
    path: "/style.css",
  };

  const mockRes = {
    statusCode: 0,
    setHeader: vi.fn(),
    end: vi.fn(),
  };

  onProxyRes(mockProxyRes, mockReq, mockRes);

  const bodySrc = "body { color: red; }";
  let originalBody = Buffer.from(bodySrc);
  mockProxyRes.emit("data", originalBody);
  mockProxyRes.emit("end");

  // Assert
  expect(mockRes.statusCode).toBe(200);
  expect(mockRes.end).toHaveBeenCalledWith(bodySrc);
  expect(mockRes.setHeader).toHaveBeenCalledWith(
    "content-type",
    expect.anything(),
  );
});

test("on.proxyRes Handler passthrough", async () => {
  const config = { proxy: "http://localhost:3000" };
  const result = await devserverProxy(config);
  const onProxyRes = result.proxy[0].on.proxyRes;

  const mockProxyRes = new EventEmitter();
  mockProxyRes.statusCode = 200;
  mockProxyRes.headers = {
    "content-type": "nope/nope",
    "x-num": 42,
  };
  const mockReq = {
    headers: { host: "example.com" },
    path: "/style.css",
  };

  const mockRes = {
    statusCode: 0,
    setHeader: vi.fn(),
    end: vi.fn(),
  };

  onProxyRes(mockProxyRes, mockReq, mockRes);

  const bodySrc = "body { color: red; }";
  let originalBody = Buffer.from(bodySrc);
  mockProxyRes.emit("data", originalBody);
  mockProxyRes.emit("end");

  // Assert
  expect(mockRes.statusCode).toBe(200);
  expect(mockRes.end).toHaveBeenCalledWith(Buffer.from(bodySrc));
  expect(mockRes.setHeader).toHaveBeenCalledWith(
    "content-type",
    expect.anything(),
  );
});

test("on.proxyReqWs handler", async () => {
  const result = await devserverProxy({ proxy: "http://example.com" });
  const onProxyReqWs = result.proxy[0].on.proxyReqWs;

  const socket = new EventEmitter();
  const errSpy = vi.spyOn(console, "error");

  onProxyReqWs(null, null, socket, null, null);
  socket.emit("error", { code: "EPIPE" });
  expect(errSpy).not.toHaveBeenCalled();

  socket.emit("error", { code: "OTHER" });
  expect(errSpy).toHaveBeenCalledWith(
    expect.stringContaining("WebSocket proxy error"),
    { code: "OTHER" },
  );
});

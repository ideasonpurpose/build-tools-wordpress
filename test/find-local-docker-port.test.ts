import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { exec } from "node:child_process";

import {
  findLocalPort,
  successHandler,
} from "../lib/find-local-docker-port.js";

vi.mock("node:child_process");

afterEach(() => {
  vi.restoreAllMocks();
});

// Proof of concept: None of the tests matter if this doesn't work
test("Mock child_process.exec", async () => {
  const serviceName = "wp";
  await findLocalPort(serviceName, 200).catch((err) => {
    expect(err).toBeInstanceOf(Error);
  });

  expect(exec).toHaveBeenCalledWith(
    `docker compose port ${serviceName} 80`,
    expect.any(Function),
  );

  expect(exec).toHaveBeenCalledTimes(1);
});

test("successHandler returns", () => {
  let actual;
  actual = successHandler("0.0.0.0:55555\n");
  expect(actual).toHaveProperty("port", "55555");
  expect(actual).toHaveProperty("hostname", "localhost");

  actual = successHandler("example.com:55555\n");
  expect(actual).toHaveProperty("hostname", "example.com");
});

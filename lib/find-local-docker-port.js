import { exec } from "node:child_process";

/**
 * Export this separately so it can be tested. The exec method
 * in findLocalPort will be replaced with a mock.
 */
export function successHandler(execResponse) {
  const [addr, port] = execResponse.trim().split(":");
  const hostname = addr === "0.0.0.0" ? "localhost" : addr;
  return { hostname, port };
}

export function findLocalPort(serviceName = "wordpress", timeout = 3000) {
  /* v8 ignore start */
  return new Promise((resolve, reject) => {
    exec(`docker compose port ${serviceName} 80`, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }

      if (stdout) {
        const { hostname, port } = successHandler(stdout);
        resolve({
          hostname,
          port,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
        });
      }
      /* v8 ignore stop */
    });
    setTimeout(() => {
      const timeoutError = new Error("The `exec` command timed out.");
      reject(timeoutError);
    }, timeout);
  });
}

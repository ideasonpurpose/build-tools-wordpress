import { exec } from "node:child_process";

export function findLocalPort() {
  // export default () => {
      return new Promise((resolve, reject) => {
    exec("docker compose port wordpress 80", (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }

      if (stdout) {
        const [addr, port] = stdout.trim().split(":");
        const hostname = addr === "0.0.0.0" ? "localhost" : addr;
        resolve({ hostname, port, stdout: stdout.trim() });
      }
    });
  });
}

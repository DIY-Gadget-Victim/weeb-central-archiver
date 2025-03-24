import { serve } from "bun";
import { spawn } from "bun";
import { readFile } from "fs/promises";

const PORT = 3000;

serve({
  port: PORT,

  async fetch(req) {
    const url = new URL(req.url);

    // Serve static files for the frontend
    if (url.pathname === "/" || url.pathname === "/index.html") {
      const html = await readFile("frontend/index.html", "utf-8");
      return new Response(html, { headers: { "Content-Type": "text/html" } });
    }

    if (url.pathname === "/app.js") {
      const js = await readFile("frontend/app.js", "utf-8");
      return new Response(js, {
        headers: { "Content-Type": "application/javascript" },
      });
    }

    // Handle API requests
    if (url.pathname === "/download" && req.method === "POST") {
      const logs = { stdout: [], stderr: [] };
      try {
        const { seriesId, mangaTitle } = await req.json();

        const downloadProcess = spawn({
          cmd: ["bun", "download.js", seriesId, mangaTitle],
          stdout: "pipe",
          stderr: "pipe",
        });

        // Read stdout from the subprocess
        const reader = downloadProcess.stdout.getReader();
        let decoder = new TextDecoder();

        const logStdout = async () => {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              console.log(decoder.decode(value));
            }
            const logOutput = async (reader, logFn, type) => {
              try {
                while (true) {
                  const { done, value } = await reader.read();
                  if (done) break;
                  const message = decoder.decode(value);
                  logFn(message);
                  logs[type].push(message); // Accumulate logs

                  // Check for validation message
                  if (message.includes("Inputs validated")) {
                    console.log(
                      "Variables successfully received in download.js",
                    );
                    // Here, potentially notify the frontend, e.g., through websockets
                  }
                }
              } catch (err) {
                console.error(`Error reading ${type}:`, err);
              } finally {
                reader.releaseLock();
              }
            };

            logOutput(reader, (msg) => console.log(`STDOUT: ${msg}`), "stdout");
            logOutput(
              errorReader,
              (msg) => console.error(`STDERR: ${msg}`),
              "stderr",
            );
          } catch (err) {
            console.error("Error reading stdout:", err);
          } finally {
            reader.releaseLock();
          }
        };

        logStdout();

        // Read stderr as well
        const errorReader = downloadProcess.stderr.getReader();

        const logStderr = async () => {
          try {
            while (true) {
              const { done, value } = await errorReader.read();
              if (done) break;
              console.error(decoder.decode(value));
            }
          } catch (err) {
            console.error("Error reading stderr:", err);
          } finally {
            errorReader.releaseLock();
          }
        };

        logStderr();

        const exitCode = await downloadProcess.exited;

        return new Response(JSON.stringify({ success: exitCode === 0 }), {
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        console.error("Error handling download request:", error);
        return new Response(
          JSON.stringify({ success: false, error: "Internal Server Error" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          },
        );
      }
    }

    return new Response("Not found", { status: 404 });
  },
});

console.log(`Server is running at http://localhost:${PORT}`);

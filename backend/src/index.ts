import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { BootstrapServer } from "./utils/bootstrap";

function main() {
  const app = new Hono();

  BootstrapServer(app);

  const port = 5000;
  console.log(`Server is running on port ${port}`);

  serve({
    fetch: app.fetch,
    port,
  });
}

main();

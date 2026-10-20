import { Hono } from "hono";
import { Layout } from "./layout";

const app = new Hono<{ Bindings: Env }>();

app.get("/", (context) =>
  context.html(
    <Layout title="Shelf">
      <h1>Shelf</h1>
    </Layout>,
  ),
);

export default app;

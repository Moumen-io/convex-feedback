import { defineApp } from "convex/server";
import feedback from "convex-feedback/convex.config.js";

const app = defineApp();
app.use(feedback);

export default app;

import { App } from "./app.ts";

const app = new App();

window.addEventListener("resize", () => app.resizeCanvas());

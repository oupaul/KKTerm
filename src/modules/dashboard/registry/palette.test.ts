import { resolveAccent } from "./palette";

const defaultAccent = resolveAccent("default");
const slateAccent = resolveAccent("slate");

if (defaultAccent.color !== "var(--accent)" || defaultAccent.soft !== "var(--accent-soft)") {
  throw new Error("Default Dashboard widget accent should resolve to theme accent variables.");
}

if (slateAccent.titleText !== "#f8fafc") {
  throw new Error("Dark Dashboard widget accents should request light title text.");
}

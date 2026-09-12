import { readFileSync, writeFileSync } from "node:fs";

function read(path) {
  return readFileSync(path, "utf8");
}

function write(path, content) {
  writeFileSync(path, content);
}

const adminPath = "packages/convex-feedback/src/component/admin.ts";
let admin = read(adminPath);
admin = admin.replace(
  'import type { Doc } from "./_generated/dataModel.js";',
  'import type { Doc, Id } from "./_generated/dataModel.js";',
);
admin = admin.replace(
  '  tagId: string | undefined,',
  '  tagId: Id<"tags"> | undefined,',
);
admin = admin.replaceAll(
  'q.eq("status", args.status)',
  'q.eq("status", args.status!)',
);
write(adminPath, admin);

const componentPath =
  "packages/convex-feedback/src/component/_generated/component.ts";
let component = read(componentPath);

let primaryCount = 0;
component = component.replace(
  /^(\s*)primaryTag\?: \{\n([\s\S]*?)^\1\};\n/gm,
  (_match, indent, body) => {
    primaryCount += 1;
    return `${indent}tags: Array<{\n${body}${indent}>;\n`;
  },
);
if (primaryCount === 0) {
  throw new Error("No generated primaryTag blocks found");
}

let secondaryCount = 0;
component = component.replace(
  /^(\s*)secondaryTag\?: \{\n([\s\S]*?)^\1\};\n/gm,
  () => {
    secondaryCount += 1;
    return "";
  },
);
if (secondaryCount !== primaryCount) {
  throw new Error(
    `Expected ${primaryCount} secondaryTag blocks, got ${secondaryCount}`,
  );
}

const oldAttach = `      attach: FunctionReference<\n        "mutation",\n        "internal",\n        {\n          actor: { id: string; isAdmin: boolean };\n          entryId: string;\n          placement: "primary" | "secondary";\n          tagId: string;\n        },`;
const newAttach = `      attach: FunctionReference<\n        "mutation",\n        "internal",\n        {\n          actor: { id: string; isAdmin: boolean };\n          entryId: string;\n          tagId: string;\n        },`;
if (!component.includes(oldAttach)) {
  throw new Error("Generated tag attach signature not found");
}
component = component.replace(oldAttach, newAttach);

const oldDetach = `      detach: FunctionReference<\n        "mutation",\n        "internal",\n        {\n          actor: { id: string; isAdmin: boolean };\n          entryId: string;\n          placement: "primary" | "secondary";\n        },`;
const newDetach = `      detach: FunctionReference<\n        "mutation",\n        "internal",\n        {\n          actor: { id: string; isAdmin: boolean };\n          entryId: string;\n          tagId: string;\n        },`;
if (!component.includes(oldDetach)) {
  throw new Error("Generated tag detach signature not found");
}
component = component.replace(oldDetach, newDetach);

write(componentPath, component);
console.log(
  `Patched ${primaryCount} generated admin-entry tag shapes and tag mutation signatures.`,
);

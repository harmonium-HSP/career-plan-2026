import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const code = fs.readFileSync(new URL("../content.js", import.meta.url), "utf8");
const context = { window: {} };
vm.runInNewContext(code, context);
const plan = context.window.PLAN;

assert.equal(plan.chapters.length, 5);
const names = plan.chapters.map((item) => item.name).join("|");
assert.equal(names, "职业缘起|职业认知|自我认知|学习实践|评估优化", names.split("").map((ch) => ch.codePointAt(0).toString(16)).join(" "));
assert.equal(JSON.stringify(plan.chapters.map((item) => item.pages.length)), "[1,3,3,5,2]");
assert.equal(plan.chapters[0].sentence, "从拆解好奇到软硬协同造物");
assert.equal(plan.chapters[3].image, "assets/keyboard-top.png");
assert.match(plan.meta, /广东白云学院/);

assert.equal(
  JSON.stringify(plan.chapters.map((item) => item.ink)),
  JSON.stringify([false, false, false, false, true])
);

const practice = JSON.stringify(plan.chapters[3]);
assert.match(practice, /拟开发/);
assert.doesNotMatch(practice, /已完成工作模式/);

const all = JSON.stringify(plan);
assert.match(all, /广东白云学院/);
assert.doesNotMatch(all, /image3/);
assert.equal(JSON.stringify(plan.close.words), JSON.stringify(["硬件固件", "云端接入", "端侧推理"]));

console.log("content ok");

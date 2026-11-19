import fs from "node:fs";
import os from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { answerQuestions, loadAnswers } from "../answers.js";

describe("loadAnswers", () => {
  let dir;

  beforeEach(() => {
    dir = fs.mkdtempSync(join(os.tmpdir(), "answers-"));
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("returns undefined when nothing is given", () => {
    expect(loadAnswers(undefined)).toBeUndefined();
    expect(loadAnswers("")).toBeUndefined();
  });

  it("parses a JSON string", () => {
    expect(loadAnswers('{"projectName": "P"}')).toEqual({ projectName: "P" });
  });

  it("reads a JSON file relative to the base directory", () => {
    fs.writeFileSync(join(dir, "a.json"), '{"customerName": "C"}');
    expect(loadAnswers("a.json", dir)).toEqual({ customerName: "C" });
  });

  it("accepts an object", () => {
    expect(loadAnswers({ kind: "cap" })).toEqual({ kind: "cap" });
  });

  it("rejects invalid JSON, a missing file and a non-object", () => {
    expect(() => loadAnswers("{nope")).toThrow(/not valid JSON/);
    expect(() => loadAnswers("missing.json", dir)).toThrow(
      /Cannot read answers file/,
    );
    fs.writeFileSync(join(dir, "list.json"), "[1]");
    expect(() => loadAnswers("list.json", dir)).toThrow(/JSON object/);
  });
});

describe("answerQuestions", () => {
  const questions = [
    {
      type: "input",
      name: "projectName",
      message: "Enter the project name:",
      default: "My Project",
      validate: (v) =>
        v.length > 0 ? true : "Project name must not be empty.",
    },
    {
      type: "input",
      name: "dbSchema",
      message: "Enter the database schema name?",
      default: (answers) => answers.projectName.toUpperCase(),
    },
    {
      type: "checkbox",
      name: "features",
      message: "Select features:",
      choices: [
        { name: "a", value: "a", checked: true },
        { name: "b", value: "b", checked: false },
      ],
    },
    {
      type: "confirm",
      name: "useAzureDevOps",
      message: "Use Azure DevOps?",
      default: false,
    },
    {
      type: "number",
      name: "minReviewers",
      message: "Minimum reviewers:",
      default: 1,
    },
  ];

  it("uses the provided answers", async () => {
    const answers = await answerQuestions(questions, {
      projectName: "Shop",
      dbSchema: "SHOP_DB",
      features: ["b"],
      useAzureDevOps: true,
      minReviewers: 2,
    });
    expect(answers).toEqual({
      projectName: "Shop",
      dbSchema: "SHOP_DB",
      features: ["b"],
      useAzureDevOps: true,
      minReviewers: 2,
    });
  });

  it("takes the defaults for missing answers, including computed ones", async () => {
    const answers = await answerQuestions(questions, { projectName: "Shop" });
    expect(answers).toEqual({
      projectName: "Shop",
      dbSchema: "SHOP",
      features: ["a"],
      useAzureDevOps: false,
      minReviewers: 1,
    });
  });

  it("records which answers were read", async () => {
    const used = new Set();
    await answerQuestions(questions, { projectName: "Shop", other: 1 }, used);
    expect([...used]).toEqual(["projectName"]);
  });

  it("names the answer that fails validation", async () => {
    await expect(
      answerQuestions(questions, { projectName: "" }),
    ).rejects.toThrow(
      '--answers: "projectName" is not valid: Project name must not be empty.',
    );
  });

  it("rejects an answer of the wrong type", async () => {
    await expect(
      answerQuestions(questions, { useAzureDevOps: "yes" }),
    ).rejects.toThrow('"useAzureDevOps" must be true or false');
    await expect(answerQuestions(questions, { features: "a" })).rejects.toThrow(
      '"features" must be an array',
    );
  });

  it("asks for a required answer that has no default", async () => {
    const url = {
      type: "input",
      name: "azureRepoUrl",
      message: "Enter your Azure DevOps repository URL:\n  (Example: ...)",
      validate: (v) => (v ? true : "Invalid Azure DevOps repository URL."),
    };
    await expect(answerQuestions([url], {})).rejects.toThrow(
      '--answers needs "azureRepoUrl" (Enter your Azure DevOps repository URL:): Invalid Azure DevOps repository URL.',
    );
  });

  it("checks a list answer against its choices", async () => {
    const kind = {
      type: "list",
      name: "kind",
      message: "What do you want to do?",
      choices: [
        { name: "CAP", value: "cap" },
        { name: "UI5", value: "ui5" },
      ],
    };
    expect(await answerQuestions([kind], { kind: "ui5" })).toEqual({
      kind: "ui5",
    });
    await expect(answerQuestions([kind], { kind: "x" })).rejects.toThrow(
      'must be one of "cap", "ui5"',
    );
  });
});

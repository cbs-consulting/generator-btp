import fs from "node:fs";
import { resolve } from "node:path";

// Non-interactive runs: `--answers <file.json|JSON>` answers the prompts from a
// JSON object instead of asking. A prompt without an answer behaves as if the
// user pressed Enter: it takes its default, and its validation still runs. Used
// by CI and by coding agents, which cannot drive an interactive terminal.

// Keys that one generator reads and passes on to another, so a generator that
// does not read them must not warn about them.
const SHARED_KEYS = ["kind"];

/**
 * Reads answers from a JSON string (starting with "{"), a path to a JSON file,
 * or an object. Returns undefined when nothing is given.
 *
 * @param {string | object} [value]
 * @param {string} [cwd] - base directory for relative file paths
 * @returns {Record<string, unknown> | undefined}
 */
export function loadAnswers(value, cwd = process.cwd()) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  let answers = value;
  if (typeof value === "string") {
    const text = value.trim();
    if (text.startsWith("{")) {
      try {
        answers = JSON.parse(text);
      } catch (error) {
        throw new Error(`--answers is not valid JSON: ${error.message}`, {
          cause: error,
        });
      }
    } else {
      const file = resolve(cwd, text);
      try {
        answers = JSON.parse(fs.readFileSync(file, "utf8"));
      } catch (error) {
        throw new Error(`Cannot read answers file ${file}: ${error.message}`, {
          cause: error,
        });
      }
    }
  }

  if (typeof answers !== "object" || Array.isArray(answers)) {
    throw new Error(
      '--answers must be a JSON object, for example {"projectName": "My Project"}.',
    );
  }
  return { ...answers };
}

function firstLine(message) {
  return String(message ?? "")
    .split("\n")[0]
    .trim();
}

async function defaultFor(question, answered) {
  let value = question.default;
  if (typeof value === "function") {
    value = await value(answered);
  }
  if (value === undefined && question.type === "checkbox") {
    value = (question.choices ?? [])
      .filter((choice) => choice.checked)
      .map((choice) => choice.value ?? choice.name);
  }
  if (value === undefined && question.type === "confirm") {
    value = true;
  }
  return value;
}

function checkType(question, value) {
  switch (question.type) {
    case "confirm":
      return typeof value === "boolean" ? undefined : "must be true or false";
    case "number":
      return typeof value === "number" && !Number.isNaN(value)
        ? undefined
        : "must be a number";
    case "checkbox":
      return Array.isArray(value) ? undefined : "must be an array";
    case "list":
    case "rawlist":
    case "select": {
      const values = (question.choices ?? []).map(
        (choice) => choice.value ?? choice,
      );
      return values.includes(value)
        ? undefined
        : `must be one of ${values.map((v) => JSON.stringify(v)).join(", ")}`;
    }
    default:
      return typeof value === "string" ? undefined : "must be a string";
  }
}

/**
 * Answers inquirer-style questions from an object instead of asking. Runs each
 * question's `when`, `default`, `filter` and `validate` like inquirer does, and
 * throws with the question's name when an answer is not valid.
 *
 * @param {object[]} questions
 * @param {Record<string, unknown>} answers - the provided answers
 * @param {Set<string>} [used] - collects the names of the answers that were read
 * @param {string} [label] - names the answers in error messages
 * @returns {Promise<Record<string, unknown>>}
 */
export async function answerQuestions(
  questions,
  answers,
  used = new Set(),
  label = "--answers",
) {
  const answered = {};

  for (const question of questions) {
    const { name } = question;
    if (question.when === false) continue;
    if (typeof question.when === "function" && !(await question.when(answered)))
      continue;

    const message = firstLine(question.message);
    const provided = Object.hasOwn(answers, name);
    let value;
    let fail;
    if (provided) {
      value = answers[name];
      used.add(name);
      fail = (problem) => `${label}: "${name}" ${problem}`;
    } else {
      value = await defaultFor(question, answered);
      if (value === undefined) {
        // Like pressing Enter on a prompt without a default.
        value = "";
        fail = (problem) =>
          `${label} needs "${name}" (${message}): ${problem.replace(/^is not valid: /, "")}`;
      } else {
        fail = (problem) =>
          `${label} has no "${name}" (${message}), and its default ${problem}`;
      }
    }

    const typeError = checkType(question, value);
    if (typeError) {
      throw new Error(fail(`${typeError}.`));
    }
    if (question.filter) {
      value = await question.filter(value, answered);
    }
    if (question.validate) {
      const result = await question.validate(value, answered);
      if (result !== true) {
        throw new Error(
          fail(`is not valid: ${result === false ? message : result}`),
        );
      }
    }
    answered[name] = value;
  }

  return answered;
}

/**
 * Registers the `--answers` option on a generator, and when it is set, answers
 * the generator's prompts from it instead of asking. Call from its constructor.
 *
 * @param {object} gen - Yeoman generator
 */
export function registerAnswersOption(gen) {
  gen.option("answers", {
    type: String,
    description:
      "Answer the prompts from a JSON file or a JSON string instead of asking. Prompts without an answer take their default.",
  });

  const answers = loadAnswers(gen.options.answers, gen.destinationRoot());
  if (!answers) return;

  gen._providedAnswers = answers;
  gen._usedAnswers = new Set();
  gen.prompt = (questions) =>
    answerQuestions([questions].flat(), answers, gen._usedAnswers);
}

/**
 * Whether the generator runs with `--answers`.
 *
 * @param {object} gen - Yeoman generator
 */
export function hasProvidedAnswers(gen) {
  return gen._providedAnswers !== undefined;
}

/**
 * Warns about provided answers that no prompt read, which usually means a typo
 * in a key. Call once all prompts have run.
 *
 * @param {object} gen - Yeoman generator
 */
export function warnUnusedAnswers(gen) {
  if (!hasProvidedAnswers(gen)) return;
  const unused = Object.keys(gen._providedAnswers).filter(
    (key) => !gen._usedAnswers.has(key) && !SHARED_KEYS.includes(key),
  );
  if (unused.length > 0) {
    gen.log(
      `⚠  --answers: no prompt used ${unused.map((key) => `"${key}"`).join(", ")}. Check the spelling, or remove them.`,
    );
  }
}

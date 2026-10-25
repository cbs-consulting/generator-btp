import { describe, expect, it } from "vitest";
import { spawnSyncOrThrow } from "../spawn.js";

describe("spawnSyncOrThrow", () => {
  it("returns the spawn result when the command succeeds", () => {
    const result = { exitCode: 0 };
    const generator = {
      spawnSync: () => result,
    };

    expect(spawnSyncOrThrow(generator, "cds", ["init"], undefined, "msg")).toBe(
      result,
    );
  });

  it("forwards command, args, and options to spawnSync", () => {
    const calls = [];
    const generator = {
      spawnSync: (command, args, options) => {
        calls.push({ command, args, options });
      },
    };

    spawnSyncOrThrow(
      generator,
      "cds",
      ["init", "--add", "typescript"],
      { cwd: "/tmp/x" },
      "msg",
    );

    expect(calls).toEqual([
      {
        command: "cds",
        args: ["init", "--add", "typescript"],
        options: { cwd: "/tmp/x" },
      },
    ]);
  });

  it("rethrows with the friendly message when the command fails", () => {
    const generator = {
      spawnSync: () => {
        throw new Error("cds: command not found");
      },
    };

    expect(() =>
      spawnSyncOrThrow(
        generator,
        "cds",
        ["init"],
        undefined,
        "`cds init` failed. Ensure @sap/cds-dk is installed globally.",
      ),
    ).toThrow(/@sap\/cds-dk/);
  });

  it("includes the underlying execa shortMessage detail", () => {
    const generator = {
      spawnSync: () => {
        const error = new Error("long execa message");
        error.shortMessage = "Command failed with exit code 1";
        throw error;
      },
    };

    expect(() =>
      spawnSyncOrThrow(generator, "cds", [], undefined, "friendly"),
    ).toThrow(/Command failed with exit code 1/);
  });
});

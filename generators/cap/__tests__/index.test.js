import { spawnSync } from "node:child_process";
import fs from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect } from "vitest";
import assert from "yeoman-assert";
import * as helpers from "yeoman-test";
import { assertDevcontainerTemplating } from "../../__tests__/helpers.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe("generator-btp:cap", () => {
  const defaultCdsFeatures = [
    "typescript",
    "mta",
    "xsuaa",
    "hana",
    "sqlite",
    "html5-repo",
    "tiny-sample",
    "http",
    "test",
  ];

  describe.each([
    {
      scenario: "with Azure DevOps enabled",
      projectName: "Test CAP Project",
      customerName: "Test Customer",
      dbSchema: "TEST_CAP_PROJECT",
      useAzureDevOps: true,
      azureRepoUrl:
        "https://dev.azure.com/myorg/myproject/_git/test-cap-project",
      useBestPractices: true,
      cdsFeatures: defaultCdsFeatures,
      expectedProjectNormalized: "test-cap-project",
      expectedCustomerNormalized: "test-customer",
      expectedDbSchema: "TEST_CAP_PROJECT",
    },
    {
      scenario: "with a custom pipeline repository",
      projectName: "Central Pipeline Project",
      customerName: "Central Customer",
      dbSchema: null,
      useAzureDevOps: true,
      pipelineRepository: "Shared-Pipelines/my-cap-pipeline",
      azureRepoUrl:
        "https://dev.azure.com/myorg/myproject/_git/central-pipeline-project",
      useBestPractices: true,
      cdsFeatures: defaultCdsFeatures,
      expectedProjectNormalized: "central-pipeline-project",
      expectedCustomerNormalized: "central-customer",
      expectedDbSchema: "CENTRAL_PIPELINE_PROJECT",
    },
    {
      scenario: "without Azure DevOps",
      projectName: "No Azure Project",
      customerName: "My Customer",
      dbSchema: null,
      useAzureDevOps: false,
      cdsFeatures: defaultCdsFeatures,
      expectedProjectNormalized: "no-azure-project",
      expectedCustomerNormalized: "my-customer",
      expectedDbSchema: "NO_AZURE_PROJECT",
    },
    {
      scenario: "with uppercase names",
      projectName: "UPPERCASE PROJECT",
      customerName: "UPPERCASE CUSTOMER",
      dbSchema: null,
      useAzureDevOps: false,
      cdsFeatures: defaultCdsFeatures,
      expectedProjectNormalized: "uppercase-project",
      expectedCustomerNormalized: "uppercase-customer",
      expectedDbSchema: "UPPERCASE_PROJECT",
    },
    {
      scenario: "with multiple spaces",
      projectName: "Multi  Space  Project",
      customerName: "Multi  Space  Customer",
      dbSchema: null,
      useAzureDevOps: true,
      azureRepoUrl:
        "https://dev.azure.com/myorg/myproject/_git/multi-space-project",
      useBestPractices: true,
      cdsFeatures: defaultCdsFeatures,
      expectedProjectNormalized: "multi-space-project",
      expectedCustomerNormalized: "multi-space-customer",
      expectedDbSchema: "MULTI_SPACE_PROJECT",
    },
    {
      scenario: "with custom CDS features",
      projectName: "Custom Features Project",
      customerName: "Custom Customer",
      dbSchema: null,
      useAzureDevOps: false,
      cdsFeatures: ["typescript", "hana", "xsuaa"],
      expectedProjectNormalized: "custom-features-project",
      expectedCustomerNormalized: "custom-customer",
      expectedDbSchema: "CUSTOM_FEATURES_PROJECT",
    },
  ])(
    "$scenario",
    ({
      projectName,
      customerName,
      dbSchema,
      useAzureDevOps,
      pipelineRepository,
      azureRepoUrl,
      useBestPractices,
      cdsFeatures,
      expectedProjectNormalized,
      expectedCustomerNormalized,
      expectedDbSchema,
    }) => {
      let runResult;

      beforeAll(async () => {
        const prompts = {
          projectName,
          customerName,
          dbSchema,
          cdsFeatures,
          useAzureDevOps,
        };

        // Add Azure DevOps-specific prompts if enabled
        if (useAzureDevOps) {
          Object.assign(prompts, {
            azureRepoUrl,
            pipelineRepository,
            useBestPractices,
          });
        }

        runResult = await helpers
          .run(join(__dirname, "../index.js"))
          .withPrompts(prompts)
          .withOptions({
            skipInstall: true,
          })
          .withSpawnMock((command, args) => {
            // Mock external commands
            if (command === "git" && args[0] === "init") {
              return;
            }
            if (command === "cds" && args[0] === "init") {
              return;
            }
            if (command === "npm") {
              return;
            }
            if (command === "npx" && args[0] === "simple-git-hooks") {
              return;
            }
          });
      }, 30000);

      afterAll(() => {
        if (runResult) {
          runResult.restore();
        }
      });

      it("should store and normalize inputs correctly", () => {
        expect(runResult.generator.answers.projectName).toBe(projectName);
        expect(runResult.generator.answers.customerName).toBe(customerName);
        expect(runResult.generator.answers.dbSchema).toBe(expectedDbSchema);
        expect(runResult.generator.answers.useAzureDevOps).toBe(useAzureDevOps);
        expect(runResult.generator.answers.projectNameNormalized).toBe(
          expectedProjectNormalized,
        );
        expect(runResult.generator.answers.customerNameNormalized).toBe(
          expectedCustomerNormalized,
        );
        expect(runResult.generator.answers.cdsFeatures).toEqual(cdsFeatures);
      });

      it("should create base configuration files", () => {
        assert.file([
          ".gitignore",
          ".npmrc",
          ".gitattributes",
          ".gitconfig.aliases",
          "eslint.config.mjs",
          "prettier.config.mjs",
          "mta.yaml",
        ]);
      });

      it("should create devcontainer configuration", () => {
        assert.file([".devcontainer/devcontainer.json"]);
        assert.noFile([
          ".devcontainer/Dockerfile",
          ".devcontainer/post-create.sh",
          ".devcontainer/post-create.config.json",
        ]);
      });

      it("should not create the legacy devcontainer updater script", () => {
        assert.noFile([".devcontainer/scripts/update-devcontainer-scripts.sh"]);
      });

      it("should create MTA extension files", () => {
        assert.file([
          "mta-ext/dev.mtaext",
          "mta-ext/test.mtaext",
          "mta-ext/prod.mtaext",
        ]);
      });

      it("should conditionally create Azure DevOps pipeline file", () => {
        if (useAzureDevOps) {
          assert.file(["azure-pipelines.yaml"]);
        } else {
          assert.noFile(["azure-pipelines.yaml"]);
        }
      });

      it("should reference the shared Azure pipeline repository when one is given", () => {
        assert.noFile([".azure/pipeline-core.yml"]);
        if (!useAzureDevOps || !pipelineRepository) {
          return;
        }

        assert.fileContent(
          "azure-pipelines.yaml",
          new RegExp(
            `name:\\s*${pipelineRepository.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}`,
          ),
        );
        assert.fileContent(
          "azure-pipelines.yaml",
          /template:\s*cap-pipeline\.yml@cap/,
        );
      });

      it("should generate a self-contained pipeline without a shared repository", () => {
        if (!useAzureDevOps || pipelineRepository) {
          return;
        }

        assert.noFileContent("azure-pipelines.yaml", /resources:/);
        assert.noFileContent("azure-pipelines.yaml", /template:/);
        assert.fileContent("azure-pipelines.yaml", /- script: npm test/);
        assert.fileContent(
          "azure-pipelines.yaml",
          /mbt build --mtar archive\.mtar/,
        );
        assert.fileContent("azure-pipelines.yaml", /PublishPipelineArtifact@1/);
      });

      it("should conditionally create Azure DevOps setup scripts", () => {
        if (useAzureDevOps) {
          assert.file([
            "scripts/setup-azure-devops/README.md",
            "scripts/setup-azure-devops/azure-devops.env",
            "scripts/setup-azure-devops/setup.sh",
          ]);
        } else {
          assert.noFile([
            "scripts/setup-azure-devops/README.md",
            "scripts/setup-azure-devops/azure-devops.env",
            "scripts/setup-azure-devops/setup.sh",
          ]);
        }
      });

      it("should not create the legacy CAP pipeline updater script", () => {
        assert.noFile(["scripts/update-cap-pipeline.sh"]);
      });

      it("should not create undeploy.json", () => {
        assert.noFile(["db/undeploy.json"]);
      });

      it("should template mta.yaml with correct values", () => {
        // Check MTA ID uses normalized project name
        const mtaIdRegex = new RegExp(`ID:\\s*${expectedProjectNormalized}`);
        assert.fileContent("mta.yaml", mtaIdRegex);

        // Check MTA description uses original project name
        const mtaDescRegex = new RegExp(
          `description:\\s*MTA for ${projectName.replace(/\s+/g, "\\s+")}`,
        );
        assert.fileContent("mta.yaml", mtaDescRegex);

        // Check module name uses normalized name
        const moduleNameRegex = new RegExp(
          `name:\\s*${expectedProjectNormalized}-srv`,
        );
        assert.fileContent("mta.yaml", moduleNameRegex);
      });

      it("should template devcontainer with correct values", () => {
        assertDevcontainerTemplating(
          customerName,
          projectName,
          expectedCustomerNormalized,
          expectedProjectNormalized,
        );
      });

      it("should template package.json with normalized name", () => {
        assert.fileContent(
          "package.json",
          new RegExp(`"name":\\s*"${expectedProjectNormalized}"`),
        );
      });

      it("should not add the legacy devcontainer updater npm script", () => {
        const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));

        expect(
          packageJson.scripts["update-devcontainer-scripts"],
        ).toBeUndefined();
      });

      it("should not add the legacy CAP pipeline updater npm script", () => {
        const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));

        expect(packageJson.scripts["update-cap-pipeline"]).toBeUndefined();
      });
    },
  );

  describe("with custom target directory", () => {
    let runResult;

    beforeAll(async () => {
      runResult = await helpers
        .run(join(__dirname, "../index.js"))
        .withPrompts({
          targetDirectory: "my-new-cap-project",
          projectName: "My New CAP Project",
          customerName: "Test Customer",
          dbSchema: "MY_NEW_CAP_PROJECT",
          cdsFeatures: [
            "typescript",
            "mta",
            "xsuaa",
            "hana",
            "sqlite",
            "html5-repo",
            "tiny-sample",
            "http",
            "test",
          ],
          useAzureDevOps: false,
        })
        .withOptions({
          skipInstall: true,
        })
        .withSpawnMock((command, args) => {
          if (command === "git" && args[0] === "init") {
            return;
          }
          if (command === "cds" && args[0] === "init") {
            return;
          }
          if (command === "npm") {
            return;
          }
          if (command === "npx" && args[0] === "simple-git-hooks") {
            return;
          }
        });
    }, 30000);

    afterAll(() => {
      if (runResult) {
        runResult.restore();
      }
    });

    it("should set the destination root to the target directory", () => {
      expect(runResult.generator.destinationRoot()).toMatch(
        /[\\/]my-new-cap-project$/,
      );
    });

    it("should generate files inside the target directory", () => {
      assert.file([
        "my-new-cap-project/.gitignore",
        "my-new-cap-project/mta.yaml",
        "my-new-cap-project/.devcontainer/devcontainer.json",
      ]);
    });

    it("should template package.json with normalized name inside target directory", () => {
      assert.fileContent(
        "my-new-cap-project/package.json",
        /"name":\s*"my-new-cap-project"/,
      );
    });
  });

  describe("with skipInstall", () => {
    let runResult;
    const spawnCalls = [];

    beforeAll(async () => {
      runResult = await helpers
        .run(join(__dirname, "../index.js"))
        .withPrompts({
          projectName: "Skip Install Project",
          customerName: "Test Customer",
          dbSchema: "SKIP_INSTALL_PROJECT",
          cdsFeatures: ["typescript", "sqlite"],
          useAzureDevOps: false,
        })
        .withOptions({
          skipInstall: true,
        })
        // withSpawnMock invokes the stub as (methodName, command, args, opts),
        // so the actual command is the SECOND argument.
        .withSpawnMock((method, command, args) => {
          spawnCalls.push({ command, args });
          return;
        });
    }, 30000);

    afterAll(() => {
      if (runResult) {
        runResult.restore();
      }
    });

    it("should not run npm install", () => {
      // Sanity: the generator actually ran (cds init was spawned), so the
      // assertion below isn't passing vacuously.
      expect(spawnCalls.some((call) => call.command === "cds")).toBe(true);

      const npmInstall = spawnCalls.find(
        (call) => call.command === "npm" && call.args?.[0] === "install",
      );
      expect(npmInstall).toBeUndefined();
    });
  });

  describe("shell script permissions", () => {
    const findCalls = async (useAzureDevOps) => {
      const spawnCalls = [];
      const prompts = {
        projectName: "Chmod Project",
        customerName: "Test Customer",
        dbSchema: "CHMOD_PROJECT",
        cdsFeatures: ["typescript", "sqlite"],
        useAzureDevOps,
      };
      if (useAzureDevOps) {
        Object.assign(prompts, {
          azureRepoUrl:
            "https://dev.azure.com/myorg/myproject/_git/chmod-project",
          useBestPractices: true,
        });
      }

      const runResult = await helpers
        .run(join(__dirname, "../index.js"))
        .withPrompts(prompts)
        .withOptions({ skipInstall: true })
        .withSpawnMock((method, command, args) => {
          spawnCalls.push({ method, command, args });
        });
      runResult.restore();

      return spawnCalls.filter((call) => call.command === "find");
    };

    it("should pass the args array to spawnSync, not spawnCommandSync", async () => {
      // spawnCommandSync takes a single command string in yeoman-generator 10
      // and ignores an args array, so `find <dir> ...` would run as bare `find`.
      const calls = await findCalls(false);
      expect(calls).toHaveLength(1);
      expect(calls[0].method).toBe("spawnSync");
    }, 30000);

    it("should only chmod the generated scripts folder", async () => {
      const calls = await findCalls(true);
      expect(calls).toHaveLength(1);
      expect(calls[0].args[0]).toMatch(/[/\\]scripts$/);
    }, 30000);

    it("should chmod the generated scripts folder without Azure DevOps", async () => {
      const calls = await findCalls(false);
      expect(calls).toHaveLength(1);
      expect(calls[0].args[0]).toMatch(/[/\\]scripts$/);
    }, 30000);
  });

  describe("first commit should pass linting", () => {
    let runResult;

    beforeAll(async () => {
      runResult = await helpers
        .run(join(__dirname, "../index.js"))
        .withPrompts({
          projectName: "Lint Test Project",
          customerName: "Test Customer",
          dbSchema: "LINT_TEST_PROJECT",
          cdsFeatures: ["typescript", "sqlite", "hana", "xsuaa", "tiny-sample"],
          useAzureDevOps: false,
        })
        // Real install required: install() records the lint toolchain into
        // package.json, which the lint steps below depend on.
        .withOptions({
          skipInstall: false,
        });

      const cwd = runResult.generator.destinationRoot();

      // Set git identity required for git operations inside the generated repo
      spawnSync("git", ["config", "user.email", "ci@test.com"], {
        cwd,
        stdio: "pipe",
      });
      spawnSync("git", ["config", "user.name", "CI Test"], {
        cwd,
        stdio: "pipe",
      });

      // Run a full npm install so that @sap/cds-dk (and its bundled cds-typer)
      // are available locally — the generator's install() only installs its own
      // listed devDependencies, not everything from the cds-generated package.json.
      spawnSync("npm", ["install"], { cwd, stdio: "pipe" });

      // Simulate CDS type generation: in a real dev environment this happens
      // automatically when a developer opens the project (cds watch / CDS extension).
      // The generated @cds-models/ directory is gitignored, but eslint . --fix
      // in lint-staged still scans the entire working directory — including it.
      spawnSync("npx", ["cds-typer", "*"], { cwd, stdio: "pipe" });
    }, 360000);

    afterAll(() => {
      if (runResult) {
        runResult.restore();
      }
    });

    it("should produce no ESLint warnings in generated TypeScript files", () => {
      const cwd = runResult.generator.destinationRoot();

      // Use --max-warnings 0 so that warnings are treated as failures.
      // Warnings in generated template files indicate issues that will show up
      // every time a developer runs npm run lint in a fresh project.
      const result = spawnSync("npx", ["eslint", ".", "--max-warnings", "0"], {
        cwd,
        stdio: "pipe",
        env: { ...process.env, FORCE_COLOR: "0" },
      });

      const output = [
        result.stdout?.toString("utf8"),
        result.stderr?.toString("utf8"),
      ]
        .filter(Boolean)
        .join("\n");

      expect(
        result.status,
        `ESLint reported warnings in generated files — these should be fixed in the templates:\n${output}`,
      ).toBe(0);
    }, 30000);

    it("should pass lint-staged on the initial commit", () => {
      const cwd = runResult.generator.destinationRoot();

      // Stage all generated files — mirrors what a developer does before the first commit
      const addResult = spawnSync("git", ["add", "-A"], {
        cwd,
        stdio: "pipe",
      });
      expect(
        addResult.status,
        `git add -A failed: ${addResult.stderr?.toString("utf8")}`,
      ).toBe(0);

      // Run lint-staged directly to simulate the pre-commit hook's linting step
      // (npm test is excluded here as it requires a running CAP server)
      const lintResult = spawnSync("npx", ["lint-staged", "--no-stash"], {
        cwd,
        stdio: "pipe",
        env: { ...process.env, FORCE_COLOR: "0" },
      });

      const output = [
        lintResult.stdout?.toString("utf8"),
        lintResult.stderr?.toString("utf8"),
      ]
        .filter(Boolean)
        .join("\n");

      expect(
        lintResult.status,
        `lint-staged failed on initial commit — linting errors must be fixed before the first commit is possible:\n${output}`,
      ).toBe(0);
    }, 30000);
  });
});

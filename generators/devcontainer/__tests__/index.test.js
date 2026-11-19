import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "yeoman-assert";
import * as helpers from "yeoman-test";
import { assertDevcontainerTemplating } from "../../__tests__/helpers.js";
import { readJsonC } from "../../../utils/jsonFile.js";
import { buildFeedEntry, deriveTokenVar } from "../index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe("generator-btp:devcontainer", () => {
  describe.each([
    {
      scenario: "default values",
      projectName: "My Project",
      customerName: "My Customer",
      expectedProjectNormalized: "my-project",
      expectedCustomerNormalized: "my-customer",
    },
    {
      scenario: "simple names",
      projectName: "MyProject",
      customerName: "MyCustomer",
      expectedProjectNormalized: "myproject",
      expectedCustomerNormalized: "mycustomer",
    },
    {
      scenario: "names with spaces",
      projectName: "My Test Project",
      customerName: "My Test Customer",
      expectedProjectNormalized: "my-test-project",
      expectedCustomerNormalized: "my-test-customer",
    },
    {
      scenario: "uppercase names",
      projectName: "UPPERCASE PROJECT",
      customerName: "UPPERCASE CUSTOMER",
      expectedProjectNormalized: "uppercase-project",
      expectedCustomerNormalized: "uppercase-customer",
    },
    {
      scenario: "mixed case with multiple spaces",
      projectName: "Multi  Word   Project",
      customerName: "Multi  Word   Customer",
      expectedProjectNormalized: "multi-word-project",
      expectedCustomerNormalized: "multi-word-customer",
    },
  ])(
    "with $scenario",
    ({
      projectName,
      customerName,
      expectedProjectNormalized,
      expectedCustomerNormalized,
    }) => {
      let runResult;

      beforeAll(async () => {
        runResult = await helpers
          .run(join(__dirname, "../index.js"))
          .withPrompts({
            projectName,
            customerName,
            addFeeds: false,
          })
          .withOptions({
            skipInstall: true,
          });
      });

      afterAll(() => {
        if (runResult) {
          runResult.restore();
        }
      });

      it("should create devcontainer.json", () => {
        assert.file([".devcontainer/devcontainer.json"]);
      });

      it("should not create Dockerfile or post-create scripts", () => {
        assert.noFile([
          ".devcontainer/Dockerfile",
          ".devcontainer/post-create.sh",
          ".devcontainer/post-create.config.json",
          ".devcontainer/scripts/install-cf-plugins.sh",
          ".devcontainer/scripts/install-azure-extensions.sh",
          ".devcontainer/scripts/setup-npmrc.sh",
        ]);
      });

      it("should use image key instead of build.dockerfile", () => {
        const devcontainer = readJsonC(".devcontainer/devcontainer.json");
        expect(devcontainer.image).toBe(
          "mcr.microsoft.com/devcontainers/base:debian",
        );
        expect(devcontainer.build).toBeUndefined();
        expect(devcontainer.postCreateCommand).toBeUndefined();
      });

      it("should include all required features", () => {
        const devcontainer = readJsonC(".devcontainer/devcontainer.json");
        expect(devcontainer.features).toHaveProperty(
          "ghcr.io/devcontainers/features/node:2",
        );
        expect(devcontainer.features).toHaveProperty(
          "ghcr.io/devcontainers/features/azure-cli:1",
        );
        expect(
          devcontainer.features["ghcr.io/devcontainers/features/azure-cli:1"]
            .extensions,
        ).toBe("azure-devops");
        expect(devcontainer.features).toHaveProperty(
          "ghcr.io/cbs-consulting/container-features/btp-cli-tools:1",
        );
        expect(devcontainer.features).toHaveProperty(
          "ghcr.io/cbs-consulting/container-features/cap-dev-stack:1",
        );
        expect(devcontainer.features).toHaveProperty(
          "ghcr.io/cbs-consulting/container-features/fiori-dev-stack:1",
        );
        expect(devcontainer.features).toHaveProperty(
          "ghcr.io/cbs-consulting/container-features/dev-defaults:1",
        );
        expect(devcontainer.features).toHaveProperty(
          "ghcr.io/cbs-consulting/container-features/typescript:1",
        );
        expect(devcontainer.features).not.toHaveProperty(
          "ghcr.io/cbs-consulting/container-features/npm-feeds:1",
        );
      });

      it("should store and normalize input correctly", () => {
        expect(runResult.generator.answers.projectName).toBe(projectName);
        expect(runResult.generator.answers.customerName).toBe(customerName);
        expect(runResult.generator.answers.projectNameNormalized).toBe(
          expectedProjectNormalized,
        );
        expect(runResult.generator.answers.customerNameNormalized).toBe(
          expectedCustomerNormalized,
        );
      });

      it("should apply templating correctly", () => {
        assertDevcontainerTemplating(
          customerName,
          projectName,
          expectedCustomerNormalized,
          expectedProjectNormalized,
        );
      });
    },
  );

  describe("with npm feeds", () => {
    let runResult;

    beforeAll(async () => {
      runResult = await helpers
        .run(join(__dirname, "../index.js"))
        .withPrompts({
          projectName: "Feed Project",
          customerName: "Feed Customer",
          addFeeds: true,
          scope: "@myorg",
          organization: "myorg",
          project: "myproject",
          feed: "my-feed",
          another: false,
        })
        .withOptions({
          skipInstall: true,
        });
    });

    afterAll(() => {
      if (runResult) {
        runResult.restore();
      }
    });

    it("should include the npm-feeds feature with the feeds string", () => {
      const devcontainer = readJsonC(".devcontainer/devcontainer.json");
      expect(devcontainer.features).toHaveProperty(
        "ghcr.io/cbs-consulting/container-features/npm-feeds:1",
      );
      const feedsEntry =
        devcontainer.features[
          "ghcr.io/cbs-consulting/container-features/npm-feeds:1"
        ];
      expect(feedsEntry.feeds).toContain("@myorg");
      expect(feedsEntry.feeds).toContain(
        "https://pkgs.dev.azure.com/myorg/myproject/_packaging/my-feed/npm/registry/",
      );
      expect(feedsEntry.feeds).toContain("PAT_MYORG");
    });
  });

  describe("with the cbs preset", () => {
    let runResult;

    beforeAll(async () => {
      runResult = await helpers
        .run(join(__dirname, "../index.js"))
        .withPrompts({
          projectName: "Preset Project",
          customerName: "Preset Customer",
          addFeeds: false,
        })
        .withOptions({
          skipInstall: true,
          preset: "cbs",
        });
    });

    afterAll(() => {
      if (runResult) {
        runResult.restore();
      }
    });

    it("should use the cbs base image", () => {
      const devcontainer = readJsonC(".devcontainer/devcontainer.json");
      expect(devcontainer.image).toBe("cbsgroupdocker/cbs-debian:latest");
    });
  });

  describe("with custom target directory", () => {
    let runResult;

    beforeAll(async () => {
      runResult = await helpers
        .run(join(__dirname, "../index.js"))
        .withPrompts({
          targetDirectory: "my-devcontainer-project",
          projectName: "My Dev Project",
          customerName: "Test Customer",
          addFeeds: false,
        })
        .withOptions({
          skipInstall: true,
        });
    });

    afterAll(() => {
      if (runResult) {
        runResult.restore();
      }
    });

    it("should set the destination root to the target directory", () => {
      expect(runResult.generator.destinationRoot()).toMatch(
        /[\\/]my-devcontainer-project$/,
      );
    });

    it("should generate devcontainer.json inside the target directory", () => {
      assert.file(["my-devcontainer-project/.devcontainer/devcontainer.json"]);
      assert.noFile([
        "my-devcontainer-project/.devcontainer/Dockerfile",
        "my-devcontainer-project/.devcontainer/post-create.sh",
      ]);
    });
  });

  // The interactive multi-feed loop cannot be driven through withPrompts (a
  // repeated prompt name always returns the same answer), so the feed-string
  // building blocks are unit-tested directly instead.
  describe("with --answers", () => {
    let runResult;

    beforeAll(async () => {
      runResult = await helpers
        .run(join(__dirname, "../index.js"))
        .withOptions({
          skipInstall: true,
          answers: JSON.stringify({
            projectName: "Answered Project",
            npmFeeds: [
              {
                scope: "@one",
                organization: "org-one",
                project: "p1",
                feed: "f1",
              },
              {
                scope: "@two",
                organization: "orgtwo",
                project: "p2",
                feed: "f2",
              },
            ],
          }),
        });
    });

    afterAll(() => {
      if (runResult) {
        runResult.restore();
      }
    });

    it("answers the prompts without asking, with defaults for the rest", () => {
      assertDevcontainerTemplating(
        "My Customer",
        "Answered Project",
        "my-customer",
        "answered-project",
      );
    });

    it("adds every feed from npmFeeds", () => {
      const devcontainer = readJsonC(".devcontainer/devcontainer.json");
      const { feeds } =
        devcontainer.features[
          "ghcr.io/cbs-consulting/container-features/npm-feeds:1"
        ];
      expect(feeds).toBe(
        [
          buildFeedEntry({
            scope: "@one",
            organization: "org-one",
            project: "p1",
            feed: "f1",
          }),
          buildFeedEntry({
            scope: "@two",
            organization: "orgtwo",
            project: "p2",
            feed: "f2",
          }),
        ].join(";"),
      );
    });
  });

  describe("with an invalid feed in --answers", () => {
    it("names the feed and the key that is wrong", async () => {
      await expect(
        helpers.run(join(__dirname, "../index.js")).withOptions({
          skipInstall: true,
          answers: JSON.stringify({
            npmFeeds: [
              { scope: "myorg", organization: "o", project: "p", feed: "f" },
            ],
          }),
        }),
      ).rejects.toThrow(
        '--answers "npmFeeds[0]": "scope" is not valid: Scope must start with @',
      );
    });
  });

  describe("npm feed string builders", () => {
    it("derives a PAT env var name from a simple organization", () => {
      expect(deriveTokenVar("myorg")).toBe("PAT_MYORG");
    });

    it("uppercases and replaces non-alphanumerics in the PAT env var name", () => {
      expect(deriveTokenVar("cbs-group")).toBe("PAT_CBS_GROUP");
      expect(deriveTokenVar("My.Org 1")).toBe("PAT_MY_ORG_1");
    });

    it("builds a scope|registry|token feed entry", () => {
      expect(
        buildFeedEntry({
          scope: "@myorg",
          organization: "myorg",
          project: "myproject",
          feed: "my-feed",
        }),
      ).toBe(
        "@myorg|https://pkgs.dev.azure.com/myorg/myproject/_packaging/my-feed/npm/registry/|PAT_MYORG",
      );
    });

    it("derives the token var from the organization in the feed entry", () => {
      const entry = buildFeedEntry({
        scope: "@cbs",
        organization: "cbs-group",
        project: "proj",
        feed: "feed",
      });

      expect(entry).toContain(
        "https://pkgs.dev.azure.com/cbs-group/proj/_packaging/feed/npm/registry/",
      );
      expect(entry.endsWith("|PAT_CBS_GROUP")).toBe(true);
    });
  });
});

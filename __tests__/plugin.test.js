import { readdirSync, readFileSync } from "node:fs";

// The repository is an agent plugin, listed in the cbs agentic marketplace
// (cbs-consulting/agentic-marketplace). These checks mirror the marketplace's,
// so a broken manifest or skill fails here before users install it.

const root = (p) => new URL(`../${p}`, import.meta.url);
const readJson = (p) => JSON.parse(readFileSync(root(p), "utf8"));

function frontmatter(text) {
  const match = /^---\n([\s\S]*?)\n---\n/.exec(text.replace(/\r\n/g, "\n"));
  if (!match) return undefined;
  const data = {};
  let blockKey;
  for (const line of match[1].split("\n")) {
    if (blockKey && line.startsWith("  ")) {
      data[blockKey] = `${data[blockKey]} ${line.trim()}`.trim();
      continue;
    }
    blockKey = undefined;
    const [, key, value] = /^([\w-]+):\s*(.*)$/.exec(line) ?? [];
    if (!key) continue;
    if (value === ">-" || value === ">") {
      blockKey = key;
      data[key] = "";
    } else {
      data[key] = value;
    }
  }
  return data;
}

describe("agent plugin", () => {
  const plugin = readJson("plugin.json");

  it("has an Agent Plugins plugin.json", () => {
    expect(plugin.$schema).toMatch(
      /^https:\/\/agent-plugins\.org\/schemas\/1\.\d+\.\d+\/plugin\.schema\.json$/,
    );
    expect(plugin.name).toBe("generator-btp");
  });

  it("uses the same name in .claude-plugin/plugin.json", () => {
    expect(readJson(".claude-plugin/plugin.json").name).toBe(plugin.name);
  });

  const skills = readdirSync(root("skills"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  it("has at least one skill", () => {
    expect(skills.length).toBeGreaterThan(0);
  });

  it.each(skills)("has a valid SKILL.md in skills/%s", (name) => {
    const data = frontmatter(
      readFileSync(root(`skills/${name}/SKILL.md`), "utf8"),
    );
    expect(data, "SKILL.md must start with --- frontmatter").toBeDefined();
    expect(data.name).toBe(name);
    expect(data.name).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    expect(data.description.length).toBeGreaterThan(0);
    expect(data.description.length).toBeLessThanOrEqual(1024);
    expect(data.license).toBe("Apache-2.0");
  });
});

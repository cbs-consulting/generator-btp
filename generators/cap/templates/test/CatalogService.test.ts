import cds from "@sap/cds";
import { describe, expect, it } from "vitest";

const { GET, axios } = cds.test("./");
axios.defaults.auth = { username: "alice", password: "" };

describe("CatalogService OData APIs", () => {
  it("serves CatalogService.Books", async () => {
    const { data } = await GET`/odata/v4/catalog/Books`;
    expect(data.value).toContainEqual(expect.objectContaining({ ID: 1 }));
  });
});

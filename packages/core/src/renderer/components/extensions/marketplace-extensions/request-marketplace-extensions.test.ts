import { describe, expect, it } from "vitest";
import downloadJsonViaChannelInjectable from "../../../fetch/download-json-via-channel-copy.injectable";
import { getDiForUnitTesting } from "../../../getDiForUnitTesting";
import requestMarketplaceExtensionsInjectable from "./request-marketplace-extensions.injectable";

describe("request-marketplace-extensions", () => {
  it("parses the repository and authors fields from the marketplace list", async () => {
    const di = getDiForUnitTesting();

    di.permitSideEffects(requestMarketplaceExtensionsInjectable);

    di.override(downloadJsonViaChannelInjectable, () => async () => ({
      callWasSuccessful: true,
      response: {
        meta: { version: 0 },
        extensions: [
          {
            name: "some-extension",
            description: "Some description",
            version: "1.0.0",
            status: "official",
            repository: "https://github.com/foo/bar",
            authors: [{ name: "Alex", github: "https://github.com/alex", website: "www.alex.dev" }, { name: "Maria" }],
          },
        ],
      },
    }));

    const request = di.inject(requestMarketplaceExtensionsInjectable);
    const [extension] = await request();

    expect(extension.repository).toBe("https://github.com/foo/bar");
    expect(extension.authors).toHaveLength(2);
    expect(extension.authors?.[0].github).toBe("https://github.com/alex");
    expect(extension.authors?.[0].website).toBe("www.alex.dev");
  });
});

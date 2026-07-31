import path from "path";
import { fileURLToPath } from "url";
import { XMLParser } from "fast-xml-parser";
import { writeFile } from "fs/promises";
import { fetch } from "undici";
import semver from "semver";

const { SemVer } = semver;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const expectedResponseForm = /v(?<version>\d+\.\d+\.\d+)/;

/**
 * Oldest minor the map may name, matching `MIN_SUPPORTED_MINOR` in
 * `update-kubectl-checksums.ts`.
 *
 * The application refuses to download any kubectl it has no verified digest
 * for, and 1.22 is the oldest line Kubernetes publishes a cosign signature for
 * -- 1.21.14 ships a checksum and nothing else, which is the vendor's word
 * rather than a signature. Listing a minor here that cannot be pinned would
 * only produce a download that enforcement then rejects, so the two floors are
 * kept the same. Clusters below it fall back to the bundled kubectl.
 */
const minSupportedMinor = 22;

async function requestGreatestKubectlPatchVersion(majorMinor: string): Promise<string | undefined> {
  const response = await fetch(`https://dl.k8s.io/release/stable-${majorMinor}.txt`);

  if (response.status !== 200) {
    try {
      const parser = new XMLParser();
      const errorBody = parser.parse(await response.text());

      throw new Error(
        `failed to get stable version for ${majorMinor}: ${errorBody?.Error?.Message ?? response.statusText}`,
      );
    } catch {
      throw new Error(`failed to get stable version for ${majorMinor}: ${response.statusText}`);
    }
  }

  const body = await response.text();
  const match = expectedResponseForm.exec(body)?.groups as { version: string } | undefined;

  if (!match) {
    throw new Error(`failed to get stable version for ${majorMinor}: unexpected response shape. body="${body}"`);
  }

  return match.version;
}

async function requestAllVersions(): Promise<[string, string][]> {
  const greatestVersion = await requestGreatestKubectlPatchVersion("1");

  if (!greatestVersion) {
    return [];
  }

  const greatestSemVer = new SemVer(greatestVersion);
  const majorMinorRequests = new Array<string>(Math.max(greatestSemVer.minor - minSupportedMinor + 1, 0))
    .fill("")
    .map((value, index) => `1.${index + minSupportedMinor}`)
    .map(async (majorMinor) => [majorMinor, await requestGreatestKubectlPatchVersion(majorMinor)] as const);

  return (await Promise.all(majorMinorRequests)).filter((entry): entry is [string, string] => !!entry[1]);
}

async function main() {
  const versions = await requestAllVersions();

  await writeFile(path.join(__dirname, "versions.json"), JSON.stringify(versions, null, 4));
}

await main();

import path from "path";
import { fileURLToPath } from "url";
import { XMLParser } from "fast-xml-parser";
import { writeFile } from "fs/promises";
import fetch from "node-fetch";
import semver from "semver";
import { TypedRegEx } from "typed-regex";

const { SemVer } = semver;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const expectedResponseForm = TypedRegEx("v(?<version>\\d+\\.\\d+\\.\\d+)");

/**
 * Oldest minor the map may name.
 *
 * Every version listed here is one the application may download at runtime, and
 * every download is checked against a digest pinned in `checksums.json`. That
 * pin is only worth having because a cosign signature was verified when it was
 * written, and 1.22 is the oldest line Kubernetes publishes one for - 1.21.14
 * ships a checksum and nothing else. Reaching lower would mean pinning on the
 * vendor's word alone, so the map stops where the evidence does, and stops here
 * rather than in the pin table so the two cannot drift apart.
 */
const oldestSupportedMinor = 22;

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
  const match = expectedResponseForm.captures(body);

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
  const majorMinorRequests = new Array<string>(Math.max(greatestSemVer.minor - oldestSupportedMinor + 1, 0))
    .fill("")
    .map((value, index) => `1.${oldestSupportedMinor + index}`)
    .map(async (majorMinor) => [majorMinor, await requestGreatestKubectlPatchVersion(majorMinor)] as const);

  return (await Promise.all(majorMinorRequests)).filter((entry): entry is [string, string] => !!entry[1]);
}

async function main() {
  const versions = await requestAllVersions();

  await writeFile(path.join(__dirname, "versions.json"), JSON.stringify(versions, null, 4));
}

await main();

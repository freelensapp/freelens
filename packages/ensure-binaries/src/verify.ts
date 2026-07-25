/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pipeline as _pipeline } from "node:stream";
import { promisify } from "node:util";
import gunzip from "gunzip-maybe";
import * as openpgp from "openpgp";
import { verify as verifyBundle } from "sigstore";
import { extract } from "tar-stream";
import * as yauzl from "yauzl-promise";
import { fetchBytes } from "./download.js";

import type { Artifact } from "./artifacts.js";

/**
 * Signature checks run when a digest is pinned, not when a build downloads it.
 *
 * A pinned checksum on its own only says the bytes did not change since someone
 * looked. These checks say who produced them, and doing that once at bump time
 * keeps the heavier machinery - a transparency log lookup, an external cosign
 * binary - out of every build on every platform.
 *
 * Each publisher offers something different, so there is no single mechanism:
 * freelens-k8s-proxy has GitHub build provenance, helm signs with PGP, and
 * kubectl uses keyless cosign.
 */

const run = promisify(execFile);
const pipeline = promisify(_pipeline);

/** Identity of the workflow allowed to have produced a freelens-k8s-proxy release. */
const K8S_PROXY_REPO = "freelensapp/freelens-k8s-proxy";
const K8S_PROXY_WORKFLOW = ".github/workflows/release.yaml";
const GITHUB_OIDC_ISSUER = "https://token.actions.githubusercontent.com";

/** Identity Kubernetes signs its release artifacts with. */
const KREL_IDENTITY = "krel-staging@k8s-releng-prod.iam.gserviceaccount.com";
const KREL_OIDC_ISSUER = "https://accounts.google.com";

function githubToken(): string | undefined {
  return process.env.GITHUB_TOKEN || process.env.GH_TOKEN || undefined;
}

/**
 * Verifies the SLSA build provenance GitHub stores for a release asset.
 *
 * The bundle is fetched by digest, so a bundle for some other artifact cannot
 * be substituted, and the certificate identity is pinned to the release
 * workflow of the expected repository at the expected tag.
 */
async function verifyGithubProvenance(artifact: Artifact, sha256: string): Promise<string> {
  const token = githubToken();
  const url = `https://api.github.com/repos/${K8S_PROXY_REPO}/attestations/sha256:${sha256}`;
  const response = await fetch(url, {
    headers: {
      accept: "application/vnd.github+json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    const hint =
      response.status === 403 || response.status === 429
        ? " Unauthenticated calls are limited to 60 per hour; set GITHUB_TOKEN to raise it."
        : "";

    throw new Error(`no build provenance for ${artifact.binaryName}: ${url} returned ${response.status}.${hint}`);
  }

  const { attestations } = (await response.json()) as { attestations?: { bundle: never }[] };

  if (!attestations?.length) {
    throw new Error(`no build provenance published for ${artifact.url}`);
  }

  const identity = `https://github.com/${K8S_PROXY_REPO}/${K8S_PROXY_WORKFLOW}@refs/tags/v${artifact.version}`;
  const failures: string[] = [];

  for (const attestation of attestations) {
    try {
      await verifyBundle(attestation.bundle, {
        certificateIssuer: GITHUB_OIDC_ISSUER,
        certificateIdentityURI: identity,
      });
    } catch (error) {
      failures.push(String(error));
      continue;
    }

    // The bundle signature is valid, but it still has to be about this artifact.
    const bundle = attestation.bundle as { dsseEnvelope?: { payload?: string } };
    const payload = bundle.dsseEnvelope?.payload;

    if (!payload) {
      failures.push("bundle has no DSSE envelope");
      continue;
    }

    const statement = JSON.parse(Buffer.from(payload, "base64").toString("utf-8")) as {
      subject?: { name?: string; digest?: { sha256?: string } }[];
    };
    const subject = statement.subject?.find((entry) => entry.digest?.sha256 === sha256);

    if (!subject) {
      failures.push(`verified provenance does not list ${sha256} among its subjects`);
      continue;
    }

    return `GitHub build provenance, ${identity}, subject ${subject.name}`;
  }

  throw new Error(`build provenance for ${artifact.url} did not verify: ${failures.join("; ")}`);
}

/** Reads the pinned copy of helm's KEYS, which holds one armored block per maintainer. */
async function readHelmKeys(): Promise<openpgp.Key[]> {
  const pathToKeys = path.join(path.dirname(new URL(import.meta.url).pathname), "..", "keys", "helm.asc");
  const armored = await readFile(pathToKeys, "utf-8");

  // openpgp.readKeys parses only the first block of a concatenated file, which
  // would silently reduce helm's ten maintainer keys to one and reject any
  // release signed by somebody else.
  const blocks = armored
    .split(/(?=-{5}BEGIN PGP PUBLIC KEY BLOCK-{5})/)
    .filter((block) => block.includes("BEGIN PGP PUBLIC KEY BLOCK"));
  const keys: openpgp.Key[] = [];

  for (const block of blocks) {
    keys.push(...(await openpgp.readKeys({ armoredKeys: block })));
  }

  if (keys.length === 0) {
    throw new Error(`no PGP keys found in ${pathToKeys}`);
  }

  return keys;
}

/** Verifies a detached PGP signature over a local file and names the signers. */
async function verifyPgpOverFile(filePath: string, signatureUrl: string): Promise<string> {
  const armoredSignature = (await fetchBytes(signatureUrl)).toString("utf-8");
  const keys = await readHelmKeys();

  const result = await openpgp.verify({
    message: await openpgp.createMessage({ binary: await readFile(filePath) }),
    signature: await openpgp.readSignature({ armoredSignature }),
    verificationKeys: keys,
    expectSigned: true,
  });

  const signers = await Promise.all(
    result.signatures.map(async (signature) => {
      await signature.verified;

      const keyID = signature.keyID;
      const signer = keys.find((key) => key.getKeys(keyID).length > 0);

      return `${keyID.toHex()} (${signer?.getUserIDs()[0] ?? "unknown"})`;
    }),
  );

  return signers.join(", ");
}

/** SHA-256 of one entry inside a gzipped tarball. */
async function digestOfTarEntry(tarPath: string, entryName: string): Promise<string> {
  const extracting = extract({ allowUnknownFormat: false });
  let digest: string | undefined;

  extracting.on("entry", (headers, stream, next) => {
    if (!headers.name.endsWith(entryName)) {
      stream.resume();
      next();
      return;
    }

    const hash = createHash("sha256");

    stream.on("data", (chunk: Buffer) => hash.update(chunk));
    stream.once("end", () => {
      digest = hash.digest("hex");
      next();
    });
    stream.once("error", next);
  });

  await pipeline(createReadStream(tarPath), gunzip(3), extracting);

  if (!digest) {
    throw new Error(`${tarPath} contains no ${entryName}`);
  }

  return digest;
}

/** SHA-256 of one entry inside a zip archive. */
async function digestOfZipEntry(zipPath: string, entryName: string): Promise<string> {
  const zip = await yauzl.open(zipPath);

  try {
    for await (const entry of zip) {
      if (!entry.filename.endsWith(entryName)) {
        continue;
      }

      const hash = createHash("sha256");

      for await (const chunk of await entry.openReadStream()) {
        hash.update(chunk as Buffer);
      }

      return hash.digest("hex");
    }
  } finally {
    await zip.close();
  }

  throw new Error(`${zipPath} contains no ${entryName}`);
}

/**
 * Verifies helm's detached PGP signature over the tarball.
 *
 * The signature comes from the GitHub release, a different origin than
 * get.helm.sh where the tarball itself lives, and the keys are the copy pinned
 * in this repository rather than whatever helm serves today.
 */
async function verifyHelmSignature(artifact: Artifact, artifactPath: string): Promise<string> {
  const name = path.basename(artifact.url);
  const signers = await verifyPgpOverFile(
    artifactPath,
    `https://github.com/helm/helm/releases/download/v${artifact.version}/${name}.asc`,
  );

  return `helm PGP signature by ${signers}`;
}

/**
 * Verifies helm on Windows, where the tarball we download is not the artifact
 * helm signs.
 *
 * get.helm.sh serves both a .tar.gz and a .zip for Windows, but only the .zip
 * has a published .asc. Rather than switch the build to an archive format it
 * cannot stream, the signed .zip is verified here and its helm.exe compared
 * against the one inside the pinned tarball. Identical bytes mean the
 * signature vouches for what the build will actually extract.
 */
async function verifyHelmWindowsSignature(artifact: Artifact, artifactPath: string, workDir: string): Promise<string> {
  const zipName = path.basename(artifact.url).replace(/\.tar\.gz$/, ".zip");
  const zipPath = path.join(workDir, zipName);

  await writeFile(zipPath, await fetchBytes(`https://get.helm.sh/${zipName}`, 15 * 60 * 1000));

  const signers = await verifyPgpOverFile(
    zipPath,
    `https://github.com/helm/helm/releases/download/v${artifact.version}/${zipName}.asc`,
  );
  const fromZip = await digestOfZipEntry(zipPath, artifact.binaryName);
  const fromTarball = await digestOfTarEntry(artifactPath, artifact.binaryName);

  if (fromZip !== fromTarball) {
    throw new Error(
      `${artifact.binaryName} differs between the signed ${zipName} (${fromZip}) and the pinned tarball (${fromTarball}), so the signature says nothing about what the build would extract`,
    );
  }

  return `helm PGP signature by ${signers} over ${zipName}, whose ${artifact.binaryName} (${fromZip}) is byte-identical to the pinned tarball's`;
}

/**
 * Verifies the keyless cosign signature Kubernetes publishes next to kubectl.
 *
 * The Fulcio certificate is only valid for ten minutes, so cosign proves the
 * signature predates its expiry through the Rekor transparency log. That needs
 * network access and the cosign binary, which is why this runs here and not in
 * the build.
 */
async function verifyKubectlSignature(artifact: Artifact, artifactPath: string, workDir: string): Promise<string> {
  const signaturePath = path.join(workDir, "kubectl.sig");
  const certificatePath = path.join(workDir, "kubectl.cert");

  await writeFile(signaturePath, await fetchBytes(`${artifact.url}.sig`));
  await writeFile(certificatePath, await fetchBytes(`${artifact.url}.cert`));

  try {
    await run("cosign", [
      "verify-blob",
      artifactPath,
      "--signature",
      signaturePath,
      "--certificate",
      certificatePath,
      "--certificate-identity",
      KREL_IDENTITY,
      "--certificate-oidc-issuer",
      KREL_OIDC_ISSUER,
    ]);
  } catch (error) {
    const detail = error instanceof Error && "stderr" in error ? String(error.stderr) : String(error);

    if (detail.includes("ENOENT")) {
      throw new Error(
        "cosign is required to verify kubectl but was not found on PATH. Install it from https://github.com/sigstore/cosign, or in CI use sigstore/cosign-installer.",
      );
    }

    throw new Error(`cosign could not verify ${artifact.url}: ${detail.trim()}`);
  }

  return `cosign signature by ${KREL_IDENTITY}`;
}

/** Verifies whatever the publisher of this artifact offers, or throws. */
export async function verifyArtifact(
  artifact: Artifact,
  sha256: string,
  artifactPath: string,
  workDir: string,
): Promise<string> {
  switch (artifact.tool) {
    case "freelens-k8s-proxy":
      return verifyGithubProvenance(artifact, sha256);
    case "helm":
      return artifact.platform === "windows"
        ? verifyHelmWindowsSignature(artifact, artifactPath, workDir)
        : verifyHelmSignature(artifact, artifactPath);
    case "kubectl":
      return verifyKubectlSignature(artifact, artifactPath, workDir);
  }
}

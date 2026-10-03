/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { isErrnoException } from "@freelensapp/utilities";
import yaml from "js-yaml";
import { defaultYamlDumpOptions, dumpConfigYaml } from "../../common/kube-helpers";

import type { Logger } from "@freelensapp/logger";

import type { KubeConfig } from "@kubernetes/client-node";
import type { PartialDeep } from "type-fest";

import type { SelfSignedCert } from "../../common/certificate/certificate";
import type { Cluster } from "../../common/cluster/cluster";
import type { LoadKubeconfig } from "../../common/cluster/load-kubeconfig.injectable";
import type { PathExists } from "../../common/fs/path-exists.injectable";
import type { ReadFile } from "../../common/fs/read-file.injectable";
import type { RemovePath } from "../../common/fs/remove.injectable";
import type { WriteFile } from "../../common/fs/write-file.injectable";
import type { GetAbsolutePath } from "../../common/path/get-absolute-path.injectable";
import type { GetDirnameOfPath } from "../../common/path/get-dirname.injectable";
import type { JoinPaths } from "../../common/path/join-paths.injectable";
import type { ResolveTilde } from "../../common/path/resolve-tilde.injectable";
import type { KubeAuthProxyServer } from "../cluster/kube-auth-proxy-server.injectable";

interface KubeconfigManagerDependencies {
  readonly directoryForTemp: string;
  readonly logger: Logger;
  readonly certificate: SelfSignedCert;
  readonly kubeAuthProxyServer: KubeAuthProxyServer;
  readonly kubeAuthProxyUrl: string;
  joinPaths: JoinPaths;
  getDirnameOfPath: GetDirnameOfPath;
  getAbsolutePath: GetAbsolutePath;
  resolveTilde: ResolveTilde;
  pathExists: PathExists;
  readFile: ReadFile;
  removePath: RemovePath;
  writeFile: WriteFile;
  loadKubeconfig: LoadKubeconfig;
  isBypassEnabled: () => boolean;
}

/**
 * A loosely-typed view over the raw kubeconfig YAML. Only the fields that the
 * bypass copy needs to mutate are named; every other key is preserved verbatim
 * by the generic `yaml.load` -> `yaml.dump` round-trip.
 */
interface RawKubeconfig {
  "current-context"?: string;
  clusters?: { name?: string; cluster?: Record<string, unknown> }[];
  users?: { name?: string; user?: Record<string, unknown> }[];
  contexts?: { name?: string; context?: Record<string, unknown> }[];
  [key: string]: unknown;
}

export class KubeconfigManager {
  /**
   * The path to the temp config file
   *
   * - if `string` then path
   * - if `null` then not yet created or was cleared
   */
  protected tempFilePath: string | null = null;

  constructor(
    private readonly dependencies: KubeconfigManagerDependencies,
    private readonly cluster: Cluster,
  ) {}

  /**
   *
   * @returns The path to the temporary kubeconfig. When "Bypass Freelens Internal
   * KubeApi Proxy" is enabled the temp file mirrors the original kubeconfig but
   * pins `current-context` to the connected cluster so that external `kubectl`
   * and `helm` invocations act on the right cluster.
   */
  async ensurePath(): Promise<string> {
    if (this.tempFilePath === null || !(await this.dependencies.pathExists(this.tempFilePath))) {
      return await this.ensureFile();
    }

    return this.tempFilePath;
  }

  /**
   * Deletes the temporary kubeconfig file
   */
  async clear(): Promise<void> {
    if (!this.tempFilePath) {
      return;
    }

    this.dependencies.logger.info(`[KUBECONFIG-MANAGER]: Deleting temporary kubeconfig: ${this.tempFilePath}`);

    try {
      await this.dependencies.removePath(this.tempFilePath);
    } catch (error) {
      if (isErrnoException(error) && error.code !== "ENOENT") {
        throw error;
      }
    } finally {
      this.tempFilePath = null;
    }
  }

  protected async ensureFile() {
    if (this.dependencies.isBypassEnabled()) {
      try {
        return (this.tempFilePath = await this.createBypassKubeconfig());
      } catch (error) {
        throw new Error(`Failed to create temp kubeconfig for bypass: ${error}`);
      }
    }

    try {
      await this.dependencies.kubeAuthProxyServer.ensureRunning();

      return (this.tempFilePath = await this.createProxyKubeconfig());
    } catch (error) {
      throw new Error(`Failed to create temp config for auth-proxy: ${error}`);
    }
  }

  /**
   * Creates a temporary kubeconfig that mirrors the original kubeconfig but
   * pins `current-context` to the cluster being opened. Used when the user
   * has enabled "Bypass Freelens Internal KubeApi Proxy" so that kubectl/helm
   * in this cluster's terminals do not fall back to the kubeconfig's default
   * context (which can target the wrong cluster).
   *
   * The copy is made by round-tripping the raw YAML rather than the parsed
   * client-node `KubeConfig`, so that every field is preserved verbatim —
   * notably `proxy-url`, `tls-server-name`, impersonation (`as`) and
   * `extensions`, which the bastion/SOCKS5 kubeconfigs this feature targets
   * rely on, and which a `dumpConfigYaml` projection would silently drop.
   * Relative file references are made absolute against the original
   * kubeconfig's directory (they would otherwise resolve against the temp
   * directory), while `token-file`/`exec` stay live references rather than
   * being inlined and frozen.
   */
  protected async createBypassKubeconfig(): Promise<string> {
    const {
      id,
      preferences: { defaultNamespace },
    } = this.cluster;
    const contextName = this.cluster.contextName.get();
    const tempFile = this.dependencies.joinPaths(this.dependencies.directoryForTemp, `kubeconfig-${id}`);
    const originalPath = this.dependencies.resolveTilde(this.cluster.kubeConfigPath.get());
    const baseDir = this.dependencies.getDirnameOfPath(originalPath);
    const toAbsolute = (value: unknown): unknown =>
      typeof value === "string" && value.length > 0 ? this.dependencies.getAbsolutePath(baseDir, value) : value;

    const config = (yaml.load(await this.dependencies.readFile(originalPath)) ?? {}) as RawKubeconfig;

    config["current-context"] = contextName;

    for (const { cluster } of config.clusters ?? []) {
      if (cluster && "certificate-authority" in cluster) {
        cluster["certificate-authority"] = toAbsolute(cluster["certificate-authority"]);
      }
    }

    for (const { user } of config.users ?? []) {
      if (!user) {
        continue;
      }

      for (const field of ["client-certificate", "client-key", "token-file"] as const) {
        if (field in user) {
          user[field] = toAbsolute(user[field]);
        }
      }
    }

    for (const entry of config.contexts ?? []) {
      if (entry.name === contextName && entry.context) {
        const namespace = defaultNamespace || entry.context.namespace;

        if (namespace) {
          entry.context.namespace = namespace;
        }
      }
    }

    const configYaml = yaml.dump(config, defaultYamlDumpOptions);

    await this.dependencies.writeFile(tempFile, configYaml, { mode: 0o600 });
    this.dependencies.logger.debug(
      `[KUBECONFIG-MANAGER]: Created bypass kubeconfig "${contextName}" at "${tempFile}": \n${configYaml}`,
    );

    return tempFile;
  }

  /**
   * Creates new "temporary" kubeconfig that point to the kubectl-proxy.
   * This way any user of the config does not need to know anything about the auth etc. details.
   */
  protected async createProxyKubeconfig(): Promise<string> {
    const {
      id,
      preferences: { defaultNamespace },
    } = this.cluster;
    const contextName = this.cluster.contextName.get();
    const tempFile = this.dependencies.joinPaths(this.dependencies.directoryForTemp, `kubeconfig-${id}`);
    const kubeConfig = await this.dependencies.loadKubeconfig();
    const proxyConfig: PartialDeep<KubeConfig> = {
      currentContext: contextName,
      clusters: [
        {
          name: contextName,
          server: this.dependencies.kubeAuthProxyUrl,
          skipTLSVerify: false,
          caData: Buffer.from(this.dependencies.certificate.cert).toString("base64"),
        },
      ],
      users: [{ name: "proxy", username: "lens", password: "fake" }],
      contexts: [
        {
          user: "proxy",
          name: contextName,
          cluster: contextName,
          namespace: defaultNamespace || kubeConfig.getContextObject(contextName)?.namespace,
        },
      ],
    };
    // write
    const configYaml = dumpConfigYaml(proxyConfig);

    await this.dependencies.writeFile(tempFile, configYaml, { mode: 0o600 });
    this.dependencies.logger.debug(
      `[KUBECONFIG-MANAGER]: Created temp kubeconfig "${contextName}" at "${tempFile}": \n${configYaml}`,
    );

    return tempFile;
  }
}

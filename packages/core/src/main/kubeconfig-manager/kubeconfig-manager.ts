/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { dumpConfigYaml } from "../../common/kube-helpers";

import type { Logger } from "@freelensapp/logger";

import type { KubeConfig } from "@kubernetes/client-node";
import type { PartialDeep } from "type-fest";

import type { SelfSignedCert } from "../../common/certificate/certificate";
import type { Cluster } from "../../common/cluster/cluster";
import type { LoadKubeconfig } from "../../common/cluster/load-kubeconfig.injectable";
import type { EnsureDirectory } from "../../common/fs/ensure-dir.injectable";
import type { PathExists } from "../../common/fs/path-exists.injectable";
import type { RemovePath } from "../../common/fs/remove.injectable";
import type { WriteFile } from "../../common/fs/write-file.injectable";
import type { GetDirnameOfPath } from "../../common/path/get-dirname.injectable";
import type { JoinPaths } from "../../common/path/join-paths.injectable";
import type { FreelensK8sProxyServer } from "../cluster/freelens-k8s-proxy-server.injectable";

interface KubeconfigManagerDependencies {
  readonly directoryForTemp: string;
  readonly logger: Logger;
  readonly certificate: SelfSignedCert;
  readonly freelensK8sProxyServer: FreelensK8sProxyServer;
  readonly freelensProxyClusterUrl: string;
  joinPaths: JoinPaths;
  getDirnameOfPath: GetDirnameOfPath;
  pathExists: PathExists;
  removePath: RemovePath;
  writeFile: WriteFile;
  ensureDirectory: EnsureDirectory;
  loadKubeconfig: LoadKubeconfig;
}

/**
 * What a process run against the cluster's proxy needs: the kubeconfig, and
 * the directory kubectl and helm keep their discovery and HTTP cache in.
 *
 * The proxy listens on a different port after every start, and kubectl and
 * helm name their cache after the API host, so the default `~/.kube/cache`
 * would collect a directory per session that nothing reads again. Pass the
 * cache directory as `KUBECACHEDIR` to every such process, and to kubectl also
 * as `--cache-dir`, which the older versions that ignore the variable read.
 */
export interface ProxyKubeconfigPaths {
  readonly kubeconfigPath: string;
  readonly cacheDirectoryPath: string;
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
   * @returns The path to the temporary kubeconfig
   */
  async ensurePath(): Promise<string> {
    return (await this.ensurePaths()).kubeconfigPath;
  }

  /**
   *
   * @returns The paths to the temporary kubeconfig and to its cache directory
   */
  async ensurePaths(): Promise<ProxyKubeconfigPaths> {
    const kubeconfigPath =
      this.tempFilePath === null || !(await this.dependencies.pathExists(this.tempFilePath))
        ? await this.ensureFile()
        : this.tempFilePath;

    return { kubeconfigPath, cacheDirectoryPath: this.cacheDirectoryPath };
  }

  /**
   * Deletes the temporary kubeconfig file and its cache directory.
   *
   * The removal is best-effort and never throws. Both live in the temp
   * directory and hold nothing secret, while a file still open in another
   * process (a terminal, a port-forward, an antivirus scanner) cannot be
   * deleted on Windows. A disconnect must neither fail nor wait because of it.
   */
  async clear(): Promise<void> {
    if (!this.tempFilePath) {
      return;
    }

    const kubeconfigPath = this.tempFilePath;
    const { cacheDirectoryPath } = this;

    this.tempFilePath = null;
    this.dependencies.logger.info(
      `[KUBECONFIG-MANAGER]: Deleting temporary kubeconfig: ${kubeconfigPath} and its cache: ${cacheDirectoryPath}`,
    );

    await Promise.all([this.removeBestEffort(kubeconfigPath), this.removeBestEffort(cacheDirectoryPath)]);
  }

  protected get cacheDirectoryPath(): string {
    return this.dependencies.joinPaths(this.dependencies.directoryForTemp, `kubecache-${this.cluster.id}`);
  }

  protected async removeBestEffort(path: string): Promise<void> {
    try {
      await this.dependencies.removePath(path);
    } catch (error) {
      this.dependencies.logger.warn(`[KUBECONFIG-MANAGER]: Could not delete ${path}, leaving it in place: ${error}`);
    }
  }

  protected async ensureFile() {
    try {
      await this.dependencies.freelensK8sProxyServer.ensureRunning();

      const kubeconfigPath = await this.createProxyKubeconfig();

      await this.dependencies.ensureDirectory(this.cacheDirectoryPath);

      return (this.tempFilePath = kubeconfigPath);
    } catch (error) {
      throw new Error(`Failed to create temp kubeconfig for freelens-proxy: ${error}`);
    }
  }

  /**
   * Creates new "temporary" kubeconfig that points to the freelens-proxy.
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
          server: this.dependencies.freelensProxyClusterUrl,
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

/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { loggerInjectionToken } from "@freelensapp/logger";
import { disposer, isDefined, isRequestError, withConcurrencyLimit } from "@freelensapp/utilities";
import { ApiException, type KubeConfig } from "@kubernetes/client-node";
import { getInjectable, lifecycleEnum } from "@ogre-tools/injectable";
import { comparer, reaction, runInAction } from "mobx";
import createAuthorizationApiInjectable from "../../common/cluster/create-authorization-api.injectable";
import createCanIInjectable from "../../common/cluster/create-can-i.injectable";
import createCoreApiInjectable from "../../common/cluster/create-core-api.injectable";
import createRequestNamespaceListPermissionsInjectable from "../../common/cluster/create-request-namespace-list-permissions.injectable";
import createListNamespacesInjectable from "../../common/cluster/list-namespaces.injectable";
import loadKubeconfigInjectable from "../../common/cluster/load-kubeconfig.injectable";
import { ClusterMetadataKey, ClusterStatus } from "../../common/cluster-types";
import broadcastMessageInjectable from "../../common/ipc/broadcast-message.injectable";
import { clusterListNamespaceForbiddenChannel } from "../../common/ipc/cluster";
import { formatKubeApiResource } from "../../common/rbac";
import { replaceObservableObject } from "../../common/utils/replace-observable-object";
import clusterVersionDetectorInjectable from "../cluster-detectors/cluster-version-detector.injectable";
import detectClusterMetadataInjectable from "../cluster-detectors/detect-cluster-metadata.injectable";
import broadcastConnectionUpdateInjectable from "./broadcast-connection-update.injectable";
import kubeAuthProxyServerInjectable from "./kube-auth-proxy-server.injectable";
import loadProxyKubeconfigInjectable from "./load-proxy-kubeconfig.injectable";
import prometheusHandlerInjectable from "./prometheus-handler/prometheus-handler.injectable";
import removeProxyKubeconfigInjectable from "./remove-proxy-kubeconfig.injectable";
import requestApiResourcesInjectable from "./request-api-resources.injectable";

import type { Logger } from "@freelensapp/logger";

import type { Cluster } from "../../common/cluster/cluster";
import type { CreateAuthorizationApi } from "../../common/cluster/create-authorization-api.injectable";
import type { CreateCanI } from "../../common/cluster/create-can-i.injectable";
import type { CreateCoreApi } from "../../common/cluster/create-core-api.injectable";
import type {
  CreateRequestNamespaceListPermissions,
  RequestNamespaceListPermissions,
} from "../../common/cluster/create-request-namespace-list-permissions.injectable";
import type { CreateListNamespaces } from "../../common/cluster/list-namespaces.injectable";
import type { LoadKubeconfig } from "../../common/cluster/load-kubeconfig.injectable";
import type { BroadcastMessage } from "../../common/ipc/broadcast-message.injectable";
import type { KubeApiResource } from "../../common/rbac";
import type { DetectClusterMetadata } from "../cluster-detectors/detect-cluster-metadata.injectable";
import type { FallibleOnlyClusterMetadataDetector } from "../cluster-detectors/token";
import type { BroadcastConnectionUpdate } from "./broadcast-connection-update.injectable";
import type { KubeAuthProxyServer } from "./kube-auth-proxy-server.injectable";
import type { LoadProxyKubeconfig } from "./load-proxy-kubeconfig.injectable";
import type { ClusterPrometheusHandler } from "./prometheus-handler/prometheus-handler";
import type { RemoveProxyKubeconfig } from "./remove-proxy-kubeconfig.injectable";
import type { RequestApiResources } from "./request-api-resources.injectable";

interface Dependencies {
  readonly logger: Logger;
  readonly prometheusHandler: ClusterPrometheusHandler;
  readonly kubeAuthProxyServer: KubeAuthProxyServer;
  readonly clusterVersionDetector: FallibleOnlyClusterMetadataDetector;
  createCanI: CreateCanI;
  requestApiResources: RequestApiResources;
  createRequestNamespaceListPermissions: CreateRequestNamespaceListPermissions;
  createAuthorizationApi: CreateAuthorizationApi;
  createCoreApi: CreateCoreApi;
  createListNamespaces: CreateListNamespaces;
  detectClusterMetadata: DetectClusterMetadata;
  broadcastMessage: BroadcastMessage;
  broadcastConnectionUpdate: BroadcastConnectionUpdate;
  loadProxyKubeconfig: LoadProxyKubeconfig;
  removeProxyKubeconfig: RemoveProxyKubeconfig;
  loadKubeconfig: LoadKubeconfig;
}

/**
 * Automatic refreshes stop after this many consecutive authentication failures,
 * until the user reconnects: exec credential plugins (kubelogin, oidc-login...)
 * may open a browser tab at every attempt, and the 30s refresh timer would
 * otherwise pile up tabs while the user is away.
 */
const maxAutoAuthRetries = 3;

/** Delay before the next automatic attempt after the n-th consecutive failure: 1 min, then 5 min. */
const authBackoffIntervalsMs = [60_000, 300_000];

/**
 * The proxy reports a credential plugin failure with the client-go wording,
 * e.g. "getting credentials: exec: executable kubelogin failed with exit code 1".
 */
const credentialPluginErrorPatterns = [/getting credentials/i, /exec plugin/i, /credential plugin/i];

function isCredentialPluginError(message: string): boolean {
  return credentialPluginErrorPatterns.some((pattern) => pattern.test(message));
}

/**
 * A request cut by the k8sRequest timeout rejects with the abort reason string
 * ("Operation timed out: ..."), or with an AbortError when aborted without a reason.
 */
function isTimeoutError(error: unknown): boolean {
  if (typeof error === "string") {
    return /timed out|aborted/i.test(error);
  }

  return (
    error instanceof Error &&
    (error.name === "AbortError" || error.name === "TimeoutError" || /timed out/i.test(error.message))
  );
}

export type { ClusterConnection };

class ClusterConnection {
  protected readonly eventsDisposer = disposer();

  protected activated = false;

  /** Consecutive authentication failures of the automatic refresh, see maxAutoAuthRetries. */
  private consecutiveAuthFailures = 0;

  /** Timestamp (ms) before which the refresh timer must not try again. */
  private nextRefreshAllowedAt = 0;

  /**
   * Prevents overlapping connection status checks: while a credential plugin
   * waits for an interactive login, no other caller must start another attempt.
   */
  private isRefreshing = false;

  constructor(
    private readonly dependencies: Dependencies,
    private readonly cluster: Cluster,
  ) {}

  private shouldAttemptAutoRefresh(): boolean {
    if (this.consecutiveAuthFailures >= maxAutoAuthRetries) {
      return false;
    }

    return this.consecutiveAuthFailures === 0 || Date.now() >= this.nextRefreshAllowedAt;
  }

  /**
   * Called after broadcasting an authentication failure of the status check:
   * schedules the next automatic attempt, or pauses them at the last retry.
   */
  private onAuthFailure(): void {
    this.consecutiveAuthFailures++;

    const backoffMs =
      authBackoffIntervalsMs[Math.min(this.consecutiveAuthFailures - 1, authBackoffIntervalsMs.length - 1)];

    this.nextRefreshAllowedAt = Date.now() + backoffMs;

    if (this.consecutiveAuthFailures >= maxAutoAuthRetries) {
      this.dependencies.logger.warn(
        `[CLUSTER]: authentication failed ${this.consecutiveAuthFailures} times for "${this.cluster.contextName.get()}", pausing automatic refresh until reconnect`,
      );
      this.dependencies.broadcastConnectionUpdate({
        level: "error",
        message: `Authentication failed ${this.consecutiveAuthFailures} times, automatic reconnection paused: reconnect to try again`,
      });
    } else {
      this.dependencies.logger.warn(
        `[CLUSTER]: authentication failure #${this.consecutiveAuthFailures} for "${this.cluster.contextName.get()}", next automatic attempt in ${backoffMs / 1000}s`,
      );
    }
  }

  private onAuthSuccess(): void {
    if (this.consecutiveAuthFailures > 0) {
      this.dependencies.logger.info(
        `[CLUSTER]: authentication succeeded after ${this.consecutiveAuthFailures} consecutive failure(s)`,
        this.cluster.getMeta(),
      );
    }

    this.resetAuthFailureTracking();
  }

  /** Called on reconnect and disconnect, so that a manual action always gets a fresh attempt. */
  private resetAuthFailureTracking(): void {
    this.consecutiveAuthFailures = 0;
    this.nextRefreshAllowedAt = 0;
  }

  /**
   * Whether the user of this cluster authenticates through an exec credential
   * plugin. A timeout of the status check on such a cluster most likely means
   * the plugin is waiting for an interactive login, so it counts as an
   * authentication failure for the backoff instead of a network problem.
   */
  private async usesExecCredentialPlugin(): Promise<boolean> {
    try {
      const kubeConfig = await this.dependencies.loadKubeconfig();
      const context = kubeConfig.getContextObject(this.cluster.contextName.get());
      const user = context ? kubeConfig.getUser(context.user) : null;

      return Boolean(user?.exec);
    } catch (error) {
      this.dependencies.logger.warn(
        `[CLUSTER]: failed to read the kubeconfig user of "${this.cluster.contextName.get()}"`,
        error,
      );

      return false;
    }
  }

  private async onConnectionTimeout(): Promise<ClusterStatus> {
    if (await this.usesExecCredentialPlugin()) {
      this.dependencies.broadcastConnectionUpdate({
        level: "error",
        message: "Connection timed out, the credential plugin may be waiting for an interactive login",
      });
      this.onAuthFailure();
    } else {
      this.dependencies.broadcastConnectionUpdate({
        level: "error",
        message: "Connection timed out",
      });
    }

    return ClusterStatus.Offline;
  }

  private bindEvents() {
    this.dependencies.logger.info(`[CLUSTER]: bind events`, this.cluster.getMeta());
    const refreshTimer = setInterval(() => {
      if (!this.cluster.disconnected.get() && this.shouldAttemptAutoRefresh()) {
        this.refresh();
      }
    }, 30_000); // every 30s
    const refreshMetadataTimer = setInterval(() => {
      if (this.cluster.available.get()) {
        this.refreshAccessibilityAndMetadata();
      }
    }, 900000); // every 15 minutes

    this.eventsDisposer.push(
      reaction(
        () => this.cluster.prometheusPreferences.get(),
        (preferences) => this.dependencies.prometheusHandler.setupPrometheus(preferences),
        { equals: comparer.structural },
      ),
      () => clearInterval(refreshTimer),
      () => clearInterval(refreshMetadataTimer),
      reaction(
        () => this.cluster.preferences.defaultNamespace,
        () => this.recreateProxyKubeconfig(),
      ),
    );
  }

  protected async recreateProxyKubeconfig() {
    this.dependencies.logger.info("[CLUSTER]: Recreating proxy kubeconfig");

    try {
      await this.dependencies.removeProxyKubeconfig();
      await this.dependencies.loadProxyKubeconfig();
    } catch (error) {
      this.dependencies.logger.error(`[CLUSTER]: failed to recreate proxy kubeconfig`, error);
    }
  }

  /**
   * @param force force activation
   */
  async activate(force = false) {
    if (this.activated && !force) {
      return;
    }

    this.dependencies.logger.info(`[CLUSTER]: activate`, this.cluster.getMeta());

    if (!this.eventsDisposer.length) {
      this.bindEvents();
    }

    if (this.cluster.disconnected.get() || !this.cluster.accessible.get()) {
      try {
        this.dependencies.broadcastConnectionUpdate({
          level: "info",
          message: "Starting connection ...",
        });
        await this.reconnect();
      } catch (error) {
        this.dependencies.broadcastConnectionUpdate({
          level: "error",
          message: `Failed to start connection: ${error}`,
        });

        return;
      }
    }

    try {
      this.dependencies.broadcastConnectionUpdate({
        level: "info",
        message: "Refreshing connection status ...",
      });
      await this.refreshConnectionStatus();
    } catch (error) {
      this.dependencies.broadcastConnectionUpdate({
        level: "error",
        message: `Failed to connection status: ${error}`,
      });

      return;
    }

    if (this.cluster.accessible.get()) {
      try {
        this.dependencies.broadcastConnectionUpdate({
          level: "info",
          message: "Refreshing cluster accessibility ...",
        });
        await this.refreshAccessibility();
      } catch (error) {
        this.dependencies.broadcastConnectionUpdate({
          level: "error",
          message: `Failed to refresh accessibility: ${error}`,
        });

        return;
      }
      this.dependencies.broadcastConnectionUpdate({
        level: "info",
        message: "Connected, waiting for view to load ...",
      });
    }

    this.activated = true;
  }

  async reconnect() {
    this.dependencies.logger.info(`[CLUSTER]: reconnect`, this.cluster.getMeta());
    this.resetAuthFailureTracking();
    await this.dependencies.kubeAuthProxyServer?.restart();

    runInAction(() => {
      this.cluster.disconnected.set(false);
    });
  }

  disconnect() {
    if (this.cluster.disconnected.get()) {
      return this.dependencies.logger.debug("[CLUSTER]: already disconnected", { id: this.cluster.id });
    }

    this.resetAuthFailureTracking();

    runInAction(() => {
      this.dependencies.logger.info(`[CLUSTER]: disconnecting`, { id: this.cluster.id });
      this.eventsDisposer();
      this.dependencies.kubeAuthProxyServer?.stop();
      this.cluster.disconnected.set(true);
      this.cluster.online.set(false);
      this.cluster.accessible.set(false);
      this.cluster.ready.set(false);
      this.activated = false;
      this.cluster.allowedNamespaces.clear();
      this.dependencies.logger.info(`[CLUSTER]: disconnected`, { id: this.cluster.id });
    });
  }

  async refresh() {
    this.dependencies.logger.info(`[CLUSTER]: refresh`, this.cluster.getMeta());
    await this.refreshConnectionStatus();
  }

  async refreshAccessibilityAndMetadata() {
    await this.refreshAccessibility();
    await this.refreshMetadata();
  }

  async refreshMetadata() {
    this.dependencies.logger.info(`[CLUSTER]: refreshMetadata`, this.cluster.getMeta());
    const metadata = await this.dependencies.detectClusterMetadata(this.cluster);

    runInAction(() => {
      replaceObservableObject(this.cluster.metadata, metadata);
    });
  }

  private async refreshAccessibility(): Promise<void> {
    this.dependencies.logger.info(`[CLUSTER]: refreshAccessibility`, this.cluster.getMeta());
    const proxyConfig = await this.dependencies.loadProxyKubeconfig();
    const api = this.dependencies.createAuthorizationApi(proxyConfig);
    const canI = this.dependencies.createCanI(api);
    const requestNamespaceListPermissions = this.cluster.preferences.skipNamespaceAuthorizationCheck
      ? async () => () => true
      : this.dependencies.createRequestNamespaceListPermissions(api);

    const isAdmin = await canI({
      namespace: "kube-system",
      resource: "*",
      verb: "create",
    });
    const isGlobalWatchEnabled = await canI({
      verb: "watch",
      resource: "*",
    });
    const allowedNamespaces = await this.requestAllowedNamespaces(proxyConfig);
    const knownResources = await (async () => {
      const result = await this.dependencies.requestApiResources(this.cluster);

      if (result.callWasSuccessful) {
        return result.response;
      }

      if (this.cluster.knownResources.length > 0) {
        this.dependencies.logger.warn(`[CLUSTER]: failed to list KUBE resources, sticking with previous list`);

        return this.cluster.knownResources;
      }

      this.dependencies.logger.warn(
        `[CLUSTER]: failed to list KUBE resources for the first time, blocking connection to cluster...`,
      );
      this.dependencies.broadcastConnectionUpdate({
        level: "error",
        message: "Failed to list kube API resources, please reconnect...",
      });

      return [];
    })();
    const resourcesToShow = await this.getResourcesToShow(
      allowedNamespaces,
      knownResources,
      requestNamespaceListPermissions,
    );

    runInAction(() => {
      this.cluster.isAdmin.set(isAdmin);
      this.cluster.isGlobalWatchEnabled.set(isGlobalWatchEnabled);
      this.cluster.allowedNamespaces.replace(allowedNamespaces);
      this.cluster.knownResources.replace(knownResources);
      this.cluster.resourcesToShow.replace(resourcesToShow);
      this.cluster.ready.set(this.cluster.knownResources.length > 0);
    });

    this.dependencies.logger.debug(`[CLUSTER]: refreshed accessibility data`, this.cluster.getState());
  }

  async refreshConnectionStatus() {
    // activate(), the refresh timer and the network events all end up here: a
    // check still waiting for a credential plugin must not be doubled.
    if (this.isRefreshing) {
      this.dependencies.logger.debug(
        `[CLUSTER]: skipping refresh, previous refresh still in progress`,
        this.cluster.getMeta(),
      );

      return;
    }

    this.isRefreshing = true;

    try {
      const connectionStatus = await this.getConnectionStatus();

      runInAction(() => {
        this.cluster.online.set(connectionStatus > ClusterStatus.Offline);
        this.cluster.accessible.set(connectionStatus == ClusterStatus.AccessGranted);
      });
    } finally {
      this.isRefreshing = false;
    }
  }

  protected async getConnectionStatus(): Promise<ClusterStatus> {
    try {
      const versionData = await this.dependencies.clusterVersionDetector.detect(this.cluster);

      runInAction(() => {
        this.cluster.metadata.version = versionData.value;
        this.cluster.metadata[ClusterMetadataKey.LAST_SEEN] = new Date().toJSON();
      });

      this.onAuthSuccess();

      return ClusterStatus.AccessGranted;
    } catch (error) {
      this.dependencies.logger.error(`[CLUSTER]: Failed to connect to "${this.cluster.contextName.get()}": ${error}`);

      if (isRequestError(error)) {
        if (error.statusCode) {
          if (error.statusCode >= 400 && error.statusCode < 500) {
            this.dependencies.broadcastConnectionUpdate({
              level: "error",
              message: "Invalid credentials",
            });
            this.onAuthFailure();

            return ClusterStatus.AccessDenied;
          }

          const message = String(error.error || error.message) || String(error);

          if (isCredentialPluginError(message)) {
            this.dependencies.broadcastConnectionUpdate({
              level: "error",
              message: `Failed to fetch credentials: ${message}`,
            });
            this.onAuthFailure();

            return ClusterStatus.AccessDenied;
          }

          this.dependencies.broadcastConnectionUpdate({
            level: "error",
            message,
          });

          return ClusterStatus.Offline;
        }

        if (error.failed === true) {
          if (error.timedOut === true) {
            return this.onConnectionTimeout();
          }

          this.dependencies.broadcastConnectionUpdate({
            level: "error",
            message: "Failed to fetch credentials",
          });
          this.onAuthFailure();

          return ClusterStatus.AccessDenied;
        }

        if (isTimeoutError(error)) {
          return this.onConnectionTimeout();
        }

        const message = String(error.error || error.message) || String(error);

        this.dependencies.broadcastConnectionUpdate({
          level: "error",
          message,
        });
      } else if (error instanceof Error || typeof error === "string") {
        if (isTimeoutError(error)) {
          return this.onConnectionTimeout();
        }

        this.dependencies.broadcastConnectionUpdate({
          level: "error",
          message: `${error}`,
        });
      } else {
        this.dependencies.broadcastConnectionUpdate({
          level: "error",
          message: "Unknown error has occurred",
        });
      }

      return ClusterStatus.Offline;
    }
  }

  protected async requestAllowedNamespaces(proxyConfig: KubeConfig) {
    if (this.cluster.accessibleNamespaces.length) {
      return this.cluster.accessibleNamespaces;
    }

    try {
      const api = this.dependencies.createCoreApi(proxyConfig);
      const listNamespaces = this.dependencies.createListNamespaces(api);

      return await listNamespaces();
    } catch (error) {
      const ctx = proxyConfig.getContextObject(this.cluster.contextName.get());
      const namespaceList = [ctx?.namespace].filter(isDefined);

      if (namespaceList.length === 0 && error instanceof ApiException && error.code === 403) {
        const { body } = error;

        this.dependencies.logger.info("[CLUSTER]: listing namespaces is forbidden, broadcasting", {
          clusterId: this.cluster.id,
          error: body,
        });
        this.dependencies.broadcastMessage(clusterListNamespaceForbiddenChannel, this.cluster.id);
      }

      return namespaceList;
    }
  }

  protected async getResourcesToShow(
    allowedNamespaces: string[],
    knownResources: KubeApiResource[],
    req: RequestNamespaceListPermissions,
  ) {
    if (!allowedNamespaces.length) {
      return [];
    }

    const requestNamespaceListPermissions = withConcurrencyLimit(5)(req);
    const namespaceListPermissions = allowedNamespaces.map(requestNamespaceListPermissions);
    const canListResources = await Promise.all(namespaceListPermissions);

    return knownResources.filter((resource) => canListResources.some((fn) => fn(resource))).map(formatKubeApiResource);
  }
}

const clusterConnectionInjectable = getInjectable({
  id: "cluster-connection",
  instantiate: (di, cluster) =>
    new ClusterConnection(
      {
        clusterVersionDetector: di.inject(clusterVersionDetectorInjectable),
        kubeAuthProxyServer: di.inject(kubeAuthProxyServerInjectable, cluster),
        logger: di.inject(loggerInjectionToken),
        prometheusHandler: di.inject(prometheusHandlerInjectable, cluster),
        broadcastConnectionUpdate: di.inject(broadcastConnectionUpdateInjectable, cluster),
        broadcastMessage: di.inject(broadcastMessageInjectable),
        createListNamespaces: di.inject(createListNamespacesInjectable),
        detectClusterMetadata: di.inject(detectClusterMetadataInjectable),
        loadProxyKubeconfig: di.inject(loadProxyKubeconfigInjectable, cluster),
        loadKubeconfig: di.inject(loadKubeconfigInjectable, cluster),
        removeProxyKubeconfig: di.inject(removeProxyKubeconfigInjectable, cluster),
        requestApiResources: di.inject(requestApiResourcesInjectable),
        createAuthorizationApi: di.inject(createAuthorizationApiInjectable),
        createCoreApi: di.inject(createCoreApiInjectable),
        createCanI: di.inject(createCanIInjectable),
        createRequestNamespaceListPermissions: di.inject(createRequestNamespaceListPermissionsInjectable),
      },
      cluster,
    ),
  lifecycle: lifecycleEnum.keyedSingleton({
    getInstanceKey: (di, cluster: Cluster) => cluster.id,
  }),
});

export default clusterConnectionInjectable;

/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Spinner } from "@freelensapp/spinner";
import { withInjectables } from "@ogre-tools/injectable-react";
import { autorun, computed, makeObservable, observable } from "mobx";
import { disposeOnUnmount, observer } from "mobx-react";
import React from "react";
import { initialFilesystemMountpoints } from "../../../common/cluster-types";
import requestMetricsProvidersInjectable from "../../../common/k8s-api/endpoints/metrics.api/request-providers.injectable";
import productNameInjectable from "../../../common/vars/product-name.injectable";
import { Checkbox } from "../checkbox";
import { Input } from "../input";
import { SubTitle } from "../layout/sub-title";
import { Select } from "../select";

import type { Cluster } from "../../../common/cluster/cluster";
import type {
  MetricProviderInfo,
  RequestMetricsProviders,
} from "../../../common/k8s-api/endpoints/metrics.api/request-providers.injectable";
import type { SelectOption } from "../select";

export interface ClusterPrometheusSettingProps {
  cluster: Cluster;
}

const autoDetectPrometheus = Symbol("auto-detect-prometheus");

type ProviderValue = typeof autoDetectPrometheus | string;

interface Dependencies {
  productName: string;
  requestMetricsProviders: RequestMetricsProviders;
}

@observer
class NonInjectedClusterPrometheusSetting extends React.Component<ClusterPrometheusSettingProps & Dependencies> {
  @observable mountpoints = "";
  @observable path = ""; // <namespace>/<service>:<port>
  @observable customPrefix = ""; // e.g. "/prometheus"
  @observable useHttps = false; // whether to use https scheme for service proxy
  @observable directUrl = ""; // direct URL to Prometheus (bypasses K8s service proxy)
  @observable bearerToken = ""; // bearer token for Prometheus authentication
  @observable selectedOption: ProviderValue = autoDetectPrometheus;
  @observable loading = true;
  readonly initialFilesystemMountpoints = initialFilesystemMountpoints;
  readonly loadedOptions = observable.map<string, MetricProviderInfo>();

  @computed get options(): SelectOption<ProviderValue>[] {
    return [
      {
        value: autoDetectPrometheus,
        label: "Auto Detect Prometheus",
        isSelected: autoDetectPrometheus === this.selectedOption,
      },
      ...Array.from(this.loadedOptions, ([id, provider]) => ({
        value: id,
        label: provider.name,
        isSelected: id === this.selectedOption,
      })),
    ];
  }

  constructor(props: ClusterPrometheusSettingProps & Dependencies) {
    super(props);
    makeObservable(this);
  }

  @computed get canEditPrometheusPath(): boolean {
    if (!this.selectedOption || this.selectedOption === autoDetectPrometheus) {
      return false;
    }

    return this.loadedOptions.get(this.selectedOption)?.isConfigurable ?? false;
  }

  @computed get isOpenShift(): boolean {
    return this.selectedOption === "openshift";
  }

  componentDidMount() {
    disposeOnUnmount(
      this,
      autorun(() => {
        const { prometheus, prometheusProvider, filesystemMountpoints } = this.props.cluster.preferences;

        if (prometheus) {
          const prefix = prometheus.prefix || "";

          this.path =
            prometheus.namespace && prometheus.service
              ? `${prometheus.namespace}/${prometheus.service}:${prometheus.port}`
              : "";
          this.customPrefix = prefix;
          this.useHttps = Boolean(prometheus.https);
          this.directUrl = prometheus.directUrl || "";
          this.bearerToken = prometheus.bearerToken || "";
        } else {
          this.path = "";
          this.customPrefix = "";
          this.useHttps = false;
          this.directUrl = "";
          this.bearerToken = "";
        }

        if (prometheusProvider) {
          this.selectedOption =
            this.options.find((opt) => opt.value === prometheusProvider.type)?.value ?? autoDetectPrometheus;
        } else {
          this.selectedOption = autoDetectPrometheus;
        }

        if (filesystemMountpoints) {
          this.mountpoints = filesystemMountpoints;
        }
      }),
    );

    this.props.requestMetricsProviders().then((values) => {
      this.loading = false;
      this.loadedOptions.replace(values.map((provider) => [provider.id, provider]));
    });
  }

  private sanitizePrefix(prefix: string): string {
    if (!prefix) return "";
    return prefix.startsWith("/") ? prefix : `/${prefix}`;
  }

  parsePrometheusPath = () => {
    if (!this.selectedOption) {
      return undefined;
    }

    // For OpenShift, allow saving with just directUrl (no service path needed)
    if (this.isOpenShift && this.directUrl) {
      const parsed = this.path ? this.path.split(/\/|:/, 3) : [];

      return {
        namespace: parsed[0] || "",
        service: parsed[1] || "",
        port: parseInt(parsed[2]) || 0,
        prefix: this.sanitizePrefix(this.customPrefix),
        https: this.useHttps,
        directUrl: this.directUrl,
        bearerToken: this.bearerToken || undefined,
      };
    }

    if (!this.path) {
      return undefined;
    }

    const parsed = this.path.split(/\/|:/, 3);

    if (!parsed[0] || !parsed[1] || !parsed[2]) {
      return undefined;
    }

    return {
      namespace: parsed[0],
      service: parsed[1],
      port: parseInt(parsed[2]),
      prefix: this.sanitizePrefix(this.customPrefix),
      https: this.useHttps,
      directUrl: this.directUrl || undefined,
      bearerToken: this.bearerToken || undefined,
    };
  };

  onSaveProvider = () => {
    this.props.cluster.preferences.prometheusProvider =
      typeof this.selectedOption === "string" ? { type: this.selectedOption } : undefined;
  };

  onSaveAll = () => {
    this.props.cluster.preferences.prometheus = this.parsePrometheusPath();
  };

  onSaveMountpoints = () => {
    this.props.cluster.preferences.filesystemMountpoints = this.mountpoints;
  };

  render() {
    return (
      <>
        <section>
          <SubTitle title="Prometheus" />
          {this.loading ? (
            <Spinner />
          ) : (
            <>
              <Select
                id="cluster-prometheus-settings-input"
                value={this.selectedOption}
                onChange={(option) => {
                  this.selectedOption = option?.value ?? autoDetectPrometheus;
                  this.onSaveProvider();
                }}
                options={this.options}
                themeName="lens"
              />
              <small className="hint">
                What query format is used to fetch metrics from Prometheus. Select &quot;OpenShift&quot; for
                OpenShift/OKD clusters where Prometheus requires bearer token authentication.
              </small>
            </>
          )}
        </section>
        {this.canEditPrometheusPath && (
          <>
            <hr />
            <section>
              <SubTitle title="Prometheus service address" />
              <Input
                theme="round-black"
                value={this.path}
                onChange={(value) => (this.path = value)}
                onBlur={this.onSaveAll}
                placeholder="<namespace>/<service>:<port>"
              />
              <small className="hint">
                {this.isOpenShift
                  ? `An address to the Prometheus service (<namespace>/<service>:<port>). For OpenShift this is typically openshift-monitoring/prometheus-k8s:9091. Can be left empty when using a Prometheus ingress/route.`
                  : `An address to an existing Prometheus installation (<namespace>/<service>:<port>). ${this.props.productName} tries to auto-detect address if left empty.`}
              </small>
            </section>
            <hr />
            <section>
              <SubTitle title="Prometheus HTTPS requests" />
              <Checkbox
                label={`Use HTTPS for Prometheus requests`}
                value={this.useHttps}
                onChange={(checked) => {
                  this.useHttps = checked;
                  this.onSaveAll();
                }}
              />
              <small className="hint">
                {this.isOpenShift
                  ? "Enable HTTPS for the Kubernetes API service proxy path. Not needed when using a Prometheus ingress/route (the route URL scheme is used instead)."
                  : "Externally hosted Prometheus might listen using HTTPS. Usually this is not needed."}
              </small>
            </section>
            <hr />
            <section>
              <SubTitle title="Custom path prefix" />
              <Input
                theme="round-black"
                value={this.customPrefix}
                onChange={(value) => (this.customPrefix = value)}
                onBlur={this.onSaveAll}
                placeholder="/prometheus"
              />
              <small className="hint">
                An optional path prefix added to all Prometheus requests. Useful if Prometheus expects e.g. /prometheus
                to be added to all requests.
              </small>
            </section>
            {this.isOpenShift && (
              <>
                <hr />
                <section>
                  <SubTitle title="Prometheus ingress/route" />
                  <Input
                    theme="round-black"
                    value={this.directUrl}
                    onChange={(value) => (this.directUrl = value)}
                    onBlur={this.onSaveAll}
                    placeholder="https://prometheus-k8s-openshift-monitoring.apps.example.com"
                  />
                  <small className="hint">
                    The external URL (OpenShift Route or Ingress) to the Prometheus instance. This connects directly
                    to Prometheus, bypassing the Kubernetes API service proxy which cannot forward authentication
                    headers. Find the route with: oc get route prometheus-k8s -n openshift-monitoring
                    -o jsonpath=&apos;https://&#123;.spec.host&#125;&apos;
                  </small>
                </section>
                <hr />
                <section>
                  <SubTitle title="Bearer token" />
                  <Input
                    theme="round-black"
                    type="password"
                    value={this.bearerToken}
                    onChange={(value) => (this.bearerToken = value)}
                    onBlur={this.onSaveAll}
                    placeholder="eyJhbGciOi..."
                  />
                  <small className="hint">
                    Service account bearer token for authenticating to Prometheus. On OpenShift, Prometheus
                    requires authentication via kube-rbac-proxy. Generate a long-lived token with: oc create token
                    &lt;service-account&gt; -n openshift-monitoring --duration=8760h
                  </small>
                </section>
              </>
            )}
          </>
        )}
        <>
          <hr />
          <section>
            <SubTitle title="Filesystem mountpoints" />
            <Input
              theme="round-black"
              value={this.mountpoints}
              onChange={(value) => (this.mountpoints = value)}
              onBlur={this.onSaveMountpoints}
              placeholder={this.initialFilesystemMountpoints}
            />
            <small className="hint">
              {`A regexp for the label with the filesystem mountpoints that will create a graph for disk usage. For the root disk only use "/" and for all disks use ".*".`}
            </small>
          </section>
        </>
      </>
    );
  }
}

export const ClusterPrometheusSetting = withInjectables<Dependencies, ClusterPrometheusSettingProps>(
  NonInjectedClusterPrometheusSetting,
  {
    getProps: (di, props) => ({
      ...props,
      productName: di.inject(productNameInjectable),
      requestMetricsProviders: di.inject(requestMetricsProvidersInjectable),
    }),
  },
);

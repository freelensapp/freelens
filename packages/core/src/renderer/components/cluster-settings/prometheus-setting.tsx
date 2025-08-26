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

  componentDidMount() {
    disposeOnUnmount(
      this,
      autorun(() => {
        const { prometheus, prometheusProvider, filesystemMountpoints } = this.props.cluster.preferences;

        if (prometheus) {
          const prefix = prometheus.prefix || "";

          this.path = `${prometheus.namespace}/${prometheus.service}:${prometheus.port}`;
          this.customPrefix = prefix;
          this.useHttps = Boolean(prometheus.https);
        } else {
          this.path = "";
          this.customPrefix = "";
          this.useHttps = false;
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
    if (!this.selectedOption || !this.path) {
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
              <small className="hint">What query format is used to fetch metrics from Prometheus</small>
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
                {`An address to an existing Prometheus installation (<namespace>/<service>:<port>). ${this.props.productName} tries to auto-detect address if left empty.`}
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
                Externally hosted Prometheus might listen using HTTPS. Usually this is not needed.
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

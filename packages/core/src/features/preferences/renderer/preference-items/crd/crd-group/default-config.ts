/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

/**
 * Default configuration for CRD Groups
 * This configuration is used when the user doesn't have a custom configuration
 */
export const DEFAULT_CONFIG_YAML = `# CRD Groups Configuration
GitOps:
  - FluxCD:
    - kustomize.toolkit.fluxcd.io
    - Image Policies:
      - image.toolkit.fluxcd.io
    - Source Control:
      - helm.toolkit.fluxcd.io
      - source.toolkit.fluxcd.io
    - Notifications:
      - notification.toolkit.fluxcd.io
    - Control Plane:
      - fluxcd.controlplane.io

Policy & Security:
  - GateKeeper:
    - config.gatekeeper.sh
    - expansion.gatekeeper.sh
    - externaldata.gatekeeper.sh
    - mutations.gatekeeper.sh
    - status.gatekeeper.sh
    - syncset.gatekeeper.sh
    - templates.gatekeeper.sh
  - Kyverno:
    - Core:
      - kyverno.io
    - Policies:
      - policies.kyverno.io
      - wgpolicyk8s.io
    - Reports:
      - reports.kyverno.io
  - Microsoft Defender:
    - defender.microsoft.com
  - Trivy:
    - aquasecurity.github.io

Autoscaling:
  - autoscaling.k8s.io
  - KEDA:
    - Core:
      - keda.sh
    - Events:
      - eventing.keda.sh
  - Cast AI:
    - autoscaling.cast.ai

Certificate Management:
  - Cert Manager:
    - Core:
      - cert-manager.io
    - ACME:
      - acme.cert-manager.io

Monitoring & Observability:
  Victoria Metrics:
    - operator.victoriametrics.com
    - monitoring.coreos.com
  Grafana:
    - monitoring.grafana.com
  OpenTelemetry:
    - opentelemetry.io

Gateway:
  - APISIX:
    - apisix.apache.org
  - Gateway API:
    - gateway.networking.k8s.io

Data & Storage:
  - CloudNativePG:
    - postgresql.cnpg.io
  - Redis:
    - redis.redis.opstreelabs.in
  - Volume Snapshot:
    - snapshot.storage.k8s.io

Cost Management & Observability:
  - CollectorD:
    - collectord.io
  - Dynatrace:
    - dynatrace.com
  - Kubecost:
    - kubecost.com

Azure Integration:
  - AAD Pod Identity:
    - aadpodidentity.k8s.io
  - ACN:
    - acn.azure.com
  - Azure Identity:
    - azureidentity.io
  - Azure Policy:
    - azurepolicy.azure.com

Service Mesh & CNI:
  - Cilium:
    - cilium.io
  - Istio:
    - config.istio.io
    - networking.istio.io
    - security.istio.io
  - LinkerD:
    - linkerd.io
    - policy.linkerd.io
  - Service Mesh Interface:
    - split.smi-spec.io

Cluster Management:
  - Cluster API:
    - Addons:
      - addons.cluster.x-k8s.io
    - Cluster:
      - cluster.x-k8s.io
      - clusterctl.cluster.x-k8s.io
    - IPAM:
      - ipam.cluster.x-k8s.io
    - Runtime:
      - runtime.cluster.x-k8s.io
  - CSI Secrets Store:
    - secrets-store.csi.x-k8s.io

Operator Framework & Configuration:
  - External Secrets:
    - external-secrets.io
  - Kustomize Config:
    - kustomize.config.k8s.io
  - Operator Lifecycle Manager:
    - operators.coreos.com

Others:
  - ''
`;

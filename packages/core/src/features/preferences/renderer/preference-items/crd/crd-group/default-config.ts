/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

/**
 * Default configuration for CRD Groups
 * This configuration is used when the user doesn't have a custom configuration
 */
export const DEFAULT_CONFIG_YAML = `# CRD Groups Configuration
Built-in:
  - apps
  - core
  - batch
  - extensions

Cert Manager:
  - cert-manager.io

Istio:
  - istio.io
  - Networking:
    - networking.istio.io
  - Security:
    - security.istio.io

KEDA:
  - keda.sh
  - Eventing:
    - eventing.keda.sh

Knative:
  - knative.dev

Kubernetes:
  - k8s.io
  - API Extensions:
    - apiextensions.k8s.io
  - API Registration:
    - apiregistration.k8s.io
  - Autoscaling:
    - autoscaling
  - Storage:
    - storage.k8s.io

Prometheus:
  - monitoring.coreos.com

Others:
  - ""
`;

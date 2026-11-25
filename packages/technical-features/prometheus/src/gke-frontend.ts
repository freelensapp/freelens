/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

/*
 * What the GKE provider looks for, kept apart from the provider so that the cluster settings can describe it.
 */

/**
 * The kind of the provider that reads the GKE system metrics (`kubernetes.io/*`) through the PromQL API of Google
 * Cloud Managed Service for Prometheus (GMP). The API needs a Google OAuth token, so it is reached through the GMP
 * frontend, a query proxy that the cluster operator deploys as an ordinary Service.
 */
export const gkePrometheusProviderKind = "gke";

/**
 * Google's documentation of the frontend: the manifest and the IAM binding it needs.
 */
export const gmpFrontendDocumentationUrl = "https://cloud.google.com/stackdriver/docs/managed-prometheus/query-api-ui";

/**
 * The names of the Service looked up in each of `gmpFrontendNamespaces`, in this order. Every namespace is tried
 * for a name before the next name is, so the specific name wins over the generic one.
 */
export const gmpFrontendServiceNames = ["gmp-frontend", "frontend"];

export const gmpFrontendNamespaces = ["gmp-public", "gmp-system", "monitoring", "default"];

/**
 * The values of the label `app` a Service is looked up by in every namespace, in this order.
 */
export const gmpFrontendAppLabels = ["gmp-frontend", "frontend"];

/**
 * A candidate Service counts only when one of its pods runs this image, so an unrelated `frontend` is not taken for
 * Prometheus.
 */
export const gmpFrontendImage = "gke.gcr.io/prometheus-engine/frontend";

/**
 * The annotation of the frontend Service that names the GKE cluster. The system metrics are kept per project, so
 * without it the queries see every cluster of the project.
 */
export const gkeClusterNameAnnotation = "freelens.app/gke-cluster-name";

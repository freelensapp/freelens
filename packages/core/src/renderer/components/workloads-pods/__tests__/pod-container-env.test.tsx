/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { ConfigMap, Pod, Secret, SecretType } from "@freelensapp/kube-object";
import React from "react";
import { getDiForUnitTesting } from "../../../getDiForUnitTesting";
import configMapStoreInjectable from "../../config-maps/store.injectable";
import secretStoreInjectable from "../../config-secrets/store.injectable";
import { renderFor } from "../../test-utils/renderFor";
import { ContainerEnvironment } from "../pod-container-env";

import type { Container } from "@freelensapp/kube-object";

import type { ConfigMapStore } from "../../config-maps/store";
import type { SecretStore } from "../../config-secrets/store";
import type { DiRender } from "../../test-utils/renderFor";

describe("<ContainerEnv />", () => {
  let render: DiRender;
  let secretStore: jest.Mocked<Pick<SecretStore, "load" | "getByName">>;
  let configMapStore: jest.Mocked<Pick<ConfigMapStore, "load" | "getByName">>;

  beforeEach(() => {
    const di = getDiForUnitTesting();

    secretStore = {
      load: jest.fn().mockImplementation(async () => {
        return {} as Secret;
      }),
      getByName: jest.fn(),
    };
    configMapStore = {
      load: jest.fn().mockImplementation(async () => {
        return {} as ConfigMap;
      }),
      getByName: jest.fn(),
    };

    di.override(secretStoreInjectable, () => secretStore as jest.Mocked<SecretStore>);
    di.override(configMapStoreInjectable, () => configMapStore as jest.Mocked<ConfigMapStore>);

    render = renderFor(di);
  });

  it("renders env", () => {
    const container: Container = {
      image: "my-image",
      name: "my-first-container",
      env: [
        {
          name: "foobar",
          value: "https://localhost:12345",
        },
      ],
    };
    const pod = new Pod({
      apiVersion: "v1",
      kind: "Pod",
      metadata: {
        name: "my-pod",
        namespace: "default",
        resourceVersion: "1",
        selfLink: "/api/v1/pods/default/my-pod",
        uid: "1234",
      },
      spec: {
        containers: [container],
      },
    });
    const result = render(<ContainerEnvironment pod={pod} container={container} namespace={pod.getNs()} />);

    expect(result.baseElement).toMatchSnapshot();
  });

  it("renders envFrom when given a configMapRef", () => {
    configMapStore.getByName.mockImplementation((name, namespace) => {
      expect(name).toBe("my-config-map");
      expect(namespace).toBe("default");

      return new ConfigMap({
        apiVersion: "v1",
        kind: "ConfigMap",
        metadata: {
          name: "my-config-map",
          namespace: "default",
          resourceVersion: "2",
          selfLink: "/api/v1/configmaps/default/my-config-map",
          uid: "456",
        },
        data: {
          configFoo: "configBar",
        },
      });
    });

    const container: Container = {
      image: "my-image",
      name: "my-first-container",
      envFrom: [
        {
          configMapRef: {
            name: "my-config-map",
          },
        },
      ],
    };
    const pod = new Pod({
      apiVersion: "v1",
      kind: "Pod",
      metadata: {
        name: "my-pod",
        namespace: "default",
        resourceVersion: "1",
        selfLink: "/api/v1/pods/default/my-pod",
        uid: "1234",
      },
      spec: {
        containers: [container],
      },
    });
    const result = render(<ContainerEnvironment pod={pod} container={container} namespace={pod.getNs()} />);

    expect(result.baseElement).toMatchSnapshot();
  });

  it("renders envFrom when given a secretRef", () => {
    secretStore.getByName.mockImplementation((name, namespace) => {
      expect(name).toBe("my-secret");
      expect(namespace).toBe("default");

      return new Secret({
        apiVersion: "v1",
        kind: "Secret",
        metadata: {
          name: "my-secret",
          namespace: "default",
          resourceVersion: "3",
          selfLink: "/api/v1/secrets/default/my-secret",
          uid: "237",
        },
        type: SecretType.BasicAuth,
        data: {
          bar: "bat",
        },
      });
    });

    const container: Container = {
      image: "my-image",
      name: "my-first-container",
      envFrom: [
        {
          secretRef: {
            name: "my-secret",
          },
        },
      ],
    };
    const pod = new Pod({
      apiVersion: "v1",
      kind: "Pod",
      metadata: {
        name: "my-pod",
        namespace: "default",
        resourceVersion: "1",
        selfLink: "/api/v1/pods/default/my-pod",
        uid: "1234",
      },
      spec: {
        containers: [container],
      },
    });
    const result = render(<ContainerEnvironment pod={pod} container={container} namespace={pod.getNs()} />);

    expect(result.baseElement).toMatchSnapshot();
  });

  it("renders env", () => {
    const container: Container = {
      image: "my-image",
      name: "my-first-container",
      env: [
        {
          name: "foobar",
          value: "https://localhost:12345",
        },
      ],
    };
    const pod = new Pod({
      apiVersion: "v1",
      kind: "Pod",
      metadata: {
        name: "my-pod",
        namespace: "default",
        resourceVersion: "1",
        selfLink: "/api/v1/pods/default/my-pod",
        uid: "1234",
      },
      spec: {
        containers: [container],
      },
    });
    const result = render(<ContainerEnvironment pod={pod} container={container} namespace={pod.getNs()} />);

    expect(result.baseElement).toMatchSnapshot();
  });

  it("renders both env and configMapRef envFrom", () => {
    configMapStore.getByName.mockImplementation((name, namespace) => {
      expect(name).toBe("my-config-map");
      expect(namespace).toBe("default");

      return new ConfigMap({
        apiVersion: "v1",
        kind: "ConfigMap",
        metadata: {
          name: "my-config-map",
          namespace: "default",
          resourceVersion: "2",
          selfLink: "/api/v1/configmaps/default/my-config-map",
          uid: "456",
        },
        data: {
          configFoo: "configBar",
        },
      });
    });

    const container: Container = {
      image: "my-image",
      name: "my-first-container",
      envFrom: [
        {
          configMapRef: {
            name: "my-config-map",
          },
        },
      ],
      env: [
        {
          name: "foobar",
          value: "https://localhost:12345",
        },
      ],
    };
    const pod = new Pod({
      apiVersion: "v1",
      kind: "Pod",
      metadata: {
        name: "my-pod",
        namespace: "default",
        resourceVersion: "1",
        selfLink: "/api/v1/pods/default/my-pod",
        uid: "1234",
      },
      spec: {
        containers: [container],
      },
    });
    const result = render(<ContainerEnvironment pod={pod} container={container} namespace={pod.getNs()} />);

    expect(result.baseElement).toMatchSnapshot();
  });

  it("renders env from fieldRef", () => {
    const container: Container = {
      image: "my-image",
      name: "my-first-container",
      env: [
        {
          name: "metadata_name",
          valueFrom: {
            fieldRef: {
              fieldPath: "metadata.name",
            },
          },
        },
        {
          name: "metadata_namespace",
          valueFrom: {
            fieldRef: {
              fieldPath: "metadata.namespace",
            },
          },
        },
        {
          name: "metadata_uid",
          valueFrom: {
            fieldRef: {
              fieldPath: "metadata.uid",
            },
          },
        },
        {
          name: "metadata_annotations_1",
          valueFrom: {
            fieldRef: {
              fieldPath: "metadata.annotations['my-annotation-key']",
            },
          },
        },
        {
          name: "metadata_labels_1",
          valueFrom: {
            fieldRef: {
              fieldPath: "metadata.labels['app']",
            },
          },
        },
        {
          name: "spec_service_account_name",
          valueFrom: {
            fieldRef: {
              fieldPath: "spec.serviceAccountName",
            },
          },
        },
        {
          name: "spec_node_name",
          valueFrom: {
            fieldRef: {
              fieldPath: "spec.nodeName",
            },
          },
        },
        {
          name: "status_host_ip",
          valueFrom: {
            fieldRef: {
              fieldPath: "status.hostIP",
            },
          },
        },
        {
          name: "status_host_ips",
          valueFrom: {
            fieldRef: {
              fieldPath: "status.hostIPs",
            },
          },
        },
        {
          name: "status_pod_ip",
          valueFrom: {
            fieldRef: {
              fieldPath: "status.podIP",
            },
          },
        },
        {
          name: "status_pod_ips",
          valueFrom: {
            fieldRef: {
              fieldPath: "status.podIPs",
            },
          },
        },
        {
          name: "incorrect_field",
          valueFrom: {
            fieldRef: {
              fieldPath: "status",
            },
          },
        },
        {
          name: "missing_field",
          valueFrom: {
            fieldRef: {
              fieldPath: "status.missing",
            },
          },
        },
        {
          name: "missing_annotation",
          valueFrom: {
            fieldRef: {
              fieldPath: "metadata.annotations['missing']",
            },
          },
        },
        {
          name: "missing_label",
          valueFrom: {
            fieldRef: {
              fieldPath: "metadata.labels['missing']",
            },
          },
        },
      ],
    };
    const pod = new Pod({
      apiVersion: "v1",
      kind: "Pod",
      metadata: {
        name: "my-pod",
        namespace: "default",
        resourceVersion: "1",
        selfLink: "/api/v1/pods/default/my-pod",
        uid: "1234",
        labels: {
          app: "my-app",
        },
        annotations: {
          "my-annotation-key": "my-annotation-value",
        },
      },
      spec: {
        serviceAccountName: "my-service-account",
        nodeName: "my-node",
        containers: [container],
      },
      status: {
        phase: "Running",
        conditions: [],
        startTime: "2024-01-01T00:00:00Z",
        hostIP: "1.2.3.4",
        hostIPs: [
          {
            ip: "1.2.3.4",
          },
          {
            ip: "5.6.7.8",
          },
        ],
        podIP: "2.3.4.5",
        podIPs: [
          {
            ip: "2.3.4.5",
          },
          {
            ip: "6.7.8.9",
          },
        ],
      },
    });
    const result = render(<ContainerEnvironment pod={pod} container={container} namespace={pod.getNs()} />);

    expect(result.baseElement).toMatchSnapshot();
  });

  it("renders env from resourceFieldRef", () => {
    const container: Container = {
      image: "my-image",
      name: "my-first-container",
      resources: {
        limits: {
          cpu: "4",
          memory: "8192",
        },
        requests: {
          cpu: "2",
          memory: "4096",
        },
      },
      env: [
        {
          name: "limits_cpu",
          valueFrom: {
            resourceFieldRef: {
              resource: "limits.cpu",
            },
          },
        },
        {
          name: "limits_cpu_divided",
          valueFrom: {
            resourceFieldRef: {
              resource: "limits.cpu",
              divisor: "2",
            },
          },
        },
        {
          name: "limits_cpu_container_1",
          valueFrom: {
            resourceFieldRef: {
              containerName: "my-first-container",
              resource: "limits.cpu",
            },
          },
        },
        {
          name: "limits_cpu_container_2",
          valueFrom: {
            resourceFieldRef: {
              containerName: "my-second-container",
              resource: "limits.cpu",
            },
          },
        },
        {
          name: "limits_cpu_container_missing",
          valueFrom: {
            resourceFieldRef: {
              containerName: "missing",
              resource: "limits.cpu",
            },
          },
        },
        {
          name: "limits_cpu_container_missing_divided",
          valueFrom: {
            resourceFieldRef: {
              containerName: "missing",
              resource: "limits.cpu",
              divisor: "2",
            },
          },
        },
        {
          name: "limits_memory",
          valueFrom: {
            resourceFieldRef: {
              resource: "limits.memory",
            },
          },
        },
        {
          name: "requests_cpu",
          valueFrom: {
            resourceFieldRef: {
              resource: "requests.cpu",
            },
          },
        },
        {
          name: "requests_memory",
          valueFrom: {
            resourceFieldRef: {
              resource: "requests.memory",
            },
          },
        },
      ],
    };
    const container2: Container = {
      image: "my-image",
      name: "my-second-container",
      resources: {
        requests: {
          cpu: "500m",
          memory: "128Mi",
        },
        limits: {
          cpu: "1.5",
          memory: "2Gi",
        },
      },
      env: [
        {
          name: "limits_cpu",
          valueFrom: {
            resourceFieldRef: {
              resource: "limits.cpu",
            },
          },
        },
        {
          name: "limits_cpu_divided",
          valueFrom: {
            resourceFieldRef: {
              resource: "limits.cpu",
              divisor: "2",
            },
          },
        },
        {
          name: "limits_cpu_container_1",
          valueFrom: {
            resourceFieldRef: {
              containerName: "my-first-container",
              resource: "limits.cpu",
            },
          },
        },
        {
          name: "limits_cpu_container_2",
          valueFrom: {
            resourceFieldRef: {
              containerName: "my-second-container",
              resource: "limits.cpu",
            },
          },
        },
        {
          name: "limits_cpu_container_missing",
          valueFrom: {
            resourceFieldRef: {
              containerName: "missing",
              resource: "limits.cpu",
            },
          },
        },
        {
          name: "limits_memory",
          valueFrom: {
            resourceFieldRef: {
              resource: "limits.memory",
            },
          },
        },
        {
          name: "requests_cpu",
          valueFrom: {
            resourceFieldRef: {
              resource: "requests.cpu",
            },
          },
        },
        {
          name: "requests_memory",
          valueFrom: {
            resourceFieldRef: {
              resource: "requests.memory",
            },
          },
        },
      ],
    };
    const pod = new Pod({
      apiVersion: "v1",
      kind: "Pod",
      metadata: {
        name: "my-pod",
        namespace: "default",
        resourceVersion: "1",
        selfLink: "/api/v1/pods/default/my-pod",
        uid: "1234",
      },
      spec: {
        containers: [container, container2],
      },
    });
    const result = render(<ContainerEnvironment pod={pod} container={container} namespace={pod.getNs()} />);
    const result2 = render(<ContainerEnvironment pod={pod} container={container2} namespace={pod.getNs()} />);

    expect(result.baseElement).toMatchSnapshot();
    expect(result2.baseElement).toMatchSnapshot();
  });
});

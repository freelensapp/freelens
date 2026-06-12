/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Pod } from "@freelensapp/kube-object";
import { render } from "@testing-library/react";
import React from "react";
import { Projected } from "./projected";

import type { ProjectedSource } from "@freelensapp/kube-object";

describe("<Projected />", () => {
  it("renders", () => {
    const projectedVolume: ProjectedSource = {};
    const projectedVolumeName = "my-projected";
    const pod = new Pod({
      apiVersion: "v1",
      kind: "Pod",
      metadata: {
        name: "my-pod",
        namespace: "default",
        resourceVersion: "1",
        uid: "123",
        selfLink: "/api/v1/pod/default/my-pod",
      },
      spec: {
        volumes: [
          {
            name: projectedVolumeName,
            projected: projectedVolume,
          },
        ],
      },
    });
    const result = render(<Projected pod={pod} volumeName={projectedVolumeName} variant={projectedVolume} />);

    expect(result.baseElement).toMatchSnapshot();
  });

  it("renders default mount mode in octal when provided", () => {
    const projectedVolume: ProjectedSource = {
      defaultMode: 0o777,
      sources: [],
    };
    const projectedVolumeName = "my-projected";
    const pod = new Pod({
      apiVersion: "v1",
      kind: "Pod",
      metadata: {
        name: "my-pod",
        namespace: "default",
        resourceVersion: "1",
        uid: "123",
        selfLink: "/api/v1/pod/default/my-pod",
      },
      spec: {
        volumes: [
          {
            name: projectedVolumeName,
            projected: projectedVolume,
          },
        ],
      },
    });
    const result = render(<Projected pod={pod} volumeName={projectedVolumeName} variant={projectedVolume} />);

    expect(result.baseElement).toMatchSnapshot();
  });

  it("renders when no sources array provided", () => {
    const projectedVolume: ProjectedSource = {
      defaultMode: 0o777,
    };
    const projectedVolumeName = "my-projected";
    const pod = new Pod({
      apiVersion: "v1",
      kind: "Pod",
      metadata: {
        name: "my-pod",
        namespace: "default",
        resourceVersion: "1",
        uid: "123",
        selfLink: "/api/v1/pod/default/my-pod",
      },
      spec: {
        volumes: [
          {
            name: projectedVolumeName,
            projected: projectedVolume,
          },
        ],
      },
    });
    const result = render(<Projected pod={pod} volumeName={projectedVolumeName} variant={projectedVolume} />);

    expect(result.baseElement).toMatchSnapshot();
  });

  it("renders a secret source, when provided", () => {
    const projectedVolume: ProjectedSource = {
      defaultMode: 0o777,
      sources: [
        {
          secret: {
            name: "my-projected-secret",
            items: [
              {
                key: "foo",
                path: "/bar",
              },
            ],
          },
        },
      ],
    };
    const projectedVolumeName = "my-projected";
    const pod = new Pod({
      apiVersion: "v1",
      kind: "Pod",
      metadata: {
        name: "my-pod",
        namespace: "default",
        resourceVersion: "1",
        uid: "123",
        selfLink: "/api/v1/pod/default/my-pod",
      },
      spec: {
        volumes: [
          {
            name: projectedVolumeName,
            projected: projectedVolume,
          },
        ],
      },
    });
    const result = render(<Projected pod={pod} volumeName={projectedVolumeName} variant={projectedVolume} />);

    expect(result.baseElement).toMatchSnapshot();
    expect(result.getByText("foo⇢/bar", { exact: false })).toBeTruthy();
  });

  it("renders a secret source including overriding mode", () => {
    const projectedVolume: ProjectedSource = {
      defaultMode: 0o777,
      sources: [
        {
          secret: {
            name: "my-projected-secret",
            items: [
              {
                key: "foo",
                path: "/bar",
                mode: 0o666,
              },
            ],
          },
        },
      ],
    };
    const projectedVolumeName = "my-projected";
    const pod = new Pod({
      apiVersion: "v1",
      kind: "Pod",
      metadata: {
        name: "my-pod",
        namespace: "default",
        resourceVersion: "1",
        uid: "123",
        selfLink: "/api/v1/pod/default/my-pod",
      },
      spec: {
        volumes: [
          {
            name: projectedVolumeName,
            projected: projectedVolume,
          },
        ],
      },
    });
    const result = render(<Projected pod={pod} volumeName={projectedVolumeName} variant={projectedVolume} />);

    expect(result.baseElement).toMatchSnapshot();
    expect(result.getByText("(0o666)", { exact: false })).toBeTruthy();
  });
});

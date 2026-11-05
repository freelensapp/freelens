/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import EventEmitter from "node:events";
import { ObservableMap } from "mobx";
import { beforeEach, describe, expect, it, vi } from "vitest";
import createReadFileStreamInjectable from "../../../common/fs/create-read-file-stream.injectable";
import { getDiForUnitTesting } from "../../getDiForUnitTesting";
import computeKubeconfigDiffInjectable from "./compute-diff.injectable";
import diffChangedKubeconfigInjectable from "./diff-changed-kubeconfig.injectable";
import type { ReadStream, Stats } from "node:fs";

import type { Mock } from "vitest";

import type { DiffChangedKubeconfig } from "./diff-changed-kubeconfig.injectable";

const kubeconfig = `apiVersion: v1
kind: Config
clusters:
  - name: some-cluster
    cluster:
      server: https://some.example.test:6443
contexts:
  - name: some-context
    context:
      cluster: some-cluster
      user: some-user
current-context: some-context
users:
  - name: some-user
    user:
      token: some-token
`;

describe("diffChangedKubeconfig", () => {
  let diffChangedKubeconfig: DiffChangedKubeconfig;
  let computeKubeconfigDiffMock: Mock;
  let readStream: ReadStream;

  beforeEach(() => {
    const di = getDiForUnitTesting();

    computeKubeconfigDiffMock = vi.fn();
    di.override(computeKubeconfigDiffInjectable, () => computeKubeconfigDiffMock);
    di.override(
      createReadFileStreamInjectable,
      () => () =>
        (readStream = Object.assign(new EventEmitter(), {
          close: () => {},
          push: () => true,
          read: () => {},
        }) as unknown as ReadStream),
    );

    diffChangedKubeconfig = di.inject(diffChangedKubeconfigInjectable);
  });

  const read = (...chunks: Buffer[]) => {
    diffChangedKubeconfig({
      filePath: "/some/kubeconfig",
      source: new ObservableMap(),
      stats: { size: 1000 } as Stats,
      maxAllowedFileReadSize: 10_000,
    });

    for (const chunk of chunks) {
      readStream.emit("data", chunk);
    }

    readStream.emit("end");
  };

  it.each([
    ["UTF-8", Buffer.from(kubeconfig, "utf-8")],
    ["UTF-8 with a byte order mark", Buffer.from(`﻿${kubeconfig}`, "utf-8")],
    ["UTF-16 LE with a byte order mark", Buffer.from(`﻿${kubeconfig}`, "utf16le")],
    ["UTF-16 BE with a byte order mark", Buffer.from(`﻿${kubeconfig}`, "utf16le").swap16()],
  ])("reads a file in %s", (_, contents) => {
    read(contents);

    expect(computeKubeconfigDiffMock).toHaveBeenCalledWith(kubeconfig, expect.anything(), "/some/kubeconfig");
  });

  it("reads a file in UTF-16 LE split inside a character", () => {
    const contents = Buffer.from(`﻿${kubeconfig}`, "utf16le");

    read(contents.subarray(0, 11), contents.subarray(11));

    expect(computeKubeconfigDiffMock).toHaveBeenCalledWith(kubeconfig, expect.anything(), "/some/kubeconfig");
  });

  it("skips a file that is not valid UTF-8", () => {
    read(Buffer.from([0x61, 0xc3, 0x28]));

    expect(computeKubeconfigDiffMock).not.toHaveBeenCalled();
  });
});

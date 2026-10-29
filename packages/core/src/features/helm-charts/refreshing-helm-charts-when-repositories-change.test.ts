/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { showSuccessNotificationInjectable } from "@freelensapp/notifications";
import { asyncFn } from "@freelensapp/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import directoryForLensLocalStorageInjectable from "../../common/directory-for-lens-local-storage/directory-for-lens-local-storage.injectable";
import execFileInjectable from "../../common/fs/exec-file.injectable";
import { HelmChart } from "../../common/k8s-api/endpoints/helm-charts.api";
import requestHelmChartsInjectable from "../../common/k8s-api/endpoints/helm-charts.api/request-charts.injectable";
import helmBinaryPathInjectable from "../../main/helm/helm-binary-path.injectable";
import { getApplicationBuilder } from "../../renderer/components/test-utils/get-application-builder";
import addHelmRepositoryInjectable from "./child-features/preferences/renderer/adding-of-public-helm-repository/select-helm-repository/add-helm-repository.injectable";
import removeHelmRepositoryInjectable from "./child-features/preferences/renderer/remove-helm-repository.injectable";

import type { AsyncFnMock } from "@freelensapp/test-utils";

import type { RenderResult } from "@testing-library/react";

import type { ExecFile } from "../../common/fs/exec-file.injectable";
import type { HelmRepo } from "../../common/helm/helm-repo";
import type { RequestHelmCharts } from "../../common/k8s-api/endpoints/helm-charts.api/request-charts.injectable";
import type { ApplicationBuilder } from "../../renderer/components/test-utils/get-application-builder";

const createChart = (name: string, repo: string) =>
  HelmChart.create({
    apiVersion: "some-api-version",
    name,
    version: "1.0.0",
    repo,
    created: "2015-10-21T07:28:00Z",
    description: "some-description",
    keywords: [],
    sources: [],
    urls: [],
    annotations: {},
    dependencies: [],
    maintainers: [],
    deprecated: false,
  });

const someRepository: HelmRepo = {
  name: "some-repository",
  url: "some-url",
  cacheFilePath: "/some-cache-file",
};

describe("refreshing helm charts when helm repositories change", () => {
  let builder: ApplicationBuilder;
  let rendered: RenderResult;
  let requestHelmChartsMock: AsyncFnMock<RequestHelmCharts>;
  let execFileMock: AsyncFnMock<ExecFile>;

  beforeEach(async () => {
    builder = getApplicationBuilder();

    requestHelmChartsMock = asyncFn();
    execFileMock = asyncFn();

    builder.beforeApplicationStart(({ mainDi }) => {
      mainDi.override(execFileInjectable, () => execFileMock as unknown as ExecFile);
      mainDi.override(helmBinaryPathInjectable, () => "some-helm-binary-path");
    });

    builder.beforeWindowStart(({ windowDi }) => {
      windowDi.override(directoryForLensLocalStorageInjectable, () => "/some-directory-for-lens-local-storage");
      windowDi.override(requestHelmChartsInjectable, () => requestHelmChartsMock);
      windowDi.override(showSuccessNotificationInjectable, () => vi.fn());
    });

    builder.setEnvironmentToClusterFrame();

    rendered = await builder.render();

    builder.helmCharts.navigate();

    await requestHelmChartsMock.resolve([createChart("some-chart", "some-other-repository")]);

    requestHelmChartsMock.mockClear();
  });

  it("shows the charts of the existing repositories", () => {
    expect(rendered.queryAllByText("some-chart")).not.toHaveLength(0);
  });

  // In the application Preferences live in the root frame and Helm > Charts in a cluster frame, so the
  // repository change has to reach the cluster frame through main.
  describe("when a helm repository is added", () => {
    beforeEach(() => {
      const addHelmRepository = builder.applicationWindow.only.di.inject(addHelmRepositoryInjectable);

      void addHelmRepository(someRepository);
    });

    it("does not request the charts again before the repository is added", () => {
      expect(requestHelmChartsMock).not.toHaveBeenCalled();
    });

    describe("when adding the repository fails", () => {
      beforeEach(async () => {
        await execFileMock.resolveSpecific(["some-helm-binary-path", ["repo", "add", "some-repository", "some-url"]], {
          callWasSuccessful: false,
          error: Object.assign(new Error("some-error"), { stderr: "some-error" }),
        });
      });

      it("does not request the charts again", () => {
        expect(requestHelmChartsMock).not.toHaveBeenCalled();
      });
    });

    describe("when adding the repository succeeds", () => {
      beforeEach(async () => {
        await execFileMock.resolveSpecific(["some-helm-binary-path", ["repo", "add", "some-repository", "some-url"]], {
          callWasSuccessful: true,
          response: "",
        });
      });

      it("requests the charts again", () => {
        expect(requestHelmChartsMock).toHaveBeenCalled();
      });

      describe("when the charts resolve", () => {
        beforeEach(async () => {
          await requestHelmChartsMock.resolve([
            createChart("some-chart", "some-other-repository"),
            createChart("some-added-chart", "some-repository"),
          ]);
        });

        it("shows the charts of the added repository", () => {
          expect(rendered.queryAllByText("some-added-chart")).not.toHaveLength(0);
        });
      });
    });
  });

  describe("when a helm repository is removed", () => {
    beforeEach(() => {
      const removeHelmRepository = builder.applicationWindow.only.di.inject(removeHelmRepositoryInjectable);

      void removeHelmRepository({ ...someRepository, name: "some-other-repository" });
    });

    it("does not request the charts again before the repository is removed", () => {
      expect(requestHelmChartsMock).not.toHaveBeenCalled();
    });

    describe("when removing the repository succeeds", () => {
      beforeEach(async () => {
        await execFileMock.resolveSpecific(["some-helm-binary-path", ["repo", "remove", "some-other-repository"]], {
          callWasSuccessful: true,
          response: "",
        });
      });

      it("requests the charts again", () => {
        expect(requestHelmChartsMock).toHaveBeenCalled();
      });

      describe("when the charts resolve", () => {
        beforeEach(async () => {
          await requestHelmChartsMock.resolve([]);
        });

        it("no longer shows the charts of the removed repository", () => {
          expect(rendered.queryAllByText("some-chart")).toHaveLength(0);
        });
      });
    });
  });
});

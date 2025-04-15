/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { AsyncFnMock } from "@async-fn/jest";
import asyncFn from "@async-fn/jest";
import { flushPromises } from "@freelensapp/test-utils";
import type { RenderResult } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import directoryForLensLocalStorageInjectable from "../../../common/directory-for-lens-local-storage/directory-for-lens-local-storage.injectable";
import { HelmChart } from "../../../common/k8s-api/endpoints/helm-charts.api";
import type { RequestHelmCharts } from "../../../common/k8s-api/endpoints/helm-charts.api/request-charts.injectable";
import requestHelmChartsInjectable from "../../../common/k8s-api/endpoints/helm-charts.api/request-charts.injectable";
import type { RequestHelmChartReadme } from "../../../common/k8s-api/endpoints/helm-charts.api/request-readme.injectable";
import requestHelmChartReadmeInjectable from "../../../common/k8s-api/endpoints/helm-charts.api/request-readme.injectable";
import requestHelmChartValuesInjectable from "../../../common/k8s-api/endpoints/helm-charts.api/request-values.injectable";
import type { RequestHelmChartVersions } from "../../../common/k8s-api/endpoints/helm-charts.api/request-versions.injectable";
import requestHelmChartVersionsInjectable from "../../../common/k8s-api/endpoints/helm-charts.api/request-versions.injectable";
import requestCreateHelmReleaseInjectable from "../../../common/k8s-api/endpoints/helm-releases.api/request-create.injectable";
import hostedClusterIdInjectable from "../../../renderer/cluster-frame-context/hosted-cluster-id.injectable";
import dockStoreInjectable from "../../../renderer/components/dock/dock/store.injectable";
import getRandomInstallChartTabIdInjectable from "../../../renderer/components/dock/install-chart/get-random-install-chart-tab-id.injectable";
import type { ApplicationBuilder } from "../../../renderer/components/test-utils/get-application-builder";
import { getApplicationBuilder } from "../../../renderer/components/test-utils/get-application-builder";

describe("opening dock tab for installing helm chart", () => {
  let builder: ApplicationBuilder;
  let requestHelmChartsMock: AsyncFnMock<RequestHelmCharts>;
  let requestHelmChartVersionsMock: AsyncFnMock<RequestHelmChartVersions>;
  let requestHelmChartReadmeMock: AsyncFnMock<RequestHelmChartReadme>;
  let requestHelmChartValuesMock: jest.Mock;

  beforeEach(() => {
    builder = getApplicationBuilder(userEvent.setup({ delay: null }));

    requestHelmChartsMock = asyncFn();
    requestHelmChartVersionsMock = asyncFn();
    requestHelmChartReadmeMock = asyncFn();
    requestHelmChartValuesMock = jest.fn();

    builder.beforeWindowStart(({ windowDi }) => {
      windowDi.override(directoryForLensLocalStorageInjectable, () => "/some-directory-for-lens-local-storage");
      windowDi.override(hostedClusterIdInjectable, () => "some-cluster-id");
      windowDi.override(requestHelmChartsInjectable, () => requestHelmChartsMock);
      windowDi.override(requestHelmChartVersionsInjectable, () => requestHelmChartVersionsMock);
      windowDi.override(requestHelmChartReadmeInjectable, () => requestHelmChartReadmeMock);
      windowDi.override(requestHelmChartValuesInjectable, () => requestHelmChartValuesMock);
      windowDi.override(requestCreateHelmReleaseInjectable, () => jest.fn());
      windowDi.override(getRandomInstallChartTabIdInjectable, () =>
        jest.fn(() => "some-irrelevant-tab-id").mockReturnValueOnce("some-tab-id"),
      );
    });

    builder.setEnvironmentToClusterFrame();
  });

  describe("given application is started, when navigating to helm charts", () => {
    let rendered: RenderResult;

    beforeEach(async () => {
      rendered = await builder.render();

      builder.helmCharts.navigate();

      const windowDi = builder.applicationWindow.only.di;

      const dockStore = windowDi.inject(dockStoreInjectable);

      // TODO: Make TerminalWindow unit testable to allow realistic behaviour
      dockStore.closeTab("terminal");
    });

    it("renders", () => {
      expect(rendered.baseElement).toMatchSnapshot();
    });

    it("calls for charts", () => {
      expect(requestHelmChartsMock).toHaveBeenCalled();
    });

    describe("when charts resolve", () => {
      beforeEach(async () => {
        await requestHelmChartsMock.resolve([
          HelmChart.create({
            apiVersion: "some-api-version",
            name: "some-name",
            version: "some-version",
            repo: "some-repository",
            created: "2015-10-21T07:28:00Z",
            description: "some-description",
            keywords: [],
            sources: [],
            urls: [],
            annotations: {},
            dependencies: [],
            maintainers: [
              {
                email: "some@foo.com",
                name: "Some Foo",
              },
            ],
            deprecated: false,
          }),

          HelmChart.create({
            apiVersion: "some-api-version",
            name: "some-other-name",
            version: "some-version",
            repo: "some-repository",
            created: "2015-10-21T07:28:00Z",
            description: "some-description",
            keywords: [],
            sources: [],
            urls: [],
            annotations: {},
            dependencies: [],
            maintainers: [
              {
                email: "other@bar.com",
                name: "Other Bar",
              },
            ],
            deprecated: false,
          }),
        ]);
      });

      it("renders", () => {
        expect(rendered.baseElement).toMatchSnapshot();
      });

      describe("when opening details of a chart", () => {
        beforeEach(() => {
          const row = rendered.getByTestId("helm-chart-row-for-some-repository-some-name");

          fireEvent.click(row);
        });

        it("renders", () => {
          expect(rendered.baseElement).toMatchSnapshot();
        });

        it("calls for chart versions", () => {
          expect(requestHelmChartVersionsMock).toHaveBeenCalledWith("some-repository", "some-name");
        });

        it("shows spinner", () => {
          expect(rendered.getByTestId("spinner-for-chart-details")).toBeInTheDocument();
        });

        describe("when chart versions resolve", () => {
          beforeEach(async () => {
            await requestHelmChartVersionsMock.resolve([
              HelmChart.create({
                apiVersion: "some-api-version",
                name: "some-name",
                version: "some-version",
                repo: "some-repository",
                created: "2015-10-21T07:28:00Z",
                description: "some-description",
                keywords: [],
                sources: [],
                urls: [],
                annotations: {},
                dependencies: [],
                maintainers: [
                  {
                    email: "some@foo.com",
                    name: "Some Foo",
                  },
                ],
                deprecated: false,
              }),

              HelmChart.create({
                apiVersion: "some-api-version",
                name: "some-name",
                version: "some-other-version",
                repo: "some-repository",
                created: "2015-10-21T07:28:00Z",
                description: "some-description",
                keywords: [],
                sources: [],
                urls: [],
                annotations: {},
                dependencies: [],
                maintainers: [
                  {
                    email: "other@bar.com",
                    name: "Other Bar",
                  },
                ],
                deprecated: false,
              }),
            ]);
          });

          it("calls for chart readme for the version", () => {
            expect(requestHelmChartReadmeMock).toHaveBeenCalledWith("some-repository", "some-name", "some-version");
          });

          it("has the latest version as selected", () => {
            const actual = builder.select.getValue("helm-chart-version-selector-some-repository-some-name");

            expect(actual).toBe("some-version");
          });

          it("renders", () => {
            expect(rendered.baseElement).toMatchSnapshot();
          });

          it("does not shows spinner for details", () => {
            expect(rendered.queryByTestId("spinner-for-chart-details")).not.toBeInTheDocument();
          });

          it("shows spinner for readme", () => {
            expect(rendered.getByTestId("spinner-for-chart-readme")).toBeInTheDocument();
          });

          describe("when readme resolves", () => {
            beforeEach(async () => {
              await requestHelmChartReadmeMock.resolve({
                callWasSuccessful: true,
                response: "some-readme",
              });
            });

            it("renders", () => {
              expect(rendered.baseElement).toMatchSnapshot();
            });

            it("does not show spinner anymore", () => {
              expect(rendered.queryByTestId("spinner-for-chart-readme")).not.toBeInTheDocument();
            });

            describe("when selecting different version", () => {
              beforeEach(async () => {
                requestHelmChartReadmeMock.mockClear();

                await builder.select
                  .openMenu("helm-chart-version-selector-some-repository-some-name")
                  .selectOption("some-other-version");
              });

              it("renders", () => {
                expect(rendered.baseElement).toMatchSnapshot();
              });

              it("selects the version", () => {
                const actual = builder.select.getValue("helm-chart-version-selector-some-repository-some-name");

                expect(actual).toBe("some-other-version");
              });

              it("calls for chart readme for the version", () => {
                expect(requestHelmChartReadmeMock).toHaveBeenCalledWith(
                  "some-repository",
                  "some-name",
                  "some-other-version",
                );
              });

              describe("when readme resolves", () => {
                beforeEach(async () => {
                  await requestHelmChartReadmeMock.resolve({
                    callWasSuccessful: true,
                    response: "some-readme",
                  });
                });

                it("renders", () => {
                  expect(rendered.baseElement).toMatchSnapshot();
                });

                it("when selecting to install chart, calls for the default configuration of the chart with specific version", async () => {
                  const installButton = rendered.getByTestId("install-chart-for-some-repository-some-name");

                  fireEvent.click(installButton);

                  await flushPromises();

                  expect(requestHelmChartValuesMock).toHaveBeenCalledWith(
                    "some-repository",
                    "some-name",
                    "some-other-version",
                  );
                });
              });

              describe("when readme rejects", () => {
                beforeEach(async () => {
                  await requestHelmChartReadmeMock.resolve({
                    callWasSuccessful: false,
                    error: "some-error",
                  });
                });

                it("renders", () => {
                  expect(rendered.baseElement).toMatchSnapshot();
                });
              });
            });

            describe("when selecting to install the chart", () => {
              beforeEach(() => {
                requestHelmChartVersionsMock.mockClear();

                const installButton = rendered.getByTestId("install-chart-for-some-repository-some-name");

                fireEvent.click(installButton);
              });

              it("renders", () => {
                expect(rendered.baseElement).toMatchSnapshot();
              });

              it("has the dock tab for installing chart", () => {
                expect(rendered.getByTestId("dock-tab-for-some-tab-id")).toBeInTheDocument();
              });

              it("shows dock tab for installing chart", () => {
                expect(rendered.getByTestId("dock-tab-content-for-some-tab-id")).toBeInTheDocument();
              });
            });
          });
        });
      });
    });
  });
});

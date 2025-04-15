/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { AsyncFnMock } from "@async-fn/jest";
import asyncFn from "@async-fn/jest";
import { flushPromises } from "@freelensapp/test-utils";
import type { DiContainer } from "@ogre-tools/injectable";
import type { RenderResult } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import directoryForLensLocalStorageInjectable from "../../../common/directory-for-lens-local-storage/directory-for-lens-local-storage.injectable";
import readJsonFileInjectable from "../../../common/fs/read-json-file.injectable";
import writeJsonFileInjectable from "../../../common/fs/write-json-file.injectable";
import { HelmChart } from "../../../common/k8s-api/endpoints/helm-charts.api";
import type { RequestHelmCharts } from "../../../common/k8s-api/endpoints/helm-charts.api/request-charts.injectable";
import requestHelmChartsInjectable from "../../../common/k8s-api/endpoints/helm-charts.api/request-charts.injectable";
import type { RequestHelmChartReadme } from "../../../common/k8s-api/endpoints/helm-charts.api/request-readme.injectable";
import requestHelmChartReadmeInjectable from "../../../common/k8s-api/endpoints/helm-charts.api/request-readme.injectable";
import type { RequestHelmChartValues } from "../../../common/k8s-api/endpoints/helm-charts.api/request-values.injectable";
import requestHelmChartValuesInjectable from "../../../common/k8s-api/endpoints/helm-charts.api/request-values.injectable";
import type { RequestHelmChartVersions } from "../../../common/k8s-api/endpoints/helm-charts.api/request-versions.injectable";
import requestHelmChartVersionsInjectable from "../../../common/k8s-api/endpoints/helm-charts.api/request-versions.injectable";
import type { RequestCreateHelmRelease } from "../../../common/k8s-api/endpoints/helm-releases.api/request-create.injectable";
import requestCreateHelmReleaseInjectable from "../../../common/k8s-api/endpoints/helm-releases.api/request-create.injectable";
import type { ListClusterHelmReleases } from "../../../main/helm/helm-service/list-helm-releases.injectable";
import listClusterHelmReleasesInjectable from "../../../main/helm/helm-service/list-helm-releases.injectable";
import dockStoreInjectable from "../../../renderer/components/dock/dock/store.injectable";
import getRandomInstallChartTabIdInjectable from "../../../renderer/components/dock/install-chart/get-random-install-chart-tab-id.injectable";
import type { RequestDetailedHelmRelease } from "../../../renderer/components/helm-releases/release-details/release-details-model/request-detailed-helm-release.injectable";
import requestDetailedHelmReleaseInjectable from "../../../renderer/components/helm-releases/release-details/release-details-model/request-detailed-helm-release.injectable";
import type { ApplicationBuilder } from "../../../renderer/components/test-utils/get-application-builder";
import { getApplicationBuilder } from "../../../renderer/components/test-utils/get-application-builder";
import currentPathInjectable from "../../../renderer/routes/current-path.injectable";

describe("installing helm chart from new tab", () => {
  let builder: ApplicationBuilder;
  let requestDetailedHelmReleaseMock: AsyncFnMock<RequestDetailedHelmRelease>;
  let requestHelmChartsMock: AsyncFnMock<RequestHelmCharts>;
  let requestHelmChartVersionsMock: AsyncFnMock<RequestHelmChartVersions>;
  let requestHelmChartReadmeMock: AsyncFnMock<RequestHelmChartReadme>;
  let requestHelmChartValuesMock: AsyncFnMock<RequestHelmChartValues>;
  let requestCreateHelmReleaseMock: AsyncFnMock<RequestCreateHelmRelease>;
  let listClusterHelmReleasesMock: AsyncFnMock<ListClusterHelmReleases>;

  beforeEach(() => {
    builder = getApplicationBuilder(userEvent.setup({ delay: null }));

    builder.setEnvironmentToClusterFrame();

    requestDetailedHelmReleaseMock = asyncFn();
    requestHelmChartsMock = asyncFn();
    requestHelmChartVersionsMock = asyncFn();
    requestHelmChartReadmeMock = asyncFn();
    requestHelmChartValuesMock = asyncFn();
    requestCreateHelmReleaseMock = asyncFn();

    builder.beforeWindowStart(({ windowDi }) => {
      windowDi.override(directoryForLensLocalStorageInjectable, () => "/some-directory-for-lens-local-storage");
      windowDi.override(requestDetailedHelmReleaseInjectable, () => requestDetailedHelmReleaseMock);
      windowDi.override(requestHelmChartsInjectable, () => requestHelmChartsMock);
      windowDi.override(requestHelmChartVersionsInjectable, () => requestHelmChartVersionsMock);
      windowDi.override(requestHelmChartReadmeInjectable, () => requestHelmChartReadmeMock);
      windowDi.override(requestHelmChartValuesInjectable, () => requestHelmChartValuesMock);
      windowDi.override(requestCreateHelmReleaseInjectable, () => requestCreateHelmReleaseMock);

      windowDi.override(getRandomInstallChartTabIdInjectable, () =>
        jest
          .fn(() => "some-irrelevant-tab-id")
          .mockReturnValueOnce("some-first-tab-id")
          .mockReturnValueOnce("some-second-tab-id"),
      );
    });

    builder.beforeApplicationStart(({ mainDi }) => {
      listClusterHelmReleasesMock = asyncFn();
      mainDi.override(listClusterHelmReleasesInjectable, () => listClusterHelmReleasesMock);
    });

    builder.namespaces.add("default");
    builder.namespaces.add("some-other-namespace");
  });

  describe("given tab for installing chart was not previously opened and application is started", () => {
    let rendered: RenderResult;
    let windowDi: DiContainer;

    beforeEach(async () => {
      rendered = await builder.render();

      windowDi = builder.applicationWindow.only.di;

      const writeJsonFile = windowDi.inject(writeJsonFileInjectable);

      await writeJsonFile("/some-directory-for-lens-local-storage/some-cluster-id.json", {
        dock: {
          height: 300,
          tabs: [],
          isOpen: false,
        },
      });

      const dockStore = windowDi.inject(dockStoreInjectable);

      // TODO: Make TerminalWindow unit testable to allow realistic behaviour
      dockStore.closeTab("terminal");
    });

    it("renders", () => {
      expect(rendered.baseElement).toMatchSnapshot();
    });

    describe("when navigating to helm charts", () => {
      beforeEach(async () => {
        builder.helmCharts.navigate({
          chartName: "some-name",
          repo: "some-repository",
        });

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
            maintainers: [],
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
            maintainers: [],
            deprecated: false,
          }),
        ]);

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
            maintainers: [],
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
            maintainers: [],
            deprecated: false,
          }),
        ]);

        await requestHelmChartReadmeMock.resolve({
          callWasSuccessful: true,
          response: "some-readme",
        });
      });

      it("renders", () => {
        expect(rendered.baseElement).toMatchSnapshot();
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

        it("shows dock tab for installing the chart", () => {
          expect(rendered.getByTestId("dock-tab-content-for-some-first-tab-id")).toBeInTheDocument();
        });

        it("calls for default configuration of the chart", () => {
          expect(requestHelmChartValuesMock).toHaveBeenCalledWith("some-repository", "some-name", "some-version");
        });

        it("calls for available versions", () => {
          expect(requestHelmChartVersionsMock).toHaveBeenCalledWith("some-repository", "some-name");
        });

        it("shows spinner in dock tab", () => {
          expect(rendered.getByTestId("install-chart-tab-spinner")).toBeInTheDocument();
        });

        it("given versions resolve but default configuration has not resolved yet, still shows the spinner", async () => {
          await requestHelmChartVersionsMock.resolve([]);

          expect(rendered.getByTestId("install-chart-tab-spinner")).toBeInTheDocument();
        });

        describe("when default configuration and versions resolve", () => {
          beforeEach(async () => {
            await requestHelmChartValuesMock.resolve({
              callWasSuccessful: true,
              response: "some-default-configuration",
            });

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
                maintainers: [],
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
                maintainers: [],
                deprecated: false,
              }),
            ]);
          });

          it("renders", () => {
            expect(rendered.baseElement).toMatchSnapshot();
          });

          it("does not show spinner anymore", () => {
            expect(rendered.queryByTestId("install-chart-tab-spinner")).not.toBeInTheDocument();
          });

          describe("when cancelled", () => {
            beforeEach(() => {
              const cancelButton = rendered.getByTestId("cancel-install-chart-from-tab-for-some-first-tab-id");

              fireEvent.click(cancelButton);
            });

            it("renders", () => {
              expect(rendered.baseElement).toMatchSnapshot();
            });

            it("closes the tab", () => {
              expect(rendered.queryByTestId("dock-tab-for-some-first-tab-id")).not.toBeInTheDocument();
            });
          });

          describe("given no changes in configuration, when installing the chart", () => {
            let installButton: HTMLButtonElement;

            beforeEach(() => {
              installButton = rendered.getByTestId("install-chart-from-tab-for-some-first-tab-id") as HTMLButtonElement;

              fireEvent.click(installButton);
            });

            it("renders", () => {
              expect(rendered.baseElement).toMatchSnapshot();
            });

            it("shows spinner in dock tab", () => {
              expect(rendered.getByTestId("installing-chart-from-tab-some-first-tab-id")).toBeInTheDocument();
            });

            it("install button is disabled", () => {
              expect(installButton).toHaveAttribute("disabled");
            });

            it("calls for installation with default configuration", () => {
              expect(requestCreateHelmReleaseMock).toHaveBeenCalledWith({
                chart: "some-name",
                name: undefined,
                namespace: "default",
                repo: "some-repository",
                values: "some-default-configuration",
                version: "some-version",
              });
            });

            describe("when installation resolves", () => {
              beforeEach(async () => {
                await requestCreateHelmReleaseMock.resolve({
                  log: "some-execution-output",

                  release: {
                    name: "some-release",
                    namespace: "default",
                    version: 1,
                    config: {},
                    manifest: "some-manifest",

                    info: {
                      deleted: "some-deleted",
                      description: "some-description",
                      first_deployed: "some-first-deployed",
                      last_deployed: "some-last-deployed",
                      notes: "some-notes",
                      status: "some-status",
                    },
                  },
                });
              });

              it("renders", () => {
                expect(rendered.baseElement).toMatchSnapshot();
              });

              it("does not show spinner anymore", () => {
                expect(rendered.queryByTestId("installing-chart-from-tab-some-first-tab-id")).not.toBeInTheDocument();
              });

              describe("when selected to see the installed release", () => {
                beforeEach(async () => {
                  const releaseButton = rendered.getByTestId("show-release-some-release-for-some-first-tab-id");

                  fireEvent.click(releaseButton);

                  await flushPromises();
                  await listClusterHelmReleasesMock.resolve({
                    callWasSuccessful: true,
                    response: [],
                  });
                });

                it("renders", () => {
                  expect(rendered.baseElement).toMatchSnapshot();
                });

                it("shows the details of installed release", () => {
                  const currentPath = windowDi.inject(currentPathInjectable).get();

                  expect(currentPath).toBe("/helm/releases/default/some-release");
                });

                it("closes the dock tab", () => {
                  expect(rendered.queryByTestId("dock-tab-for-some-first-tab-id")).not.toBeInTheDocument();
                });
              });

              describe("when selected to show execution output", () => {
                beforeEach(() => {
                  const showNotesButton = rendered.getByTestId(
                    "show-execution-output-for-some-release-in-some-first-tab-id",
                  );

                  fireEvent.click(showNotesButton);
                });

                it("renders", () => {
                  expect(rendered.baseElement).toMatchSnapshot();
                });

                it("shows the execution output", () => {
                  expect(rendered.getByTestId("logs-dialog-for-helm-chart-install")).toHaveTextContent(
                    "some-execution-output",
                  );
                });

                it("does not close the dock tab", () => {
                  expect(rendered.getByTestId("dock-tab-for-some-first-tab-id")).toBeInTheDocument();
                });
              });
            });
          });

          describe("given opening details for second chart, when details resolve", () => {
            beforeEach(async () => {
              requestHelmChartReadmeMock.mockClear();
              requestHelmChartVersionsMock.mockClear();

              const row = rendered.getByTestId("helm-chart-row-for-some-repository-some-other-name");

              fireEvent.click(row);

              await requestHelmChartVersionsMock.resolve([
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
                  maintainers: [],
                  deprecated: false,
                }),
              ]);

              await requestHelmChartReadmeMock.resolve({
                callWasSuccessful: true,
                response: "some-readme",
              });
            });

            it("renders", () => {
              expect(rendered.baseElement).toMatchSnapshot();
            });

            describe("when selecting to install second chart", () => {
              beforeEach(() => {
                requestHelmChartVersionsMock.mockClear();

                const installButton = rendered.getByTestId("install-chart-for-some-repository-some-other-name");

                fireEvent.click(installButton);
              });

              it("renders", () => {
                expect(rendered.baseElement).toMatchSnapshot();
              });

              it("shows dock tab for installing second chart", () => {
                expect(rendered.getByTestId("dock-tab-content-for-some-second-tab-id")).toBeInTheDocument();
              });

              it("still has the dock tab for installing first chart", () => {
                expect(rendered.getByTestId("dock-tab-for-some-first-tab-id")).toBeInTheDocument();
              });

              it("calls for default configuration of the second chart", () => {
                expect(requestHelmChartValuesMock).toHaveBeenCalledWith(
                  "some-repository",
                  "some-other-name",
                  "some-version",
                );
              });

              it("calls for available versions for the second chart", () => {
                expect(requestHelmChartVersionsMock).toHaveBeenCalledWith("some-repository", "some-other-name");
              });

              it("shows spinner in dock tab", () => {
                expect(rendered.getByTestId("install-chart-tab-spinner")).toBeInTheDocument();
              });

              describe("when configuration and versions resolve", () => {
                beforeEach(async () => {
                  await requestHelmChartValuesMock.resolve({
                    callWasSuccessful: true,
                    response: "some-other-default-configuration",
                  });

                  await requestHelmChartVersionsMock.resolve([]);
                });

                it("renders", () => {
                  expect(rendered.baseElement).toMatchSnapshot();
                });

                it("does not show spinner anymore", () => {
                  expect(rendered.queryByTestId("install-chart-tab-spinner")).not.toBeInTheDocument();
                });

                it("when installing the second chart, calls for installation of second chart", () => {
                  const installButton = rendered.getByTestId("install-chart-from-tab-for-some-second-tab-id");

                  fireEvent.click(installButton);

                  expect(requestCreateHelmReleaseMock).toHaveBeenCalledWith({
                    chart: "some-other-name",
                    name: undefined,
                    namespace: "default",
                    repo: "some-repository",
                    values: "some-other-default-configuration",
                    version: "some-version",
                  });
                });

                describe("when selecting the dock tab for installing first chart", () => {
                  beforeEach(() => {
                    requestHelmChartValuesMock.mockClear();
                    requestHelmChartVersionsMock.mockClear();

                    const tab = rendered.getByTestId("dock-tab-for-some-first-tab-id");

                    fireEvent.click(tab);
                  });

                  it("renders", () => {
                    expect(rendered.baseElement).toMatchSnapshot();
                  });

                  it("does not call for default configuration", () => {
                    expect(requestHelmChartValuesMock).not.toHaveBeenCalled();
                  });

                  it("does not call for available versions", () => {
                    expect(requestHelmChartVersionsMock).not.toHaveBeenCalled();
                  });

                  it("does not show spinner", () => {
                    expect(rendered.queryByTestId("install-chart-tab-spinner")).not.toBeInTheDocument();
                  });

                  it("when installing the first chart, calls for installation of first chart", () => {
                    const installButton = rendered.getByTestId("install-chart-from-tab-for-some-first-tab-id");

                    fireEvent.click(installButton);

                    expect(requestCreateHelmReleaseMock).toHaveBeenCalledWith({
                      chart: "some-name",
                      name: undefined,
                      namespace: "default",
                      repo: "some-repository",
                      values: "some-default-configuration",
                      version: "some-version",
                    });
                  });
                });
              });
            });
          });

          describe("given changing version to be installed", () => {
            let menu: { selectOption: (labelText: string) => Promise<void> };

            beforeEach(() => {
              requestHelmChartVersionsMock.mockClear();
              requestHelmChartValuesMock.mockClear();

              const menuId = "install-chart-version-select-for-some-first-tab-id";

              menu = builder.select.openMenu(menuId);
            });

            it("renders", () => {
              expect(rendered.baseElement).toMatchSnapshot();
            });

            describe("when version is selected", () => {
              let installButton: HTMLButtonElement;

              beforeEach(async () => {
                installButton = rendered.getByTestId(
                  "install-chart-from-tab-for-some-first-tab-id",
                ) as HTMLButtonElement;

                await menu.selectOption("some-other-version");
              });

              it("renders", () => {
                expect(rendered.baseElement).toMatchSnapshot();
              });

              it("calls for default configuration for the version of chart", () => {
                expect(requestHelmChartValuesMock).toHaveBeenCalledWith(
                  "some-repository",
                  "some-name",
                  "some-other-version",
                );
              });

              it("shows spinner", () => {
                expect(rendered.getByTestId("install-chart-configuration-spinner")).toBeInTheDocument();
              });

              it("does not call for versions again", () => {
                expect(requestHelmChartVersionsMock).not.toHaveBeenCalled();
              });

              it("install button is disabled", () => {
                expect(installButton).toHaveAttribute("disabled");
              });

              it("stores the selected version", async () => {
                const readJsonFile = windowDi.inject(readJsonFileInjectable);

                const actual = (await readJsonFile(
                  "/some-directory-for-lens-local-storage/some-cluster-id.json",
                )) as any;

                const version = actual.install_charts["some-first-tab-id"].version;

                expect(version).toBe("some-other-version");
              });

              describe("when default configuration resolves", () => {
                beforeEach(async () => {
                  await requestHelmChartValuesMock.resolve({
                    callWasSuccessful: true,
                    response: "some-default-configuration-for-other-version",
                  });
                });

                it("renders", () => {
                  expect(rendered.baseElement).toMatchSnapshot();
                });

                it("does not show spinner", () => {
                  expect(rendered.queryByTestId("install-chart-configuration-spinner")).not.toBeInTheDocument();
                });

                it("install button is enabled", () => {
                  expect(installButton).not.toHaveAttribute("disabled");
                });

                it("when installing the chart, calls for installation with changed version and default configuration", () => {
                  fireEvent.click(installButton);

                  expect(requestCreateHelmReleaseMock).toHaveBeenCalledWith({
                    chart: "some-name",
                    name: undefined,
                    namespace: "default",
                    repo: "some-repository",
                    values: "some-default-configuration-for-other-version",
                    version: "some-other-version",
                  });
                });
              });
            });
          });

          describe("given namespace selection is opened", () => {
            let menu: { selectOption: (labelText: string) => Promise<void> };

            beforeEach(() => {
              const menuId = "install-chart-namespace-select-for-some-first-tab-id";

              menu = builder.select.openMenu(menuId);
            });

            it("renders", () => {
              expect(rendered.baseElement).toMatchSnapshot();
            });

            describe("when namespace is selected", () => {
              beforeEach(async () => {
                await menu.selectOption("some-other-namespace");
              });

              it("renders", () => {
                expect(rendered.baseElement).toMatchSnapshot();
              });

              it("stores the selected namespace", async () => {
                const readJsonFile = windowDi.inject(readJsonFileInjectable);

                const actual = (await readJsonFile(
                  "/some-directory-for-lens-local-storage/some-cluster-id.json",
                )) as any;

                const namespace = actual.install_charts["some-first-tab-id"].namespace;

                expect(namespace).toBe("some-other-namespace");
              });

              it("when installing the chart, calls for installation with changed namespace", () => {
                const installButton = rendered.getByTestId("install-chart-from-tab-for-some-first-tab-id");

                fireEvent.click(installButton);

                expect(requestCreateHelmReleaseMock).toHaveBeenCalledWith({
                  chart: "some-name",
                  name: undefined,
                  namespace: "some-other-namespace",
                  repo: "some-repository",
                  values: "some-default-configuration",
                  version: "some-version",
                });
              });
            });
          });

          describe("given invalid change in configuration", () => {
            let installButton: HTMLButtonElement;
            let input: HTMLInputElement;

            beforeEach(() => {
              installButton = rendered.getByTestId("install-chart-from-tab-for-some-first-tab-id") as HTMLButtonElement;

              input = rendered.getByTestId("monaco-editor-for-some-first-tab-id") as HTMLInputElement;

              fireEvent.change(input, {
                target: { value: "@some-invalid-configuration@" },
              });
            });

            it("renders", () => {
              expect(rendered.baseElement).toMatchSnapshot();
            });

            it("updates the editor with the changed value", () => {
              const input = rendered.getByTestId("monaco-editor-for-some-first-tab-id");

              expect(input).toHaveValue("@some-invalid-configuration@");
            });

            it("install button is disabled", () => {
              expect(installButton).toHaveAttribute("disabled");
            });

            it("when valid change in configuration, install button is enabled", () => {
              fireEvent.change(input, {
                target: { value: "some-valid-configuration" },
              });

              expect(installButton).not.toHaveAttribute("disabled");
            });

            it("given change in version, when default configuration resolves, install button is enabled", async () => {
              await builder.select
                .openMenu("install-chart-version-select-for-some-first-tab-id")
                .selectOption("some-other-version");

              await requestHelmChartValuesMock.resolve({
                callWasSuccessful: true,
                response: "some-default-configuration-for-other-version",
              });

              expect(installButton).not.toHaveAttribute("disabled");
            });
          });

          describe("given valid change in configuration", () => {
            beforeEach(() => {
              const input = rendered.getByTestId("monaco-editor-for-some-first-tab-id");

              fireEvent.change(input, {
                target: { value: "some-valid-configuration" },
              });
            });

            it("updates the editor with the changed value", () => {
              const input = rendered.getByTestId("monaco-editor-for-some-first-tab-id");

              expect(input).toHaveValue("some-valid-configuration");
            });

            it("renders", () => {
              expect(rendered.baseElement).toMatchSnapshot();
            });

            it("stores the changed configuration", async () => {
              const readJsonFile = windowDi.inject(readJsonFileInjectable);

              const actual = (await readJsonFile("/some-directory-for-lens-local-storage/some-cluster-id.json")) as any;

              const configuration = actual.install_charts["some-first-tab-id"].values;

              expect(configuration).toBe("some-valid-configuration");
            });

            it("does not show spinner", () => {
              expect(rendered.queryByTestId("install-chart-tab-spinner")).not.toBeInTheDocument();
            });

            it("when installing the chart, calls for installation with changed configuration", () => {
              const installButton = rendered.getByTestId("install-chart-from-tab-for-some-first-tab-id");

              fireEvent.click(installButton);

              expect(requestCreateHelmReleaseMock).toHaveBeenCalledWith({
                chart: "some-name",
                name: undefined,
                namespace: "default",
                repo: "some-repository",
                values: "some-valid-configuration",
                version: "some-version",
              });
            });

            it("given version is changed, when default configuration resolves, defaults back to default configuration", async () => {
              await builder.select
                .openMenu("install-chart-version-select-for-some-first-tab-id")
                .selectOption("some-other-version");

              await requestHelmChartValuesMock.resolve({
                callWasSuccessful: true,
                response: "some-default-configuration-for-other-version",
              });

              const input = rendered.getByTestId("monaco-editor-for-some-first-tab-id");

              expect(input).toHaveValue("some-default-configuration-for-other-version");
            });
          });

          describe("given custom name is inputted", () => {
            beforeEach(() => {
              const input = rendered.getByTestId("install-chart-custom-name-input-for-some-first-tab-id");

              fireEvent.change(input, {
                target: { value: "some-custom-name" },
              });
            });

            it("stores the changed custom name", async () => {
              const readJsonFile = windowDi.inject(readJsonFileInjectable);

              const actual = (await readJsonFile("/some-directory-for-lens-local-storage/some-cluster-id.json")) as any;

              const customName = actual.install_charts["some-first-tab-id"].releaseName;

              expect(customName).toBe("some-custom-name");
            });

            it("renders", () => {
              expect(rendered.baseElement).toMatchSnapshot();
            });

            it("when installed, calls for installation with custom name", () => {
              const installButton = rendered.getByTestId("install-chart-from-tab-for-some-first-tab-id");

              fireEvent.click(installButton);

              expect(requestCreateHelmReleaseMock).toHaveBeenCalledWith({
                chart: "some-name",
                name: "some-custom-name",
                namespace: "default",
                repo: "some-repository",
                values: "some-default-configuration",
                version: "some-version",
              });
            });
          });
        });
      });
    });
  });
});

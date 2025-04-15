/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { AsyncFnMock } from "@async-fn/jest";
import asyncFn from "@async-fn/jest";
import { showErrorNotificationInjectable, showSuccessNotificationInjectable } from "@freelensapp/notifications";
import type { AsyncResult } from "@freelensapp/utilities";
import { type RenderResult, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ExecFile } from "../../common/fs/exec-file.injectable";
import execFileInjectable from "../../common/fs/exec-file.injectable";
import type { HelmRepo } from "../../common/helm/helm-repo";
import helmBinaryPathInjectable from "../../main/helm/helm-binary-path.injectable";
import getActiveHelmRepositoriesInjectable from "../../main/helm/repositories/get-active-helm-repositories/get-active-helm-repositories.injectable";
import type { ApplicationBuilder } from "../../renderer/components/test-utils/get-application-builder";
import { getApplicationBuilder } from "../../renderer/components/test-utils/get-application-builder";
import requestPublicHelmRepositoriesInjectable from "./child-features/preferences/renderer/adding-of-public-helm-repository/public-helm-repositories/request-public-helm-repositories.injectable";

describe("add helm repository from list in preferences", () => {
  let builder: ApplicationBuilder;
  let showSuccessNotificationMock: jest.Mock;
  let showErrorNotificationMock: jest.Mock;
  let rendered: RenderResult;
  let execFileMock: AsyncFnMock<ExecFile>;
  let getActiveHelmRepositoriesMock: AsyncFnMock<() => AsyncResult<HelmRepo[]>>;
  let callForPublicHelmRepositoriesMock: AsyncFnMock<() => Promise<HelmRepo[]>>;

  beforeEach(async () => {
    builder = getApplicationBuilder(userEvent.setup({ delay: null }));

    execFileMock = asyncFn();
    getActiveHelmRepositoriesMock = asyncFn();
    callForPublicHelmRepositoriesMock = asyncFn();
    showSuccessNotificationMock = jest.fn();
    showErrorNotificationMock = jest.fn();

    builder.beforeApplicationStart(({ mainDi }) => {
      mainDi.override(getActiveHelmRepositoriesInjectable, () => getActiveHelmRepositoriesMock);
      mainDi.override(execFileInjectable, () => execFileMock);
      mainDi.override(helmBinaryPathInjectable, () => "some-helm-binary-path");
    });

    builder.beforeWindowStart(({ windowDi }) => {
      windowDi.override(showSuccessNotificationInjectable, () => showSuccessNotificationMock);
      windowDi.override(showErrorNotificationInjectable, () => showErrorNotificationMock);
      windowDi.override(requestPublicHelmRepositoriesInjectable, () => callForPublicHelmRepositoriesMock);
    });

    rendered = await builder.render();
  });

  describe("when navigating to preferences containing helm repositories", () => {
    beforeEach(() => {
      builder.preferences.navigate();
      builder.preferences.navigation.click("kubernetes");
    });

    it("renders", () => {
      expect(rendered.baseElement).toMatchSnapshot();
    });

    it("calls for public repositories", () => {
      expect(callForPublicHelmRepositoriesMock).toHaveBeenCalled();
    });

    it("calls for active repositories", () => {
      expect(getActiveHelmRepositoriesMock).toHaveBeenCalled();
    });

    describe("when both active and public repositories resolve", () => {
      beforeEach(async () => {
        await Promise.all([
          callForPublicHelmRepositoriesMock.resolve([
            {
              name: "Some already active repository",
              url: "some-url",
              cacheFilePath: "/some-cache-file-for-active",
            },
            {
              name: "Some to be added repository",
              url: "some-other-url",
              cacheFilePath: "/some-cache-file-for-non-active",
            },
          ]),

          getActiveHelmRepositoriesMock.resolve({
            callWasSuccessful: true,
            response: [
              {
                name: "Some already active repository",
                url: "some-url",
                cacheFilePath: "/some-cache-file-for-active",
              },
            ],
          }),
        ]);
      });

      it("renders", async () => {
        await waitFor(() => {
          expect(rendered.baseElement).toBeTruthy();
        });
        expect(rendered.baseElement).toMatchSnapshot();
      });

      describe("when select for adding public repositories is clicked", () => {
        beforeEach(() => {
          builder.select.openMenu("selection-of-active-public-helm-repository");
        });

        it("renders", async () => {
          await waitFor(() => {
            expect(rendered.baseElement).toBeTruthy();
          });
          expect(rendered.baseElement).toMatchSnapshot();
        });

        describe("when deactive public repository is selected", () => {
          beforeEach(async () => {
            getActiveHelmRepositoriesMock.mockClear();

            await builder.select.selectOption(
              "selection-of-active-public-helm-repository",
              "Some to be added repository",
            );
          });

          it("renders", async () => {
            await waitFor(() => {
              expect(rendered.baseElement).toBeTruthy();
            });
            expect(rendered.baseElement).toMatchSnapshot();
          });

          it("adds the repository", () => {
            expect(execFileMock).toHaveBeenCalledWith(
              "some-helm-binary-path",
              ["repo", "add", "Some to be added repository", "some-other-url"],
              {
                maxBuffer: 34359738368,
                env: {},
              },
            );
          });

          it("does not reload active repositories yet", () => {
            expect(getActiveHelmRepositoriesMock).not.toHaveBeenCalled();
          });

          describe("when adding rejects", () => {
            beforeEach(async () => {
              await execFileMock.resolve({
                callWasSuccessful: false,
                error: Object.assign(new Error("Some error"), {
                  stderr: "",
                }),
              });
            });

            it("renders", () => {
              expect(rendered.baseElement).toMatchSnapshot();
            });

            it("shows error notification", () => {
              expect(showErrorNotificationMock).toHaveBeenCalledWith("Some error");
            });

            it("does not show success notification", () => {
              expect(showSuccessNotificationMock).not.toHaveBeenCalled();
            });

            it("does not show dialog anymore", () => {
              expect(rendered.queryByTestId("add-custom-helm-repository-dialog")).not.toBeInTheDocument();
            });

            it("does not reload active repositories", () => {
              expect(getActiveHelmRepositoriesMock).not.toHaveBeenCalled();
            });
          });

          describe("when adding resolves", () => {
            beforeEach(async () => {
              await execFileMock.resolveSpecific(
                ["some-helm-binary-path", ["repo", "add", "Some to be added repository", "some-other-url"]],
                {
                  callWasSuccessful: true,
                  response: "",
                },
              );
            });

            it("renders", () => {
              expect(rendered.baseElement).toMatchSnapshot();
            });

            it("reloads active repositories", () => {
              expect(getActiveHelmRepositoriesMock).toHaveBeenCalled();
            });

            it("shows success notification", () => {
              expect(showSuccessNotificationMock).toHaveBeenCalledWith(
                "Helm repository Some to be added repository has been added.",
              );
            });

            describe("when active repositories resolve again", () => {
              beforeEach(async () => {
                await getActiveHelmRepositoriesMock.resolve({
                  callWasSuccessful: true,
                  response: [
                    {
                      name: "Some already active repository",
                      url: "some-url",
                      cacheFilePath: "/some-cache-file-for-active",
                    },
                    {
                      name: "Some to be added repository",
                      url: "some-other-url",
                      cacheFilePath: "/some-cache-file-for-non-active",
                    },
                  ],
                });
              });

              it("renders", () => {
                expect(rendered.baseElement).toMatchSnapshot();
              });

              describe("when select for selecting active repositories is clicked", () => {
                beforeEach(() => {
                  builder.select.openMenu("selection-of-active-public-helm-repository");
                });

                it("renders", () => {
                  expect(rendered.baseElement).toMatchSnapshot();
                });

                describe("when active repository is selected", () => {
                  beforeEach(() => {
                    execFileMock.mockClear();
                    getActiveHelmRepositoriesMock.mockClear();

                    builder.select.selectOption(
                      "selection-of-active-public-helm-repository",
                      "Some already active repository",
                    );
                  });

                  it("renders", () => {
                    expect(rendered.baseElement).toMatchSnapshot();
                  });

                  it("removes the repository", () => {
                    expect(execFileMock).toHaveBeenCalledWith(
                      "some-helm-binary-path",
                      ["repo", "remove", "Some already active repository"],
                      {
                        maxBuffer: 34359738368,
                        env: {},
                      },
                    );
                  });

                  it("does not reload active repositories yet", () => {
                    expect(getActiveHelmRepositoriesMock).not.toHaveBeenCalled();
                  });

                  describe("when removing resolves", () => {
                    beforeEach(async () => {
                      await execFileMock.resolveSpecific(
                        ["some-helm-binary-path", ["repo", "remove", "Some already active repository"]],
                        {
                          callWasSuccessful: true,
                          response: "",
                        },
                      );
                    });

                    it("renders", () => {
                      expect(rendered.baseElement).toMatchSnapshot();
                    });

                    it("reloads active repositories", () => {
                      expect(getActiveHelmRepositoriesMock).toHaveBeenCalled();
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  });
});

/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { AsyncFnMock } from "@async-fn/jest";
import asyncFn from "@async-fn/jest";
import type { AsyncResult } from "@freelensapp/utilities";
import type { RenderResult } from "@testing-library/react";
import { fireEvent, waitFor } from "@testing-library/react";
import type { ExecFile } from "../../common/fs/exec-file.injectable";
import execFileInjectable from "../../common/fs/exec-file.injectable";
import type { HelmRepo } from "../../common/helm/helm-repo";
import helmBinaryPathInjectable from "../../main/helm/helm-binary-path.injectable";
import getActiveHelmRepositoriesInjectable from "../../main/helm/repositories/get-active-helm-repositories/get-active-helm-repositories.injectable";
import type { ApplicationBuilder } from "../../renderer/components/test-utils/get-application-builder";
import { getApplicationBuilder } from "../../renderer/components/test-utils/get-application-builder";
import requestPublicHelmRepositoriesInjectable from "./child-features/preferences/renderer/adding-of-public-helm-repository/public-helm-repositories/request-public-helm-repositories.injectable";

describe("remove helm repository from list of active repositories in preferences", () => {
  let builder: ApplicationBuilder;
  let rendered: RenderResult;
  let getActiveHelmRepositoriesMock: AsyncFnMock<() => AsyncResult<HelmRepo[]>>;
  let execFileMock: AsyncFnMock<ExecFile>;

  beforeEach(async () => {
    builder = getApplicationBuilder();

    execFileMock = asyncFn();
    getActiveHelmRepositoriesMock = asyncFn();

    builder.beforeApplicationStart(({ mainDi }) => {
      mainDi.override(getActiveHelmRepositoriesInjectable, () => getActiveHelmRepositoriesMock);
      mainDi.override(execFileInjectable, () => execFileMock);
      mainDi.override(helmBinaryPathInjectable, () => "some-helm-binary-path");
    });

    builder.beforeWindowStart(({ windowDi }) => {
      windowDi.override(requestPublicHelmRepositoriesInjectable, () => async () => []);
    });

    rendered = await builder.render();
  });

  describe("when navigating to preferences containing helm repositories", () => {
    beforeEach(async () => {
      builder.preferences.navigate();
      builder.preferences.navigation.click("kubernetes");
    });

    it("renders", async () => {
      await waitFor(() => {
        expect(rendered.baseElement).toBeTruthy();
      });
      expect(rendered.baseElement).toMatchSnapshot();
    });

    describe("when active repositories resolve", () => {
      beforeEach(async () => {
        getActiveHelmRepositoriesMock.resolve({
          callWasSuccessful: true,
          response: [
            {
              name: "some-active-repository",
              url: "some-url",
              cacheFilePath: "/some-cache-file",
            },
          ],
        });
      });

      it("renders", () => {
        expect(rendered.baseElement).toMatchSnapshot();
      });

      describe("when removing repository", () => {
        beforeEach(() => {
          execFileMock.mockClear();
          getActiveHelmRepositoriesMock.mockClear();

          const removeButton = rendered.getByTestId("remove-helm-repository-some-active-repository");

          fireEvent.click(removeButton);
        });

        it("renders", async () => {
          await waitFor(() => {
            expect(rendered.baseElement).toBeTruthy();
          });
          expect(rendered.baseElement).toMatchSnapshot();
        });

        it("removes the repository", () => {
          expect(execFileMock).toHaveBeenCalledWith(
            "some-helm-binary-path",
            ["repo", "remove", "some-active-repository"],
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
              ["some-helm-binary-path", ["repo", "remove", "some-active-repository"]],
              {
                callWasSuccessful: true,
                response: "",
              },
            );
          });

          it("renders", async () => {
            await waitFor(() => {
              expect(rendered.baseElement).toBeTruthy();
            });
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

/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { AsyncFnMock } from "@async-fn/jest";
import asyncFn from "@async-fn/jest";
import type { RenderResult } from "@testing-library/react";
import navigateToNamespacesInjectable from "../../common/front-end-routing/routes/cluster/namespaces/navigate-to-namespaces.injectable";
import type { WithConfirmation } from "../../renderer/components/confirm-dialog/with-confirm.injectable"; // Assuming ConfirmationDialogParams is exported or reconstruct its shape
import withConfirmInjectable from "../../renderer/components/confirm-dialog/with-confirm.injectable";
import type { RequestDeleteNormalNamespace } from "../../renderer/components/namespaces/request-delete-normal-namespace.injectable";
import requestDeleteNormalNamespaceInjectable from "../../renderer/components/namespaces/request-delete-normal-namespace.injectable";
import type { RequestDeleteSubNamespaceAnchor } from "../../renderer/components/namespaces/request-delete-sub-namespace.injectable";
import requestDeleteSubNamespaceAnchorInjectable from "../../renderer/components/namespaces/request-delete-sub-namespace.injectable";
import type { ApplicationBuilder } from "../../renderer/components/test-utils/get-application-builder";
import { getApplicationBuilder } from "../../renderer/components/test-utils/get-application-builder";

interface MockConfirmationDialogParams {
  message: string;
  labelOk: string;
  ok?: () => Promise<void> | void | unknown;
}

describe("namespaces route when viewed with some subNamespaces", () => {
  let builder: ApplicationBuilder;
  let result: RenderResult;
  let requestDeleteNormalNamespaceMock: AsyncFnMock<RequestDeleteNormalNamespace>;
  let requestDeleteSubNamespaceAnchorMock: AsyncFnMock<RequestDeleteSubNamespaceAnchor>;
  // Use jest.Mock for the HOF. It mocks a function that takes options and returns another function.
  let withConfirmMock: jest.Mock<() => Promise<void> | void, [MockConfirmationDialogParams]>;

  beforeEach(async () => {
    builder = getApplicationBuilder();

    builder.setEnvironmentToClusterFrame();

    builder.namespaces.add("default");
    builder.namespaces.add("foobar");
    builder.namespaces.addSubNamespace("my-sub-namespace", "default");

    requestDeleteNormalNamespaceMock = asyncFn();
    requestDeleteSubNamespaceAnchorMock = asyncFn();

    withConfirmMock = jest.fn();
    withConfirmMock.mockImplementation(
      // This is the implementation of the outer function `withConfirmation(options)`
      (options: MockConfirmationDialogParams) => {
        // This is the inner function (thunk) that gets returned and then called: `...()`
        const confirmThunkMock = jest.fn().mockImplementation(async () => {
          // Simulate the user confirming by calling the 'ok' callback
          if (options.ok && typeof options.ok === "function") {
            await options.ok();
          }
          // The actual thunk might return a promise resolving to true/false.
          // For tests focusing on the "ok" path, just executing options.ok() is sufficient.
          // If the SUT awaits this thunk's result and it's e.g. a boolean, return Promise.resolve(true)
        });
        return confirmThunkMock; // Return the callable thunk mock
      },
    );

    builder.beforeWindowStart(({ windowDi }) => {
      windowDi.override(requestDeleteNormalNamespaceInjectable, () => requestDeleteNormalNamespaceMock);
      windowDi.override(requestDeleteSubNamespaceAnchorInjectable, () => requestDeleteSubNamespaceAnchorMock);
      // Provide the jest.fn() mock. Cast if necessary, or ensure WithConfirmation type matches.
      windowDi.override(withConfirmInjectable, () => withConfirmMock as unknown as WithConfirmation);
    });

    builder.afterWindowStart(() => {
      builder.allowKubeResource({ group: "", apiName: "namespaces" });
    });

    result = await builder.render();
  });

  describe("when navigating to namespaces view", () => {
    beforeEach(() => {
      builder.navigateWith(navigateToNamespacesInjectable);
    });

    it("renders", () => {
      expect(result.baseElement).toMatchSnapshot();
    });

    it("shows the default namespace", () => {
      expect(result.queryByText("default")).toBeInTheDocument();
    });

    it("shows the foobar namespace", () => {
      expect(result.queryByText("foobar")).toBeInTheDocument();
    });

    it("shows the my-sub-namespace namespace", () => {
      expect(result.queryByText("my-sub-namespace")).toBeInTheDocument();
    });

    describe("when clicking on the default namespace context menu button", () => {
      let returnedConfirmThunkMock: jest.MockInstance<Promise<void> | void, []> | undefined;

      beforeEach(() => {
        result.getByTestId("icon-for-menu-actions-for-kube-object-menu-for-namespace-default").click();
      });

      it("renders", () => {
        expect(result.baseElement).toMatchSnapshot();
      });

      it("shows the context menu", () => {
        expect(result.getByTestId("menu-actions-for-kube-object-menu-for-namespace-default")).toBeInTheDocument();
      });

      describe("when clicking the delete action in the context menu", () => {
        beforeEach(() => {
          // Reset mocks for calls specifically within this describe block if needed for multiple clicks scenarios.
          // For a single click sequence, this is fine.
          withConfirmMock.mockClear(); // Clear calls from previous tests if any
          if (returnedConfirmThunkMock) returnedConfirmThunkMock.mockClear();
          requestDeleteNormalNamespaceMock.mockClear();
          requestDeleteSubNamespaceAnchorMock.mockClear();

          result.getByTestId("menu-action-delete-for-/api/v1/namespaces/default").click();

          // Capture the returned thunk mock for further assertions
          if (withConfirmMock.mock.results.length > 0 && withConfirmMock.mock.results[0].type === "return") {
            returnedConfirmThunkMock = withConfirmMock.mock.results[0].value as unknown as jest.MockInstance<
              Promise<void> | void,
              []
            >;
          }
        });

        it("should call withConfirm with correct parameters", () => {
          expect(withConfirmMock).toHaveBeenCalledTimes(1);
          expect(withConfirmMock).toHaveBeenCalledWith(
            expect.objectContaining({
              message: "Are you sure you want to delete namespace default?",
              labelOk: "Remove",
              ok: expect.any(Function),
            }),
          );
        });

        it("should call the returned confirmation thunk", () => {
          expect(returnedConfirmThunkMock).toHaveBeenCalledTimes(1);
        });

        it("should not call requestDeleteSubNamespaceAnchor", () => {
          expect(requestDeleteSubNamespaceAnchorMock).not.toHaveBeenCalled();
        });

        it("should call requestDeleteNormalNamespace", () => {
          // Now that options.ok() is called by the mock, this should be called.
          expect(requestDeleteNormalNamespaceMock).toHaveBeenCalledTimes(1);
        });
      });
    });

    describe("when clicking on the my-sub-namespace namespace context menu button", () => {
      let returnedConfirmThunkMock: jest.MockInstance<Promise<void> | void, []> | undefined;

      beforeEach(() => {
        result.getByTestId("icon-for-menu-actions-for-kube-object-menu-for-namespace-my-sub-namespace").click();
      });

      it("renders", () => {
        expect(result.baseElement).toMatchSnapshot();
      });

      it("shows the context menu", () => {
        expect(
          result.getByTestId("menu-actions-for-kube-object-menu-for-namespace-my-sub-namespace"),
        ).toBeInTheDocument();
      });

      describe("when clicking the delete action in the context menu", () => {
        beforeEach(() => {
          withConfirmMock.mockClear();
          if (returnedConfirmThunkMock) returnedConfirmThunkMock.mockClear();
          requestDeleteNormalNamespaceMock.mockClear();
          requestDeleteSubNamespaceAnchorMock.mockClear();

          result.getByTestId("menu-action-delete-for-/api/v1/namespaces/my-sub-namespace").click();

          if (withConfirmMock.mock.results.length > 0 && withConfirmMock.mock.results[0].type === "return") {
            returnedConfirmThunkMock = withConfirmMock.mock.results[0].value as unknown as jest.MockInstance<
              Promise<void> | void,
              []
            >;
          }
        });

        it("should call withConfirm with correct parameters", () => {
          expect(withConfirmMock).toHaveBeenCalledTimes(1);
          expect(withConfirmMock).toHaveBeenCalledWith(
            expect.objectContaining({
              message: "Are you sure you want to delete namespace my-sub-namespace?",
              labelOk: "Remove",
              ok: expect.any(Function),
            }),
          );
        });

        it("should call the returned confirmation thunk", () => {
          expect(returnedConfirmThunkMock).toHaveBeenCalledTimes(1);
        });

        it("should call requestDeleteSubNamespaceAnchor", () => {
          // This was the failing test; now it should pass as options.ok() is called.
          expect(requestDeleteSubNamespaceAnchorMock).toHaveBeenCalledTimes(1);
        });

        it("should not call requestDeleteNormalNamespace", () => {
          // Assuming deleting a subnamespace anchor does not also delete a normal namespace directly in this step
          expect(requestDeleteNormalNamespaceMock).not.toHaveBeenCalled();
        });
      });
    });
  });
});

/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { act, fireEvent } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WebLink } from "../../common/catalog-entities";
import navigateToCatalogInjectable from "../../common/front-end-routing/routes/catalog/navigate-to-catalog.injectable";
import navigateToEntitySettingsInjectable from "../../common/front-end-routing/routes/entity-settings/navigate-to-entity-settings.injectable";
import catalogEntityRegistryInjectable from "../../renderer/api/catalog/entity/registry.injectable";
import showEntityDetailsInjectable from "../../renderer/components/catalog/entity-details/show.injectable";
import { getApplicationBuilder } from "../../renderer/components/test-utils/get-application-builder";
import { Broken, errorMessage, expectLoggedRenderError, extensionName, stubLogger } from "./test-utils/extension-error";

import type { RenderResult } from "@testing-library/react";

import type { CatalogEntity } from "../../common/catalog";
import type { ApplicationBuilder } from "../../renderer/components/test-utils/get-application-builder";
import type { FakeExtensionOptions } from "../../renderer/components/test-utils/get-extension-fake";
import type { LoggerStub } from "./test-utils/extension-error";

// An error thrown while React renders a component of an extension replaces that component alone: the host puts a
// boundary around every component an extension registers, and the UI of the host around it stays.

const extensionId = "some-extension-id";

const getWebLink = (name: string) =>
  new WebLink({
    metadata: { labels: {}, name, uid: `${name}-id` },
    spec: { url: "https://example.com" },
    status: { phase: "available" },
  });

const webLinkVersions = { kind: WebLink.kind, apiVersions: [WebLink.apiVersion] };

// Throws for the entity named "broken-link" only, so that a component can be shown again for another entity.
const DetailsOfEntity = ({ entity }: { entity: CatalogEntity }) => {
  if (entity.getName() === "broken-link") {
    throw new Error(errorMessage);
  }

  return <div data-testid="extension-details">{`Details of ${entity.getName()}`}</div>;
};

describe("error boundaries around the components of an extension, in the root frame", () => {
  let builder: ApplicationBuilder;
  let rendered: RenderResult;
  let logger: LoggerStub;

  const navigateToWebLinks = async () => {
    act(() => {
      builder.applicationWindow.only.di.inject(navigateToCatalogInjectable)();
    });

    await act(async () => {
      fireEvent.click(rendered.getByTestId("entity.k8slens.dev/WebLink-tab"));
    });
  };

  const render = async (rendererOptions: FakeExtensionOptions["rendererOptions"]) => {
    builder.extensions.enable({ id: extensionId, name: extensionName, rendererOptions });
    rendered = await builder.render();
  };

  beforeEach(() => {
    builder = getApplicationBuilder();
    logger = stubLogger(builder);

    builder.afterWindowStart(({ windowDi }) => {
      windowDi
        .inject(catalogEntityRegistryInjectable)
        .updateItems([getWebLink("broken-link"), getWebLink("other-link")]);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("catalogEntityDetailItems", () => {
    beforeEach(async () => {
      await render({
        catalogEntityDetailItems: [{ ...webLinkVersions, components: { Details: DetailsOfEntity } }],
      });

      const windowDi = builder.applicationWindow.only.di;

      act(() => {
        windowDi.inject(navigateToCatalogInjectable)();
      });
      act(() => {
        windowDi.inject(showEntityDetailsInjectable)("broken-link-id");
      });
    });

    it("shows the error view in place of the component", () => {
      expect(rendered.getByText("App crash at")).toBeInTheDocument();
      expect(rendered.queryByTestId("extension-details")).not.toBeInTheDocument();
    });

    it("keeps the details panel and the catalog around it", () => {
      expect(rendered.getByTestId("catalog-entity-details-content-for-broken-link-id")).toBeInTheDocument();
      expect(rendered.getByTestId("catalog-list-for-browse-all")).toBeInTheDocument();
    });

    it("logs the error with the name of the extension", () => {
      expectLoggedRenderError(logger, "catalogEntityDetailItems", "DetailsOfEntity");
    });

    it("renders the component again for another entity", () => {
      act(() => {
        builder.applicationWindow.only.di.inject(showEntityDetailsInjectable)("other-link-id");
      });

      expect(rendered.getByTestId("extension-details")).toHaveTextContent("Details of other-link");
      expect(rendered.queryByText("App crash at")).not.toBeInTheDocument();
    });
  });

  describe("entitySettings", () => {
    beforeEach(async () => {
      await render({
        entitySettings: [{ ...webLinkVersions, title: "Some settings", components: { View: DetailsOfEntity } }],
      });

      act(() => {
        builder.applicationWindow.only.di.inject(navigateToEntitySettingsInjectable)("broken-link-id");
      });
    });

    it("shows the error view in place of the component, in the settings page", () => {
      expect(rendered.getByTestId("entity-settings")).toBeInTheDocument();
      expect(rendered.getByText("App crash at")).toBeInTheDocument();
    });

    it("keeps the status bar", () => {
      expect(rendered.getByTestId("status-bar")).toBeInTheDocument();
    });

    it("logs the error with the name of the extension", () => {
      expectLoggedRenderError(logger, "entitySettings", "DetailsOfEntity");
    });

    it("renders the component again for another entity", () => {
      act(() => {
        builder.applicationWindow.only.di.inject(navigateToEntitySettingsInjectable)("other-link-id");
      });

      expect(rendered.getByTestId("extension-details")).toHaveTextContent("Details of other-link");
      expect(rendered.queryByText("App crash at")).not.toBeInTheDocument();
    });
  });

  describe("globalPages", () => {
    beforeEach(async () => {
      await render({ globalPages: [{ components: { Page: Broken } }] });

      act(() => {
        builder.extensions.get(extensionId).applicationWindows.only.navigate();
      });
    });

    it("shows the error view in place of the page", () => {
      expect(rendered.getByText("App crash at")).toBeInTheDocument();
    });

    it("keeps the status bar", () => {
      expect(rendered.getByTestId("status-bar")).toBeInTheDocument();
    });

    it("logs the error with the name of the extension", () => {
      expectLoggedRenderError(logger, "globalPages");
    });
  });

  describe("appPreferences", () => {
    beforeEach(async () => {
      await render({
        appPreferences: [
          {
            title: "Some preference",
            id: "some-preference",
            components: {
              Input: Broken,
              Hint: () => <div data-testid="extension-preference-hint" />,
            },
          },
        ],
      });

      builder.preferences.navigate();
      builder.preferences.navigation.click(extensionName);
    });

    it("renders nothing in place of the input", () => {
      expect(rendered.queryByText("App crash at")).not.toBeInTheDocument();
    });

    it("keeps the rest of the preference", () => {
      expect(rendered.getByText("Some preference")).toBeInTheDocument();
      expect(rendered.getByTestId("extension-preference-hint")).toBeInTheDocument();
    });

    it("logs the error with the name of the extension", () => {
      expectLoggedRenderError(logger, "appPreferences");
    });
  });

  describe("statusBarItems", () => {
    beforeEach(async () => {
      await render({
        statusBarItems: [
          { components: { Item: Broken, position: "left" } },
          { components: { Item: () => <div data-testid="extension-status-bar-item" />, position: "left" } },
        ],
      });
    });

    it("renders nothing in place of the item, and keeps the status bar and the other items", () => {
      expect(rendered.getByTestId("status-bar")).toBeInTheDocument();
      expect(rendered.getByTestId("extension-status-bar-item")).toBeInTheDocument();
      expect(rendered.queryByText("App crash at")).not.toBeInTheDocument();
    });

    it("logs the error with the name of the extension", () => {
      expectLoggedRenderError(logger, "statusBarItems");
    });
  });

  describe("topBarItems", () => {
    beforeEach(async () => {
      await render({
        topBarItems: [
          { components: { Item: Broken } },
          { components: { Item: () => <div data-testid="extension-top-bar-item" /> } },
        ],
      });
    });

    it("renders nothing in place of the item, and keeps the top bar and the other items", () => {
      expect(rendered.getByTestId("extension-top-bar-item")).toBeInTheDocument();
      expect(rendered.getByTestId("status-bar")).toBeInTheDocument();
      expect(rendered.queryByText("App crash at")).not.toBeInTheDocument();
    });

    it("logs the error with the name of the extension", () => {
      expectLoggedRenderError(logger, "topBarItems");
    });
  });

  describe("customCategoryViews", () => {
    beforeEach(async () => {
      await render({
        customCategoryViews: [{ group: "entity.k8slens.dev", kind: WebLink.kind, components: { View: Broken } }],
      });

      await navigateToWebLinks();
    });

    it("shows the error view in place of the view, and keeps the list of the category", () => {
      expect(rendered.getByText("App crash at")).toBeInTheDocument();
      expect(rendered.getByTestId("catalog-list-for-Web Links")).toBeInTheDocument();
    });

    it("logs the error with the name of the extension", () => {
      expectLoggedRenderError(logger, "customCategoryViews");
    });
  });

  describe("additionalCategoryColumns", () => {
    const column = {
      group: "entity.k8slens.dev",
      kind: WebLink.kind,
      titleProps: { title: "Some column" },
    };

    describe("when the element renderCell returns throws", () => {
      beforeEach(async () => {
        await render({
          additionalCategoryColumns: [{ ...column, id: "some-column", renderCell: () => <Broken /> }],
        });

        await navigateToWebLinks();
      });

      it("renders nothing in the cell, and keeps the rows of the table", () => {
        expect(rendered.getByText("broken-link")).toBeInTheDocument();
        expect(rendered.getByText("other-link")).toBeInTheDocument();
        expect(rendered.queryByText("App crash at")).not.toBeInTheDocument();
      });

      it("logs the error with the name of the extension", () => {
        expectLoggedRenderError(logger, "additionalCategoryColumns");
      });
    });

    describe("when renderCell itself throws", () => {
      beforeEach(async () => {
        await render({
          additionalCategoryColumns: [
            {
              ...column,
              id: "some-column",
              renderCell: (entity) => {
                if (entity.getName() === "broken-link") {
                  throw new Error(errorMessage);
                }

                return <span data-testid="extension-cell">{entity.getName()}</span>;
              },
            },
          ],
        });

        await navigateToWebLinks();
      });

      it("renders nothing in the cell, and keeps the rows and the other cells of the column", () => {
        expect(rendered.getByText("broken-link")).toBeInTheDocument();
        expect(rendered.getByTestId("extension-cell")).toHaveTextContent("other-link");
        expect(rendered.queryByText("App crash at")).not.toBeInTheDocument();
      });

      it("logs the error with the name of the extension", () => {
        expect(logger.error).toHaveBeenCalledWith(
          `[EXTENSIONS]: ${extensionName}: a render callback of "additionalCategoryColumns" threw and is skipped`,
          expect.objectContaining({ message: errorMessage }),
        );
      });
    });
  });
});

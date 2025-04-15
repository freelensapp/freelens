/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { screen } from "@testing-library/react";
import type { UserEvent } from "@testing-library/user-event";
import userEvent from "@testing-library/user-event";
import React from "react";
import type { CatalogCategorySpec } from "../../../../common/catalog";
import { CatalogCategory } from "../../../../common/catalog";
import { getDiForUnitTesting } from "../../../getDiForUnitTesting";
import { type DiRender, renderFor } from "../../test-utils/renderFor";
import { CatalogAddButton } from "../catalog-add-button";

class TestCatalogCategory extends CatalogCategory {
  public readonly apiVersion = "catalog.k8slens.dev/v1alpha1";
  public readonly kind = "CatalogCategory";
  public metadata = {
    name: "Test Category",
    icon: "",
  };
  public spec: CatalogCategorySpec = {
    group: "entity.k8slens.dev",
    versions: [],
    names: {
      kind: "Test",
    },
  };
}

describe("CatalogAddButton", () => {
  let render: DiRender;
  let user: UserEvent;

  beforeEach(() => {
    const di = getDiForUnitTesting();

    render = renderFor(di);

    user = userEvent.setup();
  });

  it("opens Add menu", async () => {
    const category = new TestCatalogCategory();

    category.on("catalogAddMenu", (ctx) => {
      ctx.menuItems.push({
        icon: "text_snippet",
        title: "Add from kubeconfig",
        onClick: () => {},
      });
    });

    render(<CatalogAddButton category={category} />);

    await user.hover(screen.getByLabelText("SpeedDial CatalogAddButton"));
    await screen.findByLabelText("Add from kubeconfig");
  });

  it("filters menu items", async () => {
    const category = new TestCatalogCategory();

    category.on("catalogAddMenu", (ctx) => {
      ctx.menuItems.push({
        icon: "text_snippet",
        title: "foobar",
        onClick: () => {},
      });
      ctx.menuItems.push({
        icon: "text_snippet",
        title: "Add from kubeconfig",
        onClick: () => {},
      });
    });

    category.addMenuFilter((item) => item.title === "foobar");

    render(<CatalogAddButton category={category} />);

    await user.hover(screen.getByLabelText("SpeedDial CatalogAddButton"));

    await expect(screen.findByLabelText("Add from kubeconfig")).rejects.toThrow();
    await screen.findByLabelText("foobar");
  });
});

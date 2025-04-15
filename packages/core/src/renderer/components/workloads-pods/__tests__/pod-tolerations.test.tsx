/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import React from "react";
import "@testing-library/jest-dom";
import type { Toleration } from "@freelensapp/kube-object";
import { fireEvent } from "@testing-library/react";
import directoryForLensLocalStorageInjectable from "../../../../common/directory-for-lens-local-storage/directory-for-lens-local-storage.injectable";
import { getDiForUnitTesting } from "../../../getDiForUnitTesting";
import type { DiRender } from "../../test-utils/renderFor";
import { renderFor } from "../../test-utils/renderFor";
import { PodTolerations } from "../pod-tolerations";

const tolerations: Toleration[] = [
  {
    key: "CriticalAddonsOnly",
    operator: "Exist",
    effect: "NoExecute",
    tolerationSeconds: 3600,
  },
  {
    key: "node.kubernetes.io/not-ready",
    operator: "NoExist",
    effect: "NoSchedule",
    tolerationSeconds: 7200,
  },
];

describe("<PodTolerations />", () => {
  let render: DiRender;

  beforeEach(() => {
    const di = getDiForUnitTesting();

    di.override(directoryForLensLocalStorageInjectable, () => "some-directory-for-lens-local-storage");

    render = renderFor(di);
  });

  it("renders w/o errors", () => {
    const { container } = render(<PodTolerations tolerations={tolerations} />);

    expect(container).toBeInstanceOf(HTMLElement);
  });

  it("shows all tolerations", () => {
    const { container } = render(<PodTolerations tolerations={tolerations} />);
    const rows = container.querySelectorAll(".TableRow");

    expect(rows[0].querySelector(".key")?.textContent).toBe("CriticalAddonsOnly");
    expect(rows[0].querySelector(".operator")?.textContent).toBe("Exist");
    expect(rows[0].querySelector(".effect")?.textContent).toBe("NoExecute");
    expect(rows[0].querySelector(".seconds")?.textContent).toBe("3600");

    expect(rows[1].querySelector(".key")?.textContent).toBe("node.kubernetes.io/not-ready");
    expect(rows[1].querySelector(".operator")?.textContent).toBe("NoExist");
    expect(rows[1].querySelector(".effect")?.textContent).toBe("NoSchedule");
    expect(rows[1].querySelector(".seconds")?.textContent).toBe("7200");
  });

  it("sorts table properly", () => {
    const { container, getByText } = render(<PodTolerations tolerations={tolerations} />);
    const headCell = getByText("Key");

    fireEvent.click(headCell);
    fireEvent.click(headCell);

    const rows = container.querySelectorAll(".TableRow");

    expect(rows[0].querySelector(".key")?.textContent).toBe("node.kubernetes.io/not-ready");
  });
});

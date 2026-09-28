/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "@testing-library/jest-dom/vitest";
import { fireEvent, screen } from "@testing-library/react";
import { getDiForUnitTesting } from "../../../getDiForUnitTesting";
import { renderFor } from "../../test-utils/renderFor";
import { SortableTable } from "../sortable-table";

import type { SortableTableColumn } from "../sortable-table";

interface Row {
  id: string;
  name: string;
  size: number;
}

const items: Row[] = [
  { id: "b", name: "beta", size: 3 },
  { id: "a", name: "alpha", size: 10 },
  { id: "c", name: "gamma", size: 2 },
];

const columns: SortableTableColumn<Row>[] = [
  {
    id: "name",
    title: "Name",
    sortBy: (row) => row.name,
    renderCell: (row) => row.name,
  },
  {
    id: "size",
    title: "Size",
    sortBy: (row) => row.size,
    renderCell: (row) => row.size,
  },
  {
    id: "actions",
    title: "",
    renderCell: () => <button type="button">Do</button>,
  },
];

const renderTable = () =>
  renderFor(getDiForUnitTesting())(<SortableTable columns={columns} items={items} getItemKey={(row) => row.id} />);

const columnValues = (index: number) =>
  [...document.querySelectorAll("tbody tr")].map((row) => row.children[index].textContent);

describe("SortableTable", () => {
  it("renders the rows in the given order until a column is picked", () => {
    renderTable();

    expect(columnValues(0)).toEqual(["beta", "alpha", "gamma"]);
  });

  it("sorts ascending on the first click and descending on the second", () => {
    renderTable();

    fireEvent.click(screen.getByRole("button", { name: /Name/ }));
    expect(columnValues(0)).toEqual(["alpha", "beta", "gamma"]);

    fireEvent.click(screen.getByRole("button", { name: /Name/ }));
    expect(columnValues(0)).toEqual(["gamma", "beta", "alpha"]);
  });

  it("compares numbers as numbers, not as strings", () => {
    renderTable();

    fireEvent.click(screen.getByRole("button", { name: /Size/ }));
    expect(columnValues(1)).toEqual(["2", "3", "10"]);
  });

  it("starts over at ascending when a different column is picked", () => {
    renderTable();

    fireEvent.click(screen.getByRole("button", { name: /Name/ }));
    fireEvent.click(screen.getByRole("button", { name: /Name/ }));
    fireEvent.click(screen.getByRole("button", { name: /Size/ }));

    expect(columnValues(1)).toEqual(["2", "3", "10"]);
  });

  it("reports the sort direction to assistive technology", () => {
    renderTable();

    const header = screen.getByRole("columnheader", { name: /Name/ });

    expect(header).not.toHaveAttribute("aria-sort");

    fireEvent.click(screen.getByRole("button", { name: /Name/ }));
    expect(header).toHaveAttribute("aria-sort", "ascending");

    fireEvent.click(screen.getByRole("button", { name: /Name/ }));
    expect(header).toHaveAttribute("aria-sort", "descending");
  });

  it("gives a column without a sortBy no header button", () => {
    renderTable();

    // The only buttons left are the ones the actions column renders per row
    expect(screen.getAllByRole("button", { name: "Do" })).toHaveLength(items.length);
    expect(screen.queryByRole("button", { name: "" })).not.toBeInTheDocument();
  });
});

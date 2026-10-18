/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { ItemStore } from "../item.store";

import type { ItemSorting } from "../item.store";

class Item {
  constructor(
    readonly id: string,
    readonly rank: number,
    readonly status = "",
  ) {}

  getId() {
    return this.id;
  }

  getName() {
    return this.id;
  }
}

class RankedStore extends ItemStore<Item> {
  protected readonly sorting: ItemSorting<Item> = { by: [(item) => item.rank], order: "desc" };

  update(item: Item) {
    return this.updateItem(item, async () => item);
  }

  load(item: Item, sortItems?: boolean) {
    return this.loadItem(async () => item, sortItems);
  }
}

describe("ItemStore", () => {
  let store: RankedStore;
  const ids = () => store.items.map((item) => item.getId());

  beforeEach(() => {
    store = new RankedStore();
    store.items.replace([new Item("a", 4), new Item("b", 3), new Item("c", 2), new Item("d", 1)]);
  });

  it("sorts by the declared sorting", () => {
    store.items.replace(store["sortItems"]([new Item("a", 1), new Item("b", 2)]));

    expect(ids()).toEqual(["b", "a"]);
  });

  describe.each(["update", "load"] as const)("%s", (method) => {
    it("sorts when the sort key changes", async () => {
      await store[method](new Item("b", 0));

      expect(ids()).toEqual(["a", "c", "d", "b"]);
    });

    it("replaces the item in place without sorting when the sort key does not change", async () => {
      const sort = vi.spyOn(store, "sortItems" as never);

      await store[method](new Item("b", 3, "ready"));

      expect(ids()).toEqual(["a", "b", "c", "d"]);
      expect(store.items[1].status).toBe("ready");
      expect(sort).not.toHaveBeenCalled();
    });

    it("sorts an item that was not in the store into place", async () => {
      await store[method](new Item("bb", 2.5));

      expect(ids()).toEqual(["a", "b", "bb", "c", "d"]);
    });
  });

  it("does not sort a loaded item when told not to", async () => {
    await store.load(new Item("b", 0), false);

    expect(ids()).toEqual(["a", "b", "c", "d"]);
  });

  it("sorts on every replacement when a subclass overrides sortItems", async () => {
    class CustomSortStore extends RankedStore {
      protected sortItems(items: Item[]) {
        return super.sortItems(items, [(item) => item.status]);
      }
    }

    store = new CustomSortStore();
    store.items.replace([new Item("a", 1, "a"), new Item("b", 1, "b")]);

    await store.update(new Item("a", 1, "z"));

    expect(ids()).toEqual(["b", "a"]);
  });
});

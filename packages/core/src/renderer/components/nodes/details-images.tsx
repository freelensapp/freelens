/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { bytesToUnits, cssNames } from "@freelensapp/utilities";
import { useState } from "react";
import { DrawerTitle } from "../drawer";
import { ImageReference } from "../image-reference";
import { SearchInput } from "../input";
import { Table, TableCell, TableHead, TableRow } from "../table";
import styles from "./details-images.module.scss";
import { defaultNodeStatusMaxImages, filterNodeImages, getNodeImageName, getNodeImages } from "./node-images";

import type { Node } from "@freelensapp/kube-object";

import type { NodeImage } from "./node-images";

export interface NodeDetailsImagesProps {
  node: Node;
}

enum sortBy {
  name = "name",
  size = "size",
}

const renderRow = (image: NodeImage, index: number) => {
  const { tags, digests, sizeBytes } = image;
  // An image with a tag shows its tags, with its digests as the tooltip. An
  // image that only has digests, such as one pulled by digest, shows those.
  const references = tags.length ? tags : digests;
  const digest = tags.length ? digests.join(", ") : undefined;

  return (
    <TableRow key={getNodeImageName(image) || `image-${index}`} sortItem={image} nowrap>
      <TableCell className={cssNames("name", styles.name)}>
        {references.map((reference) => (
          <ImageReference key={reference} reference={reference} digest={digest} />
        ))}
      </TableCell>
      <TableCell className={cssNames("size", styles.size)}>
        {sizeBytes === undefined ? "" : bytesToUnits(sizeBytes)}
      </TableCell>
    </TableRow>
  );
};

export function NodeDetailsImages({ node }: NodeDetailsImagesProps) {
  const [search, setSearch] = useState("");
  const images = getNodeImages(node.status?.images);

  if (!images.length) {
    return null;
  }

  const filteredImages = filterNodeImages(images, search);

  return (
    <div className={cssNames("NodeDetailsImages flex flex-col gap-2", styles.NodeDetailsImages)}>
      <DrawerTitle>{`Images (${images.length})`}</DrawerTitle>
      {images.length === defaultNodeStatusMaxImages && (
        <p className={styles.limitNote} data-testid="node-images-limit-note">
          {`The kubelet reports at most ${defaultNodeStatusMaxImages} images of a node by default, the largest first ` +
            "(nodeStatusMaxImages). A smaller image can be on the node and not in this list."}
        </p>
      )}
      <SearchInput
        value={search}
        onChange={setSearch}
        onClear={() => setSearch("")}
        placeholder="Filter images..."
        autoFocus={false}
        bindGlobalFocusHotkey={false}
        data-testid="node-images-filter"
      />
      <Table
        tableId="nodes_node_details_images"
        items={filteredImages}
        selectable
        scrollable={false}
        sortable={{
          [sortBy.name]: getNodeImageName,
          [sortBy.size]: (image) => image.sizeBytes ?? 0,
        }}
        sortByDefault={{ sortBy: sortBy.size, orderBy: "desc" }}
        sortSyncWithUrl={false}
        renderRow={renderRow}
        noItems={<p className="p-2">No images match the filter.</p>}
      >
        <TableHead flat sticky={false}>
          <TableCell className={cssNames("name", styles.name)} sortBy={sortBy.name}>
            Name
          </TableCell>
          <TableCell className={cssNames("size", styles.size)} sortBy={sortBy.size}>
            Size
          </TableCell>
        </TableHead>
      </Table>
    </div>
  );
}

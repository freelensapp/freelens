/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { ContainerImage } from "@freelensapp/kube-object";

/**
 * The number of images the kubelet reports in the status of its node when its
 * configuration does not set `nodeStatusMaxImages`. The kubelet keeps the
 * largest images, so a list of this length may leave out smaller images.
 */
export const defaultNodeStatusMaxImages = 50;

export interface NodeImage {
  /**
   * The names of the image with a tag, such as `docker.io/library/nginx:1.27`.
   */
  tags: string[];
  /**
   * The names of the image with a digest, such as `docker.io/library/nginx@sha256:…`.
   */
  digests: string[];
  sizeBytes?: number;
}

const isDigestName = (name: string) => name.includes("@");

/**
 * Splits the names of each image of `status.images` into the names with a tag
 * and the names with a digest.
 */
export const getNodeImages = (images: ContainerImage[] | undefined): NodeImage[] =>
  (images ?? []).map(({ names = [], sizeBytes }) => ({
    tags: names.filter((name) => !isDigestName(name)),
    digests: names.filter(isDigestName),
    sizeBytes,
  }));

/**
 * The images with a name, tag or digest that contains `search`, ignoring case.
 */
export const filterNodeImages = (images: NodeImage[], search: string): NodeImage[] => {
  const query = search.trim().toLowerCase();

  if (!query) {
    return images;
  }

  return images.filter(({ tags, digests }) => [...tags, ...digests].some((name) => name.toLowerCase().includes(query)));
};

/**
 * The name the list shows and sorts the image by: its first tag, or its first
 * digest when the image has no tag.
 */
export const getNodeImageName = ({ tags, digests }: NodeImage) => tags[0] ?? digests[0] ?? "";

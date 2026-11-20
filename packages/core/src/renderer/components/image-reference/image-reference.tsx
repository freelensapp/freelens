/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { cssNames } from "@freelensapp/utilities";
import { Badge } from "../badge";

export interface ImageReferenceProps {
  /**
   * The image as the object names it, such as the `image` of a container or the `reference` of an image volume.
   */
  reference: string;
  /**
   * The image the node pulled for it, such as the `imageID` of a container status or the `imageRef` of an image
   * volume status. Shown as the tooltip, when there is one.
   */
  digest?: string;
  className?: string;
  "data-testid"?: string;
}

export const ImageReference = ({ reference, digest, className, "data-testid": testId }: ImageReferenceProps) => (
  <Badge
    className={cssNames("ImageReference", className)}
    label={reference}
    tooltip={digest || undefined}
    data-testid={testId}
  />
);

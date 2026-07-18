/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Button } from "@freelensapp/button";
import { Icon } from "@freelensapp/icon";

export function ToBottom({ onClick }: { onClick: () => void }) {
  return (
    <Button
      primary
      className="ToBottom"
      onClick={(evt) => {
        evt.currentTarget.blur();
        onClick();
      }}
    >
      To bottom
      <Icon small material="expand_more" />
    </Button>
  );
}

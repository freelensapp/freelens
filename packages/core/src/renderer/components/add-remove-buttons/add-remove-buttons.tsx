/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./add-remove-buttons.scss";

import React from "react";
import type { StrictReactNode } from "@freelens/utilities";
import { cssNames } from "@freelens/utilities";
import { Button } from "@freelens/button";
import { Icon } from "@freelens/icon";

export interface AddRemoveButtonsProps extends React.HTMLAttributes<any> {
  onAdd?: () => void;
  onRemove?: () => void;
  addTooltip?: StrictReactNode;
  removeTooltip?: StrictReactNode;
}

export class AddRemoveButtons extends React.PureComponent<AddRemoveButtonsProps> {
  renderButtons() {
    const { onRemove, onAdd, addTooltip, removeTooltip } = this.props;

    return [
      {
        onClick: onRemove,
        className: "remove-button",
        icon: "remove",
        tooltip: removeTooltip,
      },
      {
        onClick: onAdd,
        className: "add-button",
        icon: "add",
        tooltip: addTooltip,
      },
    ]
      .filter(button => button.onClick)
      .map(({ icon, ...props }) => (
        <Button
          key={icon}
          big
          round
          primary
          {...props}
        >
          <Icon material={icon} />
        </Button>
      ));
  }

  render() {
    return (
      <div className={cssNames("AddRemoveButtons flex gaps", this.props.className)}>
        {this.renderButtons()}
      </div>
    );
  }
}

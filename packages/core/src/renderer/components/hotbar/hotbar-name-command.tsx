/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import { useState } from "react";
import commandOverlayInjectable from "../command-palette/command-overlay.injectable";
import { Input } from "../input";

export interface HotbarNameCommandProps {
  initialName?: string;
  placeholder: string;
  hint: string;
  /**
   * Lets an empty name be submitted, for names that fall back to a default
   * when cleared.
   */
  allowEmpty?: boolean;
  onSubmit: (name: string) => void;
}

interface Dependencies {
  closeCommandOverlay: () => void;
}

const NonInjectedHotbarNameCommand = observer(
  ({
    initialName = "",
    placeholder,
    hint,
    allowEmpty = false,
    onSubmit,
    closeCommandOverlay,
  }: HotbarNameCommandProps & Dependencies) => {
    const [name, setName] = useState(initialName);

    const submit = (value: string) => {
      if (!allowEmpty && !value.trim()) {
        return;
      }

      onSubmit(value.trim());
      closeCommandOverlay();
    };

    return (
      <>
        <Input
          trim={true}
          value={name}
          onChange={setName}
          placeholder={placeholder}
          autoFocus={true}
          theme="round-black"
          data-test-id="command-palette-hotbar-name"
          onSubmit={submit}
        />
        <small className="hint">{hint}</small>
      </>
    );
  },
);

export const HotbarNameCommand = withInjectables<Dependencies, HotbarNameCommandProps>(NonInjectedHotbarNameCommand, {
  getProps: (di, props) => ({
    ...props,
    closeCommandOverlay: di.inject(commandOverlayInjectable).close,
  }),
});

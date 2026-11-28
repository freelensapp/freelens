import { Button } from "@freelensapp/button";
import { Spinner } from "@freelensapp/spinner";
import React from "react";
import styles from "./extension-action-button.module.scss";
import { useExtensionActionButton } from "./use-extension-action-button.hook";

export type ExtensionActionState = "install" | "uninstall" | "installing" | "uninstalling" | "update" | "updating";

export interface ExtensionActionButtonProps {
  state: ExtensionActionState;
  onClick: () => void;
}

export const ExtensionActionButton: React.FC<ExtensionActionButtonProps> = ({ state, onClick }) => {
  const { label, variant, isSpinnerState } = useExtensionActionButton({ state });

  return (
    <Button
      primary={variant === "primary"}
      accent={variant === "accent"}
      onClick={onClick}
      disabled={isSpinnerState}
      aria-label={isSpinnerState ? label : undefined}
      className={styles.button}
    >
      {isSpinnerState ? <Spinner className={styles.spinner} /> : label}
    </Button>
  );
};

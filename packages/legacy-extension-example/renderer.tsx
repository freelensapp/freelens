import { Common, Renderer } from "@freelens/extensions";

export default class ExampleLensExtension extends Renderer.LensExtension {
  protected onActivate(): void | Promise<void> {
    Common.logger.info("Activating bundled extension example");
  }

  protected onDeactivate(): void | Promise<void> {
    Common.logger.info("Deactivating bundled extension example");
  }
}

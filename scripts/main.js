import { MODULE_ID, SOCKET_CHANNEL } from "./constants.js";
import { MaterialImpactResolver, loadRebreyaMaterialCatalog } from "./material-impact-resolver.js";
import { buildAttackContexts } from "./attack-context.js";
import { TokenMeshAnimator } from "./token-mesh-animator.js";
import { SocketVisualSync } from "./socket-visual-sync.js";
import { AnimationDirector } from "./animation-director.js";
import { BloodyArtLogger } from "./logger.js";
import { createWorkflowHandler, registerMidiWorkflowIntegration } from "./midi-workflow-integration.js";

Hooks.once("init", () => {
  game.settings.register(MODULE_ID, "debug", {
    name: "Bloody Art: debug logging",
    hint: "Log one structured record for each resolved melee attack.",
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });
});

Hooks.once("ready", async () => {
  const logger = new BloodyArtLogger();
  if (!game.modules.get("midi-qol")?.active || !game.modules.get("sequencer")?.active || typeof globalThis.Sequence !== "function") {
    logger.error("Bloody Art | Midi-QOL and Sequencer must both be active");
    return;
  }

  const catalog = game.modules.get("rebreya-main")?.active ? await loadRebreyaMaterialCatalog() : [];
  const materialResolver = new MaterialImpactResolver(catalog);
  const animator = new TokenMeshAnimator({
    resolveToken: (sceneId, tokenId) => {
      if (sceneId && canvas.scene?.id !== sceneId) return null;
      return canvas.tokens?.get(tokenId) ?? null;
    }
  });
  const visualSync = new SocketVisualSync({
    socket: game.socket,
    channel: SOCKET_CHANNEL,
    animate: event => animator.animate(event),
    logger
  });
  const director = new AnimationDirector({ visualSync, logger });
  const handleWorkflow = createWorkflowHandler({
    buildContexts: workflow => buildAttackContexts(workflow, { materialResolver }),
    director,
    logger
  });
  registerMidiWorkflowIntegration({ handleWorkflow, logger });

  Hooks.on("preUpdateToken", tokenDocument => animator.cancel(tokenDocument.id));
  Hooks.on("refreshToken", token => animator.cancel(token.id));
  Hooks.on("destroyToken", token => animator.cancel(token.id ?? token.document?.id));
  Hooks.on("canvasTearDown", () => animator.restoreAll());

  const module = game.modules.get(MODULE_ID);
  if (module) module.api = { materialResolver, animator, visualSync, director };
});

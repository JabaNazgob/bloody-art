export async function processWorkflowSafely(workflow, handler, logger = console) {
  try {
    await handler(workflow);
    return true;
  } catch (error) {
    logger?.error?.("Bloody Art | melee animation failed without affecting the workflow", error);
    return false;
  }
}

export function createWorkflowHandler({ buildContexts, director, rng = Math.random, wait = delay => new Promise(resolve => setTimeout(resolve, delay)), logger = console }) {
  return async workflow => {
    const contexts = buildContexts(workflow);
    for (let index = 0; index < contexts.length; index += 1) {
      if (index > 0) await wait(50 + Math.floor(rng() * 201));
      try {
        await director.play(contexts[index]);
      } catch (error) {
        logger?.error?.("Bloody Art | target animation failed", error);
      }
    }
  };
}

export function registerMidiWorkflowIntegration({ hooks = globalThis.Hooks, handleWorkflow, logger = console }) {
  return hooks.on("midi-qol.AttackRollComplete", workflow => {
    void processWorkflowSafely(workflow, handleWorkflow, logger);
    return true;
  });
}

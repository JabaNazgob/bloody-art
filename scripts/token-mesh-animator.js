function interpolateKeyframes(values, progress) {
  const scaled = progress * (values.length - 1);
  const index = Math.min(values.length - 2, Math.floor(scaled));
  const local = scaled - index;
  return values[index] + ((values[index + 1] - values[index]) * local);
}

function easeInOutQuart(value) {
  return value < 0.5 ? 8 * value ** 4 : 1 - ((-2 * value + 2) ** 4) / 2;
}

export class TokenMeshAnimator {
  constructor({
    resolveToken,
    now = () => performance.now(),
    requestFrame = callback => requestAnimationFrame(callback),
    cancelFrame = id => cancelAnimationFrame(id),
    setTimer = (callback, delay) => setTimeout(callback, delay)
  }) {
    this.resolveToken = resolveToken;
    this.now = now;
    this.requestFrame = requestFrame;
    this.cancelFrame = cancelFrame;
    this.setTimer = setTimer;
    this.active = new Map();
  }

  async animate(event) {
    if (event.delay > 0) await new Promise(resolve => this.setTimer(resolve, event.delay));
    const token = this.resolveToken(event.sceneId, event.tokenId);
    const mesh = token?.mesh ?? token?.object?.mesh;
    if (!mesh?.position || mesh.destroyed) return false;
    this.cancel(event.tokenId);
    const origin = { x: mesh.position.x, y: mesh.position.y };
    const duration = Math.max(1, Number(event.duration) || 400);
    const offset = event.offset ?? { x: 0, y: 0 };

    return new Promise(resolve => {
      const record = {
        mesh,
        origin,
        frameId: null,
        done: false,
        finish: () => {
          if (record.done) return;
          record.done = true;
          try {
            if (!mesh.destroyed) {
              mesh.position.x = origin.x;
              mesh.position.y = origin.y;
            }
          } catch {
            // A destroyed/replaced renderer object cannot retain a visible offset.
          } finally {
            if (this.active.get(event.tokenId) === record) this.active.delete(event.tokenId);
            resolve(true);
          }
        }
      };
      this.active.set(event.tokenId, record);
      const started = this.now();
      const tick = timestamp => {
        if (record.done) return;
        try {
          const progress = Math.min(1, Math.max(0, (timestamp - started) / duration));
          const multiplier = event.type === "shake"
            ? interpolateKeyframes([0, -1, 1, -0.25, 0.25, 0], progress)
            : Math.sin(Math.PI * easeInOutQuart(progress));
          mesh.position.x = origin.x + (offset.x * multiplier);
          mesh.position.y = origin.y + (offset.y * multiplier);
          if (progress >= 1) record.finish();
          else record.frameId = this.requestFrame(tick);
        } catch {
          record.finish();
        }
      };
      record.frameId = this.requestFrame(tick);
    });
  }

  cancel(tokenId) {
    const record = this.active.get(tokenId);
    if (!record) return;
    if (record.frameId !== null) this.cancelFrame(record.frameId);
    record.finish();
  }

  restoreAll() {
    for (const tokenId of Array.from(this.active.keys())) this.cancel(tokenId);
  }
}

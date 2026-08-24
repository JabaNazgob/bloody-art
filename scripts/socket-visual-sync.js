const VALID_TYPES = new Set(["dodge", "shake"]);

function isValidEvent(event) {
  return Boolean(
    event
    && typeof event.eventId === "string"
    && typeof event.tokenId === "string"
    && VALID_TYPES.has(event.type)
    && Number.isFinite(Number(event.duration))
    && Number.isFinite(Number(event.offset?.x))
    && Number.isFinite(Number(event.offset?.y))
  );
}

export class SocketVisualSync {
  constructor({ socket, channel, animate, logger = console }) {
    this.socket = socket;
    this.channel = channel;
    this.animate = animate;
    this.logger = logger;
    this.seen = new Set();
    this.socket?.on?.(this.channel, payload => {
      if (payload?.type === "mesh-event") void this.receive(payload.event);
    });
  }

  remember(eventId) {
    this.seen.add(eventId);
    if (this.seen.size > 200) this.seen.delete(this.seen.values().next().value);
  }

  async receive(event) {
    if (!isValidEvent(event) || this.seen.has(event.eventId)) return false;
    this.remember(event.eventId);
    try {
      await this.animate(event);
      return true;
    } catch (error) {
      this.logger?.error?.("Bloody Art | client visual event failed", error);
      return false;
    }
  }

  async broadcast(event) {
    if (!isValidEvent(event)) return false;
    this.remember(event.eventId);
    const local = Promise.resolve().then(() => this.animate(event));
    this.socket?.emit?.(this.channel, { type: "mesh-event", event });
    try {
      await local;
      return true;
    } catch (error) {
      this.logger?.error?.("Bloody Art | local visual event failed", error);
      return false;
    }
  }
}

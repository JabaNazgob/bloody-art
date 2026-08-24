# Bloody Art 1.0.1

This release contains only centralized melee attack animation handling for Foundry VTT 13.351, D&D5e 5.2.5, Midi-QOL 13.0.61, Sequencer 4.2.3, and JB2A Premium.

It automatically listens to `midi-qol.AttackRollComplete`; no item macro is required. Supported physical impacts are bludgeoning, piercing, and slashing. Miss reactions are shield block, armor deflect, parry, dodge, clean miss, and object block. Death animation code is not loaded.

Renderer-only dodge and shake never update TokenDocument coordinates. Combat effects use Sequencer's native Effect/Sound Manager replication, while mesh-only events are replicated over the module socket and restored on completion or canvas/token lifecycle changes.

Set **Bloody Art: debug logging** in module settings to log one structured resolution record per target.

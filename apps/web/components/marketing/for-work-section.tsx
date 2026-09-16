/**
 * Layer one. Outcome first. Astrology is not the first word.
 * Do not describe Galaxia as an astrology app. See design/galaxia-voice-layers.md.
 */
export function ForWorkSection() {
  return (
    <section className="container why-not" id="for-work">
            <span className="eyebrow reveal">For people whose work is other people</span>
      <h2 className="reveal">The people you work with are not a personality quiz.</h2>
      <p className="body reveal">
        Coaches, managers, therapists, team leads. Anyone whose job is to understand someone
        well enough to help. Galaxia maps how a person is built, then gives you a way to tend
        the working relationship with more care.
      </p>
      <ul className="why-not-list">
        <li className="reveal">
          <strong>A map of how they are built.</strong>{" "}
          <span>
            Add a client, a report, a colleague. See where you flow, where you catch, and what
            they need from you when the conversation gets hard. Guidance you can use in the room.
            Not a forecast of their year.
          </span>
        </li>
        <li className="reveal">
          <strong>Private by design.</strong>{" "}
          <span>
            Notes you keep about someone are yours alone: never shown to them, never fed into a
            conversation they can see. The people in here are the ones your work depends on. We
            treat that the way it deserves.
          </span>
        </li>
        <li className="reveal">
          <strong>Same product. No special tier.</strong>{" "}
          <span>
            One honest plan, the same tools you would use for understand the people in your life. Start with 14 {/* FOUNDER-REVIEW */}
            days free. No per-person fees, no per-question charges.
          </span>
        </li>
      </ul>
    </section>
  );
}

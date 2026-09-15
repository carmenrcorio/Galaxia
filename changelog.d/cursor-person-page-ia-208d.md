## Person page information architecture (branch `cursor/person-page-ia-208d`) — 2026-09-15

**Trigger**: The person page buried the chart wheel under five prose sections, repeated Sun/Moon/Rising four times and outer planets twice, and used two nav layers whose top labels were not the same kind of thing.

`[CHANGED]` **Today sits above the tabs.** The two Now cards (Right now, Ask about them) no longer occupy a third of the top chrome. Deep links `#active-today`, `#vela-on-them`, and `?transit=1` still scroll to those cards.

`[CHANGED]` **One navigation layer, sentence case.** Living tabs are Who they are and You and them. Memorial keeps Remembrance in place of You and them. Jump pills are gone: after the wheel moved up, a second chip rail was the problem the original jump nav existed to paper over. You and them matches the living tab contents (Your record and Earlier answers).

`[CHANGED]` **Who they are order is Big three, chart wheel, placements, aspects, houses, then element and modality balance.** The wheel is collapsible, open by default, and the SVG mounts on the next animation frame so first paint is the section chrome.

`[DECISION]` **Sun/Moon/Rising stay twice: header glance line and Big three.** Big three is the authoritative reading (long copy, house, aspects). Header chips stay because they identify the person when Today or You and them is showing. Wheel chips and Sun/Moon rows in How they are wired are gone. Degree from those placement rows moved onto Big three.

`[DECISION]` **Outer planets stay once, as diamond-marked rows in How they are wired.** The standalone Their generation section is gone. Unique copy moved onto those rows: generation name and span, cohort label, "Changed sign that year", Pluto extended (era / work / figures / events), and Family Bridge. G7 relationship connections picker sits in the header, first control below the name and relation chips, on both charted and no-chart profiles.

`[CHANGED]` **Mobile person screen shares the new tab labels (sentence case) and the wheel-after-Big-three order.** It does not share the web components. It still has no G7 picker.

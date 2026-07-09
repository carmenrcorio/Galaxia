import React, { useState, useMemo } from "react";

/* ============================================================
   SIDERA CONNECT — v5 (major rework)
   Private relationship intelligence + AI-assisted astrologer.
   Reworked from two critiques: adds a temporal return-hook
   (live transits), a deep multi-turn AI advisor chat (astrology
   + practical relationship coaching), type-aware reads, privacy
   as a visual system, and parent/child guardrails (no two-way
   AI chat with minors — private parenting guidance instead).
   "You" runs on the real uploaded natal chart.
   ============================================================ */

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Inter:wght@400;500;600&display=swap');
.kd-root{ --ink:#191331; --ink2:#221945; --ink3:#2c2152; --line:#3a2f63; --gold:#E6AE6C; --gold-soft:#caa06f; --rose:#DA8C8C; --teal:#6FB1B8; --mist:#B6AAD6; --mist2:#897FB0; --cream:#F4ECDB; --shadow:rgba(8,4,22,.55); font-family:'Inter',system-ui,sans-serif; color:var(--cream); -webkit-font-smoothing:antialiased; }
.kd-stage{ min-height:100vh; width:100%; display:flex; align-items:center; justify-content:center; padding:20px 14px; background: radial-gradient(1100px 700px at 18% -8%, #3a2a63 0%, rgba(58,42,99,0) 55%), radial-gradient(900px 600px at 92% 8%, #4a2f55 0%, rgba(74,47,85,0) 50%), radial-gradient(700px 700px at 50% 120%, #2a2150 0%, rgba(42,33,80,0) 60%), #0e0a22; box-sizing:border-box; }
.kd-phone{ position:relative; width:100%; max-width:392px; height:min(812px, calc(100vh - 32px)); background:linear-gradient(180deg,#1b1438 0%, #160f30 100%); border-radius:42px; overflow:hidden; border:1px solid rgba(230,174,108,.14); box-shadow:0 40px 90px -30px var(--shadow), 0 0 0 9px #0b0719, 0 0 0 10px #211842; }
.kd-screen{ position:absolute; inset:0; display:flex; flex-direction:column; }
.kd-scroll{ flex:1; overflow-y:auto; overflow-x:hidden; }
.kd-scroll::-webkit-scrollbar{ width:0; }
.kd-stars{ position:absolute; inset:0; pointer-events:none; }
.kd-star{ position:absolute; border-radius:50%; background:#fff; animation:tw 4s ease-in-out infinite; }

.kd-wordrow{ display:flex; align-items:center; justify-content:space-between; padding:20px 22px 4px; }
.kd-word{ font-family:'Fraunces',Georgia,serif; font-size:25px; font-weight:600; font-style:italic; color:var(--gold); }
.kd-word b{ color:var(--cream); font-weight:500; font-style:normal; font-size:14px; letter-spacing:.04em; margin-left:2px; }
.kd-gear{ width:32px; height:32px; border-radius:50%; background:var(--ink2); border:1px solid var(--line); display:flex; align-items:center; justify-content:center; color:var(--mist2); }

.kd-today{ margin:8px 16px 0; background:linear-gradient(135deg,#2a1f52,#241a45); border:1px solid rgba(230,174,108,.22); border-radius:18px; padding:13px 15px; display:flex; gap:12px; align-items:flex-start; cursor:pointer; }
.kd-today .ic{ width:38px; height:38px; border-radius:12px; background:#160f30; border:1px solid var(--gold-soft); color:var(--gold); display:flex; align-items:center; justify-content:center; flex:none; font-size:17px; }
.kd-today .tx{ flex:1; }
.kd-today .lbl{ font-size:9.5px; letter-spacing:.2em; text-transform:uppercase; color:var(--gold-soft); font-weight:700; }
.kd-today p{ margin:3px 0 0; font-size:12.5px; line-height:1.45; color:var(--cream); }

.kd-jump{ display:flex; gap:8px; padding:12px 16px 2px; overflow-x:auto; }
.kd-jump::-webkit-scrollbar{ height:0; }
.kd-jchip{ flex:none; display:flex; align-items:center; gap:8px; background:var(--ink2); border:1px solid var(--line); border-radius:20px; padding:7px 12px 7px 8px; cursor:pointer; }
.kd-jchip .av{ width:22px; height:22px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:9px; font-weight:700; color:#1a1330; font-family:'Fraunces',serif; }
.kd-jchip .jt b{ font-size:11.5px; color:var(--cream); font-weight:600; } .kd-jchip .jt span{ font-size:9.5px; color:var(--mist2); }

.kd-sky{ position:relative; height:386px; margin:4px 4px 0; }
.kd-svg{ position:absolute; inset:0; width:100%; height:100%; pointer-events:none; }
.kd-node{ position:absolute; transform:translate(-50%,-50%); display:flex; flex-direction:column; align-items:center; gap:5px; background:none; border:0; cursor:pointer; padding:0; animation:rise .6s both; }
.kd-orb{ position:relative; width:54px; height:54px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-family:'Fraunces',serif; font-size:19px; color:#1a1330; font-weight:600; box-shadow:0 8px 20px -8px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,255,255,.45); transition:transform .25s ease; }
.kd-node.self .kd-orb{ width:62px; height:62px; }
.kd-orb::after{ content:""; position:absolute; inset:-5px; border-radius:50%; border:1.5px solid transparent; transition:border-color .25s, box-shadow .25s; }
.kd-node.self .kd-orb::after{ border-color:rgba(230,174,108,.45); }
.kd-node.sel .kd-orb{ transform:translateY(-2px) scale(1.07); }
.kd-node.sel .kd-orb::after{ border-color:var(--teal); box-shadow:0 0 20px -2px rgba(111,177,184,.8); }
.kd-node.active .kd-orb{ animation:pulse 2.6s ease-in-out infinite; }
.kd-glyph{ position:absolute; top:-3px; right:-3px; width:21px; height:21px; border-radius:50%; background:#160f30; border:1px solid var(--line); color:var(--mist); font-size:11px; display:flex; align-items:center; justify-content:center; }
.kd-name{ font-size:12px; color:var(--cream); font-weight:500; }
.kd-node.sel .kd-name{ color:var(--teal); }
.kd-rel{ font-size:9.5px; color:var(--mist2); margin-top:-3px; }
.kd-spark{ position:absolute; top:-7px; left:-7px; font-size:11px; }

.kd-dock{ position:absolute; left:14px; right:14px; bottom:14px; background:linear-gradient(180deg,#241a49,#1d1540); border:1px solid rgba(111,177,184,.3); border-radius:20px; padding:12px 15px; display:flex; align-items:center; gap:12px; box-shadow:0 18px 40px -18px rgba(0,0,0,.7); animation:rise .35s both; }
.kd-dock .pair{ display:flex; }
.kd-dock .mini{ width:32px; height:32px; border-radius:50%; border:2px solid #1d1540; margin-left:-9px; display:flex; align-items:center; justify-content:center; font-size:12px; color:#1a1330; font-weight:700; font-family:'Fraunces',serif; }
.kd-dock .mini:first-child{ margin-left:0; }
.kd-dock .dtxt{ flex:1; line-height:1.2; min-width:0; }
.kd-dock .dtxt b{ font-size:13px; color:var(--cream); font-weight:600; }
.kd-dock .dtxt span{ font-size:11px; color:var(--mist2); }
.kd-go{ border:0; cursor:pointer; border-radius:14px; padding:10px 14px; background:linear-gradient(180deg,#eebd7e,#e0a35c); color:#2a1c08; font-weight:600; font-size:12px; white-space:nowrap; }
.kd-ghost{ border:1px solid var(--line); background:var(--ink); color:var(--cream); border-radius:14px; padding:10px 13px; font-size:12px; cursor:pointer; white-space:nowrap; }

.kd-cbar{ display:flex; align-items:center; gap:12px; padding:18px 18px 6px; }
.kd-back{ width:36px; height:36px; border-radius:50%; background:var(--ink2); border:1px solid var(--line); color:var(--cream); display:flex; align-items:center; justify-content:center; cursor:pointer; flex:none; }
.kd-chead{ flex:1; min-width:0; }
.kd-chead .lbl{ font-size:10px; letter-spacing:.18em; text-transform:uppercase; color:var(--gold-soft); font-weight:600; }
.kd-chead .who{ font-family:'Fraunces',serif; font-size:20px; color:var(--cream); font-weight:500; line-height:1.1; }
.kd-pad{ padding:12px 20px 28px; }
.kd-section{ margin:22px 0 0; }
.kd-stitle{ font-size:10.5px; letter-spacing:.2em; text-transform:uppercase; color:var(--mist2); font-weight:600; margin-bottom:11px; display:flex; align-items:center; gap:8px; }
.kd-stitle::after{ content:""; flex:1; height:1px; background:linear-gradient(90deg,var(--line),transparent); }
.kd-priv-tag{ font-size:9px; letter-spacing:.08em; color:var(--mist2); font-weight:600; display:inline-flex; align-items:center; gap:4px; }

.kd-phero{ display:flex; flex-direction:column; align-items:center; text-align:center; padding:4px 0 2px; }
.kd-pname{ font-family:'Fraunces',serif; font-size:25px; color:var(--cream); font-weight:500; margin-top:4px; }
.kd-pmeta{ font-size:12.5px; color:var(--mist); margin-top:2px; }
.kd-psrc{ font-size:11px; color:var(--mist2); margin-top:5px; }
.kd-three{ display:flex; gap:9px; margin-top:6px; }
.kd-tcell{ flex:1; background:var(--ink2); border:1px solid var(--line); border-radius:16px; padding:12px 8px; text-align:center; }
.kd-tcell .ic{ font-size:19px; color:var(--gold-soft); }
.kd-tcell .rl{ font-size:9px; letter-spacing:.12em; text-transform:uppercase; color:var(--mist2); font-weight:600; margin-top:4px; }
.kd-tcell .sg{ font-size:13px; color:var(--cream); font-weight:600; margin-top:2px; }

.kd-baltitle{ font-size:11.5px; color:var(--mist); margin:0 0 9px; }
.kd-balrow{ display:flex; gap:7px; margin-bottom:13px; }
.kd-balseg{ flex:1; text-align:center; }
.kd-balbar{ height:42px; border-radius:8px; display:flex; align-items:flex-end; justify-content:center; background:var(--ink3); overflow:hidden; position:relative; }
.kd-balfill{ width:100%; border-radius:8px 8px 0 0; animation:grow2 .8s ease both; }
.kd-ballab{ font-size:9.5px; color:var(--mist); margin-top:5px; }
.kd-baln{ font-size:11px; color:var(--cream); font-weight:600; position:absolute; top:4px; left:0; right:0; }

.kd-place{ display:flex; align-items:flex-start; gap:12px; padding:12px 2px; border-bottom:1px solid rgba(58,47,99,.5); }
.kd-place:last-child{ border-bottom:0; }
.kd-pgly{ width:38px; height:38px; border-radius:11px; background:var(--ink2); border:1px solid var(--line); display:flex; align-items:center; justify-content:center; font-size:18px; color:var(--gold-soft); flex:none; }
.kd-pmid{ flex:1; min-width:0; }
.kd-ptop{ display:flex; align-items:baseline; gap:7px; flex-wrap:wrap; }
.kd-pbody{ font-size:14px; color:var(--cream); font-weight:600; }
.kd-phouse{ font-size:10px; color:var(--gold-soft); background:rgba(230,174,108,.12); border-radius:6px; padding:2px 7px; font-weight:600; }
.kd-pvibe{ font-size:12px; color:var(--mist); margin-top:3px; line-height:1.45; }

.kd-hgrid{ display:grid; grid-template-columns:1fr 1fr; gap:8px; }
.kd-hcell{ display:flex; align-items:center; gap:9px; background:var(--ink2); border:1px solid var(--line); border-radius:12px; padding:9px 11px; }
.kd-hnum{ font-family:'Fraunces',serif; font-size:13px; color:var(--gold-soft); width:24px; flex:none; }
.kd-hsign{ font-size:12.5px; color:var(--cream); }
.kd-hsign .gl{ color:var(--mist); margin-right:5px; }
.kd-harea{ font-size:9.5px; color:var(--mist2); }

.kd-asp{ display:flex; align-items:center; gap:12px; padding:11px 4px; border-bottom:1px solid rgba(58,47,99,.5); }
.kd-asp:last-child{ border-bottom:0; }
.kd-aspg{ font-size:15px; color:var(--mist); width:56px; text-align:center; flex:none; letter-spacing:2px; }
.kd-aspm{ flex:1; } .kd-aspm b{ font-size:12.5px; color:var(--cream); font-weight:600; } .kd-aspm span{ font-size:11.5px; color:var(--mist); display:block; line-height:1.4; margin-top:1px; }
.kd-asptag{ font-size:9px; letter-spacing:.1em; text-transform:uppercase; font-weight:700; padding:3px 7px; border-radius:6px; flex:none; }

.kd-note{ background:var(--ink); border:1px dashed var(--line); border-radius:14px; padding:12px 14px; font-size:13px; color:var(--mist); line-height:1.5; }
.kd-note .meta{ font-size:10.5px; color:var(--mist2); margin-top:7px; letter-spacing:.04em; }
.kd-addnote{ margin-top:10px; display:flex; align-items:center; gap:8px; color:var(--gold-soft); font-size:12.5px; cursor:pointer; }
.kd-lockchip{ display:inline-flex; align-items:center; gap:5px; background:rgba(111,177,184,.12); border:1px solid rgba(111,177,184,.3); color:var(--teal); border-radius:8px; padding:3px 8px; font-size:10px; font-weight:600; }

.kd-bondchips{ display:flex; gap:9px; overflow-x:auto; padding-bottom:4px; }
.kd-bondchips::-webkit-scrollbar{ height:0; }
.kd-bchip{ flex:none; width:74px; display:flex; flex-direction:column; align-items:center; gap:5px; cursor:pointer; }
.kd-bchip .bd{ width:48px; height:48px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:17px; font-weight:700; color:#1a1330; font-family:'Fraunces',serif; box-shadow:inset 0 1px 0 rgba(255,255,255,.35); }
.kd-bchip .bn{ font-size:11px; color:var(--cream); font-weight:500; } .kd-bchip .br{ font-size:9px; color:var(--mist2); margin-top:-3px; }

.kd-typechip{ display:inline-flex; align-items:center; gap:7px; background:var(--ink2); border:1px solid var(--line); color:var(--gold-soft); border-radius:20px; padding:6px 12px; font-size:11.5px; font-weight:600; cursor:pointer; }
.kd-typeframe{ font-size:11.5px; color:var(--mist); text-align:center; margin-top:9px; line-height:1.4; font-style:italic; }
.kd-faces{ display:flex; align-items:center; justify-content:center; margin:12px 0 14px; }
.kd-bigorb{ width:72px; height:72px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-family:'Fraunces',serif; font-size:25px; color:#1a1330; font-weight:600; box-shadow:0 10px 24px -10px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,255,255,.4); }
.kd-link{ width:78px; height:2px; position:relative; margin:0 -8px; z-index:2; }
.kd-link span{ position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); background:#160f30; border:1px solid var(--line); border-radius:20px; font-size:10px; padding:3px 8px; color:var(--mist); white-space:nowrap; }
.kd-read{ font-family:'Fraunces',serif; font-size:18px; line-height:1.5; color:#efe6d4; text-align:center; margin:2px 6px 0; font-style:italic; }
.kd-read em{ color:var(--gold); }

.kd-dim{ margin-bottom:11px; cursor:pointer; }
.kd-dim .row{ display:flex; justify-content:space-between; align-items:center; font-size:12.5px; margin-bottom:6px; }
.kd-dim .k{ color:var(--cream); } .kd-dim .d{ font-weight:600; font-size:12px; }
.kd-track{ height:6px; border-radius:6px; background:var(--ink3); overflow:hidden; }
.kd-fill{ height:100%; border-radius:6px; animation:grow .8s ease both; }
.kd-why{ font-size:11.5px; color:var(--mist); line-height:1.45; margin-top:7px; padding-left:2px; animation:fade .3s both; }

.kd-card{ background:var(--ink2); border:1px solid var(--line); border-radius:18px; padding:15px 16px; margin-bottom:12px; }
.kd-card h4{ margin:0 0 7px; font-size:13px; font-weight:600; display:flex; align-items:center; gap:8px; }
.kd-card p{ margin:0; font-size:13px; line-height:1.55; color:var(--mist); }
.kd-dot{ width:7px; height:7px; border-radius:50%; flex:none; }
.kd-dir{ background:linear-gradient(180deg,#241a49,#1e1641); border:1px solid var(--line); border-radius:18px; padding:15px 16px; margin-bottom:12px; }
.kd-dir .arrow{ font-size:11px; color:var(--gold-soft); letter-spacing:.04em; font-weight:600; margin-bottom:8px; }
.kd-dir p{ margin:0 0 8px; font-size:13px; line-height:1.55; color:var(--cream); }
.kd-dir p:last-child{ margin-bottom:0; }
.kd-reveal{ width:100%; display:flex; align-items:center; justify-content:space-between; background:var(--ink2); border:1px solid var(--line); border-radius:14px; padding:13px 15px; color:var(--cream); font-size:12.5px; font-weight:600; cursor:pointer; }
.kd-reveal .t{ display:flex; align-items:center; gap:9px; }

.kd-cta{ width:100%; display:flex; align-items:center; gap:13px; text-align:left; border-radius:18px; padding:14px 15px; cursor:pointer; margin-bottom:10px; }
.kd-cta.primary{ background:linear-gradient(135deg,#eebd7e,#e0a35c); color:#2a1c08; border:0; }
.kd-cta.secondary{ background:linear-gradient(180deg,#241a49,#1e1641); border:1px solid rgba(111,177,184,.3); color:var(--cream); }
.kd-cta .ic{ width:42px; height:42px; border-radius:12px; display:flex; align-items:center; justify-content:center; flex:none; }
.kd-cta.primary .ic{ background:rgba(42,28,8,.16); color:#2a1c08; }
.kd-cta.secondary .ic{ background:#160f30; border:1px solid var(--teal); color:var(--teal); }
.kd-cta .t{ flex:1; } .kd-cta .t b{ font-size:13.5px; font-weight:600; display:block; } .kd-cta .t span{ font-size:11px; line-height:1.4; display:block; margin-top:2px; opacity:.85; }
.kd-minornote{ font-size:11.5px; color:var(--mist); background:var(--ink2); border:1px solid var(--line); border-radius:14px; padding:12px 14px; line-height:1.5; display:flex; gap:9px; align-items:flex-start; }

/* CHAT */
.kd-chat{ flex:1; display:flex; flex-direction:column; min-height:0; }
.kd-modetag{ display:inline-flex; align-items:center; gap:6px; font-size:9.5px; letter-spacing:.1em; text-transform:uppercase; font-weight:700; padding:3px 9px; border-radius:8px; margin-top:5px; }
.kd-modetag.ask{ background:rgba(111,177,184,.14); border:1px solid rgba(111,177,184,.3); color:var(--teal); }
.kd-modetag.shared{ background:rgba(230,174,108,.14); border:1px solid rgba(230,174,108,.3); color:var(--gold); }
.kd-msgs{ flex:1; min-height:0; overflow-y:auto; padding:12px 16px 4px; display:flex; flex-direction:column; gap:11px; }
.kd-msgs::-webkit-scrollbar{ width:0; }
.kd-mrow{ display:flex; gap:8px; align-items:flex-end; max-width:90%; animation:fade .3s both; }
.kd-mrow.me{ align-self:flex-end; flex-direction:row-reverse; }
.kd-mav{ width:26px; height:26px; border-radius:50%; flex:none; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:700; color:#1a1330; font-family:'Fraunces',serif; }
.kd-mav.ai{ background:#160f30; border:1px solid var(--gold-soft); color:var(--gold); }
.kd-bub{ padding:10px 13px; border-radius:16px; font-size:13px; line-height:1.52; }
.kd-bub.them{ background:var(--ink2); border:1px solid var(--line); color:var(--cream); border-bottom-left-radius:5px; }
.kd-bub.me{ background:linear-gradient(180deg,#eebd7e,#e0a35c); color:#2a1c08; border-bottom-right-radius:5px; font-weight:500; }
.kd-bub.ai{ background:linear-gradient(180deg,#241a49,#1e1641); border:1px solid rgba(230,174,108,.3); color:#ece3d2; border-bottom-left-radius:5px; }
.kd-bub.ai i{ color:var(--gold-soft); font-style:italic; }
.kd-ailbl{ font-size:9px; letter-spacing:.14em; text-transform:uppercase; color:var(--gold-soft); font-weight:700; margin-bottom:4px; }
.kd-chips{ display:flex; flex-wrap:wrap; gap:7px; padding:4px 16px 6px; }
.kd-qchip{ background:var(--ink2); border:1px solid var(--line); color:var(--mist); border-radius:20px; padding:8px 12px; font-size:12px; cursor:pointer; line-height:1.2; transition:border-color .2s; }
.kd-qchip:hover{ border-color:var(--gold-soft); color:var(--cream); }
.kd-priv{ font-size:10.5px; color:var(--mist2); text-align:center; padding:7px 16px; display:flex; align-items:center; justify-content:center; gap:6px; line-height:1.4; border-top:1px solid var(--line); }
.kd-cinput{ display:flex; gap:9px; align-items:center; padding:10px 14px 14px; background:#160f30; }
.kd-cinput input{ flex:1; background:var(--ink2); border:1px solid var(--line); border-radius:20px; padding:11px 15px; color:var(--cream); font-size:13px; outline:none; }
.kd-cinput input::placeholder{ color:var(--mist2); }
.kd-csend{ width:40px; height:40px; border-radius:50%; border:0; cursor:pointer; background:linear-gradient(180deg,#eebd7e,#e0a35c); color:#2a1c08; display:flex; align-items:center; justify-content:center; flex:none; }

/* consent gate */
.kd-consent{ flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; padding:30px 30px; }
.kd-consent .ring{ width:90px; height:90px; border-radius:50%; border:1px solid rgba(230,174,108,.4); display:flex; align-items:center; justify-content:center; margin-bottom:20px; }
.kd-consent h3{ font-family:'Fraunces',serif; font-size:21px; font-weight:500; color:var(--cream); margin:0 0 10px; }
.kd-consent p{ font-size:13px; color:var(--mist); line-height:1.6; margin:0 0 8px; }
.kd-consent .pts{ text-align:left; margin:16px 0 22px; display:flex; flex-direction:column; gap:11px; width:100%; }
.kd-consent .pt{ display:flex; gap:10px; align-items:flex-start; font-size:12.5px; color:var(--cream); line-height:1.45; }
.kd-consent .pt .pi{ color:var(--teal); flex:none; margin-top:1px; }
.kd-enter{ width:100%; border:0; cursor:pointer; border-radius:16px; padding:14px; background:linear-gradient(180deg,#eebd7e,#e0a35c); color:#2a1c08; font-weight:600; font-size:14px; }

@keyframes tw{ 0%,100%{opacity:.15} 50%{opacity:.9} }
@keyframes rise{ from{opacity:0; transform:translate(-50%,calc(-50% + 8px))} to{opacity:1} }
@keyframes grow{ from{width:0 !important} }
@keyframes grow2{ from{height:0 !important} }
@keyframes fade{ from{opacity:0; transform:translateY(4px)} to{opacity:1} }
@keyframes pulse{ 0%,100%{box-shadow:0 8px 20px -8px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,255,255,.45), 0 0 0 0 rgba(111,177,184,0)} 50%{box-shadow:0 8px 20px -8px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,255,255,.45), 0 0 18px 3px rgba(111,177,184,.6)} }
@media (prefers-reduced-motion: reduce){ *{ animation:none !important; } }
`;

const ORDER=["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];
const SIGN={ Aries:{g:"\u2648",el:"fire",mo:"cardinal"},Taurus:{g:"\u2649",el:"earth",mo:"fixed"},Gemini:{g:"\u264A",el:"air",mo:"mutable"},Cancer:{g:"\u264B",el:"water",mo:"cardinal"},Leo:{g:"\u264C",el:"fire",mo:"fixed"},Virgo:{g:"\u264D",el:"earth",mo:"mutable"},Libra:{g:"\u264E",el:"air",mo:"cardinal"},Scorpio:{g:"\u264F",el:"water",mo:"fixed"},Sagittarius:{g:"\u2650",el:"fire",mo:"mutable"},Capricorn:{g:"\u2651",el:"earth",mo:"cardinal"},Aquarius:{g:"\u2652",el:"air",mo:"fixed"},Pisces:{g:"\u2653",el:"water",mo:"mutable"} };
const VIBE={ Aries:"bold, fast, all-in",Taurus:"steady, sensual, immovable",Gemini:"quick, curious, talkative",Cancer:"tender, protective, remembers everything",Leo:"warm, proud, generous",Virgo:"precise, caring through usefulness",Libra:"fair, charming, seeks balance",Scorpio:"intense, private, all-or-nothing",Sagittarius:"restless, honest, big-picture",Capricorn:"disciplined, ambitious, quietly loyal",Aquarius:"independent, inventive, principled",Pisces:"dreamy, compassionate, absorbent" };
const EL_GRAD={ fire:"linear-gradient(135deg,#F0A368,#DC6E5F)",earth:"linear-gradient(135deg,#D8B873,#9DAE6E)",air:"linear-gradient(135deg,#D2B0E6,#9FA8E6)",water:"linear-gradient(135deg,#79BEC8,#7193CE)" };
const EL_SOLID={ fire:"#E0825C",earth:"#B6A86A",air:"#B79AD8",water:"#6FB1B8" };
const EL_WAY={ fire:"moves fast and says it out loud",earth:"is steady and shows love by showing up",air:"lives in their head and needs to talk it through",water:"feels everything first and needs to feel safe" };
const EL_STRESS={ fire:"space to burn it off, then a quick reset",earth:"patience and practical help, not pressure",air:"to talk it all the way through",water:"reassurance and quiet closeness" };
const PLANET={ Sun:{g:"\u2609",role:"Identity & vitality"},Moon:{g:"\u263D",role:"Emotional needs & inner world"},Mercury:{g:"\u263F",role:"Mind & communication"},Venus:{g:"\u2640",role:"Love, values & taste"},Mars:{g:"\u2642",role:"Drive & desire"},Jupiter:{g:"\u2643",role:"Growth & luck"},Saturn:{g:"\u2644",role:"Discipline & limits"},Uranus:{g:"\u2645",role:"Individuality & change"},Neptune:{g:"\u2646",role:"Dreams & spirituality"},Pluto:{g:"\u2647",role:"Power & transformation"} };
const HOUSE_AREA=["self & identity","money & values","communication & siblings","home & roots","creativity & romance","work & health","partnership","intimacy & transformation","beliefs & travel","career & reputation","friends & community","solitude & the unconscious"];
const el=(s)=>SIGN[s].el; const ini=(n)=>(n==="You"?"Y":n.slice(0,1)); const cap=(s)=>s.charAt(0).toUpperCase()+s.slice(1); const idx=(s)=>ORDER.indexOf(s);

const BASE=[
  { id:"you",   name:"You",   rel:"self",     minor:false, x:50, y:50, sun:"Aries",     moon:"Cancer",   rising:"Aries",    venus:"Pisces",   mars:"Taurus" },
  { id:"sofia", name:"Sofia", rel:"daughter", minor:true,  age:16, x:24, y:27, sun:"Capricorn", moon:"Virgo",    rising:"Scorpio",  venus:"Aquarius", mars:"Capricorn" },
  { id:"rosa",  name:"Rosa",  rel:"your mom", minor:false, x:48, y:14, sun:"Cancer",    moon:"Pisces",   rising:"Cancer",   venus:"Gemini",   mars:"Leo" },
  { id:"daniel",name:"Daniel",rel:"partner",  minor:false, x:79, y:31, sun:"Libra",     moon:"Aquarius", rising:"Gemini",   venus:"Scorpio",  mars:"Sagittarius" },
  { id:"mateo", name:"Mateo", rel:"son",      minor:true,  age:12, x:82, y:64, sun:"Leo",       moon:"Aries",    rising:"Leo",      venus:"Cancer",   mars:"Gemini" },
  { id:"luna",  name:"Luna",  rel:"daughter", minor:true,  age:9,  x:21, y:67, sun:"Pisces",    moon:"Taurus",   rising:"Libra",    venus:"Aries",    mars:"Pisces" },
  { id:"eli",   name:"Eli",   rel:"son",      minor:true,  age:7,  x:55, y:82, sun:"Gemini",    moon:"Libra",    rising:"Sagittarius", venus:"Taurus", mars:"Aries" },
];
const byId=(id)=>BASE.find(p=>p.id===id);

const YOU_CHART={ planets:[{body:"Sun",sign:"Aries",house:1},{body:"Moon",sign:"Cancer",house:4},{body:"Mercury",sign:"Taurus",house:1},{body:"Venus",sign:"Pisces",house:12},{body:"Mars",sign:"Taurus",house:2},{body:"Jupiter",sign:"Libra",house:7},{body:"Saturn",sign:"Sagittarius",house:9},{body:"Uranus",sign:"Aries",house:1},{body:"Neptune",sign:"Pisces",house:12},{body:"Pluto",sign:"Capricorn",house:10}],
  houses:["Aries","Taurus","Gemini","Cancer","Cancer","Leo","Libra","Scorpio","Sagittarius","Capricorn","Capricorn","Aquarius"], asc:"Aries", mc:"Capricorn",
  aspects:[{a:"Sun",b:"Uranus",type:"conjunction",h:true},{a:"Sun",b:"Ascendant",type:"conjunction",h:true},{a:"Sun",b:"Moon",type:"square",h:false},{a:"Sun",b:"Jupiter",type:"opposition",h:false},{a:"Sun",b:"Pluto",type:"square",h:false},{a:"Moon",b:"Neptune",type:"trine",h:true},{a:"Moon",b:"Midheaven",type:"opposition",h:false},{a:"Mercury",b:"Saturn",type:"trine",h:true},{a:"Mercury",b:"Uranus",type:"conjunction",h:true},{a:"Venus",b:"Saturn",type:"square",h:false},{a:"Venus",b:"Ascendant",type:"conjunction",h:true},{a:"Mars",b:"Pluto",type:"trine",h:true},{a:"Saturn",b:"Uranus",type:"trine",h:true},{a:"Saturn",b:"Midheaven",type:"conjunction",h:true}] };

function seeded(s){ let h=0; for(let i=0;i<s.length;i++) h=(h*131+s.charCodeAt(i))%9973; return ()=>{ h=(h*131+7)%9973; return h/9973; }; }
function buildChart(p){
  if(p.id==="you") return YOU_CHART;
  const rnd=seeded(p.id); const pick=()=>ORDER[Math.floor(rnd()*12)]; const r=idx(p.rising);
  const houseSign=(h)=>ORDER[(r+h-1)%12]; const houseOf=(sign)=>((idx(sign)-r+12)%12)+1;
  const set=[{body:"Sun",sign:p.sun},{body:"Moon",sign:p.moon},{body:"Mercury",sign:p.sun},{body:"Venus",sign:p.venus},{body:"Mars",sign:p.mars},{body:"Jupiter",sign:pick()},{body:"Saturn",sign:pick()},{body:"Uranus",sign:pick()},{body:"Neptune",sign:pick()},{body:"Pluto",sign:pick()}].map(x=>({...x,house:houseOf(x.sign)}));
  const houses=Array.from({length:12},(_,i)=>houseSign(i+1));
  const pairs=[["Sun","Moon"],["Sun","Venus"],["Sun","Mars"],["Sun","Saturn"],["Moon","Venus"],["Moon","Mars"],["Venus","Mars"],["Mars","Jupiter"]];
  const bySign=Object.fromEntries(set.map(x=>[x.body,x.sign]));
  const M={0:{type:"conjunction",h:true},2:{type:"sextile",h:true},3:{type:"square",h:false},4:{type:"trine",h:true},6:{type:"opposition",h:false}};
  const aspects=pairs.map(([a,b])=>{ const d=Math.abs(idx(bySign[a])-idx(bySign[b])); const dd=Math.min(d,12-d); const m=M[dd]; return m?{a,b,type:m.type,h:m.h}:null; }).filter(Boolean).slice(0,7);
  return { planets:set, houses, asc:p.rising, mc:houseSign(10), aspects };
}
const ASPGLY={conjunction:"\u260C",sextile:"\u26B9",square:"\u25A1",trine:"\u25B3",opposition:"\u260D"};
const ASPLINE={conjunction:"fused — one charged focus",sextile:"easy, supportive talent",square:"inner friction that drives growth",trine:"natural, effortless gift",opposition:"a balancing act, pulled two ways"};
function balance(chart){ const E={fire:0,earth:0,air:0,water:0}, M={cardinal:0,fixed:0,mutable:0}; chart.planets.forEach(p=>{ E[SIGN[p.sign].el]++; M[SIGN[p.sign].mo]++; }); return {E,M}; }

/* ---- transit return-hook (mocked, rotates daily) ---- */
const TRANSITS=[
  { ic:"\u2642", who:"sofia", text:"Mars is grinding through your 4th house — home, and where Sofia lives. Friction runs hot this week; catch yourself before you react." },
  { ic:"\u2640", who:"daniel", text:"Venus is lighting your 7th house of partnership. A soft, open window with Daniel — say the tender thing out loud while it's easy." },
  { ic:"\u263F", who:"eli", text:"Mercury is buzzing through your 3rd house of talk. Eli is extra curious and chatty right now — a great few days to really listen." },
  { ic:"\u263D", who:"rosa", text:"The Moon drifts through your 12th — quiet, nostalgic, a little tender. A good day to check in on Rosa." },
];
const todayTransit=()=>TRANSITS[(new Date().getDate())%TRANSITS.length];
const THREADS=[{ a:"you", b:"daniel", days:3, topic:"communication pace", mode:"shared" }];

/* ---- scoring ---- */
function elementEase(a,b){ if(a===b)return 86; const comp=(x,y)=>(x==="fire"&&y==="air")||(x==="air"&&y==="fire")||(x==="earth"&&y==="water")||(x==="water"&&y==="earth"); if(comp(a,b))return 80; const hard=(x,y)=>(x==="fire"&&y==="water")||(x==="water"&&y==="fire"); if(hard(a,b))return 49; return 60; }
function hh(s){ let h=0; for(let i=0;i<s.length;i++) h=(h*31+s.charCodeAt(i))%97; return h; }
const clamp=(n)=>Math.max(34,Math.min(95,Math.round(n)));
function scores(a,b){ const ea=el(a.sun),eb=el(b.sun); const base=elementEase(ea,eb); const k=hh(a.id+b.id); return { emotional:clamp(base+(k%13)-6+((el(a.moon)===el(b.moon))?8:0)), communication:clamp(base+((k>>1)%15)-7+((ea==="air"||eb==="air")?7:0)), warmth:clamp(base+((k>>2)%13)-5+((el(a.venus)===el(b.venus))?6:0)), values:clamp(base+((k>>3)%15)-7), stability:clamp(base+((k>>4)%13)-6+((ea==="earth"||eb==="earth")?6:0)) }; }
const compositeScore=(a,b)=>{ const s=scores(a,b); return Math.round(Object.values(s).reduce((x,y)=>x+y,0)/5); };
const lineColor=(v)=> v>=72?"#E6AE6C": v>=56?"#7d6fa8":"#DA8C8C";

const DIMS=["emotional","communication","warmth","values","stability"];
const DIM_LABEL={emotional:"Emotional ease",communication:"Communication",warmth:"Warmth",values:"Shared values",stability:"Stability"};
function sdesc(dim,v){
  const hi={emotional:"Effortless",communication:"In sync",warmth:"Easy & warm",values:"Aligned",stability:"Rock-steady"};
  const mid={emotional:"Warm, with effort",communication:"Workable",warmth:"Tender",values:"Mostly aligned",stability:"Holds, mostly"};
  const lo={emotional:"A tender spot",communication:"Different wavelengths",warmth:"Slow to spark",values:"Different priorities",stability:"Still finding rhythm"};
  if(v>=76) return {w:hi[dim],c:"#E6AE6C"}; if(v>=58) return {w:mid[dim],c:"#caa06f"}; return {w:lo[dim],c:"#DA8C8C"};
}
function swhy(a,b,dim){
  const W={
    emotional:`${a.moon} Moon meets ${b.moon} Moon — ${el(a.moon)===el(b.moon)?"you soothe each other almost instinctively":"you comfort in different languages, so spell out what 'support' means to each of you"}.`,
    communication:`${a.sun} and ${b.sun} minds — ${(el(a.sun)==="air"||el(b.sun)==="air")?"ideas move quickly between you":"you process at different speeds; slow down and say the unsaid part"}.`,
    warmth:`${a.venus} Venus and ${b.mars} Mars — ${el(a.venus)===el(b.mars)?"affection comes easily and reads clearly":"you each feel wanted in different ways; name yours out loud"}.`,
    values:`What you each prize runs ${el(a.sun)===el(b.sun)?"parallel — easy to back each other":"on different tracks — worth comparing early, not in a fight"}.`,
    stability:`${(el(a.sun)==="earth"||el(b.sun)==="earth")?"There's earth here — a real anchor under you":"Lots of motion, less ballast — build small shared routines to steady it"}.`,
  };
  return W[dim];
}

/* ---- relationship type ---- */
const REL_TYPES=["Partners","Mother & child","Siblings","Close friends","Mentor & mentee","Family"];
function detectType(a,b){ const has=(r)=>a.rel===r||b.rel===r; if(has("partner"))return "Partners"; if(has("self")&&(has("daughter")||has("son")))return "Mother & child"; if(has("self")&&has("your mom"))return "Mother & child"; if((a.rel==="daughter"||a.rel==="son")&&(b.rel==="daughter"||b.rel==="son"))return "Siblings"; return "Family"; }
const TYPE_FRAME={ "Partners":"Read as partners — about the bond you actively choose to keep.","Mother & child":"Read as parent & child — about guiding and understanding, not matching as equals.","Siblings":"Read as siblings — shared roots, built-in rivalry, lifelong loyalty.","Close friends":"Read as close friends — chosen family, low obligation, high trust.","Mentor & mentee":"Read as mentor & mentee — one steadies, one stretches.","Family":"Read as family — ties you didn't choose but live with." };
function dirSuffix(type){ return type==="Mother & child"?" as their parent":type==="Partners"?" as their partner":type==="Siblings"?" as their sibling":type==="Mentor & mentee"?" as their mentor":""; }

/* ---- hand-written pair content ---- */
const HERO={
  "you-sofia":{ aspect:"Sun square Sun", read:"Two cardinal forces who <em>respect each other more than either will admit</em> — and lock horns precisely because you're so alike.",
    align:"You both go all-in. Neither quits, neither does anything halfway, and under the friction is real respect for effort and follow-through. On the same side, you're unstoppable.",
    friction:"You both want to lead. You move fast and out loud; she plans quietly and digs in. Your push reads as pressure; her silence reads as defiance. Same strength, two directions.",
    aTitle:"What Sofia needs from you", aBody:["Acknowledge the plan before you correct it — she's already three steps ahead and needs that seen.","Give her room to do it her way. Capricorn shows love through reliability, not words — trust the follow-through over the eye-roll."],
    bTitle:"What you need from Sofia", bBody:["Patience with your pace — you decide at full speed, and that's how you think, not impulsiveness.","A little directness back. You'd rather hear it than feel her go quiet."],
    note:"She actually opens up on drives — no eye contact, low stakes. Save the big talks for the car." },
  "you-daniel":{ aspect:"Sun opposite-ish Sun", read:"Fire meets air — you <em>spark him to life and he gives you somewhere to land</em>; the trick is not mistaking his calm for distance.",
    align:"Aries and Libra are natural opposites that complete each other: you bring heat and decisiveness, he brings grace and perspective. He talks you down; you light him up. People feel the warmth between you.",
    friction:"You confront; he smooths. When you push for it now, his Libra instinct is to keep the peace — so he placates instead of engaging, and you feel managed instead of met.",
    aTitle:"What Daniel needs from you", aBody:["Lead with the feeling, not the verdict — Libra freezes when it feels judged, opens when it feels invited.","Let him take a beat. Silence from him is processing, not withdrawal."],
    bTitle:"What you need from Daniel", bBody:["A real answer, not a peacekeeping one. Tell him 'I'd rather we disagree than skate past it.'","Initiative sometimes — you carry the spark, and you want to be pursued too."],
    note:"He decides better after sleeping on it. Don't force the answer in the heat of the moment." },
  "you-rosa":{ aspect:"Moon conjunct Sun", read:"Your Cancer Moon and her Cancer Sun beat in the <em>same key</em> — a deep, wordless understanding that can tip into over-enmeshment.",
    align:"You feel each other instantly — same emotional language, same long memory, same fierce loyalty to family. When one of you is hurting, the other knows before a word is said.",
    friction:"Two Cancers means two long memories and two soft shells. Old hurts get re-litigated; guilt becomes the currency. Closeness can quietly turn into obligation.",
    aTitle:"What Rosa needs from you", aBody:["Reassurance that the bond is safe even when you set a boundary — she reads distance as rejection.","Let her care for you sometimes; being needed is how she loves."],
    bTitle:"What you need from Rosa", bBody:["Room to be your own household without it feeling like a betrayal.","Directness over hints — you both hint, and then both feel unseen."],
    note:"Guilt is the tell. When the conversation turns to guilt, name it gently and it loses its grip." },
  "you-mateo":{ aspect:"Sun trine Sun", read:"Two fire hearts — <em>this one's mostly joy</em>. He's your easiest mirror: proud, warm, and wired a lot like you.",
    align:"Aries and Leo just get each other — playful, big-feeling, generous, quick to forgive. He wants to be seen and celebrated, and that comes naturally to you.",
    friction:"Two big flames in one room. Pride bruises easily on both sides, and a small slight can flare into a standoff before either of you means it to.",
    aTitle:"What Mateo needs from you", aBody:["Praise that's specific and out loud — Leo runs on genuine, witnessed pride.","Never shame him in front of others; correct the Lion in private and he'll do anything for you."],
    bTitle:"What you need from Mateo", bBody:["To let the small stuff go before it becomes a battle of wills.","A beat of cool-down — you both run hot, so give the flare a minute to pass."],
    note:"Catch him being great in front of someone he admires. It lands ten times harder." },
  "sofia-mateo":{ aspect:"Earth square Fire", read:"Capricorn and Leo — <em>the planner and the performer</em>. She thinks he's reckless; he thinks she's a buzzkill. Both are wrong, and both are a little right.",
    align:"When they team up, she brings the plan and he brings the spark — genuinely formidable. Underneath the sibling friction is real loyalty; they'd defend each other instantly to anyone else.",
    friction:"Her steady control collides with his need for the spotlight. She withholds approval; he gets louder to earn it. Classic earth-vs-fire sibling tug.",
    aTitle:"What Mateo needs from Sofia", aBody:["A little visible approval — he's loud because he's not sure she rates him.","To not be managed like a project."],
    bTitle:"What Sofia needs from Mateo", bBody:["To respect that her plan is how she shows she cares.","Less chaos when she's trying to focus."],
    note:"They do best with separate lanes and a shared goal — give them one thing to win at together." },
};
function generic(a,b,sc){ const ea=el(a.sun),eb=el(b.sun); const overall=compositeScore(a,b); const ease=overall>=74?"an easy, natural current":overall>=58?"a warm connection with real texture":"a deep bond that rewards the work you put in"; const ent=DIMS.map(d=>[d,sc[d]]); const hi=ent.slice().sort((x,y)=>y[1]-x[1])[0][0]; const lo=ent.slice().sort((x,y)=>x[1]-y[1])[0][0]; const HIW={emotional:"an instinctive read on each other's moods",communication:"a quick, in-sync way of talking",warmth:"genuine, easy affection",values:"a shared sense of what matters",stability:"a steady, dependable base"}; const LOW={emotional:"reading each other's moods",communication:"landing on the same wavelength when it counts",warmth:"showing the warmth you both feel",values:"wanting different things at different speeds",stability:"finding a shared rhythm"}; return { aspect:ea===eb?"Shared element":"Cross-element", read:`${a.name} and ${b.name} share <em>${ease}</em>.`, align:`Where it flows: ${HIW[hi]}. ${ea===eb?`Two ${ea} natures — you recognize yourselves in each other.`:`${cap(ea)} and ${eb} bring different instincts that can balance each other.`}`, friction:`Where it catches: ${LOW[lo]}. Worth naming early rather than letting it quietly build.`, aTitle:`What ${b.name} needs from you`, aBody:[`${cap(b.name)} ${EL_WAY[eb]} — so meet that first.`,`When stressed, ${b.name} wants ${EL_STRESS[eb]}.`], bTitle:`What you need from ${b.name}`, bBody:[`You ${EL_WAY[ea]} — name it so it isn't misread.`,`A little patience when your styles diverge.`], note:null }; }

function aspectOf(s1,s2){ const d=Math.abs(idx(s1)-idx(s2)); const dd=Math.min(d,12-d); const M={0:{n:"conjunction",g:"\u260C",h:true,l:"run on the same channel"},2:{n:"sextile",g:"\u26B9",h:true,l:"support each other with ease"},3:{n:"square",g:"\u25A1",h:false,l:"push against each other — friction that grows you both"},4:{n:"trine",g:"\u25B3",h:true,l:"just click, no effort needed"},6:{n:"opposition",g:"\u260D",h:false,l:"pull opposite ways — magnetic, but needs balance"}}; return M[dd]||null; }
function buildSyn(a,b){ const combos=[[`${a.name} Sun`,a.sun,`${b.name} Sun`,b.sun,"core selves"],[`${a.name} Moon`,a.moon,`${b.name} Moon`,b.moon,"emotional worlds"],[`${a.name} Sun`,a.sun,`${b.name} Moon`,b.moon,"identity & heart"],[`${a.name} Venus`,a.venus,`${b.name} Mars`,b.mars,"affection & spark"],[`${a.name} Mars`,a.mars,`${b.name} Venus`,b.venus,"drive & warmth"]]; return combos.map(([la,sa,lb,sb,ctx])=>{ const asp=aspectOf(sa,sb); if(!asp)return null; return {la,sa,lb,sb,ctx,asp,plain:`${la.split(" ")[1]} & ${lb.split(" ")[1]}'s ${ctx} ${asp.l}.`}; }).filter(Boolean); }

/* ============================================================
   SIDERA — AI advisor engine (astrology + relationship coaching)
   mode: 'ask' = private solo advisor for the user;
         'shared' = neutral facilitator addressing both;
         parenting auto-detected when b is a minor.
   ============================================================ */
function frictionLine(a,b){ return `${a.name} ${EL_WAY[el(a.sun)]}; ${b.name} ${EL_WAY[el(b.sun)]}.`; }
function reactStyle(s){ const e=el(s); return e==="water"?"goes quiet to protect the peace":e==="earth"?"digs in and waits it out":e==="air"?"gets analytical and a little detached":"pushes back just as hard"; }

function sidera(a,b,text,mode){
  const t=(text||"").toLowerCase(); const fl=frictionLine(a,b); const par=b.minor; const you=a.name;
  let topic="general";
  if(/fight|argu|butt|clash|conflict|tension|same (thing|fight)|standoff/.test(t)) topic="conflict";
  else if(/talk|communic|listen|open up|quiet|shut down|won'?t say|express/.test(t)) topic="comm";
  else if(/close|distance|connect|intimacy|affection|apart|lonely|drift|reconnect/.test(t)) topic="close";
  else if(/time|when|now|bring (it|something) up|ready|good moment/.test(t)) topic="timing";
  else if(/appreciat|unseen|taken for granted|effort|notice|invisible/.test(t)) topic="appreciation";
  else if(par && /discipline|behav|tantrum|defian|grade|chore|screen|homework|melt|listen|attitude/.test(t)) topic="parenting";

  const F={
    conflict:{
      ask: par
        ? { r:`The clash usually isn't the chores or the attitude — it's that <i>${b.name} needs to feel respected, not managed</i>. Her ${b.sun} wiring wants control of *how*, even when you control *what*. Try handing her the decision inside a boundary: "you pick how, I just need it done by Sunday." You keep the outcome; she keeps her dignity, and the standoff mostly dissolves.`, c:["Give me the exact words","Why does punishment backfire?","What if she still refuses?"] }
        : { r:`Here's the root: ${fl} So when something's off, you want to hash it out now, and ${b.name} ${reactStyle(b.sun)}. Winning isn't the goal — naming the pattern out loud before you're in it is. Try: "we're doing the thing again — can we slow down?"`, c:["Give me the exact words","Why does it keep repeating?","What if they won't engage?"] },
      shared:{ r:`You two run on different settings: ${fl} Neither is wrong — but in a flare, one of you speeds up and the other slows down, and it reads as attack vs. avoid. The move is a shared signal. Pick a word that means "pause, not quit." Want me to help you choose one?`, c:["Help us pick a pause word","Replay our last fight differently","What are we really fighting about?"] },
    },
    comm:{
      ask: par
        ? { r:`${b.name} opens up sideways, not head-on — ${el(b.moon)==="water"?"when she feels safe":el(b.moon)==="earth"?"while doing something with her hands":el(b.moon)==="air"?"when it feels like a casual chat, not an interrogation":"in motion, low-pressure"}. Drop the eye-contact face-to-face talk. Sit beside her in the car or on a walk and let silence do half the work.`, c:["How do I start the conversation?","She just says 'I'm fine'","Best time of day to talk?"] }
        : { r:`Communication-wise, ${(el(a.sun)==="air"||el(b.sun)==="air")?"ideas move fast between you, but speed can outrun care":"you two process at different speeds, so the unsaid part gets assumed"}. ${b.name} ${EL_WAY[el(b.sun)]}. Ask, don't diagnose: "what did that feel like for you?" beats "you always…".`, c:["Give me a better opener","They shut down mid-talk","How do I get them to listen?"] },
      shared:{ r:`Quick map: ${fl} So one of you wants to talk it all the way through, and one needs a minute first. Naming that turns "you're avoiding me" into "you need a beat" — totally different conversation. Try the 20-minute rule: "I need 20, then I'm fully in."`, c:["Set up the 20-minute rule","We talk past each other","Help us actually hear each other"] },
    },
    close:{
      ask:{ r:`Closeness lives in different rooms for each of you: ${b.name} feels loved through ${el(b.venus)==="water"?"tenderness and being known":el(b.venus)==="earth"?"reliability and small daily acts":el(b.venus)==="air"?"talk, wit, and being understood":"warmth, fun, and being chosen"}, and you through ${el(a.venus)==="water"?"emotional safety":el(a.venus)==="earth"?"steady presence":el(a.venus)==="air"?"being truly heard":"heat and pursuit"}. The distance you feel is usually love sent in the wrong language. Send it in theirs first.`, c:["What's their love language exactly?","We feel like roommates","How do I reconnect this week?"] },
      shared:{ r:`You each give love in your own dialect, which is why it sometimes doesn't land. ${a.name} offers ${EL_WAY[el(a.sun)].split(" and ")[0]}; ${b.name} offers ${EL_WAY[el(b.sun)].split(" and ")[0]}. Try naming, out loud, one thing that makes each of you feel close. Want a prompt for that?`, c:["Give us that prompt","Plan a small reconnect","What pulls us apart?"] },
    },
    timing:{
      ask:{ r:`Reading the sky for you two: right now the gentlest window to raise something hard is ${todayTransit().who===b.id?"actually a little charged — wait a day or two if you can, or lead extra soft":"reasonably open — go, but lead with the feeling, not the case"}. With ${b.name}, ${el(b.sun)==="fire"?"strike while it's light and playful, not when either of you is tired":el(b.sun)==="earth"?"give advance notice — surprise 'we need to talk' makes them defensive":el(b.sun)==="air"?"frame it as thinking out loud together, not a verdict":"choose a calm, private moment and go slow"}.`, c:["How do I open it gently?","Is this worth bringing up at all?","What if the timing's never right?"] },
      shared:{ r:`Timing matters more than you'd think with you two. The ask isn't whether to talk, it's when you're both regulated. Agree on a "not now, but tonight" option so hard things get a real slot instead of an ambush. Want me to hold you both to it and check back?`, c:["Yes, check back with us","Set a weekly check-in","Help us start tonight"] },
    },
    appreciation:{
      ask:{ r:`Feeling unseen is real — and often it's a language gap, not a caring gap. ${b.name} ${el(b.sun)==="earth"?"shows love by doing, and assumes you see it in the doing":el(b.sun)==="fire"?"shows love loudly but forgets the quiet daily thank-yous":el(b.sun)==="air"?"shows love through attention and ideas, less through acts":"shows love through care and worry, which can read as nagging"}. Tell them the specific thing that would land for you — they'd rather know than guess wrong.`, c:["Help me say what I need","Why do I feel invisible?","How do I appreciate them back?"] },
      shared:{ r:`Appreciation runs on different fuel for each of you. Quick exercise: each name one thing the other does that you'd miss if it stopped. It re-tunes you to what's already there. Want me to run it with you now?`, c:["Run the exercise","We take each other for granted","Help us say thank you better"] },
    },
    parenting:{
      ask:{ r:`With ${b.name} (${b.sun}${b.age?`, age ${b.age}`:""}), the thing to hold onto: ${el(b.sun)==="earth"?"she's not defiant, she's protecting her sense of competence — lead with the plan, not the correction":el(b.sun)==="fire"?"he's not acting out, he's seeking to be seen — praise specifically and never shame him publicly":el(b.sun)==="air"?"they need the 'why,' not just the rule — a reason buys more cooperation than a raised voice":"they feel everything intensely and need safety before logic — co-regulate first, teach second"}. Discipline that respects who they are works far better than discipline that overpowers it.`, c:["Give me a script for this","How do I set a boundary that sticks?","Am I being too hard / too soft?"] },
      shared:null, // never two-way with a minor
    },
    general:{
      ask:{ r:`Tell me what's actually on your mind with ${b.name} and I'll read it through both the chart and plain relationship sense. The quick lay of the land: ${fl} That difference is the source of most of your friction <i>and</i> most of what you give each other. Where do you want to start — a recurring fight, feeling distant, or how to bring something up?`, c:["A fight we keep having","We feel distant","How do I bring something up?"] },
      shared:{ r:`Welcome — this space is for both of you, and I only ever work from what you share here, never from anyone's private notes. The short read on you two: ${fl} Want to start with what's been catching lately, or somewhere lighter?`, c:["What keeps catching between us","Something we do well","Help us understand each other"] },
    },
  };
  const m = mode==="shared" ? "shared" : "ask";
  let node = (F[topic] && F[topic][m]) || F.general[m];
  if(!node) node = F.general.ask;
  return node;
}

function starterChips(a,b,mode){
  const par=b.minor;
  if(mode==="shared") return ["What keeps catching between us?","Something we actually do well","Help us hear each other better"];
  if(par) return [`How do I really get through to ${b.name}?`,"Why does discipline backfire?",`How can I support ${b.name} right now?`];
  return [`Why do ${a.name==="You"?"we":a.name+" and "+b.name} keep having the same fight?`,`How do I get ${b.name} to open up?`,"Is now a good time to bring something up?"];
}

/* ---- chart wheel ---- */
function Wheel({ chart }){
  const S=300,c=S/2,rOut=140,rSignIn=112,rSignGl=126,rHouseGl=99,rInner=62,rPlanet=84;
  const pt=(r,deg)=>{ const a=deg*Math.PI/180; return [c+r*Math.cos(a), c-r*Math.sin(a)]; };
  const cusp=(i)=>180+(i-1)*30; const pbh={}; chart.planets.forEach(p=>{ (pbh[p.house]=pbh[p.house]||[]).push(p); });
  return (
    <svg viewBox={`0 0 ${S} ${S}`} width="100%" style={{maxWidth:290,display:"block",margin:"0 auto"}}>
      <circle cx={c} cy={c} r={rOut} fill="none" stroke="#3a2f63" strokeWidth="1"/>
      <circle cx={c} cy={c} r={rSignIn} fill="none" stroke="#3a2f63" strokeWidth="1"/>
      <circle cx={c} cy={c} r={rInner} fill="#1b1438" stroke="#3a2f63" strokeWidth="1"/>
      {Array.from({length:12},(_,i)=>{ const sign=chart.houses[i]; const elc=EL_SOLID[el(sign)]; const a0=cusp(i+1),a1=cusp(i+2);
        const [x0,y0]=pt(rSignIn,a0),[x1,y1]=pt(rOut,a0); const [gx,gy]=pt(rSignGl,(a0+a1)/2); const [hx,hy]=pt(rHouseGl,(a0+a1)/2);
        const [ox0,oy0]=pt(rOut,a0),[ox1,oy1]=pt(rOut,a1),[ix1,iy1]=pt(rSignIn,a1),[ix0,iy0]=pt(rSignIn,a0);
        return (<g key={i}>
          <path d={`M${ox0},${oy0} A${rOut},${rOut} 0 0 0 ${ox1},${oy1} L${ix1},${iy1} A${rSignIn},${rSignIn} 0 0 1 ${ix0},${iy0} Z`} fill={elc} opacity="0.16"/>
          <line x1={x0} y1={y0} x2={x1} y2={y1} stroke="#3a2f63" strokeWidth="1"/>
          <line x1={pt(rInner,a0)[0]} y1={pt(rInner,a0)[1]} x2={x0} y2={y0} stroke="#2c2152" strokeWidth="1"/>
          <text x={gx} y={gy} fill={elc} fontSize="15" textAnchor="middle" dominantBaseline="central">{SIGN[sign].g}</text>
          <text x={hx} y={hy} fill="#897FB0" fontSize="9" textAnchor="middle" dominantBaseline="central" fontFamily="Fraunces,serif">{i+1}</text>
        </g>); })}
      <text x={pt(rOut+9,180)[0]} y={pt(rOut+9,180)[1]} fill="#E6AE6C" fontSize="9" textAnchor="middle" dominantBaseline="central" fontWeight="700">ASC</text>
      <text x={pt(rOut+8,90)[0]} y={pt(rOut+8,90)[1]} fill="#E6AE6C" fontSize="9" textAnchor="middle" dominantBaseline="central" fontWeight="700">MC</text>
      {Object.entries(pbh).map(([h,list])=>{ const a0=cusp(Number(h)); return list.map((p,j)=>{ const spread=(list.length-1)*9; const a=a0+15-(spread/2)+j*9; const rr=rPlanet-(j%2)*16; const [px,py]=pt(rr,a);
        return (<g key={p.body}><circle cx={px} cy={py} r="11" fill="#160f30" stroke="#caa06f" strokeWidth="1"/><text x={px} y={py} fill="#F4ECDB" fontSize="12" textAnchor="middle" dominantBaseline="central">{PLANET[p.body].g}</text></g>); }); })}
    </svg>
  );
}

function Stars(){ const dots=useMemo(()=>Array.from({length:30},()=>({left:Math.random()*100,top:Math.random()*100,s:Math.random()*1.6+0.6,d:Math.random()*4})),[]); return <div className="kd-stars">{dots.map((d,i)=><span key={i} className="kd-star" style={{left:d.left+"%",top:d.top+"%",width:d.s+"px",height:d.s+"px",animationDelay:d.d+"s"}}/>)}</div>; }
const LockIcon=({c="currentColor",s=12})=>(<svg width={s} height={s} viewBox="0 0 24 24" fill="none"><rect x="5" y="11" width="14" height="9" rx="2" stroke={c} strokeWidth="1.7"/><path d="M8 11V8a4 4 0 018 0v3" stroke={c} strokeWidth="1.7"/></svg>);
const Spark=({s=14})=>(<svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M12 3l1.9 4.6L18.5 9l-4.6 1.9L12 15.5 10.1 10.9 5.5 9l4.6-1.4L12 3z" stroke="#E6AE6C" strokeWidth="1.4" strokeLinejoin="round"/></svg>);

/* ---------------- HOME ---------------- */
function Home({ sel, toggle, onCompare, onProfile, onTransit, onThread }){
  const you=byId("you"); const a=sel[0]?byId(sel[0]):null,b=sel[1]?byId(sel[1]):null; const tr=todayTransit();
  return (
    <div className="kd-screen"><Stars/>
      <div className="kd-scroll">
        <div className="kd-wordrow"><div className="kd-word">Galaxia</div>
          <div className="kd-gear"><svg width="15" height="15" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg></div>
        </div>
        <div style={{padding:"2px 22px 6px"}}>
          <div style={{fontFamily:"'Fraunces',serif",fontStyle:"italic",fontSize:15,color:"var(--mist)"}}>Galaxia Mea</div>
          <div style={{fontSize:12,color:"var(--mist2)",lineHeight:1.4,marginTop:2}}>The few whose light you live by — your people, read in the stars.</div>
        </div>
        <button className="kd-today" onClick={()=>onTransit(tr.who)} style={{width:"calc(100% - 32px)"}}>
          <div className="ic">{tr.ic}</div>
          <div className="tx"><div className="lbl">Today in your sky</div><p>{tr.text}</p></div>
        </button>
        <div className="kd-jump">
          {THREADS.map((th,i)=>{ const o=byId(th.b); return (
            <button key={i} className="kd-jchip" onClick={()=>onThread(th)}>
              <div className="av" style={{background:EL_GRAD[el(o.sun)]}}>{ini(o.name)}</div>
              <div className="jt"><b>You &amp; {o.name}</b><br/><span>talked {th.days}d ago · {th.topic}</span></div>
            </button> ); })}
          <div className="kd-jchip" style={{color:"var(--mist2)",cursor:"default"}}><div className="jt"><span>Tap two stars to read a bond</span></div></div>
        </div>

        <div className="kd-sky">
          <svg className="kd-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
            {BASE.filter(p=>p.id!=="you").map(p=>{ const v=compositeScore(you,p); return (<line key={p.id} x1={you.x} y1={you.y} x2={p.x} y2={p.y} stroke={lineColor(v)} strokeWidth={0.3+(v/100)*0.5} strokeOpacity={0.3+(v/100)*0.45}/>); })}
            {a&&b&&(<line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={lineColor(compositeScore(a,b))} strokeWidth="0.9" strokeLinecap="round" style={{filter:"drop-shadow(0 0 3px rgba(255,255,255,.4))"}}/>)}
          </svg>
          {BASE.map(p=>{ const s=sel.includes(p.id); const act=tr.who===p.id; return (
            <button key={p.id} className={`kd-node ${p.id==="you"?"self":""} ${s?"sel":""} ${act?"active":""}`} style={{left:p.x+"%",top:p.y+"%"}} onClick={()=>toggle(p.id)}>
              <div className="kd-orb" style={{background:EL_GRAD[el(p.sun)]}}>{ini(p.name)}<span className="kd-glyph">{SIGN[p.sun].g}</span>{act&&<span className="kd-spark">{"\u2728"}</span>}</div>
              <div className="kd-name">{p.name}</div>{p.id!=="you"&&<div className="kd-rel">{p.rel}</div>}
            </button> ); })}
        </div>
      </div>
      {a&&!b&&(<div className="kd-dock"><div className="mini" style={{background:EL_GRAD[el(a.sun)]}}>{ini(a.name)}</div><div className="dtxt"><b>{a.name}</b><br/><span>Sun in {a.sun} · tap another to compare</span></div><button className="kd-ghost" onClick={()=>onProfile(a.id)}>Open chart</button></div>)}
      {a&&b&&(<div className="kd-dock"><div className="pair"><div className="mini" style={{background:EL_GRAD[el(a.sun)]}}>{ini(a.name)}</div><div className="mini" style={{background:EL_GRAD[el(b.sun)]}}>{ini(b.name)}</div></div><div className="dtxt"><b>{a.name} &amp; {b.name}</b><br/><span>{detectType(a,b)}</span></div><button className="kd-go" onClick={onCompare}>See what connects them</button></div>)}
    </div>
  );
}

/* ---------------- PROFILE ---------------- */
function Profile({ person, onBack, onCompare }){
  const chart=useMemo(()=>buildChart(person),[person]);
  const get=(b)=>chart.planets.find(p=>p.body===b);
  const big=[["Sun",get("Sun").sign],["Moon",get("Moon").sign],["Rising",chart.asc]];
  const {E,M}=balance(chart); const maxE=Math.max(...Object.values(E))||1, maxM=Math.max(...Object.values(M))||1;
  const domEl=Object.entries(E).sort((a,b)=>b[1]-a[1])[0][0]; const domMo=Object.entries(M).sort((a,b)=>b[1]-a[1])[0][0];
  const activeHouses=chart.planets.map(p=>p.house); const houseList=chart.houses.map((s,i)=>({s,i})).filter(h=>activeHouses.includes(h.i+1));
  const bonds=BASE.filter(p=>p.id!==person.id);
  const note=person.id==="sofia"?"Capricorn Moon — needs to feel competent. Praise the effort, not just the result.":person.id==="you"?"Aries stack in the 1st + Cancer Moon in the 4th: leads hard, feels deep, guards home fiercely. Don't mistake the armor for the whole story.":person.id==="daniel"?"Avoids conflict to keep the peace — silence is processing, not distance. Decides better after sleeping on it.":null;
  return (
    <div className="kd-screen"><Stars/>
      <div className="kd-cbar"><button className="kd-back" onClick={onBack} aria-label="Back"><svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></button><div className="kd-chead"><div className="lbl">{person.id==="you"?"Your natal chart":person.rel}</div><div className="who">{person.name}</div></div></div>
      <div className="kd-scroll"><div className="kd-pad">
        <div className="kd-phero"><Wheel chart={chart}/><div className="kd-pname">{person.name}</div><div className="kd-pmeta">{get("Sun").sign} Sun · {get("Moon").sign} Moon · {chart.asc} Rising</div>{person.id==="you"&&<div className="kd-psrc">from your birth chart report · Placidus houses</div>}</div>
        <div className="kd-three">{big.map(([r,s])=>(<div className="kd-tcell" key={r}><div className="ic">{SIGN[s].g}</div><div className="rl">{r}</div><div className="sg">{s}</div></div>))}</div>

        <div className="kd-section"><div className="kd-stitle">Your notes <span className="kd-priv-tag"><LockIcon s={10}/> private</span></div>
          <div className="kd-note">{note||"Nothing yet. Notes are private to you — jot what works, what sets them off, the patterns you notice over time."}{note&&<div className="meta">You · added this month</div>}</div>
          <div className="kd-addnote"><svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>Add a note</div>
        </div>

        <div className="kd-section"><div className="kd-stitle">Elemental balance</div>
          <div className="kd-baltitle">Leans <b style={{color:EL_SOLID[domEl]}}>{domEl}</b> · {domMo} · {E[domEl]} of 10 placements</div>
          <div className="kd-balrow">{["fire","earth","air","water"].map(k=>(<div className="kd-balseg" key={k}><div className="kd-balbar"><div className="kd-balfill" style={{height:(E[k]/maxE*100)+"%",background:EL_SOLID[k]}}/><span className="kd-baln">{E[k]}</span></div><div className="kd-ballab">{cap(k)}</div></div>))}</div>
          <div className="kd-balrow">{["cardinal","fixed","mutable"].map(k=>(<div className="kd-balseg" key={k}><div className="kd-balbar"><div className="kd-balfill" style={{height:(M[k]/maxM*100)+"%",background:"#caa06f"}}/><span className="kd-baln">{M[k]}</span></div><div className="kd-ballab">{cap(k)}</div></div>))}</div>
        </div>

        <div className="kd-section"><div className="kd-stitle">Placements</div>
          {chart.planets.map(p=>(<div className="kd-place" key={p.body}><div className="kd-pgly">{PLANET[p.body].g}</div><div className="kd-pmid"><div className="kd-ptop"><span className="kd-pbody">{p.body} in {p.sign}</span><span className="kd-phouse">{p.house}{["th","st","nd","rd"][((p.house%100>10&&p.house%100<14)?0:(p.house%10<4?p.house%10:0))]} house</span></div><div className="kd-pvibe">{PLANET[p.body].role}, expressed as <b style={{color:"var(--cream)",fontWeight:600}}>{VIBE[p.sign]}</b>. Most active in {HOUSE_AREA[p.house-1]}.</div></div></div>))}
        </div>

        <div className="kd-section"><div className="kd-stitle">Major aspects</div>
          {chart.aspects.map((x,i)=>(<div className="kd-asp" key={i}><div className="kd-aspg">{(PLANET[x.a]||{g:x.a==="Ascendant"?"Asc":"MC"}).g}{ASPGLY[x.type]}{(PLANET[x.b]||{g:x.b==="Ascendant"?"Asc":"MC"}).g}</div><div className="kd-aspm"><b>{x.a} {x.type} {x.b}</b><span>{cap(ASPLINE[x.type])}.</span></div><span className="kd-asptag" style={{background:x.h?"rgba(230,174,108,.16)":"rgba(218,140,140,.16)",color:x.h?"#E6AE6C":"#DA8C8C"}}>{x.h?"flow":"tension"}</span></div>))}
        </div>

        <div className="kd-section"><div className="kd-stitle">Active houses</div>
          <div className="kd-hgrid">{houseList.map(({s,i})=>(<div className="kd-hcell" key={i}><span className="kd-hnum">{["I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII"][i]}</span><span className="kd-hsign"><span className="gl">{SIGN[s].g}</span>{s}<div className="kd-harea">{HOUSE_AREA[i]}</div></span></div>))}</div>
        </div>

        <div className="kd-section"><div className="kd-stitle">Bonds</div>
          <div className="kd-bondchips">{bonds.map(p=>(<button key={p.id} className="kd-bchip" onClick={()=>onCompare(person.id,p.id)}><div className="bd" style={{background:EL_GRAD[el(p.sun)]}}>{ini(p.name)}</div><div className="bn">{p.name}</div><div className="br">{p.rel}</div></button>))}</div>
        </div>
      </div></div>
    </div>
  );
}

/* ---------------- COMPARE ---------------- */
function Compare({ a, b, onBack, onChat }){
  const [showAstro,setShowAstro]=useState(false); const [type,setType]=useState(detectType(a,b)); const [open,setOpen]=useState(null);
  const sc=useMemo(()=>scores(a,b),[a,b]); const key=`${a.id}-${b.id}`; const content=HERO[key]||HERO[`${b.id}-${a.id}`]||generic(a,b,sc);
  const aspects=useMemo(()=>buildSyn(a,b),[a,b]); const cycle=()=>{ const i=REL_TYPES.indexOf(type); setType(REL_TYPES[(i+1)%REL_TYPES.length]); };
  const involvesYou=a.id==="you"||b.id==="you"; const minorInvolved=a.minor||b.minor; const other=a.id==="you"?b:a;
  const lc=lineColor(compositeScore(a,b));
  return (
    <div className="kd-screen"><Stars/>
      <div className="kd-cbar"><button className="kd-back" onClick={onBack} aria-label="Back"><svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></button><div className="kd-chead"><div className="lbl">Reading together</div><div className="who">{a.name} &amp; {b.name}</div></div></div>
      <div className="kd-scroll"><div className="kd-pad">
        <div style={{textAlign:"center"}}><button className="kd-typechip" onClick={cycle}>Reading as: {type}<svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M7 10l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></button></div>
        <div className="kd-faces"><div className="kd-bigorb" style={{background:EL_GRAD[el(a.sun)]}}>{ini(a.name)}</div><div className="kd-link" style={{background:`linear-gradient(90deg,${lc},${lc})`}}><span>{content.aspect}</span></div><div className="kd-bigorb" style={{background:EL_GRAD[el(b.sun)]}}>{ini(b.name)}</div></div>
        <div className="kd-read" dangerouslySetInnerHTML={{__html:content.read}}/>
        <div className="kd-typeframe">{TYPE_FRAME[type]}</div>

        {/* AI advisor — elevated, the heart */}
        <div className="kd-section">
          <button className="kd-cta primary" onClick={()=>onChat(a.id,b.id,"ask")}>
            <div className="ic"><Spark s={20}/></div>
            <div className="t"><b>{minorInvolved&&involvesYou?`Get parenting guidance on ${other.name}`:`Ask Vela about ${a.id==="you"?"you & "+b.name:a.name+" & "+b.name}`}</b><span>{minorInvolved&&involvesYou?"Private coaching for you — astrology + practical parenting":"Your private AI astrologer + relationship coach. Ask anything."}</span></div>
          </button>
          {involvesYou && !minorInvolved && (
            <button className="kd-cta secondary" onClick={()=>onChat(a.id,b.id,"shared")}>
              <div className="ic"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M4 5h16v11H8l-4 4V5z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg></div>
              <div className="t"><b>Open shared space with {other.name}</b><span>A space you both see — Vela facilitates. Your private notes never appear.</span></div>
            </button>
          )}
          {minorInvolved && (
            <div className="kd-minornote"><LockIcon s={15} c="#6FB1B8"/><div>Two-way chat is off for children. Vela coaches <b>you</b> privately instead — nothing here is ever shared with {other.name}.</div></div>
          )}
        </div>

        <div className="kd-section"><div className="kd-stitle">Your dynamic</div>
          {DIMS.map(d=>{ const v=sc[d]; const dd=sdesc(d,v); const isOpen=open===d; return (
            <div className="kd-dim" key={d} onClick={()=>setOpen(isOpen?null:d)}>
              <div className="row"><span className="k">{DIM_LABEL[d]}</span><span className="d" style={{color:dd.c}}>{dd.w} ›</span></div>
              <div className="kd-track"><div className="kd-fill" style={{width:v+"%",background:`linear-gradient(90deg,${dd.c},${dd.c})`}}/></div>
              {isOpen&&<div className="kd-why">{swhy(a,b,d)}</div>}
            </div> ); })}
          <div style={{fontSize:10.5,color:"var(--mist2)",marginTop:2}}>Tap any line to see why.</div>
        </div>

        <div className="kd-section"><div className="kd-stitle">Where you meet</div>
          <div className="kd-card"><h4><span className="kd-dot" style={{background:"#E6AE6C"}}/>Where it flows</h4><p>{content.align}</p></div>
          <div className="kd-card"><h4><span className="kd-dot" style={{background:"#DA8C8C"}}/>Where it catches</h4><p>{content.friction}</p></div>
        </div>

        <div className="kd-section"><div className="kd-stitle">Understand each other</div>
          <div className="kd-dir"><div className="arrow">→ {content.aTitle}{dirSuffix(type)}</div>{content.aBody.map((t,i)=><p key={i}>{t}</p>)}</div>
          <div className="kd-dir"><div className="arrow">→ {content.bTitle}{dirSuffix(type)}</div>{content.bBody.map((t,i)=><p key={i}>{t}</p>)}</div>
        </div>

        <div className="kd-section"><button className="kd-reveal" onClick={()=>setShowAstro(s=>!s)}><span className="t"><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#caa06f" strokeWidth="1.4"/><path d="M12 3v18M3 12h18" stroke="#caa06f" strokeWidth="1"/></svg>The astrology underneath</span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{transform:showAstro?"rotate(180deg)":"none",transition:"transform .2s"}}><path d="M7 10l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
          {showAstro&&(<div style={{marginTop:10}}>{aspects.map((x,i)=>(<div className="kd-asp" key={i}><div className="kd-aspg">{SIGN[x.sa].g}{x.asp.g}{SIGN[x.sb].g}</div><div className="kd-aspm"><b>{x.la} {x.asp.n} {x.lb}</b><span>{x.plain}</span></div><span className="kd-asptag" style={{background:x.asp.h?"rgba(230,174,108,.16)":"rgba(218,140,140,.16)",color:x.asp.h?"#E6AE6C":"#DA8C8C"}}>{x.asp.h?"flow":"tension"}</span></div>))}<div style={{fontSize:11,color:"var(--mist2)",marginTop:10,lineHeight:1.5}}>Sign-level aspects shown. With exact birth times, this deepens to degree-precise aspects and house overlays.</div></div>)}
        </div>

        <div className="kd-section"><div className="kd-stitle">Log a moment <span className="kd-priv-tag"><LockIcon s={10}/> private</span></div>
          <div className="kd-minornote" style={{borderStyle:"dashed"}}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{color:"var(--gold-soft)",flex:"none"}}><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg><div>Stamp a real moment — a fight, a breakthrough, a good day — against today's sky. Over time this becomes your private relationship journal.</div></div>
        </div>
      </div></div>
    </div>
  );
}

/* ---------------- CHAT (AI advisor + shared space) ---------------- */
function Chat({ a, b, mode, onBack }){
  const par = b.minor; const isShared = mode==="shared";
  const [entered,setEntered]=useState(!isShared);
  const intro = sidera(a,b,"",mode);
  const seed = isShared
    ? [{from:"sidera",text:intro.r}]
    : [{from:"sidera",text:intro.r}];
  const [msgs,setMsgs]=useState(seed);
  const [chips,setChips]=useState(isShared?intro.c:starterChips(a,b,mode));
  const [txt,setTxt]=useState("");
  const ask=(q)=>{ const m=(q!==undefined?q:txt).trim(); if(!m)return; setTxt(""); setMsgs(x=>[...x,{from:"me",text:m}]);
    const node=sidera(a,b,m,mode); setTimeout(()=>{ setMsgs(x=>[...x,{from:"sidera",text:node.r}]); setChips(node.c||[]); },560); };
  const headerLbl = isShared ? `Shared space · you & ${b.name}` : (par ? `Parenting guidance · private` : `Ask Vela · private`);

  if(isShared && !entered){
    return (
      <div className="kd-screen"><Stars/>
        <div className="kd-cbar"><button className="kd-back" onClick={onBack} aria-label="Back"><svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></button><div className="kd-chead"><div className="lbl">Before you enter</div><div className="who">Shared space</div></div></div>
        <div className="kd-consent">
          <div className="ring"><svg width="34" height="34" viewBox="0 0 24 24" fill="none"><path d="M4 5h16v11H8l-4 4V5z" stroke="#E6AE6C" strokeWidth="1.4" strokeLinejoin="round"/></svg></div>
          <h3>A space you and {b.name} share</h3>
          <p>This is different from the rest of Galaxia. Make sure you both understand how it works.</p>
          <div className="pts">
            <div className="pt"><span className="pi"><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></span><div>Both of you can see <b>everything</b> typed here.</div></div>
            <div className="pt"><span className="pi"><LockIcon s={16} c="#6FB1B8"/></span><div>Your <b>private notes</b> and one-sided reads <b>never</b> appear in this space.</div></div>
            <div className="pt"><span className="pi"><Spark s={16}/></span><div>Vela only sees what's shared here, and helps you both — it never takes a side.</div></div>
            <div className="pt"><span className="pi"><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></span><div>Either of you can leave the space at any time.</div></div>
          </div>
          <button className="kd-enter" onClick={()=>setEntered(true)}>Enter together</button>
        </div>
      </div>
    );
  }

  return (
    <div className="kd-screen"><Stars/>
      <div className="kd-cbar"><button className="kd-back" onClick={onBack} aria-label="Back"><svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
        <div className="kd-chead"><div className="who">{isShared?`You & ${b.name}`:`About ${b.name}`}</div><div className={`kd-modetag ${isShared?"shared":"ask"}`}>{isShared?<><Spark s={11}/> Shared space</>:<><LockIcon s={11} c="#6FB1B8"/> Private to you</>}</div></div>
      </div>
      <div className="kd-chat">
        <div className="kd-msgs">
          {msgs.map((m,i)=>{
            if(m.from==="me") return (<div className="kd-mrow me" key={i}><div className="kd-bub me">{m.text}</div></div>);
            if(m.from==="sidera") return (<div className="kd-mrow" key={i}><div className="kd-mav ai"><Spark s={13}/></div><div><div className="kd-ailbl">Vela</div><div className="kd-bub ai" dangerouslySetInnerHTML={{__html:m.text}}/></div></div>);
            return (<div className="kd-mrow" key={i}><div className="kd-mav" style={{background:EL_GRAD[el(b.sun)]}}>{ini(b.name)}</div><div className="kd-bub them">{m.text}</div></div>);
          })}
        </div>
        {chips.length>0 && <div className="kd-chips">{chips.map((c,i)=>(<button key={i} className="kd-qchip" onClick={()=>ask(c)}>{c}</button>))}</div>}
        <div className="kd-priv">{isShared?<><Spark s={11}/> Vela sees only what's shared here — your private notes stay yours.</>:<><LockIcon s={11}/> This conversation is private to you. {par?`Nothing here is shared with ${b.name}.`:""}</>}</div>
        <div className="kd-cinput"><input value={txt} onChange={e=>setTxt(e.target.value)} onKeyDown={e=>{ if(e.key==="Enter") ask(); }} placeholder={isShared?`Message you & ${b.name}…`:`Ask Vela about ${b.name}…`}/><button className="kd-csend" onClick={()=>ask()} aria-label="Send"><svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></button></div>
      </div>
    </div>
  );
}

/* ---------------- ROOT ---------------- */
export default function Galaxia(){
  const [screen,setScreen]=useState("home"); const [sel,setSel]=useState(["you","sofia"]);
  const [profileId,setProfileId]=useState("you"); const [pair,setPair]=useState(["you","sofia"]); const [chatMode,setChatMode]=useState("ask");
  const toggle=(id)=>setSel((cur)=>{ if(cur.includes(id))return cur.filter(x=>x!==id); if(cur.length>=2)return [cur[1],id]; return [...cur,id]; });
  const openCompare=(x,y)=>{ setPair([x,y]); setScreen("compare"); };
  const openProfile=(id)=>{ setProfileId(id); setScreen("profile"); };
  const openChat=(x,y,mode)=>{ setPair([x,y]); setChatMode(mode); setScreen("chat"); };
  return (<div className="kd-root"><style>{CSS}</style><div className="kd-stage"><div className="kd-phone">
    {screen==="home"&&<Home sel={sel} toggle={toggle} onCompare={()=>openCompare(sel[0],sel[1])} onProfile={openProfile} onTransit={(who)=>openCompare("you",who)} onThread={(th)=>openChat(th.a,th.b,th.mode)}/>}
    {screen==="profile"&&<Profile person={byId(profileId)} onBack={()=>setScreen("home")} onCompare={openCompare}/>}
    {screen==="compare"&&<Compare a={byId(pair[0])} b={byId(pair[1])} onBack={()=>setScreen("home")} onChat={openChat}/>}
    {screen==="chat"&&<Chat a={byId(pair[0])} b={byId(pair[1])} mode={chatMode} onBack={()=>setScreen("compare")}/>}
  </div></div></div>);
}

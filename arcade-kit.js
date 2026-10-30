/* ============================================================
   ARCADE KIT  v1.0  (Oct 2026)
   Arcade cabinets on a turntable in a dark room. Step up to one and
   play its game, running in a frame laid exactly over the cabinet's
   screen.

   One file: the styles are inside (search for CSS below). Needs, on the
   page, before this file:
     three.js r128   (window.THREE)  -- without it the arcade runs flat
     GSAP 3          (window.gsap)   -- without it nothing flies

   Use:
     var arcade = ArcadeKit.mount(document.getElementById('arcade'), {
       games: [ { name: 'KEKTRA', play: 'https://...', size: [960, 540],
                  screen: 'img/kektra.webp', color: '#8BE36A', ... }, ... ]
     });
   The element it is mounted in must have a size (e.g. height: 100vh);
   the arcade fills it. Every setting is described in ARCADE-KIT.md.

   Two views of one scene:
     THE FLOOR   the cabinets on a slowly lit round platform. A wheel, a
                 trackpad, a drag, a swipe, the arrow keys or the dial turn
                 it a cabinet at a time; the one in front is named on the
                 plate under it. Click the one in front (or PLAY) to step up.
     A CABINET   the cabinet flies up to stand square to the window, the
                 console types itself in beside it, and the game's own
                 frame lies over its screen. PLAY HERE hands the game the
                 keys and the cabinet leans in; STOP gives them back.
                 Restart, Full screen, the next cabinet, the way back.

   A visual effect and a way to play the games, nothing more: no info
   card, no catalog. Colours, faces and words are all settings.
   ============================================================ */
(function (win) {
  'use strict';
  var doc = win.document;

  /* ============================================================
     THE STYLES (injected once). Colours and faces are custom properties
     on the arcade's root, set from the `palette` and `fonts` settings:
       --ak-bg --ak-hair --ak-fg --ak-hi --ak-dim
       --ak-pixel (the names, the marquees) --ak-font (everything else)
       --ak-top --ak-bottom (room left free for the host page's own bars)
     Layouts follow the arcade's own box (container queries), not the
     window, so it lays itself out the same wherever it is mounted.
     ============================================================ */
  var CSS = [
'.ak{position:absolute;inset:0;overflow:hidden;container:ak/size;outline:none;',
'  --ak-gutter:clamp(16px,2.4cqw,32px);',
'  background-color:var(--ak-bg);color:var(--ak-fg);font-family:var(--ak-font);',
'  background-position:center 44px;overscroll-behavior:contain;-webkit-tap-highlight-color:transparent}',
'.ak *{box-sizing:border-box}',
'.ak::after{content:"";position:absolute;inset:0;pointer-events:none;z-index:1;',
'  background:radial-gradient(ellipse 72% 64% at 50% 44%,transparent 46%,rgba(0,0,0,.62) 100%)}',
'.ak-vh{position:absolute!important;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap;border:0}',
'.ak-stage{position:absolute;inset:0;touch-action:none;cursor:grab}',
'.ak-stage canvas{display:block}',
'.ak-boot{position:absolute;inset:0;z-index:5;display:grid;place-items:center;margin:0;pointer-events:none;',
'  font:400 26px/1 var(--ak-pixel);letter-spacing:.2em;text-transform:uppercase;color:var(--ak-dim);transition:opacity .4s,visibility .4s}',
'.ak.is-ready .ak-boot{opacity:0;visibility:hidden}',
'.ak:not(.is-ready) .ak-floor{opacity:0}',
'.ak-touch{display:none}',
'@media (hover:none){ .ak-mouse{display:none} .ak-touch{display:inline} }',

/* the floor */
'.ak-floor{position:absolute;inset:0;z-index:2;pointer-events:none}',
'.ak-plate{position:absolute;left:50%;bottom:calc(var(--ak-bottom) + 84px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);',
'  width:max-content;max-width:calc(100cqw - 2 * var(--ak-gutter));margin:0;',
'  display:flex;flex-direction:column;align-items:center;text-align:center;pointer-events:none}',
'.ak-plate > *{pointer-events:auto}',
'.ak-kick{margin:0 0 12px;font:500 10.5px/1.5 var(--ak-font);letter-spacing:.24em;text-transform:uppercase;color:var(--ak-dim)}',
'.ak-plate .ak-kick{margin:14px 0 0;text-wrap:balance}',
'.ak-kick b{font-weight:500;color:var(--ak-fg)}',
'.ak-name{margin:0;line-height:0;font-size:inherit;font-weight:inherit}',
/* the name in a block, the archive way -- the block is the light one */
'.ak-blk{display:inline-block;background:var(--ak-fg);color:var(--ak-bg);',
'  font:400 clamp(42px,min(7.4cqw,11.5cqh),116px)/.82 var(--ak-pixel);letter-spacing:.012em;',
'  padding:.1em .16em .02em;white-space:nowrap}',
'.ak-sub{margin:.5em 0 0;font:400 clamp(19px,min(2.3cqw,3.6cqh),33px)/1 var(--ak-pixel);letter-spacing:.07em;color:var(--ak-hi);text-transform:uppercase}',
'.ak-go{margin-top:16px;display:inline-flex;align-items:center;gap:12px;min-height:46px;padding:0 22px 0 20px;cursor:pointer;',
'  border:1px solid var(--ak-fg);background:transparent;color:var(--ak-hi);',
'  font:400 26px/1 var(--ak-pixel);letter-spacing:.08em;text-transform:uppercase;transition:background .16s,color .16s}',
'.ak-go i{font:400 13px/1 var(--ak-font);font-style:normal}',
'.ak-go:hover,.ak-go:focus-visible{background:var(--ak-fg);color:var(--ak-bg)}',
'.ak-go:focus-visible{outline:none}',
/* the dial: one dash per cabinet, the one in front lit */
'.ak-dial{position:absolute;left:50%;bottom:calc(var(--ak-bottom) + 22px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);',
'  display:flex;align-items:center;gap:4px;pointer-events:auto}',
'.ak-dial__g{width:46px;height:40px;padding:0;border:0;background:none;cursor:pointer;color:var(--ak-dim);',
'  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px;',
'  font:500 10px/1 var(--ak-font);letter-spacing:.14em;transition:color .2s}',
'.ak-dial__g::before{content:"";width:28px;height:2px;background:currentColor;opacity:.4;transition:width .25s,opacity .25s}',
'.ak-dial__g:hover,.ak-dial__g:focus-visible{color:var(--ak-fg)}',
'.ak-dial__g[aria-current="true"]{color:var(--ak-hi)}',
'.ak-dial__g[aria-current="true"]::before{width:38px;opacity:1}',
'.ak-dial__step{width:40px;height:40px;padding:0;border:0;background:none;cursor:pointer;color:var(--ak-fg);font:400 15px/1 var(--ak-font)}',
'.ak-dial__step:hover,.ak-dial__step:focus-visible{color:var(--ak-hi)}',
'.ak-hint{position:absolute;z-index:3;left:50%;top:calc(var(--ak-top) + 16px + env(safe-area-inset-top,0px));transform:translateX(-50%);',
'  margin:0;max-width:calc(100cqw - 32px);width:max-content;padding:8px 14px;border:1px solid var(--ak-hair);',
'  background:var(--ak-bg);background:color-mix(in srgb,var(--ak-bg) 80%,transparent);text-align:center;',
'  font:500 10px/1.6 var(--ak-font);letter-spacing:.2em;text-transform:uppercase;color:var(--ak-fg);',
'  opacity:0;visibility:hidden;transition:opacity .4s,visibility .4s;pointer-events:none}',
'.ak-hint.is-on{opacity:1;visibility:visible}',
'.ak[data-view="cab"] .ak-hint{opacity:0;visibility:hidden}',
/* without WebGL the game in front stands as a flat screen */
'.ak-flat{display:none}',
'.ak.is-flat .ak-flat{display:block;position:absolute;left:50%;top:max(calc(var(--ak-top) + 24px),9cqh);transform:translateX(-50%);',
'  max-width:min(78cqw,620px);max-height:max(110px,calc(100cqh - 380px));width:auto;height:auto;',
'  border:1px solid var(--ak-hair);background:#000;cursor:pointer;pointer-events:auto}',
'.ak.is-flat .ak-stage{display:none}',
'.ak.is-flat .ak-floor{pointer-events:auto;touch-action:pan-y pinch-zoom}',
/* laid out by the safe area alone, and measured: the room a notch leaves */
'.ak-safe{position:absolute;left:env(safe-area-inset-left,0px);right:env(safe-area-inset-right,0px);top:env(safe-area-inset-top,0px);',
'  bottom:env(safe-area-inset-bottom,0px);visibility:hidden;pointer-events:none;z-index:-1}',

/* a cabinet */
'.ak-cab{position:absolute;inset:0;z-index:3;pointer-events:none;--stage:right}',
'.ak-cab[hidden]{display:none}',
'.ak-console{position:absolute;left:calc(var(--ak-gutter) + env(safe-area-inset-left,0px));',
'  top:calc(var(--ak-top) + 16px + env(safe-area-inset-top,0px));bottom:auto;',
'  max-height:calc(100cqh - var(--ak-top) - var(--ak-bottom) - 40px - env(safe-area-inset-top,0px) - env(safe-area-inset-bottom,0px));',
'  width:min(370px,33cqw);display:flex;flex-direction:column;gap:16px;container-type:inline-size;',
'  padding:18px 18px 16px;overflow:auto;scrollbar-width:none;pointer-events:auto;',
'  border:1px solid var(--ak-hair);background:var(--ak-bg);background:color-mix(in srgb,var(--ak-bg) 74%,transparent);',
'  -webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px)}',
'.ak-console::-webkit-scrollbar{display:none}',
'.ak-console:focus-visible{outline:none;border-color:var(--ak-fg)}',
'.ak-console__top{display:flex;align-items:center;justify-content:space-between;gap:10px}',
'.ak-stepper{display:flex;align-items:center;gap:2px;font:400 24px/1 var(--ak-pixel);letter-spacing:.06em;color:var(--ak-hi);white-space:nowrap}',
'.ak-stepper button{width:38px;height:38px;padding:0;border:0;background:none;color:var(--ak-fg);cursor:pointer;font:400 14px/1 var(--ak-font)}',
'.ak-stepper button:hover,.ak-stepper button:focus-visible{color:var(--ak-hi)}',
'.ak-console .ak-kick{margin:4px 0 0}',
/* the longest name (6.1em with its block) fits the console: 16cqi of its width */
'.ak-console .ak-blk{font-size:52px;font-size:min(52px,16cqi)}',
'.ak-console .ak-sub{margin-top:.45em;font-size:22px}',
'.ak-readout{margin:4px 0 0;display:grid;grid-template-columns:max-content 1fr;gap:9px 16px;align-items:baseline;',
'  border-top:1px solid var(--ak-hair);padding-top:14px}',
'.ak-readout[hidden]{display:none}',
'.ak-readout__row{display:contents}',
'.ak-readout dt{font:500 9.5px/1.4 var(--ak-font);letter-spacing:.2em;text-transform:uppercase;color:var(--ak-dim)}',
'.ak-readout dd{margin:0;font:400 11.5px/1.45 var(--ak-font);letter-spacing:.07em;text-transform:uppercase;color:var(--ak-fg);overflow-wrap:anywhere}',
'.ak-acts{margin-top:6px;display:grid;grid-template-columns:1fr 1fr;gap:8px}',
'.ak-btn{display:inline-flex;align-items:center;justify-content:center;min-height:40px;padding:0 12px;',
'  font:500 10.5px/1 var(--ak-font);letter-spacing:.16em;text-transform:uppercase;white-space:nowrap;',
'  background:transparent;color:var(--ak-fg);border:1px solid var(--ak-hair);cursor:pointer;',
'  transition:border-color .16s,background .16s,color .16s}',
'.ak-btn:hover,.ak-btn:focus-visible{border-color:var(--ak-fg);color:var(--ak-hi)}',
'.ak-btn:focus-visible{outline:none}',
'.ak-btn .ak-lg{margin-left:.6em}',
'.ak-btn--play{grid-column:1 / -1;min-height:48px;border-color:var(--ak-fg);color:var(--ak-hi);font:400 24px/1 var(--ak-pixel);letter-spacing:.1em}',
'.ak-btn--play:hover,.ak-btn--play:focus-visible,.ak-btn--play.is-on{background:var(--ak-fg);color:var(--ak-bg)}',
'.ak-btn--back{min-height:38px;padding:0 12px 0 10px}',
'.ak-btn__lab{margin-left:.6em}',
'.ak-lab-s{display:none}',
'@media (pointer:coarse){ .ak-btn{min-height:44px} .ak-dial__g,.ak-dial__step,.ak-stepper button{min-height:44px} }',
'.ak-tape{display:flex;align-items:center;gap:12px;opacity:.7}',
'.ak-tape[hidden]{display:none}',
'.ak-tape__bars{flex:1 1 auto;height:26px;fill:var(--ak-fg)}',
'.ak-tape__bars svg{display:block;width:100%;height:100%}',
'.ak-tape__lab{font:500 9px/1.3 var(--ak-font);letter-spacing:.2em;text-transform:uppercase;color:var(--ak-dim);white-space:nowrap}',

/* the game's frame, laid exactly over the screen the scene draws */
'.ak-scr{position:absolute;z-index:4;left:0;top:0;width:0;height:0;pointer-events:auto;transition:opacity .35s ease}',
'.ak-scr.is-off{opacity:0;pointer-events:none;transition:none}',
'.ak-scr::before{content:"";position:absolute;inset:-10px;pointer-events:none;opacity:.6;background:',
'  linear-gradient(var(--ak-fg),var(--ak-fg)) 0 0/14px 1px no-repeat,linear-gradient(var(--ak-fg),var(--ak-fg)) 0 0/1px 14px no-repeat,',
'  linear-gradient(var(--ak-fg),var(--ak-fg)) 100% 0/14px 1px no-repeat,linear-gradient(var(--ak-fg),var(--ak-fg)) 100% 0/1px 14px no-repeat,',
'  linear-gradient(var(--ak-fg),var(--ak-fg)) 0 100%/14px 1px no-repeat,linear-gradient(var(--ak-fg),var(--ak-fg)) 0 100%/1px 14px no-repeat,',
'  linear-gradient(var(--ak-fg),var(--ak-fg)) 100% 100%/14px 1px no-repeat,linear-gradient(var(--ak-fg),var(--ak-fg)) 100% 100%/1px 14px no-repeat}',
'.ak-scr.is-live::before{opacity:1}',
'.ak-scr__hud{position:absolute;right:-10px;top:calc(100% + 14px);margin:0;white-space:nowrap;',
'  font:500 9.5px/1 var(--ak-font);letter-spacing:.2em;text-transform:uppercase;color:var(--ak-dim);pointer-events:none}',
'.ak-scr__bar{display:none}',
'.ak-scr__frame{position:absolute;inset:0;overflow:hidden}',
'.ak-scr.is-in .ak-scr__frame{background:#000}',
'.ak-scr__game{position:absolute;top:0;left:0;border:0;display:block;transform-origin:0 0;background:#000;opacity:0;transition:opacity .5s ease}',
'.ak-scr.is-in .ak-scr__game{opacity:1}',
'.ak-scr__state{position:absolute;z-index:3;left:10px;bottom:10px;margin:0;max-width:calc(100% - 20px);padding:7px 11px;',
'  border:1px solid var(--ak-hair);background:var(--ak-bg);background:color-mix(in srgb,var(--ak-bg) 84%,transparent);',
'  font:400 10.5px/1.5 var(--ak-font);letter-spacing:.14em;text-transform:uppercase;color:var(--ak-fg);pointer-events:none}',
'.ak-scr__state a{pointer-events:auto;color:var(--ak-hi);text-decoration:underline;text-underline-offset:.25em}',
'.ak-scr__wait::after{content:"";display:inline-block;width:1.4em;text-align:left;animation:ak-dots 1.4s steps(4,end) infinite}',
'@keyframes ak-dots{0%{content:""}25%{content:"."}50%{content:".."}75%{content:"..."}}',
'.ak-scr__slow{display:none}',
'.ak-scr.is-slow .ak-scr__wait{display:none}',
'.ak-scr.is-slow .ak-scr__slow{display:inline}',
'.ak-scr.is-in .ak-scr__state,.ak-scr.is-off .ak-scr__state{opacity:0;visibility:hidden}',
'.ak-scr.is-in .ak-scr__wait::after,.ak-scr.is-off .ak-scr__wait::after{animation:none}',
/* the scrim is the hand-over: the game runs behind it but takes no input
   until it is clicked; then it has the keys until Stop, or a press elsewhere */
'.ak-scr__scrim{position:absolute;inset:0;z-index:2;cursor:pointer;background:transparent;border:0;padding:0;',
'  display:grid;place-items:center;font:inherit;color:var(--ak-fg)}',
'.ak-scr__scrim > span{opacity:0;transform:translateY(4px);transition:opacity .18s ease,transform .18s ease;',
'  border:1px solid var(--ak-fg);background:var(--ak-bg);background:color-mix(in srgb,var(--ak-bg) 78%,transparent);',
'  padding:11px 18px 9px;font:400 24px/1 var(--ak-pixel);letter-spacing:.1em;text-transform:uppercase;color:var(--ak-hi)}',
'.ak-scr__scrim:focus-visible > span{opacity:1;transform:none}',
'.ak-scr__scrim:focus-visible{outline:2px solid var(--ak-fg);outline-offset:-5px}',
'@media (hover:hover){ .ak-scr__scrim:hover > span{opacity:1;transform:none} }',
'@media (hover:none){ .ak-scr__scrim > span{opacity:1;transform:none} }',
'.ak-scr.is-live .ak-scr__scrim{display:none}',
/* full screen: the same frame, promoted (the browser's own full screen where
   there is one; where there is not -- an iPhone -- it fills the arcade's box) */
'.ak-scr.is-full{position:fixed!important;inset:0!important;width:auto!important;height:auto!important;z-index:20;',
'  background:var(--ak-bg);display:flex;flex-direction:column}',
'.ak-scr.is-full::before,.ak-scr.is-full .ak-scr__hud{display:none}',
'.ak-scr.is-full .ak-scr__bar{display:flex;align-items:center;justify-content:space-between;gap:8px 16px;flex-wrap:wrap;',
'  padding:calc(10px + env(safe-area-inset-top,0px)) calc(16px + env(safe-area-inset-right,0px)) 10px calc(16px + env(safe-area-inset-left,0px));',
'  border-bottom:1px solid var(--ak-hair);background:var(--ak-bg)}',
'.ak-scr__name{font:400 26px/1 var(--ak-pixel);letter-spacing:.08em;color:var(--ak-hi)}',
'.ak-scr__acts{display:flex;gap:8px;flex-wrap:wrap}',
'.ak-scr.is-full .ak-scr__frame{position:relative;inset:auto;flex:1 1 auto;min-height:0;',
'  margin:0 env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)}',

/* a phone held upright (or any narrow box): the cabinet above, the console under it */
'@container ak (max-width:640px){',
'  .ak-kick{font-size:9.5px;letter-spacing:.14em}',
'  .ak-plate{bottom:calc(var(--ak-bottom) + 76px + env(safe-area-inset-bottom,0px))}',
'  .ak-blk{font-size:clamp(40px,12.6cqw,64px)}',
'  .ak-sub{font-size:19px}',
'  .ak-go{margin-top:16px;font-size:23px;min-height:44px}',
'  .ak-dial{bottom:calc(var(--ak-bottom) + 14px + env(safe-area-inset-bottom,0px))}',
'  .ak-dial__g{width:42px}',
'  .ak-cab{--stage:top}',
'  .ak-console{left:10px;right:10px;width:auto;top:auto;bottom:calc(var(--ak-bottom) + 10px + env(safe-area-inset-bottom,0px));',
'    max-height:56cqh;gap:11px;padding:13px 13px 12px}',
'  .ak-console .ak-blk{font-size:46px;font-size:min(46px,16cqi)}',
'  .ak-console .ak-sub{font-size:17px}',
'  .ak-readout,.ak-console .ak-kick{display:none}',
'  .ak-btn{padding:0 6px;letter-spacing:.08em}',
'  .ak-btn .ak-lg{display:none}',
'  .ak-lab-l{display:none} .ak-lab-s{display:inline}',
'  .ak-tape{display:none}',
'  .ak-scr__hud{display:none}',
'}',
/* a phone on its side (or any short box): the cabinet at the left, the console at the right */
'@container ak (max-height:480px){',
'  .ak-plate{bottom:calc(var(--ak-bottom) + 52px + env(safe-area-inset-bottom,0px));flex-direction:row;align-items:center;gap:14px}',
'  .ak-blk{font-size:38px}',
'  .ak-plate .ak-sub{display:none}',
'  .ak-go{margin-top:0;min-height:40px;font-size:21px}',
'  .ak-kick{display:none}',
'  .ak-dial{bottom:calc(var(--ak-bottom) + 6px + env(safe-area-inset-bottom,0px))}',
'  .ak-cab{--stage:left}',
'  .ak-console{left:auto;right:calc(10px + env(safe-area-inset-right,0px));top:calc(var(--ak-top) + 12px + env(safe-area-inset-top,0px));',
'    bottom:calc(var(--ak-bottom) + 8px + env(safe-area-inset-bottom,0px));width:min(310px,44cqw);max-height:none;gap:9px;padding:11px}',
'  .ak-console .ak-blk{font-size:36px;font-size:min(36px,16cqi)}',
'  .ak-acts{margin-top:auto}',
'  .ak-console .ak-sub{font-size:16px}',
'  .ak-readout,.ak-console .ak-kick,.ak-tape,.ak-scr__hud{display:none}',
'  .ak-btn .ak-lg{display:none}',
'  .ak-lab-l{display:none} .ak-lab-s{display:inline}',
'  .ak-btn--play{min-height:42px;font-size:21px}',
'  .ak-hint{display:none}',
'}',
/* a short laptop window: the console tightens */
'@container ak (min-width:641px) and (min-height:481px) and (max-height:800px){',
'  .ak-console{gap:10px;padding:14px 16px 12px}',
'  .ak-readout{gap:6px 14px}',
'  .ak-tape{display:none}',
'}',
'@container ak (min-width:641px) and (min-height:481px) and (max-height:620px){',
'  .ak-console .ak-kick{display:none}',
'  .ak-console .ak-sub{margin-top:0}',
'}',
/* a tablet held upright (or any box taller than wide, up to 1100px): the cabinet
   above, the console under it, the details beside the name */
'@container ak (min-width:641px) and (max-width:1100px) and (orientation:portrait){',
'  .ak-cab{--stage:top}',
'  .ak-console{left:calc(var(--ak-gutter) + env(safe-area-inset-left,0px));right:calc(var(--ak-gutter) + env(safe-area-inset-right,0px));',
'    width:auto;top:auto;bottom:calc(var(--ak-bottom) + var(--ak-gutter) + env(safe-area-inset-bottom,0px));max-height:50cqh;',
'    display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);column-gap:28px;row-gap:12px;align-content:start;',
'    grid-template-areas:"top top" "kick facts" "name facts" "sub facts" "acts facts" "tape facts"}',
'  .ak-console__top{grid-area:top}',
'  .ak-console .ak-kick{grid-area:kick;margin:0}',
'  .ak-console .ak-name{grid-area:name}',
'  .ak-console .ak-sub{grid-area:sub;margin:0}',
'  .ak-console .ak-readout{grid-area:facts;align-self:start;margin:0}',
'  .ak-console .ak-acts{grid-area:acts}',
'  .ak-console .ak-tape{grid-area:tape;align-self:end}',
'  .ak-console .ak-blk{font-size:44px;font-size:min(52px,7.6cqi)}',
'}',
'@media (prefers-reduced-motion:reduce){',
'  .ak-scr,.ak-scr__game,.ak-scr__scrim > span,.ak-dial__g::before,.ak-hint,.ak-boot{transition:none}',
'  .ak-scr__wait::after{animation:none;content:"..."}',
'}'
  ].join('\n');

  function injectCSS() {
    if (doc.getElementById('arcade-kit-css')) return;
    var s = doc.createElement('style');
    s.id = 'arcade-kit-css';
    s.textContent = CSS;
    (doc.head || doc.documentElement).appendChild(s);
  }

  /* ============================================================
     SETTINGS
     ============================================================ */
  var PALETTE = {
    bg: '#0A0C0B', hair: '#2E302F', fg: '#E2E7E3', hi: '#FFFFFF', dim: '#858A86',
    /* the scene's own: the platform, the cabinets, the lines on the floor */
    floor: '#0F1211', cabinet: '#151918', line: '#E2E7E3'
  };
  var FONTS = {
    pixel: "'Jersey 10', 'DM Mono', ui-monospace, monospace",
    text: "'DM Mono', ui-monospace, 'SF Mono', Menlo, Consolas, monospace"
  };
  var LABELS = {
    loading: 'Loading the arcade',
    cabinet: 'Cabinet',
    play: 'Play',
    playHere: 'Play here',
    stop: 'Stop playing',
    restart: 'Restart',
    full: 'Full screen',
    back: 'All cabinets',
    backShort: 'All',
    backToArcade: 'Back to the arcade',
    prev: 'Previous game',
    next: 'Next game',
    controls: 'Controls',
    loadingGame: 'Loading the game',
    slow: 'Still loading.',
    openOwn: 'Open it at its own address \u2197',
    clickToPlay: 'Click to play',
    tapToPlay: 'Tap to play',
    titleScreen: 'its title screen',
    hintMouse: 'Scroll or drag to turn the floor \u00b7 click the cabinet in front to play',
    hintDrag: 'Drag to turn the floor \u00b7 click the cabinet in front to play',
    hintTouch: 'Swipe to turn the floor \u00b7 tap the cabinet in front to play',
    dial: 'Cabinets'
  };
  function merge(a, b) { var o = {}, k; for (k in a) o[k] = a[k]; if (b) for (k in b) if (b[k] != null) o[k] = b[k]; return o; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  /* ============================================================
     MOUNT
     ============================================================ */
  function mount(host, cfg) {
    if (!host || !host.nodeType) throw new Error('ArcadeKit.mount: no element to mount in');
    cfg = cfg || {};
    var GAMES = (cfg.games || []).map(function (g, i) {
      if (!g || !g.name || !g.play) throw new Error('ArcadeKit: game ' + i + ' needs at least a name and a play address');
      var size = g.size && g.size.length === 2 ? [+g.size[0], +g.size[1]] : [960, 600];
      return {
        name: String(g.name),
        title: g.title || (String(g.name) + '.' + ('00' + (i + 1)).slice(-3)),
        marquee: g.marquee || String(g.name),
        play: g.play,
        src: g.fallback || g.play,
        extract: g.extract === true ? g.play : (g.extract || ''),
        size: size,
        sandbox: g.sandbox || 'allow-scripts',
        screen: g.screen || g.side || '',
        side: g.side || g.screen || '',
        color: g.color || '#E2E7E3',
        line: g.line || '',
        controls: g.controls || '',
        tag: g.tag || '',
        facts: g.facts || [],
        barcode: g.barcode || String(g.name)
      };
    });
    var N = GAMES.length;
    if (!N) throw new Error('ArcadeKit: no games');

    var P = merge(PALETTE, cfg.palette);
    var F = merge(FONTS, cfg.fonts);
    var L = merge(LABELS, cfg.labels);
    var KEYS = cfg.keys === 'page' ? 'page' : 'focus';
    var HIST = !!cfg.history, PARAM = cfg.historyParam || 'play';
    var WHEEL = cfg.wheel !== false;
    var HINT = cfg.hint !== false;
    var TITLE = cfg.title || 'THE ARCADE';
    var BARCODE = cfg.barcode !== false;
    var INSET = cfg.inset || {};
    var on = function () {};  /* listener registry, filled below */

    var RM = !!(win.matchMedia && win.matchMedia('(prefers-reduced-motion: reduce)').matches) || cfg.reducedMotion === true;
    var COARSE = !!(win.matchMedia && win.matchMedia('(hover: none)').matches);
    var STEP = Math.PI * 2 / N;
    function mod(a, n) { return ((a % n) + n) % n; }
    function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
    function pad(n) { return (n < 10 ? '0' : '') + n; }
    function dist(a, b) { var d = mod(a - b, N); return Math.min(d, N - d); }
    function paused() { try { return !!(cfg.paused && cfg.paused()); } catch (e) { return false; } }
    function hostOf(url) { try { return new URL(url, location.href).hostname; } catch (e) { return ''; } }

    injectCSS();
    if (win.getComputedStyle(host).position === 'static') host.style.position = 'relative';

    /* ------------------------------------------------------------
       the arcade's parts
       ------------------------------------------------------------ */
    var dialHTML = GAMES.map(function (g, i) {
      return '<button type="button" class="ak-dial__g" data-ak="go" data-to="' + i + '" aria-label="' + pad(i + 1) + ' ' + esc(g.name) + '"><span>' + pad(i + 1) + '</span></button>';
    }).join('');
    var room = doc.createElement('div');
    room.className = 'ak';
    room.setAttribute('data-view', 'floor');
    room.setAttribute('tabindex', '-1');
    room.setAttribute('role', 'region');
    room.setAttribute('aria-label', cfg.label || 'Arcade');
    room.innerHTML =
      '<div class="ak-stage"></div>' +
      '<p class="ak-boot" aria-hidden="true">' + esc(L.loading) + '</p>' +
      '<section class="ak-floor">' +
        '<img class="ak-flat" alt="" decoding="async">' +
        '<div class="ak-plate">' +
          '<h2 class="ak-name"><span class="ak-blk" data-ak-el="name"></span></h2>' +
          '<p class="ak-sub" data-ak-el="sub"></p>' +
          '<p class="ak-kick"><b data-ak-el="num"></b><span data-ak-el="tagsep"> \u00b7 </span><span data-ak-el="tag"></span></p>' +
          '<button type="button" class="ak-go" data-ak="enter">' + esc(L.play) + ' <i aria-hidden="true">\u25b6</i></button>' +
        '</div>' +
        '<nav class="ak-dial" aria-label="' + esc(L.dial) + '">' +
          '<button type="button" class="ak-dial__step" data-ak="prev" aria-label="' + esc(L.prev) + '">\u2190</button>' +
          dialHTML +
          '<button type="button" class="ak-dial__step" data-ak="next" aria-label="' + esc(L.next) + '">\u2192</button>' +
        '</nav>' +
      '</section>' +
      '<section class="ak-cab" aria-hidden="true" hidden>' +
        '<aside class="ak-console" tabindex="-1">' +
          '<div class="ak-console__top">' +
            '<button type="button" class="ak-btn ak-btn--back" data-ak="back">\u2190<span class="ak-btn__lab"><span class="ak-lab-l">' + esc(L.back) +
              '</span><span class="ak-lab-s">' + esc(L.backShort) + '</span></span></button>' +
            '<div class="ak-stepper">' +
              '<button type="button" data-ak="prev" aria-label="' + esc(L.prev) + '">\u2190</button>' +
              '<span data-ak-el="cnum"></span>' +
              '<button type="button" data-ak="next" aria-label="' + esc(L.next) + '">\u2192</button>' +
            '</div>' +
          '</div>' +
          '<p class="ak-kick"><b>' + esc(L.cabinet) + '</b><span data-ak-el="ctagsep"> \u00b7 </span><span data-ak-el="ctag"></span></p>' +
          '<h2 class="ak-name"><span class="ak-blk" data-ak-el="cname"></span></h2>' +
          '<p class="ak-sub" data-ak-el="csub"></p>' +
          '<dl class="ak-readout" data-ak-el="facts"></dl>' +
          '<div class="ak-acts">' +
            '<button type="button" class="ak-btn ak-btn--play" data-ak="play"><span class="pl-a">' + esc(L.playHere) + '</span><span class="pl-b" hidden>' + esc(L.stop) + '</span></button>' +
            '<button type="button" class="ak-btn" data-ak="restart">' + esc(L.restart) + '</button>' +
            '<button type="button" class="ak-btn" data-ak="full" aria-pressed="false">' + esc(L.full.split(' ')[0]) +
              (L.full.indexOf(' ') > 0 ? '<span class="ak-lg">' + esc(L.full.slice(L.full.indexOf(' ') + 1)) + '</span>' : '') + '</button>' +
          '</div>' +
          '<div class="ak-tape" aria-hidden="true"><div class="ak-tape__bars" data-ak-el="tape"></div><span class="ak-tape__lab" data-ak-el="tapelab"></span></div>' +
        '</aside>' +
        '<div class="ak-scr is-off">' +
          '<div class="ak-scr__bar">' +
            '<b class="ak-scr__name" data-ak-el="sname"></b>' +
            '<div class="ak-scr__acts">' +
              '<button type="button" class="ak-btn" data-ak="restart">' + esc(L.restart) + '</button>' +
              '<button type="button" class="ak-btn" data-ak="full">\u2190 ' + esc(L.backToArcade) + '</button>' +
            '</div>' +
          '</div>' +
          '<div class="ak-scr__frame">' +
            '<p class="ak-scr__state" aria-live="polite"><span class="ak-scr__wait">' + esc(L.loadingGame) + '</span>' +
              '<span class="ak-scr__slow">' + esc(L.slow) + ' <a target="_blank" rel="noopener" data-ak-el="sopen">' + esc(L.openOwn) + '</a></span></p>' +
            '<button type="button" class="ak-scr__scrim" data-ak="live"><span><span class="ak-mouse">' + esc(L.clickToPlay) + '</span><span class="ak-touch">' + esc(L.tapToPlay) + '</span></span></button>' +
          '</div>' +
          '<p class="ak-scr__hud" aria-hidden="true" data-ak-el="hud"></p>' +
        '</div>' +
      '</section>' +
      '<p class="ak-hint" aria-hidden="true"><span class="ak-mouse">' + esc(WHEEL ? L.hintMouse : L.hintDrag) + '</span><span class="ak-touch">' + esc(L.hintTouch) + '</span></p>' +
      '<p class="ak-vh" aria-live="polite" data-ak-el="say"></p>' +
      '<i class="ak-safe" aria-hidden="true"></i>';
    host.appendChild(room);

    var $ = function (n) { return room.querySelector('[data-ak-el="' + n + '"]'); };
    var stageEl = room.querySelector('.ak-stage'), floor = room.querySelector('.ak-floor'), plate = room.querySelector('.ak-plate');
    var plName = $('name'), plSub = $('sub'), plNum = $('num'), plTag = $('tag'), plTagSep = $('tagsep');
    var plGo = room.querySelector('.ak-go'), plFlat = room.querySelector('.ak-flat');
    var dialBtns = Array.prototype.slice.call(room.querySelectorAll('.ak-dial__g'));
    var cab = room.querySelector('.ak-cab'), consoleEl = room.querySelector('.ak-console');
    var cabNum = $('cnum'), cabTag = $('ctag'), cabTagSep = $('ctagsep'), cabName = $('cname'), cabSub = $('csub');
    var cabFacts = $('facts'), cabPlay = room.querySelector('.ak-btn--play'), cabTape = $('tape'), cabTapeLab = $('tapelab');
    var scr = room.querySelector('.ak-scr'), scrFrame = room.querySelector('.ak-scr__frame'), scrName = $('sname'), scrOpen = $('sopen');
    var scrHud = $('hud'), sayEl = $('say'), safeEl = room.querySelector('.ak-safe'), hintEl = room.querySelector('.ak-hint');
    if (!BARCODE) room.querySelector('.ak-tape').hidden = true;

    /* the palette and the faces, as custom properties on the root */
    room.style.setProperty('--ak-bg', P.bg);
    room.style.setProperty('--ak-hair', P.hair);
    room.style.setProperty('--ak-fg', P.fg);
    room.style.setProperty('--ak-hi', P.hi);
    room.style.setProperty('--ak-dim', P.dim);
    room.style.setProperty('--ak-pixel', F.pixel);
    room.style.setProperty('--ak-font', F.text);
    room.style.setProperty('--ak-top', (+INSET.top || 0) + 'px');
    room.style.setProperty('--ak-bottom', (+INSET.bottom || 0) + 'px');
    /* the ground: a fine grid of crosses, in the line colour */
    if (cfg.grid !== false) {
      var lc = encodeURIComponent(P.line);
      room.style.backgroundImage = 'url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2788%27 height=%2788%27%3E' +
        '%3Cpath d=%27M44 39v10M39 44h10%27 stroke=%27' + lc + '%27 stroke-opacity=%27.17%27 stroke-width=%271%27/%3E' +
        '%3Cpath d=%27M0 .5H88M.5 0V88%27 stroke=%27' + lc + '%27 stroke-opacity=%27.035%27 stroke-width=%271%27/%3E%3C/svg%3E")';
    }

    /* listeners, kept so destroy() can take them all off */
    var offs = [];
    on = function (t, type, fn, opts) { t.addEventListener(type, fn, opts); offs.push(function () { t.removeEventListener(type, fn, opts); }); };
    function say(t) { if (sayEl) sayEl.textContent = t; }

    /* ------------------------------------------------------------
       state
       ------------------------------------------------------------ */
    var turn = 0;          /* the cabinet in front, counted round the circle (any integer) */
    var at = 0;            /* the same, 0..N-1: the game in front, or the one stepped up to */
    var view = 'floor';    /* 'floor' | 'cab' */
    var busy = false;      /* a change of view is under way */
    var live = false;      /* the game has the keyboard and mouse */
    var full = false;      /* the game has the whole window */
    var pushed = false;    /* we put the cabinet view in the history ourselves */
    var frame = null;      /* the game's frame, while a cabinet is open */
    var rest = 'stage';    /* how close the open cabinet stands: 'stage', or 'play' while it is played */
    var zoomTl = null, zoomEnds = null;
    var gl = null;         /* the scene (null without WebGL) */
    var started = false, dead = false, visible = true;

    function game(i) { return GAMES[mod(i, N)]; }
    function code(i) { return game(i).title; }
    function emit(name, i) { try { if (typeof cfg[name] === 'function') cfg[name](i == null ? at : i, game(i == null ? at : i)); } catch (e) {} }

    /* ------------------------------------------------------------
       text that types itself in: each character settles from a
       scramble, left to right. While it types the element is hidden
       from a screen reader; what changed is said once, whole, by say().
       ------------------------------------------------------------ */
    var GLYPHS = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#%&*+=<>/';
    var typing = 0, typingEls = [];
    function type(el, text, dur, delay) {
      if (!el) return;
      if (el._akTyping) { cancelAnimationFrame(el._akTyping); el._akTyping = 0; typing--; }
      if (RM || !dur) { el.textContent = text; el.removeAttribute('aria-hidden'); return; }
      typing++;
      if (typingEls.indexOf(el) < 0) typingEls.push(el);
      el.setAttribute('aria-hidden', 'true');
      var t0 = performance.now() + (delay || 0) * 1000, n = text.length;
      (function step(now) {
        var p = clamp((now - t0) / (dur * 1000), 0, 1), out = '';
        var done = Math.floor(p * n);
        for (var i = 0; i < n; i++) {
          var c = text.charAt(i);
          if (i < done || c === ' ' || c === '.' || c === '\u00b7' || c === '/') out += c;
          else if (now < t0) out += ' ';
          else out += GLYPHS.charAt((Math.random() * GLYPHS.length) | 0);
        }
        el.textContent = out;
        if (p < 1) el._akTyping = requestAnimationFrame(step);
        else { el.textContent = text; el._akTyping = 0; typing--; el.removeAttribute('aria-hidden'); afterType(el); }
      })(performance.now());
    }

    /* a bar code of the game's name: real data, drawn as an instrument would
       (Code 39's narrow / wide pattern for each letter) */
    var C39 = { '0': 'nnnwwnwnn', '1': 'wnnwnnnnw', '2': 'nnwwnnnnw', '3': 'wnwwnnnnn', '4': 'nnnwwnnnw', '5': 'wnnwwnnnn',
      '6': 'nnwwwnnnn', '7': 'nnnwnnwnw', '8': 'wnnwnnwnn', '9': 'nnwwnnwnn', 'A': 'wnnnnwnnw', 'B': 'nnwnnwnnw', 'C': 'wnwnnwnnn',
      'D': 'nnnnwwnnw', 'E': 'wnnnwwnnn', 'F': 'nnwnwwnnn', 'G': 'nnnnnwwnw', 'H': 'wnnnnwwnn', 'I': 'nnwnnwwnn', 'J': 'nnnnwwwnn',
      'K': 'wnnnnnnww', 'L': 'nnwnnnnww', 'M': 'wnwnnnnwn', 'N': 'nnnnwnnww', 'O': 'wnnnwnnwn', 'P': 'nnwnwnnwn', 'Q': 'nnnnnnwww',
      'R': 'wnnnnnwwn', 'S': 'nnwnnnwwn', 'T': 'nnnnwnwwn', 'U': 'wwnnnnnnw', 'V': 'nwwnnnnnw', 'W': 'wwwnnnnnn', 'X': 'nwnnwnnnw',
      'Y': 'wwnnwnnnn', 'Z': 'nwwnwnnnn', '*': 'nwnnwnwnn' };
    function barcode(text) {
      var s = '*' + String(text).toUpperCase().replace(/[^0-9A-Z]/g, '') + '*', x = 0, bars = [];
      for (var i = 0; i < s.length; i++) {
        var p = C39[s.charAt(i)] || C39['*'];
        for (var j = 0; j < 9; j++) {
          var w = p.charAt(j) === 'w' ? 3 : 1;
          if (j % 2 === 0) bars.push('<rect x="' + x + '" y="0" width="' + w + '" height="40"/>');
          x += w;
        }
        x += 1;
      }
      return '<svg viewBox="0 0 ' + x + ' 40" preserveAspectRatio="none" focusable="false">' + bars.join('') + '</svg>';
    }

    function paintFloor(animate) {
      var i = at, g = game(i);
      plNum.textContent = L.cabinet + ' ' + pad(i + 1) + ' / ' + pad(N);
      plTagSep.hidden = !g.tag;
      type(plTag, g.tag.toUpperCase(), animate ? 0.45 : 0);
      type(plName, code(i), animate ? 0.5 : 0);
      type(plSub, g.line, animate ? 0.55 : 0, animate ? 0.05 : 0);
      plGo.setAttribute('aria-label', L.play + ' ' + g.name);
      dialBtns.forEach(function (b, k) { b.setAttribute('aria-current', k === i ? 'true' : 'false'); });
      if (plFlat && g.screen) { plFlat.src = g.screen; plFlat.alt = g.name + ' \u2014 ' + L.titleScreen; }
      if (animate && !RM && win.gsap) {
        win.gsap.fromTo(plName, { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: 0.42, ease: 'power3.out' });
      }
    }
    function paintConsole(animate) {
      var i = at, g = game(i);
      cabNum.textContent = pad(i + 1) + ' / ' + pad(N);
      cabTagSep.hidden = !g.tag;
      type(cabTag, g.tag.toUpperCase(), animate ? 0.45 : 0, animate ? 0.1 : 0);
      type(cabName, code(i), animate ? 0.55 : 0, animate ? 0.05 : 0);
      type(cabSub, g.line, animate ? 0.6 : 0, animate ? 0.15 : 0);
      var rows = (g.controls ? [[L.controls, g.controls]] : []).concat(g.facts || []).filter(function (r) { return r && r[1]; });
      cabFacts.hidden = !rows.length;
      cabFacts.innerHTML = rows.map(function (r) { return '<div class="ak-readout__row"><dt>' + esc(r[0]) + '</dt><dd></dd></div>'; }).join('');
      Array.prototype.forEach.call(cabFacts.querySelectorAll('dd'), function (dd, k) {
        type(dd, String(rows[k][1]), animate ? 0.5 : 0, animate ? 0.2 + k * 0.06 : 0);
      });
      if (BARCODE) { cabTape.innerHTML = barcode(g.barcode); cabTapeLab.textContent = g.barcode; }
      scrName.textContent = g.name;
      scrOpen.href = g.play;
      Array.prototype.forEach.call(room.querySelectorAll('[data-ak="restart"]'), function (b) { b.setAttribute('aria-label', L.restart + ' ' + g.name); });
      /* (the full-screen bar's own way back keeps its words) */
      Array.prototype.forEach.call(consoleEl.querySelectorAll('[data-ak="full"]'), function (b) { b.setAttribute('aria-label', L.full + ' ' + g.name); });
      if (scrHud) scrHud.textContent = g.size[0] + ' \u00d7 ' + g.size[1] + ' \u00b7 ' + hostOf(g.play);
      playState();
      if (animate && !RM && win.gsap) {
        win.gsap.fromTo(cabName, { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: 0.45, ease: 'power3.out', delay: 0.05 });
      }
    }
    function playState() {
      var g = game(at);
      cabPlay.classList.toggle('is-on', live);
      cabPlay.querySelector('.pl-a').hidden = live;
      cabPlay.querySelector('.pl-b').hidden = !live;
      /* the label starts with the words on the button, so a voice saying them finds it */
      cabPlay.setAttribute('aria-label', (live ? L.stop + ' ' : L.playHere + ': ') + g.name);
      scr.classList.toggle('is-live', live);
    }

    /* ============================================================
       THE SCENE
       ============================================================ */
    function Scene(container, opts) {
      opts = opts || {};
      var T = win.THREE;
      var renderer = new T.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
      renderer.setPixelRatio(Math.min(win.devicePixelRatio || 1, COARSE ? 1.5 : 1.75));
      renderer.setClearColor(0x000000, 0);
      renderer.outputEncoding = T.sRGBEncoding;
      renderer.toneMapping = T.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.08;
      container.appendChild(renderer.domElement);
      var canvas = renderer.domElement;

      var scene = new T.Scene();
      /* the room's own ground: the back of the platform goes into the dark */
      scene.fog = new T.Fog(new T.Color(P.bg), 16, 34);
      var camera = new T.PerspectiveCamera(30, 1, 0.1, 90);

      var manager = new T.LoadingManager();
      var loader = new T.TextureLoader(manager);
      loader.setCrossOrigin('anonymous');
      var textures = [];
      function tex(url) {
        /* a picture that arrives late is drawn when it arrives */
        var t = loader.load(url, function () { dirty = true; });
        t.encoding = T.sRGBEncoding;
        t.anisotropy = 4;
        textures.push(t);
        return t;
      }
      function canvasTex(c) { var t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; t.anisotropy = 4; textures.push(t); return t; }
      function glowTex() {
        var c = doc.createElement('canvas'); c.width = c.height = 128;
        var x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
        g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,.42)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        x.fillStyle = g; x.fillRect(0, 0, 128, 128);
        var t = new T.CanvasTexture(c); textures.push(t); return t;
      }
      var GLOW = glowTex();
      var lineC = new T.Color(P.line);
      function lineRGBA(a) { return 'rgba(' + Math.round(lineC.r * 255) + ',' + Math.round(lineC.g * 255) + ',' + Math.round(lineC.b * 255) + ',' + a + ')'; }
      function shade(hex, k) { var c = new T.Color(hex); c.r *= k; c.g *= k; c.b *= k; return c; }

      /* ---------------- light ---------------- */
      scene.add(new T.HemisphereLight(0xd5ddda, 0x050606, 0.5));
      var key = new T.SpotLight(0xffffff, 1.55, 40, 0.62, 0.75, 1.3);
      key.position.set(0, 12, 9);
      key.target.position.set(0, 0.9, 0);
      scene.add(key); scene.add(key.target);
      var rim = new T.DirectionalLight(0xc9d3cf, 0.45);
      rim.position.set(-7, 6, -9);
      scene.add(rim);

      /* ---------------- the platform ----------------
         The ring the cabinets stand on is sized for how many there are:
         three stand closer in than five, so the floor does not look empty. */
      var RING = N <= 3 ? 3.0 : N === 4 ? 3.45 : 3.85;
      var R = RING + 1.15;
      /* on a box taller than wide the ring draws in, so that a few cabinets
         still show the ones beside the front one at the edges */
      var ringK = 1;
      var platform = new T.Group();
      scene.add(platform);
      var baseMat = new T.MeshStandardMaterial({ color: new T.Color(P.floor), roughness: 0.42, metalness: 0.35, transparent: true });
      var base = new T.Mesh(new T.CylinderGeometry(R, R, 0.3, 120, 1), baseMat);
      base.position.y = -0.15;
      platform.add(base);
      /* its top is a dial: rings, ticks, a number at each cabinet's place */
      function dialTexture() {
        var S = 2048, c = doc.createElement('canvas'); c.width = c.height = S;
        var x = c.getContext('2d'), m = S / 2, k = m / R;
        x.translate(m, m);
        x.strokeStyle = lineRGBA(0.16); x.lineWidth = 2;
        [R - 0.08, R - 0.42, RING + 0.86, RING - 0.86, 1.3, 0.35].forEach(function (r) {
          if (r <= 0) return;
          x.beginPath(); x.arc(0, 0, r * k, 0, Math.PI * 2); x.stroke();
        });
        for (var d = 0; d < 360; d += 3) {
          var a = d * Math.PI / 180, long = d % 15 === 0;
          x.strokeStyle = lineRGBA(long ? 0.30 : 0.13);
          x.lineWidth = long ? 3 : 2;
          var r0 = (R - 0.42) * k, r1 = (R - (long ? 0.2 : 0.3)) * k;
          x.beginPath(); x.moveTo(Math.sin(a) * r0, Math.cos(a) * r0); x.lineTo(Math.sin(a) * r1, Math.cos(a) * r1); x.stroke();
        }
        /* faint spokes to each cabinet, and its number in front of it */
        x.font = '500 46px ' + F.text; x.textAlign = 'center'; x.textBaseline = 'middle';
        for (var i = 0; i < N; i++) {
          var a2 = i * STEP;
          x.strokeStyle = lineRGBA(0.10); x.lineWidth = 2;
          x.beginPath(); x.moveTo(Math.sin(a2) * 0.35 * k, Math.cos(a2) * 0.35 * k);
          x.lineTo(Math.sin(a2) * (RING - 0.86) * k, Math.cos(a2) * (RING - 0.86) * k); x.stroke();
          x.save();
          x.translate(Math.sin(a2) * (RING + 0.64) * k, Math.cos(a2) * (RING + 0.64) * k);
          x.rotate(-a2);
          x.fillStyle = lineRGBA(0.42);
          x.fillText(pad(i + 1), 0, 0);
          x.restore();
        }
        /* the title, round the rim, as many whole times as fit */
        var words = String(TITLE).toUpperCase().replace(/\s*$/, '') + ' \u00b7 ';
        x.font = '500 30px ' + F.text; x.fillStyle = lineRGBA(0.26);
        var rr = (R - 0.25) * k, circ = Math.PI * 2 * rr;
        var reps = Math.max(1, Math.round(circ / 27 / words.length)), total = reps * words.length, st = (Math.PI * 2) / total;
        for (var j = 0; j < total; j++) {
          var ch = words.charAt(j % words.length), aa = j * st + Math.PI;
          x.save(); x.rotate(aa); x.translate(0, -rr); x.fillText(ch, 0, 0); x.restore();
        }
        return canvasTex(c);
      }
      var dialMat = new T.MeshStandardMaterial({ map: null, transparent: true, depthWrite: false, roughness: 0.6, metalness: 0.1, color: 0xffffff, opacity: 1 });
      var dial = new T.Mesh(new T.CircleGeometry(R - 0.02, 128), dialMat);
      dial.rotation.x = -Math.PI / 2;
      dial.position.y = 0.002;
      platform.add(dial);
      var ringMat = new T.MeshBasicMaterial({ color: lineC.clone(), transparent: true, opacity: 0.55, toneMapped: false });
      var edge = new T.Mesh(new T.TorusGeometry(R, 0.011, 6, 240), ringMat);
      edge.rotation.x = Math.PI / 2; edge.position.y = 0.0;
      platform.add(edge);
      var ringMat2 = ringMat.clone(); ringMat2.opacity = 0.18;
      var edge2 = new T.Mesh(new T.TorusGeometry(R, 0.008, 6, 240), ringMat2);
      edge2.rotation.x = Math.PI / 2; edge2.position.y = -0.3;
      platform.add(edge2);
      /* a pool of light under the platform: it floats on its own glow */
      var poolMat = new T.MeshBasicMaterial({ map: GLOW, color: lineC.clone().multiplyScalar(0.85), transparent: true, opacity: 0.09,
        blending: T.AdditiveBlending, depthWrite: false, toneMapped: false });
      var pool = new T.Mesh(new T.PlaneGeometry(R * 3.4, R * 3.4), poolMat);
      pool.rotation.x = -Math.PI / 2; pool.position.y = -0.32;
      scene.add(pool);
      var platformMats = [baseMat, dialMat, ringMat, ringMat2, poolMat];
      platformMats.forEach(function (m) { m.userData.op = m.opacity; });

      /* ---------------- a cabinet ----------------
         Units are metres, near enough. Origin at the foot of the cabinet,
         +Y up, the front faces +Z. The side profile is a classic upright's:
         a marquee leaning out over the player, the screen tilted back toward
         the player's eyes, a control panel sloping down, the coin door, a
         kick plate. The side panels stand proud of the front by LIP, the way
         real cabinets are built. */
      var W = 1.0, SIDE = 0.06, LIP = 0.035;
      function profile(lip) {
        var Pp = [[-0.49, 0.0], [-0.49, 2.42], [0.36, 2.42], [0.31, 2.1], [0.18, 2.03], [0.28, 1.12],
                  [0.56, 1.03], [0.55, 0.9], [0.38, 0.86], [0.38, 0.1], [0.42, 0.0]];
        return Pp.map(function (p, i) { return (i < 2) ? p : [p[0] - lip, p[1]]; });
      }
      function extrude(pts, depth, bevel) {
        var s = new T.Shape();
        s.moveTo(pts[0][0], pts[0][1]);
        for (var i = 1; i < pts.length; i++) s.lineTo(pts[i][0], pts[i][1]);
        s.closePath();
        var g = new T.ExtrudeGeometry(s, { depth: depth, steps: 1, bevelEnabled: !!bevel,
          bevelThickness: bevel || 0, bevelSize: bevel || 0, bevelSegments: 2, curveSegments: 1 });
        /* shape x -> world +Z, the extrusion -> world X */
        g.rotateY(-Math.PI / 2);
        g.translate(depth / 2, 0, 0);
        return g;
      }
      /* a point on a face of the profile, a fraction t of the way along it,
         and the face's outward normal -- in the cabinet's YZ plane */
      function onFace(a, b, t, lip) {
        var z = a[0] + (b[0] - a[0]) * t - lip, y = a[1] + (b[1] - a[1]) * t;
        var dz = b[0] - a[0], dy = b[1] - a[1], Lf = Math.sqrt(dz * dz + dy * dy);
        return { z: z, y: y, nz: -dy / Lf, ny: dz / Lf, len: Lf, ang: Math.atan2(dz, -dy) };
      }
      var SCREEN_TOP = [0.18, 2.03], SCREEN_BOT = [0.28, 1.12];
      var MARQ_TOP = [0.36, 2.42], MARQ_BOT = [0.31, 2.1];
      var PANEL_A = [0.28, 1.12], PANEL_B = [0.56, 1.03];
      var SMAX = { w: 0.86, h: 0.78 };

      var bodyMat = new T.MeshStandardMaterial({ color: new T.Color(P.cabinet), roughness: 0.64, metalness: 0.18 });
      var sideMat = new T.MeshStandardMaterial({ color: shade(P.cabinet, 0.8), roughness: 0.38, metalness: 0.32 });
      var bezelMat = new T.MeshStandardMaterial({ color: 0x050606, roughness: 0.22, metalness: 0.1 });
      var trimMat = new T.MeshStandardMaterial({ color: 0x6f7571, roughness: 0.35, metalness: 0.6 });
      var kickMat = new T.MeshStandardMaterial({ color: shade(P.cabinet, 0.72), roughness: 0.5, metalness: 0.4 });
      var sideGeo = extrude(profile(0), SIDE, 0.008);
      var coreGeo = extrude(profile(LIP), W - 2 * SIDE, 0);

      var CRT_VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }';
      /* The screen. A CRT look while it shows the game's title screen: scan
         lines, a slow rolling band, a little vignette. uScan goes to 0 as the
         real game takes over the screen, so the hand-over shows no seam. */
      var CRT_FS = [
        'uniform sampler2D map; uniform float uTime; uniform float uScan; uniform float uOn; uniform float uLines; varying vec2 vUv;',
        'void main(){',
        '  vec3 c = texture2D(map, vUv).rgb;',
        '  c = pow(c, vec3(2.2));',
        '  float s = 0.5 + 0.5 * sin(vUv.y * uLines * 6.28318);',
        '  c *= mix(1.0, 0.7 + 0.3 * s, uScan);',
        '  float band = smoothstep(0.0, 0.12, abs(fract(vUv.y * 0.6 - uTime * 0.06) - 0.5));',
        '  c *= mix(1.0, 0.9 + 0.1 * band, uScan);',
        '  vec2 d = vUv - 0.5; c *= mix(1.0, 1.0 - dot(d, d) * 1.1, uScan);',
        '  c *= 1.0 + uScan * 0.025 * sin(uTime * 47.0);',
        '  c = c * uOn * 1.18;',
        '  gl_FragColor = vec4(c, 1.0);',
        '  #include <encodings_fragment>',
        '}'].join('\n');

      function marqueeTexture(g) {
        var c = doc.createElement('canvas'); c.width = 1024; c.height = 340;
        var x = c.getContext('2d');
        var bg = x.createLinearGradient(0, 0, 0, 340);
        bg.addColorStop(0, '#070808'); bg.addColorStop(1, '#121515');
        x.fillStyle = bg; x.fillRect(0, 0, 1024, 340);
        x.strokeStyle = g.color; x.globalAlpha = 0.55; x.lineWidth = 6; x.strokeRect(18, 18, 988, 304);
        x.globalAlpha = 1;
        var t = g.marquee, size = t.length > 8 ? 190 : 230;
        x.textAlign = 'center'; x.textBaseline = 'middle';
        x.font = '400 ' + size + 'px ' + F.pixel;
        while (x.measureText(t).width > 930 && size > 60) { size -= 10; x.font = '400 ' + size + 'px ' + F.pixel; }
        x.shadowColor = g.color; x.shadowBlur = 38;
        x.fillStyle = g.color; x.fillText(t, 512, 182);
        x.shadowBlur = 8; x.fillStyle = '#fff'; x.globalAlpha = 0.85; x.fillText(t, 512, 182);
        return canvasTex(c);
      }
      function blankTex() {
        var c = doc.createElement('canvas'); c.width = c.height = 4;
        var x = c.getContext('2d'); x.fillStyle = '#000'; x.fillRect(0, 0, 4, 4);
        return canvasTex(c);
      }

      var cabs = [], pickables = [];
      function Cabinet(k, g) {
        var color = new T.Color(g.color);
        var root = new T.Group();          /* placed on the floor or at the stage */
        var body = new T.Group();          /* the cabinet itself */
        root.add(body);
        scene.add(root);

        var left = new T.Mesh(sideGeo, sideMat), right = new T.Mesh(sideGeo, sideMat);
        left.position.x = -W / 2 + SIDE / 2; right.position.x = W / 2 - SIDE / 2;
        var core = new T.Mesh(coreGeo, bodyMat);
        body.add(left, right, core);

        /* the screen, the shape its game draws itself at, on a black bezel */
        var sf = onFace(SCREEN_TOP, SCREEN_BOT, 0.5, LIP);
        var ar = g.size[0] / g.size[1];
        var sw = SMAX.w, sh = sw / ar;
        if (sh > SMAX.h) { sh = SMAX.h; sw = sh * ar; }
        var bez = new T.Mesh(new T.PlaneGeometry(W - 2 * SIDE, sf.len), bezelMat);
        var face = new T.Group();
        face.position.set(0, sf.y, sf.z);
        face.rotation.x = -Math.atan2(SCREEN_BOT[0] - SCREEN_TOP[0], SCREEN_TOP[1] - SCREEN_BOT[1]);
        body.add(face);
        bez.position.z = 0.002; face.add(bez);
        /* a thin bright frame round the glass */
        var fr = 0.008, frameG = new T.Group();
        [[0, sh / 2 + fr / 2, sw + fr * 2, fr], [0, -sh / 2 - fr / 2, sw + fr * 2, fr],
         [-sw / 2 - fr / 2, 0, fr, sh], [sw / 2 + fr / 2, 0, fr, sh]].forEach(function (b) {
          var m = new T.Mesh(new T.PlaneGeometry(b[2], b[3]), trimMat);
          m.position.set(b[0], b[1], 0.004); frameG.add(m);
        });
        face.add(frameG);
        var crt = new T.ShaderMaterial({
          uniforms: { map: { value: g.screen ? tex(g.screen) : blankTex() }, uTime: { value: 0 }, uScan: { value: 1 }, uOn: { value: 1 },
                      uLines: { value: Math.round(g.size[1] / 3) } },
          vertexShader: CRT_VS, fragmentShader: CRT_FS, toneMapped: false
        });
        var glass = new T.Mesh(new T.PlaneGeometry(sw, sh), crt);
        glass.position.z = 0.005;
        face.add(glass);
        /* light off the screen: a soft halo */
        var halo = new T.Sprite(new T.SpriteMaterial({ map: GLOW, color: color, transparent: true, opacity: 0.22,
          blending: T.AdditiveBlending, depthWrite: false, toneMapped: false }));
        halo.scale.set(sw * 2.1, sh * 2.1, 1);
        halo.position.z = 0.09;
        face.add(halo);

        /* the marquee: the name, lit */
        var mf = onFace(MARQ_TOP, MARQ_BOT, 0.5, LIP);
        var marqMat = new T.MeshBasicMaterial({ color: 0x0a0c0b, toneMapped: false });
        var marq = new T.Mesh(new T.PlaneGeometry(W - 2 * SIDE - 0.02, mf.len - 0.03), marqMat);
        marq.position.set(0, mf.y, mf.z + 0.003 * mf.nz);
        marq.rotation.x = Math.atan2(MARQ_TOP[0] - MARQ_BOT[0], MARQ_TOP[1] - MARQ_BOT[1]);
        body.add(marq);
        var mglow = new T.Sprite(new T.SpriteMaterial({ map: GLOW, color: color, transparent: true, opacity: 0.3,
          blending: T.AdditiveBlending, depthWrite: false, toneMapped: false }));
        mglow.scale.set(1.7, 0.75, 1);
        mglow.position.set(0, mf.y, mf.z + 0.12);
        body.add(mglow);

        /* the control panel: a stick and three buttons in the game's colour */
        var pf = onFace(PANEL_A, PANEL_B, 0.5, LIP);
        var panel = new T.Group();
        panel.position.set(0, pf.y, pf.z);
        panel.rotation.x = Math.atan2(PANEL_A[1] - PANEL_B[1], PANEL_B[0] - PANEL_A[0]);
        body.add(panel);
        var knobMat = new T.MeshStandardMaterial({ color: color, emissive: color, emissiveIntensity: 0.35, roughness: 0.3, metalness: 0.1 });
        var shaft = new T.Mesh(new T.CylinderGeometry(0.011, 0.011, 0.11, 10), trimMat);
        shaft.position.set(-0.24, 0.055, 0); panel.add(shaft);
        var ball = new T.Mesh(new T.SphereGeometry(0.036, 18, 12), knobMat);
        ball.position.set(-0.24, 0.12, 0); panel.add(ball);
        var ring = new T.Mesh(new T.CylinderGeometry(0.05, 0.05, 0.008, 18), kickMat);
        ring.position.set(-0.24, 0.004, 0); panel.add(ring);
        [0.06, 0.17, 0.28].forEach(function (xx, j) {
          var b = new T.Mesh(new T.CylinderGeometry(0.03, 0.03, 0.02, 18), j === 2 ? trimMat : knobMat);
          b.position.set(xx, 0.01, j === 1 ? -0.03 : 0.01); panel.add(b);
        });

        /* the coin door: two lit slots */
        var door = new T.Mesh(new T.PlaneGeometry(0.34, 0.4), kickMat);
        door.position.set(0, 0.5, 0.38 - LIP + 0.002);
        body.add(door);
        var slotMat = new T.MeshBasicMaterial({ color: 0xff5a2a, toneMapped: false });
        [-0.07, 0.07].forEach(function (xx) {
          var s = new T.Mesh(new T.PlaneGeometry(0.035, 0.07), slotMat);
          s.position.set(xx, 0.6, 0.38 - LIP + 0.004); body.add(s);
        });
        var kick = new T.Mesh(new T.PlaneGeometry(W - 2 * SIDE, 0.1), kickMat);
        kick.position.set(0, 0.05, 0.42 - LIP - 0.02);
        body.add(kick);

        /* neon along the front edge of each side panel, in the game's colour */
        var edgePts = profile(0).slice(2).map(function (p) { return new T.Vector3(0, p[1], p[0] + 0.004); });
        var path = new T.CurvePath();
        for (var e = 0; e < edgePts.length - 1; e++) path.add(new T.LineCurve3(edgePts[e], edgePts[e + 1]));
        var neonMat = new T.MeshBasicMaterial({ color: color, toneMapped: false });
        var tubeGeo = new T.TubeGeometry(path, 80, 0.008, 5, false);
        [-W / 2 - 0.009, W / 2 + 0.009].forEach(function (xx) {
          var t = new T.Mesh(tubeGeo, neonMat); t.position.x = xx; body.add(t);
        });

        /* side art, framed, on both sides */
        if (g.side) {
          var artMat = new T.MeshStandardMaterial({ map: tex(g.side), roughness: 0.55, metalness: 0.05 });
          var aw = 0.68, ah = 0.95;
          [1, -1].forEach(function (s) {
            var a = new T.Mesh(new T.PlaneGeometry(aw, ah), artMat);
            a.position.set(s * (W / 2 + 0.011), 1.27, -0.13);
            a.rotation.y = s * Math.PI / 2;
            body.add(a);
          });
        }

        /* the cabinet's own shadow, and the screen's light on the floor */
        var shadow = new T.Mesh(new T.PlaneGeometry(1.75, 1.75), new T.MeshBasicMaterial({ map: GLOW, color: 0x000000,
          transparent: true, opacity: 0.75, depthWrite: false }));
        shadow.rotation.x = -Math.PI / 2; shadow.position.set(0, 0.006, 0);
        root.add(shadow);
        var spill = new T.Mesh(new T.PlaneGeometry(2.2, 1.6), new T.MeshBasicMaterial({ map: GLOW, color: color,
          transparent: true, opacity: 0.2, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false }));
        spill.rotation.x = -Math.PI / 2; spill.position.set(0, 0.008, 0.95);
        root.add(spill);
        var lamp = null;
        if (!COARSE) {
          lamp = new T.PointLight(color, 0.9, 3.4, 2);
          lamp.position.set(0, sf.y, sf.z + 0.7);
          body.add(lamp);
        }

        [left, right, core, bez, glass, marq].forEach(function (m) { m.userData.k = k; pickables.push(m); });

        return {
          k: k, g: g, root: root, body: body, face: face, glass: glass, crt: crt, halo: halo, mglow: mglow, marqMat: marqMat,
          shadow: shadow, spill: spill, lamp: lamp, sw: sw, sh: sh,
          /* the screen's centre and the way it faces, in the cabinet's own space */
          screenC: new T.Vector3(0, sf.y, sf.z + 0.005 * sf.nz),
          tilt: face.rotation.x,
          hover: 0, grow: 1
        };
      }
      for (var k = 0; k < N; k++) cabs.push(Cabinet(k, GAMES[k]));

      /* ---------------- where things stand ----------------
         ON THE FLOOR a cabinet sits on the ring at its own angle, turned
         with the platform -- but it keeps (nearly) facing the room, so every
         screen stays in sight. AT THE STAGE it stands square to the camera,
         close, its screen exactly where the game's frame will be. */
      var rot = { cur: 0, target: 0 };
      var STAGE_FOV = 17, floorFov = 30, lens = 0;
      var tmpV = new T.Vector3(), tmpE = new T.Euler();
      var YAW = N <= 3 ? 0.36 : 0.28;
      function floorPose(c, out) {
        var psi = c.k * STEP + rot.cur;                  /* where on the circle, seen from the camera */
        out.pos.set(Math.sin(psi) * RING * ringK, 0, Math.cos(psi) * RING * ringK);
        var yaw = Math.atan2(Math.sin(psi), Math.cos(psi)) * YAW;
        out.quat.setFromEuler(tmpE.set(0, yaw, 0));
        out.scale = c.grow;
        return out;
      }
      /* Fit the cabinet into a box of the arcade (CSS px), square to the camera.
         STEPPED UP: the cabinet's front, its marquee whole down to the control
         panel's edge. PLAYING: the screen and a margin of bezel, as large as
         the box allows -- the cabinet leans in when the game is played. */
      function stagePose(c, box, out, tight) {
        var Wc = canvas.clientWidth || 1, Hc = canvas.clientHeight || 1;
        var tanH = Math.tan(STAGE_FOV * Math.PI / 360), asp = camera.aspect;
        var top = tight ? c.sh / 2 + 0.05 : c.sh / 2 + 0.56, bot = tight ? -c.sh / 2 - 0.05 : -c.sh / 2 - 0.13;
        var fw = tight ? c.sw + 0.1 : W + 0.08, fh = top - bot;
        var dH = fh * Hc / (2 * tanH * box.h), dW = fw * Wc / (2 * tanH * asp * box.w);
        var d = Math.max(dH, dW);
        var cx = box.x + box.w / 2, cy = box.y + box.h / 2;
        var nx = cx / Wc * 2 - 1, ny = 1 - cy / Hc * 2;
        var X = nx * d * tanH * asp, Y = ny * d * tanH;
        var mid = (top + bot) / 2;
        /* screen centre in camera space; the cabinet turned so the screen is
           square to the camera (undoing its tilt back) */
        var S = tmpV.set(X, Y - mid, -d);
        var q = new T.Quaternion().setFromAxisAngle(new T.Vector3(1, 0, 0), -c.tilt);
        var Pp = S.clone().sub(c.screenC.clone().applyQuaternion(q));
        camera.updateMatrixWorld();
        out.pos.copy(Pp).applyMatrix4(camera.matrixWorld);
        out.quat.copy(camera.quaternion).multiply(q);
        out.scale = 1;
        return out;
      }
      function pose() { return { pos: new T.Vector3(), quat: new T.Quaternion(), scale: 1 }; }
      /* each cabinet's flight: from A to B, t of the way */
      cabs.forEach(function (c) { c.fl = { a: 'floor', b: 'floor', t: 0, box: null, side: 0, A: pose(), B: pose(), P: pose() }; });
      function poseOf(c, which, out) {
        if (which === 'floor') return floorPose(c, out);
        stagePose(c, c.fl.box || stageBox(), out, which === 'play');
        if (which === 'gone') {
          /* off to one side and small: where a cabinet goes when the next one
             takes the stage, and where the next one comes from */
          var shift = new T.Vector3((c.fl.side || 1) * 2.6, -0.25, -1.6).applyQuaternion(camera.quaternion);
          out.pos.add(shift); out.scale = 0.001;
        }
        return out;
      }
      function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
      function place(c) {
        var f = c.fl;
        poseOf(c, f.a, f.A);
        if (f.t <= 0 || f.a === f.b) { f.P = f.A; }
        else {
          poseOf(c, f.b, f.B);
          /* most flights ease in and out; stepping along, the one leaving
             speeds away and the one arriving slows into place */
          var e = f.ease === 'in' ? f.t * f.t * f.t : f.ease === 'out' ? 1 - Math.pow(1 - f.t, 3) : ease(f.t);
          f.P.pos.copy(f.A.pos).lerp(f.B.pos, e);
          f.P.quat.copy(f.A.quat).slerp(f.B.quat, e);
          f.P.scale = f.A.scale + (f.B.scale - f.A.scale) * e;
          /* a flight from the floor arcs up and out a little rather than sliding */
          if ((f.a === 'floor') !== (f.b === 'floor')) f.P.pos.y += Math.sin(e * Math.PI) * 0.35;
        }
        c.root.position.copy(f.P.pos);
        c.root.quaternion.copy(f.P.quat);
        /* the shadow, the floor glow and the hover belong to the floor: a
           cabinet on the stage is never grown by the pointer, or its screen
           would no longer be where the game's frame is */
        var onFloor = (f.a === 'floor' ? 1 - ease(f.t) : 0) + (f.b === 'floor' ? ease(f.t) : 0);
        if (f.a === 'floor' && f.b === 'floor') onFloor = 1;
        var s = Math.max(0.001, f.P.scale * (1 + c.hover * 0.025 * onFloor));
        c.root.scale.setScalar(s);
        c.root.visible = s > 0.002;
        c.shadow.material.opacity = 0.75 * onFloor; c.spill.material.opacity = 0.2 * onFloor;
        c.shadow.visible = c.spill.visible = onFloor > 0.01;
      }

      /* ---------------- the camera ----------------
         Framed from the arcade's own box: the cabinet in front stands on top
         of the name plate, about three quarters as tall as the space above
         it -- and, on a box wide enough, the whole platform fits across. The
         picture is moved up or down with a shift of the lens (setViewOffset),
         not by tilting the camera, so the perspective stays the same at any
         height. At a cabinet the lens closes to STAGE_FOV and the shift goes
         back to the centre. */
      var floorBox = null, floorShift = 0, base0 = new T.Vector3();
      function frameFloor() {
        var Wc = canvas.clientWidth || 1, Hc = canvas.clientHeight || 1, a = Wc / Hc;
        camera.aspect = a;
        floorFov = a < 0.8 ? 34 : 30;
        ringK = (a < 0.8 && N <= 4) ? 0.67 : 1;
        platform.scale.set(ringK, 1, ringK);
        pool.scale.set(ringK, ringK, 1);
        var Rk = R * ringK, RINGk = RING * ringK;
        var b = opts.floorBox ? opts.floorBox() : null;
        if (b && b.bottom - b.top > 60) floorBox = b;
        var top = floorBox ? floorBox.top : Hc * 0.12, bot = floorBox ? floorBox.bottom : Hc * 0.62;
        var tanH = Math.tan(floorFov * Math.PI / 360);
        var want = (bot - top) * (a < 0.8 ? 0.76 : 0.74);
        var D = 2.42 * Hc / (2 * tanH * want);
        if (a >= 0.8) D = Math.max(D, Rk / (tanH * a * 0.92) - RINGk);
        D = clamp(D, 5, 40);
        camera.fov = floorFov;
        camera.clearViewOffset();
        camera.position.set(0, 1.55 + D * 0.17, RINGk + D);
        camera.lookAt(0, 1.2, RINGk * 0.25);
        camera.updateProjectionMatrix();
        camera.updateMatrixWorld();
        /* where the foot of the cabinet in front falls, and the shift that puts it on the plate */
        base0.set(0, 0, RINGk).project(camera);
        floorShift = (1 - base0.y) / 2 * Hc - bot;
        lensNow();
      }
      function lensNow() {
        var Wc = canvas.clientWidth || 1, Hc = canvas.clientHeight || 1;
        camera.fov = floorFov + (STAGE_FOV - floorFov) * lens;
        var sh = floorShift * (1 - lens);
        if (Math.abs(sh) > 0.5) camera.setViewOffset(Wc, Hc, 0, sh, Wc, Hc); else camera.clearViewOffset();
        camera.updateProjectionMatrix();
        camera.updateMatrixWorld();
      }
      function resize() {
        var Wc = container.clientWidth || 1, Hc = container.clientHeight || 1;
        renderer.setSize(Wc, Hc, false);
        canvas.style.width = Wc + 'px'; canvas.style.height = Hc + 'px';
        frameFloor();
        dirty = true;
      }

      /* ---------------- picking ---------------- */
      var ray = new T.Raycaster(), ndc = new T.Vector2();
      function pick(x, y) {
        var r = canvas.getBoundingClientRect();
        ndc.set((x - r.left) / r.width * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
        ray.setFromCamera(ndc, camera);
        var hit = ray.intersectObjects(pickables, false)[0];
        return hit ? hit.object.userData.k : -1;
      }
      /* the screen of cabinet k in the arcade's box: its four corners projected */
      var corners = [new T.Vector3(), new T.Vector3(), new T.Vector3(), new T.Vector3()];
      function screenRect(k) {
        var c = cabs[k]; place(c); c.root.updateMatrixWorld(true);
        var Wc = canvas.clientWidth, Hc = canvas.clientHeight, xs = [], ys = [];
        [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(function (s, j) {
          corners[j].set(s[0] * c.sw / 2, s[1] * c.sh / 2, 0).applyMatrix4(c.glass.matrixWorld).project(camera);
          xs.push((corners[j].x + 1) / 2 * Wc);
          ys.push((1 - corners[j].y) / 2 * Hc);
        });
        var x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs), y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys);
        return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
      }
      function where(k) { var s = screenRect(k); return { x: s.x + s.w / 2, y: s.y + s.h / 2, w: s.w, h: s.h }; }

      /* ---------------- the loop ----------------
         It draws only when something has changed, and not at all while the
         arcade is out of view, the tab is hidden, the host page says so
         (`paused`), or a game is running in front of a still scene. The
         screens' slow CRT roll is the one thing that moves on its own: on
         the floor it is drawn at half the frame rate, and not at all under
         reduced motion. */
      var dirty = true, frames = 0, last = performance.now(), clock = 0, odd = false, raf = 0;
      var platformOp = 1;
      function setPlatform(op) {
        platformOp = op;
        platformMats.forEach(function (m) { m.opacity = m.userData.op * op; });
        platform.visible = pool.visible = op > 0.01;
        dirty = true;
      }
      function animating() {
        return Math.abs(rot.target - rot.cur) > 1e-4 || cabs.some(function (c) {
          return (c.fl.t > 0 && c.fl.t < 1) || Math.abs(c.hover - (c.hoverTo || 0)) > 0.01;
        });
      }
      function loop(now) {
        raf = requestAnimationFrame(loop);
        var dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000)); last = now;
        /* under the loader one frame is drawn (it pays for the shaders there),
           then nothing until the arcade is up */
        if (doc.hidden || !visible || paused() || (!started && frames > 0)) return;
        var k60 = dt * 60;
        var moving = animating();
        rot.cur += (rot.target - rot.cur) * (RM ? 1 : 1 - Math.pow(0.86, k60));
        if (Math.abs(rot.target - rot.cur) < 1e-4) rot.cur = rot.target;
        platform.rotation.y = rot.cur;
        cabs.forEach(function (c) { c.hover += ((c.hoverTo || 0) - c.hover) * (1 - Math.pow(0.8, k60)); });
        var crtOn = view === 'floor' && !RM;
        if (crtOn) clock += dt;
        odd = !odd;
        if (!(moving || dirty || (crtOn && odd))) return;
        cabs.forEach(function (c) { c.crt.uniforms.uTime.value = clock; place(c); });
        renderer.render(scene, camera);
        frames++;
        dirty = false;
      }
      raf = requestAnimationFrame(loop);

      /* the marquees and the dial are lettered on canvases, so they are drawn
         once the faces they are lettered in have arrived */
      function drawText() {
        if (dialMat.map) dialMat.map.dispose();
        dialMat.map = dialTexture(); dialMat.needsUpdate = true;
        cabs.forEach(function (c) {
          if (c.marqMat.map) c.marqMat.map.dispose();
          c.marqMat.map = marqueeTexture(c.g); c.marqMat.color.set(0xffffff); c.marqMat.needsUpdate = true;
        });
        resize();
      }
      function dispose() {
        cancelAnimationFrame(raf);
        scene.traverse(function (o) {
          if (o.geometry) o.geometry.dispose();
          if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(function (m) { m.dispose(); });
        });
        textures.forEach(function (t) { t.dispose(); });
        renderer.dispose();
        try { renderer.forceContextLoss(); } catch (e) {}
        if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
      }

      resize();

      var api = {
        canvas: canvas, cabs: cabs, rot: rot, camera: camera, manager: manager,
        resize: resize, pick: pick, where: where, screenRect: screenRect,
        setPlatform: setPlatform, place: place, drawText: drawText, dispose: dispose,
        lens: function (v) { lens = v; lensNow(); dirty = true; },
        touch: function () { dirty = true; },
        hover: function (k) { cabs.forEach(function (c) { c.hoverTo = (c.k === k && view === 'floor') ? 1 : 0; }); dirty = true; },
        fly: function (k, a, b, box, side, how) { var f = cabs[k].fl; f.a = a; f.b = b; f.t = 0; if (box) f.box = box; f.side = side || f.side; f.ease = how || ''; dirty = true; },
        /* drop the CRT look as the real game takes the screen (and bring it back) */
        scan: function (k, v) { cabs[k].crt.uniforms.uScan.value = v; dirty = true; },
        state: function () {
          return { frames: frames, rot: rot.cur, target: rot.target, platform: platformOp, ring: +(RING * ringK).toFixed(2),
            floorBox: floorBox, shift: +floorShift.toFixed(1), cam: [+camera.position.y.toFixed(3), +camera.position.z.toFixed(3)], lens: lens, fov: camera.fov,
            cabs: cabs.map(function (c) { return { k: c.k, a: c.fl.a, b: c.fl.b, t: +c.fl.t.toFixed(3), visible: c.root.visible,
              scale: +c.root.scale.x.toFixed(3), hover: +c.hover.toFixed(3), scan: +c.crt.uniforms.uScan.value.toFixed(2),
              pos: [+c.root.position.x.toFixed(3), +c.root.position.y.toFixed(3), +c.root.position.z.toFixed(3)] }; }) };
        }
      };
      /* a flight's progress is driven from outside */
      api.cabT = function (k, t) { cabs[k].fl.t = t; dirty = true; };
      api.settleAt = function (k, which) { var f = cabs[k].fl; f.a = f.b = which; f.t = 0; dirty = true; };
      return api;
    }

    /* ============================================================
       THE BOX THE CABINET STEPS INTO
       The part of the arcade the console leaves free: to its right on a
       wide box, above it on a narrow one, to its left on a short one (the
       styles say which, with --stage on .ak-cab). In the arcade's own px.
       ============================================================ */
    function insets() {
      /* the room a notch leaves, where the arcade reaches the window's edge */
      var r = room.getBoundingClientRect(), s = safeEl ? safeEl.getBoundingClientRect() : null;
      if (!s) return { l: 0, r: 0, t: 0, b: 0 };
      var il = s.left - r.left, ir = r.right - s.right, it = s.top - r.top, ib = r.bottom - s.bottom;
      return {
        l: Math.max(0, il - r.left), r: Math.max(0, ir - (win.innerWidth - r.right)),
        t: Math.max(0, it - r.top), b: Math.max(0, ib - (win.innerHeight - r.bottom))
      };
    }
    function topEdge() { return (+INSET.top || 0) + 10; }
    /* The floor is framed on the name plate's top edge as it stands with its
       text in place. While a name types in, a line of it is blank for a
       moment and the plate is shorter, so then the last settled measure is
       used; if the plate has moved by the time the typing ends (the box
       changed shape meanwhile), the floor is framed again. */
    var plateTop = null;
    function plateTyping() { return !!(plName._akTyping || plSub._akTyping || plTag._akTyping); }
    function plateBox() {
      if (!plate.offsetHeight || floor.hidden) return null;
      if (plateTop == null || !plateTyping()) plateTop = plate.offsetTop;
      return { top: topEdge() + 16, bottom: plateTop - 12 };
    }
    function afterType(el) {
      if ((el === plName || el === plSub || el === plTag) && gl && plateTop != null && !plateTyping()
          && !floor.hidden && plate.offsetHeight && plate.offsetTop !== plateTop) gl.resize();
    }
    function stageBox() {
      var Wv = room.clientWidth, Hv = room.clientHeight;
      var mode = (win.getComputedStyle(cab).getPropertyValue('--stage') || 'right').trim();
      var rr = room.getBoundingClientRect(), cr = consoleEl.getBoundingClientRect();
      var c = { left: cr.left - rr.left, right: cr.right - rr.left, top: cr.top - rr.top, bottom: cr.bottom - rr.top };
      var sa = insets(), top = topEdge() + sa.t, bot = (+INSET.bottom || 0) + sa.b;
      var box;
      if (mode === 'top') box = { x: sa.l + 10, y: top, w: Wv - sa.l - sa.r - 20, h: c.top - 12 - top };
      else if (mode === 'left') box = { x: sa.l + 10, y: top, w: c.left - 22 - sa.l, h: Hv - top - 8 - bot };
      else box = { x: c.right + 30, y: top + 8, w: Wv - c.right - 30 - 34 - sa.r, h: Hv - top - 40 - bot };
      box.w = Math.max(120, box.w); box.h = Math.max(120, box.h);
      return box;
    }

    /* ============================================================
       THE GAME'S FRAME
       One game runs at a time: the one in the cabinet that is open. It is
       drawn at the size it draws itself at and scaled to the screen, so a
       game laid out for 960x720 stays laid out for 960x720.
       ============================================================ */
    /* Where a game actually comes from. Usually its address. A game whose
       page is a card with the game packed inside it as base64 (FAKE QUEST's
       github page) has `extract`: that page is fetched and the game lifted
       out of it and run through srcdoc -- a blob: URL belongs to the origin
       that made it, and a frame sandboxed without allow-same-origin may not
       load one. If the fetch cannot happen (offline, or a page opened off the
       disk) the fallback address runs instead. Resolved once and kept. */
    var sources = {};
    function source(g) {
      if (sources[g.name]) return Promise.resolve(sources[g.name]);
      var fall = { src: g.src };
      if (!g.extract || !win.fetch || !win.TextDecoder) { sources[g.name] = fall; return Promise.resolve(fall); }
      return win.fetch(g.extract).then(function (r) { return r.text(); }).then(function (t) {
        var m = /base64Html\s*=\s*"([A-Za-z0-9+\/=]+)"/.exec(t);
        if (!m) throw new Error('no game inside that page');
        var bin = atob(m[1]), bytes = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        sources[g.name] = { doc: new TextDecoder('utf-8').decode(bytes) };
        return sources[g.name];
      }).catch(function () { sources[g.name] = fall; return fall; });
    }
    function put(f, s) {
      if (s.doc) { f.removeAttribute('src'); f.srcdoc = s.doc; }
      else { f.removeAttribute('srcdoc'); f.src = s.src; }
    }
    var slowT = 0;
    var SLOW = typeof cfg.slowAfter === 'number' ? cfg.slowAfter : 12000;
    function mountFrame(i) {
      unmountFrame();
      var g = game(i);
      var f = doc.createElement('iframe');
      f.className = 'ak-scr__game';
      f.title = g.name;
      f.tabIndex = -1;
      f.setAttribute('sandbox', g.sandbox);
      f.setAttribute('allow', 'autoplay; fullscreen');
      f.setAttribute('referrerpolicy', 'no-referrer');
      f.setAttribute('data-game', g.name);
      scrFrame.insertBefore(f, scrFrame.firstChild);
      frame = f;
      scr.classList.remove('is-in', 'is-slow');
      clearTimeout(slowT);
      slowT = setTimeout(function () { if (frame === f) scr.classList.add('is-slow'); }, SLOW);
      source(g).then(function (s) {
        if (frame !== f) return;
        f.addEventListener('load', function () {
          if (frame !== f) return;
          clearTimeout(slowT);
          scr.classList.remove('is-slow');
          scr.classList.add('is-in');
          fit();
        }, { once: true });
        put(f, s);
        fit();
      });
    }
    function unmountFrame() {
      clearTimeout(slowT);
      if (live) release(true);
      if (frame) {
        try { frame.blur(); } catch (e) {}
        if (frame.parentNode) frame.parentNode.removeChild(frame);
      }
      frame = null;
      scr.classList.remove('is-in', 'is-slow');
    }
    function fit() {
      if (!frame) return;
      var g = game(at), nw = g.size[0], nh = g.size[1];
      var w = scrFrame.clientWidth, h = scrFrame.clientHeight;
      if (!w || !h) return;
      var k = Math.min(w / nw, h / nh);
      frame.style.width = nw + 'px';
      frame.style.height = nh + 'px';
      frame.style.transform = 'translate(' + ((w - nw * k) / 2) + 'px,' + ((h - nh * k) / 2) + 'px) scale(' + k + ')';
    }
    /* the frame laid over the scene's screen, exactly */
    function placeScreen() {
      if (full) { fit(); return; }
      var r;
      if (gl) { gl.place(gl.cabs[at]); r = gl.screenRect(at); }
      else {
        var b = stageBox(), g = game(at), ar = g.size[0] / g.size[1];
        var w = Math.min(b.w, b.h * ar), h = w / ar;
        r = { x: b.x + (b.w - w) / 2, y: b.y + (b.h - h) / 2, w: w, h: h };
      }
      scr.style.left = Math.round(r.x) + 'px';
      scr.style.top = Math.round(r.y) + 'px';
      scr.style.width = Math.round(r.w) + 'px';
      scr.style.height = Math.round(r.h) + 'px';
      fit();
    }

    /* ---- handing the controls to the game ---- */
    function play() {
      if (!frame || live) return;
      live = true;
      playState();
      keys();
      if (!full) lean('play');
      emit('onPlay');
    }
    /* focus the frame itself so the keys go to the game, not to this page */
    function keys() { try { if (frame) frame.focus({ preventScroll: true }); } catch (e) {} }
    function release(quiet) {
      if (!live) return;
      try { if (frame) frame.blur(); } catch (e) {}
      live = false;
      playState();
      emit('onStop');
      if (!quiet) {
        lean('stage');
        try { (view === 'cab' ? cabPlay : plGo).focus({ preventScroll: true }); } catch (e) {}
      }
    }
    /* The cabinet leans in to be played -- its screen grows to fill the box
       beside the console -- and stands back when the game is let go. The
       game's frame rides on the screen the whole way. */
    function lean(to) {
      if (view !== 'cab' || busy || rest === to) return;
      var from = rest;
      rest = to;
      /* Play / Stop pressed again half way: back the way it came, from where it is */
      if (zoomTl && zoomEnds && (to === zoomEnds[0] || to === zoomEnds[1])) { zoomTl.reversed(to === zoomEnds[0]); return; }
      if (zoomTl) { zoomTl.kill(); zoomTl = null; }
      if (!gl || !win.gsap || RM) {
        if (gl) gl.settleAt(at, to);
        placeScreen();
        return;
      }
      var f = { t: 0 }, ends = zoomEnds = [from, to];
      gl.fly(at, from, to, stageBox());
      zoomTl = win.gsap.to(f, { t: 1, duration: 0.55, ease: 'none',
        onUpdate: function () { gl.cabT(at, f.t); placeScreen(); },
        onComplete: function () { zoomTl = null; gl.settleAt(at, ends[1]); placeScreen(); },
        onReverseComplete: function () { zoomTl = null; gl.settleAt(at, ends[0]); placeScreen(); } });
    }
    /* a press anywhere that is not the game gives the controls back -- except
       on the arcade's own controls, which each do it their own way: Play /
       Stop toggles, Restart and Full screen keep the keys with the game, and
       the way back and the arrows let go without the cabinet first leaning
       back (it flies from where it is) */
    on(doc, 'pointerdown', function (e) {
      if (!live || scrFrame.contains(e.target)) return;
      if (room.contains(e.target) && e.target.closest && e.target.closest('[data-ak]')) return;
      release();
    }, true);
    /* Back to the screen it opens on. Cross-origin means the game cannot be
       reached into and reloaded, and a frame sent to its address again would
       add a step to the browser's history -- Back would then go back inside
       the game. So the frame is replaced with a new one, whose first page
       replaces nothing; if the game had the keys, the new one gets them. */
    function restart() {
      if (!frame) return;
      var had = live;
      mountFrame(at);
      if (had) play();
    }
    /* Full screen: the same frame promoted -- never re-parented, so the game
       keeps running rather than restarting. With the browser's Fullscreen
       API where there is one; where there is not (an iPhone) it fills the
       arcade's box. */
    function enterFull() {
      if (!frame || full) return;
      full = true;
      scr.classList.add('is-full');
      Array.prototype.forEach.call(consoleEl.querySelectorAll('[data-ak="full"]'), function (b) { b.setAttribute('aria-pressed', 'true'); });
      if (scr.requestFullscreen) { var p = scr.requestFullscreen(); if (p && p.catch) p.catch(function () {}); }
      fit();
      requestAnimationFrame(function () { fit(); if (live) keys(); else play(); });
    }
    function leaveFull() {
      if (!full) return;
      full = false;
      scr.classList.remove('is-full');
      Array.prototype.forEach.call(consoleEl.querySelectorAll('[data-ak="full"]'), function (b) { b.setAttribute('aria-pressed', 'false'); });
      if (doc.fullscreenElement === scr && doc.exitFullscreen) { var p = doc.exitFullscreen(); if (p && p.catch) p.catch(function () {}); }
      placeScreen();
      requestAnimationFrame(function () { placeScreen(); if (live) keys(); });
    }
    on(doc, 'fullscreenchange', function () { if (doc.fullscreenElement !== scr && full) leaveFull(); });

    /* ============================================================
       THE FLOOR: turning the platform
       ============================================================ */
    function go(to, now) {
      /* the short way round, whichever cabinet is asked for */
      var cur = mod(turn, N), d = mod(to - cur + Math.floor(N / 2), N) - Math.floor(N / 2);
      turnTo(turn + d, now);
    }
    function turnTo(t, now) {
      var was = at;
      turn = t; at = mod(t, N);
      if (gl) { gl.rot.target = -turn * STEP; if (now) gl.rot.cur = gl.rot.target; gl.touch(); }
      if (was !== at || now) paintFloor(!now && was !== at);
      if (was !== at && started) say(code(at) + ', ' + L.cabinet.toLowerCase() + ' ' + (at + 1) + ' of ' + N + (game(at).line ? ': ' + game(at).line.toLowerCase() : ''));
      if (was !== at) emit('onTurn');
    }
    /* a gesture carries the platform with it; when it stops, it comes to rest
       on the cabinet nearest the front -- or on the next one along, if it was
       taken that way but left short, so a notch of a wheel or a flick is a
       step and not a nudge back */
    function nudge(rad) { if (gl) { gl.rot.target += rad; gl.touch(); } }
    function settle(v) {
      if (!gl || view !== 'floor' || busy) return;
      var x = -gl.rot.target / STEP, n = Math.round(x), off = x - turn;
      if (n === turn && Math.abs(off) > 0.12) n = turn + (off > 0 ? 1 : -1);
      if (n === turn && v && Math.abs(v) > 0.4) n = turn + (v > 0 ? 1 : -1);
      turnTo(n);
    }
    /* Either way of a wheel, and a trackpad's swipe, turns the platform --
       over the arcade only, and cancelled there (which is what stops a
       sideways two-finger swipe on a Mac from being read as BACK). In a
       cabinet a firm scroll steps to the next one, once per gesture. A pinch
       is the browser's (it zooms the page). wheel:false leaves the wheel to
       the page altogether. */
    var idle = 0, wheelAcc = 0, wheelLock = 0;
    if (WHEEL) on(room, 'wheel', function (e) {
      if (e.ctrlKey || paused()) return;
      e.preventDefault();
      if (busy || full || live) return;
      var d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (e.deltaMode === 1) d *= 32; else if (e.deltaMode === 2) d *= room.clientWidth;
      if (view === 'cab' && e.target.closest && e.target.closest('.ak-console') &&
          consoleEl.scrollHeight > consoleEl.clientHeight + 2 && Math.abs(e.deltaY) >= Math.abs(e.deltaX)) {
        consoleEl.scrollTop += d; return;
      }
      if (view === 'floor' && !gl) {
        /* no scene to turn: a firm scroll steps a cabinet */
        var t = performance.now();
        if (t < wheelLock) return;
        wheelAcc += d;
        clearTimeout(idle);
        idle = setTimeout(function () { wheelAcc = 0; }, 220);
        if (Math.abs(wheelAcc) > 140) { go(at + (wheelAcc > 0 ? 1 : -1)); wheelAcc = 0; wheelLock = t + 450; }
      } else if (view === 'floor') {
        nudge(-d * 0.0032);
        clearTimeout(idle);
        idle = setTimeout(function () { settle(0); }, 150);
      } else {
        var now = performance.now();
        if (now < wheelLock) return;
        wheelAcc += d;
        clearTimeout(idle);
        idle = setTimeout(function () { wheelAcc = 0; }, 220);
        if (Math.abs(wheelAcc) > 140) { step(wheelAcc > 0 ? 1 : -1); wheelAcc = 0; wheelLock = now + 900; }
      }
    }, { passive: false });

    /* drag on the floor: the platform follows the pointer; a press that does
       not move picks the cabinet under it */
    var down = null;
    function onDown(e) {
      if (view !== 'floor' || busy || e.button > 0) return;
      down = { x: e.clientX, y: e.clientY, t: e.timeStamp, lx: e.clientX, lt: e.timeStamp, moved: 0, v: 0, id: e.pointerId };
      try { stageEl.setPointerCapture(e.pointerId); } catch (err) {}
    }
    function onMove(e) {
      if (down && e.pointerId === down.id) {
        var dx = e.clientX - down.lx;
        down.moved += Math.abs(dx) + Math.abs(e.clientY - down.y) * 0.1;
        var dt = Math.max(1, e.timeStamp - down.lt);
        down.v = 0.7 * down.v + 0.3 * (-dx / dt);
        down.lx = e.clientX; down.lt = e.timeStamp;
        if (down.moved > 6) { nudge(dx * 0.0065); stageEl.style.cursor = 'grabbing'; }
        return;
      }
      if (!gl || view !== 'floor' || busy || COARSE) return;
      var k = gl.pick(e.clientX, e.clientY);
      gl.hover(k);
      stageEl.style.cursor = k >= 0 ? 'pointer' : 'grab';
    }
    function onUp(e) {
      if (!down || e.pointerId !== down.id) return;
      var d = down; down = null;
      stageEl.style.cursor = '';
      if (view !== 'floor' || busy) return;
      if (d.moved > 6) { settle(d.v); return; }
      if (e.type !== 'pointerup' || !gl) return;
      var k = gl.pick(e.clientX, e.clientY);
      if (k < 0) return;
      if (k === at) enter(); else go(k);
    }
    on(stageEl, 'pointerdown', onDown);
    on(stageEl, 'pointermove', onMove);
    on(stageEl, 'pointerup', onUp);
    on(stageEl, 'pointercancel', onUp);
    on(stageEl, 'pointerleave', function () { if (gl && !down) gl.hover(-1); });
    /* a press in the arcade gives it the keys (in keys:'focus' mode the arrow
       keys work while the focus is inside it) */
    on(room, 'pointerdown', function () {
      if (!room.contains(doc.activeElement)) { try { room.focus({ preventScroll: true }); } catch (e) {} }
    });

    /* ============================================================
       STEPPING UP TO A CABINET, AND BACK
       The two views change together, on one timeline: the cabinet flies up
       as the others sink into the platform and the platform goes dark,
       while the name plate wipes out and the console types itself in. The
       game is asked for as the flight starts, so it is arriving while the
       cabinet is.
       ============================================================ */
    var DUR = RM ? 0.01 : 1.05;
    function showCab() {
      cab.hidden = false;
      cab.inert = false; cab.removeAttribute('inert');
      cab.setAttribute('aria-hidden', 'false');
      room.setAttribute('data-view', 'cab');
    }
    function enter(i, opts) {
      opts = opts || {};
      if (busy || view === 'cab') return;
      if (i != null && mod(i, N) !== at) go(i, true);
      busy = true;
      view = 'cab';
      /* a wheel's or a drag's turn still on its way would otherwise come to rest
         mid-flight and change the cabinet under it: the floor rests where it is */
      clearTimeout(idle); wheelAcc = 0; wheelLock = performance.now() + 600; down = null;
      if (gl) { gl.rot.target = -turn * STEP; gl.hover(-1); }
      stageEl.style.cursor = '';
      hint(false);
      showCab();
      paintConsole(!RM && !opts.now);
      mountFrame(at);
      scr.classList.add('is-off');
      var box = stageBox();
      if (HIST && !opts.keepHistory) {
        try { history.pushState({ arcadeKit: game(at).name }, '', urlWith(game(at).name)); pushed = true; } catch (e) {}
      }
      emit('onEnter');
      var done = function () {
        busy = false;
        if (gl) { gl.lens(1); gl.settleAt(at, 'stage'); gl.scan(at, 0); }
        placeScreen();
        scr.classList.remove('is-off');
        floor.hidden = true;
        floor.style.opacity = '';
        if (win.gsap) win.gsap.set(consoleEl, { clearProps: 'opacity,transform' });
        try { consoleEl.focus({ preventScroll: true }); } catch (e) {}
        landed();
      };
      if (!gl || !win.gsap || RM || opts.now) {
        if (gl) { gl.lens(1); gl.cabs.forEach(function (c) { if (c.k !== at) c.grow = 0.001; }); gl.setPlatform(0); gl.fly(at, 'stage', 'stage', box); gl.place(gl.cabs[at]); }
        room.classList.add('is-cab');
        done();
        return;
      }
      room.classList.add('is-cab');
      var G = win.gsap, tl = G.timeline({ onComplete: done });
      var f = { t: 0 };
      gl.fly(at, 'floor', 'stage', box);
      tl.to(f, { t: 1, duration: DUR, ease: 'none', onUpdate: function () { gl.cabT(at, f.t); } }, 0);
      gl.cabs.forEach(function (c) {
        if (c.k === at) return;
        var g2 = { s: c.grow };
        tl.to(g2, { s: 0.001, duration: 0.55, ease: 'power2.in', onUpdate: function () { c.grow = g2.s; gl.touch(); } }, 0.02 + dist(c.k, at) * 0.05);
      });
      var p = { o: 1 };
      tl.to(p, { o: 0, duration: 0.7, ease: 'power2.inOut', onUpdate: function () { gl.setPlatform(p.o); } }, 0.15);
      var sc = { v: 1 };
      tl.to(sc, { v: 0, duration: 0.3, ease: 'power1.out', onUpdate: function () { gl.scan(at, sc.v); } }, DUR - 0.3);
      var ln = { v: 0 };
      tl.to(ln, { v: 1, duration: DUR, ease: 'power2.inOut', onUpdate: function () { gl.lens(ln.v); } }, 0);
      tl.fromTo(consoleEl, { opacity: 0, x: -18 }, { opacity: 1, x: 0, duration: 0.5, ease: 'power3.out' }, 0.38);
      tl.fromTo(floor, { opacity: 1 }, { opacity: 0, duration: 0.28 }, 0);
    }
    function leave(opts) {
      opts = opts || {};
      if (busy || view !== 'cab') return;
      if (full) leaveFull();
      release(true);
      if (zoomTl) { zoomTl.kill(); zoomTl = null; }
      busy = true;
      /* nothing in the cabinet answers while it goes */
      cab.inert = true; cab.setAttribute('inert', '');
      if (HIST && !opts.fromHistory) {
        if (pushed) { pushed = false; try { history.back(); } catch (e) {} }
        else { try { history.replaceState(history.state, '', urlWith(null)); } catch (e) {} }
      }
      scr.classList.add('is-off');
      floor.hidden = false;
      paintFloor(false);
      /* the arcade may have changed shape while the cabinet was open (a phone
         turned): the floor is framed again for the plate as it is now */
      if (gl) gl.resize();
      emit('onLeave');
      var done = function () {
        busy = false;
        view = 'floor';
        room.classList.remove('is-cab');
        room.setAttribute('data-view', 'floor');
        cab.hidden = true;
        cab.setAttribute('aria-hidden', 'true');
        unmountFrame();
        rest = 'stage';
        if (gl) { gl.lens(0); gl.cabs.forEach(function (c) { c.grow = 1; gl.settleAt(c.k, 'floor'); gl.scan(c.k, 1); }); gl.setPlatform(1); }
        floor.style.opacity = '';
        if (win.gsap) win.gsap.set(consoleEl, { clearProps: 'opacity,transform' });
        try { plGo.focus({ preventScroll: true }); } catch (e) {}
        landed();
      };
      if (!gl || !win.gsap || RM) { done(); return; }
      var G = win.gsap, tl = G.timeline({ onComplete: done });
      var f = { t: 0 };
      gl.scan(at, 1);
      gl.fly(at, rest, 'floor', stageBox());
      rest = 'stage';
      tl.to(f, { t: 1, duration: DUR * 0.95, ease: 'none', onUpdate: function () { gl.cabT(at, f.t); } }, 0);
      gl.cabs.forEach(function (c) {
        if (c.k === at) return;
        c.grow = 0.001; gl.settleAt(c.k, 'floor');
        var g2 = { s: 0.001 };
        tl.to(g2, { s: 1, duration: 0.6, ease: 'power3.out', onUpdate: function () { c.grow = g2.s; gl.touch(); } }, 0.35 + dist(c.k, at) * 0.06);
      });
      var p = { o: 0 };
      tl.to(p, { o: 1, duration: 0.7, ease: 'power2.inOut', onUpdate: function () { gl.setPlatform(p.o); } }, 0.2);
      var ln = { v: 1 };
      tl.to(ln, { v: 0, duration: DUR * 0.95, ease: 'power2.inOut', onUpdate: function () { gl.lens(ln.v); } }, 0);
      tl.to(consoleEl, { opacity: 0, x: -18, duration: 0.3, ease: 'power2.in' }, 0);
      tl.fromTo(floor, { opacity: 0 }, { opacity: 1, duration: 0.4 }, DUR * 0.55);
      tl.add(function () { paintFloor(true); }, DUR * 0.5);
    }
    /* to the next cabinet without leaving: this one slides off small, the
       next comes in from the other side and takes the stage */
    function step(dir, to) {
      if (view !== 'cab') { go(to != null ? to : at + dir); return; }
      if (busy) return;
      var from = at;
      if (full) leaveFull();
      release(true);
      if (zoomTl) { zoomTl.kill(); zoomTl = null; }
      var fromRest = rest;
      if (to == null) to = at + dir;
      if (mod(to, N) === from) return;
      rest = 'stage';
      var dd = mod(to - from + Math.floor(N / 2), N) - Math.floor(N / 2);
      dir = dd > 0 ? 1 : -1;
      busy = true;
      unmountFrame();
      turnTo(turn + dd, true);
      if (HIST) { try { history.replaceState(history.state && history.state.arcadeKit ? { arcadeKit: game(at).name } : history.state, '', urlWith(game(at).name)); } catch (e) {} }
      paintConsole(!RM);
      mountFrame(at);
      scr.classList.add('is-off');
      var box = stageBox();
      emit('onEnter');
      var done = function () {
        busy = false;
        if (gl) {
          gl.settleAt(from, 'floor'); gl.cabs[from].grow = 0.001; gl.scan(from, 1);
          gl.settleAt(at, 'stage'); gl.scan(at, 0); gl.place(gl.cabs[at]);
        }
        placeScreen();
        scr.classList.remove('is-off');
        landed();
      };
      if (!gl || !win.gsap || RM) {
        if (gl) { gl.cabs[at].grow = 1; gl.fly(at, 'stage', 'stage', box); }
        done(); return;
      }
      var nx = gl.cabs[at];
      nx.grow = 1;
      nx.fl.side = dir > 0 ? 1 : -1;
      gl.cabs[from].fl.side = dir > 0 ? -1 : 1;
      gl.scan(at, 1);
      gl.fly(from, fromRest, 'gone', box, 0, 'in');
      gl.fly(at, 'gone', 'stage', box, 0, 'out');
      var a = { t: 0 }, b = { t: 0 };
      var tl = win.gsap.timeline({ onComplete: done });
      tl.to(a, { t: 1, duration: 0.55, ease: 'none', onUpdate: function () { gl.cabT(from, a.t); } }, 0);
      tl.to(b, { t: 1, duration: 0.8, ease: 'none', onUpdate: function () { gl.cabT(at, b.t); } }, 0.08);
      var sc = { v: 1 };
      tl.to(sc, { v: 0, duration: 0.25, onUpdate: function () { gl.scan(at, sc.v); } }, 0.63);
    }

    /* ============================================================
       THE ADDRESS BAR (history: true only)
       ?play=KEKTRA opens that cabinet. Stepping up is a step in the
       history, so Back returns to the floor; stepping along replaces it.
       Back or Forward pressed while a cabinet is flying is answered when
       it lands. An entry the arcade pushed carries {arcadeKit} in its
       state, so a cabinet come back to by Forward -- or by a reload --
       still knows that the floor is one step back.
       ============================================================ */
    function urlWith(name) {
      try {
        var u = new URL(location.href);
        if (name) u.searchParams.set(PARAM, name); else u.searchParams.delete(PARAM);
        return u.pathname + u.search + u.hash;
      } catch (e) { return location.pathname + location.hash; }
    }
    function fromQuery() {
      if (!HIST) return -1;
      var q = '';
      try { q = new URLSearchParams(location.search).get(PARAM) || ''; } catch (e) {}
      if (!q) return -1;
      for (var i = 0; i < N; i++) if (GAMES[i].name === q) return i;
      return -1;
    }
    var popLater = false;
    function fromHistory() {
      if (busy) { popLater = true; return; }
      popLater = false;
      var i = fromQuery();
      if (i < 0 && view === 'cab') { pushed = false; leave({ fromHistory: true }); }
      else if (i >= 0 && view === 'floor') { go(i, true); pushed = ownEntry(); enter(i, { keepHistory: true }); }
      else if (i >= 0 && view === 'cab' && i !== at) step(0, i);
    }
    function ownEntry() { try { return !!(history.state && history.state.arcadeKit); } catch (e) { return false; } }
    if (HIST) on(win, 'popstate', fromHistory);
    var stale = false;
    function landed() {
      if (stale) reflow();
      if (popLater) fromHistory();
    }

    /* ============================================================
       THE CONTROLS
       ============================================================ */
    on(room, 'click', function (e) {
      var b = e.target.closest && e.target.closest('[data-ak]');
      if (!b || !room.contains(b)) return;
      e.preventDefault();
      /* mid-flight the controls wait (one pressed as the console fades out
         would act on a cabinet that is going) */
      if (busy) return;
      var act = b.getAttribute('data-ak');
      if (act === 'go') { var to = +b.getAttribute('data-to'); if (view === 'cab') step(0, to); else go(to); }
      else if (act === 'prev' || act === 'next') step(act === 'next' ? 1 : -1);
      else if (act === 'enter') enter();
      else if (act === 'back') leave();
      else if (act === 'play') { if (live) release(); else play(); }
      else if (act === 'live') play();
      else if (act === 'restart') restart();
      else if (act === 'full') { if (full) leaveFull(); else enterFull(); }
    });
    on(KEYS === 'page' ? doc : room, 'keydown', function (e) {
      if (paused()) return;
      var t = e.target;
      if (t && t.closest && t.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"]')) return;
      var k = e.key;
      if (k === 'Escape') {
        if (full && doc.fullscreenElement !== scr) { leaveFull(); return; }
        if (live) { release(); return; }
        if (view === 'cab' && !busy) { leave(); return; }
        return;
      }
      if (full || live || busy) return;     /* the keys belong to the game */
      if (k === 'ArrowRight' || k === 'ArrowLeft') { e.preventDefault(); step(k === 'ArrowRight' ? 1 : -1); }
      else if ((k === 'Home' || k === 'End') && view === 'floor') { e.preventDefault(); go(k === 'Home' ? 0 : N - 1); }
      else if (k === 'Enter' && view === 'floor' && (t === room || t === doc.body || t === stageEl)) { e.preventDefault(); enter(); }
    });

    /* the arcade changes shape: the floor is framed again, and an open
       cabinet is put back square in the space the console leaves it */
    var rz = 0;
    function reflow() {
      if (dead) return;
      if (gl) {
        gl.resize();
        if (view === 'cab' && !busy) { gl.fly(at, rest, rest, stageBox()); gl.place(gl.cabs[at]); }
      }
      if (view === 'cab') placeScreen();
      stale = busy;
    }
    var ro = null;
    if (win.ResizeObserver) {
      ro = new ResizeObserver(function () { clearTimeout(rz); reflow(); rz = setTimeout(reflow, 120); });
      ro.observe(room);
    } else {
      on(win, 'resize', function () { clearTimeout(rz); reflow(); rz = setTimeout(reflow, 120); });
    }
    on(win, 'orientationchange', function () { setTimeout(reflow, 200); });
    /* out of view, nothing is drawn */
    var io = null;
    if (win.IntersectionObserver) {
      io = new IntersectionObserver(function (es) {
        visible = es[es.length - 1].isIntersecting;
        if (visible && gl) gl.touch();
      });
      io.observe(room);
    }

    /* the hint: once, after the arcade has settled, until the first touch of it */
    var hintT = 0, hintDone = !HINT;
    function hint(show) {
      if (!hintEl) return;
      if (show && !hintDone && view === 'floor') {
        hintEl.classList.add('is-on');
        clearTimeout(hintT); hintT = setTimeout(function () { hint(false); }, 9000);
      } else if (!show) {
        hintDone = true; clearTimeout(hintT);
        hintEl.classList.remove('is-on');
      }
    }
    ['pointerdown', 'wheel', 'keydown'].forEach(function (t) {
      on(room, t, function () { if (hintEl.classList.contains('is-on')) setTimeout(function () { hint(false); }, 900); else hintDone = true; }, { passive: true });
    });

    /* ============================================================
       START
       ============================================================ */
    function ready() {
      if (started || dead) return;
      started = true;
      if (gl) gl.touch();
      room.classList.add('is-ready');
      var i = fromQuery();
      if (i >= 0) { go(i, true); pushed = ownEntry(); enter(i, { keepHistory: true, now: true }); }
      else {
        if (typeof cfg.start === 'number') go(cfg.start, true);
        if (!RM && win.gsap) {
          win.gsap.fromTo(plate, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out', delay: 0.15 });
          paintFloor(true);
        }
      }
      setTimeout(function () { hint(true); }, 1600);
      emit('onReady');
    }
    paintFloor(false);
    try {
      if (win.THREE && cfg.webgl !== false) gl = Scene(stageEl, {
        /* the space the cabinet in front has to stand in: above the name plate */
        /* the plate's place in the layout (offsetTop: not moved by the
           plate's own fade-in, which slides it up by a few pixels) */
        floorBox: plateBox
      });
    } catch (err) { gl = null; }
    if (!gl) room.classList.add('is-flat');
    /* without the scene the floor is the flat screen: a click on it steps up,
       and a swipe across the floor turns to the next one */
    if (!gl && plFlat) {
      var sw = null, swiped = false;
      on(plFlat, 'click', function () { if (swiped) { swiped = false; return; } if (!busy) enter(); });
      on(floor, 'pointerdown', function (e) { if (e.target.closest && e.target.closest('button, a')) return; sw = { x: e.clientX, y: e.clientY }; swiped = false; });
      on(floor, 'pointerup', function (e) {
        if (!sw) return;
        var dx = e.clientX - sw.x, dy = e.clientY - sw.y; sw = null;
        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5 && view === 'floor' && !busy) { swiped = true; go(at + (dx < 0 ? 1 : -1)); }
      });
      on(floor, 'pointercancel', function () { sw = null; });
    }
    var readyT = 0;
    if (gl) {
      var fontsIn = (doc.fonts && doc.fonts.load)
        ? Promise.all([doc.fonts.load('230px ' + F.pixel), doc.fonts.load('46px ' + F.text)]).catch(function () {})
        : Promise.resolve();
      var texIn = new Promise(function (res) { gl.manager.onLoad = res; gl.manager.onError = function () {}; setTimeout(res, 6000); });
      fontsIn.then(function () { if (!dead && gl) gl.drawText(); });
      Promise.all([fontsIn, texIn]).then(ready);
    } else {
      setTimeout(ready, 0);
    }
    /* never leave the arcade behind its loader */
    readyT = setTimeout(ready, 7000);

    /* ============================================================
       WHAT THE PAGE CAN DO WITH IT
       ============================================================ */
    function destroy() {
      if (dead) return;
      if (full) leaveFull();
      unmountFrame();
      dead = true;
      clearTimeout(readyT); clearTimeout(hintT); clearTimeout(idle); clearTimeout(rz); clearTimeout(slowT);
      if (zoomTl) zoomTl.kill();
      typingEls.forEach(function (el) { if (el._akTyping) cancelAnimationFrame(el._akTyping); });
      offs.forEach(function (f) { f(); });
      if (ro) ro.disconnect();
      if (io) io.disconnect();
      if (gl) gl.dispose();
      gl = null;
      if (room.parentNode) room.parentNode.removeChild(room);
    }
    function rel(r) { var b = room.getBoundingClientRect(); return r ? { x: r.x + b.left, y: r.y + b.top, w: r.w, h: r.h } : null; }
    return {
      element: room,
      go: function (i) { if (view === 'cab') step(0, i); else go(i); },
      next: function () { step(1); },
      prev: function () { step(-1); },
      enter: function (i) { enter(i); },
      leave: function () { leave(); },
      play: function () { play(); },
      stop: function () { release(); },
      destroy: destroy,
      /* for tests and for looking: in the window's coordinates */
      where: function (k) { return gl ? rel(gl.where(k)) : null; },
      screen: function () { var r = scr.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; },
      scene: function () { return gl ? rel(gl.screenRect(at)) : null; },
      state: function () {
        return { view: view, at: at, turn: turn, busy: busy, live: live, full: full, started: started, flat: !gl, visible: visible,
          settling: !!zoomTl || typing > 0, pushed: pushed, rest: rest, n: N,
          frame: frame ? (frame.getAttribute('src') || (frame.srcdoc ? 'srcdoc' : '')) : null,
          scene: gl ? gl.state() : null };
      }
    };
  }

  win.ArcadeKit = { mount: mount, version: '1.0.0' };
})(window);

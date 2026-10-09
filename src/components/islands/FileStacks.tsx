// @ts-nocheck
/*
 * FileStacks — Framer code component.
 * Request: "make it a Framer component, backdrop not necessary".
 * A file view where files are clipped together into paper-clipped stacks: select (click / Shift-click) and
 * press Stack, or drop one file on another; click a stack to fan it out; drag to the trash; filter by type.
 * The component fills its frame: the container takes the frame's width (up to its padding) and height.
 * Property controls cover the main look; "Settings JSON" accepts the output of the prototype's
 * Style panel → Copy settings, for everything else.
 * Motion and drag run on the DOM directly (inside the component's own element); React owns the wrapper.
 */
import * as React from "react"
import { useEffect, useRef } from "react"
import { addPropertyControls, ControlType } from "framer"

const CSS = `
.pcg{--canvas:#F2F2F2;--page:#FEFEFE;--card:#FFFFFF;--border:#E0E0E0;--sel:#84E287;--pill:#B5B5B5;--line1:#D9D9D9;--line2:#ECECEC;--box:#E3E3E3;--ink:#141414;--ink-2:#6B6B6B;--ink-3:#A3A3A3;--tab-off:#868686;--cr-ink:#5A5A5A;--gl-ink:#141414;--btn:#141414;--btn-ink:#FFFFFF;--btn2:#FFFFFF;--clip:#8E9196;--clip-hi:#D4D6D9;--focus:#0B7FD6;--count-bg:#E6E6E6;--img:#EDEDED;--rule-soft:#E3E3E3;--danger:#E5484D;--danger-bg:#FFEDEC;--danger-line:#FFCDCA;--mx-pill:44%;--mx-l1:22%;--mx-l2:12%;--mx-img:11%;--t-fig:#39A7DB;--t-pdf:#E0524F;--t-docx:#3A5FDC;--t-xlsx:#3A9E5B;--c-shadow-def:0 1px 2px rgba(0,0,0,.04),0 10px 30px rgba(0,0,0,.05)}
@media (prefers-color-scheme: dark){.pcg:not([data-theme=light]){color-scheme:dark;--canvas:#161617;--page:#0B0B0C;--card:#232325;--border:#333336;--pill:#55555A;--line1:#3B3B3F;--line2:#2F2F33;--box:#38383C;--img:#2E2E32;--rule-soft:#333337;--ink:#F2F2F3;--ink-2:#A9A9AE;--ink-3:#6E6E74;--tab-off:#8A8A8A;--cr-ink:#A9A9AE;--focus:#0D99FF;--gl-ink:#FFFFFF;--btn:#F2F2F3;--btn-ink:#111112;--btn2:#262628;--clip:#9EA1A6;--clip-hi:#E6E7E9;--count-bg:#313134;--danger:#FF6B6F;--danger-bg:#3A2123;--danger-line:#5C2B2E;--t-fig:#5CC2EE;--t-pdf:#FF6F6B;--t-docx:#93A9FF;--t-xlsx:#52C77F;--c-shadow-def:0 0 0 1px rgba(255,255,255,.05),0 10px 30px rgba(0,0,0,.45);--mx-pill:58%;--mx-l1:34%;--mx-l2:24%;--mx-img:22%}}
.pcg[data-theme=dark]{color-scheme:dark;--canvas:#161617;--page:#0B0B0C;--card:#232325;--border:#333336;--pill:#55555A;--line1:#3B3B3F;--line2:#2F2F33;--box:#38383C;--img:#2E2E32;--rule-soft:#333337;--ink:#F2F2F3;--ink-2:#A9A9AE;--ink-3:#6E6E74;--tab-off:#8A8A8A;--cr-ink:#A9A9AE;--focus:#0D99FF;--gl-ink:#FFFFFF;--btn:#F2F2F3;--btn-ink:#111112;--btn2:#262628;--clip:#9EA1A6;--clip-hi:#E6E7E9;--count-bg:#313134;--danger:#FF6B6F;--danger-bg:#3A2123;--danger-line:#5C2B2E;--t-fig:#5CC2EE;--t-pdf:#FF6F6B;--t-docx:#93A9FF;--t-xlsx:#52C77F;--c-shadow-def:0 0 0 1px rgba(255,255,255,.05),0 10px 30px rgba(0,0,0,.45);--mx-pill:58%;--mx-l1:34%;--mx-l2:24%;--mx-img:22%}
.pcg,.pcg *{box-sizing:border-box}
.pcg .paper{--tc:var(--ink-2)}
.pcg{color:var(--ink);font-family:-apple-system,BlinkMacSystemFont,SF Pro Text,SF Pro,Inter,system-ui,Segoe UI,Roboto,sans-serif;font-size:13px;line-height:1.4;display:flex;flex-direction:column;align-items:center;width:100%;-webkit-font-smoothing:antialiased}
.pcg .app{margin:0 auto;max-width:100%;width:100%;position:relative}
.pcg .drag-layer{position:absolute;left:0;top:0;width:0;height:0;z-index:200}
.pcg .shell{--c-pad:32px;--c-pad-top:22px;--c-pad-bot:32px;--c-radius:24px;--c-bg:var(--canvas);--c-bw:0px;--c-bc:#E0E0E0;--c-shadow:var(--c-shadow-def);width:fit-content;max-width:100%;margin:0;padding:var(--c-pad-top) var(--c-pad) var(--c-pad-bot);border-radius:var(--c-radius);background:var(--c-bga);border:var(--c-bw) solid var(--c-bc);box-shadow:var(--c-shadow);transition:padding .25s cubic-bezier(.45,0,.2,1),border-radius .25s ease,background-color .2s ease,box-shadow .25s ease}
.pcg .bar>.btn,.pcg .bar .tools .btn,.pcg .bar .trash,.pcg .bar .trash.open{border-color:transparent}
.pcg .shell{outline:var(--c-ib-w,0px) solid var(--c-ib-c,transparent);outline-offset:calc(-1 * var(--c-ib-w,0px))}
.pcg .shell{height:var(--c-h,auto);max-height:none;overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;scrollbar-width:none}
.pcg .shell::-webkit-scrollbar{display:none}
.pcg .shell,.pcg .frame,.pcg .glass-layer{--c-bga:color-mix(in srgb, var(--c-bg) var(--c-op,100%), transparent)}
.pcg .fwrap{position:relative;max-width:100%}
.pcg .glass-layer{position:absolute;inset:0;display:none;pointer-events:none;border-radius:var(--c-radius,24px);background:var(--c-bga);-webkit-backdrop-filter:blur(var(--c-blur,0px));backdrop-filter:blur(var(--c-blur,0px))}
.pcg .fwrap.glass-on .glass-layer{display:block}
.pcg .fwrap.glass-on .shell{background:transparent}
.pcg .frame.glass .pblur,.pcg .frame.glass .bblur{background:none}
.pcg .pblur{display:none}
.pcg .frame .stage{-webkit-mask-image:var(--st-mask,none);mask-image:var(--st-mask,none);-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat}
.pcg .pblur{opacity:var(--pb-o,0)}
/* when the grid scrolls, files slide under the header and its blur fades in over the first 64px (--pb-o).
   The fade goes on the tint and on each blur layer, not on .pblur itself (see the drag rules below), and the
   old fade-out mask is off so the files actually reach the blur */
.pcg .frame.scrolled .pblur{display:block;opacity:1;background:none}
.pcg .frame.scrolled .pblur::before{content:"";position:absolute;inset:0;border-radius:inherit;background:linear-gradient(to bottom,color-mix(in srgb,var(--c-bga) var(--pb-tint,70%),transparent) 0%,color-mix(in srgb,var(--c-bga) calc(var(--pb-tint,70%) * .6),transparent) 60%,transparent 100%);opacity:var(--pb-o,0)}
.pcg .frame.scrolled .pblur i{opacity:var(--pb-o,0)}
.pcg .frame.scrolled .stage{-webkit-mask-image:none;mask-image:none}
/* while a file is dragged, the header blurs it at full strength, also when the grid is barely scrolled */
.pcg .frame.dragging .pblur{display:block;opacity:1;background:none}
/* fade the tint and each blur layer on their own: fading the whole .pblur would make it its own layer, and the blur would only appear once the fade ended */
.pcg .frame.dragging .pblur::before{content:"";position:absolute;inset:0;border-radius:inherit;opacity:1;background:linear-gradient(to bottom,color-mix(in srgb,var(--c-bga) var(--pb-tint,70%),transparent) 0%,color-mix(in srgb,var(--c-bga) calc(var(--pb-tint,70%) * .6),transparent) 60%,transparent 100%);animation:pcg-pb-in .22s ease backwards}
.pcg .frame.dragging .pblur i{opacity:1;animation:pcg-pb-in .22s ease backwards}
@keyframes pcg-pb-in{from{opacity:0}}
.pcg .backdrop{position:relative;display:flex;align-items:center;justify-content:center;max-width:100%;margin:0 auto}
.pcg .backdrop.on{aspect-ratio:var(--bk-ar,4/3);border-radius:var(--bk-r,24px);overflow:hidden;isolation:isolate}
.pcg .backdrop:not(.on)>.bk-cam{display:contents}
.pcg .backdrop.on>.bk-cam{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;box-sizing:border-box;padding:var(--bk-pad,64px);background-color:var(--bk-c,color-mix(in srgb, var(--page), #000 9%));background-position:center;background-repeat:no-repeat;background-size:var(--bk-fit,cover);transform:scale(var(--bk-z,1));transform-origin:var(--bk-ox,50%) var(--bk-oy,50%)}
.pcg .backdrop.on>.bk-cam.glide{transition:transform .5s cubic-bezier(.22,1,.36,1),transform-origin .5s cubic-bezier(.22,1,.36,1)}
.pcg .frame{position:relative;width:fit-content;max-width:100%;margin:0 auto;filter:saturate(1)}
.pcg .bblur{position:absolute;left:var(--c-bw,0px);right:var(--c-bw,0px);bottom:var(--c-bw,0px);height:var(--bb-h,36px);z-index:5;pointer-events:none;border-radius:0 0 max(0px,calc(var(--c-radius,24px) - var(--c-bw,0px))) max(0px,calc(var(--c-radius,24px) - var(--c-bw,0px)));background:linear-gradient(to top,color-mix(in srgb,var(--c-bga) 55%,transparent),transparent)}
.pcg .bblur[hidden],.pcg .frame.no-bb .bblur{display:none}
.pcg .bblur i{position:absolute;inset:0;border-radius:inherit;-webkit-backdrop-filter:blur(var(--b));backdrop-filter:blur(var(--b));-webkit-mask-image:linear-gradient(to bottom,transparent var(--m0),#000 var(--m1),#000 var(--m2),transparent var(--m3));mask-image:linear-gradient(to bottom,transparent var(--m0),#000 var(--m1),#000 var(--m2),transparent var(--m3))}
.pcg .sbar{position:absolute;right:calc(5px + var(--c-bw, 0px));width:var(--sb-w,5px);z-index:260;opacity:1;transition:opacity .25s ease}
.pcg .sbar[hidden]{display:none}
.pcg .frame.duo .shell{padding-right:84px}
.pcg .duo-bar{position:absolute;width:48px;color:var(--ink);pointer-events:none;z-index:250}
.pcg .duo-bar svg{display:block;width:100%;height:auto}
.pcg .frame.duo .shell.narrow{padding-right:var(--c-pad)}
.pcg .frame.duo:has(.shell.narrow) .duo-bar{display:none}
.pcg .sbar .sb-thumb{position:absolute;left:0;right:0;border-radius:99px;cursor:grab;background:var(--sb-c,color-mix(in srgb, var(--c-bg), #808080 28%));transition:background .15s ease,transform .15s ease}
.pcg .sbar .sb-thumb:hover,.pcg .sbar.dragging .thumb{background:var(--sb-c,color-mix(in srgb, var(--c-bg), #808080 42%));transform:scaleX(1.35)}
.pcg .sbar.dragging .thumb{cursor:grabbing}
.pcg .shell .bar{position:sticky;top:calc(-1 * var(--c-pad-top));z-index:250;margin:calc(-1 * var(--c-pad-top)) calc(-1 * var(--c-pad)) var(--hd-gap,22px);padding:var(--c-pad-top) var(--c-pad) 12px;background:transparent}
.pcg .pblur{position:absolute;left:0;right:0;top:0;height:calc(100% + var(--pb-ext,44px));z-index:-1;pointer-events:none;border-radius:max(0px,calc(var(--c-radius,24px) - var(--c-bw,0px))) max(0px,calc(var(--c-radius,24px) - var(--c-bw,0px))) 0 0;background:linear-gradient(to bottom,color-mix(in srgb,var(--c-bga) var(--pb-tint,70%),transparent) 0%,color-mix(in srgb,var(--c-bga) calc(var(--pb-tint,70%) * .6),transparent) 60%,transparent 100%)}
.pcg .pblur i{position:absolute;inset:0;border-radius:inherit;-webkit-backdrop-filter:blur(var(--b));backdrop-filter:blur(var(--b));-webkit-mask-image:linear-gradient(to top,transparent var(--m0),#000 var(--m1),#000 var(--m2),transparent var(--m3));mask-image:linear-gradient(to top,transparent var(--m0),#000 var(--m1),#000 var(--m2),transparent var(--m3))}
.pcg .bar{display:flex;flex-wrap:wrap;align-items:center;gap:8px;row-gap:10px;min-height:34px;margin-bottom:22px;position:relative;box-sizing:content-box;padding-bottom:10px}
.pcg .bar .spacer{flex:1}
.pcg .tabs{display:flex;align-items:baseline;gap:var(--tab-gap,calc(var(--t-size,22px) * .64));margin-right:6px;flex:none;max-width:100%;overflow-x:auto;scrollbar-width:none;padding-block:.2em;margin-block:-.2em}
.pcg .tabs::-webkit-scrollbar{display:none}
.pcg .shell .bar{flex-wrap:nowrap}
.pcg .shell .bar .tabs{flex:0 1 auto;min-width:0}
/* edge fades on the tabs ease in and out instead of snapping: the mask is always there, and only how transparent each edge is changes */
@property --tf-l{syntax:'<number>';inherits:false;initial-value:1}
@property --tf-r{syntax:'<number>';inherits:false;initial-value:1}
.pcg .shell .bar .tabs{--tf-l:1;--tf-r:1;transition:--tf-l .35s ease,--tf-r .35s ease;-webkit-mask-image:linear-gradient(to right,rgba(0,0,0,var(--tf-l)),#000 36px,#000 calc(100% - 36px),rgba(0,0,0,var(--tf-r)));mask-image:linear-gradient(to right,rgba(0,0,0,var(--tf-l)),#000 36px,#000 calc(100% - 36px),rgba(0,0,0,var(--tf-r)))}
.pcg .shell .bar .tabs.ovf{--tf-r:0}
.pcg .shell .bar .tabs.ovl{--tf-l:0}
.pcg .shell .bar .tabs.can-scroll{cursor:grab}
.pcg .shell .bar .tabs.grabbing,.pcg .shell .bar .tabs.grabbing .tab{cursor:grabbing}
.pcg .shell .bar .tools,.pcg .shell .bar .btn,.pcg .shell .bar .trashwrap,.pcg .shell .bar .crumb{flex-shrink:0}
.pcg .tab{appearance:none;border:0;background:none;padding:0;cursor:pointer;white-space:nowrap;font:inherit;font-size:var(--t-size,22px);line-height:1.2;font-weight:var(--t-weight,600);letter-spacing:-.02em;color:var(--t-off,var(--tab-off,var(--ink-3)));transition:color .18s ease,opacity .18s ease}
.pcg .crumb{display:flex;align-items:center;gap:calc(var(--t-size,22px) * .3);flex:none;white-space:nowrap;font-size:var(--t-size,22px);line-height:1.2;font-weight:var(--t-weight,600);letter-spacing:-.02em;color:var(--t-off,var(--ink-3))}
.pcg .crumb>svg{width:calc(var(--t-size,22px) * .62);height:calc(var(--t-size,22px) * .62);flex:none;opacity:.8}
.pcg .crumb-pill{appearance:none;border:0;cursor:pointer;font:inherit;letter-spacing:inherit;font-size:var(--cr-fs,inherit);display:inline-flex;align-items:center;gap:.22em;padding:var(--cr-py,4px) var(--cr-pr,10px) var(--cr-py,4px) var(--cr-pl,10px);border-radius:var(--cr-r,10px);background:var(--cr-bg,var(--count-bg));color:var(--cr-fg,var(--cr-ink,var(--ink-2)));transition:filter .15s ease}
.pcg .crumb-count{display:inline-flex;align-items:center;justify-content:center;font-size:.52em;font-weight:600;line-height:1.1;letter-spacing:var(--cc-ls,0px);padding:var(--cc-py,2px) calc(var(--cc-px,6px) - var(--cc-ls,0px)) var(--cc-py,2px) var(--cc-px,6px);border-radius:var(--cc-r,5px);font-variant-numeric:tabular-nums;background:var(--cc-bg,color-mix(in srgb, var(--cr-fg,var(--cr-ink,var(--ink-2))) 14%, transparent));color:var(--cc-fg,var(--cr-fg,var(--cr-ink,var(--ink-2))))}
.pcg .shell[data-cc=off] .crumb-count{display:none}
.pcg .crumb-pill:hover{filter:brightness(.97)}
.pcg .crumb-pill:focus-visible{outline:2px solid var(--focus);outline-offset:2px}
.pcg .crumb-pill svg{width:.62em;height:.62em;flex:none;opacity:.75}
.pcg .tab:hover{color:color-mix(in srgb,var(--t-off,var(--tab-off,var(--ink-3))),var(--t-on,var(--ink)) 35%)}
.pcg .tab[aria-selected=true]{color:var(--t-on,var(--ink))}
.pcg .tab:focus-visible{outline:2px solid var(--focus);outline-offset:3px;border-radius:4px}
.pcg .tile{transition:filter .35s ease}
.pcg .tile.dim{filter:brightness(calc(1 - var(--dim,.08))) saturate(calc(1 - var(--dim,.08) * 2)) blur(var(--dim-blur,1.5px))}
.pcg .tile.fhide{display:none}
.pcg .btn{appearance:none;cursor:pointer;font:500 13px/1 -apple-system,BlinkMacSystemFont,SF Pro Text,SF Pro,Inter,system-ui,Segoe UI,Roboto,sans-serif;height:32px;padding:0 14px;border-radius:8px;border:1px solid var(--border);background:var(--btn2);color:var(--ink);display:inline-flex;align-items:center;gap:7px;transition:transform .12s ease,opacity .15s ease,background .15s ease}
.pcg .btn:active{transform:scale(.97)}
.pcg .btn.primary{background:var(--btn);color:var(--btn-ink);border-color:var(--btn)}
.pcg .btn[disabled]{opacity:.35;cursor:default;transform:none}
.pcg .btn.ghost{border-color:transparent;background:transparent;color:var(--ink-3);padding:0 6px}
.pcg .btn .n{font-variant-numeric:tabular-nums;opacity:.7}
.pcg .btn .gn{opacity:.35;max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pcg .hint{color:var(--ink-2);font-size:12px;white-space:nowrap}
.pcg .shell .bar .tools{position:relative}
.pcg .shell .bar .tools .hint{position:absolute;top:calc(100% + 8px);right:2px;pointer-events:none}
.pcg .btn:focus-visible,.pcg .paper:focus-visible,.pcg .gtitle:focus-visible{outline:2px solid var(--focus);outline-offset:2px}
.pcg .stage{position:relative;transition:height .5s cubic-bezier(.45,0,.2,1)}
.pcg .tile{position:absolute;left:0;top:0;transform-origin:50% 50%;will-change:transform}
.pcg .paper{width:var(--w);aspect-ratio:235/300;container-type:inline-size;cursor:default;border-radius:calc(var(--w) * 15 / 235)}
.pcg .stage.selecting>.paper{cursor:pointer}
.pcg .group .paper{cursor:default}
.pcg .sheet{--u:calc(100cqw / 235);--pill:color-mix(in srgb, var(--card), #808080 var(--mx-pill));--line1:var(--sk-strong, color-mix(in srgb, var(--card), #808080 var(--mx-l1)));--line2:var(--sk, color-mix(in srgb, var(--card), #808080 var(--mx-l2)));--img:var(--sk, color-mix(in srgb, var(--card), #808080 var(--mx-img)));position:absolute;inset:0;background:var(--card);border:var(--fb-w,1px) var(--fb-s,solid) var(--fb-c,color-mix(in srgb, var(--card), #808080 20%));border-radius:calc(var(--u) * 15);background:color-mix(in srgb,var(--card),#000 calc(var(--k, 0) * var(--stack-step, 6%)));transition:border-color .25s ease,background-color .35s ease}
.pcg .sheet,.pcg .group>.glabel{--in:calc(var(--u) * var(--f-in,16));--pt:calc(var(--u) * var(--f-pt,10));--t-h:calc(var(--u) * var(--ft,12) * 1.2 + 2px);--p-h:calc(var(--u) * (var(--bd-fs,9) + 2 * var(--bd-py,2.5)));--c-h2:calc(var(--u) * (var(--gc-fs,9) + 2 * var(--gc-py,2.5)));--row:max(var(--t-h), var(--p-h), var(--c-h2))}
.pcg .sheet .ttl{position:absolute;left:var(--in);right:calc(var(--in) + var(--u) * 46);top:calc(var(--pt) + (var(--row) - var(--t-h)) / 2);height:calc(var(--u) * var(--ft,12) * 1.2 + 2px);line-height:calc(var(--u) * var(--ft,12) * 1.2 + 2px);font-size:calc(var(--u) * var(--ft,12));font-weight:500;letter-spacing:-.01em;color:var(--card-ink,var(--ink));white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pcg .sheet .type{position:absolute;right:var(--in);top:calc(var(--pt) + (var(--row) - var(--p-h)) / 2);height:calc(var(--u) * (var(--bd-fs,9) + 2 * var(--bd-py,2.5)));padding:0 calc(var(--u) * var(--bd-px,4));border-radius:calc(var(--u) * var(--bd-r,3));display:flex;align-items:center;font-size:calc(var(--u) * var(--bd-fs,9));font-weight:var(--bd-fw,500);letter-spacing:calc(var(--u) * var(--bd-ls,.1));text-transform:var(--bd-tt,none);color:var(--tt,color-mix(in srgb,var(--tc),var(--card-ink,var(--ink)) var(--bd-tx,56%)));background:var(--tb,color-mix(in srgb,var(--tc) var(--bd-mix,11%),var(--card)));transition:transform .28s cubic-bezier(.3,1.2,.5,1)}
.pcg .paper[data-type=fig]{--tc:var(--t-fig);--tt:var(--tt-fig);--tb:var(--tb-fig)}
.pcg .paper[data-type=pdf]{--tc:var(--t-pdf);--tt:var(--tt-pdf);--tb:var(--tb-pdf)}
.pcg .paper[data-type=docx]{--tc:var(--t-docx);--tt:var(--tt-docx);--tb:var(--tb-docx)}
.pcg .paper[data-type=xlsx]{--tc:var(--t-xlsx);--tt:var(--tt-xlsx);--tb:var(--tb-xlsx)}
.pcg .shell[data-badge-on=off] .sheet .type{visibility:hidden}
.pcg .sheet .type:before{content:var(--bd-dot,".")}
.pcg .shell[data-badge=solid] .sheet .type{background:var(--tc);color:#fff}
.pcg .shell[data-badge=outline] .sheet .type{background:transparent;box-shadow:inset 0 0 0 1px var(--tc)}
.pcg .shell[data-badge=plain] .sheet .type{background:transparent;--bd-px:0}
.pcg .shell[data-badge=pill] .sheet .type{background:color-mix(in oklab,var(--tc) var(--bd-mix,20%),#fff);color:color-mix(in oklab,var(--tc),#000 var(--bd-tx,0%))}
.pcg .sheet .sep{position:absolute;left:calc(var(--u) * 17);right:calc(var(--u) * 15);top:calc(var(--u) * 32.5);height:.5px;background:var(--card-rule,var(--rule-soft))}
.pcg .sheet .cnt{position:absolute;inset:0;pointer-events:none;transform:translateY(calc(var(--pt) + var(--row) + var(--u) * var(--f-gap,16) - var(--u) * 51))}
.pcg .sheet .b{position:absolute;left:var(--in);border-radius:99px;background:var(--line2)}
.pcg .sheet .b.d{background:var(--line1)}
.pcg .sheet .img{position:absolute;border-radius:calc(var(--u) * 6);background:var(--img)}
.pcg .sheet .tbl{position:absolute;left:var(--in);right:var(--in);top:calc(var(--u) * 51);display:grid;grid-template-columns:1.3fr 1fr 1fr;gap:calc(var(--u) * 2.5)}
.pcg .sheet .tbl i{height:calc(var(--u) * 12);border-radius:calc(var(--u) * 2.5);background:var(--line2)}
.pcg .sheet .tbl i.h{background:var(--line1)}
.pcg .sheet .tbl i.c{background:color-mix(in srgb,var(--tc) 14%,var(--card))}
.pcg .check{position:absolute;top:calc(var(--u) * -9.5);right:calc(var(--u) * -8.5);z-index:2;width:calc(var(--u) * 20);height:calc(var(--u) * 20);border-radius:calc(var(--u) * 5);background:var(--card);box-shadow:inset 0 0 0 1.5px color-mix(in srgb,var(--card-ink,var(--ink)) 30%,transparent),0 1px 3px #0000002e;display:grid;place-items:center;opacity:0;transform:scale(.6);transition:background .2s ease,opacity .2s ease,transform .28s cubic-bezier(.3,1.4,.5,1);transition-delay:0s,calc(var(--i,0) * 35ms),calc(var(--i,0) * 35ms)}
.pcg .stage.selecting>.paper .check,.pcg .stage.editing>.paper.member .check{opacity:1;transform:scale(1)}
.pcg .stage.editing>.paper.member{cursor:pointer}
.pcg .tools{display:inline-flex;gap:8px;align-items:center}
.pcg .btn.danger{background:var(--btn);color:var(--btn-ink);border-color:var(--btn)}
.pcg .check svg{width:60%;height:60%;opacity:0;transform:scale(.6);transition:opacity .18s ease,transform .22s cubic-bezier(.3,1.5,.5,1)}
.pcg .paper.sel .sheet,.pcg .paper.dropglow .sheet{border-color:var(--sel-c,var(--sel));border-style:solid;border-width:var(--sel-w,1px)}
.pcg .paper.sel .sheet{background:color-mix(in srgb,var(--sel-c,var(--sel)) var(--sel-wash,6%),var(--card))}
.pcg .check{display:none!important}
.pcg .paper.sel .check{background:var(--sel);box-shadow:0 1px 3px #0000002e;opacity:1;transform:scale(1)}
.pcg .paper.sel .check svg{opacity:1;transform:scale(1)}
.pcg .group .check{opacity:0!important}
.pcg .group{width:var(--w);aspect-ratio:235/300;cursor:pointer}
.pcg .stage.selecting .group{cursor:default}
.pcg .group:focus-visible{outline:2px solid var(--focus);outline-offset:4px;border-radius:calc(var(--w) * 15 / 235)}
.pcg .group>.paper{position:absolute;left:0;top:0}
.pcg .group{container-type:inline-size}
.pcg .glabel{position:absolute;left:0;bottom:calc(100% + 10px);display:flex;align-items:center;gap:6px;max-width:100%;font-size:12px;color:var(--ink-2);white-space:nowrap}
.pcg .gtitle:hover{background:var(--count-bg)}
.pcg .gtitle{appearance:none;border:0;background:none;padding:1px 4px;margin:-1px -4px;border-radius:4px;transition:background .15s ease;font:500 12px/1.2 -apple-system,BlinkMacSystemFont,SF Pro Text,SF Pro,Inter,system-ui,Segoe UI,Roboto,sans-serif;color:var(--ink);cursor:text;overflow:hidden;text-overflow:ellipsis;max-width:calc(var(--w) - 40px)}
.pcg .gname{font:500 12px/1.2 -apple-system,BlinkMacSystemFont,SF Pro Text,SF Pro,Inter,system-ui,Segoe UI,Roboto,sans-serif;color:var(--ink);border:0;background:transparent;outline:none;padding:1px 4px;margin:-1px -4px;border-radius:4px;field-sizing:content;min-width:2ch;max-width:calc(var(--w) - 40px)}
.pcg .gname::selection{background:color-mix(in srgb,var(--focus) 50%,transparent);color:var(--card-ink,var(--ink));-webkit-text-fill-color:var(--card-ink,var(--ink))}
.pcg .gname{-webkit-text-fill-color:currentColor}
.pcg .glabel{transition:opacity .2s ease}
.pcg .group>.glabel{pointer-events:none;--u:calc(100cqw / 235);left:calc(var(--in) - 4px);right:var(--in);bottom:auto;max-width:none;z-index:1;top:var(--pt);height:var(--row);justify-content:space-between;gap:8px}
.pcg .group>.glabel .gtitle,.pcg .group>.glabel .gname{pointer-events:auto;font-size:calc(var(--u) * var(--ft,12));font-weight:500;letter-spacing:-.01em;line-height:calc(var(--u) * var(--ft,12) * 1.2 + 2px);color:var(--card-ink,var(--ink));margin:0;padding:0 4px;min-width:0;max-width:calc(var(--u) * 125)}
.pcg .group>.glabel .gtitle{color:transparent;white-space:nowrap;position:relative}
.pcg .group>.glabel .gtitle:after{content:"";position:absolute;left:-2px;right:-2px;top:50%;height:max(24px,100%);transform:translateY(-50%)}
.pcg .group>.glabel .gtitle:hover,.pcg .group>.glabel .gname{background:color-mix(in srgb,var(--card-ink,var(--ink)) 10%,transparent)}
.pcg .paper.ingroup .sheet{box-shadow:0 calc(var(--u) * 1.5) calc(var(--u) * 6) color-mix(in srgb,#000 var(--stk-sh,42%),transparent),inset 0 0 0 1px color-mix(in srgb,var(--fb-c, var(--card-ink,#fff)) var(--stk-edge,9%),transparent)}
.pcg .group>.glabel .count{margin-left:auto;flex:none;height:var(--c-h2);min-width:0;padding:0 calc(var(--u) * var(--gc-px,5));border-radius:calc(var(--u) * var(--gc-r,3));font-size:calc(var(--u) * var(--gc-fs,9));font-weight:var(--gc-fw,500);letter-spacing:calc(var(--u) * var(--gc-ls,0));background:var(--gc-bg,color-mix(in srgb, var(--card-ink,var(--ink)) 12%, var(--card)));color:var(--gc-fg,var(--card-ink,var(--ink)))}
.pcg .group.renaming .paper.gtop .gttl{opacity:0}
.pcg .plabel{position:absolute;left:-8px;bottom:calc(100% + 2px);max-width:calc(100% + 16px);padding:8px;box-sizing:border-box;font-size:var(--pl-fs,12px);line-height:1.2;color:var(--ink-2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;transition:opacity .3s ease,filter .3s ease;pointer-events:none}
.pcg .plabel{display:flex}
.pcg .plabel .gp{color:var(--gl-ink,var(--ink));display:inline-block;overflow:hidden;text-overflow:ellipsis;white-space:pre;min-width:0}
.pcg .plabel .fn{overflow:hidden;text-overflow:ellipsis;min-width:0}
.pcg .paper.ingroup .plabel{opacity:0;filter:blur(6px)}
.pcg .slabel{position:absolute;left:0;bottom:calc(100% + 8px);display:flex;align-items:center;gap:5px;max-width:100%;font-size:12px;line-height:1.25;color:var(--gl-ink,var(--ink));white-space:nowrap;pointer-events:none;opacity:0;transform:translateY(3px);transition:opacity .25s ease,transform .3s cubic-bezier(.2,.8,.3,1)}
.pcg .slabel{font-size:var(--pl-fs,12px)}
.pcg .slabel svg{width:calc(var(--pl-fs,12px) * .58);height:calc(var(--pl-fs,12px) * 1.83);margin:calc(var(--pl-fs,12px) * -.25) 1px;flex:none;color:var(--sl-ic,color-mix(in srgb, var(--ink-3), var(--ink) 60%));transform:rotate(-14deg)}
.pcg .slabel .sn{overflow:hidden;text-overflow:ellipsis;min-width:0}
.pcg .paper.borrowed .slabel{opacity:1;transform:none}
.pcg .paper.borrowed .plabel{opacity:0}
.pcg .sheet .ttl{transition:opacity .22s ease}
.pcg .sheet .gttl{opacity:0}
.pcg .paper.ingroup.gtop .ttl:not(.gttl){opacity:0}
.pcg .paper.ingroup.gtop .gttl{opacity:1}
.pcg .sheet .type{transition:transform .28s cubic-bezier(.3,1.2,.5,1),opacity .22s ease}
.pcg .paper.ingroup .type{opacity:0}
.pcg .gname::placeholder{color:var(--ink-3);font-weight:400}
.pcg .count{display:inline-flex;align-items:center;justify-content:center;min-width:23px;height:18px;padding:0 5px;border-radius:5px;background:var(--count-bg);color:var(--ink);font-size:11px;font-weight:500;line-height:1;font-variant-numeric:tabular-nums}
.pcg .paper.dropglow .sheet{border-color:var(--sel)}
.pcg .stage{user-select:none;-webkit-user-select:none}
.pcg .shell,.pcg .shell *{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}
.pcg .shell input{-webkit-user-select:text;user-select:text}
.pcg .tile{touch-action:pan-y;-webkit-touch-callout:none}
.pcg .shell.narrow{--hk:.8}
.pcg .shell.narrow .bar{flex-wrap:wrap;row-gap:12px}
.pcg .shell.narrow .bar .tabs{order:10;flex:1 0 100%;min-width:0}
.pcg .shell.narrow .tab,.pcg .shell.narrow .crumb{font-size:calc(var(--t-size,22px) * var(--hk) - 2px)}
.pcg .shell.narrow .crumb-pill{font-size:calc(var(--cr-fs,22px) * var(--hk) - 2px)}
.pcg .shell.narrow .bar .tools .hint{display:none}
.pcg .shell.narrow .crumb>svg{display:none}
.pcg .shell.narrow .bar .tools{margin-left:auto}
.pcg .tile.dragging{z-index:200!important;cursor:grabbing!important}
.pcg .tile.bundled{z-index:199!important}
.pcg .bundle-count{position:absolute;top:-9px;right:-9px;z-index:5;min-width:22px;height:22px;padding:0 6px;border-radius:99px;display:flex;align-items:center;justify-content:center;font-size:11.5px;font-weight:600;font-variant-numeric:tabular-nums;background:var(--sel);color:#0f2a10;box-shadow:0 2px 6px #0000002e;pointer-events:none}
.pcg .trashwrap{position:relative;display:inline-flex;z-index:300}
.pcg .trash{appearance:none;cursor:pointer;font:inherit;gap:6px;padding:0 8px;min-width:36px;height:32px;border-radius:8px;border:1px solid var(--border);background:var(--btn2);color:var(--ink-2);display:inline-flex;align-items:center;justify-content:center;flex:none;position:relative;z-index:300;transition:background .18s ease,color .18s ease,border-color .18s ease,transform .25s cubic-bezier(.3,1.4,.5,1)}
.pcg .trash svg{width:18px;height:18px;overflow:visible;flex:none}
.pcg .trash .count{display:none}
.pcg .trash.has .count{display:inline-flex}
.pcg .trash .count{color:var(--danger);background:var(--danger-bg);font-weight:500}
.pcg .trash:focus-visible{outline:2px solid var(--focus);outline-offset:2px}
.pcg .trash.active{background:var(--count-bg)}
.pcg .tpop{position:absolute;top:calc(100% + 8px);right:0;left:auto;z-index:400;width:min(320px,calc(100vw - 32px));padding:6px;border-radius:12px;background:var(--btn2);border:1px solid var(--border);box-shadow:0 12px 32px #0000001a,0 2px 6px #0000000d;color:var(--ink);transform-origin:calc(100% - 18px) -6px}
.pcg .tpop-head{display:flex;align-items:center;gap:8px;padding:6px 8px 8px}
.pcg .tpop-head b{font-weight:600;font-size:13px}
.pcg .tpop-head .spacer{flex:1}
.pcg .tpop-head .btn{white-space:nowrap;flex:none}
.pcg .tpop-head .spacer{min-width:0}
.pcg .tpop-head .tp-empty{color:var(--danger)!important;background:transparent!important}
.pcg .tpop-head .tp-empty.armed{background:color-mix(in srgb,var(--danger),#000 30%)!important;color:#fff!important}
.pcg .tpop ul{list-style:none;margin:0;padding:0;max-height:260px;overflow:auto}
.pcg .tpop li{display:grid;grid-template-columns:22px 1fr auto;align-items:center;gap:10px;padding:6px 8px;border-radius:8px}
.pcg .tpop li:hover{background:color-mix(in srgb,var(--btn2),var(--ink) 6%)}
.pcg .tpop .nm{font-size:12.5px;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pcg .tpop .meta{display:block;font-size:11px;color:var(--ink-3);margin-top:1px}
.pcg .thumb{position:relative;width:18px;height:23px}
.pcg .thumb i{position:absolute;inset:0;border-radius:3px;background:color-mix(in srgb,var(--btn2),var(--ink) 4%);border:1px solid var(--border)}
.pcg .thumb i:before{content:"";position:absolute;left:3px;top:3px;width:7px;height:2px;border-radius:1px;background:color-mix(in srgb,var(--btn2),var(--ink) 35%)}
.pcg .thumb i:after{content:"";position:absolute;left:3px;top:7px;width:10px;height:1.5px;border-radius:1px;background:color-mix(in srgb,var(--btn2),var(--ink) 20%)}
.pcg .thumb.grp i:first-child{transform:translate(3px,-2px) rotate(6deg);background:color-mix(in srgb,var(--btn2),var(--ink) 10%)}
.pcg .thumb.grp i:first-child:before,.pcg .thumb.grp i:first-child:after{display:none}
.pcg .btn.sm{height:26px;padding:0 10px;font-size:12px;border-radius:7px}
.pcg .trash .lid{transform-box:fill-box;transform-origin:0% 100%;transition:transform .26s cubic-bezier(.3,1.5,.5,1)}
.pcg .trash.open{background:var(--danger-bg);border-color:var(--danger-line);color:var(--danger);transform:scale(1.12)}
.pcg .trash.open .lid{transform:translate(-1px,-2px) rotate(-32deg)}
@keyframes pcg-gulp{0%{transform:scale(1.12)}
35%{transform:scale(.9,1.06)}
70%{transform:scale(1.04,.97)}
to{transform:scale(1)}}
.pcg .trash.gulp{animation:pcg-gulp .42s cubic-bezier(.3,1.2,.5,1)}
.pcg .clip{position:absolute;pointer-events:none;opacity:0;transform-origin:50% 20%}
.pcg .clip.front{z-index:40;filter:drop-shadow(.5px 1.2px .8px color-mix(in srgb,#000 var(--clip-sh,18%),transparent))}
.pcg .clip.back{z-index:0}
.pcg .clip svg{display:block;width:100%;height:auto;overflow:visible}
@media (hover:hover) and (pointer:fine){.pcg .shell .bar .btn:not(.primary):not(.danger):not(.ghost):not([disabled]):hover,.pcg .shell .bar .trash:not(.open):not(.active):hover{background:color-mix(in srgb,var(--bt-bg,var(--btn2)),var(--bt-fg,var(--ink)) 9%)}
.pcg .shell .bar .btn.primary:not([disabled]):hover,.pcg .shell .bar .btn.danger:not([disabled]):hover{background:color-mix(in srgb,var(--btn),var(--btn-ink) 14%)}}
.pcg .shell .bar,.pcg .shell .bar .tools{gap:var(--bt-gap,8px)}
.pcg .shell .bar .btn:not(.ghost),.pcg .shell .bar .trash{height:var(--bt-h,32px);border-radius:var(--bt-r,8px);font-size:var(--bt-fs,13px);font-weight:var(--bt-fw,500);border:var(--bt-bw,0px) solid var(--bt-bc,var(--border));gap:var(--bt-ig,calc(var(--bt-fs,13px) * .54))}
.pcg .shell .bar .btn:not(.ghost){padding:0 var(--bt-px,14px)}
.pcg .shell .bar .trash{padding:0 max(4px,calc(var(--bt-px,14px) - 6px));min-width:var(--bt-h,32px)}
.pcg .shell .bar .btn:not(.primary):not(.danger):not(.ghost){background:var(--bt-bg,var(--btn2));color:var(--bt-fg,var(--ink))}
.pcg .shell .bar .trash:not(.open):not(.active){background:var(--bt-bg,var(--btn2));color:var(--bt-fg,var(--ink-2))}
.pcg .shell .bar .trash.open{border-color:var(--danger-line)}
.pcg .shell .bar .btn svg{width:var(--bt-ic,14px);height:var(--bt-ic,14px);flex:none}
.pcg .shell .bar .btn svg.ico{stroke-width:var(--bt-sw,1)}
.pcg .shell .bar .trash svg{width:calc(var(--bt-ic,14px) + 4px);height:calc(var(--bt-ic,14px) + 4px)}
.pcg .shell .bar .trash .count{background:var(--bt-cb,color-mix(in srgb, var(--t-pdf) var(--bd-mix,11%), var(--bt-bg,var(--btn2))));color:var(--bt-cf,color-mix(in srgb, var(--t-pdf), var(--card-ink,var(--ink)) var(--bd-tx,56%)))}
.pcg .shell .bar .trash{--tc-gap:var(--tcg,6px)}
.pcg .shell .bar .trash.has{padding-right:var(--tc-gap)}
.pcg .shell .bar .trash .count{height:calc(var(--bt-h,32px) - 2 * var(--tc-gap) - 2 * var(--bt-bw,0px));min-width:calc(var(--bt-h,32px) - 2 * var(--tc-gap) + 4px);border-radius:max(2px,calc(var(--bt-r,8px) - var(--tc-gap) - var(--bt-bw,0px)));font-size:var(--tc-fs,11px);font-weight:var(--tc-fw,var(--bd-fw,500))}
.pcg .shell .tpop{--tp-bg:color-mix(in srgb,var(--c-bg),#000 var(--tp-shade,22%));background:var(--tp-bg);border:0;border-radius:calc(var(--bt-r,8px) + 6px);box-shadow:inset 0 0 0 var(--c-ib-w,0px) var(--c-ib-c,transparent),0 14px 36px #00000047,0 2px 8px #0000001f;color:var(--ink)}
.pcg .shell .tpop li{border-radius:max(4px,calc(var(--bt-r,8px) - 2px))}
.pcg .shell .tpop li:hover{background:color-mix(in srgb,var(--ink) 6%,transparent)}
.pcg .shell .tpop .tpop-head .count{background:color-mix(in srgb,var(--ink) 12%,transparent);color:var(--ink)}
.pcg .shell .tpop .meta{color:var(--ink-2)}
.pcg .shell .tpop .btn.ghost{color:var(--ink-2)}
.pcg .shell .tpop .thumb i{background:var(--card);border:max(.5px,var(--fb-w,1px)) solid var(--fb-c,color-mix(in srgb,var(--card),#808080 20%))}
.pcg .shell .tpop .thumb i:before{background:var(--sk-strong,color-mix(in srgb,var(--card),#808080 22%))}
.pcg .shell .tpop .thumb i:after{background:var(--sk,color-mix(in srgb,var(--card),#808080 12%))}
.pcg .shell .tpop .thumb.grp i:first-child{background:color-mix(in srgb,var(--card),#000 8%)}
.pcg .shell .bar .trash.active{background:color-mix(in srgb,var(--c-bg),#000 var(--tp-shade,22%))}
`

// iPhone Duo vertical status bar (time over signal), drawn in the File Explorer's ink colour
const DUO_STATUS_SVG = `<svg width="48" height="86" viewBox="0 0 48 86" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M12.8765 14.2045C13.475 14.2045 14.0508 14.3049 14.6038 14.5057C15.1606 14.7064 15.6568 15.0265 16.0924 15.4659C16.5318 15.9053 16.8784 16.4886 17.1322 17.2159C17.3898 17.9394 17.5205 18.8277 17.5243 19.8807C17.5243 20.8693 17.4125 21.7519 17.189 22.5284C16.9693 23.3011 16.6531 23.9583 16.2402 24.5C15.8273 25.0417 15.3292 25.4545 14.7459 25.7386C14.1625 26.0189 13.511 26.1591 12.7913 26.1591C12.0148 26.1591 11.3292 26.0095 10.7345 25.7102C10.1398 25.4072 9.66063 24.9962 9.29699 24.4773C8.93714 23.9545 8.71934 23.3674 8.64358 22.7159H11.0697C11.1644 23.1402 11.3633 23.4697 11.6663 23.7045C11.9693 23.9356 12.3443 24.0511 12.7913 24.0511C13.5489 24.0511 14.1246 23.7216 14.5186 23.0625C14.9125 22.3996 15.1114 21.4924 15.1152 20.3409H15.0356C14.8614 20.6818 14.6265 20.9754 14.3311 21.2216C14.0356 21.464 13.6966 21.6515 13.314 21.7841C12.9352 21.9167 12.5318 21.983 12.1038 21.983C11.4182 21.983 10.8065 21.822 10.2686 21.5C9.7307 21.178 9.30646 20.7348 8.99585 20.1705C8.68525 19.6061 8.52994 18.9621 8.52994 18.2386C8.52616 17.4583 8.70608 16.7633 9.06972 16.1534C9.43335 15.5436 9.94093 15.0663 10.5924 14.7216C11.2477 14.3731 12.0091 14.2008 12.8765 14.2045ZM12.8936 16.1364C12.511 16.1364 12.1701 16.2273 11.8709 16.4091C11.5754 16.5909 11.3405 16.8352 11.1663 17.142C10.9959 17.4489 10.9125 17.7917 10.9163 18.1705C10.9163 18.553 10.9996 18.8977 11.1663 19.2045C11.3368 19.5076 11.5678 19.75 11.8595 19.9318C12.1549 20.1098 12.4921 20.1989 12.8709 20.1989C13.1549 20.1989 13.4182 20.1458 13.6606 20.0398C13.903 19.9337 14.1133 19.7879 14.2913 19.6023C14.4731 19.4129 14.6152 19.1951 14.7174 18.9489C14.8197 18.7027 14.8709 18.4413 14.8709 18.1648C14.8671 17.7973 14.7799 17.4602 14.6095 17.1534C14.439 16.8466 14.2042 16.6004 13.9049 16.4148C13.6057 16.2292 13.2686 16.1364 12.8936 16.1364ZM20.2363 24.6477C19.8613 24.6477 19.5393 24.5152 19.2704 24.25C19.0052 23.9848 18.8727 23.6629 18.8727 23.2841C18.8727 22.9129 19.0052 22.5947 19.2704 22.3295C19.5393 22.0644 19.8613 21.9318 20.2363 21.9318C20.5999 21.9318 20.9181 22.0644 21.1909 22.3295C21.4636 22.5947 21.5999 22.9129 21.5999 23.2841C21.5999 23.5341 21.5355 23.7633 21.4068 23.9716C21.2818 24.1761 21.117 24.3409 20.9124 24.4659C20.7079 24.5871 20.4825 24.6477 20.2363 24.6477ZM20.2363 18.9375C19.8613 18.9375 19.5393 18.8049 19.2704 18.5398C19.0052 18.2746 18.8727 17.9527 18.8727 17.5739C18.8727 17.2027 19.0052 16.8864 19.2704 16.625C19.5393 16.3598 19.8613 16.2273 20.2363 16.2273C20.5999 16.2273 20.9181 16.3598 21.1909 16.625C21.4636 16.8864 21.5999 17.2027 21.5999 17.5739C21.5999 17.8277 21.5355 18.0587 21.4068 18.267C21.2818 18.4716 21.117 18.6345 20.9124 18.7557C20.7079 18.8769 20.4825 18.9375 20.2363 18.9375ZM22.9583 23.9545V22.017L27.8162 14.3636H29.4867V17.0455H28.4981L25.4356 21.892V21.983H32.339V23.9545H22.9583ZM28.5435 26V23.3636L28.589 22.5057V14.3636H30.8958V26H28.5435ZM38.4544 14.3636V26H35.9942V16.6989H35.926L33.2612 18.3693V16.1875L36.1419 14.3636H38.4544Z" fill="currentColor"/>
<path d="M24.0002 36.0082C28.3778 36.0082 32.6646 37.2573 36.3568 39.6091C40.049 41.961 42.9934 45.3183 44.8439 49.2857C46.6945 53.253 47.3749 57.6664 46.8042 62.0067C46.2334 66.347 44.435 70.4344 41.6218 73.7885C41.1394 74.3632 40.2825 74.4382 39.7075 73.9559C39.1327 73.4736 39.0579 72.6167 39.5401 72.0416C42.0207 69.084 43.6055 65.4796 44.1089 61.6524C44.6121 57.825 44.0122 53.9327 42.3804 50.4342C40.7486 46.936 38.1524 43.976 34.8968 41.9021C31.641 39.8282 27.8604 38.726 24.0002 38.726C20.1399 38.726 16.3594 39.8282 13.1036 41.9021C9.84779 43.9761 7.25079 46.9358 5.61898 50.4342C3.98717 53.9327 3.38828 57.8251 3.89153 61.6524C4.39485 65.4797 5.97967 69.084 8.46029 72.0416C8.94252 72.6166 8.86762 73.4735 8.29285 73.9559C7.71775 74.4382 6.85987 74.3635 6.37754 73.7885C3.56443 70.4344 1.76696 66.3469 1.19622 62.0067C0.62552 57.6664 1.30593 53.253 3.15644 49.2857C5.00696 45.3183 7.95142 41.961 11.6436 39.6091C15.3357 37.2573 19.6227 36.0082 24.0002 36.0082Z" fill="currentColor"/>
<circle cx="13.8402" cy="78.1077" r="1.98636" fill="currentColor"/>
<circle cx="18.7646" cy="79.998" r="1.98636" fill="currentColor"/>
<circle cx="24" cy="80.641" r="1.98636" fill="currentColor"/>
<circle cx="29.2354" cy="79.998" r="1.98636" fill="currentColor"/>
<circle cx="34.1598" cy="78.1077" r="1.98636" fill="currentColor"/>
<path d="M24.0005 61.4076C25.1674 61.4076 26.2903 61.8568 27.1351 62.6617C27.3739 62.8894 27.3841 63.2677 27.1586 63.5086L24.439 66.4083C24.3254 66.5295 24.1666 66.5988 24.0005 66.5988C23.8344 66.5988 23.6757 66.5294 23.562 66.4083L20.8424 63.5086C20.6167 63.2677 20.6269 62.8894 20.8659 62.6617C21.7108 61.8568 22.8336 61.4076 24.0005 61.4076Z" fill="currentColor"/>
<path d="M24.0005 56.1471C25.2386 56.1472 26.4651 56.392 27.6088 56.8662C28.7525 57.3405 29.7928 58.0363 30.6677 58.9124C31.2666 59.5131 31.2654 60.4858 30.6651 61.0852C30.0646 61.6845 29.0919 61.6839 28.4923 61.0839C27.9029 60.4936 27.2022 60.0254 26.4317 59.7059C25.6611 59.3863 24.8347 59.2218 24.0005 59.2217C23.1663 59.2217 22.3399 59.3864 21.5693 59.7059C20.7988 60.0254 20.0981 60.4936 19.5087 61.0839C18.9091 61.684 17.9364 61.6844 17.3359 61.0852C16.7353 60.4856 16.735 59.513 17.3346 58.9124C18.2096 58.0362 19.2484 57.3405 20.3922 56.8662C21.536 56.392 22.7623 56.1472 24.0005 56.1471Z" fill="currentColor"/>
<path d="M24.0005 50.3556C25.9623 50.3557 27.9048 50.7475 29.7138 51.5066C31.5228 52.2658 33.1626 53.3782 34.537 54.7782C35.1315 55.3838 35.1229 56.3564 34.5174 56.951C33.9118 57.5453 32.9391 57.5369 32.3446 56.9314C31.2563 55.8228 29.9574 54.9422 28.5249 54.341C27.0925 53.74 25.554 53.4302 24.0005 53.4302C22.4469 53.4302 20.9074 53.7398 19.4748 54.341C18.0424 54.9423 16.7433 55.8229 15.6551 56.9314C15.0605 57.5367 14.0878 57.5454 13.4823 56.951C12.8772 56.3565 12.8685 55.3837 13.4627 54.7782C14.8371 53.3782 16.4769 52.2658 18.2859 51.5066C20.0951 50.7474 22.0385 50.3556 24.0005 50.3556Z" fill="currentColor"/>
</svg>`

const MARKUP = `
<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs><filter id="pcg-mbx1" x="-30%" y="0" width="160%" height="100%"><feGaussianBlur stdDeviation="1 0"/></filter><filter id="pcg-mbx2" x="-30%" y="0" width="160%" height="100%"><feGaussianBlur stdDeviation="2 0"/></filter><filter id="pcg-mbx3" x="-30%" y="0" width="160%" height="100%"><feGaussianBlur stdDeviation="3.5 0"/></filter><filter id="pcg-mbx4" x="-30%" y="0" width="160%" height="100%"><feGaussianBlur stdDeviation="5 0"/></filter><filter id="pcg-mby1" x="0" y="-60%" width="100%" height="220%"><feGaussianBlur stdDeviation="0 .8"/></filter><filter id="pcg-mby2" x="0" y="-60%" width="100%" height="220%"><feGaussianBlur stdDeviation="0 1.6"/></filter><filter id="pcg-mby3" x="0" y="-60%" width="100%" height="220%"><feGaussianBlur stdDeviation="0 2.6"/></filter><filter id="pcg-mby4" x="0" y="-60%" width="100%" height="220%"><feGaussianBlur stdDeviation="0 3.6"/></filter></defs></svg><div class="shell" id="shell"><div class="app" id="app"><div class="bar" id="bar"></div><div class="stage" id="stage"></div></div></div>
`

function ensureStyles() {
    if (typeof document === "undefined") return
    // one shared <style>; replaced when the code changes, so an edited file never keeps running on old CSS
    let el = document.getElementById("pcg-styles")
    if (!el) {
        el = document.createElement("style")
        el.id = "pcg-styles"
        document.head.appendChild(el)
    }
    if (el.textContent !== CSS) el.textContent = CSS
}

// Framer colours can be rgba() or colour tokens (CSS variables); the engine wants hex
function toHex(value, host) {
    if (!value) return ""
    if (/^#[0-9a-f]{6}$/i.test(value)) return value
    if (/^#[0-9a-f]{3}$/i.test(value))
        return (
            "#" +
            value
                .slice(1)
                .split("")
                .map((c) => c + c)
                .join("")
        )
    if (typeof document === "undefined" || !host) return ""
    const probe = document.createElement("span")
    probe.style.color = value
    host.appendChild(probe)
    const rgb = getComputedStyle(probe).color
    probe.remove()
    const m = rgb.match(/[\d.]+/g)
    if (!m) return ""
    return (
        "#" +
        m
            .slice(0, 3)
            .map((n) => Math.round(+n).toString(16).padStart(2, "0"))
            .join("")
    )
}

/* eslint-disable */
function mountFileGroups(root, opts) {
    root.innerHTML = MARKUP
    const cleanups = []
    let alive = true
    const on = (t, ev, fn, opt) => {
        t.addEventListener(ev, fn, opt)
        cleanups.push(() => t.removeEventListener(ev, fn, opt))
    }
    const STUB = new Proxy(function () {}, {
        get: (t, k) =>
            k === "then"
                ? undefined
                : k === Symbol.toPrimitive
                  ? () => ""
                  : k === "querySelectorAll"
                    ? () => []
                    : STUB,
        set: () => true,
        apply: () => STUB,
    })
    const byId = (id) => root.querySelector("#" + id) || STUB
    const esc = (s) =>
        String(s).replace(
            /[&<>"']/g,
            (c) =>
                ({
                    "&": "&amp;",
                    "<": "&lt;",
                    ">": "&gt;",
                    '"': "&quot;",
                    "'": "&#39;",
                })[c]
        )
    const LOC = opts.location || "Projects"
    const store = opts.persist
        ? window.localStorage
        : { getItem: () => null, setItem: () => {}, removeItem: () => {} }

    // ---------- helpers ----------
    function bez(x1, y1, x2, y2) {
        const cx = 3 * x1,
            bx = 3 * (x2 - x1) - cx,
            ax = 1 - cx - bx,
            cy = 3 * y1,
            by = 3 * (y2 - y1) - cy,
            ay = 1 - cy - by
        const sx = (t) => ((ax * t + bx) * t + cx) * t,
            sy = (t) => ((ay * t + by) * t + cy) * t
        return (x) => {
            if (x <= 0) return 0
            if (x >= 1) return 1
            let lo = 0,
                hi = 1,
                t = x
            for (let i = 0; i < 22; i++) {
                if (sx(t) < x) lo = t
                else hi = t
                t = (lo + hi) / 2
            }
            return sy(t)
        }
    }
    const flyEase = bez(0.55, 0, 0.2, 1),
        moveEase = bez(0.45, 0, 0.2, 1)
    const cub = (a, b, c, d, t) => {
        const u = 1 - t
        return (
            u * u * u * a +
            3 * u * u * t * b +
            3 * u * t * t * c +
            t * t * t * d
        )
    }
    const reduced = matchMedia("(prefers-reduced-motion: reduce)")
    let instant = false // while true every animation runs in ~0ms (used to show a stack already open on mount)
    const M = () => (instant ? 0.001 : reduced.matches ? 0.6 : 1)
    const wait = (ms) => new Promise((r) => setTimeout(r, ms * M()))
    const CHECK =
        '<svg viewBox="0 0 12 12" fill="none"><path d="M2.5 6.2 L5 8.6 L9.6 3.6" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    // wire geometry with a horizontal spread (in viewBox units) so the clip can open up when it clamps
    const clipPaths = (sp) => {
        const f = (13 + sp) / 13,
            X = (x) => +(12 + (x - 12) * f).toFixed(3) // 13 = visible span (outer-left leg → inner-right leg)
        const a = X(8),
            b = X(16),
            l = X(3),
            r = X(21)
        const r1 = (b - a) / 2,
            r2 = (b - l) / 2,
            r3 = (r - l) / 2
        return {
            back: `M${a} 28 V58 A${r1} ${r1} 0 0 0 ${b} 58 V12 A${r2} ${r2} 0 0 0 ${l} 12 V66 A${r3} ${r3} 0 0 0 ${r} 66 V24`,
            front: `M${a} 28 V58 A${r1} ${r1} 0 0 0 ${b} 58 V15`,
        }
    }
    const WIRE = clipPaths(0).back,
        FRONT = clipPaths(0).front
    const CLAMP_SPREAD_PX = 3
    const wire = (d) =>
        `<path d="${d}" fill="none" stroke="var(--clip)" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="var(--clip-hi)" stroke-width=".7" stroke-linecap="round" opacity=".75" transform="translate(-.55 -.4)"/>`
    const CLIP_BACK = `<svg viewBox="-4 0 32 80">${wire(WIRE)}</svg>`
    const CLIP_FRONT = `<svg viewBox="-4 0 32 80">${wire(FRONT)}</svg>`
    function setSpread(g, px) {
        g.spread = px
        const d = clipPaths((px * 24) / (L.w * 0.1))
        g.clipBack
            .querySelectorAll("path")
            .forEach((p) => p.setAttribute("d", d.back))
        g.clip
            .querySelectorAll("path")
            .forEach((p) => p.setAttribute("d", d.front))
    }
    function animSpread(g, to, dur) {
        const from = g.spread || 0,
            t0 = performance.now(),
            D = Math.max(1, dur * M()),
            tok = (g.spreadTok = (g.spreadTok || 0) + 1)
        return new Promise((res) => {
            const step = (now) => {
                if (tok !== g.spreadTok) return res()
                const p = Math.min(1, (now - t0) / D),
                    e = moveEase(p)
                setSpread(g, from + (to - from) * e)
                if (p < 1) requestAnimationFrame(step)
                else res()
            }
            requestAnimationFrame(step)
        })
    }
    const CLIP_EDGE = 16 / 80,
        CLIP_TILT = "rotate(-14deg)"
    const clipAnim = (g, frames, opts) =>
        [g.clipBack, g.clip].map((c) => c.animate(frames, opts))
    const clipSet = (g, op, tf) =>
        [g.clipBack, g.clip].forEach((c) => {
            c.style.opacity = op
            c.style.transform = tf
        })
    // stack poses (index 0 = top of stack)
    // stack poses (index 0 = top). Lower papers rotate around the clip's grip point on the top edge,
    // so every sheet meets the clip exactly and fans out away from it — nothing pokes up through the wire.
    const STACK_R = [0, -1.8, 1.5, -2.4, 2.1, -1.2]
    const stackPose = (k, tight) => {
        const r =
                STACK_R[k % STACK_R.length] *
                (tight ? 0.75 : 1) *
                ((typeof C !== "undefined" && C && C.fan) || 1),
            th = (r * Math.PI) / 180
        const dx = L.w * 0.69 - L.w / 2,
            dy = -L.h / 2 // grip point relative to the paper's centre
        const rx = dx * Math.cos(th) - dy * Math.sin(th),
            ry = dx * Math.sin(th) + dy * Math.cos(th)
        return { x: dx - rx, y: dy - ry, r, s: 1 }
    }

    // ---------- state ----------
    const shell = byId("shell")
    const app = byId("app"),
        stage = byId("stage"),
        bar = byId("bar")
    // backdrop zoom: pointer and rect maths happen on screen, poses live inside the zoomed camera
    function Z() {
        const w = stage.offsetWidth
        return w ? stage.getBoundingClientRect().width / w : 1
    } // on-screen size ÷ layout size: covers backdrop zoom (mid-glide too) and any scale applied from outside
    const dragLayer = document.createElement("div")
    dragLayer.className = "drag-layer"
    app.appendChild(dragLayer)
    let filter = "all",
        syncing = false,
        groupsTab = "hidden",
        navEl = null,
        crumbEl = null
    // Groups tab grows open from zero width while fading in with a sideways blur; leaving runs the reverse
    function tabIn(t, nav) {
        if (t._anim) t._anim.cancel()
        t.style.display = ""
        t.style.pointerEvents = ""
        const gap = parseFloat(getComputedStyle(nav).columnGap) || 0,
            w = t.getBoundingClientRect().width / Z()
        t.style.overflow = "hidden"
        // the slot opens first, the label follows it in: neighbours glide instead of jumping
        t._anim = t.animate(
            [
                {
                    width: "0px",
                    marginLeft: -gap + "px",
                    opacity: 0,
                    filter: "blur(6px)",
                    transform: "translateX(-6px)",
                },
                { offset: 0.35, opacity: 0, filter: "blur(6px)" },
                {
                    width: w + "px",
                    marginLeft: "0px",
                    opacity: 1,
                    filter: "blur(0px)",
                    transform: "none",
                },
            ],
            { duration: 520 * M(), easing: "cubic-bezier(.45,0,.2,1)" }
        )
        t._anim.finished
            .then(() => {
                t.style.overflow = ""
                t._anim = null
            })
            .catch(() => {})
    }
    function tabOut(t, nav) {
        if (t._anim) t._anim.cancel()
        const gap = parseFloat(getComputedStyle(nav).columnGap) || 0,
            w = t.getBoundingClientRect().width / Z()
        t.style.pointerEvents = "none"
        t.style.overflow = "hidden"
        t._anim = t.animate(
            [
                {
                    width: w + "px",
                    marginLeft: "0px",
                    opacity: 1,
                    filter: "blur(0px)",
                    transform: "none",
                },
                {
                    offset: 0.45,
                    opacity: 0,
                    filter: "blur(6px)",
                    transform: "translateX(-6px)",
                },
                {
                    width: "0px",
                    marginLeft: -gap + "px",
                    opacity: 0,
                    filter: "blur(6px)",
                    transform: "translateX(-6px)",
                },
            ],
            {
                duration: 420 * M(),
                easing: "cubic-bezier(.65,0,.35,1)",
                fill: "forwards",
            }
        )
        t._anim.finished
            .then(() => {
                if (groupsTab === "leaving") {
                    groupsTab = "hidden"
                    t.style.display = "none"
                    t._anim.cancel()
                    t._anim = null
                }
            })
            .catch(() => {})
    }
    const DEMO_STACKS =
        opts.stacks !== undefined
            ? opts.stacks || []
            : opts.files && opts.files.length
              ? []
              : [
                    {
                        name: "Brand refresh",
                        files: [
                            "Moodboard",
                            "Brand guidelines",
                            "Logo explorations",
                        ],
                    },
                    { name: "Finance", files: ["Budget", "Invoices Q3"] },
                ]
    const TABS = [
        ["all", "All files"],
        ["pdf", "PDF"],
        ["docx", "Docs"],
        ["fig", "Design"],
        ["xlsx", "Sheets"],
    ]
    let papers = [],
        groups = [],
        editGroup = null,
        selecting = false,
        busy = false,
        clock = 0,
        groupNo = 0,
        L = {}
    const DEFAULT_FILES = [
        ["Project brief", "pdf"],
        ["Moodboard", "fig"],
        ["Interview notes", "docx"],
        ["Wireframes v2", "fig"],
        ["Budget", "xlsx"],
        ["Brand guidelines", "pdf"],
        ["Pitch deck", "pdf"],
        ["Style tiles", "fig"],
        ["Meeting minutes", "docx"],
        ["Invoices Q3", "xlsx"],
        ["Logo explorations", "fig"],
        ["Roadmap", "pdf"],
        ["Icon set", "fig"],
        ["Research plan", "docx"],
        ["Timeline", "xlsx"],
        ["Landing page", "fig"],
    ]
    const FILES = (
        opts.files && opts.files.length ? opts.files : DEFAULT_FILES
    ).map((f) => (Array.isArray(f) ? f : [f.title, f.type]))
    // content changes with the type of file (sizes in px of the 235×300 card)
    const cbar = (top, w, h, dark) =>
        `<i class="b${dark ? " d" : ""}" style="top:calc(var(--u) * ${top});width:calc(var(--u) * ${w});height:calc(var(--u) * ${h})"></i>`
    const CONTENT = {
        fig:
            cbar(51, 180, 12, 1) +
            cbar(73, 154, 12) +
            '<i class="img" style="left:var(--in);top:calc(var(--u) * 95);width:calc(var(--u) * 74);height:calc(var(--u) * 55)"></i><i class="img" style="left:calc(var(--in) + var(--u) * 80);top:calc(var(--u) * 95);width:calc(var(--u) * 45);height:calc(var(--u) * 55)"></i>',
        pdf:
            cbar(51, 180, 12, 1) +
            cbar(73, 164, 8) +
            cbar(87, 172, 8) +
            cbar(101, 150, 8) +
            cbar(115, 96, 8) +
            cbar(137, 120, 12, 1) +
            cbar(157, 172, 8) +
            cbar(171, 140, 8),
        docx:
            cbar(51, 120, 12, 1) +
            cbar(73, 190, 7) +
            cbar(86, 184, 7) +
            cbar(99, 176, 7) +
            cbar(112, 110, 7) +
            cbar(131, 190, 7) +
            cbar(144, 168, 7) +
            cbar(157, 86, 7),
        xlsx:
            '<span class="tbl">' +
            '<i class="h"></i>'.repeat(3) +
            ["", "", "", "", "", "c"]
                .map(
                    (k) =>
                        `<i class="h"></i><i class="${k}"></i><i class="${k}"></i>`
                )
                .join("") +
            "</span>",
    }

    function makePaper(i) {
        const el = document.createElement("div")
        el.className = "tile paper"
        el.tabIndex = -1
        el.setAttribute("aria-checked", "false")
        const [title, type] = FILES[i - 1],
            name = title + "." + type
        el.dataset.type = type
        el.setAttribute("aria-label", name)
        el.innerHTML =
            '<div class="slabel" aria-hidden="true"><svg viewBox="2.5 0 7 22" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round"><path d="M7.1 7.5v8a1.3 1.3 0 0 1-2.6 0V4.6a2.05 2.05 0 0 1 4.1 0v11.7a2.6 2.6 0 0 1-5.2 0V8.5"/></svg><span class="sn"></span></div><div class="plabel"><span class="gp"></span></div><div class="sheet"><span class="ttl"></span><span class="ttl gttl" aria-hidden="true"></span><span class="type"></span>' +
            '<span class="cnt">' +
            (CONTENT[type] || CONTENT.pdf) +
            '</span><span class="check">' +
            CHECK +
            "</span></div>"
        el.querySelector(".ttl").textContent = title
        el.querySelector(".type").textContent = type // the dot comes from CSS so the label format can change
        const p = {
            id: i,
            name,
            type,
            added: i,
            el,
            sheet: el.querySelector(".sheet"),
            gt: el.querySelector(".gttl"),
            gp: el.querySelector(".gp"),
            pose: { x: 0, y: 0, r: 0, s: 1 },
            group: null,
            sel: false,
        }
        el.addEventListener("click", (e) => toggle(p, e))
        el.addEventListener("keydown", (e) => {
            if (e.key === " " || e.key === "Enter") {
                e.preventDefault()
                toggle(p)
            }
        })
        return p
    }
    function reset() {
        stage.innerHTML = ""
        groups = []
        editGroup = null
        busyBy = null
        filter = "all"
        groupsTab = "hidden"
        if (navEl) {
            navEl.remove()
            crumbEl.remove()
            navEl = crumbEl = null
        }
        drag = null
        trashed = []
        trashOpen = false
        popEl.hidden = true
        updateTrash(false)
        selecting = false
        busy = false
        clock = 6
        groupNo = 0
        papers = FILES.map((_, i) => makePaper(i + 1))
        papers.forEach((p) => stage.appendChild(p.el))
        // two ready-made stacks so the view demonstrates itself on load
        const made = DEMO_STACKS.slice()
            .reverse()
            .map((st) => {
                // reversed: newest stack sits first, so the first listed ends up top-left
                const members = papers.filter(
                    (p) =>
                        st.files.includes(p.name.replace(/\.[^.]+$/, "")) ||
                        st.files.includes(p.name)
                )
                if (members.length < 2) return null
                const g = makeGroup()
                g.name = st.name
                g.members = members.sort((a, b) => b.added - a.added)
                g.members.forEach((p) => {
                    p.group = g
                    p.el.classList.add("ingroup")
                    p.el.tabIndex = -1
                    g.el.insertBefore(p.el, g.label)
                })
                return g
            })
            .filter(Boolean)
        relayout()
        made.forEach((g) => {
            g.members.forEach((p) => {
                p.pose = { ...stackLocal(g, p, true) }
                apply(p)
                p.el.style.setProperty(
                    "--k",
                    g.members.length - 1 - g.members.indexOf(p)
                )
            })
            setSpread(g, CLAMP_SPREAD_PX)
            clipSet(g, 1, `translateY(0) ${CLIP_TILT}`)
            showName(g)
            g.label.style.opacity = 1
        })
        renderBar()
        const gt = navEl && navEl.querySelector('[data-k="groups"]')
        if (gt && gt._anim) gt._anim.finish() // no entrance on load
    }

    // ---------- layout ----------
    // open groups lay their papers out in place of the stack (top of stack first)
    // a group shows under a filter when any of its files match
    const isType = (f) => f !== "all" && f !== "groups"
    const matches = (t) =>
        filter === "all" ||
        (filter === "groups" ? !!t.members : !t.members && t.type === filter) // stacks live under All files and Groups only
    const tiles = () => {
        const out = []
        groups
            .slice()
            .sort((a, b) => b.created - a.created)
            .forEach((g) => {
                if (!matches(g)) return
                if (g.open) out.push(...g.members.slice().reverse())
                else out.push(g)
            })
        // under a type tab, matching files come out of their stacks and lead the grid (grouped per stack, in stack order), loose files follow
        if (isType(filter))
            groups
                .slice()
                .sort((a, b) => b.created - a.created)
                .forEach((g) =>
                    out.push(
                        ...g.members
                            .filter((p) => p.borrowed && matches(p))
                            .sort((a, b) => a.added - b.added)
                    )
                )
        out.push(
            ...papers
                .filter((p) => !p.group && matches(p))
                .sort((a, b) => a.added - b.added)
        )
        return out
    }
    async function applyFilter(f) {
        if (busy || f === filter) return
        if (editGroup) endEdit()
        if (selecting) {
            selecting = false
            clearSel()
        }
        const og = groups.find((g) => g.open)
        if (og) await collapse(og)
        busy = true
        const before = new Set(tiles())
        filter = f
        // under a type tab, stacked files of that type are lent out of their stack (named above them); they go home when the tab changes
        const lend = isType(f)
            ? papers.filter((p) => p.group && !p.borrowed && p.type === f)
            : []
        lend.forEach((p) => {
            const g = p.group
            p.flyOut = before.has(g) // the stack is on screen: the file flies out of it
            if (p.flyOut && !g.lifting) {
                g.lifting = true
                animSpread(g, 0, 200)
                // above the lent-out files (z 5) until the clip is off, so they don't cover its front wire
                g.el.style.zIndex = 6
                clipTo(g, false, 220, "cubic-bezier(.5,0,.8,.4)").then(() => {
                    g.lifting = false
                    if (g.el.style.zIndex === "6") g.el.style.zIndex = 1
                })
                g.label.getAnimations().forEach((a) => a.cancel())
                if (+getComputedStyle(g.label).opacity > 0)
                    blurFade(g.label, "out", "y", 5, 180)
            }
            if (p.el.parentNode === g.el) {
                const l = p.pose
                stage.appendChild(p.el)
                p.pose = { x: g.pose.x + l.x, y: g.pose.y + l.y, r: l.r, s: 1 }
                apply(p)
            }
            p.borrowed = true
            p.el.classList.remove("ingroup", "fhide")
            p.el.classList.add("borrowed")
            p.el.style.setProperty("--k", 0)
            p.el.style.zIndex = 5
            p.el.querySelector(".slabel .sn").textContent = g.name
        })
        syncing = true
        const m = targets()
        syncing = false
        const moves = []
        let i = 0,
            j = 0
        const homing = new Map() // stack → flights of its files coming home
        before.forEach((t) => {
            if (!m.has(t)) {
                if (t.borrowed && t.group && m.has(t.group)) {
                    // its stack is back on screen: fly home and clip in
                    const g = t.group,
                        gt = m.get(g),
                        sp = stackLocal(g, t, false)
                    t.el.classList.remove("borrowed")
                    t.el.style.zIndex = 60
                    // the stack waits with its clip off and its name hidden until its files are back, then clips them in
                    if (!homing.has(g)) {
                        homing.set(
                            g,
                            g.members
                                .filter(
                                    (q) =>
                                        !q.borrowed && q.el.parentNode === g.el
                                )
                                .map((q) =>
                                    travel(q, stackLocal(g, q, false), {
                                        k: 0,
                                        dur: 260,
                                        ease: moveEase,
                                        lift: 0,
                                        tilt: 0,
                                        delay: 120,
                                    })
                                )
                        )
                        g.clipTok = (g.clipTok || 0) + 1
                        ;[g.clip, g.clipBack].forEach((c) =>
                            c.getAnimations().forEach((a) => a.cancel())
                        )
                        setSpread(g, 0)
                        clipSet(g, 0, `translateY(-24px) ${CLIP_TILT}`)
                        g.label.getAnimations().forEach((a) => a.cancel())
                        g.label.style.opacity = 0
                    }
                    homing
                        .get(g)
                        .push(
                            travel(
                                t,
                                {
                                    x: gt.x + sp.x,
                                    y: gt.y + sp.y,
                                    r: sp.r,
                                    s: 1,
                                },
                                {
                                    k: 0.18,
                                    dur: 680,
                                    ease: moveEase,
                                    lift: 0.012,
                                    tilt: 0,
                                    delay: 120 + j++ * 60,
                                }
                            )
                        )
                    return
                }
                // no longer matching: fade away in place
                moves.push(
                    t.el
                        .animate(
                            [
                                { opacity: 1, transform: t.el.style.transform },
                                {
                                    opacity: 0,
                                    transform:
                                        t.el.style.transform + " scale(.92)",
                                },
                            ],
                            {
                                duration: 220 * M(),
                                easing: "ease-in",
                                fill: "forwards",
                            }
                        )
                        .finished.then(() => {
                            t.el.classList.add("fhide")
                            t.el.getAnimations().forEach((a) => a.cancel())
                            if (t.borrowed) unborrow(t)
                        })
                        .catch(() => {})
                )
            }
        })
        m.forEach((to, t) => {
            if (t.members && t.open) return
            if (t.borrowed && t.flyOut) {
                t.flyOut = false
                moves.push(
                    travel(t, to, {
                        k: 0.16,
                        dur: 680,
                        ease: moveEase,
                        lift: 0.012,
                        tilt: 0,
                        delay: 60 + j++ * 60,
                    })
                )
                return
            }
            if (!before.has(t)) {
                // newly matching: appear at its new spot
                if (t.members && !homing.has(t)) {
                    // a stack whose clip lifted when its files were lent out on an earlier tab: clipped and named again
                    ;[t.clip, t.clipBack].forEach((c) =>
                        c.getAnimations().forEach((a) => a.cancel())
                    )
                    setSpread(t, CLAMP_SPREAD_PX)
                    clipSet(t, 1, `translateY(0) ${CLIP_TILT}`)
                    t.label.getAnimations().forEach((a) => a.cancel())
                    t.label.style.opacity = 1
                    t.lifting = false
                }
                t.el.classList.remove("fhide")
                t.pose = { ...to }
                apply(t)
                moves.push(
                    t.el
                        .animate(
                            [
                                {
                                    opacity: 0,
                                    transform:
                                        t.el.style.transform + " scale(.92)",
                                },
                                { opacity: 1, transform: t.el.style.transform },
                            ],
                            {
                                duration: 300 * M(),
                                delay: (160 + j++ * 50) * M(),
                                easing: "cubic-bezier(.2,.8,.3,1)",
                                fill: "backwards",
                            }
                        )
                        .finished.catch(() => {})
                )
            } else moves.push(travel(t, to, REFLOW(t, i++)))
        })
        homing.forEach((flights, g) =>
            moves.push(
                Promise.all(flights).then(async () => {
                    g.members.forEach((p) => {
                        if (!p.borrowed) return
                        p.borrowed = false
                        p.flyOut = false
                        p.el.classList.remove("borrowed", "fhide")
                        p.el.classList.add("ingroup")
                        shadow(p, 0)
                    })
                    await clampIn(g) // back under the stack element, clip drops and clamps
                    g.members.forEach((p) => (p.el.style.zIndex = ""))
                    fadeLabel(g)
                })
            )
        )
        renderBar()
        await Promise.all(moves)
        busy = false
        renderBar()
    }
    // a lent-out file goes back into its stack (under the clip, in stack order)
    function unborrow(p) {
        const g = p.group
        p.borrowed = false
        p.flyOut = false
        p.el.classList.remove("borrowed", "fhide")
        p.el.style.zIndex = ""
        p.el.tabIndex = -1
        shadow(p, 0)
        if (!g || !groups.includes(g)) return
        p.el.classList.add("ingroup")
        g.members.forEach((q) => {
            if (q === p || q.el.parentNode === g.el)
                g.el.insertBefore(q.el, g.label)
        })
        p.pose = { ...stackLocal(g, p, true) }
        apply(p)
        p.el.style.setProperty(
            "--k",
            g.members.length - 1 - g.members.indexOf(p)
        )
    }
    function targets() {
        const t = tiles()
        measure(t.length)
        const m = new Map()
        t.forEach((tile, i) => m.set(tile, slot(i)))
        groups.forEach((g) => {
            if (g.open) m.set(g, m.get(g.members[g.members.length - 1]))
        })
        // anything that doesn't match the current tab stays hidden (applyFilter animates this itself)
        if (!syncing)
            [...groups, ...papers.filter((p) => !p.group)].forEach((t) =>
                t.el.classList.toggle("fhide", !m.has(t))
            )
        return m
    }
    const REFLOW = (tile, i) => ({
        k: 0.22,
        dur: 680,
        ease: moveEase,
        lift: tile.members ? 0 : 0.012,
        tilt: tile.members ? 0 : 2.2,
        delay: 80 + i * 35,
    })
    function measure(n) {
        const cs = getComputedStyle(shell)
        const inner =
            (parseFloat(cs.paddingLeft) || 0) +
            (parseFloat(cs.paddingRight) || 0) +
            (parseFloat(cs.borderLeftWidth) || 0) +
            (parseFloat(cs.borderRightWidth) || 0)
        let room = root.clientWidth - inner
        if (C && C.maxW) room = Math.min(room, C.maxW - inner) // the container never grows past Max width
        if (C && C.bkOn === "on")
            room = Math.min(room, root.clientWidth - inner - 2 * C.bkPad) // leave the backdrop's padding free
        const gx = C && C.gx != null ? C.gx : 32,
            gy = C && C.gy != null ? C.gy : 50,
            plFs = (C && C.plFs) || 12,
            top = Math.max(24, Math.round(plFs * 1.25 + 10)) // top: room for stack names above the first row
        const gyL =
            isType(filter) && papers.some((p) => p.borrowed)
                ? Math.max(gy, Math.round(plFs * 1.25 + 16))
                : gy // stack names sit above lent-out files: rows need room for them
        const want = Math.max(1, (C && C.cols) || 4)
        // as many of the chosen columns as fit with cards at least 120px wide
        const cols = Math.max(
            1,
            Math.min(want, Math.floor((room + gx) / (120 + gx)))
        )
        const avail = room // in Framer the frame decides: cards grow to fill it
        const w = (avail - (cols - 1) * gx) / cols
        const h = (w * 300) / 235
        const rows = Math.max(1, Math.ceil(n / cols))
        L = {
            cols,
            w,
            h,
            gx,
            gy: gyL,
            top,
            width: cols * w + (cols - 1) * gx,
            height: top + rows * h + (rows - 1) * gyL,
        }
        shell.classList.toggle("narrow", room < 520)
        L.inner = inner
        app.style.width = L.width + "px"
        if (typeof bkSync === "function")
            requestAnimationFrame(() => {
                bkSync()
                syncMask()
            })
        stage.style.setProperty("--w", w + "px")
        dragLayer.style.setProperty("--w", w + "px")
        stage.style.height = L.height + "px"
    }
    const slot = (i) => ({
        x: (i % L.cols) * (L.w + L.gx),
        y: L.top + Math.floor(i / L.cols) * (L.h + L.gy),
        r: 0,
        s: 1,
    })
    function relayout() {
        targets().forEach((to, tile) => {
            tile.pose = { ...to }
            apply(tile)
        })
        groups.forEach(placeClip)
        // sheets inside closed stacks take their pose again (the fan angle may have changed)
        if (!busy)
            groups.forEach((g) => {
                if (g.open || g.forming) return
                g.members.forEach((p) => {
                    if (p.el.parentNode === g.el && !p.borrowed) {
                        p.pose = { ...stackLocal(g, p, true) }
                        apply(p)
                    }
                })
            })
    }
    function apply(t) {
        t.el.style.transform = `translate(${t.pose.x.toFixed(2)}px,${t.pose.y.toFixed(2)}px) rotate(${t.pose.r.toFixed(3)}deg) scale(${t.pose.s.toFixed(4)})`
    }

    // ---------- entrance: the files deal in the first time the explorer is seen ----------
    // Each tile (stack or loose file) fades and rises into place, in reading order; a
    // stack's paperclip drops on once its papers have landed. Uses the separate
    // translate / scale properties, so the tiles' own transform (their grid pose) is untouched.
    const ENTER_DELAY = 180 // ms before the first tile
    const ENTER_STAGGER = 65 // ms between tiles
    const ENTER_MS = 760 // each tile's fade + rise
    const ENTER_RISE = 14 // px each tile rises
    const ENTER_SEEN = 0.4 // share of the explorer on screen before it plays
    function entrance() {
        if (reduced.matches) return
        const list = tiles()
        if (!list.length) return
        busy = true
        // on a phone it waits until the explorer is actually on screen (it often loads
        // while still off to the side or below, and would play unseen); larger screens
        // play it right away
        if (!matchMedia("(max-width: 599.98px)").matches) {
            groups.forEach((g) => clipSet(g, 0, `translateY(-24px) ${CLIP_TILT}`))
            return play(list)
        }
        list.forEach((t) => (t.el.style.opacity = "0"))
        groups.forEach((g) => clipSet(g, 0, `translateY(-24px) ${CLIP_TILT}`))
        const seen = new IntersectionObserver(
            (entries) => {
                if (!entries.some((e) => e.isIntersecting)) return
                seen.disconnect()
                if (alive) play(list)
            },
            { threshold: ENTER_SEEN }
        )
        seen.observe(shell)
        cleanups.push(() => seen.disconnect())
    }
    function play(list) {
        list.forEach((t) => t.el.style.removeProperty("opacity"))
        const done = list.map((t, i) => {
            const a = t.el.animate(
                [
                    { opacity: 0, translate: `0 ${ENTER_RISE}px`, scale: "0.96" },
                    { opacity: 1, translate: "0 0", scale: "1" },
                ],
                {
                    duration: ENTER_MS * M(),
                    delay: (ENTER_DELAY + i * ENTER_STAGGER) * M(),
                    easing: "cubic-bezier(.2,.7,.2,1)",
                    fill: "backwards",
                }
            )
            return a.finished
                .catch(() => {})
                .then(() => (t.members ? clipTo(t, true, 460, "cubic-bezier(.25,.65,.3,1)") : null))
        })
        Promise.all(done).then(() => {
            if (!alive) return
            busy = false
            renderBar()
        })
    }

    // ---------- curved travel ----------
    const active = new Set()
    let raf = null
    function travel(tile, to, o) {
        const from = { ...tile.pose }
        const dx = to.x - from.x,
            dy = to.y - from.y,
            len = Math.hypot(dx, dy)
        // a newer move always replaces a pending one, even when the tile is already where it should be
        // (otherwise a delayed older move would still fire later and pull the tile out of place)
        for (const a of active)
            if (a.tile === tile) {
                active.delete(a)
                a.res()
            }
        if (len < 1 && Math.abs(to.r - from.r) < 0.05) {
            tile.pose = { ...to }
            apply(tile)
            return Promise.resolve()
        }
        // reduced-motion: gentler, not absent. Files fade out and back in at their new spot instead of flying
        if (reduced.matches) {
            if (len < 24) {
                tile.pose = { ...to }
                apply(tile)
                return Promise.resolve()
            }
            if (to.s != null && to.s < 0.2)
                return new Promise((res) =>
                    setTimeout(() => {
                        tile.pose = { ...to }
                        apply(tile)
                        res()
                    }, 120)
                ) // heading into the trash: its own fade covers it
            return new Promise((res) => {
                const el = tile.el,
                    out = el.animate([{ opacity: 1 }, { opacity: 0 }], {
                        duration: 110,
                        delay: Math.min(o.delay || 0, 200) * 0.3,
                        easing: "ease-in",
                        fill: "forwards",
                    })
                const land = () => {
                    tile.pose = { ...to }
                    apply(tile)
                    const inn = el.animate([{ opacity: 0 }, { opacity: 1 }], {
                        duration: 180,
                        easing: "ease-out",
                    })
                    out.cancel()
                    inn.finished.then(res, res)
                }
                out.finished.then(land, land)
            })
        }
        // bend: horizontal moves hop over the top, vertical/diagonal moves bow out to the left
        let nx = -dy / len,
            ny = dx / len
        const flip = Math.abs(dx) > Math.abs(dy) ? ny > 0 : nx > 0
        if (flip) {
            nx = -nx
            ny = -ny
        }
        const k = o.k * len
        const c1 = {
            x: from.x + dx * 0.22 + nx * k,
            y: from.y + dy * 0.22 + ny * k,
        }
        const c2 = {
            x: from.x + dx * 0.82 + nx * k * 0.72,
            y: from.y + dy * 0.82 + ny * k * 0.72,
        }
        const tiltSign = nx < 0 ? 1 : -1
        for (const a of active)
            if (a.tile === tile) {
                active.delete(a)
                a.res()
            }
        return new Promise((res) => {
            active.add({
                tile,
                from,
                to,
                c1,
                c2,
                start: performance.now() + (o.delay || 0) * M(),
                dur: o.dur * M(),
                ease: o.ease,
                lift: o.lift,
                tilt: (o.tilt || 0) * tiltSign,
                res,
            })
            if (!raf) raf = requestAnimationFrame(loop)
        })
    }
    function loop(now) {
        for (const a of active) {
            const p = Math.min(1, Math.max(0, (now - a.start) / a.dur))
            if (p <= 0) continue
            const e = a.ease(p),
                arc = Math.sin(Math.PI * e)
            a.tile.pose = {
                x: cub(a.from.x, a.c1.x, a.c2.x, a.to.x, e),
                y: cub(a.from.y, a.c1.y, a.c2.y, a.to.y, e),
                r: a.from.r + (a.to.r - a.from.r) * e + a.tilt * arc,
                s: a.from.s + (a.to.s - a.from.s) * e + a.lift * arc,
            }
            apply(a.tile)
            shadow(a.tile, p < 1 ? arc * (a.lift > 0.02 ? 1 : 0.45) : 0)
            if (p >= 1) {
                a.tile.pose = { ...a.to }
                apply(a.tile)
                active.delete(a)
                a.res()
            }
        }
        raf = active.size ? requestAnimationFrame(loop) : null
    }
    function shadow(tile, a) {
        const els = tile.members
            ? tile.open
                ? []
                : tile.members.map((m) => m.sheet)
            : [tile.sheet]
        const v =
            a > 0.001
                ? `0 ${(2 + 16 * a).toFixed(1)}px ${(4 + 32 * a).toFixed(1)}px rgba(0,0,0,${(0.04 + 0.11 * a).toFixed(3)})`
                : ""
        els.forEach((s) => (s.style.boxShadow = v))
    }

    // ---------- selection ----------
    // loose files, files lent out of their stack to a type tab, and the files of an open
    // stack can be selected (acting on one takes it out of its stack, see leaveGroup)
    const loose = (p) => !p.group || p.borrowed || p.group.open
    function toggle(p, e) {
        if (busy) return
        if (!editGroup && groups.some((g) => g.open && !g.members.includes(p))) return // that click closes the open group instead
        if (!selecting && !editGroup && loose(p)) {
            selecting = true
        }
        const ok = loose(p) ? selecting : editGroup && p.group === editGroup
        if (!ok) return
        p.sel = !p.sel
        p.el.classList.toggle("sel", p.sel)
        p.el.setAttribute("aria-checked", p.sel)
        if (selecting && !editGroup && !selected().length) selecting = false // the last file was deselected: selection mode ends by itself
        renderBar()
    }
    function clearSel() {
        papers.forEach((p) => {
            if (p.sel) {
                p.sel = false
                p.el.classList.remove("sel")
                p.el.setAttribute("aria-checked", "false")
            }
        })
    }
    const selected = () => papers.filter((p) => p.sel && loose(p))

    const ICON_UNGROUP =
        '<svg class="ico" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.5 10H7.5C6.56936 10 6.10404 10 5.72746 9.87764C4.96636 9.63035 4.36965 9.03364 4.12236 8.27254C4 7.89596 4 7.43064 4 6.5C4 5.56936 4 5.10404 4.12236 4.72746C4.36965 3.96636 4.96636 3.36965 5.72746 3.12236C6.10404 3 6.56936 3 7.5 3H10.5C11.4306 3 11.896 3 12.2725 3.12236C13.0336 3.36965 13.6303 3.96636 13.8776 4.72746C14 5.10404 14 5.56936 14 6.5C14 7.43064 14 7.89596 13.8776 8.27254C13.6303 9.03364 13.0336 9.63035 12.2725 9.87764C11.896 10 11.4306 10 10.5 10Z"/><path d="M16.5 21H13.5C12.5694 21 12.104 21 11.7275 20.8776C10.9664 20.6303 10.3697 20.0336 10.1224 19.2725C10 18.896 10 18.4306 10 17.5C10 16.5694 10 16.104 10.1224 15.7275C10.3697 14.9664 10.9664 14.3697 11.7275 14.1224C12.104 14 12.5694 14 13.5 14H16.5C17.4306 14 17.896 14 18.2725 14.1224C19.0336 14.3697 19.6303 14.9664 19.8776 15.7275C20 16.104 20 16.5694 20 17.5C20 18.4306 20 18.896 19.8776 19.2725C19.6303 20.0336 19.0336 20.6303 18.2725 20.8776C17.896 21 17.4306 21 16.5 21Z"/></svg>'
    const ICON_EDIT =
        '<svg class="ico" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.78181 16.3092L3 21L7.69086 20.2182C8.50544 20.0825 9.25725 19.6956 9.84119 19.1116L20.4198 8.53288C21.1934 7.75922 21.1934 6.5049 20.4197 5.73126L18.2687 3.58024C17.495 2.80658 16.2406 2.80659 15.4669 3.58027L4.88841 14.159C4.30447 14.7429 3.91757 15.4947 3.78181 16.3092Z"/><path d="M14 6L18 10"/></svg>'

    // clear any highlight that no longer matches the current state
    function sweep() {
        if (busy || (drag && drag.started)) return
        root.querySelectorAll(".dropglow").forEach((el) =>
            el.classList.remove("dropglow")
        )
        groups.forEach((g) => {
            if (g.peek) setDropTarget(g, false)
        })
        papers.forEach((p) => {
            const valid = selecting
                ? loose(p)
                : !!editGroup && p.group === editGroup
            if (p.sel && !valid) {
                p.sel = false
                p.el.classList.remove("sel")
                p.el.setAttribute("aria-checked", "false")
            }
            if (!p.sel && p.el.classList.contains("sel"))
                p.el.classList.remove("sel")
        })
    }
    const resetBtn = document.createElement("button")
    resetBtn.type = "button"
    resetBtn.className = "btn ghost"
    resetBtn.textContent = "Reset"
    resetBtn.addEventListener("click", (e) => {
        e.stopPropagation()
        if (!busy) reset()
    })
    let resetShown = false
    // fade the tab row's cut edge(s) while more tabs hide past it
    function syncTabFade() {
        if (!navEl) return
        const over = navEl.scrollWidth > navEl.clientWidth + 1
        navEl.classList.toggle("can-scroll", over)
        navEl.classList.toggle(
            "ovf",
            over && navEl.scrollLeft + navEl.clientWidth < navEl.scrollWidth - 1
        )
        navEl.classList.toggle("ovl", over && navEl.scrollLeft > 1)
    }
    // the trash glides to its new spot whenever the bar around it changes (selection buttons coming or going)
    const TRASH_GLIDE_MS = 550 // how long the glide takes
    const TRASH_GLIDE_EASE = "cubic-bezier(.4,0,.2,1)" // gentle start, gentle settle
    const trashX = () =>
        trashWrap.parentNode === bar ? trashWrap.getBoundingClientRect().left : null
    function glideTrash(x0) {
        if (x0 == null || trashWrap.parentNode !== bar) return false
        // continue from wherever it is right now, even mid-glide
        trashWrap.getAnimations().forEach((a) => {
            if (a.id === "trash-glide") a.cancel()
        })
        const dx = (x0 - trashWrap.getBoundingClientRect().left) / Z()
        if (Math.abs(dx) < 0.5) return false
        trashWrap.animate([{ transform: `translateX(${dx}px)` }, { transform: "none" }], {
            id: "trash-glide",
            duration: TRASH_GLIDE_MS * M(),
            easing: TRASH_GLIDE_EASE,
        })
        return true
    }
    function renderBar() {
        const trashX0 = trashX()
        let fadeToolsIn = null // a new button set fades in once the trash is (almost) out of its way
        sweep()
        const n = selected().length
        const og = groups.find((g) => g.open)
        const old = bar.querySelector(".tools")
        const oldKind = old && old.dataset.kind
        stage.classList.toggle("selecting", selecting)
        // an open group stands out: everything else darkens slightly
        ;[...groups, ...papers.filter((p) => !p.group)].forEach((t) =>
            t.el.classList.toggle("dim", !!og && t !== og)
        )
        stage.classList.toggle("editing", !!editGroup)
        papers.forEach((p) =>
            p.el.classList.toggle(
                "member",
                !!editGroup && p.group === editGroup
            )
        )
        tiles().forEach((t, i) => {
            if (t.members) return
            const on = editGroup ? t.group === editGroup : loose(t) // keyboard-patterns: every loose file is reachable
            t.el.style.setProperty("--i", i)
            t.el.tabIndex = on ? 0 : -1
            if (on) t.el.setAttribute("role", "checkbox")
            else t.el.removeAttribute("role")
        })
        // breadcrumb and tabs are built once and stay in the bar, so their animations are never cut off by a re-render
        ;[...bar.children].forEach((c) => {
            if (c !== crumbEl && c !== navEl) c.remove()
        })
        const pb = document.createElement("div")
        pb.className = "pblur"
        pb.setAttribute("aria-hidden", "true")
        pb.innerHTML =
            '<i style="--b:calc(var(--pb-max,16px) * 0.00781);--m0:0.00%;--m1:6.88%;--m2:13.75%;--m3:20.62%"></i><i style="--b:calc(var(--pb-max,16px) * 0.01562);--m0:6.88%;--m1:13.75%;--m2:20.62%;--m3:27.50%"></i><i style="--b:calc(var(--pb-max,16px) * 0.03125);--m0:13.75%;--m1:20.62%;--m2:27.50%;--m3:34.38%"></i><i style="--b:calc(var(--pb-max,16px) * 0.06250);--m0:20.62%;--m1:27.50%;--m2:34.38%;--m3:41.25%"></i><i style="--b:calc(var(--pb-max,16px) * 0.12500);--m0:27.50%;--m1:34.38%;--m2:41.25%;--m3:48.12%"></i><i style="--b:calc(var(--pb-max,16px) * 0.25000);--m0:34.38%;--m1:41.25%;--m2:48.12%;--m3:55.00%"></i><i style="--b:calc(var(--pb-max,16px) * 0.50000);--m0:41.25%;--m1:48.12%;--m2:55.00%;--m3:100.00%"></i><i style="--b:calc(var(--pb-max,16px) * 1.00000);--m0:48.12%;--m1:55.00%;--m2:100.00%;--m3:100.00%"></i>'
        bar.prepend(pb)
        if (!navEl) {
            crumbEl = document.createElement("div")
            crumbEl.className = "crumb"
            crumbEl.setAttribute("aria-label", "Location: " + LOC)
            crumbEl.innerHTML =
                '<button type="button" class="crumb-pill" aria-haspopup="menu" aria-label="Location: ' +
                esc(LOC) +
                '"><span>' +
                esc(LOC) +
                '</span><span class="crumb-count"></span><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 6.5l4 4 4-4"/></svg></button><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3.5l4.5 4.5L6 12.5"/></svg>'
            crumbEl
                .querySelector(".crumb-pill")
                .addEventListener("click", (e) => e.stopPropagation())
            navEl = document.createElement("div")
            navEl.className = "tabs"
            navEl.setAttribute("role", "tablist")
            navEl.setAttribute("aria-label", "Filter files")
            ;[TABS[0], ["groups", "Stacks"], ...TABS.slice(1)].forEach(
                ([k, label]) => {
                    const t = document.createElement("button")
                    t.type = "button"
                    t.className = "tab"
                    t.setAttribute("role", "tab")
                    t.dataset.k = k
                    t.textContent = label
                    t.addEventListener("click", (e) => {
                        e.stopPropagation()
                        applyFilter(k)
                    })
                    if (k === "groups") t.style.display = "none"
                    navEl.appendChild(t)
                }
            )
            bar.append(crumbEl, navEl)
            navEl.addEventListener("scroll", syncTabFade, { passive: true })
            // the tabs get squeezed while action buttons are in the bar (e.g. Cancel / Delete / Stack) and get
            // their room back once those have faded out: re-check the edge fade whenever their width changes
            if (typeof ResizeObserver === "function") {
                const tabsRO = new ResizeObserver(() => syncTabFade())
                tabsRO.observe(navEl)
                cleanups.push(() => tabsRO.disconnect())
            }
            // tabs that don't fit scroll sideways: trackpad/touch natively, a mouse wheel or a click-drag too
            navEl.addEventListener(
                "wheel",
                (e) => {
                    const max = navEl.scrollWidth - navEl.clientWidth
                    if (max <= 1 || e.ctrlKey) return
                    const d =
                        Math.abs(e.deltaX) > Math.abs(e.deltaY)
                            ? e.deltaX
                            : e.deltaY
                    if (!d) return
                    if (
                        (d < 0 && navEl.scrollLeft <= 0) ||
                        (d > 0 && navEl.scrollLeft >= max - 1)
                    )
                        return // at the end: let the page scroll on
                    e.preventDefault()
                    e.stopPropagation()
                    navEl.scrollLeft += d * (e.deltaMode === 1 ? 16 : 1)
                },
                { passive: false }
            )
            let tdrag = null,
                tdragged = false
            navEl.addEventListener("pointerdown", (e) => {
                if (
                    e.pointerType !== "mouse" ||
                    e.button !== 0 ||
                    navEl.scrollWidth <= navEl.clientWidth + 1
                )
                    return
                tdrag = { x: e.clientX, sl: navEl.scrollLeft, id: e.pointerId }
                tdragged = false
            })
            on(window, "pointermove", (e) => {
                if (!tdrag || e.pointerId !== tdrag.id) return
                const dx = (e.clientX - tdrag.x) / Z()
                if (!tdragged && Math.abs(dx) < 4) return
                tdragged = true
                navEl.classList.add("grabbing")
                navEl.scrollLeft = tdrag.sl - dx
            })
            on(window, "pointerup", () => {
                if (!tdrag) return
                tdrag = null
                navEl.classList.remove("grabbing")
                if (tdragged) setTimeout(() => (tdragged = false), 0)
            })
            navEl.addEventListener(
                "click",
                (e) => {
                    if (tdragged) {
                        e.stopPropagation()
                        e.preventDefault()
                        tdragged = false
                    }
                },
                true
            ) // a drag isn't a tab click
        }
        crumbEl.querySelector(".crumb-count").textContent = papers.length // every file on the desktop, grouped or not (trash excluded)
        crumbEl
            .querySelector(".crumb-pill")
            .setAttribute(
                "aria-label",
                `Location: ${LOC}, ${papers.length} files`
            )
        navEl.querySelectorAll(".tab").forEach((t) => {
            t.setAttribute("aria-selected", filter === t.dataset.k)
            t.disabled = busy && filter !== t.dataset.k
        })
        // a "Groups" tab appears next to All files once the first stack is clipped, and leaves with the last one
        const hasGroups = groups.some((g) => !g.forming),
            gt = navEl.querySelector('[data-k="groups"]')
        if (hasGroups && groupsTab !== "shown") {
            groupsTab = "shown"
            tabIn(gt, navEl)
        } else if (!hasGroups && groupsTab === "shown") {
            groupsTab = "leaving"
            tabOut(gt, navEl)
        }
        if (!hasGroups && filter === "groups" && !busy)
            setTimeout(() => applyFilter("all"), 0)
        requestAnimationFrame(syncTabFade)
        // tabs on the left, every action on the right
        const sp = document.createElement("span")
        sp.className = "spacer"
        bar.appendChild(sp)
        if (trashVisible()) bar.appendChild(trashWrap) // trash is the leftmost action
        const b = (label, cls, fn, dis, parent) => {
            const x = document.createElement("button")
            x.type = "button"
            x.className = "btn " + (cls || "")
            x.innerHTML = label
            x.disabled = !!dis
            x.addEventListener("click", (e) => {
                e.stopPropagation()
                fn(e)
            })
            ;(parent || bar).appendChild(x)
            return x
        }
        const hint = (t, parent) => {
            const h = document.createElement("span")
            h.className = "hint"
            h.textContent = t
            ;(parent || bar).appendChild(h)
        }
        const tools = (kind) => {
            const t = document.createElement("span")
            t.className = "tools"
            t.dataset.kind = kind
            bar.appendChild(t)
            if (oldKind !== kind)
                fadeToolsIn = () =>
                    kind === "group"
                        ? blurFade(t, "in", "x", 10, 280, false)
                        : gaussFade(t, "in", 340)
            return t
        }

        if (editGroup) {
            const m = editGroup.members.filter((p) => p.sel).length
            const t = tools("edit")
            b("Done", "", () => endEdit(), busy, t)
            b(
                "Remove from stack" + (m ? ` <span class="n">${m}</span>` : ""),
                "danger",
                () => removeFromGroup(editGroup),
                busy || m < 1,
                t
            )
            hint(
                m < 1
                    ? `Select items to remove from ${editGroup.name}`
                    : `${m} of ${editGroup.members.length} selected`,
                t
            )
        } else if (!selecting) {
            if (og) {
                const t = tools("group")
                const u = b(
                    ICON_UNGROUP + "Unstack",
                    "",
                    () => ungroup(og),
                    false,
                    t
                ) // never shown disabled: they blur in already active (clicks wait for the animation via busy)
                u.title = "Unstack " + og.name
                const e = b(
                    ICON_EDIT + "Edit",
                    "",
                    () => startEdit(og),
                    false,
                    t
                )
                e.title = "Remove items from " + og.name
            }
        } else {
            const t = tools("select") // one set, so it fades in and out as a whole
            b(
                "Cancel",
                "",
                () => {
                    selecting = false
                    clearSel()
                    renderBar()
                },
                busy,
                t
            )
            b(
                "Delete" + (n ? ` <span class="n">${n}</span>` : ""),
                "",
                deleteSelected,
                busy || n < 1,
                t
            ).title = "Move the selected files to the trash (Delete key)"
            b(
                "Stack" + (n ? ` <span class="n">${n}</span>` : ""),
                "primary",
                group,
                busy || n < 2,
                t
            )
        }
        // Reset only shows once the files differ from how they started
        const SHOW_RESET = false // hidden for now: flip to true to bring the Reset button back
        const dirty =
            SHOW_RESET &&
            (groups.length > 0 ||
                trashed.length > 0 ||
                papers.length !== FILES.length)
        resetBtn.disabled = busy
        if (dirty) {
            bar.appendChild(resetBtn)
            if (!resetShown) {
                resetShown = true
                resetBtn.style.pointerEvents = ""
                blurFade(resetBtn, "in", "x", -10, 280, false)
            }
        } else if (resetShown) {
            resetShown = false
            bar.appendChild(resetBtn)
            resetBtn.style.pointerEvents = "none"
            blurFade(resetBtn, "out", "x", -10, 220, false)
                .finished.then(() => {
                    if (!resetShown) resetBtn.remove()
                })
                .catch(() => {})
        }
        // tool set that went away fades out in place
        const now = bar.querySelector(".tools")
        if (old && (!now || now.dataset.kind !== oldKind)) {
            old.style.pointerEvents = "none"
            old.style.position = "absolute"
            old.style.visibility = ""
            if (!now) {
                // keep the old buttons where they were (to the right of the trash) while they fade out
                const trashShown = trashWrap.parentNode === bar
                bar.insertBefore(old, trashShown ? trashWrap.nextSibling : sp.nextSibling)
                old.style.position = ""
            } else {
                old.remove()
            }
            if (!now) {
                // once they're gone, the trash glides into the space they leave instead of jumping
                const removeAndGlide = () => {
                    const x0 = trashX()
                    old.remove()
                    glideTrash(x0)
                }
                ;(oldKind === "group"
                    ? blurFade(old, "out", "x", 10, 220, false)
                    : gaussFade(old, "out", 260)
                ).finished
                    .then(removeAndGlide)
                    .catch(removeAndGlide)
            }
        }
        const glided = glideTrash(trashX0)
        if (fadeToolsIn) {
            const t = bar.querySelector(".tools")
            if (glided && t) {
                // entering mirrors leaving: the trash moves aside first, the buttons fade in as it arrives
                t.style.opacity = "0"
                t.style.pointerEvents = "none"
                const run = fadeToolsIn
                setTimeout(() => {
                    if (!t.isConnected) return
                    t.style.opacity = ""
                    t.style.pointerEvents = ""
                    run()
                }, TRASH_GLIDE_MS * 0.6 * M())
            } else fadeToolsIn()
        }
    }

    // ---------- edit a group: take single items out ----------
    function startEdit(g) {
        if (busy || !g.open) return
        editGroup = g
        renderBar()
    }
    function endEdit() {
        if (!editGroup) return
        editGroup.members.forEach((p) => {
            p.sel = false
            p.el.classList.remove("sel")
            p.el.setAttribute("aria-checked", "false")
        })
        editGroup = null
        renderBar()
    }
    async function removeFromGroup(g) {
        const out = g.members.filter((p) => p.sel)
        if (!out.length || busy) return
        busy = true
        let leaving = out
        const dissolve = g.members.length - out.length < 2
        if (dissolve) leaving = g.members.slice()
        g.members = g.members.filter((p) => !leaving.includes(p))
        leaving.forEach((p) => {
            p.group = null
            p.sel = false
            p.el.classList.remove("sel", "member", "ingroup")
            p.el.setAttribute("aria-checked", "false")
            p.el.style.zIndex = ""
            p.el.style.setProperty("--k", 0)
            setPrefix(p, "")
        })
        g.members.forEach((p) => {
            p.sel = false
            p.el.classList.remove("sel")
        })
        if (dissolve) {
            groups = groups.filter((x) => x !== g)
            setTimeout(() => g.el.remove(), 250)
        } else {
            const c = g.label.querySelector(".count")
            if (c) c.textContent = g.members.length
            showName(g)
            g.label.style.opacity = 0
            if (g.open) markFirst(g)
        }
        editGroup = null
        renderBar()
        const moves = []
        let i = 0
        targets().forEach((to, tile) => {
            const o = REFLOW(tile, i++)
            moves.push(
                travel(
                    tile,
                    to,
                    leaving.includes(tile)
                        ? {
                              ...o,
                              k: 0.34,
                              dur: 780,
                              ease: flyEase,
                              lift: 0.03,
                              tilt: 4,
                          }
                        : o
                )
            )
        })
        await Promise.all(moves)
        busy = false
        renderBar()
    }

    // ---------- group ----------
    function makeGroup() {
        const g = {
            created: ++clock,
            seq: 0,
            name: "",
            members: [],
            pose: { x: 0, y: 0, r: 0, s: 1 },
            open: false,
            editing: false,
        }
        g.el = document.createElement("div")
        g.el.className = "tile group"
        g.el.style.zIndex = 1
        g.el.tabIndex = 0
        g.el.setAttribute("role", "button")
        g.el.setAttribute("aria-expanded", "false")
        g.label = document.createElement("div")
        g.label.className = "glabel"
        g.label.style.opacity = 0
        g.clip = document.createElement("div")
        g.clip.className = "clip front"
        g.clip.innerHTML = CLIP_FRONT
        g.clipBack = document.createElement("div")
        g.clipBack.className = "clip back"
        g.clipBack.innerHTML = CLIP_BACK
        g.el.append(g.clipBack, g.label, g.clip) // back wire sits under every paper in the stack
        g.el.addEventListener("keydown", (e) => {
            if ((e.key === "Enter" || e.key === " ") && e.target === g.el) {
                e.preventDefault()
                if (selecting && selected().length) addSelectedTo(g)
                else g.open ? collapse(g) : open(g)
            }
        })
        // while files are selected, hovering a stack previews that clicking it adds them (the same cue as dragging onto it)
        g.el.addEventListener("pointerenter", () => {
            if (selecting && !busy && !drag && selected().length && !g.open)
                setDropTarget(g, true)
        })
        g.el.addEventListener("pointerleave", () => {
            if (g.peek && !(drag && drag.started)) setDropTarget(g, false)
        })
        g.el.title = ""
        stage.appendChild(g.el)
        groups.push(g)
        return g
    }
    function placeClip(g) {
        const cw = L.w * 0.1
        // on the top edge, right of the title bar (Frame 9)
        ;[g.clip, g.clipBack].forEach((c) => {
            c.style.width = (cw * 32) / 24 + "px"
            c.style.left = L.w * 0.64 - (cw * 4) / 24 + "px"
            c.style.top = ((-cw * 80) / 24) * CLIP_EDGE + "px"
        })
        setSpread(g, g.spread || 0)
    }
    const stackLocal = (g, p, tight) =>
        stackPose(g.members.length - 1 - g.members.indexOf(p), tight)

    // papers fly into the group's spot along curves, bottom of the stack first
    function flyIn(g, target, quick) {
        return g.members.map((p, i) => {
            const sp = stackLocal(g, p, false)
            p.el.style.zIndex = 50 + i
            return travel(
                p,
                { x: target.x + sp.x, y: target.y + sp.y, r: sp.r, s: 1 },
                quick
                    ? {
                          k: 0.22,
                          dur: 600,
                          ease: moveEase,
                          lift: 0.02,
                          tilt: -4,
                          delay: i * 40,
                      }
                    : {
                          k: 0.38,
                          dur: 840,
                          ease: flyEase,
                          lift: 0.035,
                          tilt: -6,
                          delay: i * 95,
                      }
            )
        })
    }
    // hand landed papers to the group element, drop the clip, clamp
    async function clampIn(g, seq) {
        const live = () => seq == null || seq === g.seq // an open() that starts meanwhile takes over
        syncTops()
        g.members.forEach((p) => {
            const sp = stackLocal(g, p, false)
            p.el.style.zIndex = ""
            p.el.tabIndex = -1
            g.el.insertBefore(p.el, g.label)
            p.pose = { ...sp }
            apply(p)
        })
        g.el.style.zIndex = 1
        await wait(40)
        if (!live()) return
        // clip fades in a little above the edge and settles onto it (no long creeping tail): the back wire disappears behind the stack as it goes
        if (
            !(await clipTo(g, true, 380, "cubic-bezier(.25,.65,.3,1)")) ||
            !live()
        )
            return
        // clamp: a soft press as the wire grips the papers (added on top of the resting pose, so it can't jump), and the clip opens up 3px
        animSpread(g, CLAMP_SPREAD_PX, 380)
        clipAnim(
            g,
            [
                { transform: "translateY(0) scale(1,1)" },
                { transform: "translateY(1px) scale(1.015,.97)", offset: 0.4 },
                { transform: "translateY(0) scale(1,1)" },
            ],
            {
                duration: 340 * M(),
                easing: "cubic-bezier(.35,0,.25,1)",
                composite: "add",
            }
        )
        g.members.forEach((p) => {
            p.sel = false
            p.el.classList.remove("sel")
            p.el.setAttribute("aria-checked", "false")
            p.el.style.setProperty(
                "--k",
                g.members.length - 1 - g.members.indexOf(p)
            )
        }) // lower papers slightly darker
        if (!live()) return
        await Promise.all(
            g.members.map((p) =>
                travel(p, stackLocal(g, p, true), {
                    k: 0,
                    dur: 280,
                    ease: moveEase,
                    lift: 0,
                    tilt: 0,
                })
            )
        )
    }
    // clip in or out, starting from wherever it is right now (so a reversal mid-way doesn't jump)
    function clipTo(g, show, dur, ease) {
        const cs = getComputedStyle(g.clip),
            op = +cs.opacity,
            tf =
                cs.transform === "none"
                    ? `translateY(0) ${CLIP_TILT}`
                    : cs.transform
        if (g.peek) {
            g.peek = null
        }
        ;[g.clip, g.clipBack].forEach((c) =>
            c.getAnimations().forEach((a) => a.cancel())
        )
        const on = `translateY(0) ${CLIP_TILT}`,
            off = `translateY(-40px) ${CLIP_TILT}`,
            endT = show ? on : off,
            endO = show ? 1 : 0
        let frames
        if (show && op < 0.05)
            frames = [
                { opacity: 0, transform: `translateY(-24px) ${CLIP_TILT}` },
                { opacity: 1, offset: 0.35 },
                { opacity: 1, transform: on },
            ]
        else if (!show && op > 0.95)
            frames = [
                { opacity: 1, transform: on },
                { opacity: 1, offset: 0.5 },
                { opacity: 0, transform: off },
            ]
        else
            frames = [
                { opacity: op, transform: tf },
                { opacity: endO, transform: endT },
            ]
        const anims = clipAnim(g, frames, {
            duration: dur * M(),
            easing: ease,
            fill: "forwards",
        })
        return Promise.all(anims.map((a) => a.finished))
            .then(() => {
                clipSet(g, endO, endT)
                anims.forEach((a) => a.cancel())
                return true
            })
            .catch(() => false)
    }

    // phones only open the keyboard from inside a tap. So at the tap/drop that creates a stack, a hidden field takes focus
    // (keyboard comes up), and once the stack has formed the focus moves on to the real name field.
    let kbEl = null,
        kbWant = false
    // Off: on phones a new stack should NOT pop the keyboard up by itself — it
    // just shows its name, and tapping the name opens the keyboard to rename.
    // Set to true to bring the automatic keyboard back.
    // (Keep this if Files.tsx is ever regenerated or replaced.)
    const OPEN_KEYBOARD_ON_NEW_STACK = false
    function kbHold() {
        if (!OPEN_KEYBOARD_ON_NEW_STACK) return
        if (lastPointer !== "touch") return
        kbWant = true
        if (!kbEl) {
            kbEl = document.createElement("input")
            kbEl.type = "text"
            kbEl.setAttribute("aria-hidden", "true")
            kbEl.tabIndex = -1
            kbEl.autocapitalize = "sentences"
            kbEl.style.cssText =
                "position:absolute;left:0;top:0;width:1px;height:1px;padding:0;border:0;opacity:0;font-size:16px;pointer-events:none"
            app.appendChild(kbEl)
        }
        const y = Math.max(0, shell.scrollTop)
        kbEl.style.top = y + "px"
        try {
            kbEl.focus({ preventScroll: true })
        } catch (_) {
            try {
                kbEl.focus()
            } catch (__) {}
        }
    }
    const kbHeld = () => !!kbEl && document.activeElement === kbEl
    function kbRelease() {
        kbWant = false
        if (kbEl) {
            const el = kbEl
            kbEl = null
            setTimeout(() => el.remove(), 0)
        }
    }
    on(
        document,
        "touchend",
        () => {
            if (kbWant && !kbHeld()) kbHold()
        },
        true
    ) // iOS: the touchend itself is the surest moment
    async function group() {
        const sel = selected()
        if (sel.length < 2 || busy) return
        kbHold()
        busy = true
        selecting = false
        renderBar()
        await formGroup(sel)
        busy = false
        renderBar()
    }
    // shared by Select → Group and by dropping one file onto another
    // lowest free "Group N": numbering starts over once earlier groups are gone (a group in the trash keeps its number, it can come back)
    function nextGroupName() {
        const used = new Set([
            ...groups.map((g) => g.name),
            ...trashed.filter((e) => e.tile.members).map((e) => e.tile.name),
        ])
        let n = 1
        while (used.has("Stack " + n)) n++
        return "Stack " + n
    }
    async function formGroup(list) {
        if (shell.scrollTop > 0)
            shell.scrollTo({
                top: 0,
                behavior: reduced.matches ? "auto" : "smooth",
            })
        busy = true
        list.forEach((p) => {
            if (p.group) leaveGroup(p)
            p.sel = false
            p.el.classList.remove("sel", "dragging", "dropglow")
            p.el.setAttribute("aria-checked", "false")
        })
        // stacks only show under All files and Stacks: on a type tab, go to All files first
        // (forming the stack there used to crash, as the new stack had no place in the grid)
        if (isType(filter)) {
            selecting = false
            busy = false
            await applyFilter("all")
            busy = true
        }
        const g = makeGroup()
        g.name = nextGroupName()
        g.forming = true
        g.members = list.slice().sort((a, b) => b.added - a.added) // bottom → top: earliest added on top
        g.members.forEach((p) => {
            p.group = g
            p.el.classList.add("ingroup")
        })
        const m = targets()
        g.pose = { ...m.get(g) }
        apply(g)
        placeClip(g)
        const flights = flyIn(g, g.pose)
        const others = []
        let i = 0
        m.forEach((to, tile) => {
            if (tile === g || g.members.includes(tile)) return
            others.push(travel(tile, to, REFLOW(tile, i++)))
        })
        await Promise.all(flights)
        await Promise.all([clampIn(g), ...others])
        g.forming = false
        renderBar()
        // on touch the keyboard can't be summoned without a tap, so the new stack just keeps its name (tap the name to rename)
        // touch: the keyboard was opened at the moment of the tap/drop (kbHold); hand its focus to the name field. No keyboard held → just show the name
        if (lastPointer === "touch") {
            if (kbHeld()) {
                editName(g, false)
                kbRelease()
            } else {
                kbRelease()
                showName(g)
            }
        } else editName(g, true)
        fadeLabel(g)
    }

    // click a stack: clip lifts off, papers spread back out into the grid
    // open and collapse can interrupt each other at any moment: every call bumps g.seq, an older call
    // notices at its next step and stops, and the papers simply travel on from wherever they are
    let busyBy = null
    async function open(g) {
        if (g.open || selecting || g.editing) return
        if (busy && busyBy !== g) return
        const reversing = busyBy === g,
            seq = ++g.seq
        busy = true
        busyBy = g
        animSpread(g, 0, 220)
        // the papers leave the group element below and stack above it (z 10+), which hid the
        // front wire the instant the stack was clicked and left only the back loop floating up.
        // So the group (just the clip and the name) stays above the papers until the clip is off.
        g.el.style.zIndex = 11 + g.members.length
        clipTo(g, false, reversing ? 180 : 240, "cubic-bezier(.5,0,.8,.4)").then(() => {
            if (seq === g.seq && g.open) g.el.style.zIndex = 1
        })
        // papers leave the group element keeping their exact on-screen pose (mid-flight papers are already out)
        const topFirst = g.members.slice().reverse()
        g.members.forEach((p, i) => {
            if (p.el.parentNode === g.el) {
                const l = p.pose
                stage.appendChild(p.el)
                p.pose = { x: g.pose.x + l.x, y: g.pose.y + l.y, r: l.r, s: 1 }
                apply(p)
            }
            p.el.style.zIndex = 10 + i
        })
        g.open = true
        g.el.setAttribute("aria-expanded", "true")
        renderBar()
        g.label.getAnimations().forEach((a) => a.cancel())
        if (+getComputedStyle(g.label).opacity > 0)
            blurFade(g.label, "out", "y", 5, reversing ? 140 : 220)
        else g.label.style.opacity = 0
        g.members.forEach((p) => {
            p.el.classList.remove("ingroup")
            p.el.style.setProperty("--k", 0)
        })
        markFirst(g)
        const m = targets()
        const moves = []
        let i = 0
        m.forEach((to, tile) => {
            // reversing: no wind-up delay, the papers turn around at once
            if (g.members.includes(tile))
                moves.push(
                    travel(tile, to, {
                        k: reversing ? 0.18 : 0.3,
                        dur: reversing ? 560 : 760,
                        ease: reversing ? moveEase : flyEase,
                        lift: 0.025,
                        tilt: 4,
                        delay: reversing
                            ? topFirst.indexOf(tile) * 35
                            : 140 + topFirst.indexOf(tile) * 70,
                    })
                )
            else if (tile === g)
                moves.push(
                    travel(g, to, {
                        k: 0.22,
                        dur: 680,
                        ease: moveEase,
                        lift: 0,
                        tilt: 0,
                    })
                )
            else moves.push(travel(tile, to, REFLOW(tile, i++)))
        })
        await Promise.all(moves)
        if (seq !== g.seq) return
        g.members.forEach((p) => (p.el.style.zIndex = 3))
        busy = false
        busyBy = null
        renderBar()
    }

    // click anywhere, including the open files themselves: papers fly back and get clipped again
    async function collapse(g) {
        if (!g.open) return
        if (busy && busyBy !== g) return
        const reversing = busyBy === g,
            seq = ++g.seq
        busy = true
        busyBy = g
        g.open = false
        g.el.setAttribute("aria-expanded", "false")
        if (selecting && !selected().length) selecting = false // its files were the selection
        renderBar()
        g.members.forEach((p) => p.el.classList.add("ingroup"))
        setTimeout(
            () => {
                if (seq === g.seq) fadeLabel(g)
            },
            (reversing ? 300 : 500) * M()
        )
        const m = targets()
        const target = m.get(g)
        const moves = [
            travel(g, target, {
                k: 0.22,
                dur: 680,
                ease: moveEase,
                lift: 0,
                tilt: 0,
            }),
        ]
        let i = 0
        m.forEach((to, tile) => {
            if (tile !== g) moves.push(travel(tile, to, REFLOW(tile, i++)))
        })
        const flights = flyIn(g, target, reversing)
        await Promise.all(flights)
        if (seq !== g.seq) return
        await Promise.all([clampIn(g, seq), ...moves])
        if (seq !== g.seq) return
        busy = false
        busyBy = null
        renderBar()
    }

    // plain fade through a gaussian blur (the selection and edit button sets)
    function gaussFade(el, dir, dur) {
        const fr = [
            { opacity: 0, filter: "blur(6px)" },
            { offset: 0.6, opacity: 0.85, filter: "blur(1.5px)" },
            { opacity: 1, filter: "blur(0px)" },
        ]
        if (dir === "out") {
            fr.reverse()
            fr[1] = { ...fr[1], offset: 0.4 }
        }
        const a = el.animate(fr, {
            duration: dur * M(),
            easing: dir === "in" ? "ease-out" : "ease-in",
            fill: "forwards",
        })
        a.finished
            .then(() => {
                if (dir === "in") a.cancel()
            })
            .catch(() => {})
        return a
    }
    // fade with directional motion blur along the direction of travel
    function blurFade(el, dir, axis, dist, dur, commit = true) {
        const T =
                axis === "x"
                    ? `translateX(${-dist}px)`
                    : `translateY(${dist}px)`,
            f = (n) => `url(#pcg-mb${axis}${n})`
        let fr = [
            { opacity: 0, transform: T, filter: f(4) },
            { offset: 0.3, opacity: 0.45, filter: f(3) },
            { offset: 0.55, opacity: 0.75, filter: f(2) },
            { offset: 0.8, opacity: 0.93, filter: f(1) },
            { opacity: 1, transform: "none", filter: "none" },
        ]
        if (dir === "out")
            fr = fr
                .slice()
                .reverse()
                .map((k) => {
                    const o = { ...k }
                    if (o.offset != null) o.offset = +(1 - o.offset).toFixed(3)
                    return o
                })
        const a = el.animate(fr, {
            duration: dur * M(),
            easing:
                dir === "in"
                    ? "cubic-bezier(.2,.8,.3,1)"
                    : "cubic-bezier(.5,0,.8,.3)",
            fill: "forwards",
        })
        a.finished
            .then(() => {
                if (commit) el.style.opacity = dir === "in" ? 1 : 0
                a.cancel()
            })
            .catch(() => {})
        return a
    }
    // an open group names itself once: only its first file carries the title above
    function markFirst(g) {
        const first = tiles().find((t) => g.members.includes(t))
        g.members.forEach((p) => {
            const want = p === first ? g.name : ""
            if ((p.gpOn || "") !== want) setPrefix(p, want)
        })
    }
    function setPrefix(p, text) {
        const gp = p.gp
        p.gpOn = text
        if (p.gpA) {
            try {
                p.gpA.cancel()
            } catch (e) {}
            p.gpA = null
        }
        gp.style.transition = "none"
        gp.style.maxWidth = "none"
        if (text) {
            gp.textContent = text
            gp.style.opacity = 1
            p.gpA = gaussFade(gp, "in", 340)
        } else {
            if (!gp.textContent) {
                gp.style.opacity = 0
                return
            }
            const a = (p.gpA = gaussFade(gp, "out", 260))
            a.finished
                .then(() => {
                    if (p.gpA !== a) return
                    gp.style.opacity = 0
                    gp.textContent = ""
                    a.cancel()
                    p.gpA = null
                })
                .catch(() => {})
        }
    }
    // dissolve an open group: its papers go back among the loose files, ordered by date added
    async function ungroup(g) {
        if (busy || !g.open) return
        busy = true
        groups = groups.filter((x) => x !== g)
        g.members.forEach((p) => {
            p.group = null
            setPrefix(p, "")
            p.el.classList.remove("ingroup")
            p.el.style.zIndex = ""
        })
        renderBar()
        g.label.style.opacity = 0
        const moves = []
        let i = 0
        targets().forEach((to, tile) =>
            moves.push(
                travel(tile, to, { ...REFLOW(tile, i++), k: 0.28, lift: 0.02 })
            )
        )
        setTimeout(() => g.el.remove(), 250)
        await Promise.all(moves)
        busy = false
        renderBar()
    }

    function fadeLabel(g) {
        blurFade(g.label, "in", "y", 5, 280)
    }
    function editName(g, fresh) {
        g.editing = true
        g.el.classList.add("renaming")
        g.label.innerHTML = ""
        const inp = document.createElement("input")
        inp.className = "gname"
        inp.id = "gname-" + g.created
        if (!g.name) g.name = nextGroupName()
        inp.value = g.name
        inp.maxLength = 40
        inp.spellcheck = false
        inp.setAttribute("aria-label", "Stack name")
        const count = document.createElement("span")
        count.className = "count"
        count.textContent = g.members.length
        g.label.append(inp, count)
        let done = false
        const commit = () => {
            if (done) return
            done = true
            g.name = inp.value.trim() || g.name
            showName(g)
            g.el.classList.remove("renaming")
            setTimeout(() => (g.editing = false), 0)
        }
        inp.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === "Escape") {
                e.preventDefault()
                commit()
            }
        })
        inp.addEventListener("blur", commit)
        inp.addEventListener("input", () => {
            const t = g.members[g.members.length - 1]
            if (t) t.gt.textContent = inp.value.trim() || g.name
        })
        if (fresh)
            setTimeout(() => {
                inp.focus({ preventScroll: true })
                inp.select()
            }, 30)
        else {
            inp.focus({ preventScroll: true })
            inp.select()
        } // straight from the tap, so phones open the keyboard
    }
    function showName(g) {
        g.label.innerHTML = ""
        const t = document.createElement("span")
        t.className = "gtitle"
        t.textContent = g.name
        const count = document.createElement("span")
        count.className = "count"
        count.textContent = g.members.length
        g.label.append(t, count)
        g.el.setAttribute(
            "aria-label",
            g.name + ", stack of " + g.members.length + " files"
        )
        syncTops()
    }
    // the topmost paper of each stack shows the group's name in place of its own title
    function syncTops() {
        papers.forEach((p) => {
            const g = p.group,
                top = !!g && g.members[g.members.length - 1] === p
            p.el.classList.toggle("gtop", top)
            if (top) p.gt.textContent = g.name
        })
    }

    // one listener decides: open a clicked stack, or collapse an open group on any click outside its papers
    on(document, "click", (e) => {
        if (editGroup) return
        if (busy) {
            // mid open/close: a click reverses it. Opening → any click closes; closing → a click on the stack reopens
            const g = busyBy
            if (!g || selecting) return
            if (g.open) collapse(g)
            else if (
                g.el.contains(e.target) ||
                g.members.some((p) => p.el.contains(e.target))
            )
                open(g)
            return
        }
        const og = groups.find((g) => g.open)
        if (og) {
            // a click on one of its files selects it (see toggle)
            if (og.members.some((p) => p.el.contains(e.target))) return
            if (selecting) {
                if (e.target.closest(".bar,.ctl,.tpop")) return // the selection's own buttons
                selecting = false
                clearSel()
                renderBar()
            }
            collapse(og)
            return
        }
        const g = groups.find((g) => g.el.contains(e.target))
        if (g && selecting && !g.editing) {
            if (selected().length) addSelectedTo(g)
            return
        }
        if (selecting && !g && !e.target.closest(".paper,.bar,.ctl,.tpop")) {
            selecting = false
            clearSel()
            renderBar()
            return
        }
        if (g && e.target.closest(".gtitle") && !g.editing) {
            editName(g, false)
            return
        } // clicking the name renames
        if (g && !selecting && !g.editing) open(g)
    })

    on(document, "keydown", (e) => {
        if (
            (e.key === "Delete" || e.key === "Backspace") &&
            selecting &&
            !busy &&
            document.activeElement.tagName !== "INPUT"
        ) {
            e.preventDefault()
            deleteSelected()
            return
        }
    })
    on(document, "keydown", (e) => {
        if (
            e.key !== "Escape" ||
            busy ||
            document.activeElement.tagName === "INPUT"
        )
            return
        if (trashOpen) {
            trashOpen = false
            renderPop()
            return
        }
        if (editGroup) {
            endEdit()
            return
        }
        const og = groups.find((g) => g.open)
        if (og && !selecting) {
            collapse(og)
            return
        }
        if (selecting) {
            selecting = false
            clearSel()
            renderBar()
        }
    })
    let rt
    on(window, "resize", () => {
        clearTimeout(rt)
        rt = setTimeout(() => {
            if (!busy) relayout()
        }, 80)
    })

    // ---------- drag anything; drop on the trash to delete ----------
    const trashWrap = document.createElement("span")
    trashWrap.className = "trashwrap"
    const trashEl = document.createElement("button")
    trashEl.type = "button"
    trashEl.className = "trash"
    trashEl.setAttribute("aria-label", "Trash")
    // the gulp bounce plays once: drop the class when it ends, or it replays every time the bar
    // re-renders (re-inserting the button restarts CSS animations)
    trashEl.addEventListener("animationend", (e) => {
        if (e.target === trashEl && e.animationName === "pcg-gulp")
            trashEl.classList.remove("gulp")
    })
    const popEl = document.createElement("div")
    popEl.className = "tpop"
    popEl.hidden = true
    trashWrap.append(trashEl, popEl)
    let trashed = [],
        trashOpen = false
    trashEl.innerHTML =
        '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><g class="lid"><path d="M3 5.5h14"/><path d="M8 5.5V4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1.5"/></g><path d="M4.8 5.5l.9 10.9a1.6 1.6 0 0 0 1.6 1.5h5.4a1.6 1.6 0 0 0 1.6-1.5l.9-10.9"/><path d="M8.5 9v5.5M11.5 9v5.5"/></svg><span class="count">0</span>'
    let drag = null,
        suppressClick = false,
        lastPointer = "mouse"
    on(
        document,
        "pointerdown",
        (e) => {
            lastPointer = e.pointerType || "mouse"
        },
        true
    )
    // the trash fades in and out in place, like the other buttons (it used to slide in)
    function trashFade(dir) {
        trashWrap.getAnimations().forEach((x) => x.cancel())
        const a = gaussFade(trashWrap, dir, dir === "in" ? 340 : 260)
        if (dir === "out")
            a.finished
                .then(() => {
                    // gone from the bar: drop the faded-out state so it shows normally next time
                    trashWrap.remove()
                    a.cancel()
                })
                .catch(() => {})
        return a
    }
    const trashVisible = () =>
        (drag && drag.started) || trashed.length > 0 || deleting
    function updateTrash(bump) {
        const c = trashEl.querySelector(".count")
        c.textContent = trashed.length
        trashEl.classList.toggle("has", trashed.length > 0)
        trashEl.setAttribute(
            "aria-label",
            trashed.length
                ? `Trash, ${trashed.length} deleted item${trashed.length > 1 ? "s" : ""}`
                : "Trash"
        )
        if (bump)
            c.animate(
                [
                    { transform: "scale(1)" },
                    { transform: "scale(1.3)" },
                    { transform: "scale(1)" },
                ],
                { duration: 320 * M(), easing: "cubic-bezier(.3,1.5,.5,1)" }
            )
    }
    let emptyArmed = false,
        emptyT
    async function emptyTrash() {
        if (busy || !trashed.length) return
        clearTimeout(emptyT)
        emptyArmed = false
        trashed = []
        trashOpen = false // tiles are already out of the view; dropping them here deletes them for good
        renderPop()
        updateTrash(false)
        trashEl.classList.add("gulp")
        setTimeout(() => trashEl.classList.remove("gulp"), 420 * M())
        await wait(260)
        const a = trashFade("out")
        await a.finished.catch(() => {})
        renderBar()
    }
    function renderPop() {
        trashEl.classList.toggle("active", trashOpen)
        trashEl.setAttribute("aria-expanded", trashOpen)
        if (!trashOpen || !trashed.length) {
            if (!popEl.hidden) {
                const a = popEl.animate(
                    [
                        { opacity: 1, transform: "none" },
                        {
                            opacity: 0,
                            transform: "translateY(-4px) scale(.98)",
                        },
                    ],
                    { duration: 140 * M(), easing: "ease-in" }
                )
                a.finished
                    .then(() => {
                        if (!trashOpen || !trashed.length) popEl.hidden = true
                    })
                    .catch(() => {})
            }
            trashOpen = trashOpen && trashed.length > 0
            return
        }
        const wasHidden = popEl.hidden
        popEl.innerHTML = ""
        const head = document.createElement("div")
        head.className = "tpop-head"
        head.innerHTML =
            '<b>Trash</b><span class="count"></span><span class="spacer"></span>'
        head.querySelector(".count").textContent = trashed.length
        const all = document.createElement("button")
        all.type = "button"
        all.className = "btn ghost sm"
        all.textContent = "Restore all"
        all.addEventListener("click", () => restore(trashed.slice()))
        // destructive, so two steps: "Empty" arms it, the red "Empty trash" confirms (disarms itself after 3s)
        const emp = document.createElement("button")
        emp.type = "button"
        emp.className = "btn sm tp-empty" + (emptyArmed ? " armed" : "")
        emp.textContent = emptyArmed ? "Empty trash" : "Empty"
        emp.setAttribute(
            "aria-label",
            emptyArmed
                ? "Confirm: permanently delete everything in the trash"
                : "Empty trash"
        )
        emp.addEventListener("click", () => {
            if (!emptyArmed) {
                emptyArmed = true
                clearTimeout(emptyT)
                emptyT = setTimeout(() => {
                    emptyArmed = false
                    if (trashOpen) renderPop()
                }, 3000)
                renderPop()
                popEl.querySelector(".tp-empty").focus()
                return
            }
            emptyTrash()
        })
        head.append(all, emp)
        const ul = document.createElement("ul")
        trashed
            .slice()
            .reverse()
            .forEach((en) => {
                const li = document.createElement("li")
                const th = document.createElement("span")
                th.className = "thumb" + (en.tile.members ? " grp" : "")
                th.innerHTML = en.tile.members ? "<i></i><i></i>" : "<i></i>"
                const tx = document.createElement("span")
                const nm = document.createElement("span")
                nm.className = "nm"
                nm.textContent = en.tile.members ? en.tile.name : en.tile.name
                const meta = document.createElement("span")
                meta.className = "meta"
                meta.textContent = en.tile.members
                    ? `Stack · ${en.tile.members.length} files`
                    : "File"
                tx.append(nm, meta)
                const rb = document.createElement("button")
                rb.type = "button"
                rb.className = "btn sm"
                rb.textContent = "Restore"
                rb.addEventListener("click", () => restore([en]))
                li.append(th, tx, rb)
                ul.appendChild(li)
            })
        popEl.append(head, ul)
        popEl.hidden = false
        if (wasHidden)
            popEl.animate(
                [
                    { opacity: 0, transform: "translateY(-4px) scale(.98)" },
                    { opacity: 1, transform: "none" },
                ],
                { duration: 180 * M(), easing: "cubic-bezier(.2,.8,.3,1)" }
            )
    }
    // one click on the trash = one toggle. In Framer's Preview a single click on the open trash was seen to
    // close the menu and then reopen it (counted twice), so a toggle that follows another toggle or an
    // outside-close within the same gesture is ignored
    let trashToggledAt = -1e9
    const TRASH_TOGGLE_GAP_MS = 350
    trashEl.addEventListener("click", () => {
        if (busy || !trashed.length) return
        const now = performance.now()
        if (now - trashToggledAt < TRASH_TOGGLE_GAP_MS) return
        trashToggledAt = now
        trashOpen = !trashOpen
        renderPop()
    })
    popEl.addEventListener("click", (e) => e.stopPropagation())
    trashWrap.addEventListener("click", (e) => e.stopPropagation())
    on(
        document,
        "pointerdown",
        (e) => {
            if (!trashOpen) return
            // the event's path, not just its target: still right if the target was swapped out mid-event
            const path = e.composedPath ? e.composedPath() : []
            if (path.includes(trashWrap) || trashWrap.contains(e.target)) return
            trashOpen = false
            trashToggledAt = performance.now()
            renderPop()
        },
        true
    )

    // restore items from the trash: they fly out of the trash back to their place in the overview
    async function restore(entries) {
        if (busy || !entries.length) return
        busy = true
        const r = trashEl.getBoundingClientRect(),
            sr = stage.getBoundingClientRect()
        const from = {
            x: (r.left + r.width / 2 - sr.left) / Z() - L.w / 2,
            y: (r.top + r.height / 2 - sr.top) / Z() - L.h / 2,
            r: -10,
            s: 0.06,
        }
        trashed = trashed.filter((en) => !entries.includes(en))
        const back = entries.map((en) => {
            const t = en.tile
            if (t._fade) {
                t._fade.cancel()
                t._fade = null
            }
            t.el.classList.remove("dragging", "fhide")
            if (t.members) {
                groups.push(t)
                papers.push(...t.members)
                t.label.style.opacity = 1
            } else {
                t.group = null
                t.sel = false
                t.el.classList.remove("sel", "member", "ingroup", "dropglow")
                t.el.setAttribute("aria-checked", "false")
                t.el.style.zIndex = ""
                t.el.style.setProperty("--k", 0)
                t.gp.textContent = ""
                t.gp.style.maxWidth = "0px"
                papers.push(t)
            }
            stage.appendChild(t.el)
            lift([t])
            t.pose = { ...from }
            apply(t)
            t.el.animate([{ opacity: 0 }, { opacity: 1 }], {
                duration: 260 * M(),
                easing: "ease-out",
            })
            return t
        })
        updateTrash(true)
        if (!trashed.length) trashOpen = false
        renderPop()
        renderBar()
        trashEl.classList.add("open")
        setTimeout(() => trashEl.classList.remove("open"), 260 * M())
        const moves = []
        let i = 0,
            j = 0
        targets().forEach((to, tile) => {
            if (back.includes(tile))
                moves.push(
                    travel(tile, to, {
                        k: 0.32,
                        dur: 760,
                        ease: flyEase,
                        lift: 0.035,
                        tilt: 5,
                        delay: j++ * 90,
                    })
                )
            else moves.push(travel(tile, to, REFLOW(tile, i++)))
        })
        await Promise.all(moves)
        back.forEach((t) => shadow(t, 0))
        settle(back)
        busy = false
        if (!trashed.length) {
            const a = trashFade("out")
            await a.finished.catch(() => {})
        }
        renderBar()
    }

    function tileFromTarget(t) {
        if (t.closest(".gtitle,.gname")) return null // the name is for renaming, not dragging
        // while a stack is open, everything outside it is blurred back and can't be picked up
        const og = groups.find((x) => x.open)
        const gel = t.closest(".group")
        if (gel) {
            const g = groups.find((x) => x.el === gel)
            if (g && !g.open && !g.editing && !og) return g
            return null
        }
        const pel = t.closest(".paper")
        if (pel) {
            const p = papers.find((x) => x.el === pel)
            if (p && (og ? p.group === og : !p.group)) return p
        }
        return null
    }
    stage.addEventListener(
        "pointerdown",
        (e) => {
            if (busy || e.button !== 0 || drag) return
            const tile = tileFromTarget(e.target)
            if (!tile) return
            e.stopPropagation() // a file under the finger belongs to this view: don't let a surrounding carousel or drag area start moving too
            drag = {
                tile,
                id: e.pointerId,
                sx: e.clientX,
                sy: e.clientY,
                px: e.clientX,
                py: e.clientY,
                lx: e.clientX,
                vx: 0,
                started: false,
                over: false,
                rot: 0,
                sc: 1,
                touch: e.pointerType === "touch",
            }
            // touch: holding still for a moment picks the file up; moving first is a scroll
            if (drag.touch) {
                const d = drag
                d.hold = setTimeout(() => {
                    if (drag === d && !d.started && !busy) {
                        startDrag()
                        if (navigator.vibrate)
                            try {
                                navigator.vibrate(8)
                            } catch (_) {}
                    }
                }, 380)
            }
        },
        true
    )
    // once a file is picked up by touch, the finger drags it instead of scrolling the page
    // registered on window, capture phase: runs before any carousel or page script sees the move, and stops it there
    const holdMove = (e) => {
        if (drag && drag.started && drag.touch) {
            if (e.cancelable) e.preventDefault()
            e.stopPropagation()
        }
    }
    on(window, "touchmove", holdMove, { passive: false, capture: true })
    on(window, "touchstart", () => {}, { passive: false }) // iOS: an active touch listener must exist when the touch begins for touchmove to stay cancelable
    shell.addEventListener("selectstart", (e) => {
        if (!(e.target.closest && e.target.closest("input"))) e.preventDefault()
    })
    on(document, "selectstart", (e) => {
        if (drag && drag.started) e.preventDefault()
    })
    stage.addEventListener("contextmenu", (e) => {
        if (drag && drag.touch) e.preventDefault()
    })
    on(document, "pointermove", (e) => {
        // once released, the drop is playing out: moving the mouse (e.g. over the trash) must not act on it
        if (!drag || e.pointerId !== drag.id || drag.dropping) return
        if (drag.started) e.stopPropagation()
        drag.px = e.clientX
        drag.py = e.clientY
        drag.vx = drag.vx * 0.6 + (e.clientX - drag.lx) * 0.4
        drag.lx = e.clientX
        if (drag.touch && !drag.started) {
            if (Math.hypot(drag.px - drag.sx, drag.py - drag.sy) > 6) {
                clearTimeout(drag.hold)
                drag = null
            }
            return
        } // a swipe: let it scroll
        if (
            !drag.started &&
            Math.hypot(drag.px - drag.sx, drag.py - drag.sy) > 5
        )
            startDrag()
        if (drag.started) {
            const r = trashEl.getBoundingClientRect(),
                pad = 14
            const over =
                e.clientX > r.left - pad &&
                e.clientX < r.right + pad &&
                e.clientY > r.top - pad &&
                e.clientY < r.bottom + pad
            if (over !== drag.over) {
                drag.over = over
                trashEl.classList.toggle("open", over)
            }
            // papers can be dropped onto a closed group
            let tg = null
            if (!over && !drag.tile.members && !groups.some((g) => g.open)) {
                // no new stacks from inside an open one
                const hit = (el) => {
                    const b = el.getBoundingClientRect()
                    return (
                        e.clientX > b.left &&
                        e.clientX < b.right &&
                        e.clientY > b.top &&
                        e.clientY < b.bottom
                    )
                }
                tg =
                    groups.find(
                        (g) =>
                            !g.open &&
                            g !== drag.tile.group &&
                            matches(g) &&
                            hit(g.el)
                    ) ||
                    papers.find(
                        (q) =>
                            q !== drag.tile &&
                            !(drag.multi || []).includes(q) &&
                            !q.group &&
                            matches(q) &&
                            hit(q.el)
                    ) ||
                    null
            }
            if (tg !== drag.target) {
                if (drag.target) setDropTarget(drag.target, false)
                drag.target = tg
                if (tg) setDropTarget(tg, true)
            }
        }
    })
    // while a file is held, whatever scrolls around the view (a carousel, the page) stays put and nothing gets text-selected
    let locked = null
    function lockPage() {
        if (locked) return
        const list = []
        let el = frame.parentElement
        while (el && el !== document.documentElement) {
            const cs = getComputedStyle(el)
            if (
                /(auto|scroll)/.test(cs.overflowX + cs.overflowY) &&
                (el.scrollWidth > el.clientWidth + 1 ||
                    el.scrollHeight > el.clientHeight + 1)
            )
                list.push({
                    el,
                    x: el.scrollLeft,
                    y: el.scrollTop,
                    ox: el.style.overflowX,
                    oy: el.style.overflowY,
                    ta: el.style.touchAction,
                    st: el.style.scrollSnapType,
                })
            el = el.parentElement
        }
        list.forEach((o) => {
            o.el.style.scrollSnapType = "none"
            o.el.style.overflowX = "hidden"
            o.el.style.overflowY = "hidden"
            o.el.style.touchAction = "none"
            o.el.scrollLeft = o.x
            o.el.scrollTop = o.y
        })
        const pin = (e) => {
            const o = list.find((q) => q.el === e.target)
            if (o && (o.el.scrollLeft !== o.x || o.el.scrollTop !== o.y)) {
                o.el.scrollLeft = o.x
                o.el.scrollTop = o.y
            }
        }
        const de = document.documentElement,
            us = [de.style.webkitUserSelect, de.style.userSelect]
        de.style.webkitUserSelect = "none"
        de.style.userSelect = "none"
        try {
            const sel = window.getSelection()
            if (sel) sel.removeAllRanges()
        } catch (_) {}
        on(document, "scroll", pin, true)
        locked = { list, pin, us }
    }
    function unlockPage() {
        if (!locked) return
        const { list, pin, us } = locked
        locked = null
        document.removeEventListener("scroll", pin, true)
        list.forEach((o) => {
            o.el.style.overflowX = o.ox
            o.el.style.overflowY = o.oy
            o.el.style.touchAction = o.ta
            o.el.scrollLeft = o.x
            o.el.scrollTop = o.y
            o.el.style.scrollSnapType = o.st
        })
        const de = document.documentElement
        de.style.webkitUserSelect = us[0]
        de.style.userSelect = us[1]
    }
    function startDrag() {
        const t = drag.tile
        drag.started = true
        suppressClick = true
        frame.classList.add("dragging")
        lockPage()
        for (const a of active)
            if (a.tile === t) {
                active.delete(a)
                a.res()
            }
        drag.base = { ...t.pose }
        const sr = stage.getBoundingClientRect()
        // grab point relative to the tile's centre, so shrinking over the trash stays under the cursor
        drag.gx = (drag.sx - sr.left) / Z() - (t.pose.x + L.w / 2)
        drag.gy = (drag.sy - sr.top) / Z() - (t.pose.y + L.h / 2)
        t.el.classList.add("dragging")
        // dragging one of several selected files takes the whole selection along
        drag.multi = []
        if (!t.members && t.sel) {
            const pool =
                editGroup && t.group === editGroup
                    ? editGroup.members.filter((p) => p.sel)
                    : selecting
                      ? selected()
                      : []
            drag.multi = pool.filter((p) => p !== t)
        }
        drag.multi.forEach((f) => {
            for (const a of active)
                if (a.tile === f) {
                    active.delete(a)
                    a.res()
                }
            f.el.classList.add("bundled")
        })
        if (drag.multi.length) {
            const b = document.createElement("span")
            b.className = "bundle-count"
            b.textContent = drag.multi.length + 1
            t.el.appendChild(b)
            drag.badge = b
            b.animate(
                [
                    { transform: "scale(.4)", opacity: 0 },
                    { transform: "scale(1)", opacity: 1 },
                ],
                { duration: 260 * M(), easing: "cubic-bezier(.3,1.5,.5,1)" }
            )
        }
        dragLayer.style.left = stage.offsetLeft + "px"
        dragLayer.style.top = stage.offsetTop + "px"
        ;[t, ...drag.multi].forEach((x) => {
            if (x.el.parentNode === stage) dragLayer.appendChild(x.el)
        })
        try {
            stage.setPointerCapture(drag.id)
        } catch (_) {}
        const wasShown = trashed.length > 0
        if (trashOpen) {
            trashOpen = false
            renderPop()
        }
        renderBar()
        if (!wasShown) trashFade("in")
        requestAnimationFrame(dragLoop)
    }
    function dragLoop() {
        if (!drag || !drag.started || drag.dropping) return
        const t = drag.tile
        drag.vx *= 0.88
        const tr = Math.max(-8, Math.min(8, drag.vx * 0.9))
        drag.rot += (tr - drag.rot) * 0.2
        const ts = drag.over ? 0.4 : drag.target ? 0.86 : 1.04
        drag.sc += (ts - drag.sc) * 0.22
        t.pose = {
            x:
                drag.base.x +
                (drag.px - drag.sx) / Z() +
                drag.gx * (1 - drag.sc),
            y:
                drag.base.y +
                (drag.py - drag.sy) / Z() +
                drag.gy * (1 - drag.sc),
            r: drag.base.r + drag.rot,
            s: drag.sc,
        }
        apply(t)
        shadow(t, drag.over ? 0.35 : 0.85)
        drag.multi.forEach((f, k) => {
            const n = k + 1,
                side = k % 2 ? 1 : -1
            const to = {
                x: t.pose.x + n * 4 * t.pose.s,
                y: t.pose.y + n * 3.5 * t.pose.s,
                r: t.pose.r + side * (1.5 + n * 0.8),
                s: t.pose.s * (1 - n * 0.015),
            }
            const ease = 0.16
            f.pose = {
                x: f.pose.x + (to.x - f.pose.x) * ease,
                y: f.pose.y + (to.y - f.pose.y) * ease,
                r: f.pose.r + (to.r - f.pose.r) * ease,
                s: f.pose.s + (to.s - f.pose.s) * ease,
            }
            apply(f)
            shadow(f, 0.5)
        })
        requestAnimationFrame(dragLoop)
    }
    on(document, "pointerup", endPointer)
    on(document, "pointercancel", endPointer)
    // released outside the frame, window lost focus, or capture was taken away: finish the drag anyway
    const abandon = () => {
        if (drag && !drag.dropping) endPointer({ pointerId: drag.id })
    }
    stage.addEventListener("lostpointercapture", (e) => {
        if (drag && e.pointerId === drag.id) abandon()
    })
    on(window, "blur", abandon)
    on(document, "pointerleave", abandon)
    async function endPointer(e) {
        if (!drag || e.pointerId !== drag.id || drag.dropping) return
        const d = drag
        clearTimeout(d.hold)
        if (!d.started) {
            drag = null
            frame.classList.remove("dragging")
            return
        }
        unlockPage()
        try {
            stage.releasePointerCapture(d.id)
        } catch (_) {}
        setTimeout(() => (suppressClick = false), 0)
        d.dropping = true
        const t = d.tile,
            all = [t, ...(d.multi || [])]
        if (d.touch && !d.over && d.target && !d.target.members) kbHold() // this drop makes a new stack: bring the keyboard up now, while it is still the finger's gesture
        if (d.badge) {
            const bd = d.badge
            bd.animate(
                [{ opacity: 1 }, { opacity: 0, transform: "scale(.5)" }],
                { duration: 160 * M(), fill: "forwards" }
            )
                .finished.then(() => bd.remove())
                .catch(() => bd.remove())
        }
        if (d.over) {
            if (all.length > 1) {
                await trashMany(all)
                selecting = false
            } else await trashIt(t)
            await wait(120)
        } else if (d.target) {
            setDropTarget(d.target, false)
            if (d.target.members) await dropManyIntoGroup(all, d.target)
            else await formGroup([...all, d.target])
            if (all.length > 1) {
                selecting = false
                if (editGroup && !groups.includes(editGroup)) editGroup = null
            }
        } else {
            busy = true
            const m = targets()
            await Promise.all(
                all.map((x, i) =>
                    travel(x, m.get(x), {
                        k: 0.2,
                        dur: 560,
                        ease: flyEase,
                        lift: 0.02,
                        tilt: 0,
                        delay: i * 40,
                    })
                )
            )
            all.forEach((x) => shadow(x, 0))
        }
        all.forEach((x) => {
            x.el.classList.remove("dragging", "bundled")
            if (x.el.parentNode === dragLayer) stage.appendChild(x.el)
        })
        frame.classList.remove("dragging")
        drag = null
        if (!trashed.length) {
            const a = trashFade("out")
            await a.finished.catch(() => {})
        } else await wait(260)
        trashEl.classList.remove("open", "gulp")
        busy = false
        renderBar()
    }
    on(
        document,
        "click",
        (e) => {
            if (suppressClick) {
                e.stopPropagation()
                e.preventDefault()
                suppressClick = false
            }
        },
        true
    )

    function setDropTarget(g, on) {
        if (!g.members) {
            g.el.classList.toggle("dropglow", on)
            shadow(g, on ? 0.35 : 0)
            return
        } // a single file: will form a new group
        const top = g.members[g.members.length - 1]
        if (top) top.el.classList.toggle("dropglow", on)
        shadow(g, on ? 0.35 : 0)
        if (on) {
            g.peek = clipAnim(
                g,
                [
                    { transform: `translateY(0) ${CLIP_TILT}` },
                    { transform: `translateY(-6px) ${CLIP_TILT}` },
                ],
                {
                    duration: 200 * M(),
                    easing: "cubic-bezier(.3,1.4,.5,1)",
                    fill: "forwards",
                }
            )
        } else if (g.peek) {
            const back = clipAnim(
                g,
                [
                    { transform: `translateY(-6px) ${CLIP_TILT}` },
                    { transform: `translateY(0) ${CLIP_TILT}` },
                ],
                { duration: 160 * M(), easing: "ease-out" }
            )
            g.peek.forEach((a) => a.cancel())
            g.peek = null
            back.forEach((a) => a.finished.catch(() => {}))
        }
    }
    function leaveGroup(p) {
        const h = p.group
        if (!h) return
        h.members = h.members.filter((x) => x !== p)
        p.group = null
        p.el.classList.remove("member")
        setPrefix(p, "")
        const unlend = (q) => {
            if (!q.borrowed) return
            q.borrowed = false
            q.flyOut = false
            q.el.classList.remove("borrowed")
            q.el.style.zIndex = ""
        }
        unlend(p)
        if (h.members.length < 2) {
            h.members.forEach((q) => {
                // still inside the stack element (which goes away): out onto the stage, same spot on screen
                if (q.el.parentNode === h.el) {
                    const l = q.pose
                    stage.appendChild(q.el)
                    q.pose = { x: h.pose.x + l.x, y: h.pose.y + l.y, r: l.r, s: 1 }
                    apply(q)
                }
                unlend(q)
                q.group = null
                q.sel = false
                q.el.classList.remove("sel", "member", "ingroup")
                q.el.style.zIndex = ""
                q.el.style.setProperty("--k", 0)
                setPrefix(q, "")
            })
            groups = groups.filter((x) => x !== h)
            h.el.remove()
            if (editGroup === h) editGroup = null
        } else {
            showName(h)
            h.label.style.opacity = 0
        }
    }
    // drop a paper into a closed group: clip comes off, paper slides into the stack, clip clamps again
    function dropIntoGroup(p, g) {
        return dropManyIntoGroup([p], g)
    }
    async function dropManyIntoGroup(list, g) {
        busy = true
        list.forEach((p) => {
            leaveGroup(p)
            p.sel = false
            p.el.classList.remove("sel")
            p.el.setAttribute("aria-checked", "false")
            p.group = g
            g.members.push(p)
            p.el.classList.add("ingroup")
        })
        g.members.sort((a, b) => b.added - a.added)
        showName(g)
        // clip lifts off
        animSpread(g, 0, 200)
        const lift = clipAnim(
            g,
            [
                { opacity: 1, transform: `translateY(0) ${CLIP_TILT}` },
                { opacity: 0, transform: `translateY(-40px) ${CLIP_TILT}` },
            ],
            {
                duration: 220 * M(),
                easing: "cubic-bezier(.5,0,.8,.4)",
                fill: "forwards",
            }
        )
        Promise.all(lift.map((a) => a.finished))
            .then(() => {
                clipSet(g, 0, `translateY(-40px) ${CLIP_TILT}`)
                lift.forEach((a) => a.cancel())
            })
            .catch(() => {})
        // the stack loosens to make room
        const loosen = g.members
            .filter((m) => !list.includes(m))
            .map((m) =>
                travel(m, stackLocal(g, m, false), {
                    k: 0,
                    dur: 260,
                    ease: moveEase,
                    lift: 0,
                    tilt: 0,
                })
            )
        const m = targets(),
            target = m.get(g)
        const flights = list.map((p, i) => {
            const sp = stackLocal(g, p, false)
            p.el.style.zIndex = 60 + i
            return travel(
                p,
                { x: target.x + sp.x, y: target.y + sp.y, r: sp.r, s: 1 },
                {
                    k: 0.25,
                    dur: 520,
                    ease: flyEase,
                    lift: 0.02,
                    tilt: 0,
                    delay: i * 50,
                }
            )
        })
        const moves = []
        let i = 0
        m.forEach((to, tile) => {
            if (!list.includes(tile))
                moves.push(travel(tile, to, REFLOW(tile, i++)))
        })
        await Promise.all([...flights, ...loosen])
        list.forEach((p) => {
            shadow(p, 0)
            p.el.classList.remove("dragging", "bundled")
        })
        await Promise.all([clampIn(g), ...moves])
    }

    // single-pointer alternatives to dragging (SC 2.5.7)
    let deleting = false
    async function deleteSelected() {
        const list = selected()
        if (!list.length || busy) return
        deleting = true
        selecting = false
        renderBar()
        await trashMany(list)
        deleting = false
        busy = false
        clearSel()
        renderBar()
    }
    async function addSelectedTo(g) {
        const list = selected()
        if (!list.length || busy) return
        if (g.peek) setDropTarget(g, false)
        selecting = false
        await dropManyIntoGroup(list, g)
        busy = false
        renderBar()
    }
    // lift tiles into the drag layer so the header fade can't hide them on their way to/from the trash
    function lift(list) {
        dragLayer.style.left = stage.offsetLeft + "px"
        dragLayer.style.top = stage.offsetTop + "px"
        list.forEach((x) => {
            if (x.el.parentNode === stage) dragLayer.appendChild(x.el)
        })
    }
    function settle(list) {
        list.forEach((x) => {
            if (x.el.parentNode === dragLayer) stage.appendChild(x.el)
        })
    }
    async function trashMany(list) {
        busy = true
        lift(list)
        const r = trashEl.getBoundingClientRect(),
            sr = stage.getBoundingClientRect()
        const to = {
            x: (r.left + r.width / 2 - sr.left) / Z() - L.w / 2,
            y: (r.top + r.height / 2 - sr.top) / Z() - L.h / 2,
            s: 0.06,
        }
        await Promise.all(
            list.map((t, i) => {
                t._fade = t.el.animate(
                    [
                        { opacity: 1 },
                        { opacity: 1, offset: 0.5 },
                        { opacity: 0 },
                    ],
                    {
                        duration: 340 * M(),
                        delay: i * 45 * M(),
                        easing: "ease-in",
                        fill: "both",
                    }
                )
                return travel(
                    t,
                    { ...to, r: t.pose.r + 12 },
                    {
                        k: 0.12,
                        dur: 340,
                        ease: bez(0.5, 0, 0.9, 0.5),
                        lift: 0,
                        tilt: 0,
                        delay: i * 45,
                    }
                )
            })
        )
        trashEl.classList.remove("open")
        trashEl.classList.add("gulp")
        list.forEach((t) => {
            t.el.remove()
            t.el.classList.remove("dragging", "bundled")
            trashed.push({ tile: t, at: Date.now() })
            papers = papers.filter((p) => p !== t)
            leaveGroup(t)
        })
        updateTrash(true)
        const moves = []
        let i = 0
        targets().forEach((to, tile) =>
            moves.push(travel(tile, to, REFLOW(tile, i++)))
        )
        await Promise.all(moves)
    }
    async function trashIt(t) {
        busy = true
        lift([t])
        const r = trashEl.getBoundingClientRect(),
            sr = stage.getBoundingClientRect()
        const to = {
            x: (r.left + r.width / 2 - sr.left) / Z() - L.w / 2,
            y: (r.top + r.height / 2 - sr.top) / Z() - L.h / 2,
            r: t.pose.r + 12,
            s: 0.06,
        }
        t._fade = t.el.animate(
            [{ opacity: 1 }, { opacity: 1, offset: 0.5 }, { opacity: 0 }],
            { duration: 340 * M(), easing: "ease-in", fill: "forwards" }
        )
        await travel(t, to, {
            k: 0.12,
            dur: 340,
            ease: bez(0.5, 0, 0.9, 0.5),
            lift: 0,
            tilt: 0,
        })
        trashEl.classList.remove("open")
        trashEl.classList.add("gulp")
        t.el.remove()
        trashed.push({ tile: t, at: Date.now() })
        updateTrash(true)
        // update the data
        if (t.members) {
            groups = groups.filter((g) => g !== t)
            papers = papers.filter((p) => !t.members.includes(p))
        } else {
            papers = papers.filter((p) => p !== t)
            leaveGroup(t)
        }
        const moves = []
        let i = 0
        targets().forEach((to, tile) =>
            moves.push(travel(tile, to, REFLOW(tile, i++)))
        )
        await Promise.all(moves)
    }

    // ---------- custom scrollbar: thumb length follows how much of the files fit ----------
    const frame = document.createElement("div")
    frame.className = "frame"
    shell.parentNode.insertBefore(frame, shell)
    frame.appendChild(shell)
    // 4:3 backdrop behind the container, with an optional uploaded image
    const bk = document.createElement("div")
    bk.className = "backdrop"
    frame.parentNode.insertBefore(bk, frame)
    const fwrap = document.createElement("div")
    fwrap.className = "fwrap"
    const glass = document.createElement("div")
    glass.className = "glass-layer"
    glass.setAttribute("aria-hidden", "true")
    const cam = document.createElement("div")
    cam.className = "bk-cam"
    bk.appendChild(cam)
    cam.appendChild(fwrap)
    fwrap.append(glass, frame)
    // EXPERIMENT: the iPhone Duo's vertical status bar (time, signal) on the right edge.
    // Hidden on narrow layouts (phones). Set DUO_STATUS to false to remove it.
    const DUO_STATUS = false
    if (DUO_STATUS) {
        frame.classList.add("duo")
        const duo = document.createElement("div")
        duo.className = "duo-bar"
        duo.setAttribute("aria-hidden", "true")
        duo.innerHTML = DUO_STATUS_SVG
        frame.appendChild(duo)
        // as in the Figma Duo frame: an 84px column on the right (the shell's right padding),
        // the 48px status centred in it, level with the shell's top padding
        const placeDuo = () => {
            const cs = getComputedStyle(shell)
            duo.style.top = (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.borderTopWidth) || 0) + "px"
            duo.style.right = (84 - 48) / 2 + (parseFloat(cs.borderRightWidth) || 0) + "px"
        }
        placeDuo()
        new ResizeObserver(placeDuo).observe(shell)
    }
    let bkImg = "",
        bkFull = "" // bkFull: the uploaded file at full size, for this session (sharper when zoomed in)
    try {
        bkImg = opts.backdrop || store.getItem("pc-backdrop") || ""
    } catch (_) {}
    function bkSync() {
        const on = C.bkOn === "on"
        bk.classList.toggle("on", on)
        cam.style.backgroundImage =
            on && (bkFull || bkImg) ? `url("${bkFull || bkImg}")` : ""
        shell.style.setProperty("--bk-sub", on ? 2 * C.bkPad + "px" : "0px")
        if (!on) {
            bk.style.width = ""
            shell.style.removeProperty("--bk-hmax")
            return
        }
        const pad = C.bkPad,
            avail = root.clientWidth
        const fw =
                L.width != null ? L.width + (L.inner || 0) : frame.offsetWidth,
            fh = C.h ? C.h + 2 * (C.bw || 0) : frame.offsetHeight // the container's intended size, not what the backdrop currently squeezes it to
        const [aw, ah] = (C.bkAr || "4/3").split("/").map(Number),
            ar = aw / ah
        const w = Math.min(avail, Math.max(fw + 2 * pad, (fh + 2 * pad) * ar)) // wide enough for the container, tall enough at the chosen ratio
        bk.style.width = w + "px"
        bk.style.setProperty("--bk-ar", C.bkAr || "4/3")
        shell.style.setProperty(
            "--bk-hmax",
            Math.max(160, w / ar - 2 * pad) + "px"
        ) // on a narrow screen the container gets shorter to stay inside
    }
    function bkLoad(file) {
        if (!file || !/^image\//.test(file.type)) return
        const rd = new FileReader()
        if (bkFull) URL.revokeObjectURL(bkFull)
        bkFull = URL.createObjectURL(file)
        rd.onload = () => {
            const im = new Image()
            im.onload = () => {
                // scaled down to 2400px wide so it stays light (and fits in browser storage)
                const sc = Math.min(1, 2400 / im.naturalWidth),
                    cv = document.createElement("canvas")
                cv.width = Math.round(im.naturalWidth * sc)
                cv.height = Math.round(im.naturalHeight * sc)
                cv.getContext("2d").drawImage(im, 0, 0, cv.width, cv.height)
                bkImg = cv.toDataURL(
                    file.type === "image/png" ? "image/png" : "image/jpeg",
                    0.88
                )
                try {
                    store.setItem("pc-backdrop", bkImg)
                } catch (_) {
                    try {
                        bkImg = cv.toDataURL("image/jpeg", 0.8)
                        store.setItem("pc-backdrop", bkImg)
                    } catch (__) {}
                }
                if (C.bkOn !== "on") C.bkOn = "on"
                applyC(true)
            }
            im.src = rd.result
        }
        rd.readAsDataURL(file)
    }
    const bblur = document.createElement("div")
    bblur.className = "bblur"
    bblur.setAttribute("aria-hidden", "true")
    bblur.innerHTML =
        '<i style="--b:calc(var(--bb-max,8px) * 0.03125);--m0:0.00%;--m1:14.29%;--m2:28.57%;--m3:42.86%"></i><i style="--b:calc(var(--bb-max,8px) * 0.06250);--m0:14.29%;--m1:28.57%;--m2:42.86%;--m3:57.14%"></i><i style="--b:calc(var(--bb-max,8px) * 0.12500);--m0:28.57%;--m1:42.86%;--m2:57.14%;--m3:71.43%"></i><i style="--b:calc(var(--bb-max,8px) * 0.25000);--m0:42.86%;--m1:57.14%;--m2:71.43%;--m3:85.71%"></i><i style="--b:calc(var(--bb-max,8px) * 0.50000);--m0:57.14%;--m1:71.43%;--m2:85.71%;--m3:100.00%"></i><i style="--b:calc(var(--bb-max,8px) * 1.00000);--m0:71.43%;--m1:85.71%;--m2:100.00%;--m3:100.00%"></i>'
    frame.appendChild(bblur)
    const sbar = document.createElement("div")
    sbar.className = "sbar"
    sbar.setAttribute("aria-hidden", "true")
    const thumb = document.createElement("div")
    thumb.className = "sb-thumb"
    sbar.appendChild(thumb)
    frame.appendChild(sbar)
    function syncBar() {
        const H = shell.clientHeight,
            S = shell.scrollHeight,
            over = S - H > 2
        sbar.hidden = !over
        bblur.hidden = !over || shell.scrollTop >= S - H - 1
        if (!over) return
        const cs = getComputedStyle(shell),
            bw = parseFloat(cs.borderTopWidth) || 0
        const top = bar.offsetHeight + 10 + bw,
            bottom = 14 + bw // track runs below the pinned header
        const track = Math.max(
            40,
            H - top - bottom + (parseFloat(cs.borderTopWidth) || 0)
        )
        sbar.style.top = top + "px"
        sbar.style.height = track + "px"
        const visibleShare = (H - bar.offsetHeight) / (S - bar.offsetHeight)
        const th = Math.max(28, Math.round(track * Math.min(1, visibleShare)))
        const maxScroll = S - H,
            pos = maxScroll > 0 ? shell.scrollTop / maxScroll : 0
        thumb.style.height = th + "px"
        thumb.style.top = Math.round((track - th) * pos) + "px"
    }
    shell.addEventListener("scroll", syncBar, { passive: true })
    shell.addEventListener(
        "scroll",
        () => {
            frame.classList.toggle("scrolled", shell.scrollTop > 2)
            frame.style.setProperty(
                "--pb-o",
                Math.min(1, shell.scrollTop / 64).toFixed(3)
            )
            syncMask()
        },
        { passive: true }
    )
    function syncMask() {
        if (shell.scrollTop <= 0) {
            stage.style.removeProperty("--st-mask")
            return
        }
        // header bottom in stage coordinates: above it files are gone, then they fade in over 28px
        const top =
            (bar.getBoundingClientRect().bottom -
                stage.getBoundingClientRect().top) /
            Z()
        stage.style.setProperty(
            "--st-mask",
            `linear-gradient(to bottom, transparent ${(top - 4).toFixed(1)}px, rgba(0,0,0,.35) ${(top + 14).toFixed(1)}px, #000 ${(top + 40).toFixed(1)}px)`
        ) // eased: no visible edge
    }

    new ResizeObserver(syncBar).observe(stage)
    new ResizeObserver(syncBar).observe(shell)
    new ResizeObserver(() => syncTabFade()).observe(shell)
    // drag the thumb, or click the track to jump
    let sbDrag = null
    thumb.addEventListener("pointerdown", (e) => {
        e.preventDefault()
        e.stopPropagation()
        sbDrag = { y: e.clientY, st: shell.scrollTop }
        sbar.classList.add("dragging")
        thumb.setPointerCapture(e.pointerId)
    })
    thumb.addEventListener("pointermove", (e) => {
        if (!sbDrag) return
        const track = sbar.clientHeight,
            th = thumb.offsetHeight,
            maxScroll = shell.scrollHeight - shell.clientHeight
        shell.scrollTop =
            sbDrag.st +
            (e.clientY - sbDrag.y) * (maxScroll / Math.max(1, track - th))
    })
    const endSb = () => {
        sbDrag = null
        sbar.classList.remove("dragging")
    }
    thumb.addEventListener("pointerup", endSb)
    thumb.addEventListener("pointercancel", endSb)
    sbar.addEventListener("pointerdown", (e) => {
        if (e.target !== sbar) return
        e.stopPropagation()
        const r = sbar.getBoundingClientRect(),
            f = (e.clientY - r.top) / r.height
        shell.scrollTo({
            top: f * (shell.scrollHeight - shell.clientHeight),
            behavior: reduced.matches ? "auto" : "smooth",
        })
    })
    sbar.addEventListener("click", (e) => e.stopPropagation())

    // ---------- container controls ----------
    const C_DEFAULT = {
        selW: 1,
        selWash: 6,
        selC: "",
        cOp: 100,
        cBlur: 24,
        bkOn: "on",
        bkAr: "4/3",
        bkPad: 64,
        bkR: 24,
        bkZ: 1,
        bkX: 50,
        bkY: 50,
        bkFit: "cover",
        bkC: "",
        fPt: 10,
        fIn: 16,
        fGap: 16,
        gcFs: 13,
        gcFw: 500,
        gcPx: 5.5,
        gcPy: 4.5,
        gcR: 7,
        gcLs: 0,
        gcBg: "",
        gcFg: "",
        maxW: 1040,
        btFs: 13,
        btFw: 500,
        btH: 32,
        btPx: 14,
        btR: 8,
        btGap: 8,
        btIc: 14,
        btSw: 2,
        btBw: 0,
        btBc: "",
        btBg: "",
        btFg: "",
        btCb: "",
        btCf: "",
        ccOn: "on",
        gx: 32,
        gy: 50,
        ccBg: "",
        ccFg: "",
        ccPx: 6,
        ccPy: 2,
        ccR: 5,
        ccLs: 0,
        bb: 8,
        sbW: 5,
        sbC: "",
        cols: 4,
        pb: 16,
        h: 640,
        crFs: 22,
        dimB: 1.5,
        crBg: "",
        crFg: "",
        crPl: 10,
        crPr: 10,
        crPy: 4,
        crR: 10,
        dim: 8,
        fbW: 1,
        fbC: "",
        fbS: "solid",
        stk: 6,
        bdSt: "tint",
        bdLb: "dot",
        bdFs: 9,
        bdFw: 500,
        bdR: 3,
        bdMx: 11,
        bdOn: "on",
        bdPx: 4,
        bdPy: 2.5,
        bdLs: 0.1,
        bdTx: 56,
        tPdf: "",
        tFig: "",
        tDocx: "",
        tXlsx: "",
        padBot: 32,
        theme: "system",
        page: "",
        card: "",
        fs: 22,
        fw: 600,
        ft: 12,
        ton: "",
        toff: "",
        pad: 32,
        padTop: 22,
        radius: 24,
        div: "",
        bg: "",
        bw: 0,
        bc: "#E0E0E0",
        shadow: "soft",
    }
    // Pieter's look (from Copy CSS, 23 Sep) — the starting point for everyone and what "Defaults" returns to
    Object.assign(C_DEFAULT, {
        // Pieter's look (24 Sep)
        fs: 26,
        fw: 400,
        toff: "#808080",
        ton: "#ffffff",
        bdSt: "tint",
        bdMx: 15,
        bdTx: 17,
        bdFs: 13,
        bdFw: 500,
        bdR: 7,
        bdPx: 5.5,
        bdPy: 4.5,
        bdLs: 0.1,
        tPdf: "#f87c77",
        fbW: 0,
        fbS: "solid",
        fbC: "",
        card: "#3b3b3b",
        ft: 16,
        btH: 32,
        btPx: 14,
        btR: 11,
        btFs: 13,
        btFw: 500,
        btGap: 8,
        btIc: 14,
        btSw: 1,
        btBg: "#424242",
        btBw: 0,
        ccPy: 3.5,
        ccPx: 5.5,
        ccR: 5,
        ccLs: -1,
        ccBg: "#3d3d3d",
        crFs: 24,
        crBg: "#474747",
        crFg: "#ffffff",
        crPy: 2,
        crPr: 5,
        crPl: 10,
        crR: 10,
        page: "#e8e8e8",
        cols: 5,
        gx: 16,
        gy: 16,
        h: 640,
        padTop: 15,
        pad: 20,
        padBot: 20,
        radius: 30,
        bg: "#363636",
        bw: 0,
        shadow: "none",
    })
    const SHADOWS = {
        none: "none",
        soft: "var(--c-shadow-def)",
        lifted: "0 2px 4px rgba(0,0,0,.05),0 24px 60px rgba(0,0,0,.12)",
    }
    const BG_SW = ["", "#FFFFFF", "#F7F7F7", "#EDEDED", "#F4F1FF", "#1E1F21"]
    const BC_SW = ["#E0E0E0", "#D0D0D0", "#84E287", "#141414"]
    const TON_SW = ["", "#39A7DB", "#4C6FE0", "#E0524F", "#3A9E5B"]
    const TOFF_SW = ["", "#C4C4C4", "#D9D9D9", "#8C8C8C"]
    const CARD_SW = ["", "#FFFFFF", "#FAFAFA", "#F4F1EC", "#EEF3F8", "#2A2A2D"]
    const PG_SW = ["", "#FFFFFF", "#F2F2F2", "#E7E7E7", "#EEF3F8", "#0B0B0C"]
    // colours are kept per theme: Light and Dark each remember their own set, sizes are shared
    const CK = [
        "selC",
        "bkC",
        "gcBg",
        "gcFg",
        "page",
        "bg",
        "bc",
        "card",
        "ton",
        "toff",
        "crBg",
        "crFg",
        "ccBg",
        "ccFg",
        "fbC",
        "sbC",
        "btBg",
        "btFg",
        "btBc",
        "btCb",
        "btCf",
        "tPdf",
        "tFig",
        "tDocx",
        "tXlsx",
    ]
    const LIGHT_BASE = Object.fromEntries(
        CK.map((k) => [k, k === "bc" ? "#E0E0E0" : ""])
    )
    const darkMQ = matchMedia("(prefers-color-scheme: dark)")
    const eff = (t) =>
        t === "system" ? (darkMQ.matches ? "dark" : "light") : t
    const pickC = (c) =>
        Object.fromEntries(
            CK.map((k) => [k, c[k] == null ? LIGHT_BASE[k] : c[k]])
        )
    C_DEFAULT.theme = "dark"
    C_DEFAULT.cs = { dark: pickC(C_DEFAULT), light: { ...LIGHT_BASE } }
    C_DEFAULT.oi1 = 1
    const fresh = (o) => JSON.parse(JSON.stringify(o))
    // older saves (and pasted settings) have one colour set: it becomes the Dark set, so the look is kept
    function normalize(c) {
        c = fresh(c)
        if (!c.cs) {
            c.cs = { dark: pickC(c), light: { ...LIGHT_BASE } }
            c.theme = "dark"
        }
        c.cs.light = { ...LIGHT_BASE, ...(c.cs.light || {}) }
        c.cs.dark = { ...LIGHT_BASE, ...(c.cs.dark || {}) }
        // contrast pass (Ordinary Interfaces review): old defaults move to values that pass WCAG
        if (!c.oi1) {
            c.oi1 = 1
            ;["light", "dark"].forEach((t) => {
                if ((c.cs[t].toff || "").toLowerCase() === "#808080")
                    c.cs[t].toff = "#8A8A8A"
            })
            if (c.bdTx == null || c.bdTx === 28) c.bdTx = 56
            if (c.btSw == null || c.btSw === 1) c.btSw = 2
        }
        Object.assign(c, c.cs[eff(c.theme || "dark")])
        return c
    }
    function snapTheme() {
        // theme-switch-suppression: no transitions for the one frame the colours flip
        const st = document.createElement("style")
        st.textContent = "*,*::before,*::after{transition:none!important}"
        document.head.appendChild(st)
        document.body.offsetHeight
        requestAnimationFrame(() => requestAnimationFrame(() => st.remove()))
    }
    function setTheme(t) {
        snapTheme()
        C.cs[eff(C.theme)] = pickC(C)
        C.theme = t
        Object.assign(C, C.cs[eff(t)])
        applyC()
    }
    on(darkMQ, "change", () => {
        if (C.theme !== "system") return
        snapTheme()
        const other = darkMQ.matches ? "light" : "dark"
        C.cs[other] = pickC(C)
        Object.assign(C, C.cs[eff("system")])
        applyC()
    })
    let C = fresh(C_DEFAULT)
    try {
        const saved = JSON.parse(store.getItem("pc-container") || "null")
        if (saved) C = normalize({ ...C, ...saved, cs: saved.cs })
        if (saved && saved.padTop == null) C.padTop = Math.max(0, C.pad - 10)
        if (saved && saved.padBot == null) C.padBot = C.pad
        if (C.fs < 14) {
            C.fs = 22
        }
        if (!C.fw) C.fw = 600
        if (!C.ft) C.ft = 12
        if (!C.theme) C.theme = "system"
        if (C.crPx != null) {
            if (C.crPl == null || C.crPl === C_DEFAULT.crPl) C.crPl = C.crPx
            if (C.crPr == null || C.crPr === C_DEFAULT.crPr) C.crPr = C.crPx
            delete C.crPx
        }
        ;[
            "selW",
            "selWash",
            "selC",
            "cOp",
            "cBlur",
            "bkOn",
            "bkAr",
            "bkPad",
            "bkR",
            "bkZ",
            "bkX",
            "bkY",
            "bkFit",
            "bkC",
            "fPt",
            "fIn",
            "fGap",
            "gcFs",
            "gcFw",
            "gcPx",
            "gcPy",
            "gcR",
            "gcLs",
            "gcBg",
            "gcFg",
            "maxW",
            "bb",
            "sbW",
            "sbC",
            "gx",
            "gy",
            "cols",
            "pb",
            "h",
            "ccOn",
            "ccBg",
            "ccFg",
            "ccPx",
            "ccPy",
            "ccR",
            "ccLs",
            "crFs",
            "dimB",
            "crBg",
            "crFg",
            "crPl",
            "crPr",
            "crPy",
            "crR",
            "dim",
            "fbW",
            "fbC",
            "fbS",
            "stk",
            "bdSt",
            "bdLb",
            "bdFs",
            "bdFw",
            "bdR",
            "bdMx",
            "bdOn",
            "bdPx",
            "bdPy",
            "bdLs",
            "bdTx",
            "tPdf",
            "tFig",
            "tDocx",
            "tXlsx",
            "btFs",
            "btFw",
            "btH",
            "btPx",
            "btR",
            "btGap",
            "btIc",
            "btSw",
            "btBw",
            "btBc",
            "btBg",
            "btFg",
            "btCb",
            "btCf",
        ].forEach((k) => {
            if (C[k] == null) C[k] = C_DEFAULT[k]
        })
    } catch (_) {}
    // settings passed in as props win over defaults (and over anything persisted)
    function applyProps(o) {
        const s = o.settings || {},
            t = o.theme || s.theme || C.theme
        C.cs[eff(C.theme)] = pickC(C)
        if (s.cs)
            C.cs = {
                light: { ...C.cs.light, ...s.cs.light },
                dark: { ...C.cs.dark, ...s.cs.dark },
            }
        Object.assign(C, C.cs[eff(t)])
        const { cs, theme, ...rest } = s
        Object.assign(C, rest)
        C.theme = t
    }
    applyProps(opts)
    const $ = byId
    const ctl = $("ctl")
    function applyC(relay) {
        shell.style.setProperty("--ft", C.ft)
        $("cFt").value = C.ft
        $("cFtV").textContent = C.ft
        ;[
            ["ton", "--t-on", "cTon", "#141414"],
            ["toff", "--t-off", "cToff", "#A3A3A3"],
        ].forEach(([k, v, id, def]) => {
            if (C[k]) shell.style.setProperty(v, C[k])
            else shell.style.removeProperty(v)
            $(id).value = C[k] || def
            $(id + "Sw")
                .querySelectorAll("button")
                .forEach((b) =>
                    b.setAttribute(
                        "aria-pressed",
                        b.dataset.v.toLowerCase() === (C[k] || "").toLowerCase()
                    )
                )
        })
        if (C.theme === "system") root.removeAttribute("data-theme")
        else root.setAttribute("data-theme", C.theme)
        $("cTheme")
            .querySelectorAll("button")
            .forEach((b) =>
                b.setAttribute("aria-pressed", b.dataset.v === C.theme)
            )
        if (C.page) root.style.setProperty("--page", C.page)
        else root.style.removeProperty("--page")
        $("cPg").value = C.page || "#FEFEFE"
        $("cPgSw")
            .querySelectorAll("button")
            .forEach((b) =>
                b.setAttribute(
                    "aria-pressed",
                    b.dataset.v.toLowerCase() === (C.page || "").toLowerCase()
                )
            )
        if (C.card) shell.style.setProperty("--card", C.card)
        else shell.style.removeProperty("--card")
        // placeholder strength follows how light the chosen file colour is, not the theme
        const MX = {
                light: ["44%", "22%", "12%", "11%"],
                dark: ["58%", "34%", "24%", "22%"],
            },
            keys = ["--mx-pill", "--mx-l1", "--mx-l2", "--mx-img"]
        if (C.card) {
            const h = C.card.replace("#", ""),
                n = parseInt(
                    h.length === 3
                        ? h
                              .split("")
                              .map((c) => c + c)
                              .join("")
                        : h,
                    16
                )
            const lum =
                (0.2126 * ((n >> 16) & 255) +
                    0.7152 * ((n >> 8) & 255) +
                    0.0722 * (n & 255)) /
                255
            keys.forEach((k, i) =>
                shell.style.setProperty(k, MX[lum > 0.5 ? "light" : "dark"][i])
            )
            shell.style.setProperty(
                "--card-ink",
                lum > 0.5 ? "#141414" : "#F2F2F3"
            )
            shell.style.setProperty(
                "--card-rule",
                lum > 0.5 ? "#E3E3E3" : "#38383C"
            )
            // type colours: the brighter set on dark files, the deeper set on light ones
            const TC =
                lum > 0.5
                    ? {
                          "--t-fig": "#39A7DB",
                          "--t-pdf": "#E0524F",
                          "--t-docx": "#3A5FDC",
                          "--t-xlsx": "#3A9E5B",
                      }
                    : {
                          "--t-fig": "#5CC2EE",
                          "--t-pdf": "#FF6F6B",
                          "--t-docx": "#93A9FF",
                          "--t-xlsx": "#52C77F",
                      }
            Object.entries(TC).forEach(([k, v]) =>
                shell.style.setProperty(k, v)
            )
        } else
            [
                ...keys,
                "--card-ink",
                "--card-rule",
                "--t-fig",
                "--t-pdf",
                "--t-docx",
                "--t-xlsx",
            ].forEach((k) => shell.style.removeProperty(k))
        const AUTO_T = getComputedStyle(shell)
        ;[
            ["tPdf", "--t-pdf", "cTPdf"],
            ["tFig", "--t-fig", "cTFig"],
            ["tDocx", "--t-docx", "cTDocx"],
            ["tXlsx", "--t-xlsx", "cTXlsx"],
        ].forEach(([k, v, id]) => {
            if (C[k]) shell.style.setProperty(v, C[k])
            else if (!C.card) shell.style.removeProperty(v)
            if (!C[k]) {
                const auto = AUTO_T.getPropertyValue(v).trim()
                if (/^#[0-9a-f]{6}$/i.test(auto)) $(id).value = auto
            } else $(id).value = C[k]
            $(id + "Sw")
                .querySelectorAll("button")
                .forEach((b) =>
                    b.setAttribute(
                        "aria-pressed",
                        b.dataset.v.toLowerCase() === (C[k] || "").toLowerCase()
                    )
                )
        })
        $("cCard").value = C.card || "#FFFFFF"
        $("cCardSw")
            .querySelectorAll("button")
            .forEach((b) =>
                b.setAttribute(
                    "aria-pressed",
                    b.dataset.v.toLowerCase() === (C.card || "").toLowerCase()
                )
            )
        shell.style.setProperty("--fb-w", C.fbW + "px")
        shell.style.setProperty("--fb-s", C.fbS)
        if (C.fbC) shell.style.setProperty("--fb-c", C.fbC)
        else shell.style.removeProperty("--fb-c")
        $("cFbW").value = C.fbW
        $("cFbWV").textContent = C.fbW
        $("cFbC").value = C.fbC || "#E6E6E6"
        $("cFbCSw")
            .querySelectorAll("button")
            .forEach((b) =>
                b.setAttribute(
                    "aria-pressed",
                    b.dataset.v.toLowerCase() === (C.fbC || "").toLowerCase()
                )
            )
        $("cFbS")
            .querySelectorAll("button")
            .forEach((b) =>
                b.setAttribute("aria-pressed", b.dataset.v === C.fbS)
            )
        ;[
            ["crBg", "--cr-bg", "cCrBg", "#E6E6E6"],
            ["crFg", "--cr-fg", "cCrFg", "#6B6B6B"],
        ].forEach(([k, v, id, def]) => {
            if (C[k]) shell.style.setProperty(v, C[k])
            else shell.style.removeProperty(v)
            $(id).value = C[k] || def
            $(id + "Sw")
                .querySelectorAll("button")
                .forEach((b) =>
                    b.setAttribute(
                        "aria-pressed",
                        b.dataset.v.toLowerCase() === (C[k] || "").toLowerCase()
                    )
                )
        })
        ;[
            ["ccBg", "--cc-bg", "cCcBg", "#DADADA"],
            ["ccFg", "--cc-fg", "cCcFg", "#6B6B6B"],
        ].forEach(([k, v, id, def]) => {
            if (C[k]) shell.style.setProperty(v, C[k])
            else shell.style.removeProperty(v)
            $(id).value = C[k] || def
            $(id + "Sw")
                .querySelectorAll("button")
                .forEach((b) =>
                    b.setAttribute(
                        "aria-pressed",
                        b.dataset.v.toLowerCase() === (C[k] || "").toLowerCase()
                    )
                )
        })
        ;[
            ["ccPx", "--cc-px", "cCcPx"],
            ["ccPy", "--cc-py", "cCcPy"],
            ["ccR", "--cc-r", "cCcR"],
            ["ccLs", "--cc-ls", "cCcLs"],
        ].forEach(([k, v, id]) => {
            shell.style.setProperty(v, C[k] + "px")
            $(id).value = C[k]
            $(id + "V").textContent = C[k]
        })
        shell.dataset.cc = C.ccOn
        $("cCcOn")
            .querySelectorAll("button")
            .forEach((b) =>
                b.setAttribute("aria-pressed", b.dataset.v === C.ccOn)
            )
        ;["cCcBg", "cCcFg", "cCcPx", "cCcPy", "cCcR", "cCcLs"].forEach((id) => {
            const r = $(id).closest(".row")
            if (r) r.style.opacity = C.ccOn === "on" ? "" : ".4"
        })
        shell.style.setProperty("--cr-fs", C.crFs + "px")
        $("cCrFs").value = C.crFs
        $("cCrFsV").textContent = C.crFs
        ;[
            ["crPl", "--cr-pl", "cCrPl"],
            ["crPr", "--cr-pr", "cCrPr"],
            ["crPy", "--cr-py", "cCrPy"],
            ["crR", "--cr-r", "cCrR"],
        ].forEach(([k, v, id]) => {
            shell.style.setProperty(v, C[k] + "px")
            $(id).value = C[k]
            $(id + "V").textContent = C[k]
        })
        shell.style.setProperty("--dim-blur", C.dimB + "px")
        $("cDimB").value = C.dimB
        $("cDimBV").textContent = C.dimB
        shell.style.setProperty("--dim", C.dim / 100)
        $("cDim").value = C.dim
        $("cDimV").textContent = C.dim
        shell.style.setProperty("--stack-step", C.stk + "%")
        $("cStk").value = C.stk
        $("cStkV").textContent = C.stk
        shell.dataset.badge = C.bdSt
        shell.style.setProperty("--bd-fs", C.bdFs)
        shell.style.setProperty("--bd-fw", C.bdFw)
        shell.style.setProperty("--bd-r", C.bdR)
        shell.style.setProperty("--bd-mix", C.bdMx + "%")
        shell.style.setProperty("--bd-dot", C.bdLb === "dot" ? "'.'" : "''")
        shell.style.setProperty(
            "--bd-tt",
            C.bdLb === "caps" ? "uppercase" : "none"
        )
        $("cBdFs").value = C.bdFs
        $("cBdFsV").textContent = C.bdFs
        shell.dataset.badgeOn = C.bdOn
        shell.style.setProperty("--sel-w", C.selW + "px")
        shell.style.setProperty("--sel-wash", C.selWash + "%")
        if (C.selC) shell.style.setProperty("--sel-c", C.selC)
        else shell.style.removeProperty("--sel-c")
        $("cSelW").value = C.selW
        $("cSelWV").textContent = C.selW
        $("cSelWash").value = C.selWash
        $("cSelWashV").textContent = C.selWash
        $("cSelC").value = C.selC || "#84E287"
        $("cSelCSw")
            .querySelectorAll("button")
            .forEach((b) =>
                b.setAttribute(
                    "aria-pressed",
                    b.dataset.v.toLowerCase() === (C.selC || "").toLowerCase()
                )
            )
        bk.style.setProperty("--bk-pad", C.bkPad + "px")
        bk.style.setProperty("--bk-r", C.bkR + "px")
        bk.style.setProperty("--bk-fit", C.bkFit)
        cam.style.setProperty("--bk-z", C.bkZ)
        cam.style.setProperty("--bk-ox", C.bkX + "%")
        cam.style.setProperty("--bk-oy", C.bkY + "%")
        $("cBkZ").value = C.bkZ
        $("cBkZV").textContent = (+C.bkZ).toFixed(2) + "×"
        $("cBkX").value = C.bkX
        $("cBkXV").textContent = C.bkX
        $("cBkY").value = C.bkY
        $("cBkYV").textContent = C.bkY
        $("cBkPick")
            .querySelectorAll("button")
            .forEach((b) =>
                b.setAttribute(
                    "aria-pressed",
                    +b.dataset.x === C.bkX && +b.dataset.y === C.bkY
                )
            )
        ;["cBkPick", "cBkX", "cBkY"].forEach(
            (id) =>
                ($(id).closest(".row").style.opacity = C.bkZ > 1 ? "" : ".4")
        )
        if (C.bkC) bk.style.setProperty("--bk-c", C.bkC)
        else bk.style.removeProperty("--bk-c")
        $("cBkPad").value = C.bkPad
        $("cBkPadV").textContent = C.bkPad
        $("cBkR").value = C.bkR
        $("cBkRV").textContent = C.bkR
        $("cBkC").value = C.bkC || "#D4D4D4"
        $("cBkCSw")
            .querySelectorAll("button")
            .forEach((b) =>
                b.setAttribute(
                    "aria-pressed",
                    b.dataset.v.toLowerCase() === (C.bkC || "").toLowerCase()
                )
            )
        ;[
            ["cBkOn", "bkOn"],
            ["cBkFit", "bkFit"],
            ["cBkAr", "bkAr"],
        ].forEach(([id, k]) =>
            $(id)
                .querySelectorAll("button")
                .forEach((b) =>
                    b.setAttribute("aria-pressed", b.dataset.v === C[k])
                )
        )
        $("cBkRm").disabled = !bkImg
        ;[...ctl.querySelectorAll('[data-k="backdrop"] .row')]
            .slice(1)
            .forEach((r) => (r.style.opacity = C.bkOn === "on" ? "" : ".4"))
        bkSync()
        if (typeof syncEx === "function") syncEx()
        ;[
            ["fPt", "--f-pt", "cFPt"],
            ["fIn", "--f-in", "cFIn"],
            ["fGap", "--f-gap", "cFGap"],
            ["gcFs", "--gc-fs", "cGcFs"],
            ["gcPx", "--gc-px", "cGcPx"],
            ["gcPy", "--gc-py", "cGcPy"],
            ["gcR", "--gc-r", "cGcR"],
            ["gcLs", "--gc-ls", "cGcLs"],
        ].forEach(([k, v, id]) => {
            shell.style.setProperty(v, C[k])
            $(id).value = C[k]
            $(id + "V").textContent = C[k]
        })
        shell.style.setProperty("--gc-fw", C.gcFw)
        $("cGcFw")
            .querySelectorAll("button")
            .forEach((b) =>
                b.setAttribute("aria-pressed", +b.dataset.v === C.gcFw)
            )
        ;[
            ["gcBg", "--gc-bg", "cGcBg", "#4A4A4A"],
            ["gcFg", "--gc-fg", "cGcFg", "#F2F2F3"],
        ].forEach(([k, v, id, def]) => {
            if (C[k]) shell.style.setProperty(v, C[k])
            else shell.style.removeProperty(v)
            $(id).value = C[k] || def
            $(id + "Sw")
                .querySelectorAll("button")
                .forEach((b) =>
                    b.setAttribute(
                        "aria-pressed",
                        b.dataset.v.toLowerCase() === (C[k] || "").toLowerCase()
                    )
                )
        })
        if (C.btIg != null && C.btIg !== "")
            shell.style.setProperty("--bt-ig", C.btIg + "px")
        else shell.style.removeProperty("--bt-ig")
        // skeleton content inside the files (set from the Framer component): soft lines/blocks, and the stronger heading lines (derived from the soft colour unless given)
        if (C.sk) shell.style.setProperty("--sk", C.sk)
        else shell.style.removeProperty("--sk")
        if (C.skS || C.sk)
            shell.style.setProperty(
                "--sk-strong",
                C.skS ||
                    `color-mix(in srgb, ${C.sk}, var(--card-ink,var(--ink)) 22%)`
            )
        else shell.style.removeProperty("--sk-strong")
        // stack name above files (opened stack, files lent to a type tab): text size, and the little clip's colour
        if (C.plFs) shell.style.setProperty("--pl-fs", C.plFs + "px")
        else shell.style.removeProperty("--pl-fs")
        if (C.slIc) shell.style.setProperty("--sl-ic", C.slIc)
        else shell.style.removeProperty("--sl-ic")
        // shadow strengths (set from the Framer component): under stacked sheets, under the paperclip
        ;[
            ["stkSh", "--stk-sh"],
            ["clipSh", "--clip-sh"],
            ["stkEdge", "--stk-edge"],
        ].forEach(([k, v]) => {
            if (C[k] != null && C[k] !== "")
                shell.style.setProperty(v, C[k] + "%")
            else shell.style.removeProperty(v)
        })
        // trash count pill (set from the Framer component): inset from the button edge, text size and weight
        ;[
            ["tcGap", "--tcg", "px"],
            ["tcFs", "--tc-fs", "px"],
            ["tcFw", "--tc-fw", ""],
        ].forEach(([k, v, u]) => {
            if (C[k] != null && C[k] !== "")
                shell.style.setProperty(v, C[k] + u)
            else shell.style.removeProperty(v)
        })
        // optional spacing overrides (set from the Framer component): tabs apart, header to files
        ;[
            ["tabGap", "--tab-gap"],
            ["hdGap", "--hd-gap"],
        ].forEach(([k, v]) => {
            if (C[k] != null && C[k] !== "")
                shell.style.setProperty(v, C[k] + "px")
            else shell.style.removeProperty(v)
        })
        ;[
            ["btFs", "--bt-fs", "cBtFs"],
            ["btH", "--bt-h", "cBtH"],
            ["btPx", "--bt-px", "cBtPx"],
            ["btR", "--bt-r", "cBtR"],
            ["btGap", "--bt-gap", "cBtGap"],
            ["btIc", "--bt-ic", "cBtIc"],
            ["btBw", "--bt-bw", "cBtBw"],
        ].forEach(([k, v, id]) => {
            shell.style.setProperty(v, C[k] + "px")
            $(id).value = C[k]
            $(id + "V").textContent = C[k]
        })
        shell.style.setProperty("--bt-fw", C.btFw)
        shell.style.setProperty("--bt-sw", C.btSw)
        $("cBtSw").value = C.btSw
        $("cBtSwV").textContent = C.btSw
        $("cBtFw")
            .querySelectorAll("button")
            .forEach((b) =>
                b.setAttribute("aria-pressed", +b.dataset.v === C.btFw)
            )
        ;[
            ["btBg", "--bt-bg", "cBtBg", "#262628"],
            ["btFg", "--bt-fg", "cBtFg", "#F2F2F3"],
            ["btBc", "--bt-bc", "cBtBc", "#333336"],
            ["btCb", "--bt-cb", "cBtCb", "#3A2123"],
            ["btCf", "--bt-cf", "cBtCf", "#FF6F6B"],
        ].forEach(([k, v, id, def]) => {
            if (C[k]) shell.style.setProperty(v, C[k])
            else shell.style.removeProperty(v)
            $(id).value = C[k] || def
            $(id + "Sw")
                .querySelectorAll("button")
                .forEach((b) =>
                    b.setAttribute(
                        "aria-pressed",
                        b.dataset.v.toLowerCase() === (C[k] || "").toLowerCase()
                    )
                )
        })
        $("cBtBc").closest(".row").style.opacity = C.btBw > 0 ? "" : ".4"
        ;[
            ["bdPx", "--bd-px", "cBdPx"],
            ["bdPy", "--bd-py", "cBdPy"],
            ["bdLs", "--bd-ls", "cBdLs"],
        ].forEach(([k, v, id]) => {
            shell.style.setProperty(v, C[k])
            $(id).value = C[k]
            $(id + "V").textContent = C[k]
        })
        shell.style.setProperty("--bd-tx", C.bdTx + "%")
        $("cBdTx").value = C.bdTx
        $("cBdTxV").textContent = C.bdTx
        ;[...$("ctl").querySelectorAll('[data-k="badge"] .row')]
            .slice(1)
            .forEach((r) => (r.style.opacity = C.bdOn === "on" ? "" : ".4"))
        $("cBdR").value = C.bdR
        $("cBdRV").textContent = C.bdR
        $("cBdMx").value = C.bdMx
        $("cBdMxV").textContent = C.bdMx
        $("cBdMx").disabled = C.bdSt !== "tint" && C.bdSt !== "pill"
        ;[
            ["cBdOn", "bdOn"],
            ["cBdSt", "bdSt"],
            ["cBdLb", "bdLb"],
            ["cBdFw", "bdFw"],
        ].forEach(([id, k]) =>
            $(id)
                .querySelectorAll("button")
                .forEach((b) =>
                    b.setAttribute(
                        "aria-pressed",
                        String(b.dataset.v) === String(C[k])
                    )
                )
        )
        shell.style.setProperty("--t-size", C.fs + "px")
        shell.style.setProperty("--t-weight", C.fw)
        $("cFw")
            .querySelectorAll("button")
            .forEach((b) =>
                b.setAttribute("aria-pressed", +b.dataset.v === C.fw)
            )
        $("cFs").value = C.fs
        $("cFsV").textContent = C.fs
        shell.style.setProperty("--c-pad", C.pad + "px")
        shell.style.setProperty("--c-pad-top", C.padTop + "px")
        shell.style.setProperty("--pb-max", C.pb + "px")
        $("cPb").value = C.pb
        $("cPbV").textContent = C.pb
        $("cCols").value = C.cols
        $("cColsV").textContent = C.cols
        $("cGx").value = C.gx
        $("cGxV").textContent = C.gx
        $("cGy").value = C.gy
        $("cGyV").textContent = C.gy
        frame.style.setProperty("--bb-max", C.bb + "px")
        frame.classList.toggle("no-bb", !C.bb)
        frame.style.setProperty("--c-radius", C.radius + "px")
        $("cBb").value = C.bb
        $("cBbV").textContent = C.bb
        frame.style.setProperty("--sb-w", C.sbW + "px")
        frame.style.setProperty("--c-bw", C.bw + "px")
        frame.style.setProperty("--c-pad", C.pad + "px")
        if (C.sbC) frame.style.setProperty("--sb-c", C.sbC)
        else frame.style.removeProperty("--sb-c")
        frame.style.setProperty("--c-bg", C.bg || "var(--canvas)")
        frame.classList.toggle("glass", C.cOp < 100)
        fwrap.classList.toggle("glass-on", C.cOp < 100)
        ;[frame, fwrap].forEach((el) => {
            el.style.setProperty("--c-op", C.cOp + "%")
            el.style.setProperty("--c-radius", C.radius + "px")
        })
        requestAnimationFrame(() => syncMask())
        fwrap.style.setProperty("--c-bg", C.bg || "var(--canvas)")
        fwrap.style.setProperty("--c-blur", (C.cOp < 100 ? C.cBlur : 0) + "px")
        $("cOp").value = C.cOp
        $("cOpV").textContent = C.cOp
        $("cBlur").value = C.cBlur
        $("cBlurV").textContent = C.cBlur
        $("cBlur").closest(".row").style.opacity = C.cOp < 100 ? "" : ".4"
        $("cSbW").value = C.sbW
        $("cSbWV").textContent = C.sbW
        $("cSbC").value = C.sbC || "#D9D9D9"
        $("cSbCSw")
            .querySelectorAll("button")
            .forEach((b) =>
                b.setAttribute(
                    "aria-pressed",
                    b.dataset.v.toLowerCase() === (C.sbC || "").toLowerCase()
                )
            )
        requestAnimationFrame(() => {
            if (typeof syncBar === "function") syncBar()
        })
        $("cMaxW").value = C.maxW
        $("cMaxWV").textContent = C.maxW || "None"
        shell.style.setProperty("--c-h", C.h ? C.h + "px" : "auto")
        $("cH").value = C.h
        $("cHV").textContent = C.h || "Auto"
        shell.style.setProperty("--c-pad-bot", C.padBot + "px")
        $("cBot").value = C.padBot
        $("cBotV").textContent = C.padBot
        $("cTop").value = C.padTop
        $("cTopV").textContent = C.padTop
        shell.style.setProperty("--c-radius", C.radius + "px")
        if (C.bg) shell.style.setProperty("--c-bg", C.bg)
        else shell.style.removeProperty("--c-bg")
        // text, pills and buttons inside the container follow how light the container colour is
        const INK = {
            light: {
                "--ink": "#141414",
                "--ink-2": "#6B6B6B",
                "--ink-3": "#A3A3A3",
                "--tab-off": "#868686",
                "--cr-ink": "#5A5A5A",
                "--gl-ink": "#141414",
                "--focus": "#0B7FD6",
                "--count-bg": "#E6E6E6",
                "--btn": "#141414",
                "--btn-ink": "#FFFFFF",
                "--btn2": "#FFFFFF",
                "--border": "#E0E0E0",
                "--box": "#E3E3E3",
                "--rule-soft": "#E3E3E3",
                "--danger-bg": "#FFEDEC",
                "--danger-line": "#FFCDCA",
            },
            dark: {
                "--ink": "#F2F2F3",
                "--ink-2": "#A9A9AE",
                "--ink-3": "#6E6E74",
                "--tab-off": "#8A8A8A",
                "--cr-ink": "#A9A9AE",
                "--gl-ink": "#FFFFFF",
                "--focus": "#0D99FF",
                "--count-bg": "#313134",
                "--btn": "#F2F2F3",
                "--btn-ink": "#111112",
                "--btn2": "#262628",
                "--border": "#333336",
                "--box": "#38383C",
                "--rule-soft": "#333337",
                "--danger-bg": "#3A2123",
                "--danger-line": "#5C2B2E",
            },
        }
        const lumOf = (hex) => {
            const h = hex.replace("#", ""),
                n = parseInt(
                    h.length === 3
                        ? h
                              .split("")
                              .map((c) => c + c)
                              .join("")
                        : h,
                    16
                )
            return (
                (0.2126 * ((n >> 16) & 255) +
                    0.7152 * ((n >> 8) & 255) +
                    0.0722 * (n & 255)) /
                255
            )
        }
        Object.keys(INK.light).forEach((k) => shell.style.removeProperty(k))
        shell.style.removeProperty("color-scheme")
        if (C.bg) {
            const set = lumOf(C.bg) > 0.5 ? "light" : "dark"
            Object.entries(INK[set]).forEach(([k, v]) =>
                shell.style.setProperty(k, v)
            )
            shell.style.setProperty("color-scheme", set)
        }
        shell.style.setProperty("--c-bw", C.bw + "px")
        shell.style.setProperty("--c-bc", C.bc)
        shell.style.setProperty("--c-shadow", SHADOWS[C.shadow])
        $("cPad").value = C.pad
        $("cPadV").textContent = C.pad
        $("cRad").value = C.radius
        $("cRadV").textContent = C.radius
        $("cBw").value = C.bw
        $("cBwV").textContent = C.bw
        $("cBg").value = C.bg || "#F2F2F2"
        $("cBc").value = C.bc
        $("cBgSw")
            .querySelectorAll("button")
            .forEach((b) =>
                b.setAttribute("aria-pressed", b.dataset.v === C.bg)
            )
        $("cBcSw")
            .querySelectorAll("button")
            .forEach((b) =>
                b.setAttribute(
                    "aria-pressed",
                    b.dataset.v.toLowerCase() === C.bc.toLowerCase()
                )
            )
        $("cSh")
            .querySelectorAll("button")
            .forEach((b) =>
                b.setAttribute("aria-pressed", b.dataset.v === C.shadow)
            )
        if (C.cs) C.cs[eff(C.theme)] = pickC(C)
        try {
            store.setItem("pc-container", JSON.stringify(C))
        } catch (_) {}
        if (relay && !busy) relayout()
    }
    BG_SW.forEach((v) => {
        const b = document.createElement("button")
        b.type = "button"
        b.dataset.v = v
        b.title = v || "Default"
        b.style.background = v || "var(--canvas)"
        b.addEventListener("click", () => {
            C.bg = v
            applyC()
        })
        $("cBgSw").appendChild(b)
    })
    BC_SW.forEach((v) => {
        const b = document.createElement("button")
        b.type = "button"
        b.dataset.v = v
        b.title = v
        b.style.background = v
        b.addEventListener("click", () => {
            C.bc = v
            if (!C.bw) C.bw = 1
            applyC(true)
        })
        $("cBcSw").appendChild(b)
    })
    ;[
        [TON_SW, "ton", "cTon", "var(--ink)"],
        [TOFF_SW, "toff", "cToff", "var(--ink-3)"],
    ].forEach(([list, k, id, def]) => {
        list.forEach((v) => {
            const b = document.createElement("button")
            b.type = "button"
            b.dataset.v = v
            b.title = v || "Default"
            b.style.background = v || def
            b.addEventListener("click", () => {
                C[k] = v
                applyC()
            })
            $(id + "Sw").appendChild(b)
        })
        $(id).addEventListener("input", (e) => {
            C[k] = e.target.value
            applyC()
        })
    })
    CARD_SW.forEach((v) => {
        const b = document.createElement("button")
        b.type = "button"
        b.dataset.v = v
        b.title = v || "Default"
        b.style.background = v || "var(--card)"
        b.addEventListener("click", () => {
            C.card = v
            applyC()
        })
        $("cCardSw").appendChild(b)
    })
    $("cCard").addEventListener("input", (e) => {
        C.card = e.target.value
        applyC()
    })
    PG_SW.forEach((v) => {
        const b = document.createElement("button")
        b.type = "button"
        b.dataset.v = v
        b.title = v || "Default"
        b.style.background = v || "var(--page)"
        b.addEventListener("click", () => {
            C.page = v
            applyC()
        })
        $("cPgSw").appendChild(b)
    })
    $("cPg").addEventListener("input", (e) => {
        C.page = e.target.value
        applyC()
    })
    const seg = (id, k, opts, num) =>
        opts.forEach(([v, l]) => {
            const b = document.createElement("button")
            b.type = "button"
            b.dataset.v = v
            b.textContent = l
            b.addEventListener("click", () => {
                C[k] = num ? +v : v
                applyC()
            })
            $(id).appendChild(b)
        })
    ;[
        ["cOp", "cOp"],
        ["cBlur", "cBlur"],
    ].forEach(([k, id]) =>
        $(id).addEventListener("input", (e) => {
            C[k] = +e.target.value
            applyC()
        })
    )
    ;[
        ["selW", "cSelW"],
        ["selWash", "cSelWash"],
    ].forEach(([k, id]) =>
        $(id).addEventListener("input", (e) => {
            C[k] = +e.target.value
            applyC()
        })
    )
    ;["", "#FFFFFF", "#39A7DB", "#0D99FF", "#F5A524"].forEach((v) => {
        const b = document.createElement("button")
        b.type = "button"
        b.dataset.v = v
        b.title = v || "Green (default)"
        b.style.background = v || "var(--sel)"
        b.addEventListener("click", () => {
            C.selC = v
            applyC()
        })
        $("cSelCSw").appendChild(b)
    })
    $("cSelC").addEventListener("input", (e) => {
        C.selC = e.target.value
        applyC()
    })
    seg("cBkOn", "bkOn", [
        ["on", "Show"],
        ["off", "Hide"],
    ])
    seg("cBkFit", "bkFit", [
        ["cover", "Fill"],
        ["contain", "Fit"],
    ])
    seg("cBkAr", "bkAr", [
        ["4/3", "4:3"],
        ["16/9", "16:9"],
        ["1/1", "1:1"],
        ["4/5", "4:5"],
    ])
    $("cBkAr")
        .querySelectorAll("button")
        .forEach(
            (b) =>
                (b.title = {
                    "4/3": "Landscape",
                    "16/9": "Wide (X, YouTube)",
                    "1/1": "Square (Instagram)",
                    "4/5": "Portrait (Instagram post)",
                }[b.dataset.v])
        )
    ;["cBkOn", "cBkFit", "cBkAr"].forEach((id) =>
        $(id).addEventListener("click", () => relayout())
    )
    ;[
        ["bkPad", "cBkPad"],
        ["bkR", "cBkR"],
    ].forEach(([k, id]) =>
        $(id).addEventListener("input", (e) => {
            C[k] = +e.target.value
            applyC(k === "bkPad")
        })
    )
    ;["", "#FFFFFF", "#E8E8E8", "#D4D4D4", "#1C1C1E", "#0B0B0C"].forEach(
        (v) => {
            const b = document.createElement("button")
            b.type = "button"
            b.dataset.v = v
            b.title = v || "Auto"
            b.style.background = v || "color-mix(in srgb, var(--page), #000 9%)"
            b.addEventListener("click", () => {
                C.bkC = v
                applyC()
            })
            $("cBkCSw").appendChild(b)
        }
    )
    $("cBkC").addEventListener("input", (e) => {
        C.bkC = e.target.value
        applyC()
    })
    $("cBkUp").addEventListener("click", () => $("cBkFile").click())
    $("cBkFile").addEventListener("change", (e) => {
        bkLoad(e.target.files[0])
        e.target.value = ""
    })
    $("cBkRm").addEventListener("click", () => {
        bkImg = ""
        if (bkFull) {
            URL.revokeObjectURL(bkFull)
            bkFull = ""
        }
        try {
            store.removeItem("pc-backdrop")
        } catch (_) {}
        applyC()
    })
    $("cBkZ").addEventListener("input", (e) => {
        C.bkZ = +e.target.value
        applyC()
    })
    ;[
        ["bkX", "cBkX"],
        ["bkY", "cBkY"],
    ].forEach(([k, id]) =>
        $(id).addEventListener("input", (e) => {
            C[k] = +e.target.value
            applyC()
        })
    )
    ;[
        [0, "top"],
        [50, "middle"],
        [100, "bottom"],
    ].forEach(([y, yl]) =>
        [
            [0, "left"],
            [50, "centre"],
            [100, "right"],
        ].forEach(([x, xl]) => {
            const b = document.createElement("button")
            b.type = "button"
            b.dataset.x = x
            b.dataset.y = y
            b.title = y === 50 && x === 50 ? "centre" : `${yl} ${xl}`
            b.setAttribute("aria-label", "Zoom into " + b.title)
            b.addEventListener("click", () => {
                cam.classList.add("glide")
                clearTimeout(cam._gt)
                cam._gt = setTimeout(() => cam.classList.remove("glide"), 550)
                C.bkX = x
                C.bkY = y
                if (C.bkZ <= 1) C.bkZ = 1.6
                applyC()
            })
            $("cBkPick").appendChild(b)
        })
    )
    // dropping an image anywhere on the backdrop works too
    bk.addEventListener("dragover", (e) => {
        if ([...(e.dataTransfer.items || [])].some((i) => i.kind === "file")) {
            e.preventDefault()
        }
    })
    bk.addEventListener("drop", (e) => {
        const f = e.dataTransfer.files && e.dataTransfer.files[0]
        if (f && /^image\//.test(f.type)) {
            e.preventDefault()
            bkLoad(f)
        }
    })
    seg(
        "cGcFw",
        "gcFw",
        [
            [400, "Reg"],
            [500, "Med"],
            [600, "Semi"],
            [700, "Bold"],
        ],
        true
    )
    ;[
        ["fPt", "cFPt"],
        ["fIn", "cFIn"],
        ["fGap", "cFGap"],
        ["gcFs", "cGcFs"],
        ["gcPx", "cGcPx"],
        ["gcPy", "cGcPy"],
        ["gcR", "cGcR"],
        ["gcLs", "cGcLs"],
    ].forEach(([k, id]) =>
        $(id).addEventListener("input", (e) => {
            C[k] = +e.target.value
            applyC()
        })
    )
    ;[
        [
            ["", "#3D3D3D", "#4A4A4A", "#FFFFFF", "#141414", "#84E287"],
            "gcBg",
            "cGcBg",
            "color-mix(in srgb, var(--card-ink,var(--ink)) 12%, var(--card))",
        ],
        [
            ["", "#FFFFFF", "#A9A9AE", "#141414"],
            "gcFg",
            "cGcFg",
            "var(--card-ink,var(--ink))",
        ],
    ].forEach(([list, k, id, def]) => {
        list.forEach((v) => {
            const b = document.createElement("button")
            b.type = "button"
            b.dataset.v = v
            b.title = v || "Auto"
            b.style.background = v || def
            b.addEventListener("click", () => {
                C[k] = v
                applyC()
            })
            $(id + "Sw").appendChild(b)
        })
        $(id).addEventListener("input", (e) => {
            C[k] = e.target.value
            applyC()
        })
    })
    seg(
        "cBtFw",
        "btFw",
        [
            [400, "Reg"],
            [500, "Med"],
            [600, "Semi"],
            [700, "Bold"],
        ],
        true
    )
    ;[
        ["btSw", "cBtSw"],
        ["btFs", "cBtFs"],
        ["btH", "cBtH"],
        ["btPx", "cBtPx"],
        ["btR", "cBtR"],
        ["btGap", "cBtGap"],
        ["btIc", "cBtIc"],
        ["btBw", "cBtBw"],
    ].forEach(([k, id]) =>
        $(id).addEventListener("input", (e) => {
            C[k] = +e.target.value
            applyC()
        })
    )
    ;[
        [
            ["", "#FFFFFF", "#262628", "#1F1F1F", "#141414", "#84E287"],
            "btBg",
            "cBtBg",
            "var(--btn2)",
        ],
        [["", "#FFFFFF", "#A9A9AE", "#141414"], "btFg", "cBtFg", "var(--ink)"],
        [
            ["", "#E0E0E0", "#4F4F4F", "#141414"],
            "btBc",
            "cBtBc",
            "var(--border)",
        ],
        [
            [
                "",
                "#3A2123",
                "#FFEDEC",
                "transparent".replace("transparent", "#2B2B2B"),
            ],
            "btCb",
            "cBtCb",
            "var(--danger-bg)",
        ],
        [
            ["", "#FF6F6B", "#E5484D", "#FFFFFF"],
            "btCf",
            "cBtCf",
            "var(--danger)",
        ],
    ].forEach(([list, k, id, def]) => {
        list.forEach((v) => {
            const b = document.createElement("button")
            b.type = "button"
            b.dataset.v = v
            b.title = v || "Default"
            b.style.background = v || def
            b.addEventListener("click", () => {
                C[k] = v
                if (k === "btBc" && !C.btBw) C.btBw = 1
                applyC()
            })
            $(id + "Sw").appendChild(b)
        })
        $(id).addEventListener("input", (e) => {
            C[k] = e.target.value
            if (k === "btBc" && !C.btBw) C.btBw = 1
            applyC()
        })
    })
    seg("cBdOn", "bdOn", [
        ["on", "Show"],
        ["off", "Hide"],
    ])
    ;[
        ["bdPx", "cBdPx"],
        ["bdPy", "cBdPy"],
        ["bdLs", "cBdLs"],
        ["bdTx", "cBdTx"],
    ].forEach(([k, id]) =>
        $(id).addEventListener("input", (e) => {
            C[k] = +e.target.value
            applyC()
        })
    )
    ;[
        ["tPdf", "cTPdf", ["#E0524F", "#FF6F6B", "#F5A524"]],
        ["tFig", "cTFig", ["#39A7DB", "#5CC2EE", "#A259FF"]],
        ["tDocx", "cTDocx", ["#3A5FDC", "#93A9FF", "#6B6B6B"]],
        ["tXlsx", "cTXlsx", ["#3A9E5B", "#52C77F", "#84E287"]],
    ].forEach(([k, id, list]) => {
        ;["", ...list].forEach((v) => {
            const b = document.createElement("button")
            b.type = "button"
            b.dataset.v = v
            b.title = v || "Auto"
            b.style.background =
                v ||
                "conic-gradient(from 45deg, #ccc 25%, #eee 0 50%, #ccc 0 75%, #eee 0)"
            b.addEventListener("click", () => {
                C[k] = v
                applyC()
            })
            $(id + "Sw").appendChild(b)
        })
        $(id).addEventListener("input", (e) => {
            C[k] = e.target.value
            applyC()
        })
    })
    seg("cBdSt", "bdSt", [
        ["tint", "Tint"],
        ["pill", "Pill"],
        ["solid", "Solid"],
        ["outline", "Line"],
        ["plain", "Plain"],
    ])
    seg("cBdLb", "bdLb", [
        ["dot", ".fig"],
        ["caps", "FIG"],
        ["bare", "fig"],
    ])
    seg(
        "cBdFw",
        "bdFw",
        [
            [400, "Reg"],
            [500, "Med"],
            [600, "Semi"],
            [700, "Bold"],
        ],
        true
    )
    ;["", "#E0E0E0", "#C8C8C8", "#8C8C8C", "#141414", "#84E287"].forEach(
        (v) => {
            const b = document.createElement("button")
            b.type = "button"
            b.dataset.v = v
            b.title = v || "Auto (from file colour)"
            b.style.background =
                v || "color-mix(in srgb, var(--card), #808080 20%)"
            b.addEventListener("click", () => {
                C.fbC = v
                if (!C.fbW) C.fbW = 1
                applyC()
            })
            $("cFbCSw").appendChild(b)
        }
    )
    $("cFbC").addEventListener("input", (e) => {
        C.fbC = e.target.value
        if (!C.fbW) C.fbW = 1
        applyC()
    })
    $("cFbW").addEventListener("input", (e) => {
        C.fbW = +e.target.value
        applyC()
    })
    seg("cFbS", "fbS", [
        ["solid", "Solid"],
        ["dashed", "Dashed"],
        ["dotted", "Dotted"],
    ])
    ;[
        [
            ["", "#FFFFFF", "#E6E6E6", "#141414", "#EAF6FC", "#FFEDEC"],
            "crBg",
            "cCrBg",
            "var(--count-bg)",
        ],
        [
            ["", "#141414", "#6B6B6B", "#FFFFFF", "#39A7DB"],
            "crFg",
            "cCrFg",
            "var(--ink-2)",
        ],
    ].forEach(([list, k, id, def]) => {
        list.forEach((v) => {
            const b = document.createElement("button")
            b.type = "button"
            b.dataset.v = v
            b.title = v || "Default"
            b.style.background = v || def
            b.addEventListener("click", () => {
                C[k] = v
                applyC()
            })
            $(id + "Sw").appendChild(b)
        })
        $(id).addEventListener("input", (e) => {
            C[k] = e.target.value
            applyC()
        })
    })
    ;[
        [
            ["", "#FFFFFF", "#141414", "#84E287", "#39A7DB", "#E5484D"],
            "ccBg",
            "cCcBg",
            "color-mix(in srgb, var(--ink-2) 14%, transparent)",
        ],
        [
            ["", "#141414", "#FFFFFF", "#6B6B6B"],
            "ccFg",
            "cCcFg",
            "var(--ink-2)",
        ],
    ].forEach(([list, k, id, def]) => {
        list.forEach((v) => {
            const b = document.createElement("button")
            b.type = "button"
            b.dataset.v = v
            b.title = v || "Default"
            b.style.background = v || def
            b.addEventListener("click", () => {
                C[k] = v
                applyC()
            })
            $(id + "Sw").appendChild(b)
        })
        $(id).addEventListener("input", (e) => {
            C[k] = e.target.value
            applyC()
        })
    })
    ;[
        ["ccPx", "cCcPx"],
        ["ccPy", "cCcPy"],
        ["ccR", "cCcR"],
        ["ccLs", "cCcLs"],
    ].forEach(([k, id]) =>
        $(id).addEventListener("input", (e) => {
            C[k] = +e.target.value
            applyC()
        })
    )
    seg("cCcOn", "ccOn", [
        ["on", "Show"],
        ["off", "Hide"],
    ])
    $("cCrFs").addEventListener("input", (e) => {
        C.crFs = +e.target.value
        applyC()
    })
    ;[
        ["crPl", "cCrPl"],
        ["crPr", "cCrPr"],
        ["crPy", "cCrPy"],
        ["crR", "cCrR"],
    ].forEach(([k, id]) =>
        $(id).addEventListener("input", (e) => {
            C[k] = +e.target.value
            applyC()
        })
    )
    $("cDimB").addEventListener("input", (e) => {
        C.dimB = +e.target.value
        applyC()
    })
    $("cDim").addEventListener("input", (e) => {
        C.dim = +e.target.value
        applyC()
    })
    $("cStk").addEventListener("input", (e) => {
        C.stk = +e.target.value
        applyC()
    })
    $("cBdFs").addEventListener("input", (e) => {
        C.bdFs = +e.target.value
        applyC()
    })
    $("cBdR").addEventListener("input", (e) => {
        C.bdR = +e.target.value
        applyC()
    })
    $("cBdMx").addEventListener("input", (e) => {
        C.bdMx = +e.target.value
        applyC()
    })
    ;[
        ["system", "System"],
        ["light", "Light"],
        ["dark", "Dark"],
    ].forEach(([v, l]) => {
        const b = document.createElement("button")
        b.type = "button"
        b.dataset.v = v
        b.textContent = l
        b.addEventListener("click", () => setTheme(v))
        $("cTheme").appendChild(b)
    })
    ;[
        [400, "Reg"],
        [500, "Med"],
        [600, "Semi"],
        [700, "Bold"],
    ].forEach(([v, l]) => {
        const b = document.createElement("button")
        b.type = "button"
        b.dataset.v = v
        b.textContent = l
        b.style.fontWeight = v
        b.addEventListener("click", () => {
            C.fw = v
            applyC()
        })
        $("cFw").appendChild(b)
    })
    ;["none", "soft", "lifted"].forEach((v) => {
        const b = document.createElement("button")
        b.type = "button"
        b.dataset.v = v
        b.textContent = v[0].toUpperCase() + v.slice(1)
        b.addEventListener("click", () => {
            C.shadow = v
            applyC()
        })
        $("cSh").appendChild(b)
    })
    $("cPad").addEventListener("input", (e) => {
        C.pad = +e.target.value
        applyC(true)
    })
    $("cTop").addEventListener("input", (e) => {
        C.padTop = +e.target.value
        applyC()
    })
    $("cGx").addEventListener("input", (e) => {
        C.gx = +e.target.value
        applyC(true)
    })
    $("cGy").addEventListener("input", (e) => {
        C.gy = +e.target.value
        applyC(true)
    })
    $("cCols").addEventListener("input", (e) => {
        C.cols = +e.target.value
        applyC(true)
    })
    $("cPb").addEventListener("input", (e) => {
        C.pb = +e.target.value
        applyC()
    })
    $("cBb").addEventListener("input", (e) => {
        C.bb = +e.target.value
        applyC()
    })
    $("cSbW").addEventListener("input", (e) => {
        C.sbW = +e.target.value
        applyC()
    })
    ;["", "#D9D9D9", "#B5B5B5", "#8C8C8C", "#141414", "#84E287"].forEach(
        (v) => {
            const b = document.createElement("button")
            b.type = "button"
            b.dataset.v = v
            b.title = v || "Auto"
            b.style.background =
                v || "color-mix(in srgb, var(--canvas), #808080 28%)"
            b.addEventListener("click", () => {
                C.sbC = v
                applyC()
            })
            $("cSbCSw").appendChild(b)
        }
    )
    $("cSbC").addEventListener("input", (e) => {
        C.sbC = e.target.value
        applyC()
    })
    $("cH").addEventListener("input", (e) => {
        C.h = +e.target.value
        applyC()
    })
    $("cMaxW").addEventListener("input", (e) => {
        C.maxW = +e.target.value
        applyC(true)
    })
    $("cBot").addEventListener("input", (e) => {
        C.padBot = +e.target.value
        applyC()
    })
    $("cFt").addEventListener("input", (e) => {
        C.ft = +e.target.value
        applyC()
    })
    $("cFs").addEventListener("input", (e) => {
        C.fs = +e.target.value
        applyC()
    })
    $("cRad").addEventListener("input", (e) => {
        C.radius = +e.target.value
        applyC()
    })
    $("cBw").addEventListener("input", (e) => {
        C.bw = +e.target.value
        applyC(true)
    })
    $("cBg").addEventListener("input", (e) => {
        C.bg = e.target.value
        applyC()
    })
    $("cBc").addEventListener("input", (e) => {
        C.bc = e.target.value
        if (!C.bw) C.bw = 1
        applyC(true)
    })
    $("cReset").addEventListener("click", () => {
        C = normalize(C_DEFAULT)
        applyC(true)
    })
    const toggleCtl = () => {
        ctl.classList.toggle("closed")
        $("ctlHead").setAttribute(
            "aria-expanded",
            !ctl.classList.contains("closed")
        )
    }
    $("ctlHead").addEventListener("click", toggleCtl)
    $("ctlHead").addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            toggleCtl()
        }
    })
    if (window.innerWidth < 640) toggleCtl()
    // the panel is outside the file view: clicks here must not collapse groups or close things
    ;["click", "pointerdown"].forEach((t) =>
        ctl.addEventListener(t, (e) => e.stopPropagation())
    )
    shell.addEventListener("transitionend", (e) => {
        if (
            e.target === shell &&
            (e.propertyName.startsWith("padding") ||
                e.propertyName.startsWith("border")) &&
            !busy
        )
            relayout()
    })

    ctl.querySelectorAll("details.grp").forEach((d) => {
        try {
            const v = store.getItem("pc-sec-" + d.dataset.k)
            if (v != null) d.open = v === "1"
        } catch (_) {}
        d.addEventListener("toggle", () => {
            try {
                store.setItem("pc-sec-" + d.dataset.k, d.open ? "1" : "0")
            } catch (_) {}
        })
    })
    applyC(false)
    if (!opts.showStylePanel) ctl.style.display = "none"
    const ro =
        typeof ResizeObserver !== "undefined"
            ? new ResizeObserver(() => {
                  clearTimeout(rt)
                  rt = setTimeout(() => {
                      if (!busy) relayout()
                  }, 80)
              })
            : null
    if (ro) {
        ro.observe(root)
        cleanups.push(() => ro.disconnect())
    }

    reset()
    entrance()
    requestAnimationFrame(syncBar)
    if (document.fonts && document.fonts.ready)
        document.fonts.ready.then(() => {
            if (!busy && alive) relayout()
        })
    // opts.openStack: name of a stack that starts opened (not in the phone layout, where it would fill the screen)
    if (opts.openStack && !shell.classList.contains("narrow")) {
        const g = groups.find(
            (x) =>
                x.name.toLowerCase() ===
                String(opts.openStack).trim().toLowerCase()
        )
        if (g) {
            instant = true
            open(g).then(
                () => {
                    instant = false
                },
                () => {
                    instant = false
                }
            )
            setTimeout(() => {
                instant = false
            }, 400)
        }
    }
    // ---------- blur warm-up ----------
    // The first time the browser draws a blur of a new size, the graphics card has to prepare it, which
    // can freeze a frame for a few hundred ms. Opening a stack draws lots of new blur sizes at once (the
    // other files blur back, labels blur in and out) — that was the occasional stutter on open/close.
    // So: as soon as the view is on screen, draw those same blurs once on a copy of a file at 1% opacity,
    // right on top of the real one (invisible). After that the first real open is already prepared.
    const WARM_UP_BLURS = true
    if (WARM_UP_BLURS && !reduced.matches && typeof IntersectionObserver === "function") {
        let warmed = false
        const io = new IntersectionObserver((entries) => {
            if (warmed || !entries.some((e) => e.isIntersecting)) return
            warmed = true
            io.disconnect()
            setTimeout(warmUpBlurs, 250)
        })
        io.observe(shell)
        cleanups.push(() => io.disconnect())
    }
    function warmUpBlurs() {
        if (!alive) return
        const src = papers.find(
            (p) => !p.group && p.el.isConnected && !p.el.classList.contains("fhide")
        )
        if (!src) return
        const ghost = src.el.cloneNode(true)
        ghost.removeAttribute("id")
        ghost.querySelectorAll("[id]").forEach((n) => n.removeAttribute("id"))
        ghost.removeAttribute("role")
        ghost.setAttribute("aria-hidden", "true")
        ghost.tabIndex = -1
        ghost.classList.remove("sel", "dim")
        Object.assign(ghost.style, {
            opacity: "0.01",
            pointerEvents: "none",
            transition: "none",
        })
        stage.appendChild(ghost)
        // the dimmed look's end state, read from the stylesheet so it follows the settings
        ghost.classList.add("dim")
        const end = getComputedStyle(ghost).filter
        ghost.classList.remove("dim")
        const num = (re, d) => {
            const m = end.match(re)
            return m ? parseFloat(m[1]) : d
        }
        const b = num(/brightness\(([\d.]+)\)/, 1),
            s = num(/saturate\(([\d.]+)\)/, 1),
            r = num(/blur\(([\d.]+)px\)/, 0)
        const label = ghost.querySelector(".plabel")
        if (label) {
            label.style.transition = "none"
            label.style.opacity = "1"
        }
        const N = 24 // frames per sweep: covers every blur size an open/close passes through
        let k = 0
        const step = () => {
            if (!alive || k > 2 * N) {
                ghost.remove()
                return
            }
            if (k <= N) {
                // 1) the other files blurring back
                const p = k / N
                ghost.style.filter = `brightness(${(1 - (1 - b) * p).toFixed(4)}) saturate(${(1 - (1 - s) * p).toFixed(4)}) blur(${(r * p).toFixed(4)}px)`
            } else if (label) {
                // 2) a file name blurring in and out (0–6px)
                ghost.style.filter = "none"
                label.style.filter = `blur(${((6 * (k - N)) / N).toFixed(4)}px)`
            }
            k++
            requestAnimationFrame(step)
        }
        step()
        cleanups.push(() => ghost.remove())
    }

    return {
        update(o) {
            applyProps(o)
            applyC(true)
        },
        getSettings() {
            return fresh(C)
        },
        destroy() {
            alive = false
            cleanups.forEach((f) => {
                try {
                    f()
                } catch (_) {}
            })
            cleanups.length = 0
            if (raf) cancelAnimationFrame(raf)
            root.innerHTML = ""
        },
    }
}

/* eslint-enable */

/**
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 * @framerIntrinsicWidth 1040
 * @framerIntrinsicHeight 640
 */
export default function FileStacks(props: FileStacksProps) {
    const {
        files,
        stacks,
        location,
        theme,
        perRow,
        gap,
        background,
        radius,
        padding,
        cardColor,
        titleSize,
        selectionColor,
        tabSize,
        activeTab,
        otherTabs,
        pillColor,
        buttonColor,
        buttonIcon,
        buttonPadding,
        buttonHeight,
        buttonGap,
        buttonText,
        pillSize,
        tabGap,
        headerGap,
        trashCountBg,
        trashCountText,
        trashCountSize,
        trashCountWeight,
        trashCountInset,
        skeletonColor,
        skeletonStrong,
        stackCountBg,
        stackCountText,
        tagTextTint,
        tagStyle,
        tagFill,
        pdfText,
        pdfBg,
        figText,
        figBg,
        docxText,
        docxBg,
        xlsxText,
        xlsxBg,
        stackShade,
        stackFan,
        stackShadow,
        clipShadow,
        stackEdge,
        bottomBlur,
        scrollbarColor,
        fileBorder,
        fileBorderColor,
        stackLabelSize,
        labelClipColor,
        settingsJSON,
        openOnLoad,
        insetBorder,
        insetBorderColor,
        menuShade,
        style,
    } = props
    const scale = Math.max(0.3, +props.scale || 1)
    const ref = useRef(null)
    const outer = useRef(null)
    const api = useRef(null)
    const height = useRef(0)

    const fileList = (files || [])
        .filter((f) => f && f.title)
        .map((f) => ({ title: f.title, type: f.type || "pdf" }))
    const stackList = (stacks || [])
        .filter((s) => s && s.name)
        .map((s) => ({
            name: s.name,
            files: String(s.files || "")
                .split(",")
                .map((x) => x.trim())
                .filter(Boolean),
        }))
    const structureKey = JSON.stringify([
        fileList,
        stackList,
        location,
        openOnLoad,
    ])

    const buildSettings = () => {
        const host = ref.current
        const s = {
            bkOn: "off",
            maxW: 0,
            cOp: 100,
            cols: perRow,
            gx: gap,
            gy: gap,
            radius,
            pad: padding,
            padBot: padding,
            ft: titleSize,
            fs: tabSize,
            bg: toHex(background, host),
            card: toHex(cardColor, host),
            selC: toHex(selectionColor, host),
            ton: toHex(activeTab, host),
            toff: toHex(otherTabs, host),
            crBg: toHex(pillColor, host),
            btBg: toHex(buttonColor, host),
        }
        if (height.current) s.h = Math.round(height.current)
        let extra = {}
        if (settingsJSON && settingsJSON.trim()) {
            try {
                const o = JSON.parse(settingsJSON)
                extra = o && o.C ? o.C : o || {}
            } catch (_) {
                extra = {}
            } // accepts the prototype's Copy settings as is
        }
        const btn = {} // button controls win over Settings JSON
        if (buttonIcon != null) btn.btIc = buttonIcon
        if (buttonPadding != null) btn.btPx = buttonPadding
        if (buttonHeight != null) btn.btH = buttonHeight
        if (buttonGap != null) btn.btIg = buttonGap
        if (tabSize != null) btn.fs = tabSize // tab text size too
        if (pillSize != null) btn.crFs = pillSize
        if (buttonText != null) btn.btFs = buttonText
        if (tabGap != null) btn.tabGap = tabGap
        if (headerGap != null) btn.hdGap = headerGap
        // optional colours: when a control is off, fall back to Settings JSON, else to the built-in look
        btn.btCb = trashCountBg ? trashCountBg : extra.btCb || "" // passed as is, so its opacity is kept
        btn.btCf = trashCountText ? trashCountText : extra.btCf || ""
        btn.sk = skeletonColor ? skeletonColor : extra.sk || ""
        btn.skS = skeletonStrong ? skeletonStrong : extra.skS || ""
        btn.gcBg = stackCountBg ? stackCountBg : extra.gcBg || ""
        btn.gcFg = stackCountText ? stackCountText : extra.gcFg || ""
        if (tagTextTint != null) btn.bdTx = tagTextTint
        if (tagStyle) btn.bdSt = tagStyle
        if (tagFill != null) btn.bdMx = tagFill
        if (stackShade != null) btn.stk = stackShade
        if (stackFan != null) btn.fan = stackFan
        if (stackShadow != null) btn.stkSh = stackShadow
        if (clipShadow != null) btn.clipSh = clipShadow
        if (stackEdge != null) btn.stkEdge = stackEdge
        if (bottomBlur != null) btn.bb = bottomBlur
        if (fileBorder != null) btn.fbW = fileBorder
        if (stackLabelSize != null) btn.plFs = stackLabelSize
        btn.slIc = labelClipColor ? labelClipColor : extra.slIc || ""
        btn.fbC = fileBorderColor ? fileBorderColor : extra.fbC || ""
        btn.sbC = scrollbarColor ? scrollbarColor : extra.sbC || ""
        if (trashCountSize != null) btn.tcFs = trashCountSize
        if (trashCountWeight != null) btn.tcFw = trashCountWeight
        if (trashCountInset != null) btn.tcGap = trashCountInset
        const merged = { ...s, ...extra, ...btn, bkOn: "off", maxW: 0 }
        if (height.current) merged.h = Math.round(height.current) // the frame decides the height
        delete merged.cs
        return merged
    }

    useEffect(() => {
        if (typeof window === "undefined" || !ref.current) return
        ensureStyles()
        height.current = ref.current.clientHeight
        api.current = mountFileGroups(ref.current, {
            files: fileList.length ? fileList : undefined,
            stacks: stackList,
            location,
            theme,
            settings: buildSettings(),
            showStylePanel: false,
            // phones start with every stack closed, whatever the Scale (the frame's own width decides)
            openStack:
                outer.current && outer.current.offsetWidth < 520
                    ? ""
                    : openOnLoad || "",
            persist: false,
        })
        const ro = new ResizeObserver(() => {
            const h = ref.current ? ref.current.clientHeight : 0
            if (h && Math.abs(h - height.current) > 0.5 && api.current) {
                height.current = h
                api.current.update({ settings: buildSettings(), theme })
            }
        })
        ro.observe(ref.current)
        return () => {
            ro.disconnect()
            if (api.current) api.current.destroy()
            api.current = null
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [structureKey])

    useEffect(() => {
        if (api.current)
            api.current.update({ settings: buildSettings(), theme })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        perRow,
        gap,
        background,
        radius,
        padding,
        cardColor,
        titleSize,
        selectionColor,
        tabSize,
        activeTab,
        otherTabs,
        pillColor,
        buttonColor,
        buttonIcon,
        buttonPadding,
        buttonHeight,
        buttonGap,
        buttonText,
        pillSize,
        tabGap,
        headerGap,
        trashCountBg,
        trashCountText,
        trashCountSize,
        trashCountWeight,
        trashCountInset,
        skeletonColor,
        skeletonStrong,
        stackCountBg,
        stackCountText,
        tagTextTint,
        tagStyle,
        tagFill,
        pdfText,
        pdfBg,
        figText,
        figBg,
        docxText,
        docxBg,
        xlsxText,
        xlsxBg,
        stackShade,
        stackFan,
        stackShadow,
        clipShadow,
        stackEdge,
        bottomBlur,
        scrollbarColor,
        fileBorder,
        fileBorderColor,
        stackLabelSize,
        labelClipColor,
        settingsJSON,
        theme,
    ])

    // Scale: the view is laid out at frame size ÷ scale and then scaled down, so at 0.7 everything is 70%
    // (type, cards, spacing) and it still fills the frame exactly
    useEffect(() => {
        if (!ref.current || !api.current) return
        const h = ref.current.clientHeight
        if (h) {
            height.current = h
            api.current.update({ settings: buildSettings(), theme })
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [scale])

    return (
        <div
            ref={outer}
            style={{
                ...style,
                position: "relative",
                width: "100%",
                height: "100%",
                overflow: "visible",
            }}
        >
            <div
                ref={ref}
                className="pcg"
                role="region"
                aria-label={(location || "Files") + " file view"}
                style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    width: `${100 / scale}%`,
                    height: `${100 / scale}%`,
                    transform: `scale(${scale})`,
                    transformOrigin: "0 0",
                    overflow: "visible",
                    // inset border on the whole container — 0.5px on screen, whatever the scale
                    ["--c-ib-w" as any]: insetBorder ? `${0.5 / scale}px` : "0px",
                    ["--c-ib-c" as any]: insetBorderColor || "transparent",
                    // trash menu: a darker shade of the container, so it reads as a sub menu
                    ["--tp-shade" as any]: `${menuShade ?? 22}%`,
                    // per-type tag colours, passed as is so their opacity is kept
                    ...Object.fromEntries(
                        [
                            ["pdf", pdfText, pdfBg],
                            ["fig", figText, figBg],
                            ["docx", docxText, docxBg],
                            ["xlsx", xlsxText, xlsxBg],
                        ].flatMap(([t, tx, bg]) => [
                            ...(tx ? [["--tt-" + t, tx]] : []),
                            ...(bg ? [["--tb-" + t, bg]] : []),
                        ])
                    ),
                }}
            />
        </div>
    )
}

type FileStacksProps = {
    files: { title: string; type: "pdf" | "fig" | "docx" | "xlsx" }[]
    stacks: { name: string; files: string }[]
    location: string
    theme: "dark" | "light" | "system"
    perRow: number
    gap: number
    background: string
    radius: number
    padding: number
    cardColor: string
    titleSize: number
    selectionColor: string
    tabSize: number
    activeTab: string
    otherTabs: string
    pillColor: string
    buttonColor: string
    buttonIcon: number
    buttonPadding: number
    buttonHeight: number
    buttonGap: number
    pillSize: number
    buttonText: number
    tabGap: number
    headerGap: number
    trashCountBg: string
    trashCountText: string
    trashCountSize: number
    trashCountWeight: number
    trashCountInset: number
    skeletonColor: string
    skeletonStrong: string
    stackCountBg: string
    stackCountText: string
    tagTextTint: number
    tagStyle: string
    tagFill: number
    pdfText: string
    pdfBg: string
    figText: string
    figBg: string
    docxText: string
    docxBg: string
    xlsxText: string
    xlsxBg: string
    stackShade: number
    stackFan: number
    stackShadow: number
    clipShadow: number
    stackEdge: number
    bottomBlur: number
    fileBorder: number
    fileBorderColor: string
    stackLabelSize: number
    labelClipColor: string
    scrollbarColor: string
    settingsJSON: string
    scale: number
    openOnLoad: string
    insetBorder: boolean
    insetBorderColor: string
    menuShade: number
    style?: React.CSSProperties
}

const SAMPLE_FILES = [
    ["Project brief", "pdf"],
    ["Moodboard", "fig"],
    ["Interview notes", "docx"],
    ["Wireframes v2", "fig"],
    ["Budget", "xlsx"],
    ["Brand guidelines", "pdf"],
    ["Pitch deck", "pdf"],
    ["Style tiles", "fig"],
    ["Meeting minutes", "docx"],
    ["Invoices Q3", "xlsx"],
    ["Logo explorations", "fig"],
    ["Roadmap", "pdf"],
    ["Icon set", "fig"],
    ["Research plan", "docx"],
    ["Timeline", "xlsx"],
    ["Landing page", "fig"],
].map(([title, type]) => ({ title, type }))

addPropertyControls(FileStacks, {
    files: {
        type: ControlType.Array,
        title: "Files",
        control: {
            type: ControlType.Object,
            controls: {
                title: {
                    type: ControlType.String,
                    title: "Title",
                    defaultValue: "Untitled",
                },
                type: {
                    type: ControlType.Enum,
                    title: "Type",
                    defaultValue: "pdf",
                    options: ["pdf", "fig", "docx", "xlsx"],
                    optionTitles: ["PDF", "Figma", "Doc", "Sheet"],
                },
            },
        },
        defaultValue: SAMPLE_FILES,
    },
    stacks: {
        type: ControlType.Array,
        title: "Stacks",
        control: {
            type: ControlType.Object,
            controls: {
                name: {
                    type: ControlType.String,
                    title: "Name",
                    defaultValue: "Stack",
                },
                files: {
                    type: ControlType.String,
                    title: "Files",
                    placeholder: "Title, Title",
                    defaultValue: "",
                },
            },
        },
        defaultValue: [
            {
                name: "Brand refresh",
                files: "Moodboard, Brand guidelines, Logo explorations",
            },
            { name: "Finance", files: "Budget, Invoices Q3" },
        ],
    },
    scale: {
        type: ControlType.Number,
        title: "Scale",
        defaultValue: 1,
        min: 0.5,
        max: 1.25,
        step: 0.01,
        description:
            "Sizes everything together; the view still fills the frame.",
    },
    openOnLoad: {
        type: ControlType.String,
        title: "Start open",
        defaultValue: "",
        placeholder: "Stack name",
        description:
            "Name of a stack that is already open when the page loads (not on phones). Leave empty to start closed.",
    },
    location: {
        type: ControlType.String,
        title: "Location",
        defaultValue: "Projects",
    },
    theme: {
        type: ControlType.Enum,
        title: "Theme",
        defaultValue: "dark",
        options: ["dark", "light", "system"],
        optionTitles: ["Dark", "Light", "System"],
        displaySegmentedControl: true,
    },
    perRow: {
        type: ControlType.Number,
        title: "Per row",
        defaultValue: 5,
        min: 1,
        max: 6,
        step: 1,
        displayStepper: true,
    },
    gap: {
        type: ControlType.Number,
        title: "Gap",
        defaultValue: 16,
        min: 0,
        max: 64,
        unit: "px",
    },
    background: {
        type: ControlType.Color,
        title: "Background",
        defaultValue: "#363636",
    },
    radius: {
        type: ControlType.Number,
        title: "Radius",
        defaultValue: 30,
        min: 0,
        max: 60,
        unit: "px",
    },
    padding: {
        type: ControlType.Number,
        title: "Padding",
        defaultValue: 20,
        min: 0,
        max: 64,
        unit: "px",
    },
    insetBorder: {
        type: ControlType.Boolean,
        title: "Inset border",
        defaultValue: false,
        description: "A 0.5px line just inside the edge of the whole container.",
    },
    insetBorderColor: {
        type: ControlType.Color,
        title: "Border colour",
        defaultValue: "rgba(255, 255, 255, 0.12)",
        hidden: (props) => !props.insetBorder,
    },
    menuShade: {
        type: ControlType.Number,
        title: "Menu shade",
        defaultValue: 22,
        min: 0,
        max: 60,
        step: 1,
        unit: "%",
        description:
            "How much darker the trash menu is than the container. 0 = same colour.",
    },
    cardColor: {
        type: ControlType.Color,
        title: "File colour",
        defaultValue: "#3B3B3B",
    },
    fileBorder: {
        type: ControlType.Number,
        title: "File border",
        defaultValue: 0.5,
        min: 0,
        max: 4,
        step: 0.5,
        unit: "px",
        description: "Border around every file, stacked or not.",
    },
    fileBorderColor: {
        type: ControlType.Color,
        title: "Border colour",
        optional: true,
        description:
            "Leave off to follow the file colour. Sheets in a stack also get the Stack edge outline; set that to 0 to make them match.",
    },
    skeletonColor: {
        type: ControlType.Color,
        title: "Skeleton",
        optional: true,
        description:
            "Placeholder lines and blocks inside the files. Leave off to follow the file colour.",
    },
    skeletonStrong: {
        type: ControlType.Color,
        title: "Skeleton bold",
        optional: true,
        description:
            "The stronger heading lines. Leave off to follow Skeleton.",
    },
    stackLabelSize: {
        type: ControlType.Number,
        title: "Stack name size",
        defaultValue: 12,
        min: 8,
        max: 24,
        step: 0.5,
        unit: "px",
        description:
            "The stack's name shown above its files: when the stack is open, and above stacked files under a type tab.",
    },
    labelClipColor: {
        type: ControlType.Color,
        title: "Name clip",
        optional: true,
        description:
            "The small paperclip next to the stack name above a file (type tabs). Leave off for the built-in grey.",
    },
    stackCountBg: {
        type: ControlType.Color,
        title: "Stack count",
        optional: true,
        description:
            "Background of the number pill on a stack. Leave off to follow the file colour.",
    },
    stackCountText: {
        type: ControlType.Color,
        title: "Stack count text",
        optional: true,
    },
    stackShade: {
        type: ControlType.Number,
        title: "Stack shade",
        defaultValue: 12,
        min: 0,
        max: 30,
        step: 0.5,
        unit: "%",
        description:
            "How much darker each sheet behind the top one gets in a stack.",
    },
    stackFan: {
        type: ControlType.Number,
        title: "Stack fan",
        defaultValue: 1.8,
        min: 0,
        max: 4,
        step: 0.1,
        displayStepper: false,
        description:
            "How far the sheets behind are turned, so more of them shows. 1 is the original angle.",
    },
    stackShadow: {
        type: ControlType.Number,
        title: "Stack shadow",
        defaultValue: 42,
        min: 0,
        max: 100,
        step: 1,
        unit: "%",
        description:
            "Strength of the shadow under each sheet in a stack. 0 turns it off.",
    },
    clipShadow: {
        type: ControlType.Number,
        title: "Clip shadow",
        defaultValue: 18,
        min: 0,
        max: 100,
        step: 1,
        unit: "%",
        description: "Strength of the paperclip's shadow. 0 turns it off.",
    },
    stackEdge: {
        type: ControlType.Number,
        title: "Stack edge",
        defaultValue: 9,
        min: 0,
        max: 40,
        step: 1,
        unit: "%",
        description:
            "The thin light outline around each sheet in a stack. 0 turns it off.",
    },
    bottomBlur: {
        type: ControlType.Number,
        title: "Bottom blur",
        defaultValue: 8,
        min: 0,
        max: 24,
        step: 1,
        unit: "px",
        description:
            "The blur at the bottom edge where files scroll out of view. 0 turns it off.",
    },
    scrollbarColor: {
        type: ControlType.Color,
        title: "Scrollbar",
        optional: true,
        description: "Leave off to follow the background.",
    },
    tagTextTint: {
        type: ControlType.Number,
        title: "Type text tint",
        defaultValue: 17,
        min: 0,
        max: 100,
        step: 1,
        unit: "%",
        description:
            "How far the .pdf / .fig tag text is pulled from its colour toward the file text colour (toward black with the Pill style). 0 is the pure type colour.",
    },
    tagStyle: {
        type: ControlType.Enum,
        title: "Tag style",
        defaultValue: "tint",
        options: ["tint", "pill", "solid", "outline", "plain"],
        optionTitles: ["Tint", "Pill", "Solid", "Line", "Plain"],
        description: "Pill: light tinted pill with full-colour text, readable on any file colour.",
    },
    tagFill: {
        type: ControlType.Number,
        title: "Tag opacity",
        defaultValue: 22,
        min: 0,
        max: 100,
        step: 1,
        unit: "%",
        description: "How strongly the type colour shows in the tag background.",
    },
    pdfText: {
        type: ControlType.Color,
        title: ".pdf text",
        defaultValue: "#F99894",
        optional: true,
    },
    pdfBg: {
        type: ControlType.Color,
        title: ".pdf fill",
        defaultValue: "rgba(255, 78, 71, 0.22)",
        optional: true,
        description: "Use the alpha slider for opacity.",
    },
    figText: {
        type: ControlType.Color,
        title: ".fig text",
        defaultValue: "#F897FA",
        optional: true,
    },
    figBg: {
        type: ControlType.Color,
        title: ".fig fill",
        defaultValue: "rgba(252, 77, 255, 0.22)",
        optional: true,
        description: "Use the alpha slider for opacity.",
    },
    docxText: {
        type: ControlType.Color,
        title: ".docx text",
        defaultValue: "#A5E8FA",
        optional: true,
    },
    docxBg: {
        type: ControlType.Color,
        title: ".docx fill",
        defaultValue: "rgba(102, 224, 255, 0.22)",
        optional: true,
        description: "Use the alpha slider for opacity.",
    },
    xlsxText: {
        type: ControlType.Color,
        title: ".xlsx text",
        defaultValue: "#78F9AA",
        optional: true,
    },
    xlsxBg: {
        type: ControlType.Color,
        title: ".xlsx fill",
        defaultValue: "rgba(20, 255, 110, 0.22)",
        optional: true,
        description: "Use the alpha slider for opacity.",
    },
    titleSize: {
        type: ControlType.Number,
        title: "File title",
        defaultValue: 16,
        min: 9,
        max: 22,
        step: 0.5,
        unit: "px",
    },
    selectionColor: {
        type: ControlType.Color,
        title: "Selection",
        defaultValue: "#84E287",
    },
    tabSize: {
        type: ControlType.Number,
        title: "Tab size",
        defaultValue: 26,
        min: 12,
        max: 48,
        step: 0.5,
        unit: "px",
        description:
            "All files, Stacks, PDF… (phones use a slightly smaller size automatically).",
    },
    tabGap: {
        type: ControlType.Number,
        title: "Tab spacing",
        defaultValue: 13,
        min: 0,
        max: 48,
        step: 0.5,
        unit: "px",
        description: "Space between the tabs.",
    },
    headerGap: {
        type: ControlType.Number,
        title: "Header spacing",
        defaultValue: 22,
        min: 0,
        max: 80,
        step: 1,
        unit: "px",
        description: "Space between the header and the files.",
    },
    activeTab: {
        type: ControlType.Color,
        title: "Active tab",
        defaultValue: "#FFFFFF",
    },
    otherTabs: {
        type: ControlType.Color,
        title: "Other tabs",
        defaultValue: "#808080",
    },
    pillColor: {
        type: ControlType.Color,
        title: "Pill",
        defaultValue: "#474747",
    },
    pillSize: {
        type: ControlType.Number,
        title: "Pill text",
        defaultValue: 22,
        min: 10,
        max: 48,
        step: 0.5,
        unit: "px",
        description: "Text size of the Projects pill.",
    },
    buttonColor: {
        type: ControlType.Color,
        title: "Buttons",
        defaultValue: "#424242",
    },
    buttonIcon: {
        type: ControlType.Number,
        title: "Button icon",
        defaultValue: 16,
        min: 10,
        max: 26,
        step: 0.5,
        unit: "px",
    },
    buttonPadding: {
        type: ControlType.Number,
        title: "Button padding",
        defaultValue: 14,
        min: 4,
        max: 32,
        step: 1,
        unit: "px",
    },
    buttonHeight: {
        type: ControlType.Number,
        title: "Button height",
        defaultValue: 32,
        min: 22,
        max: 52,
        step: 1,
        unit: "px",
    },
    buttonText: {
        type: ControlType.Number,
        title: "Button text",
        defaultValue: 13,
        min: 9,
        max: 22,
        step: 0.5,
        unit: "px",
    },
    trashCountBg: {
        type: ControlType.Color,
        title: "Trash count",
        optional: true,
        description:
            "Background of the number pill in the trash button. Leave off to match the .pdf tag.",
    },
    trashCountText: {
        type: ControlType.Color,
        title: "Count text",
        optional: true,
        description: "Colour of the number. Leave off to match the .pdf tag.",
    },
    trashCountSize: {
        type: ControlType.Number,
        title: "Count size",
        defaultValue: 11,
        min: 8,
        max: 18,
        step: 0.5,
        unit: "px",
    },
    trashCountWeight: {
        type: ControlType.Enum,
        title: "Count weight",
        options: [400, 500, 600, 700],
        optionTitles: ["Regular", "Medium", "Semibold", "Bold"],
        defaultValue: 500,
    },
    trashCountInset: {
        type: ControlType.Number,
        title: "Count inset",
        defaultValue: 6,
        min: 2,
        max: 12,
        step: 0.5,
        unit: "px",
        description:
            "Gap between the number pill and the trash button edge. The pill's corner follows it.",
    },
    buttonGap: {
        type: ControlType.Number,
        title: "Icon spacing",
        defaultValue: 7,
        min: 0,
        max: 20,
        step: 0.5,
        unit: "px",
    },
    settingsJSON: {
        type: ControlType.String,
        title: "Settings JSON",
        placeholder: "Paste “Copy settings” from the prototype",
        displayTextArea: true,
        defaultValue: "",
    },
})

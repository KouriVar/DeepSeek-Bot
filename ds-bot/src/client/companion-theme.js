// Shared native tokens keep the character editor and group surface at home in
// both Harness themes. The motion helper owns movement; CSS owns appearance.
export const COMPANION_CSS = `
.bt-gesture{transform-box:fill-box;transform-origin:50% 65%}
.bt-mark[data-organic] :is(.bt-b,.bt-eye,.bt-eyes){animation:none!important}
.bt-mark[data-organic] .bt-eye{transform-box:fill-box;transform-origin:center}
.bt-mark[data-organic] .bt-face-normal,.bt-mark[data-organic] .bt-face-smile{transition:opacity .16s ease}
.bt-mark[data-organic]:not([data-companion]):is([data-noticed],[data-delighted]) .bt-eye{opacity:0}
.bt-mark[data-organic]:not([data-companion]):is([data-noticed],[data-delighted]) .bt-eye-happy{opacity:1}
.bt-mark[data-companion]:is([data-noticed],[data-delighted],[data-state=done]) .bt-face-normal{opacity:0}
.bt-mark[data-companion]:is([data-noticed],[data-delighted],[data-state=done]) .bt-face-smile{opacity:1}
.bt-mark[data-organic][data-companion] .bt-eye{scale:1!important}
.bt-mark[data-companion][data-state=sleeping] .bt-eye{scale:1 .18!important}
.bt-mark[data-organic][data-state=alert]{filter:drop-shadow(0 0 7px color-mix(in srgb,var(--bt-accent) 25%,transparent))}
.bt-mark[data-organic][data-delighted]{filter:drop-shadow(0 2px 7px color-mix(in srgb,var(--bt-accent) 18%,transparent))}
.bt-mark[data-organic]:focus-visible{outline:2px solid var(--bt-accent);outline-offset:6px;border-radius:50%}
body:not([data-bt-motion=quiet]) :is(.bt-row,.bt-tile)>:is(.bt-mark,.bt-cluster):hover .bt-mark[data-organic] :is(.bt-b,.bt-mark-img){rotate:0;translate:0;scale:1;animation:none}
.bt-character-aura{color:var(--bt-star);pointer-events:none}
.bt-mood-spark,.bt-mood-rest,.bt-mood-orbit{display:none;transform-box:view-box;transform-origin:50% 50%}
.bt-mark:is([data-state=done],[data-delighted]) .bt-mood-spark{display:block;animation:bt-companion-twinkle 2s ease-in-out infinite}
.bt-mark[data-state=sleeping] .bt-mood-rest{display:block;color:var(--bt-ink-3);animation:bt-companion-rest 4s ease-in-out infinite}
.bt-mark:is([data-state=working],[data-state=searching],[data-state=sending]) .bt-mood-orbit{display:block;color:var(--bt-ink-3);animation:bt-companion-orbit 5s linear infinite}
.bt-mark[data-motion-paused=true] .bt-character-aura *{animation-play-state:paused}
body[data-bt-motion=quiet] .bt-character-aura *{animation:none}
@keyframes bt-companion-twinkle{0%,100%{opacity:.25;transform:scale(.85)}45%{opacity:1;transform:scale(1.08)}}
@keyframes bt-companion-rest{0%{opacity:0;transform:translate(0,5%)}30%,65%{opacity:.7}100%{opacity:0;transform:translate(5%,-10%)}}
@keyframes bt-companion-orbit{to{transform:rotate(360deg)}}
.bt-appearance{display:flex;flex-direction:column;gap:0;min-width:0}
.bt-look-row{display:flex;align-items:center;gap:16px;min-height:64px;padding:8px 12px;box-sizing:border-box}
.bt-look-row+.bt-look-row{border-top:1px solid var(--bt-line)}
.bt-look-label{flex:0 0 40px;font-size:12px;color:var(--bt-ink-2)}
.bt-look-row>.bt-colors{display:flex;flex:1;flex-wrap:wrap;justify-content:flex-start;gap:8px}
.bt-look-row .bt-color{width:24px;height:24px;padding:0}
.bt-look-row .bt-color>span{width:20px;height:20px}
.bt-look-row .bt-shapes{flex:1}
.bt-look-row .bt-shape-row{display:flex;gap:6px;flex-wrap:wrap}
.bt-look-row .bt-shape,.bt-face-choice{width:40px;height:40px;border:1px solid transparent;border-radius:12px;corner-shape:round;background:none;color:var(--bt-ink);display:inline-flex;align-items:center;justify-content:center;cursor:pointer;padding:0}
.bt-look-row .bt-shape[aria-pressed=true],.bt-face-choice[aria-pressed=true]{background:color-mix(in srgb,var(--bt-accent) 10%,transparent);border-color:color-mix(in srgb,var(--bt-accent) 45%,transparent)}
.bt-look-row .bt-shape .bt-ring{display:none}
.bt-faces{display:flex;gap:6px;flex-wrap:wrap}
.bt-face-choice:hover{background:var(--bt-hover)}
.bt-legacy-looks{border-top:1px solid var(--bt-line);padding:12px;color:var(--bt-ink-2);font-size:12px}
.bt-legacy-looks summary{cursor:pointer;line-height:20px}
.bt-legacy-looks>.bt-shapes{padding-top:8px}
.bt-legacy-looks .bt-shape-row{grid-template-columns:repeat(6,1fr)}
.bt-avedit{width:340px;max-width:calc(100vw - 32px)}
.bt-create-body{padding:32px 28px 40px;align-items:flex-start;box-sizing:border-box}
.bt-create-card{max-width:820px;min-width:0;flex:none;box-sizing:border-box;display:grid;grid-template-columns:minmax(230px,.85fr) minmax(320px,1.15fr);column-gap:40px;row-gap:20px;align-content:start}
.bt-create-preview{grid-column:1;grid-row:1/7;align-self:start;position:sticky;top:8px;box-sizing:border-box;min-height:424px;gap:16px;padding:52px 20px 28px;border:1px solid var(--bt-line);border-radius:22px;corner-shape:round;background:radial-gradient(ellipse at 50% 30%,color-mix(in srgb,var(--bt-companion-color,var(--bt-accent)) 12%,transparent),transparent 72%),var(--bt-main);overflow:visible}
.bt-create-preview .bt-create-pop{padding:8px;margin:4px 0 12px}
.bt-create-preview .bt-create-name{font-size:24px;line-height:32px;font-weight:600;text-align:center;white-space:normal;overflow-wrap:anywhere}
.bt-preview-hint,.bt-preview-note{margin:0;text-align:center;font-size:12px;line-height:20px;color:var(--bt-ink-2)}
.bt-preview-note{font-size:11px;color:var(--bt-ink-3);max-width:230px}
.bt-preview-states{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));width:100%;max-width:260px;gap:8px;margin-top:12px}
.bt-preview-states button{border:1px solid var(--bt-line);border-radius:20px;corner-shape:round;padding:5px 10px;background:transparent;color:var(--bt-ink-2);font:inherit;font-size:11px;line-height:18px;cursor:pointer}
.bt-preview-states button:hover{background:var(--bt-hover);color:var(--bt-ink)}
.bt-preview-states button[aria-pressed=true]{background:var(--bt-ink);color:var(--bt-main);border-color:var(--bt-ink)}
.bt-create-card>:not(.bt-create-preview){grid-column:2;min-width:0}
.bt-create-step{margin:0;font-size:14px;font-weight:600;line-height:20px}
.bt-create-looks{padding:0;min-height:max-content;flex-shrink:0;gap:0;border-radius:16px;corner-shape:round;overflow:hidden}
.bt-create-lookbar{border-top:1px solid var(--bt-line);padding:12px;gap:8px}
.bt-create-foot{border-top:1px solid var(--bt-line);padding-top:20px;margin-top:4px}
.bt-create-inline .bt-create-card{display:flex}
.bt-create-inline .bt-create-preview{position:static;min-height:300px}
.bt-side .bt-row{gap:10px;min-height:44px;padding:8px}
.bt-side .bt-row-title{font-size:14px;line-height:22px}
.bt-side .bt-row>.bt-mark,.bt-side .bt-row>.bt-cluster{align-self:center}
.bt-side .bt-row-preview{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px;line-height:16px}
@media(max-width:1000px){.bt-create-card{grid-template-columns:minmax(0,1fr);max-width:520px;row-gap:18px}.bt-create-card>:not(.bt-create-preview){grid-column:1}.bt-create-preview{position:static;grid-row:auto;min-height:310px;padding:28px 16px 22px}.bt-create-preview .bt-create-pop{margin:0}.bt-create-body{padding:20px 16px 32px}}
@media(prefers-reduced-motion:reduce){.bt-mark[data-organic] *{transition:none!important}.bt-create-pop{animation:none}}
`

export const COMPANION_CHAT_CSS = `
.bt-group-replies{gap:24px}
.bt-group-msg{grid-template-columns:24px minmax(0,1fr);column-gap:12px;row-gap:6px;align-items:start;margin-top:24px}
.bt-group-msg>.bt-lead{grid-row:1;clip-path:none;background:none;border-radius:0;overflow:visible}
.bt-group-msg>.bt-lead :is(.bt-mark,.bt-mark-img){border-radius:0;overflow:visible}
.bt-group-msg>.bt-lead .bt-mark-img{border-radius:50%;corner-shape:round;overflow:hidden}
.bt-group-name{grid-column:2;grid-row:1;min-height:24px;font-size:14px;line-height:24px;gap:8px;align-items:center}
.bt-group-role{font-size:10px;line-height:16px;border-radius:6px;corner-shape:round;padding:0 5px;background:var(--bt-tag-bg);color:var(--bt-ink-3);font-weight:400}
.bt-group-time{font-size:11px;font-weight:400;color:var(--bt-ink-3);line-height:20px;font-variant-numeric:tabular-nums;margin-left:2px}
.bt-group-msg>.bt-astack{grid-column:2;min-width:0}
.bt-group-msg[data-continuation]>.bt-astack{grid-row:1}
.bt-group-replies>.bt-group-msg+.bt-group-msg:not([data-continuation]){margin-top:8px}
.bt-group-replies>.bt-event{padding-left:36px;font-size:12px;line-height:20px;color:var(--bt-ink-3)}
.bt-group-replies>.bt-activity{gap:12px;min-height:28px;font-size:13px;padding-top:4px}
.bt-group-replies>.bt-activity>.bt-mark{border-radius:0;clip-path:none;background:none;overflow:visible}
.bt-group-replies>.bt-activity .bt-mark-img{border-radius:50%}
.bt-work-card{display:flex;align-items:center;gap:12px;margin:0 0 0 36px;padding:12px 14px;border:1px solid var(--bt-line);border-radius:16px;corner-shape:round;background:color-mix(in srgb,var(--bt-ink) 2%,var(--bt-main));color:var(--bt-ink-2);text-align:left;cursor:pointer;font:inherit;min-width:0;transition:background-color .15s ease,border-color .15s ease}
.bt-work-card:hover{background:var(--bt-hover);border-color:var(--bt-line-2)}
.bt-work-copy{display:flex;flex:1;flex-direction:column;gap:3px;min-width:0;font-size:12px;line-height:18px}
.bt-work-copy strong{font-size:13px;font-weight:500;line-height:20px;color:var(--bt-ink)}
.bt-work-state{display:flex;width:20px;align-items:center;justify-content:center;color:var(--bt-ink-3)}
.bt-work-card[data-status=done] .bt-work-state{color:var(--bt-green)}
.bt-work-card[data-status=approval]{border-color:color-mix(in srgb,var(--bt-star) 28%,var(--bt-line))}
.bt-work-card[data-status=approval] .bt-work-state{color:var(--bt-star)}
.bt-work-card>svg:last-child{width:14px;height:14px;color:var(--bt-ink-3)}
.bt-work-card:focus-visible{outline:2px solid var(--bt-accent);outline-offset:2px}
[data-chat-flow-kind=tool-call]:has(.bt-group-replies),[data-chat-flow-kind=turn-trigger]:has(.bt-group-msg){margin-block:24px!important}
@media(max-width:600px){.bt-group-msg{column-gap:10px}.bt-work-card{margin-left:34px}.bt-group-replies>.bt-event{padding-left:34px}}
`

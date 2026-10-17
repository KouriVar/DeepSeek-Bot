// The default appearance follows the active Harness theme, including desktop
// vibrancy. Custom team themes still use their own palettes.
export const NATIVE_TOKENS = `
html body,html body[data-ds-dark-theme]{
--bt-ink:var(--dsw-alias-label-primary);--bt-ink-2:var(--dsw-alias-label-secondary);--bt-ink-3:var(--dsw-alias-label-tertiary);
--bt-main:var(--dsw-alias-bg-base);--bt-sidebar:var(--dsw-specific-sidebar-fill);--bt-card:var(--dsw-specific-input-major);--bt-bubble:var(--dsw-alias-bg-layer-2);
--bt-line:var(--dsw-alias-border-l1);--bt-line-2:var(--dsw-alias-border-l2);--bt-line-weak:var(--dsw-alias-border-l1);
--bt-hover:var(--dsw-alias-interactive-bg-hover);--bt-active:var(--dsw-alias-interactive-bg-hover);
--bt-accent:var(--dsw-alias-state-business-primary);--bt-accent-ink:var(--dsw-alias-label-primary-inverted);
--bt-user:var(--dsw-specific-bubble);--bt-user-ink:var(--dsw-alias-label-primary);
--bt-tag-bg:var(--dsw-alias-interactive-bg-hover);--bt-tag-ink:var(--dsw-alias-label-secondary);
--bt-danger:var(--dsw-alias-state-error-primary);--bt-green:var(--dsw-alias-state-success-primary);--bt-star:var(--dsw-alias-state-warn-primary)
}`

export const NATIVE_SHELL_CSS = `
.bt-side{padding:0 14px 8px 2px;font-family:inherit;gap:4px}
.bt-side-top{display:flex;flex-direction:column;align-items:stretch;padding:0 0 4px;gap:12px}
.bt-side-brand-row{display:flex;align-items:center;gap:8px;min-height:40px;margin-bottom:8px}
.bt-brand{padding:0 4px;gap:8px;font:inherit;font-weight:600}
.bt-brand-whale{color:var(--bt-ink)}
.bt-round{width:28px;height:28px;border:0;border-radius:var(--dsw-radius-sm,8px);background:none;color:var(--bt-ink-2)}
.bt-new-chat{display:flex;align-items:center;justify-content:center;gap:8px;min-height:38px;padding:8px 12px;border:.5px solid var(--bt-line-2);border-radius:var(--dsw-radius-md,12px);background:var(--bt-card);color:var(--bt-ink);font:inherit;font-size:14px;cursor:pointer}
.bt-new-chat:hover{background:var(--bt-hover)}
.bt-side-list-head{display:flex;align-items:center;justify-content:space-between;padding:0 6px;color:var(--bt-ink-3);font-size:12px;line-height:20px}
.bt-list{gap:4px}
.bt-row{min-height:36px;padding:7px 8px;gap:8px;border-radius:var(--dsw-radius-md,12px)}
.bt-row-name{line-height:22px}
.bt-row-preview{font-size:12px;line-height:18px}
.bt-nav-icon{position:relative;flex:none;display:inline-flex;align-items:center;justify-content:center;width:16px;height:20px;color:var(--bt-ink)}
.bt-nav-icon svg{width:16px;height:16px}
.bt-nav-icon[data-state=working]::after,.bt-nav-icon[data-state=alert]::after{content:'';position:absolute;right:-2px;bottom:0;width:5px;height:5px;border-radius:50%;background:var(--bt-green);box-shadow:0 0 0 1px var(--bt-sidebar)}
.bt-nav-icon[data-state=alert]::after{background:var(--bt-star)}
.bt-nav-role{margin-left:auto;font-size:11px;font-weight:400;color:var(--bt-ink-3);white-space:nowrap}
.bt-rail{padding:0 0 8px;gap:8px}
.bt-rail .bt-row{width:36px;min-height:36px;padding:7px 0}
.bt-rail .bt-nav-role{display:none}
.bt-agent-ava{width:16px;height:20px;background:none;border:0}
.bt-agent-ava svg{width:16px;height:16px}
[class*="_footArea"]{grid-template-columns:minmax(0,1fr);gap:4px;padding:8px 2px!important}
[class*="_footArea"]>[class*="_footerActions"]>div>.bt-connect-wrap,[class*="_footArea"]>[class*="_settingsArea"]{grid-column:1;order:initial;width:100%!important}
.bt-connect{justify-content:flex-start;gap:8px;padding:7px 8px;border:0;background:none;border-radius:var(--dsw-radius-md,12px);box-sizing:border-box;font:inherit;font-size:14px;line-height:22px}
.bt-connect svg{width:16px;height:16px}
.bt-connect:hover{background:var(--bt-hover)}
[class*="_triggerRow"]:has(.bt-account){margin:0!important;width:100%!important}
.bt-account{box-sizing:border-box;width:100%;min-height:36px;height:36px;align-items:center;gap:8px;padding:7px 8px;border-radius:var(--dsw-radius-md,12px);color:var(--bt-ink);font:inherit;font-size:14px;line-height:22px}
.bt-account:hover,.bt-account[aria-expanded=true]{background:var(--bt-hover)}
.bt-you{width:16px;height:20px;background:none;box-shadow:none;color:var(--bt-ink)}
.bt-you svg{width:16px;height:16px}
button:hover .bt-you,.bt-account[aria-expanded=true] .bt-you{background:none}
.bt-account-label{padding-right:8px}
[data-sidebar-collapsed] .bt-account{justify-content:center;padding:0;width:36px}
[data-sidebar-collapsed] .bt-account-label{display:none}
.bt-settings{border-radius:var(--dsw-radius-panel,16px);box-shadow:var(--dsw-elevation-soft);background:var(--bt-main)}
.bt-settings-nav{background:var(--bt-sidebar)}
.bt-settings-item{min-height:36px;font-size:14px}
.bt-settings-head h2{font-size:18px;line-height:26px}
:is(.bt-round,.bt-new-chat,.bt-row,.bt-connect,.bt-account,.bt-pill):focus-visible{outline:2px solid var(--bt-accent);outline-offset:-2px}
`

export const NATIVE_CONVERSATION_CSS = `
.bt-head{justify-content:flex-start;height:36px}
.bt-pill{height:32px;padding:4px 8px;gap:8px;border:0;border-radius:var(--dsw-radius-sm,8px);box-shadow:none;background:none;max-width:calc(100% - 48px)}
.bt-pill:hover{background:var(--bt-hover)}
.bt-pill:active{transform:none}
.bt-header-symbol{display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;color:var(--bt-ink-2)}
.bt-header-symbol svg{width:18px;height:18px}
.bt-head-side{right:0;top:2px}
.bt-astack{width:100%;gap:12px}
.bt-msg,.bt-astack[data-lead]>.bt-msg{max-width:100%;width:100%}
.bt-msg-line{width:100%;align-items:flex-start}
.bt-msg{padding-bottom:20px}
.bt-msg-line>.bt-tools{left:auto;right:0;bottom:-22px;top:auto;transform:none}
.bt-msg-line>.bt-bubble{flex:1;padding:4px 0;border:0;border-radius:0;background:none;line-height:1.7}
.bt-msg-tools{align-self:flex-end}
.bt-bubble [class*="_markdown"]>*+*{margin-top:14px}
.bt-ubody{border-radius:var(--dsw-radius-md,12px);padding:10px 16px;line-height:1.6}
.bt-plus{border-radius:var(--dsw-radius-sm,8px);background:none;box-shadow:none}
[data-composer-placeholder]{inset:4px 8px auto 14px!important}
.bt-icon-btn{border-radius:var(--dsw-radius-sm,8px)}
`

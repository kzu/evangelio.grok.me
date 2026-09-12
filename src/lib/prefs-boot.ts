export const THEME_KEY = "evangelio-theme";
export const SCALE_KEY = "evangelio-text-scale";
export const FAMILY_KEY = "evangelio-edition";
export const SCALES = [0.875, 1, 1.125, 1.25] as const;
export const SCALE_VALUES = SCALES.map(String);
export const THEME_COLOR = { light: "#f4ead6", dark: "#0a0806" } as const;

export const PREFS_BOOT_SCRIPT = `(function(){try{window.__pwa=window.__pwa||{deferred:null};if(!window.__pwa._bound){window.__pwa._bound=1;window.addEventListener("beforeinstallprompt",function(e){e.preventDefault();window.__pwa.deferred=e;window.dispatchEvent(new Event("pwa-deferred"));});window.addEventListener("appinstalled",function(){window.__pwa.deferred=null;});}var t=localStorage.getItem("${THEME_KEY}");if(t==="dark"||(t!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches)){document.documentElement.classList.add("dark")}var s=localStorage.getItem("${SCALE_KEY}");if(s&&${JSON.stringify(SCALE_VALUES)}.indexOf(s)!==-1){document.documentElement.style.setProperty("--text-scale",s)}var p=location.pathname;if((p==="/"||p.indexOf("/e/")===0)&&localStorage.getItem("${FAMILY_KEY}")==="family"){var u=new URL(location.href);var f=u.searchParams.get("familia");if(f!=="1"&&f!=="true"){u.searchParams.set("familia","1");location.replace(u.toString())}}}catch(e){}})();`;

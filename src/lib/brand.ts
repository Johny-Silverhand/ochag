export const APP_NAME = "RestoPro";
export const APP_VERSION = "1.0";
export const APP_BUILD = "2026.09.14";
/** Internal slug: Neon `ops_state` id, env prefixes (`OCHAG_*`), repo. Do not rename — that would reset live data. */
export const APP_SLUG = "ochag";
export const NETWORK_NAME = "RestoPro";
/** User-visible download / PDF file prefix. */
export const DOWNLOAD_SLUG = "restopro";
/** Public production origin. Legacy `*-theta` hosts stay in APP_ORIGIN_ALIASES. */
export const APP_ORIGIN = "https://restopro.vercel.app";
export const APP_HOST = "restopro.vercel.app";
/** Same deployment; previous Vercel aliases until DNS/project rename catches up. */
export const APP_ORIGIN_ALIASES = [
  APP_ORIGIN,
  "https://restopro-theta.vercel.app",
  "https://ochag-theta.vercel.app",
] as const;
export const LOGIN_INTRO =
  "Контур склада, смен и прибыли для кафе и ресторана. Свой логин — форма ниже; если открываете сеть впервые, загляните в «Что это?».";
export const VENDOR_NAME = "Arach.tech";
export const VENDOR_LINE = "Разработано Arach.tech";
export const VENDOR_URL = "https://arach.tech";
export const LABS_NAME = VENDOR_NAME;
export const LABS_LINE = VENDOR_LINE;
export const LABS_RIGHTS = "Все права защищены";
export const LABS_YEAR = 2026;
export const LABS_CREDIT = VENDOR_LINE;
export const LABS_COPYRIGHT = `© ${LABS_YEAR} ${APP_NAME}. ${LABS_RIGHTS}.`;
export const INSTALL_DIR_DEFAULT = "C:\\Program Files\\RestoPro";
export const SETUP_EXE = "RestoPro Setup.exe";
export const APP_EXE = "RestoPro.exe";

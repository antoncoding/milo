export const CONFIG = {
  litellm_base_url: "https://milo-litellm.up.railway.app",
  website_url: "https://milomilo.work/",
  default_model: "gpt-4o-mini"
} as const;

export type AppConfig = typeof CONFIG;
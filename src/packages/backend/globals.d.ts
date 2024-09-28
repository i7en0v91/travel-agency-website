declare module 'process' {
  global {
    namespace NodeJS {
      interface ProcessEnv {
        CMS: string,
        ACSYS_SECRET: string,
        ACSYS_ADMIN_USER_PASSWORD: string,
        ACSYS_STANDARD_USER_PASSWORD: string,
        ACSYS_VIEWER_USER_PASSWORD: string,
        DATABASE_URL: string,
        APP_ADMIN_PWD: string,
        APP_SECONDARYUSER_PWD: string
      }
    }
  }
}

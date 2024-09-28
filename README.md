
# Travel Agency website
A sample SPA/SSR application built with reactive framework [Vue 3](https://github.com/vuejs) powered by [Nuxt](https://github.com/Nuxt) ecosystem. Figma [Golobe](https://www.figma.com/community/file/1182308758714734501) design was used as an example. This project may be useful for anyone who is interested in developing modern websites.

https://github.com/user-attachments/assets/9ff4fafd-f0ba-4637-a08e-5bd162eb816c

## Features
- Single-Page application with Server-Side Rendering
- Authentication via third-party OAuth providers
- Support different databases
- Localization to multiple languages
- OpenGraph images for SEO - prerendered or generated on-the-fly for dynamic entities
- [Acsys CMS](https://github.com/acsysio/acsys) - out-of-the-box CMS integration with drafts/preview mode support
- HTML pages & images caching, configurable cache refresh policies on changes (e.g. via CMS)
- UI: adaptive layout, light/dark theme support, input/selected values validation & prompting
- Personal account with email confirmation registration flow, reviews, photos uploading, favourites & booking history
- PDF generation for ticket/booking documents
- Advanced error handling: error page / popup notification / HTML error stub on problematic component depending on source and severity of error as well as additional logging on server-side and on client-side (via REST endpoint)

## Installation
Project requires [Node.js](https://nodejs.org/) v20+ to be installed. 
(it should also run on Node v18 but was not tested in that configuration)

### Without CMS (default)

Install the dependencies and run server.

```sh
cd ./src
npm install
npm run quickstart
```

This will start the website with minimum external services configuration: emailing disabled, no CAPTCHA, only local OAuth provider e.t.c. SQLite database will be created locally. 
Open browser and type `http://localhost:3000`.  First-time page visit will take a couple of minutes to start the server because of initial database data seeding

### With Acsys CMS

You will need to download Acsys sources, enable CMS in project config and then proceed with quickstart build as described previously. The following script can be used:

```sh
git clone https://github.com/acsysio/acsys.git ./externals/acsys
cd ./externals/acsys
npm install
cd ./../../src

# Now edit src/packages/backend/.env file and uncomment #CMS=acsys first line

npm install
npm run quickstart
```

After server is started CMS will be available at `http://localhost:9000`. Admin login and password should be already pre-filled, if not - use this one `cms_admin / P@sSw0rD`. ***You'll need to wait until*** Nuxt app is initialized in your browser and ***landing page is fully loaded before visiting Acsys main page***. This is because the cms requires some domain configuration (entities, views, e.t.c) and this is done during the very first HTTP request reaching Nitro server.
Almost any type of entities are available for editing, but some operations may be restricted or won't take any effect for a couple of auto-generated entities or fields whose modifications should trigger non-trivial app logic.
**NOTE**: by default SSR caches rendered html page markup in Nitro cache, so changes made in CMS won't be immediately reflected in browser even when reloading with browser-side caching disabled. 10 minute-interval refresh task is running in background on server. Not to wait for 10 minutes you should either disable caching in `src/packages/shared/appconfig.ts` or call POST /api/purge-cache API endpoint

## Setting up development environment
Development mode provides many useful things among which are hot module reload and rich and more meaningful stack traces. It also assumes reduced optimization and performance penalty for diagnostics overhead. This demo project is also configured differently when running in development environment. Here are required steps:
- Setup MariaDB database. To be sure, that all development scripts & migrations are compatible and won't fail at build stage use MariaDB Server version 10.6.18, protocol 10. If you decide to use another database, you will probably have to adjust *.SQL migration scripts to match syntax specific to that database.
  - Install and run MariaDB instance
  - Copy and edit in some text editor SQL statements from `src/packages/backend/scripts/mysql-db-config.sql`. You will need to replace `IDENTIFIED BY '***'` with password of new `golobe` db-user which will be used to connect to the database. **NOTE**, this script will reset MariaDB server's time zone to UTC
  - Login as root user and run SQL statements 
  - Update and uncomment `DATABASE_URL` in `src/packages/backend/.env` with connection string `DATABASE_URL=mysql://golobe:YOUR_PASSWORD@localhost/golobe`. Connection via Unix sockets should also work, e.g. `DATABASE_URL="mysql://golobe:YOUR_PASSWORD@localhost/golobe?socket=/var/run/mysqld/mysqld.sock"` (check where precicely mysqld.sock file is located on your distributive)
- Setup SMTP server. [Nodemailer](https://github.com/nodemailer/nodemailer) client is used for sending registration & account-related emails, so Nodemailer server app will work.
  - Fill `SMTP_USERNAME` and `SMTP_PASSWORD` in `src/packages/backend/.env` for client to authenticate itself
  - Specify SMTP server connection parameters in `src/packages/shared/appconfig.ts` email section
- Obtain GitHub & Google OAuth providers secrets and paste them into `OAUTH_GITHUB_CLIENT_ID`, `OAUTH_GITHUB_CLIENT_SECRET`, `OAUTH_GOOGLE_CLIENT_ID`, `OAUTH_GOOGLE_CLIENT_SECRET`. These are disabled in quickstart configuration, so you may also disable them from code as well for development environment and proceed without OAuth client registrations
- Configure reCAPTCHA v3 as [described](https://www.google.com/recaptcha/admin/create). You will be able to fill `GOOGLE_RECAPTCHA_SECRETKEY` and `VITE_GOOGLE_RECAPTCHA_PUBLICKEY` in `src/.env`
- Configure maps provider. [Vue Yandex Maps](https://github.com/yandex-maps-unofficial/vue-yandex-maps) is supported out-of-the box. You need to obtain Api key and paste it in `VITE_YANDEX_MAPS_API_KEY` in `src/.env`. You may also disable this feature entirely by manually setting to `false` maps's config section in `src/packages/shared/appconfig.ts`

After infrastructure is ready, execute the following lines:

```sh
cd ./src
npm install
npm run prisma:generate-migration-scripts —workspace=@golobe-demo/backend
npm run prisma:generate-client —workspace=@golobe-demo/backend
npm run dev
```

## Architecture

![travel-agency-demo](https://github.com/user-attachments/assets/5605a97d-487f-4311-bc60-f75ea1fedd04)

## Tech
Project uses a number of open source projects to work properly:
- [Nuxt](https://github.com/Nuxt) - highly customizable web application server which provides easy integration with third-party solutions & plugins. E.g. some of used modules are:
  - [i18n](https://github.com/nuxt-modules/i18n) - for localization
  - [Nuxt Auth](https://github.com/sidebase/nuxt-auth) - for authentication & authorization
  - [Unlighthouse](https://github.com/harlan-zw/unlighthouse) - for performing site quality scan using Google Lighthouse
  - [Nuxt SEO](https://github.com/harlan-zw/nuxt-seo) - the complete SEO solution for Nuxt
  - [Nuxt Swiper](https://github.com/cpreston321/nuxt-swiper) - integration with [Swiper.js](https://github.com/nolimits4web/swiper) - mobile touch slider with hardware accelerated transitions and amazing native behavior
- [Vue 3](https://github.com/vuejs) - progressive, incrementally-adoptable JavaScript framework for building UI on the web
- [Vite](https://github.com/vitejs) - Next generation frontend tooling. It's fast!
- [node.js](https://github.com/nodejs) - evented I/O for the backend
- [Prisma](https://github.com/prisma)
- ORM solution to support different databases
- [Pinia](https://github.com/vuejs/pinia) - intuitive, type safe and flexible Store for Vue
- [Nodemailer](https://github.com/nodemailer/nodemailer) - for sending emails
- [Playwright](https://github.com/microsoft/playwright) - for Web Testing and Automation
- [Winston](https://github.com/winstonjs/winston) - for logging
- [Nuxt OgImage](https://github.com/nuxt-modules/og-image) - for generating OpenGraph images for entities on-the-fly using [Satori](https://github.com/vercel/satori)
- [Vue Yandex Maps](https://github.com/yandex-maps-unofficial/vue-yandex-maps) - for marking hotel locations on interactive world map
- [PDFKit](https://github.com/foliojs/pdfkit) - A JavaScript PDF generation library for Node and the browser
- Other third-party UI components:
  - [CropperJS](https://github.com/fengyuanchen/cropperjs) - for uploading photos
  - [VCalendar](https://github.com/nathanreyes/v-calendar) - An elegant calendar and date picker plugin for Vuejs
  - [Vue Final Modal](https://github.com/vue-final/vue-final-modal) - for managing modal windows
  - [Floating Vue](https://github.com/Akryum/floating-vue) - for popups & drop downs
  - [Vue Toastification](https://github.com/Maronato/vue-toastification) - for notifications
  - [Vuelidate](https://github.com/vuelidate/vuelidate) - for user input validation
  - [TipTap](https://github.com/ueberdosis/tiptap) - The headless rich text editor, was used for creating user reviews
  - [vue3-perfect-scrollbar](https://github.com/mercs600/vue3-perfect-scrollbar) - A minimalistic yet powerful Vue.js wrapper for [Perfect Scrollbar](https://perfectscrollbar.com)

## License

MIT


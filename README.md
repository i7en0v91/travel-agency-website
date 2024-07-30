
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

# Now edit .env file and uncomment #CMS=acsys first line

npm install
npm run quickstart
```

After server is started CMS will be available at `http://localhost:9000`, admin login and password should be already pre-filled.
Almost any type of entities are available for editing, but some operations may be restricted or won't take any effect for a couple of auto-generated entities or fields whose modifications should trigger non-trivial app logic.
**NOTE**: by default SSR caches rendered html page markup in Nitro cache, so changes made in CMS won't be immediately reflected in browser even when reloading with browser-side caching disabled. 10 minute-interval refresh task is running in background on server. Not to wait for 10 minutes you should either disable caching in project config [here](https://github.com/i7en0v91/travel-agency-website/blob/10037865c9da947be8056151e84600e2d40c3f72/src/appconfig.ts#L11) or call POST /api/purge-cache API endpoint


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


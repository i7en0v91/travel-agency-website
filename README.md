# Travel Agency website
A sample SPA/SSR application built with reactive framework [Vue 3](https://github.com/vuejs) powered by [Nuxt](https://github.com/Nuxt) ecosystem. Figma [Golobe](https://www.figma.com/community/file/1182308758714734501) design was used as an example. This project may be useful for anyone who is interested in developing modern websites.

## Features
- Single-Page application with Server-Side Rendering
- Localization to different languages
- Personal account registration flow with email confirmation
- Authentication via third-party OAuth providers
- Support different databases
- UI: adaptive layout, light/dark theme support
- Advanced error handling: error page / popup notification / HTML error stub on problematic component depending on source and severity of error as well as additional logging on server-side and on client-side (via REST endpoint)

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
- [Prisma](https://github.com/prisma) - ORM solution to support different databases
- [Pinia](https://github.com/vuejs/pinia) - intuitive, type safe and flexible Store for Vue
- [Nodemailer](https://github.com/nodemailer/nodemailer) - for sending emails
- [Playwright](https://github.com/microsoft/playwright) - for Web Testing and Automation
- [Winston](https://github.com/winstonjs/winston) - for logging
- [Nuxt OgImage](https://github.com/nuxt-modules/og-image) - for generating OpenGraph images for entities on-the-fly using [Satori](https://github.com/vercel/satori)
- Other third-party UI components:
  - [CropperJS](https://github.com/fengyuanchen/cropperjs) - for uploading photos
  - [VCalendar](https://github.com/nathanreyes/v-calendar) - An elegant calendar and date picker plugin for Vuejs
  - [Vue Final Modal](https://github.com/vue-final/vue-final-modal) - for managing modal windows
  - [Floating Vue](https://github.com/Akryum/floating-vue) - for popups & drop downs
  - [Vue Toastification](https://github.com/Maronato/vue-toastification) - for notifications
  - [Vuelidate](https://github.com/vuelidate/vuelidate) - for user input validation
  - [TipTap](https://github.com/ueberdosis/tiptap) - The headless rich text editor, was used for creating user reviews

## Installation

Project requires [Node.js](https://nodejs.org/) v20+ to be installed. 
(it should also run on Node v18 but was not tested in that configuration)

Install the dependencies and run server.

```sh
cd ./src
npm install
npm run quickstart
```

This will start the website with minimum external services configuration: emailing disabled, no CAPTCHA, only local OAuth provider e.t.c. SQLite database will be created locally. 
Open browser and type `http://localhost:3000`.  First-time visit will take time because of initial database data seeding

## License

MIT


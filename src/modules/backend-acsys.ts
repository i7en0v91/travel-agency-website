import { defineNuxtModule, useLogger } from '@nuxt/kit';
import { type ConsolaInstance } from 'consola';
import { readdirSync, existsSync, rmSync, mkdirSync, cpSync, readFileSync, writeFileSync } from 'fs';
import { lookupKeyByValueOrThrow } from '../shared/common';
import { AcsysFilesDir, AcsysSQLiteDbName, CmsType, isQuickStartEnv, isPublishEnv } from '../shared/constants';
import { join, resolve } from 'pathe';
import { execSync } from 'node:child_process';
import toPairs from 'lodash-es/toPairs';
import { type StorageDriverType, type IAcsysModuleOptions } from './../appconfig';
import { resolveParentDirectory } from './../server/utils/fs';

const DotEnvTemplate = "PORT=@PORT \r\n\
DATABASE_HOST=@DATABASE_HOST \r\n\
DATABASE=@DATABASE \r\n\
DATABASE_USERNAME=@DATABASE_USERNAME \r\n\
PASSWORD=@PASSWORD \r\n\
DATABASE_TYPE=@DATABASE_TYPE \r\n\
DEFAULT_PASSWORD=@DEFAULT_PASSWORD \r\n\
DEFAULT_USERNAME=@DEFAULT_USERNAME \r\n\
API_SECRET=@API_SECRET \r\n\
BUCKET=none \r\n\
TYPE=none \r\n\
PROJECT_ID=none \r\n\
PRIVATE_KEY_ID=none \r\n\
PRIVATE_KEY=none \r\n\
CLIENT_EMAIL=none \r\n\
CLIENT_ID=none \r\n\
AUTH_URI=https://accounts.google.com/o/oauth2/auth \r\n\
TOKEN_URI=https://accounts.google.com/o/oauth2/token \r\n\
AUTH_PROVIDER_X509_CERT_URL=https://www.googleapis.com/oauth2/v1/certs \r\n\
CLIENT_X509_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/service-account-email \r\n\
";
const ModuleName = 'backend-acsys';
type DbType = 'sqlite' | 'mysql';
type DbInfo = {
  userName: string,
  userPassword: string,
  dbName: string,
  dbHost: string
};

async function build(options: IAcsysModuleOptions, srcDir: string, logger: ConsolaInstance): Promise<void> {
  logger.debug(`[${ModuleName}] building...`);
  const execDir = join(srcDir, options.execDir);
  execSync(`npm install`, {
    cwd: execDir,
    env: {} as NodeJS.ProcessEnv
  });

  execSync(`npm run build`, {
    cwd: execDir
  });
  logger.debug(`[${ModuleName}] build completed`);
}

function getCurrentDbType(): DbType { 
  const isSqlite = isQuickStartEnv();
  return isSqlite ? 'sqlite' : 'mysql'; 
}

function parseDbConnectionString(connString: string, logger: ConsolaInstance) : DbInfo {
  let result: DbInfo;
  try {
    const tokens = connString.split('//')[1].split('@');
    const userCreds = tokens[0].split(':');
    const userName = userCreds[0];
    const userPassword = userCreds[1];

    let dbUrl = tokens[1];
    let dbHost: string;
    let dbName: string;
    if(dbUrl.includes('?')) {
      // it's a socket?
      dbUrl = dbUrl.split('?')[0];
    }
    if(dbUrl.includes('/')) {
      const tokens = dbUrl.split('/');
      dbHost = tokens[0];
      dbName = tokens[1];
    } else {
      dbHost = '0.0.0.0';
      dbName = dbUrl;
    }
    if(dbHost.toLowerCase() === 'localhost') {
      dbHost = '0.0.0.0';
    }

    result = {
      dbHost,
      dbName,
      userName,
      userPassword
    };
  } catch(err: any) {
    logger.error('failed to parse DB connection string', err);
    throw new Error('failed to parse DB connection string');
  }

  const values = toPairs(result);
  for(let i = 0; i < values.length; i++) {
    const propName = values[i][0];
    const propVal = values[i][1];
    if(!propVal?.trim()) {
      throw new Error(`acsys db [${propName}] conn string property is empty`);
    }
  }

  return result;
}

async function removeJsonSecretIfExists(options: IAcsysModuleOptions, srcDir: string, logger: ConsolaInstance): Promise<void> {
  logger.debug(`[${ModuleName}] removing json secret`);

  const execDir = join(srcDir, options.execDir);
  const secretFile = join(execDir, 'server', 'config', 'config.json');
  if(!existsSync(secretFile)) {
    logger.debug(`[${ModuleName}] original secret file on path=${secretFile} does not exist`);
    return;
  }
  logger.debug(`[${ModuleName}] removing previous secret file, path=${secretFile}`);
  rmSync(secretFile);

  logger.debug(`[${ModuleName}] json secret was removed`);
}

async function createdDotEnv(options: IAcsysModuleOptions, srcDir: string, logger: ConsolaInstance): Promise<void> {
  logger.debug(`[${ModuleName}] creating .env file`);  

  const dbType = getCurrentDbType();
  const dbInfo: DbInfo = dbType === 'mysql' ? parseDbConnectionString(process.env.DATABASE_URL ?? '', logger) : {
    dbHost: '0.0.0.0',
    dbName: 'golobe',
    userName: 'admin',
    userPassword: 'password'
  };

  const apiSecret = process.env.ACSYS_SECRET;
  if(!apiSecret) {
    logger.error(`[${ModuleName}] api secret is not specified, it must be passed in environment variables`);
    throw new Error('api secret not specified');
  }

  const defaultUserCred = toPairs(options.users).find(x => x[1].autoFillCredsOnLoginPage)?.[1];
  const fileContent = DotEnvTemplate
    .replace('@PORT', options.port.toString())
    .replace('@DATABASE_HOST', dbInfo.dbHost)
    .replace('@DATABASE', dbInfo.dbName)
    .replace('@DATABASE_USERNAME', dbInfo.userName)
    .replace('@PASSWORD', dbInfo.userPassword)
    .replace('@DATABASE_TYPE', dbType)
    .replace('@DEFAULT_USERNAME', defaultUserCred?.name ?? '')
    .replace('@DEFAULT_PASSWORD', defaultUserCred?.password ?? '')
    .replace('@API_SECRET', apiSecret);

  const execDir = join(srcDir, options.execDir);
  const dotEnvFile = join(execDir, '.env');
  writeFileSync(dotEnvFile, fileContent);

  logger.debug(`[${ModuleName}] .env file created`);
}

function rewriteSourceLine(srcFilePath: string, from: string, to: string) {
  let fileContent = readFileSync(srcFilePath, 'utf8');
  if(!fileContent.includes(from)) {
    throw new Error(`original src file does not include rewrite text, path=${srcFilePath}`); 
  }
  fileContent = fileContent.replace(from, to);
  writeFileSync(srcFilePath, fileContent);
}

async function rewriteStorages(driverType: StorageDriverType, options: IAcsysModuleOptions, srcDir: string, logger: ConsolaInstance): Promise<void> {
  logger.debug(`[${ModuleName}] rewriting storages, driverType=${driverType}`);

  const rewriteSrcFile = await join(srcDir, options.execDir, 'server', 'routes', 'index.js');
  if(!existsSync(rewriteSrcFile)) {
    throw new Error(`rewrite src file not found, path=${rewriteSrcFile}`); 
  }

  logger.debug(`[${ModuleName}] rewriting storage driver`);
  rewriteSourceLine(rewriteSrcFile, 
    "require('../storage-drivers/gcpstorage')",
    "require('../storage-drivers/localstorage')");


  logger.debug(`[${ModuleName}] rewriting data driver`);
  rewriteSourceLine(rewriteSrcFile, 
    "require('../data-drivers/firestoredb')", 
    "require('../data-drivers/mysqldb')");
  
  const dbType = getCurrentDbType();
  logger.debug(`[${ModuleName}] rewriting database to type=${dbType}`);
  rewriteSourceLine(rewriteSrcFile, 
    "await config.getDatabaseType()",
    `'${dbType}'`);
  rewriteSourceLine(rewriteSrcFile, 
    "process.env.DATABASE_TYPE === undefined",
    'true');
  
  logger.debug(`[${ModuleName}] storages rewritten, driverType=${driverType}, path=${rewriteSrcFile}`);
}

async function copyDistToExecDir(options: IAcsysModuleOptions, srcDir: string, logger: ConsolaInstance): Promise<void> {
  if([options.execDir, options.srcDir].some(p => !p)) {
    throw new Error('some acsys dir options are missed');
  }

  const execDir = join(srcDir, options.execDir);
  logger.debug(`[${ModuleName}] refreshing exec dir, path=${execDir}`);
  if(existsSync(execDir)) {
    const dirFiles = readdirSync(execDir);
    logger.debug(`[${ModuleName}] deleting content of exec dir, path=${execDir}`);
    for(let i = 0; i < dirFiles.length; i++) {
      const fileName = dirFiles[i];
      if(fileName === AcsysSQLiteDbName) {
        continue;
      }
      if(fileName === AcsysFilesDir) {
        continue;
      }
      rmSync(join(execDir, fileName), { force: true, recursive: true, maxRetries: 1 });
    }
  } else {
    if(getCurrentDbType() === 'sqlite') {
      logger.warn(`[${ModuleName}] Acsys directory does not exist while it is expected to contain SQLite db with table schemas, path=${execDir}. Was [npm run quickstart] executed?`);
    }
    mkdirSync(execDir);
  }

  const copyOptions = { recursive: true, errorOnExist: true, force: false, preserveTimestamps: true };
  const srcrDir = join(srcDir, options.srcDir);
  logger.debug(`[${ModuleName}] copying src to exec dir, path=${srcrDir}`);
  cpSync(srcrDir, execDir, copyOptions);
}

export default defineNuxtModule<IAcsysModuleOptions>({
  meta: {
    name: ModuleName,
    configKey: 'acsys',
    compatibility: { 
      nuxt: '3.12.4'
    },
    version: '1.0.0'
  },
  async setup (options, nuxt) {
    if(!process.env.CMS) {
      return;
    }
    
    const cmsType = lookupKeyByValueOrThrow(CmsType, process.env.CMS);
    if(cmsType !== CmsType.acsys) {
      return;
    }

    const logger = useLogger(ModuleName);

    const srcDir = resolveParentDirectory(resolve('./'), 'src');
    if(!srcDir) {
      logger.error(`[${ModuleName}] failed to resolve src dir`);
      throw new Error('failed to resolve src dir');
    }
    
    logger.debug(`[${ModuleName}] setup`);
    nuxt.hook('nitro:init', async () => {
      try {
        logger.info(`[${ModuleName}] preparing dist`);
        await copyDistToExecDir(options, srcDir, logger);
        if(!isPublishEnv()) {
          // for local development
          await rewriteStorages(options.storageDriver, options, srcDir, logger);
        }
        await createdDotEnv(options, srcDir, logger);
        await removeJsonSecretIfExists(options, srcDir, logger);
        logger.info(`[${ModuleName}] building...`);
        await build(options, srcDir, logger);
      } catch(err: any) {
        logger.error(`[${ModuleName}] unexpected exception on start`, err);
        throw err;
      }
    });
  }
});
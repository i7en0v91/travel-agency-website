import { type IAcsysOptions, isQuickStartEnv, isPublishEnv, lookupParentDirectory, AppConfig } from '@golobe-demo/shared';
import { type ChildProcess, execSync, spawn } from 'node:child_process';
import { loadConfig } from 'c12';
import { join, resolve } from 'pathe';
import { consola } from 'consola';
import { writeFile, readFile, cp, mkdir, rm, readdir, access } from 'fs/promises';
import toPairs from 'lodash-es/toPairs';

const ModuleName = 'backend-acsys';
const AcsysPort = AppConfig.acsys.port;
const AcsysHostUrl = process.env.PUBLISH ? `${AppConfig.siteUrl}:${AcsysPort}` : `http://localhost:${AcsysPort}`;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function log(msg: string, err?: any) {
  //consola.log(`[${ModuleName}] ${msg}`, err);
}

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

type DbType = 'sqlite' | 'mysql';
type DbInfo = {
  userName: string,
  userPassword: string,
  dbName: string,
  dbHost: string
};

async function build(execDir: string): Promise<void> {
  consola.log(`[${ModuleName}] building...`);
  //KB: to reduce chance of exception during build `npm install --include dev` should be run manually from acsys src folder
  execSync(`npm install --include dev`, {
    cwd: execDir
  });

  execSync(`npm run build -- --mode production`, {
    cwd: execDir
  });
  log(`build completed`);
}

function getCurrentDbType(): DbType { 
  const isSqlite = isQuickStartEnv();
  return isSqlite ? 'sqlite' : 'mysql'; 
}

function parseDbConnectionString(connString: string) : DbInfo {
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
    consola.error('failed to parse DB connection string', err);
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

async function removeJsonSecretIfExists(execDir: string): Promise<void> {
  log(`removing json secret`);

  const secretFile = join(execDir, 'server', 'config', 'config.json');

  try {
    await access(secretFile);
  } catch (err: any) {
    // presumably file does not exist
    log(`original secret file on path=${secretFile} does not exist`, err);
    return;
  }
  log(`removing previous secret file, path=${secretFile}`);
  await rm(secretFile);

  log(`json secret was removed`);
}

async function createdDotEnv(execDir: string): Promise<void> {
  const options = AppConfig.acsys;
  log(`creating .env file`);  

  const dbType = getCurrentDbType();
  const dbInfo: DbInfo = dbType === 'mysql' ? parseDbConnectionString(process.env.DATABASE_URL ?? '') : {
    dbHost: '0.0.0.0',
    dbName: 'golobe',
    userName: 'admin',
    userPassword: 'password'
  };

  const apiSecret = process.env.ACSYS_SECRET;
  if(!apiSecret) {
    consola.error(`[${ModuleName}] api secret is not specified, it must be passed in environment variables`);
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

  const dotEnvFile = join(execDir, '.env');
  await writeFile(dotEnvFile, fileContent);

  log(`.env file created`);
}

async function rewriteSourceLine(srcFilePath: string, from: string, to: string): Promise<void> {
  let fileContent = await readFile(srcFilePath, 'utf8');
  if(!fileContent.includes(from)) {
    throw new Error(`original src file does not include rewrite text, path=${srcFilePath}`); 
  }
  fileContent = fileContent.replace(from, to);
  await writeFile(srcFilePath, fileContent);
}

async function rewriteStorages(driverType: IAcsysOptions['storageDriver'], execDir: string): Promise<void> {
  log(`rewriting storages, driverType=${driverType}`);

  const rewriteSrcFile = await join(execDir, 'server', 'routes', 'index.js');
  try {
    await access(rewriteSrcFile);
  } catch (err: any) {
    // presumably file does not exist
    const msg = `rewrite src file not found, path=${rewriteSrcFile}`;
    consola.error(msg, err);
    throw new Error(msg); 
  }

  log(`rewriting storage driver`);
  await rewriteSourceLine(rewriteSrcFile, 
    "require('../storage-drivers/gcpstorage')",
    "require('../storage-drivers/localstorage')");


  log(`rewriting data driver`);
  await rewriteSourceLine(rewriteSrcFile, 
    "require('../data-drivers/firestoredb')", 
    "require('../data-drivers/mysqldb')");
  
  const dbType = getCurrentDbType();
  log(`rewriting database to type=${dbType}`);
  await rewriteSourceLine(rewriteSrcFile, 
    "await config.getDatabaseType()",
    `'${dbType}'`);
  await rewriteSourceLine(rewriteSrcFile, 
    "process.env.DATABASE_TYPE === undefined",
    'true');
  
  log(`storages rewritten, driverType=${driverType}, path=${rewriteSrcFile}`);
}

async function copyDistToExecDir(srcDir: string, execDir: string): Promise<void> {
  const options = AppConfig.acsys;
  let execDirExists = true;
  try {
    await access(execDir);
  } catch (err: any) {
    // presumably directory does not exist
    log(`exec dir was not found`, err);
    execDirExists = false;
  }

  if(execDirExists) {
    const dirFiles = await readdir(execDir);
    log(`deleting content of exec dir, path=${execDir}`);
    for(let i = 0; i < dirFiles.length; i++) {
      const fileName = dirFiles[i];
      if(fileName === options.dbName) {
        continue;
      }
      if(fileName === options.filesDir) {
        continue;
      }
      await rm(join(execDir, fileName), { force: true, recursive: true, maxRetries: 1 });
    }
  } else {
    if(getCurrentDbType() === 'sqlite') {
      consola.warn(`[${ModuleName}] Acsys directory does not exist while it is expected to contain SQLite db with table schemas, path=${execDir}. Was [npm run quickstart] executed?`);
    }
    await mkdir(execDir);
  }

  const copyOptions = { recursive: true, errorOnExist: true, force: false, preserveTimestamps: true };
  const srcrDir = join(srcDir, options.srcDir);
  log(`copying src to exec dir, path=${srcrDir}`);
  await cp(srcrDir, execDir, copyOptions);
}

async function prepareAcsysDist(srcDir: string, execDir: string): Promise<void> {
  log(`preparing dist...`);
  try {
    
    await copyDistToExecDir(srcDir, execDir);
    if(!isPublishEnv()) {
      // for local development
      await rewriteStorages(AppConfig.acsys.storageDriver, execDir);
    }
    await createdDotEnv(execDir);
    await removeJsonSecretIfExists(srcDir);
    await build(execDir);

  } catch(err: any) {
    consola.error(`[${ModuleName}] unexpected exception on start`, err);
    throw err;
  }
}

async function startAcsys(execDir: string): Promise<void> {
  consola.log(`[${ModuleName}] starting host on ${AcsysHostUrl} (in [${execDir}]) ...`);

  let cmsProc: ChildProcess | undefined;
  let started = false;

  try {
    cmsProc = spawn(`npm run start`, {
      cwd: execDir,
      shell: true,
      detached: true,
      stdio: 'ignore'
    });
  } catch(err: any) {
    try {
      const response = await fetch(AcsysHostUrl);
      if(response.ok) {
        started = true;
        consola.info(`[${ModuleName}] Acsys host was already running`);
      } else {
        consola.error(`[${ModuleName}] Acsys startup check fetch was unsuccessfull`);
      }
    } catch(ferr: any) {
      consola.error(`[${ModuleName}] failed to start Acsys host`, err);
      consola.error(`[${ModuleName}] Acsys startup fetch failed`, ferr);
      throw new Error('Acsys startup failed');
    }
  }

  try {
    const startedAt = (new Date()).getTime();
    const startTimeoutAt = startedAt + AppConfig.acsys.startupTimeoutMs;
    let lastError: any;
    while( (new Date()).getTime() < startTimeoutAt ) {
      try {
        const response = await fetch(AcsysHostUrl);
        if(response.ok) {
          started = true;
          break;
        }
      } catch(err: any) {
        lastError = err;
      }
  
      await new Promise((resolve) => {
        setTimeout(resolve, 500);
      });
    }
    if(!started) {
      if(lastError) {
        consola.error(`[${ModuleName}] Acsys startup failed with timeout and exception`, lastError);      
      } else {
        consola.error(`[${ModuleName}] Acsys startup failed with timeout`);      
      }
      throw new Error('Acsys  startup timeout');
    }
  } finally {
    try {
      if(cmsProc) {
        cmsProc.unref();
      }
    } catch(err: any) {
      consola.error(`[${ModuleName}] failed to unref CMS host process`, err);      
      // ignore
    }
  }

  consola.info(`[${ModuleName}] host started at ${AcsysHostUrl}`);
}

async function run () {
  await loadConfig({ dotenv: true });

  if((process.env.CMS?.toLowerCase() ?? '') !== 'acsys') {
    return;
  }

  try {
    const response = await fetch(AcsysHostUrl);
    if(response.ok) {
      consola.info(`[${ModuleName}] detected Acsys host already running at ${AcsysHostUrl}`);
      return;
    } 
  } catch(ferr: any) {
    log(`Acsys startup check fetch aws unsuccessfull`, ferr);
  }

  consola.log(`[${ModuleName}] configuring...`);
  const srcDir = await lookupParentDirectory(resolve('./'), 'src', async (path: string) => { await access(path); return true; });
  if(!srcDir) {
    const msg = 'failed to resolve [src] dir';
    consola.error(`[${ModuleName}] ${msg}`);
    throw new Error(msg);
  }
  const execDir = join(srcDir, AppConfig.acsys.execDir);

  await prepareAcsysDist(srcDir, execDir);
  await startAcsys(execDir);
}

run();

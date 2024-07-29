/**
 * Generates Prisma migration to autoupdate modifiedUtc column when table's row changes
 */

import { loadConfig } from 'c12';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'pathe';
import { SourceCollection } from './../server/backend/acsys/client/views';
import { isQuickStartEnv } from './../shared/constants';
import { template } from 'lodash';
import { consola } from 'consola';

// Directory containing prisma-related files for different databases
const PrismaDir = 'server/backend/prisma';

async function run () {
  await loadConfig({ dotenv: true });

  const isSqliteDb = isQuickStartEnv();
  consola.log(`generating Prisma migration for table timestamps (for ${isSqliteDb ? 'SQLite' : 'MySql'})...`);

  const createTriggerSqlTemplate = isSqliteDb ? 
`CREATE TRIGGER IF NOT EXISTS <%= tableName %>_TU_ModifiedTime AFTER UPDATE ON <%= tableName %> FOR EACH ROW BEGIN UPDATE <%= tableName %> SET "modifiedUtc"=datetime() WHERE "id"=NEW."id"; END;
CREATE TRIGGER IF NOT EXISTS <%= tableName %>_TI_ModifiedTime AFTER INSERT ON <%= tableName %> FOR EACH ROW BEGIN UPDATE <%= tableName %> SET "modifiedUtc"=datetime() WHERE "id"=NEW."id"; END;\r\n` : 
  'CREATE TRIGGER IF NOT EXISTS <%= tableName %>_TU_ModifiedTime BEFORE UPDATE ON golobe.<%= tableName %> FOR EACH ROW SET NEW.`modifiedUtc` = UTC_TIMESTAMP(3);\r\n';
  const compiled =  template(createTriggerSqlTemplate);

  const tableNames = Object.values(SourceCollection).map(k => k.split('_')[1]);
  let sql = '';
  for(let i = 0; i < tableNames.length; i++) {
    sql += compiled({ tableName: tableNames[i] });
  }
  
  const outputFile = join(PrismaDir, isSqliteDb ? 'sqlite' : 'mysql', 'migrations', '1_modified-utc', 'migration.sql');
  if(existsSync(outputFile)) {
    const currentSql = readFileSync(outputFile, { encoding: 'utf-8' });
    if(sql === currentSql) {
      return;
    }
  }
  if(!existsSync(dirname(outputFile))) {
    mkdirSync(dirname(outputFile), { recursive: true });
  }
  writeFileSync(outputFile, sql, { encoding: 'utf-8' });
}

run();

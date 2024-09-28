/**
 * Generates Prisma migration to create content views for Acsys CMS to be used as source collections
 */

import { loadConfig } from 'c12';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'pathe';
import { type  SourceCollection, type ViewConfig, ViewsConfig } from './../acsys/client/views';
import template from 'lodash-es/template';
import { AppConfig, isQuickStartEnv } from '@golobe-demo/shared';
import { consola } from 'consola';

// Directory containing prisma-related files for different databases
const PrismaDir = 'prisma';

const MySqlTemplates = {
  sqlTemplateCreateView: template(`CREATE OR REPLACE VIEW <%= viewName %> AS SELECT <%= columnNamesList %> FROM <%= sourceTableName %>;\r\n`),
  sqlTemplateSetNullIfEmptyTriggers: template(
`CREATE TRIGGER IF NOT EXISTS <%= sourceTableName %>_TU_Set<%= columnName %>NullWhenEmpty BEFORE UPDATE ON <%= sourceTableName %> FOR EACH ROW SET NEW.\`<%= columnName %>\` = NULLIF(NEW.\`<%= columnName %>\`, '');
CREATE TRIGGER IF NOT EXISTS <%= sourceTableName %>_TI_Set<%= columnName %>NullWhenEmpty BEFORE INSERT ON <%= sourceTableName %> FOR EACH ROW SET NEW.\`<%= columnName %>\` = NULLIF(NEW.\`<%= columnName %>\`, '');\r\n`
  ),
  /* non-compatible schema to prevent creating drafts for this entity */
  sqlTemplateCreateDraftsBlockingView: template(`CREATE TABLE \`acsys_<%= viewName %>\` ( \`dummy\` INT NOT NULL ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;\r\n`)
};

const SqliteTemplates = {
  sqlTemplateCreateView: template(`CREATE VIEW IF NOT EXISTS <%= viewName %> AS SELECT <%= columnNamesList %> FROM <%= sourceTableName %>;\r\n`),
  sqlTemplateUpdateView: template(`CREATE TRIGGER IF NOT EXISTS <%= viewName %>_TU_UpdateView INSTEAD OF UPDATE ON <%= viewName %> BEGIN UPDATE <%= sourceTableName %> SET <%= assignStatements %> WHERE <%= filterStatement %>; END;\r\n`),
  sqlTemplateInsertView: template(`CREATE TRIGGER IF NOT EXISTS <%= viewName %>_TI_InsertView INSTEAD OF INSERT ON <%= viewName %> BEGIN INSERT INTO <%= sourceTableName %>(<%= columnNamesList %>) VALUES(<%= columnValuesList %>); END;\r\n`),
  sqlTemplateDeleteView: template(`CREATE TRIGGER IF NOT EXISTS <%= viewName %>_TD_DeleteView INSTEAD OF DELETE ON <%= viewName %> BEGIN DELETE FROM <%= sourceTableName %> WHERE <%= filterStatement %>; END;\r\n`),
  /* non-compatible schema to prevent creating drafts for this entity */
  sqlTemplateCreateDraftsBlockingView: template(`CREATE TABLE "acsys_<%= viewName %>" ("id" INT NOT NULL);\r\n`)
};

function buildSqliteViewStatements(sourceCollection: SourceCollection, viewConfig: ViewConfig): string {
  const buildAssignStatements = (columns: ViewConfig['columnSettings'], triggerType: 'NEW' | 'OLD') => columns.map(c => c.setDbNullIfEmpty ? `"${c.name}"= NULLIF(${triggerType}."${c.name}",'')` : `"${c.name}"=${triggerType}."${c.name}"` ).join(', ');
  const buildColumnNamesList = (columns: ViewConfig['columnSettings']) => columns.map(c => `"${c.name}"`).join(', ');
  const buildColumnValuesList = (columns: ViewConfig['columnSettings']) => columns.map(c => c.setDbNullIfEmpty ? `NULLIF(NEW."${c.name}",'')` : `NEW."${c.name}"`).join(', ');

  const buildViewWithTriggersSqlStatements = (pViewName: string, pColumns: ViewConfig['columnSettings'], pSourceTableName: string): string => {
    const pColumnNamesList = pColumns.map(c => `"${c.name}"`).join(', ');
    let result = SqliteTemplates.sqlTemplateCreateView({ 
      viewName: pViewName, 
      columnNamesList: pColumnNamesList, 
      sourceTableName: pSourceTableName 
    });
    const pKeyColumnName = pColumns.find(c => c.isKey)!.name;
    const nonKeyColumns = pColumns.filter(c => !c.isKey);
    result += SqliteTemplates.sqlTemplateUpdateView({
      viewName: pViewName, 
      sourceTableName: pSourceTableName, 
      assignStatements: buildAssignStatements(nonKeyColumns, 'NEW'),
      filterStatement: `"${pKeyColumnName}"=NEW."${pKeyColumnName}"`
    });
    result += SqliteTemplates.sqlTemplateInsertView({
      viewName: pViewName, 
      sourceTableName: pSourceTableName, 
      columnNamesList: buildColumnNamesList(pColumns),
      columnValuesList: buildColumnValuesList(pColumns)
    });
    result += SqliteTemplates.sqlTemplateDeleteView({
      viewName: pViewName, 
      sourceTableName: pSourceTableName, 
      filterStatement: `"${pKeyColumnName}"=OLD."${pKeyColumnName}"`
    });
    return result;
  };

  const viewName = sourceCollection.valueOf();
  const sourceTableName = sourceCollection.split('_')[1];
  const columnSettings = viewConfig.columnSettings;
  
  let sql = buildViewWithTriggersSqlStatements(viewName, columnSettings, sourceTableName);
  if(viewConfig.draftsAllowed) {
    sql += buildViewWithTriggersSqlStatements(`acsys_${viewName}`, columnSettings, `${AppConfig.acsys.draftsEntityPrefix}${sourceTableName}`);
  } else {
    sql += SqliteTemplates.sqlTemplateCreateDraftsBlockingView({ viewName });
  }
  return sql;
}

function buildMySqlViewStatements(sourceCollection: SourceCollection, viewConfig: ViewConfig): string {
  const buildViewWithTriggersSqlStatements = (pViewName: string, pColumnNamesList: string, pSourceTableName: string, pSetNullIfEmptyColumns: string[]): string => {
    let result = MySqlTemplates.sqlTemplateCreateView({ 
      viewName: pViewName, 
      columnNamesList: pColumnNamesList, 
      sourceTableName: pSourceTableName 
    });
    for(let i = 0; i < pSetNullIfEmptyColumns.length; i++) {
      const columnName = pSetNullIfEmptyColumns[i];
      result += MySqlTemplates.sqlTemplateSetNullIfEmptyTriggers({ sourceTableName: pSourceTableName, columnName });
    }
    return result;
  };

  const viewName = sourceCollection.valueOf();
  const sourceTableName = sourceCollection.split('_')[1];
  const columnNamesList = viewConfig.columnSettings.map(c => `\`${c.name}\``).join(', ');
  const setNullIfEmptyColumns = viewConfig.columnSettings.filter(c => c.setDbNullIfEmpty).map(c => c.name);

  let sql = buildViewWithTriggersSqlStatements(viewName, columnNamesList, sourceTableName, setNullIfEmptyColumns);
  if(viewConfig.draftsAllowed) {
    sql += buildViewWithTriggersSqlStatements(`acsys_${viewName}`, columnNamesList, `${AppConfig.acsys.draftsEntityPrefix}${sourceTableName}`, setNullIfEmptyColumns);
  } else {
    sql += MySqlTemplates.sqlTemplateCreateDraftsBlockingView({ viewName });
  }
  return sql;
}

async function run () {
  await loadConfig({ dotenv: true });

  if((process.env.CMS?.toLowerCase() ?? '') !== 'acsys') {
    return;
  }

  const isSqliteDb = isQuickStartEnv();
  consola.log(`generating Prisma migration to create content views for Acsys (for ${isSqliteDb ? 'SQLite' : 'MySql'})...`);

  const viewConfigs = Array.from(ViewsConfig.entries());
  let sql = '';
  for(let i = 0; i < viewConfigs.length; i++) {
    sql += isSqliteDb ? buildSqliteViewStatements(viewConfigs[i][0], viewConfigs[i][1]) : buildMySqlViewStatements(viewConfigs[i][0], viewConfigs[i][1]);
  }
  
  const outputFile = join(PrismaDir, isSqliteDb ? 'sqlite' : 'mysql', 'migrations', '2_acsys-views', 'migration.sql');
  if(existsSync(outputFile)) {
    const currentSql = readFileSync(outputFile, 'utf-8');
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

/**
 * EXPORT TUTTI I MODELLI
 */

const User = require('./User');
const Corrispettivo = require('./Corrispettivo');
const FatturaAttiva = require('./FatturaAttiva');
const Costo = require('./Costo');
const Versamento = require('./Versamento');
const Chilometro = require('./Chilometro');
const AuditLog = require('./AuditLog');
const ScaglioneIrpef = require('./ScaglioneIrpef');
const SdiSyncLog = require('./SdiSyncLog');
const Documento = require('./Documento');

module.exports = {
  User,
  Corrispettivo,
  FatturaAttiva,
  Costo,
  Versamento,
  Chilometro,
  AuditLog,
  ScaglioneIrpef,
  SdiSyncLog,
  Documento,
};

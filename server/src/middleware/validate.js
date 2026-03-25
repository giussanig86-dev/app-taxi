/**
 * MIDDLEWARE VALIDAZIONE INPUT
 * Utilizza express-validator
 */

const { validationResult, body, param, query } = require('express-validator');
const AppError = require('../utils/AppError');

/**
 * Runner validazione - da usare alla fine della chain
 */
const runValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errori = errors.array().map(e => ({
      campo: e.path,
      messaggio: e.msg
    }));
    return res.status(400).json({
      status: 'fail',
      messaggio: 'Errore di validazione',
      errori
    });
  }
  next();
};

// ============ VALIDAZIONI AUTH ============

const validateLogin = [
  body('email').isEmail().withMessage('Email non valida').normalizeEmail(),
  body('password').notEmpty().withMessage('Password obbligatoria'),
  runValidation
];

const validateChangePassword = [
  body('passwordAttuale').notEmpty().withMessage('Password attuale obbligatoria'),
  body('nuovaPassword')
    .isLength({ min: 8 }).withMessage('Password minimo 8 caratteri')
    .matches(/[A-Z]/).withMessage('Password deve contenere almeno una maiuscola')
    .matches(/[0-9]/).withMessage('Password deve contenere almeno un numero'),
  runValidation
];

// ============ VALIDAZIONI CORRISPETTIVI ============

const validateCorrispettivo = [
  body('data').isISO8601().withMessage('Data non valida'),
  body('importo')
    .isFloat({ min: 0.01, max: 10000 })
    .withMessage('Importo deve essere tra 0.01 e 10.000'),
  body('metodoPagamento')
    .isIn(['contante', 'carta', 'pos', 'bonifico'])
    .withMessage('Metodo pagamento non valido'),
  body('descrizione')
    .optional()
    .isString()
    .isLength({ max: 200 })
    .withMessage('Descrizione max 200 caratteri'),
  body('note')
    .optional()
    .isString()
    .isLength({ max: 500 }),
  runValidation
];

// ============ VALIDAZIONI FATTURE ============

const validateFattura = [
  body('numeroFattura').notEmpty().withMessage('Numero fattura obbligatorio'),
  body('dataEmissione').isISO8601().withMessage('Data emissione non valida'),
  body('cliente.tipo')
    .isIn(['privato', 'azienda', 'pa'])
    .withMessage('Tipo cliente non valido'),
  body('imponibile')
    .isFloat({ min: 0 })
    .withMessage('Imponibile non valido'),
  body('totale')
    .isFloat({ min: 0 })
    .withMessage('Totale non valido'),
  runValidation
];

// ============ VALIDAZIONI COSTI ============

const validateCosto = [
  body('data').isISO8601().withMessage('Data non valida'),
  body('importo')
    .isFloat({ min: 0.01 })
    .withMessage('Importo deve essere positivo'),
  body('categoria')
    .isIn(['carburante', 'manutenzione', 'assicurazione', 'bollo', 'pedaggi', 'parcheggi', 'altro'])
    .withMessage('Categoria non valida'),
  body('tipoCosto')
    .isIn(['fattura_passiva', 'costo_manuale'])
    .withMessage('Tipo costo non valido'),
  body('descrizione')
    .optional()
    .isString()
    .isLength({ max: 500 }),
  runValidation
];

// ============ VALIDAZIONI VERSAMENTI ============

const validateVersamento = [
  body('tipoVersamento')
    .isIn([
      'irpef_acconto', 'irpef_saldo',
      'inps_acconto', 'inps_saldo',
      'imposta_sostitutiva_acconto', 'imposta_sostitutiva_saldo'
    ])
    .withMessage('Tipo versamento non valido'),
  body('importo')
    .isFloat({ min: 0.01 })
    .withMessage('Importo deve essere positivo'),
  body('dataScadenza').isISO8601().withMessage('Data scadenza non valida'),
  // Campi derivabili — opzionali (il controller li calcola automaticamente)
  body('anno').optional().isInt({ min: 2020, max: 2100 }).withMessage('Anno non valido'),
  body('categoriaFiscale').optional()
    .isIn(['irpef', 'inps', 'imposta_sostitutiva'])
    .withMessage('Categoria fiscale non valida'),
  body('tipoQuota').optional()
    .isIn(['acconto', 'saldo'])
    .withMessage('Tipo quota non valido'),
  runValidation
];

// ============ VALIDAZIONI CHILOMETRI ============

const validateChilometro = [
  body('anno').isInt({ min: 2020, max: 2100 }).withMessage('Anno non valido'),
  body('mese').isInt({ min: 1, max: 12 }).withMessage('Mese non valido'),
  body('kmTotali').isFloat({ min: 0 }).withMessage('Km totali non valido'),
  body('kmLavorativi').isFloat({ min: 0 }).withMessage('Km lavorativi non valido'),
  runValidation
];

// ============ VALIDAZIONI COMUNI ============

const validateObjectId = [
  param('id').isMongoId().withMessage('ID non valido'),
  runValidation
];

const validateAnno = [
  query('anno').optional().isInt({ min: 2020, max: 2100 }).withMessage('Anno non valido'),
  runValidation
];

module.exports = {
  runValidation,
  validateLogin,
  validateChangePassword,
  validateCorrispettivo,
  validateFattura,
  validateCosto,
  validateVersamento,
  validateChilometro,
  validateObjectId,
  validateAnno
};

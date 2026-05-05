const { Corrispettivo, Fattura, Costo, Versamento, User } = require('../models');
const calcoloFiscale = require('../services/calcoloFiscale');
const catchAsync = require('../utils/catchAsync');

exports.dashboardCliente = catchAsync(async (req, res) => {
  const userId = req.tenantUserId || req.user._id;
  const anno = parseInt(req.query.anno) || new Date().getFullYear();

  const [totaleCorrispettivi, totaleFatture, totaleCosti, andamentoMensile, breakdownMetodi, breakdownCosti, scadenzeVersamenti, versamentiScaduti, fattureScadute] = await Promise.all([
    Corrispettivo.totaleAnno(userId, anno),
    Fattura.totaleAnno(userId, anno),
    Costo.totaleAnno(userId, anno),
    Corrispettivo.andamentoMensile(userId, anno),
    Corrispettivo.breakdownMetodi(userId, anno),
    Costo.breakdownCategorie(userId, anno),
    Versamento.prossimeScadenze(userId, 60),
    Versamento.scaduti(userId),
    Fattura.fattureScadute(userId)
  ]);

  const user = await User.findById(userId);
  const ricavoLordo = totaleCorrispettivi.totale + totaleFatture.totale;

  const stima = user.regimeFiscale === 'ordinario'
    ? calcoloFiscale.calcolaOrdinario({
        ricavoLordo,
        totaleCosti: totaleCosti.totale,
        aliquotaINPS: user.aliquotaINPS,
      })
    : calcoloFiscale.calcolaForfettario({
        ricavoLordo,
        coefficienteRedditivita: user.coefficienteRedditivita,
        aliquotaForfettaria: user.aliquotaForfettaria,
        aliquotaINPS: user.aliquotaINPS,
      });

  res.status(200).json({
    status: 'success',
    data: {
      riepilogoAnnuale: {
        totaleCorrispettivi: totaleCorrispettivi.totale,
        numeroCorrispettivi: totaleCorrispettivi.count,
        totaleFatture: totaleFatture.totale,
        totaleCosti: totaleCosti.totale,
        ricavoLordo,
        regimeFiscale: user.regimeFiscale || 'forfettario',
        ...stima
      },
      andamentoMensile, breakdownMetodiPagamento: breakdownMetodi, breakdownCosti,
      prossimeScadenze: scadenzeVersamenti, versamentiScaduti, fattureScadute
    }
  });
});

exports.dashboardConsulente = catchAsync(async (req, res) => {
  const consulenteId = req.user._id;
  const clienti = await User.trovaClientiConsulente(consulenteId);
  const costiDaApprovare = await Costo.daApprovareConsulente(consulenteId);
  const anno = parseInt(req.query.anno) || new Date().getFullYear();

  const clientiRiepilogo = await Promise.all(
    clienti.map(async (cliente) => {
      const [corrispettivi, costi, versScaduti] = await Promise.all([
        Corrispettivo.totaleAnno(cliente._id, anno),
        Costo.totaleAnno(cliente._id, anno),
        Versamento.scaduti(cliente._id)
      ]);
      return {
        id: cliente._id, nome: cliente.nomeCompleto, email: cliente.email,
        regimeFiscale: cliente.regimeFiscale, fatturato: corrispettivi.totale,
        costi: costi.totale, versamentiScaduti: versScaduti.length
      };
    })
  );

  res.status(200).json({
    status: 'success',
    data: { totaleClienti: clienti.length, costiDaApprovare: costiDaApprovare.length, clientiRiepilogo, costiPendenti: costiDaApprovare }
  });
});

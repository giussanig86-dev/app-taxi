/**
 * UTILITA' DI FORMATTAZIONE
 */

const formatEuro = (amount) => {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount);
};

const formatData = (date) => {
  return new Intl.DateTimeFormat('it-IT').format(new Date(date));
};

const formatDataEstesa = (date) => {
  return new Intl.DateTimeFormat('it-IT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date(date));
};

module.exports = { formatEuro, formatData, formatDataEstesa };

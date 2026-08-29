export function toDate(value) {
  if (!value) return null;
  if (typeof value?.toDate === 'function') return value.toDate();
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}
export function addDays(value, days) {
  const date = toDate(value) || new Date();
  const result = new Date(date);
  result.setDate(result.getDate() + Number(days || 0));
  return result;
}
export function formatDate(value) {
  const date = toDate(value);
  if (!date) return 'Date unavailable';
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
export function expectedDeliveryDate(deliveryMode = 'NORMAL', baseDate = new Date()) {
  return addDays(baseDate, String(deliveryMode).toUpperCase() === 'SUPERFAST' ? 4 : 7);
}

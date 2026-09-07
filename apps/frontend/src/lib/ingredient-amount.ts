/** Format qty + unit for recipe display. Omits qty when unset. */
export function formatIngredientAmount(ing: {
  quantityMin?: number | null
  quantityMax?: number | null
  unitText?: string | null
  unit?: { symbol?: string } | null
}): string {
  const unit = (ing.unitText || ing.unit?.symbol || '').trim()
  const hasMin = ing.quantityMin != null && !Number.isNaN(ing.quantityMin)
  const hasMax = ing.quantityMax != null && !Number.isNaN(ing.quantityMax)

  let qty = ''
  if (hasMin && hasMax && ing.quantityMax !== ing.quantityMin) {
    qty = `${ing.quantityMin}–${ing.quantityMax}`
  } else if (hasMin) {
    qty = String(ing.quantityMin)
  } else if (hasMax) {
    qty = String(ing.quantityMax)
  }

  return [qty, unit].filter(Boolean).join(' ')
}

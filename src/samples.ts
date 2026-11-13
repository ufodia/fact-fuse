export const samples = {
  proposal: {source:'We can deliver up to 500 units by 2026-12-10.\nThe total price is $2,400. No additional fee applies.\nThe estimate is valid for 14 days. See https://example.com/terms.',rewrite:'We will deliver at least 500 units by 2026-12-10.\nThe total price is $2,900. An additional fee applies.\nThe estimate is valid for 14 days. See https://example.com/terms.',locked:['up to 500 units','No additional fee applies.']},
  clean: {source:'The total price is EUR 2,400.50.\nDelivery takes 14 days. See https://example.com/terms.',rewrite:'The total price is EUR 2.400,50.\nDelivery takes 14 days. See https://example.com/terms.',locked:['14 days']},
  turkish: {source:'Toplam tutar 1.234,50 TRY.\nEn fazla 20 ürün teslim edilir. Ek ücret yok.',rewrite:'Toplam tutar 1,234.50 TRY.\nEn az 20 ürün teslim edilir. Ek ücret var.',locked:['En fazla 20 ürün']}
};

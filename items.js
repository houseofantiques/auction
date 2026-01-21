"use strict";

/* =========================
   HOA Auction — items.js
   - 5 items (you can extend to 30)
   - Prices in IQD (numbers)
========================= */

const ITEMS = [
  {
    itemNo: 1,
    title: "عمل فني حجري للفنان الراحل منعم فرات",
    startPrice: 7500000,
    increment: 100000,
    imgId: "hoa-02-chair_iuorog",
  },
  {
    itemNo: 2,
    title: "لوحة أهوار العراق",
    startPrice: 3000000,
    increment: 300000,
    imgId: "hoa-art-044_twyquf",
  },
  {
    itemNo: 3,
    title: "عمل فني من البرونز — تكوين الإنسان",
    startPrice: 1650000,
    increment: 200000,
    imgId: "hoa-art-013_tb2uby",
  },
  {
    itemNo: 4,
    title: "مرآة عرضية مزخرفة",
    startPrice: 1500000,
    increment: 150000,
    imgId: "hoa-cry-121_u3dbvj",
  },
  {
    itemNo: 5,
    title: "مبخرة من الفضة — وزن 500 غرام",
    startPrice: 2750000,
    increment: 100000, // ⬅️ افتراضي مؤقت (غيريه إذا عندج رقم مختلف)
    imgId: "hoa-slv-202_qozp25",
  },
];

// للتأكد بالسريع
// console.log(ITEMS);

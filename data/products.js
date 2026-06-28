const categories = {
  watches: "ساعات",
  bags: "شنط وحقائب",
  perfumes: "عطور",
  watchAccessories: "مستلزمات ساعات",
  sports: "مستلزمات رياضية"
};

const brands = {
  watches: ["Rolex","Omega","Seiko","Casio","Fossil","Citizen","Tissot","Tag Heuer","Longines","Orient"],
  bags: ["Louis Vuitton","Gucci","Coach","Michael Kors","Prada","Chanel","Burberry","Tory Burch","Kate Spade","Fendi"],
  perfumes: ["Chanel","Dior","Versace","Armani","Hugo Boss","Calvin Klein","Tom Ford","Yves Saint Laurent","Givenchy","Paco Rabanne"],
  watchAccessories: ["Hirsch","Hadley Roma","Barton","Speidel","Vario","NATO","Clockwork Synergy","Condor","Alpine","Bonetto"],
  sports: ["Nike","Adidas","Under Armour","Puma","Reebok","New Balance","Asics","Mizuno","Saucony","Brooks"]
};

const watchModels = ["Submariner","Datejust","Speedmaster","Seamaster","SKX007","Presage","G-Shock","Pro Trek","Chronograph","Diver","Pilot","Field Watch","Dress Watch","Sport Classic","Heritage","Explorer","Aquaracer","Perpetual","Royal Oak","Constellation"];
const bagTypes = ["Tote Bag","Crossbody Bag","Clutch","Backpack","Shoulder Bag","Satchel","Hobo Bag","Bucket Bag","Top Handle Bag","Messenger Bag","Mini Bag","Flap Bag","Chain Bag","Zip Bag","Oversized Tote","Travel Bag","Work Bag","Evening Bag","Day Bag","Belt Bag"];
const perfumeTypes = ["No.5 EDP","Bleu de Parfum","Sauvage EDT","Eros Pour Homme","Acqua di Gio","CK One","Black Orchid","Libre EDP","L'Homme EDT","Invictus Aqua","La Vie est Belle","Scandal EDP","Good Girl","Olympéa EDP","Alien EDP","Mon Paris","Black Opium","Boss Bottled","Bloom","Flora Gorgeous"];
const watchAccTypes = ["سوار جلد 20mm","سوار NATO نايلون","سوار شبكي ستيل","سوار مطاط","سوار سيليكون","علبة ساعة خشب","جهاز تلييف ساعة","حقيبة سفر للساعات","أداة تغيير سوار","علبة عرض زجاجية","إطار بيزل","زجاج كريستال","تاج ساعة احتياطي","وسادة عرض ساعة","طقم تنظيف ساعات","حامل ساعة دوار","حافظة سفر","صندوق عرض كبير","حامل حركة الساعة","محول سوار"];
const sportsTypes = ["حذاء ركض","قفازات تدريب","أربطة مقاومة","حصيرة يوغا","زجاجة مياه رياضية","حقيبة جيم","شورت ضاغط","جوارب رياضية","عصابة رأس","عصابة معصم","حبل قفز","رول تدليك","ركبة داعمة","دعامة كاحل","طقم دمبل","بار شد","دولاب بطن","خوذة دراجة","نظارة سباحة","مضرب تنس"];

const colors = ["أسود","أبيض","بني","رمادي","أزرق","أحمر","أخضر","ذهبي","فضي","وردي","بيج","كريمي","برتقالي","بنفسجي","زيتي"];
const materials = ["جلد أصلي","جلد صناعي","ستانلس ستيل","تيتانيوم","سيراميك","نايلون","كانفاس","حرير","قطن","بوليستر"];

function rnd(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function generatePrice(category) {
  const ranges = { watches:[299,12999], bags:[199,8999], perfumes:[89,599], watchAccessories:[19,399], sports:[29,499] };
  const [mn, mx] = ranges[category];
  return rnd(mn, mx);
}

function generateProducts() {
  const products = [];
  let id = 1;
  const discounts = [0,0,0,5,10,15,20,25,30];

  const sets = [
    { cat:"watches", list:watchModels, count:200 },
    { cat:"bags", list:bagTypes, count:200 },
    { cat:"perfumes", list:perfumeTypes, count:200 },
    { cat:"watchAccessories", list:watchAccTypes, count:200 },
    { cat:"sports", list:sportsTypes, count:200 }
  ];

  sets.forEach(({cat, list, count}) => {
    const brandList = brands[cat];
    for (let i = 0; i < count; i++) {
      const brand = brandList[i % brandList.length];
      const type = list[i % list.length];
      const color = colors[rnd(0, colors.length-1)];
      const price = generatePrice(cat);
      const discount = discounts[rnd(0, discounts.length-1)];
      const originalPrice = discount > 0 ? Math.floor(price / (1 - discount/100)) : price;
      const suffix = i % 5 === 0 ? ` - ${materials[rnd(0,4)]}` : i % 3 === 0 ? ` - ${color}` : '';
      products.push({
        id: id++,
        name: `${brand} ${type}${suffix}`,
        brand,
        category: cat,
        categoryName: categories[cat],
        price,
        originalPrice,
        discount,
        rating: parseFloat((3.5 + Math.random() * 1.5).toFixed(1)),
        reviews: rnd(50, 5000),
        image: `https://picsum.photos/seed/${cat}${id}/400/400`,
        badge: discount >= 20 ? "خصم كبير" : discount > 0 ? "عرض خاص" : i < 5 ? "جديد" : "",
        inStock: Math.random() > 0.07,
        isPrime: Math.random() > 0.4,
        description: `منتج ${brand} ${type} بجودة عالية ومواصفات ممتازة، مناسب لجميع المناسبات.`
      });
    }
  });

  return products;
}

module.exports = { generateProducts, categories };

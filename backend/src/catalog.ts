export type CategoryId = 'produce'|'dairy'|'staples'|'spices'|'snacks'|'beverages'|'breakfast'|'personal'|'home'|'frozen';
export type Product = { id:string; name:string; baseName:string; brand:string; category:CategoryId; price:number; mrp:number; unit:string; emoji:string; stock:number; tags:string[]; featured:boolean; rating:number; };
export const categories: {id:CategoryId;label:string;emoji:string;color:string}[] = [
{id:'produce',label:'Fruits & Veggies',emoji:'🥑',color:'#e8f5db'},
{id:'dairy',label:'Dairy & Eggs',emoji:'🥛',color:'#e4f3fb'},
{id:'staples',label:'Grains & Staples',emoji:'🍚',color:'#f8edd8'},
{id:'spices',label:'Cooking & Spices',emoji:'🧂',color:'#fcead8'},
{id:'snacks',label:'Snacks',emoji:'🍿',color:'#fff1c9'},
{id:'beverages',label:'Beverages',emoji:'🥤',color:'#f9e3e6'},
{id:'breakfast',label:'Breakfast',emoji:'🥣',color:'#eee8fa'},
{id:'personal',label:'Personal Care',emoji:'🧴',color:'#f9e8ed'},
{id:'home',label:'Home Care',emoji:'🧹',color:'#e1f4f3'},
{id:'frozen',label:'Bakery & Frozen',emoji:'🍞',color:'#faeed9'}
];
type Seed = [name:string,emoji:string,price:number,unit:string,tags?:string];
const groups: Record<CategoryId,{brands:string[];items:Seed[]}> = {
 produce:{brands:['Farm Fresh','Nature Basket','Daily Harvest'],items:[
 ['Onion','🧅',40,'1 kg','pyaz'],['Tomato','🍅',45,'1 kg','tamatar'],['Potato','🥔',35,'1 kg','aloo'],['Garlic','🧄',35,'200 g','lahsun'],['Ginger','🫚',30,'200 g','adrak'],['Coriander Leaves','🌿',20,'1 bunch','dhaniya'],['Mint Leaves','🌿',25,'1 bunch','pudina'],['Lemon','🍋',30,'4 pcs','nimbu'],['Green Chilli','🌶️',22,'100 g','mirchi'],['Capsicum','🫑',55,'500 g','bell pepper'],['Carrot','🥕',45,'500 g','gajar'],['Cucumber','🥒',35,'500 g','kheera'],['Banana','🍌',55,'6 pcs','kela'],['Apple','🍎',130,'500 g','seb'],['Spinach','🥬',25,'1 bunch','palak'],['Broccoli','🥦',90,'250 g','broccoli']]},
 dairy:{brands:['Amul','Mother Dairy','Country Fresh'],items:[
 ['Toned Milk','🥛',32,'500 ml','milk doodh'],['Full Cream Milk','🥛',37,'500 ml','milk doodh'],['Curd','🥣',38,'400 g','dahi yogurt'],['Paneer','🧀',95,'200 g','cottage cheese'],['Butter','🧈',59,'100 g','makhan'],['Cheese Slices','🧀',110,'200 g','cheese'],['Mozzarella Cheese','🧀',145,'200 g','pizza cheese'],['Greek Yogurt','🥣',75,'150 g','yogurt'],['Fresh Cream','🥛',69,'200 ml','cream'],['Eggs','🥚',78,'6 pcs','anda'],['Buttermilk','🥛',25,'200 ml','chaas'],['Ghee','🧈',310,'500 ml','clarified butter']]},
 staples:{brands:['Fortune','India Gate','Daily Choice'],items:[
 ['Basmati Rice','🍚',155,'1 kg','chawal biryani rice'],['Sona Masoori Rice','🍚',96,'1 kg','chawal'],['Wheat Flour Atta','🌾',270,'5 kg','atta aata'],['Maida','🌾',55,'1 kg','refined flour'],['Poha','🥣',65,'500 g','flattened rice chiwda'],['Toor Dal','🫘',158,'1 kg','arhar lentils'],['Moong Dal','🫘',140,'1 kg','lentils'],['Chana Dal','🫘',105,'1 kg','lentils'],['Rajma','🫘',165,'500 g','kidney beans'],['Chickpeas','🫘',92,'500 g','chole kabuli chana'],['Sugar','🍬',53,'1 kg','chini'],['Salt','🧂',28,'1 kg','namak'],['Peanuts','🥜',75,'500 g','groundnut moongfali'],['Vermicelli','🍜',55,'400 g','seviyan']]},
 spices:{brands:['Everest','Catch','Kitchen King'],items:[
 ['Biryani Masala','🌶️',75,'100 g','biryani spice'],['Garam Masala','🌶️',80,'100 g','garam masala'],['Turmeric Powder','🟡',45,'100 g','haldi'],['Red Chilli Powder','🌶️',65,'100 g','lal mirch'],['Cumin Seeds','🌱',85,'100 g','jeera'],['Mustard Seeds','🌱',35,'100 g','rai sarson'],['Coriander Powder','🌿',54,'100 g','dhaniya powder'],['Black Pepper','🫙',105,'50 g','kali mirch'],['Oregano','🌿',75,'30 g','italian herb'],['Mixed Herbs','🌿',85,'30 g','italian seasoning'],['Pasta Sauce','🍝',110,'200 g','tomato pasta sauce'],['Tomato Ketchup','🍅',99,'500 g','sauce'],['Sunflower Oil','🫗',155,'1 L','cooking oil'],['Olive Oil','🫒',395,'500 ml','oil']]},
 snacks:{brands:['Haldirams','Bingo','SnackTime'],items:[
 ['Salted Chips','🍟',25,'50 g','potato chips'],['Roasted Makhana','🍿',89,'75 g','fox nuts'],['Namkeen Mix','🥨',65,'200 g','mixture'],['Salted Peanuts','🥜',45,'100 g','groundnuts'],['Popcorn','🍿',65,'100 g','popcorn'],['Chocolate Cookies','🍪',49,'100 g','biscuits'],['Marie Biscuits','🍪',35,'200 g','biscuits'],['Dark Chocolate','🍫',100,'80 g','chocolate'],['Protein Bar','🍫',95,'60 g','energy bar'],['Dry Fruits Mix','🥜',210,'200 g','nuts'],['Bhujia','🥨',65,'200 g','namkeen'],['Khakhra','🫓',90,'200 g','snack']]},
 beverages:{brands:['Real','Tropicana','Refresh'],items:[
 ['Orange Juice','🍊',115,'1 L','fruit juice'],['Apple Juice','🍎',120,'1 L','fruit juice'],['Mango Juice','🥭',105,'1 L','mango drink'],['Coconut Water','🥥',65,'200 ml','nariyal pani'],['Lemon Soda','🍋',45,'300 ml','nimbu soda'],['Cola','🥤',45,'500 ml','soft drink'],['Mineral Water','💧',25,'1 L','water'],['Green Tea','🍵',130,'25 bags','tea chai'],['Black Tea','🫖',95,'250 g','chai'],['Instant Coffee','☕',165,'100 g','coffee'],['Cold Coffee','☕',55,'200 ml','coffee'],['Energy Drink','⚡',115,'250 ml','energy']]},
 breakfast:{brands:['Kelloggs','Saffola','Morning Fresh'],items:[
 ['Rolled Oats','🥣',150,'500 g','oatmeal'],['Corn Flakes','🥣',165,'500 g','cereal'],['Muesli','🥣',199,'500 g','granola'],['Peanut Butter','🥜',190,'340 g','nut butter'],['Strawberry Jam','🍓',145,'300 g','jam'],['Honey','🍯',175,'250 g','shahad'],['Choco Spread','🍫',210,'200 g','spread'],['Upma Mix','🥣',75,'200 g','rava upma'],['Idli Mix','🍚',65,'200 g','idli batter'],['Pancake Mix','🥞',160,'300 g','pancake'],['Instant Noodles','🍜',55,'280 g','maggi noodles'],['Pasta','🍝',95,'500 g','macaroni penne']]},
 personal:{brands:['Dove','Mamaearth','PureCare'],items:[
 ['Onion Hair Oil','🧴',199,'150 ml','hair oil onion'],['Coconut Hair Oil','🥥',150,'200 ml','hair oil'],['Onion Shampoo','🧴',240,'250 ml','onion hair shampoo'],['Anti Dandruff Shampoo','🫧',190,'180 ml','shampoo'],['Face Wash','🧴',135,'100 ml','facial cleanser'],['Body Wash','🧼',180,'250 ml','body wash'],['Hand Wash','🧼',105,'250 ml','hand soap'],['Bath Soap','🧼',52,'100 g','soap'],['Toothpaste','🪥',105,'150 g','tooth paste'],['Toothbrush','🪥',59,'1 pc','brush'],['Deodorant','🌸',205,'150 ml','deo'],['Body Lotion','🧴',160,'200 ml','moisturizer']]},
 home:{brands:['Surf Excel','Lizol','HomePro'],items:[
 ['Laundry Detergent','🫧',220,'1 kg','washing powder'],['Fabric Softener','🧺',210,'500 ml','fabric conditioner'],['Dish Wash Liquid','🧽',110,'500 ml','dish soap'],['Floor Cleaner','🧹',165,'1 L','floor cleaning'],['Bathroom Cleaner','🚽',135,'500 ml','toilet cleaning'],['Tissue Roll','🧻',95,'2 rolls','paper'],['Kitchen Towels','🧻',120,'2 rolls','tissue'],['Garbage Bags','🗑️',100,'30 pcs','trash bag'],['Scrub Sponge','🧽',45,'3 pcs','scrubber'],['Air Freshener','🌸',150,'250 ml','room spray'],['Disinfectant Spray','🧴',180,'300 ml','sanitizer'],['Mosquito Repellent','🦟',110,'45 ml','mosquito']]},
 frozen:{brands:['Britannia','Harvest Gold','Fresho'],items:[
 ['Whole Wheat Bread','🍞',58,'400 g','brown bread'],['White Bread','🍞',48,'400 g','bread'],['Burger Buns','🍔',75,'4 pcs','bun'],['Pizza Base','🍕',85,'2 pcs','pizza'],['Garlic Bread','🥖',99,'200 g','garlic loaf'],['Frozen French Fries','🍟',125,'400 g','fries'],['Frozen Green Peas','🫛',95,'500 g','matar'],['Frozen Sweet Corn','🌽',95,'500 g','corn'],['Frozen Mixed Veg','🥕',105,'500 g','vegetable mix'],['Veg Momos','🥟',170,'10 pcs','dumpling'],['Frozen Paratha','🫓',125,'5 pcs','paratha'],['Ice Cream','🍨',165,'500 ml','dessert']]}
};
export const catalog: Product[] = Object.entries(groups).flatMap(([cat, group]) => group.items.flatMap(([name,emoji,price,unit,tags],i) => group.brands.map((brand,j) => {
 const id=`${cat}-${String(i+1).padStart(2,'0')}-${j+1}`;
 const p=Math.round(price*(0.95+0.065*j));
 return {id,name:`${brand} ${name}`,baseName:name,brand,category:cat as CategoryId,price:p,mrp:Math.round(p*1.16),unit,emoji,stock:22+(i*7+j*3)%70,tags:(tags||'').split(' ').concat(name.toLowerCase().split(' ')),featured:i<3,rating:Number((4.2+((i+j)%7)*0.1).toFixed(1))};
}))); 
export const categoryById=(id:string)=>categories.find(c=>c.id===id);

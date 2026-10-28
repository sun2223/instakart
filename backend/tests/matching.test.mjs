import test from 'node:test';
import assert from 'node:assert/strict';
import {catalog,categories} from '../dist/catalog.js';
import {canonical,contextCategories,rankProducts,parseDemoIntent,matchIngredients} from '../dist/matching.js';

test('catalog exceeds resume target across exactly ten categories',()=>{
 assert.ok(catalog.length>=280,`only ${catalog.length} products`);
 assert.equal(categories.length,10);
 assert.equal(new Set(catalog.map(p=>p.id)).size,catalog.length);
 assert.ok(catalog.every(p=>p.price>0&&p.mrp>=p.price&&p.stock>0));
});
test('biryani recipe identifies essential ingredients',()=>{
 const ingredients=parseDemoIntent('Mujhe biryani banana hai');
 assert.ok(ingredients.includes('basmati rice'));
 assert.ok(ingredients.includes('biryani masala'));
 assert.ok(ingredients.length<=8);
});
test('pasta ka saman works in deterministic Hinglish fallback',()=>{
 const result=matchIngredients(parseDemoIntent('pasta ka saman'),catalog,'pasta ka saman');
 assert.ok(result.items.length>=4);
 assert.equal(result.missingItems.length,0);
 assert.ok(result.items.every(x=>x.product.category!=='personal'));
});
test('onion for cooking never pulls onion personal care',()=>{
 const results=rankProducts('onion',catalog,contextCategories('biryani recipe'));
 assert.ok(results.length>0);
 assert.ok(results.every(x=>x.category==='produce'));
});
test('onion hair oil is treated as personal care product',()=>{
 const terms=parseDemoIntent('onion hair oil');
 const result=matchIngredients(terms,catalog,'onion hair oil');
 assert.equal(result.items.length,1);
 assert.equal(result.items[0].product.baseName,'Onion Hair Oil');
 assert.equal(result.items[0].product.category,'personal');
});
test('synonyms are normalized and match their intended categories',()=>{
 assert.equal(canonical('dahi'),'curd');
 const results=rankProducts('dahi',catalog);
 assert.equal(results[0].baseName,'Curd');
 assert.equal(results[0].category,'dairy');
});
test('category-aware missing result is explicit rather than fabricated',()=>{
 const m=matchIngredients(['unicorn pizza fruit'],catalog,'recipe for unicorn pizza fruit');
 assert.equal(m.items.length,0);
 assert.deepEqual(m.missingItems,['unicorn pizza fruit']);
});
test('candidate selection avoids adding three brands of same ingredient',()=>{
 const result=matchIngredients(['basmati rice','basmati rice','curd'],catalog,'biryani');
 assert.equal(result.items.length,2);
 assert.equal(new Set(result.items.map(x=>x.product.baseName)).size,2);
});
test('movie night demo prompt resolves real snacks',()=>{
 const result=matchIngredients(parseDemoIntent('Movie night snacks'),catalog,'Movie night snacks');
 assert.ok(result.items.length>=3);
});

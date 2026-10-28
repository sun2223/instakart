export type CategoryId='produce'|'dairy'|'staples'|'spices'|'snacks'|'beverages'|'breakfast'|'personal'|'home'|'frozen';
export type Product={id:string;name:string;baseName:string;brand:string;category:CategoryId;price:number;mrp:number;unit:string;emoji:string;stock:number;tags:string[];featured:boolean;rating:number};
export type Category={id:CategoryId;label:string;emoji:string;color:string};
export type User={id:string;name:string;email:string;address:string;preferences:{diet:'any'|'vegetarian'|'vegan';household:number;budget:'value'|'balanced'|'premium';upcomingFestival:string}};
export type OrderStatus='placed'|'picking'|'packed'|'out_for_delivery'|'delivered'|'cancelled';
export type Order={id:string;userId:string;clientOrderId:string;lines:{productId:string;name:string;emoji:string;unit:string;quantity:number;unitPrice:number}[];total:number;deliveryFee:number;status:OrderStatus;paymentMethod:'COD';address:string;createdAt:string;updatedAt:string;zap:boolean;etaMinutes:number};
export type AIItem={ingredient:string;product:Product;alternatives:Product[]};
export type Recommendation={product:Product;reason:string;kind:'replenishment'|'basket'|'discovery'|'occasion';urgency:number};

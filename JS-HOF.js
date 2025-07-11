// Online Javascript Editor for free
// Write, Edit and Run your Javascript code using JS Online Compiler

// console.log("Try programiz.pro");

const inventory = [
  { name: "asparagus", type: "vegetables", quantity: 9 },
  { name: "bananas", type: "fruit", quantity: 5 },
  { name: "goat", type: "meat", quantity: 23 },
  { name: "cherries", type: "fruit", quantity: 12 },
  { name: "fish", type: "meat", quantity: 22 },
];

const result = Object.groupBy(inventory, ({ quantity }) =>
  quantity < 6 ? "restock" : "sufficient",
);
// console.log(result.restock);

const resultGroupByType = Object.groupBy(inventory, (item) => item.type);
console.log(resultGroupByType);

// const resultQuantity = 
let arrAns = [];
for (let key in resultGroupByType){
    
    let ans = resultGroupByType[key].reduce((a,e)=> a+e.quantity,0);
    arrAns.push({category : key, quantity:ans});
    // console.log("Category", key, "Qty", ans)
}

console.log(arrAns);

const filteredAns = arrAns.filter((item) => item.category == "fruit" || item.category == "vegetables").sort((a,b)=>(b.quantity-a.quantity));
console.log(filteredAns);

// filteredAns.sort((a,b)=>(b.quantity-a.quantity))
// console.log(arrAns);

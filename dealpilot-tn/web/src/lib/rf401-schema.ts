export const RF401_SCHEMA = {
  required: ['buyer_names','seller_names','property','sale_price'],
  fields: {
    buyer_names: {type:'array', itemType:'string'},
    seller_names: {type:'array', itemType:'string'},
    property: {type:'object', props:{address:{type:'string'},county:{type:'string'}}},
    sale_price: {type:'number'},
    loan_type: {type:'string', enum:['conventional','FHA','VA','USDA','cash']}
  }
}

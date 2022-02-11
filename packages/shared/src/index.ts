export function isObject(value:unknown):boolean{
  return typeof value === 'object'&& value !== null
}
export function isFunction(value:unknown):boolean{
  return typeof value === 'function'
}
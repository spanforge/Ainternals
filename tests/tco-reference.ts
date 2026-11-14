// Independent interpreter for the approved workbook's formula subset.
// It reads only the committed OOXML extraction; it never imports application calculation code.
// No eval, Function, Excel cached values, or imported user text is executed.
type Cell = {value?: number|string; formula?: string};
export type Workbook = {modelVersion:string;sha256:string;sheets:Record<string,Record<string,Cell>>};
type Value = number|string|Value[];
type Expr = () => Value;
export function referenceWorkbook(book:Workbook, inputValues:Record<string,number|string>) {
  const cache = new Map<string,Value>();
  const active = new Set<string>();
  function cell(sheet:string,address:string):Value {
    address=address.replaceAll('$','');
    if(sheet==='Inputs'&&Object.hasOwn(inputValues,address))return inputValues[address];
    const id=sheet+'!'+address;
    if(cache.has(id))return cache.get(id)!;
    if(active.has(id))throw new Error('Circular workbook reference: '+id);
    active.add(id);
    const source=book.sheets[sheet]?.[address];
    if(!source)throw new Error('Missing source cell: '+id);
    const result=source.formula?parse(source.formula,sheet)():source.value??'';
    cache.set(id,result);active.delete(id);return result;
  }
  function parse(formula:string,sheet:string):Expr {
    const tokens:string[]=[];
    const tokenPattern=/\s*((?:(?:'[^']+'|[A-Za-z][A-Za-z0-9 -]*)!)?\$?[A-Z]+\$?\d+|"[^"]*"|\d+(?:\.\d+)?|[A-Z][A-Z0-9_]*|[()+*/^,:=<>-])/gy;
    let offset=0;
    while(offset<formula.length){tokenPattern.lastIndex=offset;const match=tokenPattern.exec(formula);if(!match)throw new Error('Unsupported workbook formula token: '+formula.slice(offset));tokens.push(match[1]);offset=tokenPattern.lastIndex;}
    let pos=0;
    const eat=(t:string)=>{if(tokens[pos]===t){pos++;return true;}return false;};
    const requireToken=(t:string)=>{if(!eat(t))throw new Error('Expected '+t+' in '+formula);};
    const resolve=(token:string)=>{const bang=token.indexOf('!');return bang<0?{sheet,address:token.replaceAll('$','')}:{sheet:token.slice(0,bang).replace(/^'|'$/g,''),address:token.slice(bang+1).replaceAll('$','')};};
    function primary():Expr {
      const t=tokens[pos++];
      if(t==='('){const expr=comparison();requireToken(')');return expr;}
      if(t==='-'){const rhs=primary();return ()=>-Number(rhs());}
      if(t?.startsWith('"'))return ()=>t.slice(1,-1);
      if(/^\d/.test(t))return ()=>Number(t);
      if(/^(SUM|IF|IFERROR)$/.test(t)){
        requireToken('(');const args=[comparison()];while(eat(','))args.push(comparison());requireToken(')');
        if(t==='IF')return ()=>Number(args[0]())?args[1]():args[2]();
        if(t==='IFERROR')return ()=>{try{return args[0]();}catch{return args[1]();}};
        const sumValue=(v:Value):number=>Array.isArray(v)?v.reduce<number>((sum,item)=>sum+sumValue(item),0):Number(v);
        return ()=>args.reduce((sum,a)=>sum+sumValue(a()),0);
      }
      if(t&&/\$?[A-Z]+\$?\d+$/.test(t)){
        const start=resolve(t);
        if(eat(':')){
          const end=resolve(tokens[pos++]);
          const a=/^([A-Z]+)(\d+)$/.exec(start.address)!, b=/^([A-Z]+)(\d+)$/.exec(end.address)!;
          if(a[1].length!==1||b[1].length!==1)throw new Error('Unsupported range');
          return ()=>{const values:Value[]=[];for(let c=a[1].charCodeAt(0);c<=b[1].charCodeAt(0);c++)for(let r=Number(a[2]);r<=Number(b[2]);r++)values.push(cell(start.sheet,String.fromCharCode(c)+r));return values;};
        }
        return ()=>cell(start.sheet,start.address);
      }
      throw new Error('Unsupported formula term: '+t);
    }
    function power():Expr {const a=primary();if(eat('^')){const b=power();return ()=>Number(a())**Number(b());}return a;}
    function product():Expr {let a=power();while(tokens[pos]==='*'||tokens[pos]==='/'){const op=tokens[pos++],left=a,right=power();a=()=>{const b=Number(right());if(op==='/'&&b===0)throw new Error('Division by zero');return op==='*'?Number(left())*b:Number(left())/b;};}return a;}
    function addition():Expr {let a=product();while(tokens[pos]==='+'||tokens[pos]==='-'){const op=tokens[pos++],left=a,right=product();a=()=>op==='+'?Number(left())+Number(right()):Number(left())-Number(right());}return a;}
    function comparison():Expr {const a=addition();const op=tokens[pos];if(['=','>','<'].includes(op)){pos++;const b=addition();return ()=>Number(op==='='?a()===b():op==='>'?Number(a())>Number(b()):Number(a())<Number(b()));}return a;}
    const expr=comparison();if(pos!==tokens.length)throw new Error('Unconsumed formula: '+formula);return expr;
  }
  const result:Record<string,Record<string,Value>>={};
  for(const [sheet,cells] of Object.entries(book.sheets)){
    result[sheet]={};for(const [address,source] of Object.entries(cells))if(source.formula)result[sheet][address]=cell(sheet,address);
  }
  return result;
}

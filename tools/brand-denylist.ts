const names = [
  String.raw`GTA(?:[\s-]*\d+)?|Grand\s+Theft\s+Auto|Rockstar`,
  String.raw`Policj(?:a|i|ę|ą|o|e|om|ami|ach)|PSP|Państwow\p{L}*\s+Straż\p{L}*\s+Pożarn\p{L}*|WORD|Pogotow(?:ie|ia|iu|iem)`,
  String.raw`PKP|MZA|ZTM|MPK|SKM|WKD|Polregio|Intercity|Flixbus|RegioJet|Polski\s+Bus|Leo\s+Express`,
  String.raw`Kolej\p{L}*\s+(?:Mazowieck\p{L}*|Dolnośląsk\p{L}*)|Metro\s+Warszawsk\p{L}*|Tramwaj\p{L}*\s+(?:Warszawsk\p{L}*|Śląsk\p{L}*)`,
  String.raw`Alfa\s+Romeo|Audi|BMW|BYD|Chevrolet|Chrysler|Citro[eë]n|Cupra|Dacia|Daewoo|Daihatsu|Dodge|Ferrari|Fiat|Ford`,
  String.raw`Honda|Hyundai|Jaguar|Jeep|Kia|Lamborghini|Land\s+Rover|Lexus|Mazda|Mercedes|MG|Mini\s+Cooper|Mitsubishi|Nissan`,
  String.raw`PGE\s+Narodow\p{L}*|Tarczyński\s+Arena`,
  'Opel|Peugeot|Porsche|Renault|Saab|Seat|[SŠ]koda|Smart|Subaru|Suzuki|Tesla|Toyota|Volkswagen|Volvo|VW',
];
const forbiddenNames = new RegExp(
  String.raw`(?<![\p{L}\p{N}])(?:${names.join('|')})(?![\p{L}\p{N}])`,
  'giu',
);

// Unicode boundaries preserve words such as „policjant” and „tramwaj”.
export function forbiddenBrands(text: string): string[] {
  return [...text.normalize('NFKC').matchAll(forbiddenNames)].map(
    ([name]) => name,
  );
}
